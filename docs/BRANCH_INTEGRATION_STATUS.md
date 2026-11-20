# Team integration and release status

## Integration branches

- `tilt-integration`: main working integration target.
- `member4-integration`: combined Members 3 and 4 feature review branch.
- `frontend-hardening`: responsive shell, sign-in UI, provider lifecycle and CI hardening based on the combined branch.
- `krish-backend`, `frontend`, `feature/market-mirror-member3`, and `member4-branch`: original team contribution branches; preserve them.

## Member contributions

### Member 1 — backend
Supabase schema, authenticated API routes, integer-paise trading engine, market engine, portfolio calculations, idempotent order handling and session ownership checks.

### Member 2 — frontend
Dashboard, Markets, Trading, Portfolio, Simulator, Academy, Investment Architect and Behavioral Analysis screens. The screens use the backend data provider rather than a separate localStorage trading engine.

### Member 3 — Behavioral Analysis
Four read-only pattern detectors: panic-selling-like exits, FOMO-like entries, trading frequency and portfolio concentration. The adapter converts live API values from paise to rupees and analyses the current user's authenticated simulation data. Recommendations link to Member 4's stable Academy lesson IDs.

### Member 4 — supporting modules
Five Academy lessons, SIP and goal calculators, and alternate fictional-company/event/scenario reference data. The alternate symbols/events are not seeded into the active Supabase market because they do not match the canonical eight symbols.

## Frontend hardening

- Rebuilt the sign-in page with a responsive split layout, clearer sign-in/create-account modes, password visibility toggle, differentiated error/confirmation messaging and safe same-origin post-login redirects.
- Added a shared account-control component for desktop and mobile sign-out.
- Added responsive mobile navigation, active-route indication, a keyboard-accessible skip link and focus-visible styles.
- Changed the shared data provider to bootstrap once per authenticated session instead of restarting on every route navigation. Sign-out clears in-memory session, portfolio, market and history data.
- Added safe redirect unit tests and a GitHub Actions workflow.

## Safety boundaries

- No database migration or financial write logic is changed by the frontend-hardening work.
- Behavioral Analysis remains read-only and reports observable simulation patterns, not personality or intent.
- Never commit `.env.local`, Supabase service-role keys or other secrets.
- Do not force-push or overwrite original member branches.
- Merge to `tilt-integration` only after the exact PR head passes lint, typecheck, tests, build and a live Supabase smoke test.
- Merge to `main` only after team approval.
