import type { QuestionId, RespondentCategory } from './types'

export interface OptionDef {
  value: string
  label: string
}

export interface QuestionDef {
  id: QuestionId
  column: string
  prompt: string
  type: 'single' | 'multi' | 'text'
  required: boolean
  options: OptionDef[]
}

export interface QuestionSection {
  id: string
  title: string
  questionIds: QuestionId[]
}

export const RESPONDENT_CATEGORIES: Record<RespondentCategory, string> = {
  student: 'Student',
  teaching_staff: 'Teaching Staff',
  non_teaching_staff: 'Non-Teaching Staff',
}

/** Faculty's response-collection targets for the campus study. */
export const RESPONSE_TARGETS = {
  total: 90,
  byCategory: {
    student: 30,
    teaching_staff: 30,
    non_teaching_staff: 30,
  },
} as const

export const DEPARTMENT_OPTIONS: OptionDef[] = [
  { value: 'cse', label: 'Computer Science & Engineering' },
  { value: 'ise', label: 'Information Science & Engineering' },
  { value: 'ece', label: 'Electronics & Communication Engineering' },
  { value: 'eee', label: 'Electrical & Electronics Engineering' },
  { value: 'me', label: 'Mechanical Engineering' },
  { value: 'cv', label: 'Civil Engineering' },
  { value: 'ma', label: 'Mathematics / Sciences' },
  { value: 'mba', label: 'Management Studies' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
]

/**
 * The live Google Form questionnaire (20 items, parsed from the published form).
 * `prompt` mirrors the exact form question text; `column` is a short stable
 * display/column name. Response-sheet headers match either the exact question
 * text (with or without its leading number) or the short column name.
 */
export const QUESTIONS: QuestionDef[] = [
  {
    id: 'q1',
    column: 'Respondent Category',
    prompt: '1. What is your role at MSRIT?',
    type: 'single',
    required: true,
    options: [
      { value: 'student', label: 'Student' },
      { value: 'teaching_staff', label: 'Teaching staff' },
      { value: 'non_teaching_staff', label: 'Non-teaching staff' },
    ],
  },
  {
    id: 'q2',
    column: 'Department or School',
    prompt: '2. Which department or school do you belong to? (Optional)',
    type: 'single',
    required: false,
    options: DEPARTMENT_OPTIONS,
  },
  {
    id: 'q3',
    column: 'Familiarity with E-Waste Term',
    prompt: '3. How familiar are you with the term e-waste (electronic waste)?',
    type: 'single',
    required: true,
    options: [
      { value: 'not_at_all', label: 'Not at all familiar' },
      { value: 'slightly', label: 'Slightly familiar' },
      { value: 'moderately', label: 'Moderately familiar' },
      { value: 'very', label: 'Very familiar' },
      { value: 'extremely', label: 'Extremely familiar' },
    ],
  },
  {
    id: 'q4',
    column: 'Ability to Identify E-Waste Items',
    prompt: '4. Can you identify common e-waste items, such as old phones, chargers, batteries, cables and computers?',
    type: 'single',
    required: true,
    options: [
      { value: 'yes_confidently', label: 'Yes, I can identify most of them' },
      { value: 'yes_some', label: 'Yes, but only some of them' },
      { value: 'unsure', label: 'I am not sure what counts as e-waste' },
      { value: 'no', label: 'No, I cannot identify them' },
    ],
  },
  {
    id: 'q5',
    column: 'Awareness of Environmental and Health Impacts',
    prompt: '5. How aware are you of the environmental and health impacts of improper e-waste disposal?',
    type: 'single',
    required: true,
    options: [
      { value: 'fully_aware', label: 'Fully aware' },
      { value: 'partially_aware', label: 'Partially aware' },
      { value: 'heard_only', label: 'I have heard of it but know little' },
      { value: 'not_aware', label: 'Not aware at all' },
    ],
  },
  {
    id: 'q6',
    column: 'Previous E-Waste Awareness Training',
    prompt: '6. Have you attended any e-waste or environmental-awareness training/programme?',
    type: 'single',
    required: true,
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
      { value: 'dont_remember', label: 'I do not remember' },
    ],
  },
  {
    id: 'q7',
    column: 'Device Replacement Frequency',
    prompt: '7. How often do you replace or discard an electronic device?',
    type: 'single',
    required: true,
    options: [
      { value: 'every_year', label: 'Every year or more often' },
      { value: 'two_three_years', label: 'Every 2–3 years' },
      { value: 'four_five_years', label: 'Every 4–5 years' },
      { value: 'rarely', label: 'Rarely (more than 5 years)' },
      { value: 'never_discarded', label: 'I have never discarded one' },
    ],
  },
  {
    id: 'q8',
    column: 'Typical Disposal Method',
    prompt: '8. What do you typically do with unused or damaged electronics?',
    type: 'single',
    required: true,
    options: [
      { value: 'authorized_recycler', label: 'Give to an authorized recycler' },
      { value: 'campus_bin', label: 'Deposit at a campus e-waste collection point' },
      { value: 'informal_dealer', label: 'Sell or give to a local scrap dealer' },
      { value: 'store_at_home', label: 'Store at home (unused)' },
      { value: 'household_garbage', label: 'Mix with household garbage' },
      { value: 'manufacturer', label: 'Return to manufacturer / exchange offer' },
      { value: 'other', label: 'Other' },
    ],
  },
  {
    id: 'q9',
    column: 'Use of Authorized Recycling Facility',
    prompt: '9. Have you ever used an authorized e-waste recycling facility or take-back scheme?',
    type: 'single',
    required: true,
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
      { value: 'not_aware_of_any', label: 'No — I am not aware of any' },
    ],
  },
  {
    id: 'q10',
    column: 'Knowledge of Responsible Disposal Locations',
    prompt: '10. Do you know of a responsible e-waste disposal location near campus?',
    type: 'single',
    required: true,
    options: [
      { value: 'yes_near_campus', label: 'Yes, near campus' },
      { value: 'yes_in_city', label: 'Yes, elsewhere in the city' },
      { value: 'no', label: 'No' },
      { value: 'not_sure', label: 'Not sure' },
    ],
  },
  {
    id: 'q11',
    column: 'Awareness of Campus Collection Facilities',
    prompt: '11. Are you aware of any e-waste collection facility on campus?',
    type: 'single',
    required: true,
    options: [
      { value: 'yes_and_know', label: 'Yes, and I know where it is' },
      { value: 'heard_but_unknown', label: 'I have heard of one but do not know where' },
      { value: 'no', label: 'No, I am not aware of any' },
    ],
  },
  {
    id: 'q12',
    column: 'Willingness to Use Campus Facility',
    prompt: '12. Would you use a designated e-waste collection facility on campus if one were available and convenient?',
    type: 'single',
    required: true,
    options: [
      { value: 'definitely', label: 'Definitely' },
      { value: 'probably', label: 'Probably' },
      { value: 'not_sure', label: 'Not sure' },
      { value: 'probably_not', label: 'Probably not' },
      { value: 'definitely_not', label: 'Definitely not' },
    ],
  },
  {
    id: 'q13',
    column: 'Barriers to Responsible Disposal',
    prompt: '13. What prevents you from disposing of e-waste responsibly? (Select all that apply)',
    type: 'multi',
    required: true,
    options: [
      { value: 'lack_of_awareness', label: 'Lack of awareness' },
      { value: 'inconvenient', label: 'No convenient collection point' },
      { value: 'facility_access', label: 'Facility too far / hard to reach' },
      { value: 'data_privacy', label: 'Concern about personal data on devices' },
      { value: 'no_incentive', label: 'No incentive or compensation' },
      { value: 'dont_know_how', label: 'Do not know how to prepare devices' },
      { value: 'cost', label: 'Cost of responsible disposal' },
      { value: 'no_barriers', label: 'No barriers' },
      { value: 'other', label: 'Other' },
    ],
  },
  {
    id: 'q14',
    column: 'Perceived Usefulness of Awareness Campaigns',
    prompt: '14. How useful would campus e-waste awareness campaigns be for you?',
    type: 'single',
    required: true,
    options: [
      { value: 'very_useful', label: 'Very useful' },
      { value: 'somewhat_useful', label: 'Somewhat useful' },
      { value: 'neutral', label: 'Neutral' },
      { value: 'not_very_useful', label: 'Not very useful' },
      { value: 'not_at_all', label: 'Not useful at all' },
    ],
  },
  {
    id: 'q15',
    column: 'Improvement Measures',
    prompt: '15. What would improve e-waste management on campus? (Select all that apply)',
    type: 'multi',
    required: false,
    options: [
      { value: 'collection_drives', label: 'Collection drives' },
      { value: 'permanent_bins', label: 'Permanent collection bins' },
      { value: 'awareness_campaigns', label: 'Awareness campaigns' },
      { value: 'recycler_partnerships', label: 'Partnerships with authorized recyclers' },
      { value: 'donation_programmes', label: 'Device donation programmes' },
      { value: 'other', label: 'Other' },
    ],
  },
  {
    id: 'q16',
    column: 'Incineration Risk Awareness',
    prompt: '16. What can happen when e-waste is burned or incinerated under uncontrolled conditions?',
    type: 'single',
    required: true,
    options: [
      { value: 'toxic_fumes', label: 'Release of toxic fumes and pollutants' },
      { value: 'removes_all', label: 'Complete removal of all hazardous substances' },
      { value: 'no_impact', label: 'No environmental impact' },
      { value: 'dont_know', label: "I don't know" },
    ],
  },
  {
    id: 'q17',
    column: 'Landfill Contamination',
    prompt: '17. How can improper disposal of e-waste in landfills affect the environment?',
    type: 'single',
    required: true,
    options: [
      { value: 'contaminates', label: 'Hazardous substances may contaminate soil and groundwater' },
      { value: 'improves', label: 'It always improves soil quality' },
      { value: 'no_impact', label: 'It has no possible environmental impact' },
      { value: 'dont_know', label: "I don't know" },
    ],
  },
  {
    id: 'q18',
    column: 'Health Effects of E-Waste Exposure',
    prompt:
      '18. Which health effects may be associated with exposure to hazardous substances from improperly managed e-waste? (Select all that apply)',
    type: 'multi',
    required: true,
    options: [
      { value: 'respiratory', label: 'Respiratory problems' },
      { value: 'nervous', label: 'Nervous system damage' },
      { value: 'kidney_liver', label: 'Kidney or liver damage' },
      { value: 'skin', label: 'Skin irritation' },
      { value: 'none_of_these', label: 'None of these' },
      { value: 'dont_know', label: "I don't know" },
    ],
  },
  {
    id: 'q19',
    column: 'Hazardous Pollutants',
    prompt:
      '19. Which hazardous pollutants or substances may be released during improper e-waste handling or recycling? (Select all that apply)',
    type: 'multi',
    required: true,
    options: [
      { value: 'lead', label: 'Lead' },
      { value: 'mercury', label: 'Mercury' },
      { value: 'cadmium', label: 'Cadmium' },
      { value: 'dioxins', label: 'Dioxins and furans from certain uncontrolled burning processes' },
      { value: 'none_of_these', label: 'None of these' },
      { value: 'dont_know', label: "I don't know" },
    ],
  },
  {
    id: 'q20',
    column: 'Environmental Components Affected',
    prompt: '20. Which environmental components can be affected by improper e-waste disposal? (Select all that apply)',
    type: 'multi',
    required: true,
    options: [
      { value: 'air', label: 'Air' },
      { value: 'soil', label: 'Soil' },
      { value: 'water', label: 'Surface water and groundwater' },
      { value: 'wildlife', label: 'Plants and wildlife' },
      { value: 'dont_know', label: "I don't know" },
    ],
  },
]

