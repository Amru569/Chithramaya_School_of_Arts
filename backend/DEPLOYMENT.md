# Deploying Chithramaya — GitHub → Render → Vercel → PWA

This follows the order: push to GitHub → integrate frontend/backend →
deploy backend (Render) → configure CORS → deploy frontend (Vercel) →
test → PWA → final launch. PWA is last, on purpose — get the live
frontend/backend connection solid first.

## 0. Before you push anything

Both backend/.gitignore and frontend/.gitignore already exclude .env,
node_modules/, dist/, the local .db file, and uploaded photos/receipts.
Double check nothing secret is staged before your first commit.

## 1. Deploy the backend to Render

- New -> Web Service -> connect your GitHub repo, root directory backend/.
- Build command: pip install -r requirements.txt
- Start command: uvicorn app.main:app --host 0.0.0.0 --port $PORT
- Environment variables (Render dashboard -> Environment):

  FRONTEND_ORIGINS      = https://your-chithramaya.vercel.app
                          (set this AFTER step 3, once you know the real
                          Vercel URL -- Render lets you edit env vars and
                          redeploy)
  SESSION_COOKIE_SECURE = true
  DEFAULT_ADMIN_PASSWORD      = a real password, not the default
  DEFAULT_ASSISTANT_PASSWORD  = a real password, not the default

  See backend/.env.example for the full list (all optional beyond these).

- Deploy, then confirm the API is reachable:
  https://your-chithramaya-backend.onrender.com/api/config
  should return JSON, not an error.

Note on Render's free tier: the filesystem is ephemeral (uploaded
student photos/receipts are wiped on every redeploy or restart after
idling), and the service spins down after inactivity, so the first
request after a while will be slow (~30-50s cold start). Fine for
testing; for real production use, add Render's persistent disk add-on
and consider a paid instance to avoid cold starts.

## 2. Point the frontend at the Render backend

Set the Vercel environment variable (Project Settings -> Environment
Variables):

  VITE_API_URL=https://your-chithramaya-backend.onrender.com

No trailing slash, no /api suffix -- the app adds that itself. Locally
this stays unset and the Vite dev-server proxy handles it instead (see
frontend/.env.example).

## 3. Deploy the frontend to Vercel

- New Project -> import the GitHub repo, root directory frontend/.
- Framework preset: Vite. Build command "npm run build", output
  directory "dist" (Vercel usually detects these automatically).
- Add the VITE_API_URL env var from step 2 before the first deploy.
- Deploy. Note the resulting URL (e.g. https://your-chithramaya.vercel.app).

## 4. Close the loop: update CORS on Render

Go back to Render -> Environment -> set FRONTEND_ORIGINS to your real
Vercel URL from step 3, then redeploy the backend. Until this is set
correctly, API calls from the deployed frontend will fail with CORS
errors in the browser console -- that's expected until this step.

## 5. Test the deployed app

Go through the checklist from your message: login (all three roles),
admin portal, student portal, attendance (mark + window states),
calendar, batches (multi-schedule), chat (including broadcast),
announcements (branch/batch targeting), reports (monthly, star
indicator, download), registration (self-register with photo), and
general API/DB behavior.

If login fails with a CORS or cookie error specifically in production
but works locally, it's almost always one of:
- FRONTEND_ORIGINS on Render doesn't exactly match the Vercel URL
  (must be exact, including https://, no trailing slash)
- SESSION_COOKIE_SECURE isn't set to true on Render
- VITE_API_URL on Vercel is missing -- env var changes need a redeploy
  to take effect

## 6. PWA -- already built in, verify it

The manifest, service worker, and icons (generated from your logo, in
frontend/public/icons/) are already wired up via vite-plugin-pwa --
nothing left to configure. npm run build produces manifest.webmanifest,
sw.js, and registers the service worker automatically. Once deployed:

- Android Chrome: should show an "Install app" prompt, or
  Menu -> "Install app".
- iPhone Safari: Share -> "Add to Home Screen" (iOS doesn't
  auto-prompt like Android -- this is normal iOS behavior, not a bug).
- Desktop Chrome/Edge: install icon in the address bar.

Update mechanism: registerType: "autoUpdate" means a new deploy is
picked up automatically the next time the app is opened -- no manual
reinstall needed.

## Overall flow

Push to GitHub
      |
Deploy backend -> Render (set env vars)
      |
Set VITE_API_URL -> Vercel
      |
Deploy frontend -> Vercel
      |
Set FRONTEND_ORIGINS on Render to the real Vercel URL, redeploy
      |
Test everything end to end
      |
Verify PWA install on Android / iPhone / desktop
      |
Live
