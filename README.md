# TILT — Financial Universe

TILT is an educational, virtual stock-market simulator. It combines a deterministic fictional market and database-backed trading engine with trading, portfolio analytics, financial education, behavioural feedback and a Gemini-powered AI Risk Coach.

**TILT uses fictional companies and virtual money only. It is not a brokerage, does not place real trades, and does not provide investment advice.**

## Project links

- Repository: https://github.com/iluxon09/Chinese-Spy
- Integrated application: https://github.com/iluxon09/Chinese-Spy/tree/tilt-integration
- Last known production deployment (may not include the latest integration branch): https://chinese-spy-dasmadhumita874-5444.vercel.app
- Pricing and revenue-model preview: https://chinese-spy-dasmadhumita874-5444.vercel.app/pricing
- Vercel deployment guide: [docs/DEPLOY_VERCEL.md](docs/DEPLOY_VERCEL.md)
- Team branch status: [docs/BRANCH_INTEGRATION_STATUS.md](docs/BRANCH_INTEGRATION_STATUS.md)
- Behavioral Analysis design and limits: [src/lib/behavioral-analysis/README.md](src/lib/behavioral-analysis/README.md)
- Member 4 module boundaries: [src/lib/member4/README.md](src/lib/member4/README.md)

## Main features

- Supabase email/password authentication, protected workspace pages and account sign-out.
- Public pricing and pilot-first revenue-model preview; no live billing or paid entitlements.
- Responsive application shell with desktop navigation and an accessible mobile menu.
- User-owned simulation sessions, each starting with ₹10,00,000 virtual capital.
- Eight fictional companies with five-minute market candles, correlated market/sector/company price movement, occasional macro shocks, scripted news and auto-play controls.
- BUY and SELL market orders with server-side validation, integer-paise accounting, configurable charges and idempotency.
- Portfolio value, cash, holdings, average cost, realised/unrealised P&L and allocation.
- Dashboard, market watch, trading terminal, portfolio and simulation controls.
- Five Finance Academy lessons with stable IDs, practical examples, key takeaways and quizzes.
- SIP and goal-based SIP calculators with validation, assumptions and educational disclaimers.
- Behavioral Analysis of the signed-in user's simulation activity: entry/exit timing, trading frequency, transaction-cost drag and portfolio concentration, with evidence-backed pattern summaries.
- Gemini-powered AI Risk Coach with a conversational risk discussion and read-only context from the signed-in user's virtual portfolio and recent simulated trades.
- Google Search-grounded Indian market briefing with current-session/last-close context, cited mover and sector summaries, and source links; kept separate from fictional simulator data.

## Technology

- Next.js App Router and React
- TypeScript
- Supabase Auth and PostgreSQL
- Supabase SSR cookie-based authentication
- Tailwind CSS
- Recharts and Lucide
- Vitest

## Run locally

### Requirements

- Node.js 22.12.x or a later Node.js 22.x release
- npm 10 or newer
- A Supabase project for the authenticated workspace

### 1. Get the integration branch

```cmd
git clone --branch tilt-integration https://github.com/iluxon09/Chinese-Spy.git
cd Chinese-Spy
npm install
```

`npm install` keeps `package-lock.json` aligned after dependency changes. Commit the regenerated lockfile. Once it is aligned, use `npm ci` to verify a clean, reproducible install.

### 2. Configure Supabase

Create a local `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
# Optional model override; defaults to gemini-3.8-flash
GEMINI_MODEL=gemini-3.8-flash
# Optional: defaults to GEMINI_MODEL
MARKET_INSIGHTS_MODEL=gemini-3.8-flash
```

Use the project's URL and publishable key from Supabase Project Settings. Create a Gemini API key in Google AI Studio and set it as `GEMINI_API_KEY`. Keep it server-side: never use a `NEXT_PUBLIC_` prefix, expose it in browser code, or commit `.env.local`. Google AI subscription quotas apply inside AI Studio; direct Gemini API calls from TILT are managed and billed separately under Gemini API usage tiers. Check the API quota and pricing for your Google Cloud project before public use.

