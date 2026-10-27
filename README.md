# E-Waste Disposal Survey Platform

A research-ready web platform for the MSRIT campus survey on e-waste awareness, practices and attitudes. It turns Google Forms/Sheets survey responses into privacy-aware analytics with transparent methodology, CSV/PDF exports and an IEEE manuscript scaffold.

**Live locally:** `npm run dev` → http://localhost:5173 (UI) · http://localhost:3001 (API)

## What this platform does

- **Participate** — embeds the live Google Form (public respondent URL from `.env`) with an open-in-Forms fallback; no responses are collected by this app.
- **Dashboard** — target-aware KPI cards (30 students / 30 teaching / 30 non-teaching = 90 target), per-question distributions for all 20 items (Q1–Q20) with Wilson 95 % CIs, awareness-score distribution, respondent/department breakdowns, filterable by category, department and date.
- **Findings** — auto-generated descriptive findings with explicit denominators (including incineration, landfill, health-effects, pollutants and environmental-component items) plus exploratory student-vs-staff two-proportion z-tests.
- **Environment** — cited general education on e-waste, incineration/landfill risks and responsible handling (clearly separated from survey results).
- **Report** — manuscript-style research report populated **only** from validated live data (pending template otherwise), with print-friendly output, CSV and PDF export.
- **Methodology** — validation rules, questionnaire sections, planned-vs-achieved sample (target 90), awareness-score composite, small-group suppression.
- **Exports** — aggregated CSV, summary PDF and an IEEE manuscript scaffold (placeholder citations clearly flagged).

## Live Google integration (status)

- Responder form (public): configured in `.env` → `SURVEY_URL` / `SURVEY_EMBED_URL`.
- Response sheet: **not yet connected** — it is private (401 without auth). The form owner must deploy the Apps Script web app from `docs/GOOGLE-INTEGRATION.md`, then set `DATA_SOURCE=appsscript` + `APPS_SCRIPT_URL`. Until then the dashboard honestly shows the unconfigured/empty state (demo only via explicit opt-in). The form **editor URL is never included in this repository**.

## PWA and Android

- Installable PWA: `manifest.webmanifest`, generated icons, theme colour, and a service worker (`public/sw.js`) that **never caches `/api/*`** (live results can't be served stale; offline shows error/retry states).
- Native Android packaging is configured via Capacitor (`capacitor.config.ts`) — see `docs/ANDROID.md`. No APK is claimed: this machine lacks Java/Android SDK and the registry connection for `@capacitor/*` interrupted; reproducible commands are documented.

## Architecture

```
src/lib/       shared types, schema (20 questions Q1–Q20, 5 sections, response targets), normalization, analysis — pure, unit-tested
server/        Express 5 API, env validation (zod), pluggable data sources, static dist serving
src/pages/     React 19 + React Router pages (Home, Survey, Dashboard, Findings, Environment, Report, Methodology, About, Admin)
tests/         Vitest suites for normalization, analysis, API and exports (89 tests)
docs/          survey setup, Google integration, deployment, Android
public/        PWA manifest, service worker, icons, MSRIT banner images
data/          sample CSV (synthetic — clearly labelled, never presented as real responses)
```

**Privacy model:** the public API only serves server-side aggregates. Individual rows and free-text suggestions are never returned by any public endpoint. Category/department-filtered views suppress results when *n* < 5.

## Data sources

| `DATA_SOURCE` | Needs | Notes |
|---|---|---|
| `appsscript` | `APPS_SCRIPT_URL` | Recommended. Apps Script `doGet` web app (see `docs/GOOGLE-INTEGRATION.md`). |
| `sheets` | `GOOGLE_SHEETS_ID` + `GOOGLE_API_KEY` | Published-sheet CSV/JSON export via API key. |
| `local` | `LOCAL_DATA_FILE` | CSV or JSON export; good for offline work. Sample in `data/sample-responses.csv`. |
| `none` | — | Empty states only (until demo is explicitly requested). |

Demo data is **opt-in** (`DEMO_MODE=auto` + `?demo=1`), generated deterministically, and always labelled as synthetic on the dashboard. It is never presented as real survey evidence.

## Quick start

```bash
npm install
npm run dev            # API :3001 + UI :5173
```

To try the platform with the bundled synthetic CSV:

```bash
# .env (copy from .env.example)
DATA_SOURCE=local
LOCAL_DATA_FILE=data/sample-responses.csv
```

Other commands: `npm run build` (typecheck + production bundle), `npm start` (serves `dist/` + API from :3001), `npm test` (89 tests), `npm run lint`, `npm run typecheck`.

## Configuration

Copy `.env.example` to `.env`. Every variable is documented there. Highlights:

- `ADMIN_TOKEN` (min 8 chars) gates `POST /api/admin/refresh`, `GET /api/admin/diagnostics` and `GET /api/env-issues` via `Authorization: Bearer <token>` (timing-safe compare, never logged, never persisted).
- `DEMO_MODE=never` hard-disables demo fallbacks (use in production).
- `CACHE_TTL_SECONDS` controls upstream caching (default 300).

## API surface

| Endpoint | Auth | Purpose |
|---|---|---|
| `GET /api/health` | public | Source connectivity, row count, cache age |
| `GET /api/config` | public | Survey links, source kind, project title |
| `GET /api/summary?category=&department=&since=&demo=` | public | Full aggregated summary |
| `GET /api/env-issues` | admin | Env validation issues + warnings |
| `POST /api/admin/refresh` | admin | Invalidate cache and re-fetch |
| `GET /api/admin/diagnostics` | admin | Non-secret env/source diagnostics |

## Methodology guarantees

- Aggregation denominators are **per-question valid responses**; missing answers are counted and displayed, never treated as negative answers.
- A row is excluded only when the respondent category is unusable or the row is almost entirely blank; other problems stay visible as `Other:`/`Unexpected:` buckets with the original text preserved.
- The awareness score is a pre-specified, unvalidated 5-item composite (`AWARENESS_SCORE_RULE` in `src/lib/schema.ts`) — descriptive only.
- Two-proportion comparisons report a p-value floor and require *n* ≥ 5 on both sides.
- Findings are descriptive, machine-generated, and never causal.

## Documentation

- `docs/SURVEY-SETUP.md` — exact 20 questions (Q1–Q20), live Google Form links, response-sheet schema.
- `docs/GOOGLE-INTEGRATION.md` — Apps Script web-app code, Sheets API key method, security notes.
- `docs/DEPLOYMENT.md` — deployment and demo checklists.

## Status

Built and verified locally: typecheck ✓, lint ✓ (0 warnings), 89/89 tests ✓, production build ✓. The platform makes no claim that a Google integration is connected until a live fetch has been verified against the configured endpoint.
