# Uganda Fiscal Intelligence Platform

16 **separate apps** — a master portal + 15 products — that work as a team through one
shared backend. Every app is its own website, its own installable PWA (own name, icon,
brand color), fully responsive, with an embedded AI agent (✨ button) tailored to its job.

## Live apps (Cloudflare Pages)

| App | URL |
|---|---|
| **Master Portal** | https://uganda-fiscal-platform.pages.dev |
| TaxLink (EFRIS compliance) | https://taxlink-uganda.pages.dev |
| TaxLink Connect (middleware) | https://taxlinkconnect-uganda.pages.dev |
| CreditTrack (distributor credit) | https://credittrack-uganda.pages.dev |
| VerifyUG (product authentication) | https://verifyug-uganda.pages.dev |
| GuardPost (warehouse fraud) | https://guardpost-uganda.pages.dev |
| PayrollGuard (payroll compliance) | https://payrollguard-uganda.pages.dev |
| DeliverUG (last-mile logistics) | https://deliverug-uganda.pages.dev |
| ProcureGuard (procurement integrity) | https://procureguard-uganda.pages.dev |
| RetailPulse (retail intelligence) | https://retailpulse-uganda.pages.dev |
| PowerCost (energy cost) | https://powercost-uganda.pages.dev |
| EFRIS Bridge (informal sector USSD) | https://efrisbridge-uganda.pages.dev |
| EFRIS Intelligence (URA dashboard) | https://efrisdash-uganda.pages.dev |
| DebtWatch (national debt tracker) | https://debtwatch-uganda.pages.dev |
| FiscalAI (debt optimisation) | https://fiscalai-uganda.pages.dev |
| Customs Intelligence | https://customs-uganda.pages.dev |

**Backend (Render):** https://uganda-fiscal-platform-api.onrender.com — deploy steps below.

## How the separate apps work as a team

```
frontend/            → portal only (its own Pages project)
apps/<slug>/         → one folder per product = one Pages project = one installable app
  index.html         → the product app (+ shared responsive layer)
  manifest.json      → own PWA identity (name, icon, color)
  sw.js              → own offline cache
  assets/            → platform.js runtime, responsive.css, branded icons
backend/server.js    → the shared brain every app talks to
```

Collaboration happens through the shared backend:
- `/api/agent` — per-product AI agents (Claude), one persona per app
- `/api/store/:product/:collection` — each app persists its own records
- `/api/events` — the cross-app feed: GuardPost can publish a fraud alert,
  CreditTrack an over-limit distributor, and every other app can read and react
- `/api/stats`, `/api/demo`, `/api/contact` — shared platform data and lead capture

In any app's console: `UFP.client.save('notes', {msg:'hi'})`, `UFP.client.emit('alert','title','detail')`, `UFP.client.feed()`.

## Responsive behaviour

Every app ships `assets/responsive.css` (folds the sidebar into a sticky top bar under
900px, wraps headers, scrolls tables) plus a runtime grid-folder in `platform.js` that
measures every CSS grid and refits it to the viewport (data rows scroll, card grids fold).

## Deploy the backend to Render (5 minutes)

1. Repo: https://github.com/zealmugumya-creator/uganda-fiscal-platform (already pushed)
2. In https://dashboard.render.com → **New + → Blueprint** → connect the repo.
   Render reads `render.yaml` → creates **uganda-fiscal-platform-api**.
3. Set the secret env var **ANTHROPIC_API_KEY** (console.anthropic.com).
4. Test: https://uganda-fiscal-platform-api.onrender.com/health → `"ok":true,"ai":true`.
   All 16 apps' AI agents go live at once; widget status dots turn green.

## Redeploy commands

- One product app: `npx wrangler pages deploy apps/<slug> --project-name <slug>-uganda --branch main --commit-dirty=true`
- Portal: `npx wrangler pages deploy frontend --project-name uganda-fiscal-platform --branch main --commit-dirty=true`
- Backend: `git push` (Render auto-deploys)
- After editing `frontend/assets/platform.js` or `responsive.css`, sync copies to all apps:
  `Get-ChildItem apps -Directory | % { Copy-Item frontend\assets\platform.js "$($_.FullName)\assets" -Force; Copy-Item frontend\assets\responsive.css "$($_.FullName)\assets" -Force }`

## Environment variables (backend)

| Var | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | enables real AI agent replies (required for AI) |
| `ANTHROPIC_MODEL` | default `claude-sonnet-5` |
| `ALLOWED_ORIGINS` | CORS allowlist, default `*` |
| `ADMIN_TOKEN` | protects `/api/admin/leads` |
