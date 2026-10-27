import { describe, expect, it } from 'vitest'
import { buildDemoSummary, buildSummary, pct } from '../src/lib/analysis'
import type { SummaryMetaBase } from '../src/lib/types'
import { makeRow, makeRows } from './fixtures'

const baseMeta: SummaryMetaBase = {
  generatedAt: '2026-10-25T00:00:00.000Z',
  source: 'test',
  sourceConfigured: true,
  lastRefresh: '2026-10-25T00:00:00.000Z',
  hasTimestamps: true,
  isDemo: false,
  datasetDate: null,
}

function summaryFor(rows: ReturnType<typeof makeRows>, query: Parameters<typeof buildSummary>[1] = {}) {
  return buildSummary(rows, query, baseMeta)
}

describe('pct — percentage helper', () => {
  it('computes one decimal place percentages', () => {
    expect(pct(1, 3)).toBe(33.3)
    expect(pct(2, 3)).toBe(66.7)
    expect(pct(0, 10)).toBe(0)
  })

  it('returns 0 instead of dividing by zero', () => {
    expect(pct(5, 0)).toBe(0)
    expect(pct(0, 0)).toBe(0)
  })
})

describe('buildSummary — empty datasets', () => {
  it('produces an empty (not erroring) summary for zero rows', () => {
    const summary = summaryFor([])
    expect(summary.meta.validResponses).toBe(0)
    expect(summary.meta.totalRows).toBe(0)
    expect(summary.kpis).toEqual([])
    expect(summary.findings).toEqual([])
    expect(summary.respondentCategory.validN).toBe(0)
    expect(summary.awarenessScore.mean).toBeNull()
  })

  it('reports empty summary when every row is invalid', () => {
    const rows = makeRows(4, [{ 'Respondent Category': '' }])
    const summary = summaryFor(rows)
    expect(summary.meta.totalRows).toBe(4)
    expect(summary.meta.validResponses).toBe(0)
    expect(summary.meta.invalidResponses).toBe(4)
    expect(summary.kpis).toEqual([])
  })
})

describe('buildSummary — percentages and denominators', () => {
  it('uses valid responses (not total rows) as the denominator', () => {
    // 4 valid students, 1 invalid row (missing category)
    const rows = [...makeRows(4), makeRow({ 'Respondent Category': '' })]
    const summary = summaryFor(rows)
    expect(summary.meta.totalRows).toBe(5)
    expect(summary.meta.validResponses).toBe(4)
    expect(summary.meta.invalidResponses).toBe(1)

    const dist = summary.respondentCategory
    expect(dist.validN).toBe(4)
    expect(dist.missingN).toBe(0)
    const studentBucket = dist.buckets.find((b) => b.value === 'student')!
    expect(studentBucket.count).toBe(4)
    expect(studentBucket.percentage).toBe(100)
    // Percentages across buckets sum to ~100 given non-zero counts
    const sum = dist.buckets.reduce((acc, b) => acc + b.percentage, 0)
    expect(sum).toBeCloseTo(100, 0)
  })

  it('counts missing answers separately and never as a negative answer', () => {
    const rows = [
      ...makeRows(2, [{ 'Willingness to Use Campus Facility': '' }]),
      makeRow({ 'Willingness to Use Campus Facility': 'Definitely' }),
    ]
    const summary = summaryFor(rows)
    const q12 = summary.distributions.q12
    expect(q12.validN).toBe(1)
    expect(q12.missingN).toBe(2)
    const definitely = q12.buckets.find((b) => b.value === 'definitely')!
    expect(definitely.count).toBe(1)
    expect(definitely.percentage).toBe(100)
    // "probably not" stays at 0 — missing answers were not counted against it
    const probablyNot = q12.buckets.find((b) => b.value === 'probably_not')!
    expect(probablyNot.count).toBe(0)
  })

  it('reports invalid/unexpected category rows without dropping them from meta counts', () => {
    const rows = [...makeRows(3), makeRow({ 'Department or School': 'Quantum Faculty' })]
    const summary = summaryFor(rows)
    expect(summary.meta.totalRows).toBe(4)
    expect(summary.meta.validResponses).toBe(4) // q2 is optional so the odd value does not invalidate the row
    const dept = summary.departments
    expect(dept.buckets.some((b) => b.label.startsWith('Unexpected:'))).toBe(false)
  })

  it('keeps unexpected values visible in required-choice distributions', () => {
    const rows = [
      ...makeRows(3),
      makeRow({ 'Device Replacement Frequency': 'Whenever it dies' }),
    ]
    const summary = summaryFor(rows)
    // The odd value does not invalidate the row — it stays visible instead.
    expect(summary.meta.validResponses).toBe(4)
    const q7 = summary.distributions.q7
    expect(q7.unexpectedN).toBe(1)
    expect(q7.buckets.some((b) => b.label.startsWith('Unexpected:'))).toBe(true)
  })

  it('multi-select percentages are over respondents answering the item, not selections', () => {
    const rows = makeRows(4, [
      { 'Barriers to Responsible Disposal': 'Lack of awareness' },
      { 'Barriers to Responsible Disposal': 'Lack of awareness, Cost' },
      { 'Barriers to Responsible Disposal': 'Cost' },
      { 'Barriers to Responsible Disposal': 'Lack of awareness, Cost, Data privacy concern' },
    ])
    const summary = summaryFor(rows)
    const q13 = summary.distributions.q13
    expect(q13.validN).toBe(4)
    const awareness = q13.buckets.find((b) => b.value === 'lack_of_awareness')!
    expect(awareness.count).toBe(3)
    expect(awareness.percentage).toBe(75)
    // unrecognised "Data privacy concern" (mismatched label) surfaces as unexpected
    expect(q13.unexpectedN).toBe(1)
  })
})

