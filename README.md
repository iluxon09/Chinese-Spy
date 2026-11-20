# TILT — Financial Universe

TILT is an educational, virtual stock-market simulator. It combines a deterministic fictional market and database-backed trading engine with trading, portfolio analytics, financial education and behavioural feedback.

**TILT uses fictional companies and virtual money only. It is not a brokerage, does not place real trades, and does not provide investment advice.**

## Project links

- Repository: https://github.com/iluxon09/Chinese-Spy
- Integrated application: https://github.com/iluxon09/Chinese-Spy/tree/tilt-integration
- Production application: https://chinese-spy-dasmadhumita874-5444.vercel.app
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
- Risk assessment and a deterministic same-crash replay with two independent portfolios and a stated-vs-revealed comparison.

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
- A Supabase project for the authenticated workspace

### 1. Get the integration branch

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

The public pricing and demo-checkout pages work without a signed-in user or Supabase configuration. The simulator and workspace features still require the configured Supabase project and an authenticated account.

### 3. Apply database migrations

In Supabase Dashboard → SQL Editor, apply migrations in timestamp order after taking a database backup:

1. `supabase/migrations/20261120000000_initial_schema.sql` — initial TILT schema and RPCs.
2. `supabase/migrations/20261121000100_crash_replay.sql` — risk assessment and deterministic crash replay.
3. `supabase/migrations/20261121000200_intraday_market_volatility.sql` — five-minute price movement, company volatility settings and concurrent candle generation.

Run each migration only once and do not edit or re-run an already-applied migration against a live database. The intraday migration expects the regular TILT schema; apply the Crash Replay migration before it so the replay scenario is explicitly kept free of background volatility.

### 4. Start the app

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
| `/markets` | Authenticated | Fictional companies, prices, events and history |
| `/trading` | Authenticated | BUY / SELL terminal and transactions |
| `/portfolio` | Authenticated | Portfolio value, allocation and P&L |
| `/simulator` | Authenticated | Market-step and event controls |
| `/crash-replay` | Authenticated | Risk assessment, baseline crash simulation and identical reassessment replay |
| `/behaviour` | Authenticated | Personal Behavioral Analysis |
| `/academy` | Authenticated | Five Finance Academy lessons |
| `/academy/[lessonId]` | Authenticated | Lesson content and knowledge check |
| `/portfolio/architect` | Authenticated | Educational allocation planner |
| `/portfolio/architect/sip` | Authenticated | SIP and goal calculator |

## Architecture notes

- Supabase PostgreSQL is the source of truth for sessions, cash, holdings, orders, market prices and transaction history.
- Monetary values in the trading domain and API are integer paise (100 paise = ₹1).
- The frontend has one shared `TiltDataProvider`. It loads the active session snapshot once per authenticated session; route changes do not restart the bootstrap. A sign-out clears in-memory account data. Simulator playback can advance five-minute candles automatically at a user-selected pace; the next tick is scheduled only after the previous market write and snapshot refresh finish.
- Public pricing routes bypass the simulation bootstrap and authentication redirect. They do not create sessions, start market playback or contact Supabase.
- Behavioral Analysis is a pure, read-only analysis layer. Its adapter converts backend paise values to rupees exactly once and maps pattern recommendations to stable Academy lesson IDs.
- Crash Replay stores a self-reported risk questionnaire and links two isolated simulation sessions to the same deterministic five-step crash scenario. Both portfolios remain separate; the price path is shared and repeatable.
- Crash Replay requires the additive migration `supabase/migrations/20261121000100_crash_replay.sql` to be applied to the connected Supabase project before the route can be used.
- The intraday market model requires `supabase/migrations/20261121000200_intraday_market_volatility.sql`. It is deterministic by scenario/step so all sessions see the same stored prices; Crash Replay explicitly disables background noise to preserve its scripted path. See [docs/MARKET_MODEL.md](docs/MARKET_MODEL.md).
- Behavioral Analysis uses configurable heuristics over the user's simulation history. It does not diagnose personality or infer intent; insufficient data is distinct from a negative finding.
- Member 4's alternative company/scenario seed uses symbols that do not match the active eight-company database market; it is preserved as inactive reference data and is not seeded into Supabase.

## Known scope boundaries

- Market orders only; limit orders are not implemented.
- The demo charge rate is an educational assumption, not a complete model of statutory Indian market fees.
- Behavioral Analysis excludes uninvested cash from stock/sector concentration and cannot determine trader intent.
- Revenue-model prices and willingness to pay have not been validated; the pricing page intentionally publishes no paid rupee rates.
- The mock checkout is a local UI demonstration only. It does not capture enquiries, process payments, create orders or activate paid features.
- Instructor guides, cohort reports, paid cohort facilitation and site-licence entitlements are proposed commercial deliverables, not currently implemented product capabilities.
- Production Supabase migration status and full authenticated workspace behavior must be verified against the intended Supabase project before a public product launch.
