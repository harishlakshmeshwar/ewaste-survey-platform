export type RespondentCategory = 'student' | 'teaching_staff' | 'non_teaching_staff'

export type QuestionId =
  | 'q1'
  | 'q2'
  | 'q3'
  | 'q4'
  | 'q5'
  | 'q6'
  | 'q7'
  | 'q8'
  | 'q9'
  | 'q10'
  | 'q11'
  | 'q12'
  | 'q13'
  | 'q14'
  | 'q15'
  | 'q16'
  | 'q17'
  | 'q18'
  | 'q19'
  | 'q20'

export type AnswerValue = string | string[] | null

export interface SurveyResponse {
  id: string
  timestamp: string | null
  answers: Partial<Record<QuestionId, AnswerValue>>
  originalAnswers: Partial<Record<QuestionId, string>>
  valid: boolean
  invalidReasons: string[]
  unexpectedValues: { questionId: QuestionId; value: string }[]
}

export interface DistributionBucket {
  value: string
  label: string
  count: number
  percentage: number
}

export interface Distribution {
  questionId: QuestionId
  label: string
  type: 'single' | 'multi' | 'text'
  buckets: DistributionBucket[]
  validN: number
  missingN: number
  unexpectedN: number
  /** Free-text answers are summarised as counts only; text is never returned. */
  textResponseCount?: number
}

export interface AwarenessScore {
  min: number
  max: number
  mean: number | null
  distribution: DistributionBucket[]
  validN: number
  missingN: number
  ruleDescription: string
  scoreByCategory: { category: RespondentCategory; n: number; mean: number }[]
}

export interface ProportionComparison {
  key: string
  label: string
  groupA: { label: string; n: number; count: number; proportion: number; ciLow: number; ciHigh: number }
  groupB: { label: string; n: number; count: number; proportion: number; ciLow: number; ciHigh: number }
  difference: number
  zStatistic: number | null
  pValue: number | null
  note: string | null
}

export interface SummaryMeta {
  generatedAt: string
  source: string
  sourceConfigured: boolean
  lastRefresh: string | null
  totalRows: number
  validResponses: number
  invalidResponses: number
  hasTimestamps: boolean
  filters: { category: RespondentCategory | null; department: string | null; since: string | null }
  isDemo: boolean
  suppressed: boolean
  suppressionReason: string | null
  datasetDate: string | null
  datasetVersion: string
}

export interface KpiCardData {
  id: string
  label: string
  value: string
  detail: string
}

export interface FindingItem {
  id: string
  kind: 'measured' | 'proposed'
  title: string
  body: string
  basis: string | null
}

export interface Summary {
  meta: SummaryMeta
  kpis: KpiCardData[]
  respondentCategory: Distribution
  departments: Distribution
  distributions: Record<QuestionId, Distribution>
  awarenessScore: AwarenessScore
  comparisons: ProportionComparison[]
  findings: FindingItem[]
}

export interface PublicConfig {
  surveyUrl: string | null
  surveyEmbedUrl: string | null
  dataSourceKind: string
  dataSourceConfigured: boolean
  projectTitle: string
}

export interface HealthStatus {
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

export interface SummaryQuery {
  category?: RespondentCategory | null
  department?: string | null
  since?: string | null
}

/** Fields a caller supplies; buildSummary derives counts, filters, and suppression itself. */
export interface SummaryMetaBase {
  generatedAt: string
  source: string
  sourceConfigured: boolean
  lastRefresh: string | null
  hasTimestamps: boolean
  isDemo: boolean
  datasetDate: string | null
}
