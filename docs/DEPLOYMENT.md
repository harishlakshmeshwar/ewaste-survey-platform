# Deployment & Demo Checklists

## Local development

```bash
npm install
cp .env.example .env        # then edit — see comments in the file
npm run dev                 # API :3001, UI :5173 (proxied /api)
```

Production-style single-process run (serves the built UI and the API from one port):

```bash
npm run build
npm start                   # http://localhost:3001
```

## Deploying (e.g. Render / any Node host)

1. Push the repository (never include `.env` — it is git-ignored).
2. Create a **Web Service** from the repo:
   - Build command: `npm install && npm run build`
   - Start command: `npm start`
   - A `render.yaml` is included with these settings.
3. Set host environment variables (never bake them into the repo):
   - `NODE_ENV=production`
   - `DATA_SOURCE=appsscript` (or `sheets` / `local`)
   - the matching credential(s) from `docs/GOOGLE-INTEGRATION.md`
   - `ADMIN_TOKEN=<long random string, min 8 chars>`
   - `DEMO_MODE=never`
4. Verify: `GET /api/health` → `ok: true`, `connected: true`, non-zero `rowCount`.
5. Verify admin: `GET /api/admin/diagnostics` with `Authorization: Bearer <ADMIN_TOKEN>` → `config.adminTokenConfigured: true`, no unexpected warnings.
6. Open the dashboard on the public URL — source badge must show the live source, **no "demo"/"synthetic" label**.
7. Confirm HTTPS on the host and that no secret appears in client JS (search the built `dist/assets/*.js` for your token/key — zero matches expected).

## Production hardening checklist

- [ ] `DEMO_MODE=never`
- [ ] `ADMIN_TOKEN` set to a long random value; rotate if ever exposed
- [ ] `.env` exists only on the host, never in git or screenshots
- [ ] Logs reviewed for secrets (`npm start` logs nothing sensitive by design)
- [ ] `CACHE_TTL_SECONDS` sensible for your response volume (default 300)
- [ ] Form configured per `docs/SURVEY-SETUP.md`; headers match `src/lib/schema.ts`
- [ ] A test response flows end-to-end (form → sheet → `/api/health` rowCount → dashboard)

## Demo / walkthrough checklist (for presentations)

Use only when you want to show the UI without live data — the dashboard will clearly label everything synthetic:

```bash
# terminal 1
DATA_SOURCE=none DEMO_MODE=auto npm run dev
# open http://localhost:5173/?demo=1  (or click the demo toggle on the dashboard)
```

- [ ] Demo banner / "synthetic" label is visible on the dashboard
- [ ] 120 deterministic demo responses (same numbers on every load)
- [ ] Filters (category / department / date) work against demo data
- [ ] CSV + PDF + manuscript exports download and open correctly
- [ ] Methodology page explains the awareness-score rule and suppression
- [ ] Turning demo off (removing `?demo=1`) returns to the empty state — proving demo never leaks into normal views

## Smoke-test script (paste into PowerShell)

```powershell
$b = 'http://localhost:3001'
(Invoke-WebRequest "$b/api/health").Content
(Invoke-WebRequest "$b/api/summary?demo=1").StatusCode   # 200
(Invoke-WebRequest "$b/api/config").StatusCode           # 200
# admin (should 401 without token, 200 with):
try { Invoke-WebRequest "$b/api/admin/diagnostics" } catch { $_.Exception.Response.StatusCode }
```
