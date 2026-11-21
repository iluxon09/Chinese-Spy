# TILT integration branch

This is the active integration branch for TILT — Financial Universe. It combines the Supabase-backed simulation and trading engine with the dashboard, Markets, Trading, Portfolio, Simulator, Behavioral Analysis, Finance Academy, Investment Architect and Gemini-powered AI Risk Coach.

## Branch safety

- `tilt-integration`: active integration and demo target.
- `main`: maintained separately; do not merge or force-push without team approval.
- `krish-backend`, `frontend`, `frontend-hardening`, `member4-integration` and the original member contribution branches: preserve as source/history branches.

## Active application routes

| Route | Access | Purpose |
|---|---|---|
| `/` | Authenticated | Dashboard and recent simulation activity |
| `/markets` | Authenticated | Fictional companies, prices, events and market history |
| `/trading` | Authenticated | BUY/SELL market orders |
| `/portfolio` | Authenticated | Virtual cash, holdings, P&L and allocation |
| `/simulator` | Authenticated | Manual market advancement and auto-play controls |
| `/behaviour` | Authenticated | Read-only behavioural analysis of the signed-in user's simulation |
| `/coach` | Authenticated | Gemini Risk Coach with read-only simulation context |
| `/academy` | Authenticated | Five Finance Academy lessons and knowledge checks |
| `/portfolio/architect` | Authenticated | Educational allocation, SIP and goal planning |
| `/pricing` | Public | Pilot-first pricing/revenue-model preview |
| `/pricing/demo-checkout` | Public | Mock checkout UI; no payment or order is submitted |
| `/login` | Public | Supabase email/password sign-in and account creation |

## Data ownership and architecture

- Supabase PostgreSQL is the source of truth for authenticated sessions, cash, holdings, orders, charges, market prices and transaction history.
- Monetary values in the trading API and database are integer paise. The server derives execution prices and transaction charges; clients submit order intent and an idempotency UUID only.
- The active market is fictional and deterministic by scenario and step. Market, sector, company and macro factors generate recurring upward and downward movement; scheduled news events apply additional shocks. All users converge on the same stored price rows for a scenario/step.
- `TiltDataProvider` loads the active session and shared market state. Market playback advances only after the previous write and portfolio refresh have completed.
- A database trigger caps each simulation session at 10,000 market steps to bound shared price-history growth.
- Behavioral Analysis is read-only and analyses observable simulation activity. Its thresholds are configurable educational heuristics, not empirically validated predictors or psychological diagnoses.
- The AI Risk Coach calls Gemini only from an authenticated server route. It receives read-only context from the signed-in user's simulation; conversation text stays in browser memory and is not persisted in TILT tables. PostgreSQL enforces a maximum of 6 requests per rolling minute and 50 per UTC day per user.
- Pricing and checkout are pilot/mock-only. No real payments, paid entitlements, instructor tools or cohort administration are implemented.

## Local setup (Windows PowerShell or CMD)

Requirements: Node.js 22.12.x or a later 22.x release, npm 10 or newer, a Supabase project, and a Gemini API key for the AI Coach.

```cmd
git fetch origin
git switch tilt-integration
git pull --ff-only origin tilt-integration
npm install
```

After dependency changes, `npm install` regenerates `package-lock.json`. Commit that regenerated file. Once the lockfile is aligned, verify a reproducible install with `npm ci`.

Create `.env.local` from `.env.example`. Keep `GEMINI_API_KEY` server-side and never commit `.env.local`, a Supabase service-role key or any other secret.

## Database migrations

Apply migrations once, in timestamp order, on a fresh database:

1. `20261120000000_initial_schema.sql`
2. `20261121000000_continuous_market_volatility.sql`
3. `20261121000100_crash_replay.sql` (historical migration; its retired feature is removed by the next cleanup migration)
4. `20261121000200_intraday_market_volatility.sql`
5. `20261121000300_remove_crash_replay.sql`
6. `20261121000400_ai_coach_rate_limits.sql`
7. `20261121000500_market_step_cap.sql`

For a database that already has migrations through `20261121000300`, apply only migrations 00400 and 00500. Inspect the database's actual migration history before applying anything to an existing project. Do not re-run already-applied migrations; take a backup before schema changes.

## Run and verify

```cmd
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
```

The current automated tests cover pure logic. There is not yet a full browser end-to-end suite or live SQL/RPC integration suite, so a manual smoke test remains required.

## Demo smoke test

1. Sign in with a pre-created demo account; do not depend on last-minute confirmation email delivery.
2. Confirm the dashboard and all eight fictional companies load.
3. Buy a small quantity and verify cash, holdings and transaction history.
4. Sell part of the position and verify realised P&L/charges.
5. Advance the market and confirm prices move both up and down across successive steps.
6. Open Behavioral Analysis and confirm it presents read-only observations or an explicit insufficient-data state.
7. Open the AI Risk Coach and send a prompt; verify a complete streamed response. The coach requires migration 00400.
8. Confirm the market-step ceiling migration 00500 is applied; the API should return HTTP 409 after the session reaches 10,000 steps.
9. Sign out and verify protected pages return to the login route.

## Known product boundaries

Market orders only; no limit orders. Transaction charges are simplified educational assumptions, not a complete statutory Indian fee schedule. Behavioral Analysis is heuristic. Pricing/checkout is mock-only. Instructor and cohort features are proposals, not implemented capabilities.
