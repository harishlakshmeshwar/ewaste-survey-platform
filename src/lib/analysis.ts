import { computeAwarenessScore, dedupe, normalizeRows } from './normalize'
import { AWARENESS_SCORE_RULE, QUESTIONS, RESPONSE_TARGETS } from './schema'
import type {
  AwarenessScore,
  Distribution,
  DistributionBucket,
  FindingItem,
  KpiCardData,
  ProportionComparison,
  QuestionId,
  RespondentCategory,
  SurveyResponse,
  Summary,
  SummaryMeta,
  SummaryMetaBase,
  SummaryQuery,
} from './types'
import type { RawRow } from './normalize'

const MIN_GROUP_N = 5
const MIN_COMPARISON_N = 5

export function pct(count: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((count / total) * 1000) / 10
}

function isMissing(value: unknown): boolean {
  return value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)
}

function buildDistribution(
  responses: SurveyResponse[],
  questionId: QuestionId,
): Distribution {
  const question = QUESTIONS.find((q) => q.id === questionId)!
  const counts = new Map<string, number>()
  let missingN = 0
  let unexpectedN = 0
  let textResponseCount: number | undefined

  for (const response of responses) {
    const value = response.answers[questionId]
    if (isMissing(value)) {
      missingN += 1
      continue
    }
    if (question.type === 'text') {
      textResponseCount = (textResponseCount ?? 0) + 1
      continue
    }
    const values = (Array.isArray(value) ? value : [value]).filter((v): v is string => typeof v === 'string')
    let hadUnexpected = false
    for (const v of values) {
      const isKnown = question.options.some((o) => o.value === v)
      if (!isKnown) {
        hadUnexpected = true
        const key = `__unexpected__:${v}`
        counts.set(key, (counts.get(key) ?? 0) + 1)
        continue
      }
      counts.set(v, (counts.get(v) ?? 0) + 1)
    }
    if (hadUnexpected) unexpectedN += 1
  }

  const buckets: DistributionBucket[] = []

  if (question.type === 'multi') {
    const validN = responses.filter((r) => !isMissing(r.answers[questionId])).length
    for (const option of question.options) {
      const count = counts.get(option.value) ?? 0
      buckets.push({
        value: option.value,
        label: option.label,
        count,
        percentage: pct(count, validN),
      })
    }
    const unexpectedKeys = [...counts.keys()].filter((k) => k.startsWith('__unexpected__:'))
    for (const key of unexpectedKeys) {
      const raw = key.slice('__unexpected__:'.length)
      buckets.push({ value: key, label: `Other: ${raw}`, count: counts.get(key)!, percentage: pct(counts.get(key)!, validN) })
    }
    return {
      questionId,
      label: question.prompt,
      type: question.type,
      buckets,
      validN,
      missingN,
      unexpectedN,
    }
  }

  if (question.type === 'text') {
    return {
      questionId,
      label: question.prompt,
      type: 'text',
      buckets: [],
      validN: textResponseCount ?? 0,
      missingN,
      unexpectedN: 0,
      textResponseCount: textResponseCount ?? 0,
    }
  }

  // Single choice: preserve the survey's option order; append unexpected values last.
  let validN = 0
  for (const option of question.options) {
    const count = counts.get(option.value) ?? 0
    validN += count
    buckets.push({
      value: option.value,
      label: option.label,
      count,
      percentage: 0,
    })
  }
  const unexpectedKeys = [...counts.keys()].filter((k) => k.startsWith('__unexpected__:'))
  for (const key of unexpectedKeys) {
    const raw = key.slice('__unexpected__:'.length)
    const count = counts.get(key)!
    validN += count
    buckets.push({ value: key, label: `Unexpected: ${raw}`, count, percentage: 0 })
  }
  for (const bucket of buckets) {
    bucket.percentage = pct(bucket.count, validN)
  }

  return {
    questionId,
    label: question.prompt,
    type: 'single',
    buckets,
    validN,
    missingN,
    unexpectedN,
  }
}

function wilsonCI(count: number, n: number, z = 1.96): { low: number; high: number } {
  if (n === 0) return { low: 0, high: 0 }
  const p = count / n
  const z2 = z * z
  const denom = 1 + z2 / n
  const centre = p + z2 / (2 * n)
  const margin = z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))
  return {
    low: Math.max(0, ((centre - margin) / denom) * 100),
    high: Math.min(100, ((centre + margin) / denom) * 100),
  }
}

