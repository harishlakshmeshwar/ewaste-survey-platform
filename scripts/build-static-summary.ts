import { mkdirSync, writeFileSync } from 'node:fs'
import { buildDemoSummary } from '../src/lib/analysis'

const summary = buildDemoSummary({})
summary.meta.source = 'static snapshot (synthetic demo data) — generated at build time for static hosting'
mkdirSync('public/data', { recursive: true })
writeFileSync('public/data/summary.json', JSON.stringify(summary), 'utf8')
console.log(
  `snapshot written: ${summary.meta.validResponses} valid responses, ${summary.kpis.length} KPIs, ${summary.findings.length} findings`,
)
