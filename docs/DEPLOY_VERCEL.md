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
```

Use the project's actual Supabase Project URL and publishable key. Never add a Supabase service-role key or secret key to a `NEXT_PUBLIC_*` variable. Never upload `.env.local` to GitHub.

Trigger a redeployment after changing environment variables.

## 4. Configure Supabase Auth for the deployed URL

After Vercel gives you the public deployment URL, for example `https://your-tilt-project.vercel.app`:

1. Open Supabase Dashboard → Authentication → URL Configuration.
2. Set **Site URL** to the public Vercel URL.
3. Add the public URL and local testing URL to the allowed Redirect URLs, for example:
   - `https://your-tilt-project.vercel.app/**`
   - `http://localhost:3000/**`
4. If you use Vercel preview deployments for authentication testing, add the appropriate Vercel preview wildcard URL for your account/team, following the Supabase Redirect URLs documentation.

The app uses Supabase email/password authentication. If email confirmation is enabled, test the confirmation email and return URL after deployment.

## 5. Verify the public deployment

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
