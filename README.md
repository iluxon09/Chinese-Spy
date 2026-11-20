# TILT — Financial Universe

TILT is an educational, virtual stock-market simulator. It combines a deterministic fictional market and database-backed trading engine with a dashboard, market terminal, portfolio analytics, simulation controls and Finance Academy.

**TILT uses fictional companies and virtual money only. It is not a brokerage, does not place real trades, and does not provide investment advice.**

## Project links

- Repository: https://github.com/iluxon09/Chinese-Spy
- Integrated application source: https://github.com/iluxon09/Chinese-Spy/tree/tilt-integration
- Integration guide: [docs/INTEGRATION.md](docs/INTEGRATION.md)
- Vercel deployment guide: [docs/DEPLOY_VERCEL.md](docs/DEPLOY_VERCEL.md)
- Team branch integration status: [docs/BRANCH_INTEGRATION_STATUS.md](docs/BRANCH_INTEGRATION_STATUS.md)

The integrated application is on the `tilt-integration` branch. The repository's default `main` branch is maintained separately; use the branch link above to review this version.

## Main features

- Supabase email/password authentication with protected application pages and sign-out.
- User-owned simulation sessions, each starting with ₹10,00,000 in virtual capital.
- Eight fictional companies across different sectors.
- Deterministic market progression, scripted news events and price history.
- BUY and SELL market orders with server-side validation and configurable transaction charges.
- Atomic database transactions, idempotent order handling and ownership checks.
- Portfolio value, cash, holdings, average cost, realised/unrealised P&L and allocation.
- Dashboard, market watch, trading terminal, portfolio and simulator UI.
- Finance Academy lessons and knowledge checks.
- SIP/goal calculator (illustrative only).
- CSV upload preview (preview only; it does not import holdings or transactions).

Market Mirror / behavioural analysis is intentionally deferred for a later integration phase.

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

The migration creates the market scenario, fictional companies, market events, sessions, holdings, transactions, price history, row-level security policies and database functions used by the API.

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

The backend unit-test suite currently contains market and trading tests. The integrated branch has previously passed the local lint, TypeScript, 15-test Vitest and Next.js production-build checks before the latest authentication-gate changes. Re-run the commands above on the current branch before a live demonstration.

## Application routes

| Route | Description |
|---|---|
| `/login` | Sign in / create account |
| `/` | Dashboard and recent transactions |
| `/markets` | Fictional companies, prices, news and price history |
| `/trading` | BUY / SELL market orders, holdings and transaction history |
| `/portfolio` | Portfolio value, allocation and P&L |
| `/simulator` | Market-step and event controls |
| `/academy` | Finance Academy |
| `/academy/[lessonId]` | Lesson content and quiz |
| `/portfolio/architect` | Illustrative SIP and goal calculator |
| `/portfolio/upload` | Local CSV preview only |
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

## Known scope boundaries

- Market orders only; limit orders are not implemented.
- The demo charge rate is a configurable educational assumption, not a complete model of statutory Indian market fees.
- CSV upload currently previews the file in the browser; persistent import is not implemented.
- Market Mirror behavioural analysis is deferred.
- The integration should be re-verified against the intended Supabase project before a public live demo.
