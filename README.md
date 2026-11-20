# TILT — Financial Universe

TILT is an educational, virtual stock-market simulator. It combines a deterministic fictional market and database-backed trading engine with a dashboard, market terminal, portfolio analytics, simulation controls and Finance Academy.

**TILT uses fictional companies and virtual money only. It is not a brokerage, does not place real trades, and does not provide investment advice.**

## Project links

- Repository: https://github.com/iluxon09/Chinese-Spy
- Integrated application source: https://github.com/iluxon09/Chinese-Spy/tree/tilt-integration
- Member 4 review branch: https://github.com/iluxon09/Chinese-Spy/tree/member4-integration
- Integration guide: [docs/INTEGRATION.md](docs/INTEGRATION.md)
- Vercel deployment guide: [docs/DEPLOY_VERCEL.md](docs/DEPLOY_VERCEL.md)
- Team branch integration status: [docs/BRANCH_INTEGRATION_STATUS.md](docs/BRANCH_INTEGRATION_STATUS.md)
- Member 4 modules and compatibility notes: [src/lib/member4/README.md](src/lib/member4/README.md)

The production application is based on the integrated branch, not the repository's default `main` branch. Review the intended branch before deploying.

## Main features

- Supabase email/password authentication with protected application pages and sign-out.
- User-owned simulation sessions, each starting with ₹10,00,000 in virtual capital.
- Eight fictional companies in the active market.
- Deterministic market progression, scripted news events and price history.
- BUY and SELL market orders with server-side validation and configurable transaction charges.
- Atomic database transactions, idempotent order handling and ownership checks.
- Portfolio value, cash, holdings, average cost, realised/unrealised P&L and allocation.
- Dashboard, market watch, trading terminal, portfolio and simulator UI.
- Five Finance Academy lessons with stable IDs, practical examples, takeaways and quizzes.
- Validated SIP and goal-based SIP calculators with assumptions and educational disclaimers.
- CSV transaction preview with row-level validation; preview only, no persistent import.
- Member 4's alternate fictional-company catalogue, event definitions and demo scenario fixtures are preserved as inactive reference modules until mapped to the active database symbols and event IDs.
- Market Mirror behavioural analysis is intentionally deferred to the final integration phase.

## Technology

- Next.js App Router and React
- TypeScript
- Supabase Auth and PostgreSQL
- Supabase SSR cookie-based authentication
- Tailwind CSS
- Recharts
- Vitest

## Run locally

### Requirements

- Node.js 22.12 or newer (22.16+ recommended)
- npm 10 or newer
- A Supabase project

### 1. Get the integrated branch

```cmd
git clone --branch tilt-integration https://github.com/iluxon09/Chinese-Spy.git
cd Chinese-Spy
npm install
```

For Member 4's additions, use the review branch until the PR is reviewed and merged:

```cmd
git fetch origin
git switch --track origin/member4-integration
npm install
```

### 2. Configure Supabase

Create a local `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
```

Use the project's URL and publishable key from Supabase Project Settings. Never put a Supabase service-role key in client-side code, and never commit `.env.local`.

### 3. Apply the database migration

In Supabase Dashboard → SQL Editor, run the migration:

`supabase/migrations/20261120000000_initial_schema.sql`

Do not rerun it against a live database unless you understand its upgrade-safe operations and have a backup.

### 4. Start the app

```cmd
npm run dev
```

Open http://localhost:3000. Unauthenticated users are redirected to `/login`. Sign in or create an account with Supabase Auth to access the simulator.

## Verification

Run these commands from the project root:

```cmd
npm run lint
npm run typecheck
npm test
npm run build
```

The existing backend suite contains market and trading tests. The Member 4 test suite adds lesson, calculator, CSV parser and demo-scenario coverage. Run all checks on the exact branch you intend to deploy.

## Application routes

| Route | Description |
|---|---|
| `/login` | Sign in / create account |
| `/` | Dashboard and recent transactions |
| `/markets` | Fictional companies, prices, news and price history |
| `/trading` | BUY / SELL market orders, holdings and transaction history |
| `/portfolio` | Portfolio value, allocation and P&L |
| `/simulator` | Market-step and event controls |
| `/academy` | Five Finance Academy lessons |
| `/academy/[lessonId]` | Lesson content and knowledge check |
| `/portfolio/architect` | Validated illustrative SIP and goal calculator |
| `/portfolio/upload` | CSV validation and preview only |
| `/api/docs` | API summary |
| `/api/health` | API health check |

## Backend and API design

Supabase PostgreSQL is the source of truth for sessions, cash, holdings, orders, market prices and transaction history. Monetary values are stored in integer paise (100 paise = ₹1). The browser sends order intent (UUID, symbol, side and quantity); authoritative prices, charges and balances are determined and validated by the backend.

Important API endpoints include:

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/sessions` | List the authenticated user's sessions |
| POST | `/api/sessions` | Create a new simulation |
| GET | `/api/sessions/{sessionId}/portfolio` | Portfolio snapshot |
| GET | `/api/sessions/{sessionId}/market` | Current fictional market and events |
| POST | `/api/sessions/{sessionId}/orders` | Execute a BUY / SELL market order |
| GET | `/api/sessions/{sessionId}/transactions` | Transaction history |
| POST | `/api/sessions/{sessionId}/market/advance` | Advance one market step |
| GET | `/api/sessions/{sessionId}/market/history?symbol=ASTE` | Price history for a symbol |

Authenticated API handlers validate the signed-in user and session ownership. Financial writes are performed through database functions so cash, holdings and transaction updates are atomic. Order UUIDs provide idempotency for safe retries.

## Integration boundaries

- Market orders only; limit orders are not implemented.
- The demo charge rate is a configurable educational assumption, not a complete model of statutory Indian market fees.
- CSV upload currently validates and previews rows in the browser; persistent historical import is not implemented.
- Member 4's alternate symbols/events/scenarios are preserved as inactive content because they do not match the active Supabase seed.
- Market Mirror behavioural analysis is deferred until its data contracts are adapted and tested.
- Re-verify authentication, trading and the production build against the intended Supabase project before a public demonstration.
