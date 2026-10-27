import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from '../server/app'
import { makeRow } from './fixtures'

function rowsFile(count: number, overrides: Partial<Record<string, string>> = {}): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'ewaste-test-'))
  const rows: Record<string, string>[] = Array.from({ length: count }, (_, i) => ({
    ...makeRow(overrides),
    Timestamp: `2026-10-0${(i % 9) + 1} 10:00:00`,
  }))
  const file = path.join(dir, 'responses.csv')
  const headers = Object.keys(rows[0])
  const csv = [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(',')),
  ].join('\n')
  writeFileSync(file, csv, 'utf8')
  return file
}

function appWithLocalSource(count: number, overrides: Partial<Record<string, string>> = {}, extra: Record<string, string> = {}) {
  return createApp({
    envSource: {
      NODE_ENV: 'test',
      DATA_SOURCE: 'local',
      LOCAL_DATA_FILE: rowsFile(count, overrides),
      ADMIN_TOKEN: 'test-admin-token-123',
      ...extra,
    },
  })
}

describe('GET /api/config', () => {
  it('returns only non-sensitive public configuration', async () => {
    const { app } = createApp({
      envSource: { NODE_ENV: 'test', DATA_SOURCE: 'none' },
    })
    const res = await request(app).get('/api/config')
    expect(res.status).toBe(200)
    expect(res.body.projectTitle).toContain('E-Waste')
    expect(res.body.dataSourceKind).toBe('none')
    // Never leak secrets
    const flat = JSON.stringify(res.body)
    expect(flat).not.toMatch(/ADMIN_TOKEN|API_KEY|token/i)
  })

  it('exposes survey URL when configured', async () => {
    const { app } = createApp({
      envSource: {
        NODE_ENV: 'test',
        DATA_SOURCE: 'none',
        SURVEY_URL: 'https://forms.example.com/abc',
      },
    })
    const res = await request(app).get('/api/config')
    expect(res.body.surveyUrl).toBe('https://forms.example.com/abc')
  })
})

describe('GET /api/health', () => {
  it('reports unconfigured source without crashing', async () => {
    const { app } = createApp({ envSource: { NODE_ENV: 'test', DATA_SOURCE: 'none' } })
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body.sourceKind).toBe('none')
    expect(res.body.connected).toBe(false)
  })

  it('reports configured local source after a fetch', async () => {
    const { app } = appWithLocalSource(3)
    await request(app).get('/api/summary')
    const res = await request(app).get('/api/health')
    expect(res.body.sourceConfigured).toBe(true)
    expect(res.body.connected).toBe(true)
    expect(res.body.rowCount).toBe(3)
    expect(res.body.lastSuccess).not.toBeNull()
  })
})

describe('GET /api/summary', () => {
  it('returns aggregates and never individual responses', async () => {
    const { app } = appWithLocalSource(8)
    const res = await request(app).get('/api/summary')
    expect(res.status).toBe(200)
    expect(res.body.meta.validResponses).toBe(8)
    expect(res.body.kpis.length).toBeGreaterThan(0)
    const flat = JSON.stringify(res.body)
    // Individual-level fields must never appear
    expect(flat).not.toContain('originalAnswers')
    expect(flat).not.toContain('invalidReasons')
    expect(flat).not.toContain('row-1')
    expect(flat).not.toMatch(/"answers"/)
    // Free text suggestions must not be exposed
    expect(flat).not.toContain('Add bins in every block')
  })

  it('computes distributions server-side with denominators', async () => {
    const { app } = appWithLocalSource(5)
    const res = await request(app).get('/api/summary')
    expect(res.body.respondentCategory.validN).toBe(5)
    expect(res.body.distributions.q3.validN).toBe(5)
    expect(res.body.departments.validN).toBe(5)
  })

  it('supports category and department filters', async () => {
    const { app } = createApp({
      envSource: {
        NODE_ENV: 'test',
        DATA_SOURCE: 'local',
        LOCAL_DATA_FILE: rowsFile(6, { 'Respondent Category': 'Student', 'Department or School': 'CSE' }),
      },
    })
    const res = await request(app).get('/api/summary?category=student&department=cse')
    expect(res.body.meta.validResponses).toBe(6)
    expect(res.body.meta.filters).toEqual({ category: 'student', department: 'cse', since: null })
  })

  it('rejects unknown category values', async () => {
    const { app } = appWithLocalSource(6)
    const res = await request(app).get('/api/summary?category=robot')
    expect(res.status).toBe(400)
    expect(res.body.error).toContain('robot')
  })

  it('rejects malformed since dates', async () => {
    const { app } = appWithLocalSource(6)
    const res = await request(app).get('/api/summary?since=yesterday')
    expect(res.status).toBe(400)
  })

  it('suppresses small filtered groups', async () => {
    const { app } = appWithLocalSource(3, { 'Department or School': 'MBA' })
    const res = await request(app).get('/api/summary?department=mba')
    expect(res.status).toBe(200)
    expect(res.body.meta.suppressed).toBe(true)
    expect(res.body.kpis).toEqual([])
    expect(res.body.meta.suppressionReason).toContain('privacy')
  })

  it('returns an empty summary when no source is configured (never fabricated data)', async () => {
    const { app } = createApp({ envSource: { NODE_ENV: 'test', DATA_SOURCE: 'none' } })
    const res = await request(app).get('/api/summary')
    expect(res.status).toBe(200)
    expect(res.body.meta.validResponses).toBe(0)
    expect(res.body.meta.isDemo).toBe(false)
    expect(res.body.kpis).toEqual([])
    expect(res.body.findings).toEqual([])
  })

  it('serves clearly-labelled demo data only when explicitly requested (DEMO_MODE=auto)', async () => {
    const { app } = createApp({
      envSource: { NODE_ENV: 'test', DATA_SOURCE: 'none', DEMO_MODE: 'auto' },
    })
    const plain = await request(app).get('/api/summary')
    expect(plain.body.meta.isDemo).toBe(false)

    const demo = await request(app).get('/api/summary?demo=1')
    expect(demo.body.meta.isDemo).toBe(true)
    expect(demo.body.meta.source).toMatch(/NOT real/)
    expect(demo.body.meta.validResponses).toBeGreaterThan(0)
  })

  it('never serves demo data when DEMO_MODE=never', async () => {
    const { app } = createApp({
      envSource: { NODE_ENV: 'test', DATA_SOURCE: 'none', DEMO_MODE: 'never' },
    })
    const res = await request(app).get('/api/summary?demo=1')
    expect(res.body.meta.isDemo).toBe(false)
    expect(res.body.meta.validResponses).toBe(0)
  })

  it('reports a clear error for a missing local file instead of fake data', async () => {
    const { app } = createApp({
      envSource: {
        NODE_ENV: 'test',
        DATA_SOURCE: 'local',
        LOCAL_DATA_FILE: path.join(tmpdir(), 'definitely-missing-file.csv'),
      },
    })
    const res = await request(app).get('/api/summary')
    expect(res.status).toBe(503)
    expect(res.body.error).toBeTruthy()
    expect(res.body.hint).toBeTruthy()
    expect(res.body.meta).toBeUndefined()
  })
})

