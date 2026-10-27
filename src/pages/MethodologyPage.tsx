import { PageHeader, Card, Notice } from '../components/ui'
import { AWARENESS_SCORE_RULE, QUESTIONS } from '../lib/schema'

const SECTIONS = [
  {
    id: 'questions',
    title: 'Research questions and objectives',
    body: [
      'RQ1 — How familiar are students and staff with the term e-waste, and how well can they identify common e-waste items?',
      'RQ2 — How aware are respondents of the environmental and health impacts of improper e-waste disposal?',
      'RQ3 — What disposal routes do people actually use for unused or damaged electronics, and how often are devices replaced?',
      'RQ4 — What barriers prevent responsible disposal (awareness, convenience, facility access, data privacy)?',
      'RQ5 — Is there demand for a campus e-waste collection facility and for awareness campaigns?',
    ],
  },
  {
    id: 'setting',
    title: 'Study setting and respondent groups',
    body: [
      'Setting: MSRIT campus (single-institution study).',
      'Respondent groups: students, teaching staff, and non-teaching staff, analysed both combined and separately as students vs staff.',
      'Department or school is collected as an optional demographic item with an "Other" option.',
    ],
  },
  {
    id: 'sampling',
    title: 'Sampling method and limitations',
    body: [
      'Method: convenience / voluntary response sampling — the survey link is circulated through campus channels and anyone in an eligible group may respond.',
      'No probability sampling frame was used, so representativeness of the whole campus population is NOT claimed.',
      'Limitations of this approach: coverage bias toward reachable/online respondents, self-selection bias, and unquantifiable non-response bias.',
      'Planned target sample: 90 genuine responses in total — 30 students, 30 teaching staff, and 30 non-teaching staff.',
      'The planned target is reported separately from the achieved sample; every published figure states its actual achieved denominator.',
      'Target: report achieved sample sizes for every published figure rather than claiming population estimates.',
    ],
  },
  {
    id: 'questionnaire',
    title: 'Questionnaire sections',
    body: [
      'Section 1 — Participant Details (Q1–Q2): role at MSRIT and optional department or school.',
      'Section 2 — Awareness & Knowledge (Q3–Q6): familiarity with e-waste, item identification, impact awareness, prior training.',
      'Section 3 — Disposal Practices (Q7–Q12): replacement frequency, disposal route, authorized-facility use, location knowledge, campus facility awareness, willingness.',
      'Section 4 — Attitudes & Barriers (Q13–Q15): barriers to responsible disposal, campaign usefulness, improvement measures.',
      'Section 5 — Environmental & Health Impacts (Q16–Q20): incineration risks, landfill contamination, health effects, hazardous pollutants, affected environmental components.',
      'The live instrument is a 20-item Google Form; exact wording and options are documented in docs/SURVEY-SETUP.md.',
    ],
  },
  {
    id: 'instrument',
    title: 'Survey instrument and collection procedure',
    body: [
      `Instrument: a ${QUESTIONS.length}-item Google Form in five sections (see docs/SURVEY-SETUP.md for the full specification).`,
      'Opens with a research-purpose and voluntary-participation statement; participation may be stopped at any time.',
      'No names, roll numbers, or contact details are requested; department (Q2) and improvement measures (Q15) are optional items.',
      'Responses flow automatically into a linked Google Sheet (response sheet schema documented in docs/SURVEY-SETUP.md).',
      'Estimated completion time: 4–6 minutes.',
    ],
  },
  {
    id: 'cleaning',
    title: 'Data cleaning and validation',
    body: [
      'Rows are validated on ingestion: required-item completeness, recognisable answer categories, timestamp parseability.',
      'Invalid rows (missing required answers or unrecognised categories) are excluded from analysis and their count is reported — they are never silently coerced.',
      'Exact-duplicate rows (identical timestamp and answers) are removed and reported.',
      'Original responses are preserved; normalisation only maps case/wording variants onto canonical category labels.',
      'If the source contains an email or name column it is ignored and never returned by the API.',
    ],
  },
  {
    id: 'statistics',
    title: 'Statistical methods',
    body: [
      'Descriptive statistics only: counts, percentages, and means on valid responses per question.',
      'Every percentage reports its denominator (valid n) and missing count; missing answers are never treated as "No".',
      'Student-vs-staff comparisons use Wilson 95% confidence intervals and an exploratory two-proportion z-test; comparisons with fewer than 5 responses per group are suppressed.',
      `Awareness score (optional, pre-specified): ${AWARENESS_SCORE_RULE}`,
      'No causal inference is attempted; the design is cross-sectional.',
      'Small filtered groups (fewer than 5 valid responses) are withheld entirely to protect respondent privacy.',
    ],
  },
  {
    id: 'privacy',
    title: 'Privacy and consent',
    body: [
      'Consent is implicit-voluntary: the form states purpose and voluntary participation before any question; respondents may abandon the form at any point.',
      'Data minimisation: no names, no contact details, no sensitive attributes.',
      'Public outputs are aggregates only; individual rows never leave the server, and free-text suggestions are not published.',
      'Access to raw data is restricted to the survey owner through the linked Google Sheet.',
    ],
  },
  {
    id: 'limitations',
    title: 'Limitations and potential response bias',
    body: [
      'Convenience sampling — findings generalise only to respondents, not the entire campus.',
      'Self-reported behaviour is subject to recall error and social-desirability bias (e.g., over-reporting of responsible disposal).',
      'Single point in time — no longitudinal change can be inferred.',
      'Unequal group sizes (students typically dominate) can make staff subgroups imprecise; sample sizes are always shown.',
      'The awareness composite is descriptive, equal-weighted, and unvalidated — it is not a psychometric scale.',
      'Department-level results are only shown where group sizes permit safe reporting.',
    ],
  },
]

export function MethodologyPage() {
  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Methodology"
        subtitle="Research design, instrument, data handling, statistics, and limitations — documented so every published figure can be traced back to a defined procedure."
      />

      <Notice tone="info" title="Cross-sectional, voluntary, anonymous">
        This is a descriptive campus survey. Nothing on this platform supports causal claims, and no
        representativeness is claimed without a probability sampling method.
      </Notice>

      <nav aria-label="Methodology sections" className="flex flex-wrap gap-2">
        {SECTIONS.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="rounded-full border border-brand-200 bg-white px-3 py-1 text-xs font-medium text-brand-800 hover:bg-brand-50"
          >
            {s.title}
          </a>
        ))}
      </nav>

      {SECTIONS.map((section) => (
        <section key={section.id} id={section.id} className="scroll-mt-24">
          <Card>
            <h2 className="text-base font-semibold text-brand-900">{section.title}</h2>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-700">
              {section.body.map((line) => (
                <li key={line} className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" aria-hidden />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      ))}

      <section id="instrument-detail">
        <Card>
          <h2 className="text-base font-semibold text-brand-900">Instrument — question inventory</h2>
          <p className="mt-1 text-sm text-slate-600">
            The full question list with answer options lives in the survey specification.
          </p>
          <ol className="mt-3 grid gap-1.5 text-sm text-slate-700 sm:grid-cols-2">
            {QUESTIONS.map((q) => (
              <li key={q.id} className="rounded-lg bg-slate-50 px-3 py-2">
                <span className="font-semibold text-brand-800">{q.id.toUpperCase()}</span> — {q.prompt}
                {q.required ? null : <span className="text-slate-400"> (optional)</span>}
              </li>
            ))}
          </ol>
        </Card>
      </section>
    </div>
  )
}
