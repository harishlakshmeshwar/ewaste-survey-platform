import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, EmptyState, Notice, PageHeader, Spinner } from '../components/ui'
import { useSummary } from '../lib/useSummary'

export function FindingsPage() {
  const [demo, setDemo] = useState(false)
  const { state } = useSummary({ category: null, department: null, since: null }, { demo })

  const summary = state.status === 'error' ? state.data : state.data
  const measured = summary?.findings.filter((f) => f.kind === 'measured') ?? []
  const proposed = summary?.findings.filter((f) => f.kind === 'proposed') ?? []

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Findings and recommendations"
        subtitle="Observations below are generated from the aggregated response data at request time. Measured results and proposed interventions are explicitly separated."
      />

      {state.status === 'loading' && !summary ? <Spinner label="Loading findings" /> : null}

      {state.status === 'error' ? (
        <Notice tone="danger" title="Could not load findings">
          {state.error.message}
          {state.error.hint ? <p className="mt-1 text-xs">{state.error.hint}</p> : null}
        </Notice>
      ) : null}

      {state.status === 'empty' && summary ? (
        <EmptyState
          title="No findings yet — waiting for responses"
          description={
            summary.meta.sourceConfigured
              ? 'The data source is connected but contains no valid responses yet. Findings are generated only from real aggregated data.'
              : 'No data source is configured. Findings will appear once responses are collected and verified.'
          }
          action={
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDemo(true)}
                className="rounded-lg border border-brand-300 px-4 py-2 text-sm font-medium text-brand-800 hover:bg-brand-50"
              >
                Preview with demo data
              </button>
              <Link to="/survey" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
                Go to survey
              </Link>
            </div>
          }
        />
      ) : null}

      {summary && (measured.length > 0 || proposed.length > 0) ? (
        <>
          {summary.meta.isDemo ? (
            <Notice tone="warning" title="Demonstration data — not real survey results">
              These observations were generated from synthetic rows for interface preview only.
            </Notice>
          ) : null}

          <section aria-labelledby="measured-heading">
            <h2 id="measured-heading" className="text-lg font-semibold text-brand-900">
              Measured observations
            </h2>
            <p className="mt-1 mb-4 text-sm text-slate-600">
              Derived from actual aggregated responses ({summary.meta.validResponses} valid
              responses). Each item shows its denominator and source questions.
            </p>
            <div className="grid gap-4 lg:grid-cols-2">
              {measured.map((f) => (
                <Card key={f.id}>
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-sm font-semibold text-brand-800">{f.title}</h3>
                    <span className="shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-700">
                      Measured
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-slate-700">{f.body}</p>
                  {f.basis ? <p className="mt-2 text-xs text-slate-400">Basis: {f.basis}</p> : null}
                </Card>
              ))}
            </div>
          </section>

          <section aria-labelledby="proposed-heading">
            <h2 id="proposed-heading" className="text-lg font-semibold text-brand-900">
              Proposed interventions
            </h2>
            <p className="mt-1 mb-4 text-sm text-slate-600">
              Recommendations for the campus — these are proposals, <strong>not</strong> measured
              outcomes, and should be adopted only after review by the research team and campus
              administration.
            </p>
            <div className="grid gap-4 lg:grid-cols-2">
              {proposed.map((f) => (
                <div key={f.id} className="rounded-xl border border-dashed border-amber-200 bg-amber-50/50 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-sm font-semibold text-amber-900">{f.title}</h3>
                    <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 border border-amber-200">
                      Proposed
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-slate-700">{f.body}</p>
                </div>
              ))}
            </div>
          </section>

          <Notice tone="info" title="Interpretation guardrails">
            Findings describe this sample only. Convenience sampling means the results are not
            guaranteed to represent the entire campus population, and cross-sectional associations
            cannot establish causation. See the{' '}
            <Link to="/methodology" className="underline">
              methodology
            </Link>{' '}
            page for full limitations.
          </Notice>
        </>
      ) : null}
    </div>
  )
}