function normalCdf(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x))
  const d = 0.3989422804014327 * Math.exp((-x * x) / 2)
  const prob = d * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))))
  return x >= 0 ? 1 - prob : prob
}

function proportionComparison(
  key: string,
  label: string,
  groupALabel: string,
  groupAAll: SurveyResponse[],
  groupBLabel: string,
  groupBAll: SurveyResponse[],
  positiveValues: string[],
): ProportionComparison {
  const answered = (group: SurveyResponse[]) =>
    group.filter((r) => !isMissing(r.answers[key as QuestionId]))

  const groupA = answered(groupAAll)
  const groupB = answered(groupBAll)

  const countIn = (group: SurveyResponse[]) =>
    group.filter((r) => {
      const v = r.answers[key as QuestionId]
      if (isMissing(v)) return false
      const values = (Array.isArray(v) ? v : [v]).filter((x): x is string => typeof x === 'string')
      return values.some((x) => positiveValues.includes(x))
    }).length

  const countA = countIn(groupA)
  const countB = countIn(groupB)
  const nA = groupA.length
  const nB = groupB.length
  const ciA = wilsonCI(countA, nA)
  const ciB = wilsonCI(countB, nB)
  const pA = countA / nA
  const pB = countB / nB
  const descDifference = nA > 0 && nB > 0 ? Math.round((pA - pB) * 1000) / 10 : 0

  if (nA < MIN_COMPARISON_N || nB < MIN_COMPARISON_N) {
    return {
      key,
      label,
      groupA: { label: groupALabel, n: nA, count: countA, proportion: pct(countA, nA), ciLow: ciA.low, ciHigh: ciA.high },
      groupB: { label: groupBLabel, n: nB, count: countB, proportion: pct(countB, nB), ciLow: ciB.low, ciHigh: ciB.high },
      difference: descDifference,
      zStatistic: null,
      pValue: null,
      note: `Not tested — at least ${MIN_COMPARISON_N} responses per group are required for a comparison.`,
    }
  }

  const pooled = (countA + countB) / (nA + nB)
  const se = Math.sqrt(pooled * (1 - pooled) * (1 / nA + 1 / nB))
  if (se === 0) {
    return {
      key,
      label,
      groupA: { label: groupALabel, n: nA, count: countA, proportion: pct(pA, 1), ciLow: ciA.low, ciHigh: ciA.high },
      groupB: { label: groupBLabel, n: nB, count: countB, proportion: pct(pB, 1), ciLow: ciB.low, ciHigh: ciB.high },
      difference: descDifference,
      zStatistic: null,
      pValue: null,
      note: 'No variation in this item across groups — difference not testable.',
    }
  }
  const z = (pA - pB) / se
  const pValue = 2 * (1 - normalCdf(Math.abs(z)))

  return {
    key,
    label,
    groupA: { label: groupALabel, n: nA, count: countA, proportion: pct(pA, 1), ciLow: ciA.low, ciHigh: ciA.high },
    groupB: { label: groupBLabel, n: nB, count: countB, proportion: pct(pB, 1), ciLow: ciB.low, ciHigh: ciB.high },
    difference: descDifference,
    zStatistic: Math.round(z * 1000) / 1000,
    pValue: Math.round(pValue * 10000) / 10000,
    note: null,
  }
}

function buildAwarenessScore(responses: SurveyResponse[]): AwarenessScore {
  let sum = 0
  let validN = 0
  let missingN = 0
  const buckets = new Map<string, number>()
  const byCategory = new Map<RespondentCategory, { sum: number; n: number }>()

  for (const response of responses) {
    const { score } = computeAwarenessScore(response.answers)
    if (score === null) {
      missingN += 1
      continue
    }
    validN += 1
    sum += score
    const bucket = score < 40 ? '0–39 (low)' : score < 60 ? '40–59 (limited)' : score < 80 ? '60–79 (moderate)' : '80–100 (high)'
    buckets.set(bucket, (buckets.get(bucket) ?? 0) + 1)
    const category = response.answers.q1
    if (category === 'student' || category === 'teaching_staff' || category === 'non_teaching_staff') {
      const entry = byCategory.get(category) ?? { sum: 0, n: 0 }
      entry.sum += score
      entry.n += 1
      byCategory.set(category, entry)
    }
  }

  const order = ['0–39 (low)', '40–59 (limited)', '60–79 (moderate)', '80–100 (high)']
  const distBuckets: DistributionBucket[] = order.map((label) => {
    const count = buckets.get(label) ?? 0
    return { value: label, label, count, percentage: pct(count, validN) }
  })

  return {
    min: 0,
    max: 100,
    mean: validN > 0 ? Math.round((sum / validN) * 10) / 10 : null,
    distribution: distBuckets,
    validN,
    missingN,
    ruleDescription: AWARENESS_SCORE_RULE,
    scoreByCategory: [...byCategory.entries()].map(([category, entry]) => ({
      category,
      n: entry.n,
      mean: Math.round((entry.sum / entry.n) * 10) / 10,
    })),
  }
}

