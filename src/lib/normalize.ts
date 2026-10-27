import {
  AWARENESS_SCORE_QUESTIONS,
  COLUMN_TO_QUESTION,
  QUESTIONS,
  TIMESTAMP_COLUMNS,
  headerAliases,
  optionLabel,
} from './schema'
import type { AnswerValue, QuestionId, SurveyResponse } from './types'

const CATEGORY_ALIASES: Record<string, string> = {
  student: 'student',
  students: 'student',
  'teaching staff': 'teaching_staff',
  teacher: 'teaching_staff',
  faculty: 'teaching_staff',
  'teaching faculty': 'teaching_staff',
  'non-teaching staff': 'non_teaching_staff',
  'non teaching staff': 'non_teaching_staff',
  'nonteaching staff': 'non_teaching_staff',
  'non-teaching': 'non_teaching_staff',
  staff: 'non_teaching_staff',
  'administrative staff': 'non_teaching_staff',
}

function normKey(value: string): string {
  return value.toLowerCase().trim().replace(/\s+/g, ' ')
}

function splitMulti(value: string): string[] {
  return value
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean)
}

export interface RawRow {
  [column: string]: string
}

export interface NormalizeResult {
  responses: SurveyResponse[]
  headerWarnings: string[]
}

function resolveColumnMap(headerKeys: string[]): {
  map: Map<QuestionId, string>
  timestampColumn: string | null
  unknownColumns: string[]
} {
  const map = new Map<QuestionId, string>()
  let timestampColumn: string | null = null
  const unknownColumns: string[] = []

  for (const rawKey of headerKeys) {
    const key = normKey(rawKey)
    if (!key) continue
    if (TIMESTAMP_COLUMNS.includes(key)) {
      timestampColumn = rawKey
      continue
    }
    const question = COLUMN_TO_QUESTION[key]
    if (question) {
      map.set(question.id, rawKey)
      continue
    }
    const byPrefix = QUESTIONS.find((q) =>
      headerAliases(q).some((alias) => key.startsWith(alias) || alias.startsWith(key)),
    )
    if (byPrefix) {
      map.set(byPrefix.id, rawKey)
      continue
    }
    if (key === 'email' || key === 'name') {
      unknownColumns.push(rawKey)
      continue
    }
    unknownColumns.push(rawKey)
  }
  return { map, timestampColumn, unknownColumns }
}

function coerceAnswer(
  questionId: QuestionId,
  raw: string,
): { value: AnswerValue; original: string; unexpected: string | null } {
  const question = QUESTIONS.find((q) => q.id === questionId)
  if (!question) return { value: null, original: raw, unexpected: null }
  const original = raw.trim()
  if (!original) return { value: null, original: '', unexpected: null }

  if (question.type === 'text') {
    return { value: original, original, unexpected: null }
  }

  if (question.type === 'multi') {
    const parts = splitMulti(original)
    const matched: string[] = []
    const unexpected: string[] = []
    for (const part of parts) {
      const hit = question.options.find(
        (o) => normKey(o.label) === normKey(part) || normKey(o.value) === normKey(part),
      )
      if (hit) {
        matched.push(hit.value)
      } else if (normKey(part).startsWith('other:')) {
        // Google Forms exports a chosen "Other" option as free text.
        matched.push(question.options.some((o) => o.value === 'other') ? 'other' : part)
        unexpected.push(part)
      } else {
        unexpected.push(part)
      }
    }
    // Keep every part so custom answers stay visible in the distribution
    // instead of being silently dropped when some options matched.
    const all = [...matched, ...unexpected]
    return {
      value: all.length > 0 ? all : null,
      original,
      unexpected: unexpected.length > 0 ? unexpected.join(', ') : null,
    }
  }

  if (questionId === 'q1') {
    const alias = CATEGORY_ALIASES[normKey(original)]
    if (alias) return { value: alias, original, unexpected: null }
    return { value: null, original, unexpected: original }
  }

  const hit = question.options.find(
    (o) => normKey(o.label) === normKey(original) || normKey(o.value) === normKey(original),
  )
  if (hit) return { value: hit.value, original, unexpected: null }
  // Google Forms "Other" text answers arrive as free text or as "Other: …".
  if (normKey(original).startsWith('other:')) {
    if (question.options.some((o) => o.value === 'other')) {
      return { value: 'other', original, unexpected: original }
    }
  }
  if (question.options.some((o) => o.value === 'other')) {
    return { value: 'other', original, unexpected: original }
  }
  // No "Other" option: keep the raw answer so it is reported as an
  // unexpected bucket rather than erased or coerced.
  return { value: original, original, unexpected: original }
}

