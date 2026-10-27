import { readFile } from 'node:fs/promises'
import type { RawRow } from '../src/lib/normalize'
import type { Env } from './config'

export type SourceKind = 'appsscript' | 'sheets' | 'local' | 'none'

export interface FetchOutcome {
  rows: RawRow[]
  fetchedAt: string
}

export class SourceError extends Error {
  readonly hint: string
  constructor(message: string, hint: string) {
    super(message)
    this.name = 'SourceError'
    this.hint = hint
  }
}

export interface DataSourceState {
  kind: SourceKind
  configured: boolean
  connected: boolean
  lastAttempt: string | null
  lastSuccess: string | null
  lastError: string | null
  rowCount: number | null
}

function stripTrailingSlash(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url
}

async function fetchJsonRows(url: string, timeoutMs: number): Promise<RawRow[]> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) {
      throw new SourceError(
        `Upstream returned HTTP ${res.status}`,
        res.status === 401 || res.status === 403
          ? 'Check that the Google Apps Script deployment is set to “Anyone” access, or that the sheet is published for “anyone with the link”.'
          : 'Check the configured URL/ID and try again.',
      )
    }
    const data: unknown = await res.json()
    const rows = coerceRows(data)
    if (rows.length === 0) {
      throw new SourceError(
        'Upstream returned no rows',
        'Confirm the linked Google Form has responses, or that the sheet range is correct.',
      )
    }
    return rows
  } catch (err) {
    if (err instanceof SourceError) throw err
    if (err instanceof Error && err.name === 'AbortError') {
      throw new SourceError('Upstream request timed out', 'Retry later or increase the timeout.')
    }
    throw new SourceError(
      `Could not reach upstream source: ${err instanceof Error ? err.message : String(err)}`,
      'Check network connectivity and the configured URL.',
    )
  } finally {
    clearTimeout(timer)
  }
}

export function coerceRows(data: unknown): RawRow[] {
  if (Array.isArray(data)) {
    if (data.length === 0) return []
    if (data.every((d) => d !== null && typeof d === 'object' && !Array.isArray(d))) {
      return data as RawRow[]
    }
    if (Array.isArray(data[0])) {
      const [header, ...body] = data as string[][]
      return body.map((r) => {
        const row: RawRow = {}
        header.forEach((h, i) => {
          row[h] = r[i] ?? ''
        })
        return row
      })
    }
  }
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>
    if (Array.isArray(obj.rows)) return coerceRows(obj.rows)
    if (Array.isArray(obj.data)) return coerceRows(obj.data)
    if (Array.isArray(obj.values)) {
      const values = obj.values as string[][]
      if (values.length === 0) return []
      const [header, ...body] = values
      return body.map((r) => {
        const row: RawRow = {}
        header.forEach((h, i) => {
          row[h] = r[i] ?? ''
        })
        return row
      })
    }
  }
  throw new SourceError(
    'Upstream payload was not a recognisable row array',
    'The endpoint must return a JSON array of objects (or {rows|data|values}).',
  )
}

