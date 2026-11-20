# TILT — Financial Universe

TILT is an educational, virtual stock-market simulator. It combines a deterministic fictional market and database-backed trading engine with trading, portfolio analytics, financial education and behavioural feedback.

**TILT uses fictional companies and virtual money only. It is not a brokerage, does not place real trades, and does not provide investment advice.**

## Project links

- Repository: https://github.com/iluxon09/Chinese-Spy
- Integrated application: https://github.com/iluxon09/Chinese-Spy/tree/tilt-integration
- Current combined review: https://github.com/iluxon09/Chinese-Spy/tree/frontend-hardening
- Integration pull request: https://github.com/iluxon09/Chinese-Spy/pull/2
- Vercel deployment guide: [docs/DEPLOY_VERCEL.md](docs/DEPLOY_VERCEL.md)
- Team branch status: [docs/BRANCH_INTEGRATION_STATUS.md](docs/BRANCH_INTEGRATION_STATUS.md)
- Market Mirror design and limits: [src/lib/market-mirror/README.md](src/lib/market-mirror/README.md)
- Member 4 module boundaries: [src/lib/member4/README.md](src/lib/member4/README.md)

## Main features

- Supabase email/password authentication, protected pages and account sign-out.
- Responsive application shell with desktop navigation and an accessible mobile menu.
- User-owned simulation sessions, each starting with ₹10,00,000 virtual capital.
- Eight fictional companies, deterministic market progression, scripted news and price history.
- BUY and SELL market orders with server-side validation, integer-paise accounting, configurable charges and idempotency.
- Portfolio value, cash, holdings, average cost, realised/unrealised P&L and allocation.
- Dashboard, market watch, trading terminal, portfolio and simulation controls.
- Five Finance Academy lessons with stable IDs, practical examples, key takeaways and quizzes.
- SIP and goal-based SIP calculators with validation, assumptions and educational disclaimers.
- CSV transaction preview with row-level validation; preview only, no persistent import.
- Market Mirror behavioural heuristics for panic-selling patterns, FOMO-like buying, overtrading and concentration, using the signed-in user's active simulation data.

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

- Node.js 22.12 or newer
- npm 10 or newer
- A Supabase project

### 1. Get the integration branch

```cmd
git clone --branch tilt-integration https://github.com/iluxon09/Chinese-Spy.git
cd Chinese-Spy
npm install
```

When reviewing the combined Member 3/4 and frontend-hardening work before it is merged:

```cmd
git fetch origin
git switch --track origin/frontend-hardening
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

In Supabase Dashboard → SQL Editor, run the migration only if the database has not already been migrated:

`supabase/migrations/20261120000000_initial_schema.sql`

Do not re-run migrations against a live database without reviewing the SQL and taking a backup.

### 4. Start the app

```cmd
npm run dev
```

Open http://localhost:3000. Unauthenticated visitors are redirected to `/login`. Sign in or create an account with Supabase Auth to access the simulator.

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

| Route | Description |
|---|---|
| `/login` | Sign in / create account |
| `/` | Dashboard and recent activity |
| `/markets` | Fictional companies, prices, events and history |
| `/trading` | BUY / SELL terminal and transactions |
| `/portfolio` | Portfolio value, allocation and P&L |
| `/simulator` | Market-step and event controls |
| `/behaviour` | Read-only Market Mirror analysis |
| `/academy` | Five Finance Academy lessons |
| `/academy/[lessonId]` | Lesson content and knowledge check |
| `/portfolio/architect` | Illustrative SIP and goal calculator |
| `/portfolio/upload` | CSV validation and preview only |

## Architecture notes

- Supabase PostgreSQL is the source of truth for sessions, cash, holdings, orders, market prices and transaction history.
- Monetary values in the trading domain and API are integer paise (100 paise = ₹1).
- The frontend has one shared `TiltDataProvider`. It loads the active session snapshot once per authenticated session; route changes do not restart the bootstrap. A sign-out clears in-memory account data.
- Market Mirror is a pure, read-only analysis layer. Its adapter converts backend paise values to rupees exactly once and maps detector recommendations to stable Academy lesson IDs.
- The Market Mirror indicators are configurable heuristics, not diagnoses or evidence of intent. Insufficient data is distinct from a negative finding.
- The CSV upload is a local preview only. It does not alter cash, holdings or transaction history.
- Member 4's alternative company/scenario seed uses symbols that do not match the active eight-company database market; it is preserved as inactive reference data and is not seeded into Supabase.

## Known scope boundaries

- Market orders only; limit orders are not implemented.
- The demo charge rate is an educational assumption, not a complete model of statutory Indian market fees.
- Persistent historical CSV import is not implemented.
- Market Mirror excludes uninvested cash from stock/sector concentration and cannot determine trader intent.
- Verify authentication, trading, Market Mirror and the production build against the intended Supabase project before a public demonstration.
