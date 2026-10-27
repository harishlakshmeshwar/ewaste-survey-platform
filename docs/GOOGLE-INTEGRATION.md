# Google Integration Guide

Two verified-by-design options for feeding live Google Form responses into the platform. **Neither is considered connected until you complete the verification steps at the end and `/api/health` reports `connected: true`.** The platform never receives Google passwords or OAuth tokens; it only reads a published endpoint.

## Option A — Apps Script web app (recommended)

Create a Google Sheet that is the form's response destination, then:

**Extensions → Apps Script**, replace the contents with:

```javascript
/**
 * Serves the linked Google Form response sheet as JSON for the
 * e-waste survey platform. Deploy: Deploy → New deployment →
 * Web app → Execute as: Me → Who has access: Anyone.
 */
const SHEET_NAME = 'Form Responses 1'; // rename if your tab differs

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || 'getData';
  if (action !== 'getData') {
    return ContentService.createTextOutput(
      JSON.stringify({ error: 'Unknown action. Use ?action=getData' })
    ).setMimeType(ContentService.MimeType.JSON);
  }
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) {
    return ContentService.createTextOutput(
      JSON.stringify({ error: 'Sheet not found: ' + SHEET_NAME })
    ).setMimeType(ContentService.MimeType.JSON);
  }
  const values = sheet.getDataRange().getValues();
  // {values: [[header...],[row...],...]} — same shape as the Google Sheets API.
  return ContentService.createTextOutput(JSON.stringify({ values: values }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

Then in the platform's `.env`:

```bash
DATA_SOURCE=appsscript
APPS_SCRIPT_URL=https://script.google.com/macros/s/<DEPLOYMENT_ID>/exec
```

The server calls `${APPS_SCRIPT_URL}?action=getData` and accepts `{values}`, `{rows|data}`, or a plain array payload (`coerceRows` in `server/sources.ts`).

## Option B — Published sheet + API key

1. In the response sheet: **Share → Anyone with the link → Viewer**.
2. In Google Cloud Console, enable the **Google Sheets API** for your project and create an API key (restrict it to the Sheets API and, ideally, to your server's IP or a referrer).
3. `.env`:

```bash
DATA_SOURCE=sheets
GOOGLE_SHEETS_ID=<the long ID from the sheet URL>
GOOGLE_API_KEY=<your key>
GOOGLE_SHEET_GID=0
```

Prefer Option A for a course project: it needs no Cloud project and the URL is opaque (still treat it as sensitive — anyone with the URL can read the responses).

## Security rules (non-negotiable)

- Never place `APPS_SCRIPT_URL`, `GOOGLE_API_KEY` or `ADMIN_TOKEN` in frontend code, query strings shown to users, screenshots, or logs. They live only in the server environment (`.env` locally, host secrets in deployment).
- The frontend never talks to Google directly; only the Express server does.
- Admin endpoints require the `Authorization: Bearer <ADMIN_TOKEN>` header (timing-safe comparison). The Admin page keeps the token in memory only — never in `localStorage`.
- Set `DEMO_MODE=never` in production so demo fallbacks can never mask a broken live connection.
- The public API serves aggregates only. Free-text suggestions are excluded from all public endpoints.

## Verification checklist (run before claiming the integration works)

1. `npm run dev` with the env above.
2. Open `http://localhost:3001/api/health` — expect `ok: true`, `connected: true`, a non-zero `rowCount`, and `lastError: null`.
3. Submit one test response through the live form, wait for `CACHE_TTL_SECONDS`, then re-check `/api/health` — `rowCount` should increase (or force it: `POST /api/admin/refresh` with the bearer token).
4. Open the dashboard — the source badge must show the real source name and **must not** say "demo" or "synthetic".
5. If any step fails, fix it; if it cannot be fixed yet, the dashboard must keep showing the empty/unconfigured state. Never label demo data as live.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| HTTP 401/403 from upstream | Apps Script deployed without "Anyone" access, or sheet/API key not public. |
| HTTP 400 from Sheets API | Wrong sheet name in the URL range, or API not enabled. |
| `no rows` | Form has no responses yet, or wrong tab name (`SHEET_NAME`). |
| CORS failure in the browser | You called Google from the frontend — move the fetch to the server (already the default). |
| Stale numbers | Cache TTL; use admin refresh or wait it out. |

## This deployment � current status

| Asset | Value |
|---|---|
| Responder form (public, set as `SURVEY_URL`) | `https://docs.google.com/forms/d/e/1FAIpQLSdFyISogxtArX9oaHMIF03mPneXghtCVjg7-obfVS7nUsiXfg/viewform` |
| Response spreadsheet | `1XbjuLmRScPb-GgTAw8W_7cBOBR9CWvugSgk0SppVmDY` |
| Spreadsheet access | **Private** � unauthenticated CSV export returns HTTP 401 |
| Current `DATA_SOURCE` | `none` (API reports `sourceConfigured: false`; demo only via explicit `?demo=1`) |

**To go live:** in the response spreadsheet run *Extensions ? Apps Script*, paste the Option A
script above, deploy as *Web app (Execute as: Me, Who has access: Anyone)*, then set:

```bash
DATA_SOURCE=appsscript
APPS_SCRIPT_URL=https://script.google.com/macros/s/<DEPLOYMENT_ID>/exec
```

Restart the API (`npm run dev`) and confirm `GET /api/health` returns `connected: true` with a
growing `rowCount`; the dashboard source badge must switch to the live source with **no**
"demo"/"synthetic" label. Do **not** publish or share the spreadsheet link itself � only the
Apps Script web-app URL (read-only JSON) belongs in the environment.
