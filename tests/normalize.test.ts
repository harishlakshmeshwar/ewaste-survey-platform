import { describe, expect, it } from 'vitest'
import { computeAwarenessScore, dedupe, normalizeRows } from '../src/lib/normalize'
import { makeRow, makeRows } from './fixtures'

describe('normalizeRows — validation', () => {
  it('accepts a fully valid row and maps category + options to canonical values', () => {
    const { responses, headerWarnings } = normalizeRows([makeRow()])
    expect(headerWarnings).toEqual([])
    expect(responses).toHaveLength(1)
    expect(responses[0].valid).toBe(true)
    expect(responses[0].answers.q1).toBe('student')
    expect(responses[0].answers.q3).toBe('very')
    expect(responses[0].timestamp).toBe(new Date('2026-10-01 10:00:00').toISOString())
  })

  it('flags missing required answers as invalid instead of coercing them', () => {
    const { responses } = normalizeRows([makeRow({ 'Respondent Category': '' })])
    expect(responses[0].valid).toBe(false)
    expect(responses[0].invalidReasons.some((r) => r.startsWith('q1'))).toBe(true)
    expect(responses[0].answers.q1).toBeNull()
  })

  it('records unrecognised categories without silently replacing them', () => {
    const { responses } = normalizeRows([makeRow({ 'Respondent Category': 'Alumni' })])
    expect(responses[0].valid).toBe(false)
    expect(responses[0].answers.q1).toBeNull()
    expect(responses[0].originalAnswers.q1).toBe('Alumni')
    expect(responses[0].unexpectedValues).toEqual([{ questionId: 'q1', value: 'Alumni' }])
  })

  it('normalises case and alias variants of the respondent category', () => {
    const { responses } = normalizeRows([
      makeRow({ 'Respondent Category': '  teaching faculty ' }),
      makeRow({ 'Respondent Category': 'NON-TEACHING STAFF' }),
      makeRow({ 'Respondent Category': 'students' }),
    ])
    expect(responses.map((r) => r.answers.q1)).toEqual([
      'teaching_staff',
      'non_teaching_staff',
      'student',
    ])
    expect(responses.every((r) => r.valid)).toBe(true)
  })

  it('handles multi-select barriers, keeping recognised options and preserving custom text', () => {
    const { responses } = normalizeRows([
      makeRow({ 'Barriers to Responsible Disposal': 'Lack of awareness, Concern about personal data on devices, Mystery barrier' }),
    ])
    // Recognised options are canonicalised; the custom answer is kept (not erased)
    // so it surfaces as an "Other:" bucket and its original text is recorded.
    expect(responses[0].answers.q13).toEqual(['lack_of_awareness', 'data_privacy', 'Mystery barrier'])
    expect(responses[0].unexpectedValues).toEqual([
      { questionId: 'q13', value: 'Mystery barrier' },
    ])
  })

  it('treats optional blank answers as missing, not invalid', () => {
    const { responses } = normalizeRows([
      makeRow({
        'Department or School': '',
        'Improvement Measures': '',
        'Barriers to Responsible Disposal': '',
      }),
    ])
    expect(responses[0].valid).toBe(true)
    expect(responses[0].answers.q2).toBeNull()
    expect(responses[0].answers.q15).toBeNull()
    expect(responses[0].answers.q13).toBeNull()
  })

  it('warns about unexpected columns and ignores email data', () => {
    const row = makeRow()
    row.Email = 'someone@example.com'
    const { headerWarnings } = normalizeRows([row])
    expect(headerWarnings.some((w) => w.includes('Email'))).toBe(true)
    expect(headerWarnings.some((w) => w.includes('Missing expected columns'))).toBe(false)
  })

  it('returns empty results for an empty dataset', () => {
    const { responses } = normalizeRows([])
    expect(responses).toEqual([])
  })

  it('warns when required columns are absent', () => {
    const { headerWarnings, responses } = normalizeRows([{ Timestamp: '2026-10-01', 'Respondent Category': 'Student' }])
    expect(headerWarnings.some((w) => w.includes('Missing expected columns'))).toBe(true)
    expect(responses[0].valid).toBe(false)
  })

  it('warns on unparseable timestamps and keeps timestamp null', () => {
    const { responses, headerWarnings } = normalizeRows([makeRow({ Timestamp: 'not-a-date' })])
    expect(responses[0].timestamp).toBeNull()
    expect(headerWarnings.some((w) => w.includes('unparseable timestamp'))).toBe(true)
  })
})

describe('dedupe', () => {
  it('removes exact duplicates (same timestamp + answers)', () => {
    const row = makeRow({ Timestamp: '2026-10-01 10:00:00' })
    const { responses } = normalizeRows([row, { ...row }, makeRow({ Timestamp: '2026-10-02 11:00:00' })])
    const { unique, duplicatesRemoved } = dedupe(responses)
    expect(duplicatesRemoved).toBe(1)
    expect(unique).toHaveLength(2)
  })

  it('keeps rows that differ in answers even with equal timestamps', () => {
    const { responses } = normalizeRows([
      makeRow({ Timestamp: '2026-10-01 10:00:00' }),
      makeRow({ Timestamp: '2026-10-01 10:00:00', 'Willingness to Use Campus Facility': 'Definitely not' }),
    ])
    const { unique, duplicatesRemoved } = dedupe(responses)
    expect(duplicatesRemoved).toBe(0)
    expect(unique).toHaveLength(2)
  })
})

describe('computeAwarenessScore', () => {
  it('scores 100 when all knowledge items meet the threshold', () => {
    const row = makeRow({
      'Familiarity with E-Waste Term': 'Very familiar',
      'Ability to Identify E-Waste Items': 'Yes, I can identify most of them',
      'Awareness of Environmental and Health Impacts': 'Fully aware',
      'Use of Authorized Recycling Facility': 'Yes',
      'Awareness of Campus Collection Facilities': 'Yes, and I know where it is',
    })
    const { responses } = normalizeRows([row])
    const { score, answered } = computeAwarenessScore(responses[0].answers)
    expect(score).toBe(100)
    expect(answered).toBe(5)
  })

  it('scores 0 when no item meets the threshold', () => {
    const row = makeRow({
      'Familiarity with E-Waste Term': 'Not at all familiar',
      'Ability to Identify E-Waste Items': 'No, I cannot identify them',
      'Awareness of Environmental and Health Impacts': 'Not aware at all',
      'Use of Authorized Recycling Facility': 'No — I am not aware of any',
      'Awareness of Campus Collection Facilities': 'No, I am not aware of any',
    })
    const { responses } = normalizeRows([row])
    expect(computeAwarenessScore(responses[0].answers).score).toBe(0)
  })

  it('returns null when nothing was answered', () => {
    expect(computeAwarenessScore({})).toEqual({ score: null, answered: 0 })
  })

  it('excludes unanswered items from the numerator but keeps denominator at 5', () => {
    const row = makeRow({
      'Familiarity with E-Waste Term': '',
      'Use of Authorized Recycling Facility': '',
      'Awareness of Campus Collection Facilities': 'Yes, and I know where it is',
    })
    const { responses } = normalizeRows([row])
    const { score, answered } = computeAwarenessScore(responses[0].answers)
    expect(answered).toBe(3)
    expect(score).toBe(60)
  })
})

describe('row validation volume', () => {
  it('marks all valid for a clean batch', () => {
    const { responses } = normalizeRows(makeRows(10))
    expect(responses).toHaveLength(10)
    expect(responses.every((r) => r.valid)).toBe(true)
  })
})
