# Team branch integration status

This document records what was inspected and incorporated into `tilt-integration`. It is a handoff/status note, not a claim that every module is production verified.

## Integration target

- Combined application branch: `tilt-integration`
- Review branch for Member 4 integration: `member4-integration`
- Backend source branch: `krish-backend`
- Frontend source branch: `frontend`
- Member 3 branch: `feature/market-mirror-member3`
- Member 4 branch: `member4-branch`
- Shared/default branch: `main`

## Branch-by-branch result

### Member 1 — `krish-backend`

The backend implementation is the base of `tilt-integration`. It contains the Supabase migration, authenticated API routes, domain types, market engine, financial engine, and tests.

### Member 2 — `frontend`

The frontend screens are integrated into the working app and wired to Member 1's API provider: dashboard, fictional markets, BUY/SELL terminal, portfolio/P&L, market simulator, Finance Academy, Investment Architect and CSV preview.

### Member 3 — `feature/market-mirror-member3`

Contains four standalone behavioural detectors and tests: FOMO, panic selling, overtrading and concentration.

**Status: deferred to the final phase.** Before connecting this module, adapt the detector's rupee-denominated prices/charges and holdings contract to Member 1's integer-paise API shapes, and map lower-case Member 4 lesson IDs to Member 3's recommendation IDs.

### Member 4 — `member4-branch`

The branch contains two folders:

1. `Chinese-Spy-frontend/` — a copied frontend tree based on Member 2's original UI. It includes a static/mock `/behaviour` screen; this screen is not a live detector integration and is not imported into the working app.
2. `tilt-member4/` — distinct pure TypeScript modules for five Finance Academy lessons, SIP and goal calculators, a CSV transaction parser, ten fictional companies, eight market events, four demo scenario definitions, shared types and unit tests.

**Integrated on review branch `member4-integration`:**
- Five stable-ID Academy lessons and quiz content are wired into the existing Academy screens.
- SIP and goal calculator screens call Member 4's validated pure functions.
- CSV upload screen uses the validating parser and displays valid/invalid rows.
- The pure TypeScript modules, content catalogue, demo scenarios and source tests are included under `src/lib/member4` and `tests/member4`.
- The parser's day-first date parsing and data-row numbering have been hardened and tests added.

**Intentionally inactive:** Member 4's ten-company catalogue and event/scenario content are not seeded into Supabase. They use different symbols and event IDs than the current eight-company live market (ASTE, NVMT, BGTC, HVFD, ZNFC, MEDX, URBN, LOGX). Activating those fixtures without a compatible database seed and scenario adapter would break order execution and price lookups.

### `main`

Keep `main` untouched while the integrated app is being validated. The deployment and team review should use the intended integration branch.

## Verification still required

Run on the local project after pulling `member4-integration`:

```cmd
npm run lint
npm run typecheck
npm test
npm run build
```

Also verify the login gate, Academy stable-ID routes, SIP/goal calculations and CSV preview in a browser. The review branch has been assembled through GitHub's source APIs; it has not been executed in the local Windows/Supabase environment.

## Safety boundaries

- Do not overwrite `main`, `krish-backend`, `frontend`, `member3` or `member4-branch`.
- Never commit `.env.local`, Supabase service-role keys, or other secrets.
- Keep Supabase as the source of truth for cash, holdings, orders, market prices and transaction history.
- Do not import CSV rows directly into the live simulator until a dedicated, authenticated historical-import design exists.
