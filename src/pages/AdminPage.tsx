import { useState } from 'react'
import { adminDiagnostics, adminRefresh, fetchHealth, ApiError } from '../lib/api'
import { Badge, Card, Notice, PageHeader, Spinner } from '../components/ui'

interface DiagResult {
  ok: boolean
  data?: unknown
  error?: string
}

export function AdminPage() {
  const [token, setToken] = useState('')
  const [health, setHealth] = useState<Awaited<ReturnType<typeof fetchHealth>> | null>(null)
  const [diag, setDiag] = useState<DiagResult | null>(null)
  const [busy, setBusy] = useState<'health' | 'diag' | 'refresh' | null>(null)
  const [refreshMsg, setRefreshMsg] = useState<string | null>(null)

  const loadHealth = async (): Promise<void> => {
    setBusy('health')
    try {
      setHealth(await fetchHealth())
    } catch (err) {
      setHealth(null)
      setDiag({ ok: false, error: err instanceof Error ? err.message : 'Failed' })
    } finally {
      setBusy(null)
    }
  }

  const loadDiagnostics = async (): Promise<void> => {
    setBusy('diag')
    setDiag(null)
    try {
      const data = await adminDiagnostics(token)
      setDiag({ ok: true, data })
    } catch (err) {
      setDiag({ ok: false, error: err instanceof ApiError ? `${err.message} (HTTP ${err.status})` : 'Failed' })
    } finally {
      setBusy(null)
    }
  }

  const doRefresh = async (): Promise<void> => {
    setBusy('refresh')
    setRefreshMsg(null)
    try {
      const result = await adminRefresh(token)
      setRefreshMsg(`Refreshed OK — ${result.rowCount} rows at ${new Date(result.fetchedAt).toLocaleString()}`)
      await loadHealth()
    } catch (err) {
      setRefreshMsg(`Refresh failed: ${err instanceof ApiError ? `${err.message} (HTTP ${err.status})` : 'unknown error'}`)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Admin diagnostics"
        subtitle="Private maintenance view for authorised maintainers. The admin token lives only in the server environment (ADMIN_TOKEN) and is never exposed to visitors. No accounts or passwords are stored by this application."
        actions={
          <button
            type="button"
            onClick={loadHealth}
            className="rounded-lg border border-brand-300 bg-white px-4 py-2 text-sm font-medium text-brand-800 hover:bg-brand-50"
          >
            Check connection health
          </button>
        }
      />

      <Notice tone="warning" title="Token stays in this browser session">
        Enter the server's <code>ADMIN_TOKEN</code> to unlock diagnostics. It is held in component
        state only — not persisted, not logged, and not sent anywhere except this server's admin
        endpoints over the Authorization header.
      </Notice>

      <Card>
        <label className="block text-sm font-medium text-slate-700" htmlFor="admin-token">
          Admin token
        </label>
        <div className="mt-2 flex flex-wrap gap-2">
          <input
            id="admin-token"
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="ADMIN_TOKEN value"
            autoComplete="off"
            className="w-full max-w-sm rounded-lg border border-slate-200 px-3 py-2 text-sm sm:w-auto"
          />
          <button
            type="button"
            onClick={loadDiagnostics}
            disabled={!token || busy !== null}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-40"
          >
            {busy === 'diag' ? 'Loading…' : 'Run diagnostics'}
          </button>
          <button
            type="button"
            onClick={doRefresh}
            disabled={!token || busy !== null}
            className="rounded-lg border border-brand-300 px-4 py-2 text-sm font-medium text-brand-800 hover:bg-brand-50 disabled:opacity-40"
          >
            {busy === 'refresh' ? 'Refreshing…' : 'Force data refresh'}
          </button>
        </div>
        {refreshMsg ? <p className="mt-2 text-sm text-slate-600">{refreshMsg}</p> : null}
        {diag && !diag.ok ? (
          <div className="mt-3">
            <Notice tone="danger" title="Request failed">
              {diag.error}
            </Notice>
          </div>
        ) : null}
      </Card>

      {busy === 'health' ? <Spinner label="Checking health" /> : null}
      {health ? (
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-brand-900">Connection health</h2>
            <Badge tone={health.connected ? 'live' : health.sourceConfigured ? 'stale' : 'neutral'}>
              {health.connected ? 'Connected' : health.sourceConfigured ? 'Not connected' : 'Unconfigured'}
            </Badge>
          </div>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <div><dt className="text-slate-500">Source kind</dt><dd className="font-medium text-slate-800">{health.sourceKind}</dd></div>
            <div><dt className="text-slate-500">Configured</dt><dd className="font-medium text-slate-800">{health.sourceConfigured ? 'Yes' : 'No'}</dd></div>
            <div><dt className="text-slate-500">Last attempt</dt><dd className="font-medium text-slate-800">{health.lastAttempt ? new Date(health.lastAttempt).toLocaleString() : '—'}</dd></div>
            <div><dt className="text-slate-500">Last success</dt><dd className="font-medium text-slate-800">{health.lastSuccess ? new Date(health.lastSuccess).toLocaleString() : '—'}</dd></div>
            <div><dt className="text-slate-500">Row count</dt><dd className="font-medium text-slate-800">{health.rowCount ?? '—'}</dd></div>
            <div><dt className="text-slate-500">Cache age</dt><dd className="font-medium text-slate-800">{health.cacheAgeSeconds !== null ? `${health.cacheAgeSeconds}s` : '—'}</dd></div>
          </dl>
          {health.lastError ? (
            <div className="mt-3">
              <Notice tone="danger" title="Last error">
                {health.lastError}
              </Notice>
            </div>
          ) : null}
        </Card>
      ) : null}

      {diag?.ok ? (
        <Card>
          <h2 className="text-base font-semibold text-brand-900">Raw diagnostics</h2>
          <pre className="mt-3 max-h-96 overflow-auto rounded-lg bg-slate-900 p-4 text-xs text-slate-100">
            {JSON.stringify(diag.data, null, 2)}
          </pre>
        </Card>
      ) : null}

      <Card>
        <h2 className="text-base font-semibold text-brand-900">Manual setup reminders</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-600">
          <li>Set <code>DATA_SOURCE</code> and its credentials in the server environment (see .env.example).</li>
          <li>Set <code>SURVEY_URL</code> (and optionally <code>SURVEY_EMBED_URL</code>) after publishing the form.</li>
          <li>Set <code>ADMIN_TOKEN</code> (8+ characters) to enable these endpoints.</li>
          <li>Deploy the Apps Script web app per docs/GOOGLE-INTEGRATION.md, or publish the sheet for the Sheets API.</li>
          <li>Verify with <code>GET /api/health</code> — only report integration as working after a successful live fetch.</li>
        </ol>
      </Card>
    </div>
  )
}