The public pricing and demo-checkout pages work without a signed-in user or Supabase configuration. The simulator and workspace features still require the configured Supabase project and an authenticated account.

### 3. Apply database migrations

In Supabase Dashboard → SQL Editor, apply migrations in timestamp order after taking a database backup:

1. `supabase/migrations/20261120000000_initial_schema.sql` — initial TILT schema and RPCs.
2. `supabase/migrations/20261121000000_continuous_market_volatility.sql` — continuous market movement model.
3. `supabase/migrations/20261121000100_crash_replay.sql` — historical migration retained to preserve migration history.
4. `supabase/migrations/20261121000200_intraday_market_volatility.sql` — five-minute price movement, company volatility settings and concurrent candle generation.
5. `supabase/migrations/20261121000300_remove_crash_replay.sql` — removes the retired replay scenario, sessions, table and RPCs while retaining the historical migration file.
6. `supabase/migrations/20261121000400_ai_coach_rate_limits.sql` — adds atomic per-user AI Coach limits (6 requests per rolling minute and 50 per UTC day).
7. `supabase/migrations/20261121000500_market_step_cap.sql` — prevents a simulation session from advancing beyond 10,000 market steps, bounding shared price-history growth.
8. `supabase/migrations/20261121000600_dynamic_market_events_and_insights.sql` — adds deterministic per-stock catalyst events, stronger bounded intraday volatility and a separate real-market research quota (one refresh per five minutes and 20 per UTC day per user).

Run each migration only once and do not edit or re-run an already-applied migration against a live database. For a fresh database, apply all seven migrations in timestamp order. For a database that already has migrations `20261120000000` through `20261121000500` applied, apply only `20261121000600`. For a database already through `20261121000300`, apply `20261121000400`, `20261121000500` and `20261121000600` in order. For any other existing migration history, inspect Supabase migration history first and apply only missing migrations; do not blindly rerun the full list.

#### Demo account readiness

Supabase's built-in email sender may throttle confirmation emails during a live event. Do not depend on creating a brand-new account during the judging session. Pre-create two or three separate demo accounts and verify their sign-in beforehand, or configure a project-owned SMTP provider. Disabling email confirmation should be a deliberate, temporary demo-project setting, not a production default.

## 4. Start the app

```cmd
npm run dev
```

Open http://localhost:3000. The public pricing page is available at http://localhost:3000/pricing. Unauthenticated visitors are redirected to `/login` when they try to open protected workspace routes.

## Verification

Run these commands from the project root:

```cmd
npm install
npm audit --omit=dev --audit-level=high
npm run lint
npm run typecheck
npm test
npm run build
```

The GitHub Actions workflow `.github/workflows/ci.yml` runs the same checks on pull requests into `tilt-integration` and on the integration work branch.

## Application routes

| Route | Access | Description |
|---|---|---|
| `/pricing` | Public | Pilot-first revenue-model overview; no prices or payments are live |
| `/pricing/demo-checkout` | Public | No-charge UPI/card/net-banking UI preview; no enquiry or order is submitted |
| `/login` | Public | Sign in / create account |
| `/` | Authenticated | Dashboard and recent activity |
| `/markets` | Authenticated | Fictional prices/history plus a separate Google Search-grounded Indian market briefing |
| `/trading` | Authenticated | BUY / SELL terminal and transactions |
| `/portfolio` | Authenticated | Portfolio value, allocation and P&L |
| `/simulator` | Authenticated | Market-step and event controls |
| `/coach` | Authenticated | Gemini-powered conversational risk education using the current virtual portfolio context |
| `/behaviour` | Authenticated | Personal Behavioral Analysis |
| `/academy` | Authenticated | Five Finance Academy lessons |
| `/academy/[lessonId]` | Authenticated | Lesson content and knowledge check |
| `/portfolio/architect` | Authenticated | Educational allocation planner |
| `/portfolio/architect/sip` | Authenticated | SIP and goal calculator |