/** Logical grouping of the 20 items into the survey's five sections. */
export const SECTIONS: QuestionSection[] = [
  { id: 's1', title: 'Section 1 — Participant Details', questionIds: ['q1', 'q2'] },
  { id: 's2', title: 'Section 2 — Awareness & Knowledge', questionIds: ['q3', 'q4', 'q5', 'q6'] },
  { id: 's3', title: 'Section 3 — Disposal Practices', questionIds: ['q7', 'q8', 'q9', 'q10', 'q11', 'q12'] },
  { id: 's4', title: 'Section 4 — Attitudes & Barriers', questionIds: ['q13', 'q14', 'q15'] },
  { id: 's5', title: 'Section 5 — Environmental & Health Impacts', questionIds: ['q16', 'q17', 'q18', 'q19', 'q20'] },
]

export const QUESTION_MAP: Record<string, QuestionDef> = Object.fromEntries(
  QUESTIONS.map((q) => [q.id, q]),
)

/** Normalises a response-sheet header for alias matching. */
export function headerKey(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/^\d+\.\s*/, '')
    .replace(/\s+/g, ' ')
}

/** Every acceptable response-sheet header for a question (lower-case). */
export function headerAliases(question: QuestionDef): string[] {
  const unnumbered = question.prompt.replace(/^\d+\.\s*/, '')
  const keys = [question.column, question.prompt, unnumbered]
  const seen = new Set<string>()
  return keys.map((k) => headerKey(k)).filter((k) => (k && !seen.has(k) ? (seen.add(k), true) : false))
}