describe('buildSummary — filtering', () => {
  const rows = [
    ...makeRows(6, [{ 'Respondent Category': 'Student' }]),
    ...makeRows(4, [{ 'Respondent Category': 'Teaching Staff', 'Department or School': 'ECE' }]),
    ...makeRows(3, [{ 'Respondent Category': 'Non-Teaching Staff', 'Department or School': 'EEE' }]),
  ]

  it('filters by category and updates all denominators consistently', () => {
    const summary = summaryFor(rows, { category: 'student' })
    expect(summary.meta.filters.category).toBe('student')
    expect(summary.meta.validResponses).toBe(6)
    expect(summary.respondentCategory.validN).toBe(6)
    expect(summary.distributions.q3.validN).toBe(6)
    expect(summary.departments.validN).toBe(6)
  })

  it('filters by department', () => {
    const bigDept = [
      ...makeRows(6, [{ 'Respondent Category': 'Student' }]),
      ...makeRows(5, [{ 'Respondent Category': 'Teaching Staff', 'Department or School': 'ECE' }]),
      ...makeRows(3, [{ 'Respondent Category': 'Non-Teaching Staff', 'Department or School': 'EEE' }]),
    ]
    const summary = summaryFor(bigDept, { department: 'ece' })
    expect(summary.meta.validResponses).toBe(5)
    expect(summary.respondentCategory.buckets.find((b) => b.value === 'teaching_staff')?.count).toBe(5)
  })

  it('suppresses small filtered groups for privacy (n < 5)', () => {
    const summary = summaryFor(rows, { department: 'eee' }) // only 3 rows
    expect(summary.meta.suppressed).toBe(true)
    expect(summary.meta.suppressionReason).toMatch(/fewer than 5/i)
    expect(summary.meta.suppressionReason).toContain('privacy')
    expect(summary.meta.validResponses).toBe(0)
    expect(summary.kpis).toEqual([])
    expect(summary.findings).toEqual([])
  })

  it('does not suppress small unfiltered groups (aggregate-level disclosure risk is acceptable)', () => {
    const small = makeRows(3)
    const summary = summaryFor(small)
    expect(summary.meta.suppressed).toBe(false)
    expect(summary.meta.validResponses).toBe(3)
  })

  it('filters by date when timestamps exist', () => {
    const rows = [
      makeRow({ Timestamp: '2026-01-01 10:00:00' }),
      makeRow({ Timestamp: '2026-10-20 10:00:00' }),
      makeRow({ Timestamp: '2026-01-02 11:00:00' }),
      makeRow({ Timestamp: '2026-10-21 11:00:00' }),
      makeRow({ Timestamp: '2026-01-03 12:00:00' }),
      makeRow({ Timestamp: '2026-10-22 12:00:00' }),
    ]
    const summary = buildSummary(rows, { since: '2026-10-01' }, baseMeta)
    expect(summary.meta.validResponses).toBe(3)
    expect(summary.meta.filters.since).toBe('2026-10-01')
  })

  it('returns an empty summary (not an error) when filters match nothing', () => {
    const summary = summaryFor(rows, { category: 'student', department: 'ece' })
    // 0 matches → no valid responses, but not "suppressed" invalid state
    expect(summary.meta.validResponses).toBe(0)
    expect(summary.kpis).toEqual([])
  })
})