function bucketOf(dist: Distribution, value: string): DistributionBucket | undefined {
  return dist.buckets.find((b) => b.value === value)
}

function topBucket(dist: Distribution): DistributionBucket | undefined {
  const candidates = dist.buckets.filter((b) => !b.value.startsWith('__unexpected__'))
  if (candidates.length === 0) return undefined
  return candidates.reduce((best, b) => (b.count > best.count ? b : best), candidates[0])
}

function buildFindings(responses: SurveyResponse[], awareness: AwarenessScore, departments: Distribution): FindingItem[] {
  if (responses.length === 0) return []
  const findings: FindingItem[] = []
  const n = responses.length
  const nText = `n = ${n} valid responses`

  const familiarity = buildDistribution(responses, 'q3')
  const notFamiliar = bucketOf(familiarity, 'not_at_all')?.count ?? 0
  const awareImpact = (bucketOf(buildDistribution(responses, 'q5'), 'fully_aware')?.count ?? 0) +
    (bucketOf(buildDistribution(responses, 'q5'), 'partially_aware')?.count ?? 0)

  if (notFamiliar > 0) {
    findings.push({
      id: 'f-familiarity-gap',
      kind: 'measured',
      title: 'Familiarity with the term e-waste is not universal',
      body: `${pct(notFamiliar, familiarity.validN)}% of respondents reported being "not at all familiar" with the term e-waste (${notFamiliar} of ${familiarity.validN}).`,
      basis: `Q3 · ${nText}`,
    })
  }

  findings.push({
    id: 'f-impact-awareness',
    kind: 'measured',
    title: 'Environmental and health impact awareness',
    body: `${pct(awareImpact, buildDistribution(responses, 'q5').validN)}% reported at least partial awareness of the environmental and health impacts of improper e-waste disposal.`,
    basis: `Q5 · ${nText}`,
  })

  const disposal = buildDistribution(responses, 'q8')
  const topDisposal = topBucket(disposal)
  if (topDisposal && disposal.validN > 0) {
    findings.push({
      id: 'f-disposal-pattern',
      kind: 'measured',
      title: 'Most common disposal route',
      body: `The most frequently reported disposal method is "${topDisposal.label}" at ${topDisposal.percentage}% (${topDisposal.count} of ${disposal.validN}).`,
      basis: `Q8 · ${nText}`,
    })
    const responsible = (bucketOf(disposal, 'authorized_recycler')?.count ?? 0) + (bucketOf(disposal, 'campus_bin')?.count ?? 0)
    findings.push({
      id: 'f-responsible-share',
      kind: 'measured',
      title: 'Share using responsible channels',
      body: `${pct(responsible, disposal.validN)}% reported giving unused or damaged electronics to an authorized recycler or a campus collection point.`,
      basis: `Q8 · ${nText}`,
    })
  }

  const facility = buildDistribution(responses, 'q11')
  const notAware = (bucketOf(facility, 'no')?.count ?? 0)
  if (facility.validN > 0) {
    findings.push({
      id: 'f-campus-facility',
      kind: 'measured',
      title: 'Campus collection facility awareness gap',
      body: `${pct(notAware, facility.validN)}% were not aware of any e-waste collection facility on campus, and a further ${pct(bucketOf(facility, 'heard_but_unknown')?.count ?? 0, facility.validN)}% had heard of one but did not know where it is.`,
      basis: `Q11 · ${nText}`,
    })
  }

  const barriers = buildDistribution(responses, 'q13')
  if (barriers.validN > 0) {
    const ranked = [...barriers.buckets].sort((a, b) => b.count - a.count).slice(0, 3)
    findings.push({
      id: 'f-barriers',
      kind: 'measured',
      title: 'Leading barriers to responsible disposal',
      body: `Top reported barriers: ${ranked.map((b) => `${b.label} (${b.percentage}%)`).join('; ')}.`,
      basis: `Q13 (multiple selection; percentages of ${barriers.validN} respondents who answered this item)`,
    })
  }

  const willingness = buildDistribution(responses, 'q12')
  const willing = (bucketOf(willingness, 'definitely')?.count ?? 0) + (bucketOf(willingness, 'probably')?.count ?? 0)
  if (willingness.validN > 0) {
    findings.push({
      id: 'f-willingness',
      kind: 'measured',
      title: 'Willingness to use a campus facility',
      body: `${pct(willing, willingness.validN)}% said they would definitely or probably use a designated campus e-waste collection facility (${willing} of ${willingness.validN}).`,
      basis: `Q12 · ${nText}`,
    })
  }

  const campaigns = buildDistribution(responses, 'q14')
  const supportive = (bucketOf(campaigns, 'very_useful')?.count ?? 0) + (bucketOf(campaigns, 'somewhat_useful')?.count ?? 0)
  if (campaigns.validN > 0 && pct(supportive, campaigns.validN) >= 50) {
    findings.push({
      id: 'f-campaigns',
      kind: 'measured',
      title: 'Support for awareness campaigns',
      body: `${pct(supportive, campaigns.validN)}% found campus awareness campaigns very or somewhat useful.`,
      basis: `Q14 · ${nText}`,
    })
  }

  const incineration = buildDistribution(responses, 'q16')
  const toxicFumes = bucketOf(incineration, 'toxic_fumes')?.count ?? 0
  if (incineration.validN > 0) {
    findings.push({
      id: 'f-incineration-knowledge',
      kind: 'measured',
      title: 'Knowledge of uncontrolled incineration risks',
      body: `${pct(toxicFumes, incineration.validN)}% correctly identified that burning or incinerating e-waste under uncontrolled conditions releases toxic fumes and pollutants (${toxicFumes} of ${incineration.validN}).`,
      basis: `Q16 · ${nText}`,
    })
  }

  const landfill = buildDistribution(responses, 'q17')
  const contaminates = bucketOf(landfill, 'contaminates')?.count ?? 0
  if (landfill.validN > 0) {
    findings.push({
      id: 'f-landfill-knowledge',
      kind: 'measured',
      title: 'Knowledge of landfill contamination',
      body: `${pct(contaminates, landfill.validN)}% correctly identified that landfill disposal may contaminate soil and groundwater (${contaminates} of ${landfill.validN}).`,
      basis: `Q17 · ${nText}`,
    })
  }

  const health = buildDistribution(responses, 'q18')
  if (health.validN > 0) {
    const recognised = health.buckets.filter(
      (b) => !['none_of_these', 'dont_know'].includes(b.value) && !b.value.startsWith('__unexpected__'),
    )
    const top = recognised.length > 0 ? recognised.reduce((a, b) => (b.count > a.count ? b : a), recognised[0]) : undefined
    findings.push({
      id: 'f-health-effects',
      kind: 'measured',
      title: 'Reported knowledge of health effects',
      body: `The most frequently recognised health effect of hazardous e-waste exposure is "${top?.label ?? '—'}" (${top?.percentage ?? 0}% of ${health.validN} respondents answering this item; multiple selections allowed).`,
      basis: `Q18 (multiple selection; percentages over ${health.validN} respondents who answered this item)`,
    })
  }

  const pollutants = buildDistribution(responses, 'q19')
  if (pollutants.validN > 0) {
    const recognised = pollutants.buckets.filter(
      (b) => !['none_of_these', 'dont_know'].includes(b.value) && !b.value.startsWith('__unexpected__'),
    )
    const ranked = [...recognised].sort((a, b) => b.count - a.count).slice(0, 3)
    findings.push({
      id: 'f-pollutants',
      kind: 'measured',
      title: 'Awareness of hazardous pollutants',
      body: `Most-recognised pollutants released during improper handling: ${ranked.map((b) => `${b.label} (${b.percentage}%)`).join('; ')}.`,
      basis: `Q19 (multiple selection; percentages over ${pollutants.validN} respondents who answered this item)`,
    })
  }

  const components = buildDistribution(responses, 'q20')
  if (components.validN > 0) {
    const recognised = components.buckets.filter(
      (b) => b.value !== 'dont_know' && !b.value.startsWith('__unexpected__'),
    )
    const ranked = [...recognised].sort((a, b) => b.count - a.count).slice(0, 3)
    findings.push({
      id: 'f-environmental-components',
      kind: 'measured',
      title: 'Environmental components recognised as affected',
      body: `Components most often selected as affected by improper disposal: ${ranked.map((b) => `${b.label} (${b.percentage}%)`).join('; ')}.`,
      basis: `Q20 (multiple selection; percentages over ${components.validN} respondents who answered this item)`,
    })
  }

  if (awareness.validN > 0 && awareness.mean !== null) {
    findings.push({
      id: 'f-awareness-mean',
      kind: 'measured',
      title: 'Composite awareness score (descriptive)',
      body: `Mean awareness score across the five knowledge items was ${awareness.mean}/100 over ${awareness.validN} respondents. This composite is descriptive only and is not a validated scale.`,
      basis: `Pre-defined rule applied to Q3, Q4, Q5, Q9, Q11`,
    })
  }

  if (departments.validN >= MIN_GROUP_N) {
    findings.push({
      id: 'f-dept-coverage',
      kind: 'measured',
      title: 'Departmental coverage',
      body: `Responses span ${departments.buckets.filter((b) => b.count > 0).length} departments/schools; the largest share is ${topBucket(departments)?.label ?? '—'} (${topBucket(departments)?.percentage ?? 0}%).`,
      basis: `Q2 · ${nText}`,
    })
  }

  findings.push({
    id: 'p-campaign',
    kind: 'proposed',
    title: 'Proposed: structured awareness programme',
    body: 'If awareness gaps persist in the measured data, a short orientation module on identifying e-waste and data-safe decommissioning can be added to induction weeks. (Proposed intervention — not a measured result.)',
    basis: null,
  })
  findings.push({
    id: 'p-collection-points',
    kind: 'proposed',
    title: 'Proposed: visible campus collection points',
    body: 'Clearly signed collection bins in hostels, departments, and the library, emptied on a published schedule by an authorized recycler. (Proposed intervention — not a measured result.)',
    basis: null,
  })
  findings.push({
    id: 'p-partnership',
    kind: 'proposed',
    title: 'Proposed: authorized recycler partnership',
    body: 'A memorandum with a CPCB-authorized recycler for periodic campus drives and take-back of damaged devices. (Proposed intervention — not a measured result.)',
    basis: null,
  })
  findings.push({
    id: 'p-donation',
    kind: 'proposed',
    title: 'Proposed: working-device donation channel',
    body: 'A "rehome, don\'t discard" channel for functional old devices to juniors, labs, or community schools. (Proposed intervention — not a measured result.)',
    basis: null,
  })

  return findings
}