export function parseCsv(text: string): RawRow[] {
  const rows: string[][] = []
  let field = ''
  let row: string[] = []
  let inQuotes = false
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i += 1
        } else inQuotes = false
      } else field += c
    } else if (c === '"') {
      inQuotes = true
    } else if (c === ',') {
      row.push(field)
      field = ''
    } else if (c === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else if (c !== '\r') {
      field += c
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  const nonEmpty = rows.filter((r) => r.some((c) => c.trim() !== ''))
  if (nonEmpty.length <= 1) return []
  const header = nonEmpty[0].map((h) => h.trim())
  return nonEmpty.slice(1).map((r) => {
    const obj: RawRow = {}
    header.forEach((h, i) => {
      obj[h] = r[i] ?? ''
    })
    return obj
  })
}

export class SurveyDataSource {
  private readonly env: Env
  private readonly ttlMs: number
  private cache: { rows: RawRow[]; fetchedAt: number } | null = null
  private inflight: Promise<FetchOutcome> | null = null
  readonly state: DataSourceState

  constructor(env: Env) {
    this.env = env
    this.ttlMs = env.CACHE_TTL_SECONDS * 1000
    this.state = {
      kind: env.DATA_SOURCE,
      configured: env.DATA_SOURCE !== 'none' && this.isConfigured(),
      connected: false,
      lastAttempt: null,
      lastSuccess: null,
      lastError: null,
      rowCount: null,
    }
  }

  private isConfigured(): boolean {
    switch (this.env.DATA_SOURCE) {
      case 'appsscript':
        return Boolean(this.env.APPS_SCRIPT_URL)
      case 'sheets':
        return Boolean(this.env.GOOGLE_SHEETS_ID && this.env.GOOGLE_API_KEY)
      case 'local':
        return Boolean(this.env.LOCAL_DATA_FILE)
      case 'none':
        return false
    }
  }

  async getRows(options: { force?: boolean } = {}): Promise<FetchOutcome> {
    if (!options.force && this.cache && Date.now() - this.cache.fetchedAt < this.ttlMs) {
      return { rows: this.cache.rows, fetchedAt: new Date(this.cache.fetchedAt).toISOString() }
    }
    if (this.inflight) return this.inflight

    this.inflight = this.fetchFresh()
      .then((outcome) => {
        this.cache = { rows: outcome.rows, fetchedAt: Date.parse(outcome.fetchedAt) }
        return outcome
      })
      .finally(() => {
        this.inflight = null
      })
    return this.inflight
  }

  invalidate(): void {
    this.cache = null
  }

  cacheAgeSeconds(): number | null {
    if (!this.cache) return null
    return Math.round((Date.now() - this.cache.fetchedAt) / 1000)
  }

  private async fetchFresh(): Promise<FetchOutcome> {
    const fetchedAt = new Date().toISOString()
    this.state.lastAttempt = fetchedAt
    try {
      const rows = await this.loadRows()
      this.state.connected = true
      this.state.lastSuccess = fetchedAt
      this.state.lastError = null
      this.state.rowCount = rows.length
      return { rows, fetchedAt }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      const hint = err instanceof SourceError ? err.hint : undefined
      this.state.connected = false
      this.state.lastError = hint ? `${message} — ${hint}` : message
      this.state.rowCount = null
      throw err
    }
  }

  private async loadRows(): Promise<RawRow[]> {
    switch (this.env.DATA_SOURCE) {
      case 'appsscript': {
        const base = stripTrailingSlash(this.env.APPS_SCRIPT_URL!)
        return fetchJsonRows(`${base}?action=getData`, 15000)
      }
      case 'sheets': {
        const id = this.env.GOOGLE_SHEETS_ID!
        const key = this.env.GOOGLE_API_KEY!
        const gid = this.env.GOOGLE_SHEET_GID
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(id)}/values/Sheet1?key=${encodeURIComponent(key)}`
        try {
          const rows = await fetchJsonRows(url, 15000)
          return rows
        } catch (err) {
          if (err instanceof SourceError && err.message.includes('HTTP 400')) {
            const alt = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(id)}/values/A:Z?includeGridData=false&majorDimension=ROWS&key=${encodeURIComponent(key)}&gid=${encodeURIComponent(gid)}`
            const controller = new AbortController()
            const timer = setTimeout(() => controller.abort(), 15000)
            try {
              const res = await fetch(alt, { signal: controller.signal })
              if (!res.ok) throw err
              const data: unknown = await res.json()
              return coerceRows(data)
            } finally {
              clearTimeout(timer)
            }
          }
          throw err
        }
      }
      case 'local': {
        const path = this.env.LOCAL_DATA_FILE!
        let content: string
        try {
          content = await readFile(path, 'utf8')
        } catch {
          throw new SourceError(
            `Local data file not found: ${path}`,
            'Set LOCAL_DATA_FILE to an existing CSV exported from the response sheet, or copy data/sample-responses.csv.',
          )
        }
        const trimmed = content.trim()
        if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
          try {
            return coerceRows(JSON.parse(trimmed))
          } catch {
            throw new SourceError('Local JSON file could not be parsed', 'Validate the file contents.')
          }
        }
        const rows = parseCsv(content)
        if (rows.length === 0) {
          throw new SourceError('Local CSV contained no data rows', 'Add response rows below the header line.')
        }
        return rows
      }
      case 'none':
        throw new SourceError(
          'No data source configured',
          'Set DATA_SOURCE (appsscript | sheets | local) and the matching environment variables.',
        )
    }
  }
}
