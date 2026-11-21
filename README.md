# TILT — Financial Universe

TILT is an educational, virtual stock-market simulator. It combines a deterministic fictional market and database-backed trading engine with trading, portfolio analytics, financial education, behavioural feedback and a Gemini-powered AI Risk Coach.

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
- Gemini-powered AI Risk Coach with a conversational risk discussion and read-only context from the signed-in user's virtual portfolio and recent simulated trades.

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
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
# Optional model override; defaults to gemini-3.8-flash
GEMINI_MODEL=gemini-3.8-flash
```

Use the project's URL and publishable key from Supabase Project Settings. Create a Gemini API key in Google AI Studio and set it as `GEMINI_API_KEY`. Keep it server-side: never use a `NEXT_PUBLIC_` prefix, expose it in browser code, or commit `.env.local`.

The public pricing and demo-checkout pages work without a signed-in user or Supabase configuration. The simulator and workspace features still require the configured Supabase project and an authenticated account.

### 3. Apply database migrations

In Supabase Dashboard → SQL Editor, apply migrations in timestamp order after taking a database backup:

1. `supabase/migrations/20261120000000_initial_schema.sql` — initial TILT schema and RPCs.
2. `supabase/migrations/20261121000000_continuous_market_volatility.sql` — continuous market movement model.
3. `supabase/migrations/20261121000100_crash_replay.sql` — historical migration retained to preserve migration history.
4. `supabase/migrations/20261121000200_intraday_market_volatility.sql` — five-minute price movement, company volatility settings and concurrent candle generation.
5. `supabase/migrations/20261121000300_remove_crash_replay.sql` — removes the retired replay scenario, sessions, table and RPCs.

Run each migration only once and do not edit or re-run an already-applied migration against a live database. For an existing project that already applied the older migrations, apply only the new `20261121000300_remove_crash_replay.sql` cleanup migration. For a fresh database, apply all migration files in timestamp order; the old replay migration is immediately cleaned up by the final migration.

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
- Public pricing routes bypass the simulation bootstrap and authentication redirect. They do not create sessions, start market playback or contact Supabase.
- Behavioral Analysis is a pure, read-only analysis layer. Its adapter converts backend paise values to rupees exactly once and maps pattern recommendations to stable Academy lesson IDs.
- The AI Risk Coach calls Gemini from an authenticated server route. It receives read-only context for the signed-in user's active TILT simulation: portfolio, holdings, prices, recent simulated trades and market events. Conversation history stays in browser memory and is not saved to TILT tables.
- Configure `GEMINI_API_KEY` in `.env.local` and Vercel Project → Settings → Environment Variables. Keep the key server-side; `GEMINI_MODEL` is optional and defaults to `gemini-3.8-flash`.
- The intraday market model requires `supabase/migrations/20261121000200_intraday_market_volatility.sql`. It is deterministic by scenario/step so all sessions see the same stored prices; the retired replay scenario is removed by the final cleanup migration; its historical migration remains only to preserve migration ordering. See [docs/MARKET_MODEL.md](docs/MARKET_MODEL.md).
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