export const COLUMN_TO_QUESTION: Record<string, QuestionDef> = Object.fromEntries(
  QUESTIONS.flatMap((q) => headerAliases(q).map((alias) => [alias, q])),
)

export const TIMESTAMP_COLUMNS = ['timestamp', 'submit time', 'submitted at']

export const AWARENESS_SCORE_QUESTIONS: { id: QuestionId; correct: string[] }[] = [
  { id: 'q3', correct: ['moderately', 'very', 'extremely'] },
  { id: 'q4', correct: ['yes_confidently', 'yes_some'] },
  { id: 'q5', correct: ['fully_aware', 'partially_aware'] },
  { id: 'q9', correct: ['yes'] },
  { id: 'q11', correct: ['yes_and_know'] },
]

export const AWARENESS_SCORE_RULE =
  'Awareness score = (number of knowledge questions answered at the defined awareness level ÷ 5) × 100. ' +
  'Items: Q3 familiarity ≥ moderately; Q4 able to identify at least some items; Q5 at least partially aware of impacts; ' +
  'Q9 has used an authorized facility; Q11 aware of a campus collection facility. ' +
  'This is an ad-hoc composite for descriptive comparison only — it is NOT a validated psychometric scale, ' +
  'and each item is weighted equally regardless of difficulty.'

/** Correct/aware answer values for the environmental-knowledge items (Q16–Q17). */
export const ENV_KNOWLEDGE_ANSWERS: { id: QuestionId; correct: string[] }[] = [
  { id: 'q16', correct: ['toxic_fumes'] },
  { id: 'q17', correct: ['contaminates'] },
]

export function optionLabel(question: QuestionDef, value: string): string {
  return question.options.find((o) => o.value === value)?.label ?? value
}
