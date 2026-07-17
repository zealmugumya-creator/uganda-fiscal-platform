# Uganda Fiscal Intelligence Platform

15 products + master portal for fighting tax evasion, fraud and fiscal waste in Uganda.
Every app has an embedded AI agent (bottom-right ✨ button) with a product-specific persona.

## Live

- **Frontend (Cloudflare Pages):** https://uganda-fiscal-platform.pages.dev ✅ DEPLOYED
- **Backend (Render):** https://uganda-fiscal-platform-api.onrender.com — deploy steps below

## Architecture

```
frontend/                  → Cloudflare Pages (static)
  index.html               → Master Portal (links to all 15 apps)
  <15 product apps>.html   → each injected with assets/platform.js
  assets/platform.js       → shared runtime: AI widget + navigation + API client
backend/                   → Render (Node web service)
  server.js                → /health /api/agent /api/stats /api/demo /api/contact
render.yaml                → Render blueprint (one-click infra definition)
```

How they work together: every page loads `platform.js`, which draws the AI assistant,
adds portal↔product navigation, and talks to the shared backend. The backend holds one
agent persona per product and calls the Claude API (`claude-sonnet-5`). If the backend is
down or the AI key missing, the widget degrades gracefully to built-in offline answers.

## Deploy the backend to Render (5 minutes)

1. Push this folder to GitHub:
   ```
   git remote add origin https://github.com/<your-username>/uganda-fiscal-platform.git
   git push -u origin main
   ```
   (The repo is already initialised and committed.)

2. In the Render dashboard (https://dashboard.render.com/new/workspace):
   - Create your workspace if you haven't → **New +** → **Blueprint**
   - Connect your GitHub account and pick the `uganda-fiscal-platform` repo
   - Render reads `render.yaml` automatically → creates **uganda-fiscal-platform-api**
   - When prompted, set the secret env var **ANTHROPIC_API_KEY**
     (get a key at https://console.anthropic.com → API Keys)

3. Confirm the service name is **uganda-fiscal-platform-api** so its URL is
   `https://uganda-fiscal-platform-api.onrender.com` — the frontend already points there.
   If Render gives it a different URL, either rename the service or update the URL in
   `inject.js`, re-run `node inject.js` after clearing the old tags, and redeploy Pages.

4. Test: open https://uganda-fiscal-platform-api.onrender.com/health — should show
   `"ok":true,"ai":true`. The status dot in every app's AI widget turns green.

## Redeploy commands

- Frontend: `npx wrangler pages deploy frontend --project-name uganda-fiscal-platform --branch main --commit-dirty=true`
- Backend: `git push` (Render auto-deploys on push)

## Local development

```
node backend/server.js       # API on http://localhost:10000
node static-server.js        # frontend on http://localhost:8788
```
The widget auto-targets localhost:10000 when opened from localhost
(or set `localStorage.ufp_api` to any API URL to override).

## Environment variables (backend)

| Var | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | enables real AI agent replies (required for AI) |
| `ANTHROPIC_MODEL` | default `claude-sonnet-5` |
| `ALLOWED_ORIGINS` | CORS allowlist, default `*` — tighten to `https://uganda-fiscal-platform.pages.dev` in production |
| `ADMIN_TOKEN` | protects `/api/admin/leads` (demo + contact submissions) |
