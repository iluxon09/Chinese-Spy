# Frontend safety and architecture

## Authentication
- `proxy.ts` verifies the signed Supabase claims before allowing protected page requests.
- `/login` is the only public application page; API handlers keep their own authorization and session ownership checks.
- The sign-in form accepts only same-origin relative return paths. It supports email confirmation after account creation and does not impose the signup password minimum on existing-account sign-in.
- The shared account control signs out through Supabase Auth and clears the provider's in-memory account data.

## Application shell
- The desktop sidebar and mobile navigation use one shared route configuration.
- The active route is announced using `aria-current="page"`.
- The mobile navigation includes the same account/logout control.
- A skip-to-content link and visible keyboard focus styling are available.

## Shared data lifecycle
- `TiltDataProvider` loads the active session once per authenticated session. The initial snapshot uses three concurrent reads: portfolio, current market and one batched all-symbol price-history request.
- A logout clears the current session, portfolio, market and price history in memory.
- After BUY/SELL, the client refreshes only the portfolio snapshot; it does not reload market metadata or price history.
- After market advancement, the client applies the committed prices and events returned by the atomic RPC, appends those points to local history, and refreshes only the portfolio valuation.
- The batched history endpoint paginates internally to avoid PostgREST row-limit truncation. Existing symbol-filtered history requests remain supported.
- Concurrent duplicate order submissions and market-advance calls are guarded in the shared provider.

## Checks
The root GitHub Actions workflow runs dependency reconciliation, a clean npm install, production dependency audit, ESLint, TypeScript, Vitest and a Next.js production build. Supabase variables in CI are placeholders used only for compilation; no real secrets are stored in GitHub.
