# TILT integration branch

This branch combines Member 1's Supabase-backed simulator/API with Member 2's dashboard, markets, trading terminal, portfolio, simulator, and Finance Academy UI.

## Branch safety

- `krish-backend`: Member 1 backend source of record.
- `frontend`: Member 2 UI source of record.
- `tilt-integration`: integration target.
- `main`: left untouched.

## Local setup (Windows CMD)

From the repository root:

```cmd
git fetch origin
git switch tilt-integration
git pull origin tilt-integration
npm install
```

Use `npm install`, not `npm ci`, for this first install because the package manifest now includes the frontend dependencies and the committed backend lockfile needs to be regenerated locally. Commit the regenerated `package-lock.json` after verifying it contains no secrets.

Ensure `.env.local` exists locally with the Supabase URL and publishable key used by the backend. Never commit this file or a service-role key. The existing Supabase migration should already be applied to the project's database.

## Run and verify

```cmd
npm run dev
```

Open `http://localhost:3000`, sign in at `/login`, and open the dashboard. The dashboard loads the authenticated user's latest simulation. Use **New Simulation** to create a separate clean ₹10,00,000 session; existing simulations and their trades remain stored.

Run checks after installing:

```cmd
npm run typecheck
npm test
npm run lint
npm run build
```

## Integrated routes

- `/`: API-backed dashboard and recent transactions.
- `/markets`: fictional companies, current prices, current-step news, and persisted price history.
- `/trading`: authenticated BUY/SELL orders through `POST /api/sessions/{sessionId}/orders`.
- `/portfolio`: backend-calculated portfolio, P&L and allocation.
- `/simulator`: current market step and authenticated market advancement.
- `/academy` and `/academy/[lessonId]`: Member 2's static learning content.
- `/portfolio/architect`: Member 2's illustrative SIP/goal calculator.
- `/portfolio/upload`: CSV preview only; it does not import transactions.

## Data ownership and integration notes

- Supabase and Member 1's API routes remain the source of truth for cash, holdings, orders, charges, prices, market steps, and transaction history.
- The frontend does not persist simulated trades in `localStorage`.
- Order requests send a fresh `clientOrderId` UUID and never send a client-calculated execution price.
- Amounts returned by the API use integer paise; UI formatting divides by 100.
- Market Mirror / behavioural analytics are intentionally deferred. `/behaviour` is only a placeholder and is not linked from the sidebar.
- CSV upload is preview-only; persistent CSV import remains unimplemented.
- The combined application has not yet been executed against the local Windows/Supabase environment. Complete the four local checks above and share any errors before considering the integration verified.

## Authentication and logout

- Every application page except `/login` is protected by the Next.js `proxy.ts` gate.
- Unauthenticated visitors are redirected to `/login`; after successful sign-in they return to the originally requested internal path.
- Authenticated visitors opening `/login` are redirected to the dashboard (or the validated internal `next` path).
- The sidebar displays the authenticated user's email and a **Log out** control. Sign-out uses the Supabase browser client, clears the auth session, and navigates to `/login`.
- API handlers retain their own authentication and session-ownership checks. The proxy does not replace API authorization.
