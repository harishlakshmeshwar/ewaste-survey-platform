import { timingSafeEqual } from 'node:crypto'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import cors from 'cors'
import express, { type NextFunction, type Request, type Response } from 'express'
import { buildDemoSummary, buildSummary } from '../src/lib/analysis'
import type { PublicConfig, Summary, SummaryQuery } from '../src/lib/types'
import { validateEnv, type EnvIssue } from './config'
import { SourceError, SurveyDataSource } from './sources'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = path.resolve(__dirname, '..')

export interface AppDeps {
  envSource?: NodeJS.ProcessEnv
}

export interface CreatedApp {
  app: express.Express
  dataSource: SurveyDataSource | null
  issues: EnvIssue[]
  warnings: string[]
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

function isDemoAllowed(demoMode: 'auto' | 'always' | 'never', query: Request['query']): boolean {
  if (demoMode === 'never') return false
  if (demoMode === 'always') return true
  return query.demo === '1' || query.demo === 'true'
}

export function createApp(deps: AppDeps = {}): CreatedApp {
  const validation = validateEnv(deps.envSource ?? process.env)
  const { env, issues, warnings, sourceConfigured } = validation

  if (!env) {
    const app = express()
    app.use(express.json({ limit: '1mb' }))
    app.use(cors())
    app.get('/api/env-issues', (_req, res) => {
      res.status(500).json({ issues })
    })
    app.get('/api/health', (_req, res) => {
      res.status(503).json({
        ok: false,
        sourceKind: 'unknown',
        sourceConfigured: false,
        connected: false,
        lastAttempt: null,
        lastSuccess: null,
        lastError: 'Environment variables are invalid — see /api/env-issues.',
        rowCount: null,
        cacheAgeSeconds: null,
      })
    })
    return { app, dataSource: null, issues, warnings }
  }

  const dataSource = env.DATA_SOURCE === 'none' ? null : new SurveyDataSource(env)
  const adminToken = env.ADMIN_TOKEN

  const app = express()
  app.disable('x-powered-by')
  app.use(express.json({ limit: '1mb' }))
  if (env.NODE_ENV === 'development') app.use(cors())

  const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
    if (!adminToken) {
      res.status(503).json({
        error: 'Admin access is not configured.',
        hint: 'Set ADMIN_TOKEN (at least 8 characters) in the server environment, then send it as the Authorization: Bearer <token> header.',
      })
      return
    }
    const header = req.header('authorization') ?? ''
    const provided = header.startsWith('Bearer ') ? header.slice(7) : (req.query.token as string | undefined) ?? ''
    if (!provided || !safeEqual(provided, adminToken)) {
      res.status(401).json({ error: 'Invalid or missing admin token.' })
      return
    }
    next()
  }

  const publicConfig: PublicConfig = {
    surveyUrl: env.SURVEY_URL || null,
    surveyEmbedUrl: env.SURVEY_EMBED_URL || null,
    dataSourceKind: env.DATA_SOURCE,
    dataSourceConfigured: sourceConfigured,
    projectTitle: 'Student and Staff Awareness, Practices and Attitudes towards E-Waste Disposal: A MSRIT Campus Survey',
  }

  app.get('/api/config', (_req, res) => {
    res.json(publicConfig)
  })

  app.get('/api/env-issues', requireAdmin, (_req, res) => {
    res.json({ issues, warnings })
  })

  app.get('/api/health', (_req, res) => {
    if (!dataSource) {
      res.json({
        ok: env.DATA_SOURCE === 'none',
        sourceKind: 'none',
        sourceConfigured: false,
        connected: false,
        lastAttempt: null,
        lastSuccess: null,
        lastError:
          env.DATA_SOURCE === 'none'
            ? 'No data source configured. Set DATA_SOURCE and matching credentials.'
            : null,
        rowCount: null,
        cacheAgeSeconds: null,
      })
      return
    }
    const s = dataSource.state
    res.json({
      ok: s.connected || (!s.connected && s.lastError === null),
      sourceKind: s.kind,
      sourceConfigured: s.configured,
      connected: s.connected,
      lastAttempt: s.lastAttempt,
      lastSuccess: s.lastSuccess,
      lastError: s.lastError,
      rowCount: s.rowCount,
      cacheAgeSeconds: dataSource.cacheAgeSeconds(),
    })
  })

