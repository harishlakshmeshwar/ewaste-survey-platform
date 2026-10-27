import { Link } from 'react-router-dom'
import { useOutletContext } from 'react-router-dom'
import { Badge, Card, Notice } from '../components/ui'
import type { LayoutContext } from '../types'

export function HomePage() {
  const { config } = useOutletContext<LayoutContext>()

  return (
    <div className="animate-fade-in space-y-10">
      <section className="rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50 via-white to-emerald-50 p-6 sm:p-10">
        <Badge tone="live">Cross-campus research survey</Badge>
        <h1 className="mt-4 max-w-3xl text-2xl font-semibold leading-tight tracking-tight text-brand-900 sm:text-4xl">
          Student and Staff Awareness, Practices and Attitudes towards E-Waste Disposal
        </h1>
        <p className="mt-2 text-base font-medium text-brand-700">A MSRIT Campus Survey</p>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
          This research platform collects voluntary, anonymous survey responses through Google
          Forms, stores them in a linked Google Sheet, and presents verified aggregate findings on
          awareness, disposal behaviour, barriers, and demand for better campus e-waste facilities.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/survey"
            className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
          >
            Take the survey
          </Link>
          <Link
            to="/dashboard"
            className="rounded-lg border border-brand-300 bg-white px-5 py-2.5 text-sm font-semibold text-brand-800 transition hover:bg-brand-50"
          >
            View aggregate results
          </Link>
        </div>
        {config && !config.surveyUrl ? (
          <div className="mt-5">
            <Notice tone="warning" title="Survey link not published yet">
              The Google Form URL has not been configured. Once the form is created and published,
              set <code className="rounded bg-white px-1">SURVEY_URL</code> on the server — the link
              will then appear on the Survey page automatically.
            </Notice>
          </div>
        ) : null}
      </section>

      <section aria-labelledby="objectives">
        <h2 id="objectives" className="text-lg font-semibold text-brand-900">
          Research objectives
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              title: 'Measure awareness',
              body: 'Quantify familiarity with the term e-waste and knowledge of environmental and health impacts across respondent groups.',
            },
            {
              title: 'Document actual practices',
              body: 'Record how unused or damaged electronics are really disposed of, and how often devices are replaced.',
            },
            {
              title: 'Locate the gaps',
              body: 'Identify awareness gaps around campus collection facilities and responsible disposal locations near campus.',
            },
            {
              title: 'Understand barriers',
              body: 'Surface the main obstacles — awareness, convenience, facility access, and data-privacy concerns — that block responsible disposal.',
            },
            {
              title: 'Test demand for solutions',
              body: 'Estimate willingness to use a campus collection facility and the perceived usefulness of awareness campaigns.',
            },
            {
              title: 'Recommend interventions',
              body: 'Translate measured results into evidence-based proposals: collection bins, authorized recycler partnerships, awareness programmes, and device donation channels.',
            },
          ].map((item) => (
            <Card key={item.title}>
              <h3 className="text-sm font-semibold text-brand-800">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.body}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <Card>
          <h3 className="text-sm font-semibold text-brand-800">Why it matters</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            E-waste is one of the fastest-growing waste streams. Campus-scale surveys are the
            standard first step for designing interventions that people will actually use.
          </p>
        </Card>
        <Card>
          <h3 className="text-sm font-semibold text-brand-800">Privacy first</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            No names are collected by default. Only aggregated results are published, and groups
            with fewer than five responses are withheld from filtered views.
          </p>
        </Card>
        <Card>
          <h3 className="text-sm font-semibold text-brand-800">Methodology</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            A 20-item voluntary questionnaire analysed with descriptive statistics and exploratory
            student-versus-staff comparisons.{' '}
            <Link to="/methodology" className="font-medium text-brand-700 underline">
              Read the full methodology
            </Link>
            .
          </p>
        </Card>
      </section>

      <section className="rounded-xl border border-brand-200 bg-brand-50 p-6">
        <h2 className="text-base font-semibold text-brand-900">Project team</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Authorship, faculty guide, and affiliation details are configurable and intentionally left
          blank until confirmed by the research team.{' '}
          <Link to="/about" className="font-medium text-brand-700 underline">
            About / references
          </Link>
        </p>
      </section>
    </div>
  )
}
