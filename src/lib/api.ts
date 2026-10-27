import type { PublicConfig, Summary, SummaryQuery } from './types'

const API_BASE = ''

export class ApiError extends Error {
  readonly status: number
  readonly hint: string | null
  constructor(message: string, status: number, hint: string | null = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.hint = hint
  }
}

function buildQuery(query: SummaryQuery & { demo?: boolean; refresh?: boolean }): string {
  const params = new URLSearchParams()
  if (query.category) params.set('category', query.category)
  if (query.department) params.set('department', query.department)
  if (query.since) params.set('since', query.since)
  if (query.demo) params.set('demo', '1')
  if (query.refresh) params.set('refresh', '1')
  const s = params.toString()
  return s ? `?${s}` : ''
}

export async function fetchSummary(query: SummaryQuery & { demo?: boolean; refresh?: boolean }): Promise<Summary> {
  const res = await fetch(`${API_BASE}/api/summary${buildQuery(query)}`, {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) {
    let message = `Request failed (${res.status})`
    let hint: string | null = null
    try {
      const body = (await res.json()) as { error?: string; hint?: string | null }
      if (body.error) message = body.error
      if (body.hint) hint = body.hint
    } catch {
      /* keep default message */
    }
    throw new ApiError(message, res.status, hint)
  }
  return (await res.json()) as Summary
}

export async function fetchConfig(): Promise<PublicConfig> {
  const res = await fetch(`${API_BASE}/api/config`)
  if (!res.ok) throw new ApiError('Configuration unavailable', res.status)
  return (await res.json()) as PublicConfig
}

export interface HealthPayload {
  ok: boolean
  sourceKind: string
  sourceConfigured: boolean
  connected: boolean
  lastAttempt: string | null
  lastSuccess: string | null
  lastError: string | null
  rowCount: number | null
  cacheAgeSeconds: number | null
}

export async function fetchHealth(): Promise<HealthPayload> {
  const res = await fetch(`${API_BASE}/api/health`)
  if (!res.ok) throw new ApiError('Health endpoint unavailable', res.status)
  return (await res.json()) as HealthPayload
}

export async function adminRefresh(token: string): Promise<{ ok: boolean; rowCount: number; fetchedAt: string }> {
  const res = await fetch(`${API_BASE}/api/admin/refresh`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
  const body = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; rowCount?: number; fetchedAt?: string }
  if (!res.ok) throw new ApiError(body.error ?? 'Refresh failed', res.status)
  return { ok: true, rowCount: body.rowCount ?? 0, fetchedAt: body.fetchedAt ?? '' }
}

export async function adminDiagnostics(token: string): Promise<unknown> {
  const res = await fetch(`${API_BASE}/api/admin/diagnostics`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError((body as { error?: string }).error ?? 'Diagnostics failed', res.status)
  return body
}