describe('admin endpoints', () => {
  it('rejects requests without a token', async () => {
    const { app } = appWithLocalSource(3)
    const res = await request(app).post('/api/admin/refresh')
    expect(res.status).toBe(401)
    expect(res.body.error).toContain('token')
  })

  it('rejects requests with a wrong token', async () => {
    const { app } = appWithLocalSource(3)
    const res = await request(app)
      .post('/api/admin/refresh')
      .set('Authorization', 'Bearer wrong-token-value')
    expect(res.status).toBe(401)
  })

  it('accepts the correct bearer token and forces a refresh', async () => {
    const { app } = appWithLocalSource(4)
    const res = await request(app)
      .post('/api/admin/refresh')
      .set('Authorization', 'Bearer test-admin-token-123')
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.rowCount).toBe(4)
  })

  it('disables admin endpoints when ADMIN_TOKEN is not configured', async () => {
    const { app } = createApp({
      envSource: { NODE_ENV: 'test', DATA_SOURCE: 'none' },
    })
    const res = await request(app).post('/api/admin/refresh')
    expect(res.status).toBe(503)
  })

  it('serves diagnostics only to authorised maintainers', async () => {
    const { app } = appWithLocalSource(3)
    const denied = await request(app).get('/api/admin/diagnostics')
    expect(denied.status).toBe(401)
    const ok = await request(app)
      .get('/api/admin/diagnostics')
      .set('Authorization', 'Bearer test-admin-token-123')
    expect(ok.status).toBe(200)
    expect(ok.body.config.dataSource).toBe('local')
    // API key value must be masked, never returned in full
    expect(JSON.stringify(ok.body)).not.toContain('test-admin-token-123')
  })

  it('does not reveal env issues publicly', async () => {
    // Without ADMIN_TOKEN the endpoint is disabled entirely (503)
    const unconfigured = createApp({
      envSource: { NODE_ENV: 'test', DATA_SOURCE: 'appsscript' }, // missing APPS_SCRIPT_URL → warning
    })
    const pub = await request(unconfigured.app).get('/api/env-issues')
    expect(pub.status).toBe(503)
    expect(pub.body.issues).toBeUndefined()

    // With a token configured, unauthenticated callers are still rejected
    const configured = createApp({
      envSource: {
        NODE_ENV: 'test',
        DATA_SOURCE: 'appsscript',
        ADMIN_TOKEN: 'test-admin-token-123',
      },
    })
    const denied = await request(configured.app).get('/api/env-issues')
    expect(denied.status).toBe(401)
    const authed = await request(configured.app)
      .get('/api/env-issues')
      .set('Authorization', 'Bearer test-admin-token-123')
    expect(authed.status).toBe(200)
    expect(authed.body.warnings.some((w: string) => w.includes('APPS_SCRIPT_URL'))).toBe(true)
  })
})

describe('environment validation', () => {
  it('returns structured issues for invalid environment', async () => {
    const { app, issues } = createApp({
      envSource: { NODE_ENV: 'test', DATA_SOURCE: 'local', CACHE_TTL_SECONDS: 'not-a-number' },
    })
    expect(issues.length).toBeGreaterThan(0)
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(503)
    expect(res.body.ok).toBe(false)
  })

  it('flags configured appsscript source without URL', () => {
    const { warnings } = createApp({
      envSource: { NODE_ENV: 'test', DATA_SOURCE: 'appsscript' },
    })
    expect(warnings.some((w) => w.includes('APPS_SCRIPT_URL'))).toBe(true)
  })
})

describe('Google integration error handling', () => {
  it('handles an unreachable Apps Script URL with a actionable hint', async () => {
    const { app } = createApp({
      envSource: {
        NODE_ENV: 'test',
        DATA_SOURCE: 'appsscript',
        APPS_SCRIPT_URL: 'http://127.0.0.1:1/does-not-exist', // guaranteed connection failure
        DEMO_MODE: 'never',
      },
    })
    const res = await request(app).get('/api/summary')
    expect(res.status).toBe(503)
    expect(res.body.error).toBeTruthy()
    expect(res.body.hint).toBeTruthy()

    const health = await request(app).get('/api/health')
    expect(health.body.connected).toBe(false)
    expect(health.body.lastError).toBeTruthy()
  })
})