## Architecture notes

- Supabase PostgreSQL is the source of truth for sessions, cash, holdings, orders, market prices and transaction history.
- Monetary values in the trading domain and API are integer paise (100 paise = ₹1).
- The frontend has one shared `TiltDataProvider`. It loads the active session snapshot once per authenticated session; route changes do not restart the bootstrap. A sign-out clears in-memory account data. Simulator playback can advance five-minute candles automatically at a user-selected pace; the next tick is scheduled only after the previous market write and snapshot refresh finish.
- The `@/*` TypeScript alias intentionally resolves both the project root and `src/`: integrated feature/UI modules live at the root, while domain, API and Supabase modules live under `src/`. Do not collapse this mapping without moving those modules together.
- Public pricing routes bypass the simulation bootstrap and authentication redirect. They do not create sessions, start market playback or contact Supabase.
- Behavioral Analysis is a pure, read-only analysis layer. Its adapter converts backend paise values to rupees exactly once and maps pattern recommendations to stable Academy lesson IDs.
- The AI Risk Coach calls Gemini from an authenticated server route. It receives read-only context for the signed-in user's active TILT simulation: portfolio, holdings, prices, recent simulated trades and market events. Conversation history stays in browser memory and is not saved to TILT tables. A database RPC enforces a per-user limit of 6 requests per rolling minute and 50 requests per UTC day.
- The Markets page's real-market briefing uses Gemini Google Search grounding and displays source citations. It is informational only, refreshes at most once every five minutes and 20 times per UTC day per user, and never feeds real prices/news into the fictional simulator.
- Configure `GEMINI_API_KEY` in `.env.local` and Vercel Project → Settings → Environment Variables. Keep the key server-side; `GEMINI_MODEL` is optional and defaults to `gemini-3.8-flash`.
- The intraday market model requires `supabase/migrations/20261121000200_intraday_market_volatility.sql`. It is deterministic by scenario/step so all sessions see the same stored prices. Migration `20261121000600_dynamic_market_events_and_insights.sql` introduces a 14% per-stock per-candle chance of a synthetic catalyst (up to 3.00% impact), plus a 1.5% chance of a broad-market shock (up to 2.50%). Every catalyst is explicitly fictional; its seed is stable per scenario, step and symbol so users share identical prices. The database enforces a 10,000-step ceiling per simulation session to bound shared price-history growth. The retired replay scenario is removed by the cleanup migration; its historical migration remains only to preserve migration ordering. See [docs/MARKET_MODEL.md](docs/MARKET_MODEL.md).
- Behavioral Analysis uses configurable, experimental heuristics over the user's simulation history; its thresholds have not been empirically validated. It does not diagnose personality or infer intent; insufficient data is distinct from a negative finding.
- Member 4's alternative company/scenario seed uses symbols that do not match the active eight-company database market; it is preserved as inactive reference data and is not seeded into Supabase.

## Known scope boundaries

- Market orders only; limit orders are not implemented.
- The demo charge rate is an educational assumption, not a complete model of statutory Indian market fees.
- Behavioral Analysis excludes uninvested cash from stock/sector concentration and cannot determine trader intent.
- Revenue-model prices and willingness to pay have not been validated; the pricing page intentionally publishes no paid rupee rates.
- The mock checkout is a local UI demonstration only. It does not capture enquiries, process payments, create orders or activate paid features.
- Instructor guides, cohort reports, paid cohort facilitation and site-licence entitlements are proposed commercial deliverables, not currently implemented product capabilities.
- Production Supabase migration status and full authenticated workspace behavior must be verified against the intended Supabase project before a public product launch. Current automated tests cover pure logic; there is no end-to-end browser suite or live SQL/RPC integration suite yet.
