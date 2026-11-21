# Nifty 500 market pulse

## Boundaries

The real-market feed is a separate data product. It does not write to the fictional simulator tables (companies, market_scenarios, price_points) and must never be used to price virtual TILT trades.

The pipeline is:

1. Fetch the official Nifty 500 constituent CSV from NSE Indices and validate 500 unique equity-series members.
2. Retrieve the last five daily bars for those symbols through the replaceable Python provider interface (MarketDataProvider). The current prototype adapter uses yfinance.
3. Exclude the current day's daily candle until after 4:00 pm IST. Select the two most recent completed market dates that each have at least 450 valid constituent closes; do not mix different sessions within a ranking. Calculate each included stock's close-to-close percentage change: (latest close - previous close) / previous close × 100.
4. Rank positive and negative returns in application code. Ties are broken by symbol. The LLM is not involved in calculations or ranking.
5. Publish one JSONB snapshot to the existing Supabase project through a short-lived, secret-protected RPC lock.
6. Serve the snapshot from an authenticated Next.js read endpoint. Dashboard requests never call Yahoo Finance or NSE.

## Data semantics and failure policy

- The bars are daily (1d), not 15-minute or live intraday quotes. Python runtime on Vercel is currently a Beta runtime; the market provider and persistence contract are isolated so the worker can move to another Python host without changing the frontend API.
- The 15-minute interval is the target refresh cadence only. It does not guarantee market-data freshness or real-time prices.
- Every included stock is compared across the same `market_date` and `previous_close_date`; stocks missing either session are excluded and listed. The current day's daily candle is excluded until after 4:00 pm IST to avoid ranking on a partial daily bar. `collectedAt` is when the worker fetched the bars, not the exchange quote timestamp.
- A snapshot with 450–499 valid quotes is published as partial and explicitly marked incomplete. Fewer than 450 valid quotes are rejected.
- Missing history and invalid prices are listed in unavailableSymbols.
- A failed provider call never overwrites the last successful snapshot. The read API reports staleness and failed-refresh state separately.
- The validated constituent list is cached in the snapshot for 24 hours. If NSE Indices cannot be reached, a previously validated list may be used for up to seven days and is marked stale; beyond that, refresh fails closed.
- Only daily close-to-close movement is ranked. No intraday or adjusted-to-intraday claim is made.

## Deploy and configure

The linked Vercel project uses the Hobby plan. Its static Vercel Cron Jobs are restricted to daily runs, so a 15-minute schedule is owned by Supabase Cron in the existing Supabase project. Supabase pg_cron invokes the authenticated Vercel Python worker through pg_net. No second Supabase project or service-role key is required.

### 1. Configure the worker secret in Vercel

Generate a random 32-byte secret locally. In PowerShell:

~~~powershell
$secret = [Convert]::ToHexString([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32)).ToLowerInvariant()
$secret
~~~

Add the value as TILT_MARKET_REFRESH_SECRET in Vercel Project → Settings → Environment Variables, targeting Production. Redeploy after adding it. Do not commit the value or share it in chat.

The worker also uses the existing production variables NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. The publishable key is used only to invoke RPCs whose database functions independently verify the worker secret. No service-role credential is used in the Python worker.

### 2. Store the same secret and worker URL in Supabase Vault

In the existing Supabase project, open SQL Editor. Use the exact secret generated in Step 1 and the production hostname assigned to the Vercel project:

~~~sql
select vault.create_secret(
  '<PASTE_THE_SAME_32_BYTE_SECRET>',
  'tilt_market_refresh_secret'
);

select vault.create_secret(
  'https://<YOUR_PRODUCTION_VERCEL_HOST>/api/market-pulse-refresh',
  'tilt_market_refresh_url'
);
~~~

Do not paste the secret into GitHub, a SQL file, or the frontend. If a Vault secret with either name already exists, update that existing secret in Supabase Vault instead of creating duplicates.

### 3. Schedule the 15-minute refresh in Supabase

Run this in the same Supabase project after the Vercel deployment and Vault secrets are ready:

~~~sql
select cron.schedule(
  'tilt-nifty500-refresh',
  '*/15 * * * *',
  $job$
    select net.http_get(
      url := (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'tilt_market_refresh_url'
      ),
      headers := jsonb_build_object(
        'Authorization',
        'Bearer ' || (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'tilt_market_refresh_secret'
        )
      ),
      timeout_milliseconds := 60000
    );
  $job$
);
~~~

The migration enables pg_cron, pg_net and Supabase Vault. pg_net queues the HTTP request asynchronously; inspect its response records as well as the worker logs to distinguish a queued request from a successful refresh. The Vercel worker rejects requests without the bearer secret, and its database RPCs independently validate that secret against Vault. A database lock prevents overlapping refreshes.

Check the job:

~~~sql
select jobid, jobname, schedule, active
from cron.job
where jobname = 'tilt-nifty500-refresh';
~~~

Check recent executions:

~~~sql
select jobid, status, return_message, start_time
from cron.job_run_details
where jobid = (
  select jobid from cron.job where jobname = 'tilt-nifty500-refresh'
)
order by start_time desc
limit 10;
~~~

A successful Cron enqueue does not itself prove the Vercel worker succeeded. Check Vercel Runtime Logs for GET /api/market-pulse-refresh, then verify last_success_at in public.market_pulse_state.

### 4. Verify the stored state

~~~sql
select
  universe_key,
  last_success_at,
  last_attempt_at,
  last_status,
  last_error,
  jsonb_array_length(snapshot -> 'stocks') as priced_stocks,
  snapshot -> 'coverage' as coverage,
  snapshot ->> 'data_type' as data_type
from public.market_pulse_state
where universe_key = 'NIFTY_500';
~~~

The first successful worker execution creates the initial snapshot. Until then, the frontend endpoint intentionally returns HTTP 503 rather than inventing placeholder prices.

## Frontend API

Authenticated GET: GET /api/market-pulse

This is a read-only database endpoint. It does not trigger a refresh. The response is cached privately for 60 seconds and includes stale-while-revalidate hints.

Example response (values abbreviated):

~~~json
{
  "ok": true,
  "data": {
    "universe": {
      "name": "NIFTY 500",
      "expected_constituents": 500,
      "member_count": 500,
      "source_url": "https://www.niftyindices.com/IndexConstituent/ind_nifty500list.csv",
      "retrieved_at": "2026-11-21T09:00:00Z",
      "is_stale": false
    },
    "source": "yfinance",
    "dataType": "daily_historical_or_delayed",
    "interval": "1d",
    "refreshIntervalMinutes": 15,
    "collectedAt": "2026-11-21T09:15:00Z",
    "latestMarketDate": "2026-11-20",
    "previousMarketDate": "2026-11-19",
    "lastUpdatedAt": "2026-11-21T09:15:03Z",
    "lastAttemptAt": "2026-11-21T09:15:00Z",
    "lastRefreshStatus": "ok",
    "stale": false,
    "staleAfterMinutes": 45,
    "rankingComplete": true,
    "coverage": {
      "requested": 500,
      "available": 500,
      "unavailable": 0,
      "percent": 100.0
    },
    "gainers": [
      {
        "symbol": "EXAMPLE",
        "company": "Example Ltd.",
        "industry": "Example sector",
        "latest_price": 123.45,
        "previous_close": 120.0,
        "change_pct": 2.88,
        "market_date": "2026-11-20",
        "previous_close_date": "2026-11-19"
      }
    ],
    "losers": [],
    "stocks": [],
    "unavailableSymbols": [],
    "warnings": []
  }
}
~~~

All arrays are populated with the actual stored result; the example is illustrative only. stocks contains every valid quote in the snapshot, not only the top movers.

## Provider replacement

Implement a new class satisfying MarketDataProvider.fetch_daily_bars(members) and change provider construction in market_pulse/service.py. Ranking, validation, snapshot persistence, API contracts and UI do not depend on yfinance.

## Data-source terms

The current Yahoo Finance adapter is a prototype. yfinance's published project notice says Yahoo Finance data is intended for personal use. Review the applicable source terms and obtain a data licence that permits TILT's intended public/commercial distribution before launch. Do not treat successful API responses as a redistribution licence.