export function normalizeRows(rows: RawRow[]): NormalizeResult {
  const headerWarnings: string[] = []
  if (rows.length === 0) return { responses: [], headerWarnings }

  const headerKeys = Object.keys(rows[0])
  const { map, timestampColumn, unknownColumns } = resolveColumnMap(headerKeys)

  const missingColumns = QUESTIONS.filter((q) => !map.has(q.id)).map((q) => q.column)
  if (missingColumns.length > 0) {
    headerWarnings.push(`Missing expected columns: ${missingColumns.join('; ')}`)
  }
  if (unknownColumns.length > 0) {
    headerWarnings.push(`Ignored unexpected columns: ${unknownColumns.join('; ')}`)
  }
  if (!timestampColumn) {
    headerWarnings.push('No timestamp column detected — date filters disabled.')
  }
  const hasEmail = headerKeys.some((k) => normKey(k) === 'email')
  if (hasEmail) {
    headerWarnings.push('Source contains an "email" column — it is ignored and never returned.')
  }

  const responses: SurveyResponse[] = rows.map((row, index) => {
    const answers: Partial<Record<QuestionId, AnswerValue>> = {}
    const originalAnswers: Partial<Record<QuestionId, string>> = {}
    const unexpectedValues: { questionId: QuestionId; value: string }[] = []
    const invalidReasons: string[] = []
    const requiredQuestions = QUESTIONS.filter((q) => q.required)
    let missingRequired = 0

    for (const question of QUESTIONS) {
      const column = map.get(question.id)
      const raw = column ? (row[column] ?? '') : ''
      const coerced = coerceAnswer(question.id, raw)
      answers[question.id] = coerced.value
      if (coerced.original) originalAnswers[question.id] = coerced.original
      if (coerced.unexpected) {
        unexpectedValues.push({ questionId: question.id, value: coerced.unexpected })
      }
      const answerEmpty = coerced.value === null || (Array.isArray(coerced.value) && coerced.value.length === 0)
      if (question.required && answerEmpty) {
        missingRequired += 1
        if (question.id === 'q1') {
          invalidReasons.push(
            coerced.unexpected
              ? `q1: unrecognised category "${coerced.unexpected}"`
              : 'q1: missing required answer (respondent cannot be classified)',
          )
        }
      }
      // Unrecognised values on non-q1 questions are NOT row-invalid:
      // they stay visible as unexpected/other buckets, and their original
      // text is preserved. Only an unclassifiable respondent (q1) or a
      // mostly-blank row disqualifies the whole row.
    }

    if (
      invalidReasons.length === 0 &&
      missingRequired > requiredQuestions.length / 2
    ) {
      invalidReasons.push(
        `row: ${missingRequired} of ${requiredQuestions.length} required answers missing (blank submission)`,
      )
    }

    const timestampRaw = timestampColumn ? (row[timestampColumn] ?? '').trim() : ''
    const parsedTime = timestampRaw ? Date.parse(timestampRaw) : NaN
    const timestamp = Number.isNaN(parsedTime) ? null : new Date(parsedTime).toISOString()
    if (timestampRaw && Number.isNaN(parsedTime)) {
      headerWarnings.push(`Row ${index + 2}: unparseable timestamp "${timestampRaw}"`)
    }

    return {
      id: `row-${index + 1}`,
      timestamp,
      answers,
      originalAnswers,
      valid: invalidReasons.length === 0,
      invalidReasons,
      unexpectedValues,
    }
  })

  return { responses, headerWarnings }
}

function answersEqual(a: SurveyResponse, b: SurveyResponse): boolean {
  return QUESTIONS.every((q) => {
    const av = a.answers[q.id] ?? null
    const bv = b.answers[q.id] ?? null
    if (Array.isArray(av) || Array.isArray(bv)) {
      const al = Array.isArray(av) ? av : av === null ? [] : [av]
      const bl = Array.isArray(bv) ? bv : bv === null ? [] : [bv]
      return al.length === bl.length && al.every((v, i) => v === bl[i])
    }
    return av === bv
  })
}

export function isDuplicateRow(a: SurveyResponse, b: SurveyResponse): boolean {
  if (a.timestamp !== b.timestamp) return false
  return answersEqual(a, b)
}

export function dedupe(responses: SurveyResponse[]): {
  unique: SurveyResponse[]
  duplicatesRemoved: number
} {
  const seen: string[] = []
  const unique: SurveyResponse[] = []
  let duplicatesRemoved = 0
  for (const response of responses) {
    const isDup = seen.some((id) => {
      const other = unique.find((u) => u.id === id)
      return other ? isDuplicateRow(response, other) : false
    })
    if (isDup) duplicatesRemoved += 1
    else {
      seen.push(response.id)
      unique.push(response)
    }
  }
  return { unique, duplicatesRemoved }
}

export function computeAwarenessScore(
  answers: Partial<Record<QuestionId, AnswerValue>>,
): { score: number | null; answered: number } {
  let met = 0
  let answered = 0
  for (const item of AWARENESS_SCORE_QUESTIONS) {
    const value = answers[item.id]
    if (value === null || value === undefined || value === '') continue
    answered += 1
    if (typeof value === 'string' && item.correct.includes(value)) met += 1
  }
  if (answered === 0) return { score: null, answered: 0 }
  return { score: Math.round((met / AWARENESS_SCORE_QUESTIONS.length) * 100), answered }
}

export { optionLabel }
