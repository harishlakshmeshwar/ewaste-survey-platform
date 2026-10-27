import { describe, expect, it } from 'vitest'
import { buildDemoSummary, buildSummary } from '../src/lib/analysis'
import { summaryToCsv, timestampSlug } from '../src/lib/exportCsv'
import { buildSummaryPdf, buildManuscriptDoc } from '../src/lib/exportPdf'
import { coerceRows, parseCsv } from '../server/sources'
import type { SummaryMetaBase } from '../src/lib/types'
import { makeRows } from './fixtures'

const baseMeta: SummaryMetaBase = {
  generatedAt: '2026-10-25T00:00:00.000Z',
  source: 'test source',
  sourceConfigured: true,
  lastRefresh: '2026-10-25T00:00:00.000Z',
  hasTimestamps: true,
  isDemo: false,
  datasetDate: null,
}

function realSummary() {
  return buildSummary(
    [
      ...makeRows(8, [{ 'Respondent Category': 'Student' }]),
      ...makeRows(6, [{ 'Respondent Category': 'Teaching Staff', 'Department or School': 'ECE' }]),
    ],
    {},
    baseMeta,
  )
}

/** jsPDF v4 has no text extractor; content streams are uncompressed, so read the bytes. */
function pdfText(doc: ReturnType<typeof buildSummaryPdf>): string {
  return Buffer.from(doc.output('arraybuffer')).toString('latin1')
}

describe('summaryToCsv', () => {
  const csv = summaryToCsv(realSummary())

  it('includes metadata, provenance, and denominator notes', () => {
    expect(csv).toContain('Section,Metric,Group,Count,Valid N,Percent,Notes')
    expect(csv).toContain('Valid responses')
    expect(csv).toContain('test source')
    expect(csv).toContain('Dataset version')
    expect(csv).toContain('Percentages use the valid-response denominator')
  })

  it('emits one row per bucket with counts and percentages', () => {
    const lines = csv.split('\n')
    expect(lines.some((l) => l.includes('Student') && l.includes('8'))).toBe(true)
    expect(lines.some((l) => l.includes('Teaching staff') && l.includes('6'))).toBe(true)
  })

  it('includes awareness score and comparisons', () => {
    expect(csv).toContain('Awareness score')
    expect(csv).toContain('Mean score')
    expect(csv).toContain('Comparison')
    expect(csv).toContain('difference')
  })

  it('labels demonstration data', () => {
    const demoCsv = summaryToCsv(buildDemoSummary({}))
    expect(demoCsv).toContain('true')
    expect(demoCsv).toContain('Is demonstration data')
  })

  it('quotes fields containing commas', () => {
    const lines = csv.split('\n').filter((l) => l.includes('"'))
    expect(lines.length).toBeGreaterThan(0)
    expect(csv).not.toMatch(/^[^",\n]*,[^",\n]*,[^",\n]*,[^",\n]*,[^",\n]*,[^",\n]*,[^"\n]*,[^"\n]*$/m)
  })

  it('handles an empty summary without throwing', () => {
    const emptyCsv = summaryToCsv(buildSummary([], {}, baseMeta))
    expect(emptyCsv).toContain('Valid responses')
    expect(emptyCsv).toContain(',0,')
  })
})

describe('timestampSlug', () => {
  it('produces a filesystem-safe filename fragment', () => {
    const slug = timestampSlug('2026-10-25T14:30:00.000Z')
    expect(slug).not.toContain(':')
    expect(slug).not.toContain('/')
    expect(slug).toMatch(/^2026-10-25/)
  })
})

