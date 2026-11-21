# Deploy TILT on Vercel

This guide deploys the integrated Next.js application from the `tilt-integration` branch. It does not change the GitHub `main` branch.

## 1. Prepare the Git branch

On your local Windows machine:

```cmd
git switch tilt-integration
git pull --ff-only origin tilt-integration
npm install
npm run lint
npm run typecheck
npm test
npm run build
git status --short
```

The committed `package-lock.json` must match `package.json`. If `git status --short` shows `package-lock.json` modified after `npm install`, commit and push it:

```cmd
git add package-lock.json
git commit -m "Update lockfile for integrated frontend dependencies"
git push origin tilt-integration
```

Do not add `.env.local`, service-role keys or any other secrets.

## 2. Import the repository into Vercel

1. Sign in to Vercel using the GitHub account that can access `iluxon09/Chinese-Spy`.
2. Select **Add New → Project**.
3. Import `iluxon09/Chinese-Spy`.
4. Select `tilt-integration` as the branch to deploy.
5. Set the project configuration:

| Setting | Value |
|---|---|
| Framework Preset | Next.js |
| Root Directory | `./` |
| Build Command | `npm run build` (or Next.js auto-detected default) |
| Install Command | `npm install` / Vercel's npm lockfile-based default |
| Output Directory | Leave default |
| Node.js Version | 22.x |

Do not deploy the repository's `main` branch for this version: that branch is maintained separately and does not contain the integrated app.

After importing, open **Settings → Environments → Production → Branch Tracking** and set the Production Branch to `tilt-integration`. This makes future pushes to that branch update the public production deployment. Other branches can be deployed as previews.

## 3. Add Vercel environment variables

In the import screen or **Project → Settings → Environment Variables**, add these two variables to Production and Preview (and Development if you use Vercel's local environment workflow):

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
GEMINI_MODEL=gemini-3.8-flash
```

Use the project's actual Supabase Project URL and publishable key. Create a Gemini API key in Google AI Studio and set it as `GEMINI_API_KEY`; `GEMINI_MODEL` is optional. Keep both Gemini variables server-side and never prefix them with `NEXT_PUBLIC_`. Never add a Supabase service-role key or secret key to a `NEXT_PUBLIC_*` variable. Never upload `.env.local` or API keys to GitHub. Google AI Pro/Ultra plan quotas are for the AI Studio interface; requests from this deployed application use Gemini API quotas and billing separately. See [Google AI plans](https://ai.google.dev/gemini-api/docs/google-ai-plans) and the [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing).

Trigger a redeployment after changing environment variables. The AI Risk Coach reports a configuration error until `GEMINI_API_KEY` is present in the deployment environment.

## 4. Apply the latest Supabase safeguards

Before using `/coach` or running the market for a long demo, confirm the database has the required migrations. A fresh database must receive all migrations in timestamp order as listed in the root README. If the project already has migrations `20261120000000` through `20261121000300` applied, run only these two new files in Supabase SQL Editor:

- `supabase/migrations/20261121000400_ai_coach_rate_limits.sql` — enables atomic per-user AI Coach quotas (6 requests per minute and 50 per UTC day). The Coach API intentionally returns a configuration error until this migration exists.
- `supabase/migrations/20261121000500_market_step_cap.sql` — adds the database-level 10,000-step session ceiling.

Do not re-run migrations that are already applied. For any other migration history, inspect the Supabase migration history and apply only missing migrations. Take a database backup before applying schema changes.

## 5. Configure Supabase Auth for the deployed URL

After Vercel gives you the public deployment URL, for example `https://your-tilt-project.vercel.app`:

1. Open Supabase Dashboard → Authentication → URL Configuration.
2. Set **Site URL** to the exact public Vercel URL, for example `https://your-tilt-project.vercel.app`.
3. Add the exact production site URL and local testing URL to the allowed Redirect URLs, for example:
   - `https://your-tilt-project.vercel.app`
   - `http://localhost:3000/**`
4. If you use Vercel preview deployments for authentication testing, add the preview wildcard matching your Vercel account/team, for example `https://*-<team-or-account-slug>.vercel.app/**`. Use the exact production URL for the primary Site URL.

The app uses Supabase email/password authentication. If email confirmation is enabled, test the confirmation email and return URL after deployment. For a live judging session, pre-create separate demo accounts or configure SMTP; do not rely on Supabase's default email sender to deliver last-minute sign-up confirmations.

## 6. Verify the public deployment

After Vercel reports the deployment as Ready:

1. Open the deployment URL in a private/incognito browser window.
2. Confirm unauthenticated navigation redirects to `/login`.
3. Create or sign in with a Supabase test account.
4. Confirm the dashboard loads and create a fresh simulation.
5. Check all eight fictional companies load.
6. Place a small BUY order and confirm cash/holdings update.
7. Sell a small part of the position and confirm the transaction history.
8. Advance one market step and verify the price/history updates.
9. Test logout and confirm protected pages redirect back to login.

Only share the public URL with judges after these checks pass. Keep the Supabase database and API protected by Auth and RLS; the browser publishable key is expected to be public, but the service-role key must remain secret.