function buildKpis(
  responses: SurveyResponse[],
  awareness: AwarenessScore,
  meta: SummaryMeta,
): KpiCardData[] {
  const willingness = buildDistribution(responses, 'q12')
  const willing = (bucketOf(willingness, 'definitely')?.count ?? 0) + (bucketOf(willingness, 'probably')?.count ?? 0)
  const disposal = buildDistribution(responses, 'q8')
  const responsible = (bucketOf(disposal, 'authorized_recycler')?.count ?? 0) + (bucketOf(disposal, 'campus_bin')?.count ?? 0)
  const facility = buildDistribution(responses, 'q11')
  const notAware = bucketOf(facility, 'no')?.count ?? 0

  const countOf = (category: RespondentCategory) =>
    responses.filter((r) => r.answers.q1 === category).length
  const students = countOf('student')
  const teaching = countOf('teaching_staff')
  const nonTeaching = countOf('non_teaching_staff')
  const n = responses.length
  const target = RESPONSE_TARGETS
  const roleShare = (count: number) => (n > 0 ? `${pct(count, n)}%` : '—')
  const roleDetail = (count: number, roleTarget: number) =>
    n > 0 ? `${count} of ${roleTarget} target · ${roleShare(count)}` : `target ${roleTarget}`

  return [
    {
      id: 'kpi-responses',
      label: 'Total valid responses',
      value: String(meta.validResponses),
      detail: `${meta.invalidResponses} invalid excluded of ${meta.totalRows} rows`,
    },
    {
      id: 'kpi-target-progress',
      label: 'Overall target completion',
      value: `${pct(meta.validResponses, target.total)}%`,
      detail: `${meta.validResponses} of ${target.total} target responses`,
    },
    {
      id: 'kpi-students',
      label: 'Student responses',
      value: String(students),
      detail: roleDetail(students, target.byCategory.student),
    },
    {
      id: 'kpi-teaching',
      label: 'Teaching staff responses',
      value: String(teaching),
      detail: roleDetail(teaching, target.byCategory.teaching_staff),
    },
    {
      id: 'kpi-nonteaching',
      label: 'Non-teaching staff responses',
      value: String(nonTeaching),
      detail: roleDetail(nonTeaching, target.byCategory.non_teaching_staff),
    },
    {
      id: 'kpi-role-distribution',
      label: 'Response distribution by role',
      value: n > 0 ? `${roleShare(students)} / ${roleShare(teaching)} / ${roleShare(nonTeaching)}` : '—',
      detail: n > 0 ? 'Student · Teaching · Non-teaching' : 'No valid responses yet',
    },
    {
      id: 'kpi-awareness',
      label: 'Mean awareness score',
      value: awareness.mean === null ? '—' : `${awareness.mean}/100`,
      detail: `n = ${awareness.validN} · descriptive composite`,
    },
    {
      id: 'kpi-willingness',
      label: 'Willing to use campus facility',
      value: willingness.validN > 0 ? `${pct(willing, willingness.validN)}%` : '—',
      detail: willingness.validN > 0 ? `n = ${willingness.validN} valid` : 'No valid responses yet',
    },
    {
      id: 'kpi-responsible',
      label: 'Uses responsible disposal channels',
      value: disposal.validN > 0 ? `${pct(responsible, disposal.validN)}%` : '—',
      detail: disposal.validN > 0 ? `n = ${disposal.validN} valid` : 'No valid responses yet',
    },
    {
      id: 'kpi-facility-gap',
      label: 'Unaware of campus facility',
      value: facility.validN > 0 ? `${pct(notAware, facility.validN)}%` : '—',
      detail: facility.validN > 0 ? `n = ${facility.validN} valid` : 'No valid responses yet',
    },
  ]
}