  app.get('/api/summary', async (req, res, next) => {
    try {
      const categoryRaw = (req.query.category as string | undefined)?.trim()
      const department = (req.query.department as string | undefined)?.trim() || null
      const since = (req.query.since as string | undefined)?.trim() || null
      const validCategories = ['student', 'teaching_staff', 'non_teaching_staff'] as const
      const category =
        categoryRaw && (validCategories as readonly string[]).includes(categoryRaw)
          ? (categoryRaw as SummaryQuery['category'])
          : categoryRaw
            ? null
            : null
      if (categoryRaw && !category) {
        res.status(400).json({ error: `Unknown category "${categoryRaw}".` })
        return
      }
      if (since && Number.isNaN(Date.parse(since))) {
        res.status(400).json({ error: 'Invalid "since" date.' })
        return
      }

      const query: SummaryQuery = { category, department, since }

      if (!dataSource) {
        if (isDemoAllowed(env.DEMO_MODE, req.query)) {
          const summary = buildDemoSummary(query)
          res.json(summary)
          return
        }
        res.status(200).json(emptySummary('No data source configured.'))
        return
      }

      if (!dataSource.state.configured) {
        res.status(200).json(emptySummary(dataSource.state.lastError ?? 'Data source is not configured.'))
        return
      }

      try {
        const { rows, fetchedAt } = await dataSource.getRows({ force: req.query.refresh === '1' })
        const summary = buildSummary(rows, query, {
          generatedAt: new Date().toISOString(),
          source: describeSource(env.DATA_SOURCE),
          sourceConfigured: true,
          lastRefresh: fetchedAt,
          hasTimestamps: rows.some((r) => Object.keys(r).some((k) => /timestamp|submit/i.test(k))),
          isDemo: false,
          datasetDate: deriveDatasetDate(rows),
        })
        res.json(summary)
      } catch (err) {
        const message = err instanceof SourceError ? err.message : 'Failed to read survey responses.'
        const hint = err instanceof SourceError ? err.hint : undefined
        if (isDemoAllowed(env.DEMO_MODE, req.query)) {
          const summary = buildDemoSummary(query)
          res.json(summary)
          return
        }
        res.status(503).json({
          error: message,
          hint: hint ?? null,
          detail: err instanceof SourceError && env.NODE_ENV === 'development' ? undefined : undefined,
        })
      }
    } catch (err) {
      next(err)
    }
  })

  app.post('/api/admin/refresh', requireAdmin, async (_req, res, next) => {
    try {
      if (!dataSource) {
        res.status(400).json({ error: 'No data source configured.' })
        return
      }
      dataSource.invalidate()
      const { rows, fetchedAt } = await dataSource.getRows({ force: true })
      res.json({ ok: true, rowCount: rows.length, fetchedAt })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      res.status(502).json({ ok: false, error: message })
      next(err)
    }
  })

  app.get('/api/admin/diagnostics', requireAdmin, (_req, res) => {
    res.json({
      envIssues: issues,
      warnings,
      source: dataSource
        ? {
            ...dataSource.state,
            cacheAgeSeconds: dataSource.cacheAgeSeconds(),
            cacheTtlSeconds: env.CACHE_TTL_SECONDS,
          }
        : null,
      config: {
        nodeEnv: env.NODE_ENV,
        dataSource: env.DATA_SOURCE,
        demoMode: env.DEMO_MODE,
        surveyUrlConfigured: Boolean(env.SURVEY_URL),
        adminTokenConfigured: Boolean(adminToken),
        sheetsIdSet: Boolean(env.GOOGLE_SHEETS_ID),
        apiKeySet: Boolean(env.GOOGLE_API_KEY),
        apiKeyLast4: env.GOOGLE_API_KEY ? `…${env.GOOGLE_API_KEY.slice(-4)}` : null,
      },
      publicConfig,
    })
  })

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const message = err instanceof Error ? err.message : 'Internal server error'
    // Never leak stack traces or environment values to clients.
    res.status(500).json({
      error: env.NODE_ENV === 'production' ? 'Internal server error' : message,
    })
  })

  const distDir = path.join(PROJECT_ROOT, 'dist')
  if (existsSync(distDir)) {
    app.use(express.static(distDir))
    app.get(/^(?!\/api\/).*/, (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'))
    })
  }

  return { app, dataSource, issues, warnings }
}

function describeSource(kind: 'appsscript' | 'sheets' | 'local' | 'none'): string {
  switch (kind) {
    case 'appsscript':
      return 'Google Apps Script web app → linked response sheet'
    case 'sheets':
      return 'Google Sheets API (published sheet)'
    case 'local':
      return 'Local CSV/JSON export'
    case 'none':
      return 'No source configured'
  }
}

function deriveDatasetDate(rows: { [k: string]: string }[]): string | null {
  const stampKey = rows.length > 0 ? Object.keys(rows[0]).find((k) => /timestamp|submit/i.test(k)) : undefined
  if (!stampKey) return null
  let latest: number | null = null
  for (const row of rows) {
    const t = Date.parse(row[stampKey] ?? '')
    if (!Number.isNaN(t) && (latest === null || t > latest)) latest = t
  }
  return latest === null ? null : new Date(latest).toISOString()
}

function emptySummary(reason: string): Summary {
  return {
    meta: {
      generatedAt: new Date().toISOString(),
      source: reason,
      sourceConfigured: false,
      lastRefresh: null,
      totalRows: 0,
      validResponses: 0,
      invalidResponses: 0,
      hasTimestamps: false,
      filters: { category: null, department: null, since: null },
      isDemo: false,
      suppressed: false,
      suppressionReason: null,
      datasetDate: null,
      datasetVersion: 'v0 · no dataset loaded',
    },
    kpis: [],
    respondentCategory: {
      questionId: 'q1',
      label: 'Respondent category',
      type: 'single',
      buckets: [],
      validN: 0,
      missingN: 0,
      unexpectedN: 0,
    },
    departments: {
      questionId: 'q2',
      label: 'Department or school',
      type: 'single',
      buckets: [],
      validN: 0,
      missingN: 0,
      unexpectedN: 0,
    },
    distributions: {} as Summary['distributions'],
    awarenessScore: {
      min: 0,
      max: 100,
      mean: null,
      distribution: [],
      validN: 0,
      missingN: 0,
      ruleDescription: '',
      scoreByCategory: [],
    },
    comparisons: [],
    findings: [],
  }
}