describe('buildSummary — student vs staff comparisons', () => {
  it('computes proportions with sample sizes for both groups', () => {
    const rows = [
      ...makeRows(10, [{ 'Respondent Category': 'Student', 'Willingness to Use Campus Facility': 'Definitely' }]),
      ...makeRows(4, [{ 'Respondent Category': 'Teaching Staff', 'Willingness to Use Campus Facility': 'Probably not' }]),
    ]
    const summary = summaryFor(rows)
    const cmp = summary.comparisons.find((c) => c.key === 'q12')!
    expect(cmp.groupA.n).toBe(10)
    expect(cmp.groupA.proportion).toBe(100)
    expect(cmp.groupB.n).toBe(4)
    expect(cmp.groupB.proportion).toBe(0)
    expect(cmp.difference).toBe(100)
  })

  it('does not test comparisons when a group has fewer than 5 responses', () => {
    const rows = [
      ...makeRows(10, [{ 'Respondent Category': 'Student' }]),
      ...makeRows(3, [{ 'Respondent Category': 'Non-Teaching Staff' }]),
    ]
    const summary = summaryFor(rows)
    for (const cmp of summary.comparisons) {
      expect(cmp.pValue).toBeNull()
      expect(cmp.note).toContain('5 responses')
    }
  })

  it('reports p-value and CI when groups are large enough', () => {
    const rows = [
      ...makeRows(30, [{ 'Respondent Category': 'Student', 'Willingness to Use Campus Facility': 'Definitely' }]),
      ...makeRows(20, [{ 'Respondent Category': 'Teaching Staff', 'Willingness to Use Campus Facility': 'Not sure' }]),
    ]
    const summary = summaryFor(rows)
    const cmp = summary.comparisons.find((c) => c.key === 'q12')!
    expect(cmp.pValue).not.toBeNull()
    expect(cmp.pValue!).toBeLessThan(0.05)
    expect(cmp.groupA.ciLow).toBeLessThanOrEqual(cmp.groupA.proportion)
    expect(cmp.groupA.ciHigh).toBeGreaterThanOrEqual(cmp.groupA.proportion)
    expect(cmp.zStatistic).not.toBeNull()
  })

  it('pools teaching and non-teaching staff into one staff group', () => {
    const rows = [
      ...makeRows(10, [{ 'Respondent Category': 'Student' }]),
      ...makeRows(8, [{ 'Respondent Category': 'Teaching Staff' }]),
      ...makeRows(7, [{ 'Respondent Category': 'Non-Teaching Staff' }]),
    ]
    const summary = summaryFor(rows)
    const cmp = summary.comparisons.find((c) => c.key === 'q12')!
    expect(cmp.groupB.n).toBe(15)
  })
})

describe('buildSummary — awareness score', () => {
  it('computes mean, distribution, and per-category means', () => {
    const rows = [
      ...makeRows(5, [
        {
          'Familiarity with E-Waste Term': 'Very familiar',
          'Ability to Identify E-Waste Items': 'Yes, I can identify most of them',
          'Awareness of Environmental and Health Impacts': 'Fully aware',
          'Use of Authorized Recycling Facility': 'Yes',
          'Awareness of Campus Collection Facilities': 'Yes, and I know where it is',
        },
      ]),
      ...makeRows(5, [
        {
          'Familiarity with E-Waste Term': 'Not at all familiar',
          'Ability to Identify E-Waste Items': 'No, I cannot identify them',
          'Awareness of Environmental and Health Impacts': 'Not aware at all',
          'Use of Authorized Recycling Facility': 'No — I am not aware of any',
          'Awareness of Campus Collection Facilities': 'No, I am not aware of any',
        },
      ]),
    ]
    const summary = summaryFor(rows)
    expect(summary.awarenessScore.validN).toBe(10)
    expect(summary.awarenessScore.mean).toBe(50)
    expect(summary.awarenessScore.scoreByCategory.find((c) => c.category === 'student')!.mean).toBe(50)
    expect(summary.awarenessScore.ruleDescription).toContain('NOT a validated')
  })
})

describe('buildSummary — findings', () => {
  it('generates only measured findings from real data plus clearly-labelled proposals', () => {
    const summary = summaryFor(makeRows(20))
    expect(summary.findings.length).toBeGreaterThan(0)
    expect(summary.findings.some((f) => f.kind === 'measured')).toBe(true)
    expect(summary.findings.some((f) => f.kind === 'proposed')).toBe(true)
    for (const f of summary.findings.filter((x) => x.kind === 'measured')) {
      expect(f.body.length).toBeGreaterThan(10)
    }
  })

  it('produces no findings for empty data', () => {
    expect(summaryFor([]).findings).toEqual([])
  })

  it('tags measured findings with their basis (question + denominator)', () => {
    const summary = summaryFor(makeRows(20))
    const withBasis = summary.findings.filter((f) => f.kind === 'measured' && f.basis)
    expect(withBasis.length).toBeGreaterThan(0)
    expect(withBasis[0].basis).toMatch(/n = 20/)
  })
})

describe('buildSummary — meta provenance', () => {
  it('records dataset version with row and duplicate counts', () => {
    const row = makeRow()
    const rows = [row, { ...row }, makeRow({ Timestamp: '2026-10-03 09:00:00' })]
    const summary = buildSummary(rows, {}, baseMeta)
    expect(summary.meta.totalRows).toBe(3)
    expect(summary.meta.datasetVersion).toContain('1 duplicate')
    expect(summary.meta.generatedAt).toBe(baseMeta.generatedAt)
    expect(summary.meta.isDemo).toBe(false)
  })
})

describe('buildDemoSummary', () => {
  it('is clearly labelled as demonstration data', () => {
    const summary = buildDemoSummary({})
    expect(summary.meta.isDemo).toBe(true)
    expect(summary.meta.source).toMatch(/NOT real survey responses/)
    expect(summary.meta.validResponses).toBeGreaterThan(0)
    expect(summary.findings.length).toBeGreaterThan(0)
  })

  it('supports filters too', () => {
    const summary = buildDemoSummary({ category: 'student' })
    expect(summary.meta.filters.category).toBe('student')
  })
})