export function buildSummary(rows: RawRow[], query: SummaryQuery, meta: SummaryMetaBase): Summary {
  const { responses: normalized, headerWarnings } = normalizeRows(rows)
  const { unique, duplicatesRemoved } = dedupe(normalized)

  const category = query.category ?? null
  const department = query.department ?? null
  const since = query.since ?? null

  let working = unique
  if (category) {
    working = working.filter((r) => r.answers.q1 === category)
  }
  if (department) {
    working = working.filter((r) => r.answers.q2 === department)
  }
  if (since) {
    const sinceMs = Date.parse(since)
    if (!Number.isNaN(sinceMs)) {
      working = working.filter((r) => r.timestamp && Date.parse(r.timestamp) >= sinceMs)
    }
  }

  const valid = working.filter((r) => r.valid)
  const invalidResponses = working.length - valid.length

  const filtered = category !== null || department !== null || since !== null
  const suppressed = filtered && (category !== null || department !== null) && valid.length < MIN_GROUP_N

  const fullMeta: SummaryMeta = {
    ...meta,
    totalRows: rows.length,
    validResponses: suppressed ? 0 : valid.length,
    invalidResponses: suppressed ? 0 : invalidResponses,
    filters: {
      category,
      department,
      since,
    },
    suppressed,
    suppressionReason: suppressed
      ? `Fewer than ${MIN_GROUP_N} responses match this filter — statistics withheld to protect respondent privacy.`
      : null,
    datasetVersion: `v1 · ${rows.length} rows · ${duplicatesRemoved} duplicate(s) removed${headerWarnings.length > 0 ? ` · ${headerWarnings.length} header warning(s)` : ''}`,
  }

  if (suppressed || valid.length === 0) {
    const emptyDist = (questionId: QuestionId): Distribution => ({
      questionId,
      label: QUESTIONS.find((q) => q.id === questionId)?.prompt ?? questionId,
      type: QUESTIONS.find((q) => q.id === questionId)?.type ?? 'single',
      buckets: [],
      validN: 0,
      missingN: 0,
      unexpectedN: 0,
    })
    return {
      meta: fullMeta,
      kpis: [],
      respondentCategory: emptyDist('q1'),
      departments: emptyDist('q2'),
      distributions: Object.fromEntries(QUESTIONS.map((q) => [q.id, emptyDist(q.id)])) as Record<QuestionId, Distribution>,
      awarenessScore: {
        min: 0,
        max: 100,
        mean: null,
        distribution: [],
        validN: 0,
        missingN: 0,
        ruleDescription: AWARENESS_SCORE_RULE,
        scoreByCategory: [],
      },
      comparisons: [],
      findings: [],
    }
  }

  const distributions = Object.fromEntries(
    QUESTIONS.map((q) => [q.id, buildDistribution(valid, q.id)]),
  ) as Record<QuestionId, Distribution>

  const awareness = buildAwarenessScore(valid)

  const students = valid.filter((r) => r.answers.q1 === 'student')
  const staff = valid.filter(
    (r) => r.answers.q1 === 'teaching_staff' || r.answers.q1 === 'non_teaching_staff',
  )

  const comparisons: ProportionComparison[] = [
    proportionComparison(
      'q3',
      'Familiar with e-waste term (≥ moderately) — students vs staff',
      'Students',
      students,
      'Staff',
      staff,
      ['moderately', 'very', 'extremely'],
    ),
    proportionComparison(
      'q5',
      'Aware of environmental/health impacts (≥ partially) — students vs staff',
      'Students',
      students,
      'Staff',
      staff,
      ['fully_aware', 'partially_aware'],
    ),
    proportionComparison(
      'q11',
      'Aware of a campus collection facility — students vs staff',
      'Students',
      students,
      'Staff',
      staff,
      ['yes_and_know', 'heard_but_unknown'],
    ),
    proportionComparison(
      'q12',
      'Willing to use a campus facility (definitely/probably) — students vs staff',
      'Students',
      students,
      'Staff',
      staff,
      ['definitely', 'probably'],
    ),
    proportionComparison(
      'q8',
      'Disposes responsibly (recycler/campus bin) — students vs staff',
      'Students',
      students,
      'Staff',
      staff,
      ['authorized_recycler', 'campus_bin'],
    ),
  ]

  const findings = buildFindings(valid, awareness, distributions.q2)

  return {
    meta: fullMeta,
    kpis: buildKpis(valid, awareness, fullMeta),
    respondentCategory: distributions.q1,
    departments: distributions.q2,
    distributions,
    awarenessScore: awareness,
    comparisons,
    findings,
  }
}