describe('buildSummaryPdf', () => {
  it('generates a non-empty PDF with metadata and results', () => {
    const doc = buildSummaryPdf(realSummary())
    const output = doc.output('arraybuffer')
    expect(output.byteLength).toBeGreaterThan(1000)
    const text = pdfText(doc)
    expect(text).toContain('Aggregate Report')
    expect(text).toContain('test source')
    expect(text).toContain('Limitations')
    expect(text).toContain('Methodology')
  })

  it('marks demonstration reports clearly', () => {
    const doc = buildSummaryPdf(buildDemoSummary({}))
    const text = pdfText(doc)
    expect(text).toContain('DEMONSTRATION DATA')
    expect(text).toContain('NOT real MSRIT survey responses')
  })

  it('renders placeholder sections for empty summaries instead of fake findings', () => {
    const doc = buildSummaryPdf(buildSummary([], {}, baseMeta))
    const text = pdfText(doc)
    expect(text).toContain('0')
    expect(text).not.toContain('Measured observations')
  })

  it('produces a multi-section report with comparisons table when data exists', () => {
    const doc = buildSummaryPdf(realSummary())
    const text = pdfText(doc)
    expect(text).toContain('Student vs staff comparisons')
    expect(text).toContain('Proposed interventions')
  })
})

describe('buildManuscriptDoc', () => {
  it('creates an IEEE-style draft with placeholder markers for missing data', () => {
    const doc = buildManuscriptDoc(buildSummary([], {}, baseMeta))
    const text = pdfText(doc)
    expect(text).toContain('ABSTRACT PLACEHOLDER')
    expect(text).toContain('I. INTRODUCTION')
    expect(text).toContain('III. METHODOLOGY')
    expect(text).toContain('IV. RESULTS')
    expect(text).toContain('REFERENCES')
    expect(text).toContain('Not IEEE-approved')
  })

  it('auto-drafts results section when real data is loaded, still marked provisional', () => {
    const doc = buildManuscriptDoc(realSummary())
    const text = pdfText(doc)
    expect(text).toContain('cross-sectional campus survey')
    expect(text).toContain('Provisional draft generated')
    expect(text).not.toContain('ABSTRACT PLACEHOLDER')
  })
})

describe('parseCsv', () => {
  it('parses a standard CSV with quoted fields', () => {
    const csv = 'A,B,C\n1,"hello, world","say ""hi"""\n2,x,y\n'
    const rows = parseCsv(csv)
    expect(rows).toHaveLength(2)
    expect(rows[0].B).toBe('hello, world')
    expect(rows[0].C).toBe('say "hi"')
    expect(rows[1].A).toBe('2')
  })

  it('handles CRLF line endings', () => {
    const rows = parseCsv('X,Y\r\n1,2\r\n3,4\r\n')
    expect(rows).toHaveLength(2)
    expect(rows[1].Y).toBe('4')
  })

  it('returns no rows for header-only input', () => {
    expect(parseCsv('X,Y,Z\n')).toEqual([])
    expect(parseCsv('')).toEqual([])
  })

  it('ignores fully blank lines', () => {
    const rows = parseCsv('X,Y\n1,2\n\n\n3,4\n')
    expect(rows).toHaveLength(2)
  })
})

describe('coerceRows', () => {
  it('accepts an array of objects', () => {
    expect(coerceRows([{ a: '1' }, { a: '2' }])).toHaveLength(2)
  })

  it('accepts {rows: [...]}', () => {
    expect(coerceRows({ rows: [{ a: '1' }] })).toHaveLength(1)
  })

  it('accepts Sheets API {values: [[header],[row]]}', () => {
    const rows = coerceRows({ values: [['H1', 'H2'], ['v1', 'v2']] })
    expect(rows).toEqual([{ H1: 'v1', H2: 'v2' }])
  })

  it('accepts a raw 2D array with header row', () => {
    const rows = coerceRows([
      ['Name', 'Value'],
      ['x', '1'],
      ['y', '2'],
    ])
    expect(rows).toHaveLength(2)
    expect(rows[1].Value).toBe('2')
  })

  it('rejects unrecognisable payloads with a helpful error', () => {
    expect(() => coerceRows('nope')).toThrow(/not a recognisable/)
    expect(() => coerceRows(42)).toThrow(/not a recognisable/)
  })

  it('returns empty array for empty input array', () => {
    expect(coerceRows([])).toEqual([])
  })
})