export function buildDemoSummary(query: SummaryQuery): Summary {
  const rows = generateDemoRows()
  const summary = buildSummary(rows, query, {
    generatedAt: new Date().toISOString(),
    source: 'Demonstration dataset (synthetic — NOT real survey responses)',
    sourceConfigured: true,
    lastRefresh: new Date().toISOString(),
    hasTimestamps: true,
    isDemo: true,
    datasetDate: null,
  })
  summary.meta.totalRows = rows.length
  return summary
}

function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function generateDemoRows(count = 120): RawRow[] {
  const rand = mulberry32(42)
  const pick = <T>(items: T[], weights?: number[]): T => {
    if (!weights) return items[Math.floor(rand() * items.length)]
    const total = weights.reduce((a, b) => a + b, 0)
    let r = rand() * total
    for (let i = 0; i < items.length; i += 1) {
      r -= weights[i]
      if (r <= 0) return items[i]
    }
    return items[items.length - 1]
  }

  const departments = ['CSE', 'ISE', 'ECE', 'EEE', 'ME', 'CV', 'MA', 'MBA', 'OTHER']
  const rows: RawRow[] = []
  const now = Date.now()
  for (let i = 0; i < count; i += 1) {
    const q13List = [
      pick(['lack_of_awareness', 'inconvenient', 'facility_access', 'data_privacy', 'no_incentive', 'dont_know_how', 'cost', 'other'], [0.2, 0.22, 0.18, 0.16, 0.08, 0.08, 0.05, 0.03]),
    ]
    if (rand() > 0.4) q13List.push(pick(['lack_of_awareness', 'inconvenient', 'facility_access', 'data_privacy', 'no_incentive', 'dont_know_how', 'cost', 'other']))
    rows.push({
      Timestamp: new Date(now - Math.floor(rand() * 14 * 24 * 60 * 60 * 1000)).toISOString(),
      'Respondent Category': pick(['Student', 'Teaching Staff', 'Non-Teaching Staff'], [0.7, 0.17, 0.13]),
      'Department or School': pick(departments.map((d) => d.toUpperCase())),
      'Familiarity with E-Waste Term': pick(['Not at all familiar', 'Slightly familiar', 'Moderately familiar', 'Very familiar', 'Extremely familiar'], [0.08, 0.17, 0.3, 0.28, 0.17]),
      'Ability to Identify E-Waste Items': pick(['Yes, I can identify most of them', 'Yes, but only some of them', 'I am not sure what counts as e-waste', 'No, I cannot identify them'], [0.35, 0.45, 0.13, 0.07]),
      'Awareness of Environmental and Health Impacts': pick(['Fully aware', 'Partially aware', 'I have heard of it but know little', 'Not aware at all'], [0.22, 0.44, 0.24, 0.1]),
      'Previous E-Waste Awareness Training': pick(['Yes', 'No', 'I do not remember'], [0.25, 0.68, 0.07]),
      'Device Replacement Frequency': pick(['Every year or more often', 'Every 2–3 years', 'Every 4–5 years', 'Rarely (more than 5 years)', 'I have never discarded one'], [0.14, 0.38, 0.28, 0.16, 0.04]),
      'Typical Disposal Method': pick(['Give to an authorized recycler', 'Deposit at a campus e-waste collection point', 'Sell or give to a local scrap dealer', 'Store at home (unused)', 'Mix with household garbage', 'Return to manufacturer / exchange offer', 'Other'], [0.08, 0.07, 0.28, 0.3, 0.12, 0.1, 0.05]),
      'Use of Authorized Recycling Facility': pick(['Yes', 'No', 'No — I am not aware of any'], [0.18, 0.5, 0.32]),
      'Knowledge of Responsible Disposal Locations': pick(['Yes, near campus', 'Yes, elsewhere in the city', 'No', 'Not sure'], [0.16, 0.3, 0.34, 0.2]),
      'Awareness of Campus Collection Facilities': pick(['Yes, and I know where it is', 'I have heard of one but do not know where', 'No, I am not aware of any'], [0.24, 0.3, 0.46]),
      'Willingness to Use Campus Facility': pick(['Definitely', 'Probably', 'Not sure', 'Probably not', 'Definitely not'], [0.42, 0.36, 0.13, 0.06, 0.03]),
      'Barriers to Responsible Disposal': q13List
        .map((v) => ({
          lack_of_awareness: 'Lack of awareness',
          inconvenient: 'No convenient collection point',
          facility_access: 'Facility too far / hard to reach',
          data_privacy: 'Concern about personal data on devices',
          no_incentive: 'No incentive or compensation',
          dont_know_how: 'Do not know how to prepare devices',
          cost: 'Cost of responsible disposal',
          other: 'Other',
          no_barriers: 'No barriers',
        })[v])
        .join(', '),
      'Perceived Usefulness of Awareness Campaigns': pick(['Very useful', 'Somewhat useful', 'Neutral', 'Not very useful', 'Not useful at all'], [0.38, 0.36, 0.16, 0.07, 0.03]),
      'Improvement Measures': (() => {
        const picks = ['Collection drives', 'Permanent collection bins', 'Awareness campaigns', 'Partnerships with authorized recyclers', 'Device donation programmes', 'Other']
        const selected = [picks[Math.floor(rand() * 4)]]
        if (rand() > 0.45) {
          const second = picks[Math.floor(rand() * picks.length)]
          if (!selected.includes(second)) selected.push(second)
        }
        return selected.join(', ')
      })(),
      'Incineration Risk Awareness': pick(['Release of toxic fumes and pollutants', 'Complete removal of all hazardous substances', 'No environmental impact', "I don't know"], [0.68, 0.06, 0.06, 0.2]),
      'Landfill Contamination': pick(['Hazardous substances may contaminate soil and groundwater', 'It always improves soil quality', 'It has no possible environmental impact', "I don't know"], [0.72, 0.05, 0.05, 0.18]),
      'Health Effects of E-Waste Exposure': (() => {
        const effects = ['Respiratory problems', 'Nervous system damage', 'Kidney or liver damage', 'Skin irritation']
        const selected: string[] = []
        if (rand() < 0.8) selected.push(pick(effects))
        if (rand() < 0.45) {
          const second = pick(effects)
          if (!selected.includes(second)) selected.push(second)
        }
        if (rand() < 0.12) selected.push('None of these')
        return selected.length > 0 ? selected.join(', ') : pick(effects)
      })(),
      'Hazardous Pollutants': (() => {
        const subs = ['Lead', 'Mercury', 'Cadmium', 'Dioxins and furans from certain uncontrolled burning processes']
        const selected = [pick(subs, [0.34, 0.28, 0.18, 0.2])]
        if (rand() < 0.5) {
          const second = pick(subs)
          if (!selected.includes(second)) selected.push(second)
        }
        return selected.join(', ')
      })(),
      'Environmental Components Affected': (() => {
        const comps = ['Air', 'Soil', 'Surface water and groundwater', 'Plants and wildlife']
        const selected = [pick(comps, [0.27, 0.24, 0.28, 0.21])]
        if (rand() < 0.6) {
          const second = pick(comps)
          if (!selected.includes(second)) selected.push(second)
        }
        return selected.join(', ')
      })(),
    })
  }
  return rows
}
