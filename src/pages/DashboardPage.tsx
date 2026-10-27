import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  AwarenessDistributionChart,
  BarChartView,
  ChartFrame,
  ComparisonBarChart,
  DonutChart,
} from '../components/charts'
import { Badge, Card, EmptyState, KpiCard, Notice, PageHeader, Spinner } from '../components/ui'
import { downloadText, summaryToCsv, timestampSlug } from '../lib/exportCsv'
import { buildSummaryPdf } from '../lib/exportPdf'
import type { RespondentCategory, SummaryQuery } from '../lib/types'
import { useSummary } from '../lib/useSummary'
import type { LayoutContext } from '../types'

const CATEGORY_OPTIONS: { value: '' | RespondentCategory; label: string }[] = [
  { value: '', label: 'All respondents' },
  { value: 'student', label: 'Students' },
  { value: 'teaching_staff', label: 'Teaching staff' },
  { value: 'non_teaching_staff', label: 'Non-teaching staff' },
]

export function DashboardPage() {
  const { health } = useOutletContext<LayoutContext>()
  const [category, setCategory] = useState<RespondentCategory | ''>('')
  const [department, setDepartment] = useState('')
  const [demo, setDemo] = useState(false)

  const query: SummaryQuery = useMemo(
    () => ({
      category: category || null,
      department: department || null,
      since: null,
    }),
    [category, department],
  )

  const { state, refresh, lastLoadedAt, isStale } = useSummary(query, { demo })
  const summary = state.status === 'error' ? state.data : state.data

  const exportDisabled = !summary || summary.meta.validResponses === 0

  const handleCsv = (): void => {
    if (!summary) return
    downloadText(
      `ewaste-summary-${timestampSlug(summary.meta.generatedAt)}.csv`,
      summaryToCsv(summary),
      'text/csv',
    )
  }

  const handlePdf = (manuscript = false): void => {
    if (!summary) return
    const doc = buildSummaryPdf(summary, { manuscript })
    doc.save(
      manuscript
        ? `ewaste-manuscript-draft-${timestampSlug(summary.meta.generatedAt)}.pdf`
        : `ewaste-report-${timestampSlug(summary.meta.generatedAt)}.pdf`,
    )
  }

  const tableRows = (dist: { buckets: { label: string; count: number; percentage: number }[] }) =>
    dist.buckets.filter((b) => b.count > 0).map((b) => ({ label: b.label, count: b.count, percentage: b.percentage }))

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Analytics dashboard"
        subtitle="Every figure below is computed at request time from the configured response source. Percentages use each question's valid-response denominator; missing answers are never counted as negatives."
        actions={
          <>
            <button
              type="button"
              onClick={() => refresh({ force: true })}
              className="rounded-lg border border-brand-300 bg-white px-4 py-2 text-sm font-medium text-brand-800 transition hover:bg-brand-50"
            >
              Refresh data
            </button>
            <button
              type="button"
              onClick={handleCsv}
              disabled={exportDisabled}
              className="rounded-lg border border-brand-300 bg-white px-4 py-2 text-sm font-medium text-brand-800 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Export CSV
            </button>
            <button
              type="button"
              onClick={() => handlePdf(false)}
              disabled={exportDisabled}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Export PDF report
            </button>
          </>
        }
      />

      {/* Filters */}
      <Card className="space-y-4">
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
            Respondent category
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as RespondentCategory | '')}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
            >
              {CATEGORY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
            Department or school
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
            >
              <option value="">All departments</option>
              {(summary?.departments.buckets ?? [])
                .filter((b) => b.count > 0 && !b.value.startsWith('__'))
                .map((b) => (
                  <option key={b.value} value={b.value}>
                    {b.label}
                  </option>
                ))}
            </select>
          </label>

          <button
            type="button"
            onClick={() => {
              setCategory('')
              setDepartment('')
            }}
            className="rounded-lg px-3 py-2 text-sm text-slate-500 underline hover:text-brand-700"
          >
            Clear filters
          </button>

          <label className="ml-auto flex cursor-pointer items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
            <input
              type="checkbox"
              checked={demo}
              onChange={(e) => setDemo(e.target.checked)}
              className="h-4 w-4 accent-amber-600"
            />
            Load demonstration data (synthetic)
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
          {lastLoadedAt ? (
            <span>Data refreshed: {lastLoadedAt.toLocaleString()}</span>
          ) : null}
          {isStale ? <Badge tone="stale">Showing cached view — refresh recommended</Badge> : null}
          {summary ? <Badge tone={summary.meta.isDemo ? 'demo' : 'live'}>{summary.meta.isDemo ? 'DEMO DATA' : 'LIVE DATA'}</Badge> : null}
          {summary?.meta.lastRefresh ? <span>Source fetch: {new Date(summary.meta.lastRefresh).toLocaleString()}</span> : null}
          {health && !health.connected && health.sourceConfigured ? (
            <span className="text-rose-600">Source unreachable — showing last known state</span>
          ) : null}
          {summary ? <span className="font-mono text-[11px]">{summary.meta.datasetVersion}</span> : null}
        </div>
      </Card>

      {/* States */}
      {state.status === 'loading' && !summary ? (
        <div className="rounded-xl border border-brand-100 bg-white p-10">
          <Spinner label="Loading survey summary" />
        </div>
      ) : null}

      {state.status === 'error' ? (
        <Notice tone="danger" title={state.error.status === 403 ? 'Filtered view withheld' : 'Data source unavailable'}>
          <p>{state.error.message}</p>
          {state.error.hint ? <p className="mt-1 text-xs opacity-80">{state.error.hint}</p> : null}
          <button
            type="button"
            onClick={() => refresh()}
            className="mt-2 rounded border border-rose-300 bg-white px-3 py-1 text-xs font-medium text-rose-800"
          >
            Try again
          </button>
        </Notice>
      ) : null}

      {state.status === 'empty' ? (
        <EmptyState
          title="No responses yet"
          description={
            summary?.meta.sourceConfigured
              ? 'The survey has been configured but no valid responses have been received (or your filters match no rows). Share the survey link to begin collecting data, or clear filters.'
              : 'No data source is configured on this deployment yet. Configure DATA_SOURCE and credentials on the server, or tick “Load demonstration data” to preview the dashboard with clearly-labelled synthetic rows.'
          }
          action={
            <button
              type="button"
              onClick={() => setDemo(true)}
              className="rounded-lg border border-brand-300 px-4 py-2 text-sm font-medium text-brand-800 hover:bg-brand-50"
            >
              Preview with demo data
            </button>
          }
        />
      ) : null}

      {state.status === 'ready' && summary ? (
        <>
          {summary.meta.isDemo ? (
            <Notice tone="warning" title="Demonstration data — not real survey results">
              These are synthetic rows generated for interface preview only. Nothing here reflects
              actual MSRIT responses and it must never be reported as a research finding.
            </Notice>
          ) : null}

          {/* KPIs */}
          <section aria-label="Key performance indicators" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {summary.kpis.map((kpi) => (
              <KpiCard key={kpi.id} label={kpi.label} value={kpi.value} detail={kpi.detail} />
            ))}
          </section>

          {/* Respondent category + awareness */}
          <section className="grid gap-5 lg:grid-cols-2">
            <ChartFrame
              title="Respondent categories"
              subtitle="Distribution of students, teaching staff, and non-teaching staff"
              validN={summary.respondentCategory.validN}
              tableData={tableRows(summary.respondentCategory)}
            >
              <DonutChart distribution={summary.respondentCategory} />
            </ChartFrame>

            <ChartFrame
              title="Awareness score distribution"
              subtitle={summary.awarenessScore.ruleDescription}
              validN={summary.awarenessScore.validN}
              tableData={summary.awarenessScore.distribution.map((b) => ({
                label: b.label,
                count: b.count,
                percentage: b.percentage,
              }))}
            >
              <AwarenessDistributionChart distribution={summary.awarenessScore.distribution} />
            </ChartFrame>
          </section>

          {/* Departments */}
          <section className="grid gap-5 lg:grid-cols-2">
            <ChartFrame
              title="Department / school responses"
              subtitle="Department is optional; blanks are excluded from this chart"
              validN={summary.departments.validN}
              tableData={tableRows(summary.departments)}
            >
              <BarChartView distribution={summary.departments} horizontal color="#059669" />
            </ChartFrame>

            <ChartFrame
              title={summary.distributions.q3.label}
              subtitle="Q3 — familiarity with the term e-waste"
              validN={summary.distributions.q3.validN}
              tableData={tableRows(summary.distributions.q3)}
            >
              <BarChartView distribution={summary.distributions.q3} color="#16a34a" />
            </ChartFrame>
          </section>

          {/* Knowledge & disposal */}
          <section className="grid gap-5 lg:grid-cols-2">
            <ChartFrame
              title={summary.distributions.q5.label}
              subtitle="Q5 — awareness of environmental and health impacts"
              validN={summary.distributions.q5.validN}
              tableData={tableRows(summary.distributions.q5)}
            >
              <BarChartView distribution={summary.distributions.q5} color="#0d9488" />
            </ChartFrame>

            <ChartFrame
              title={summary.distributions.q8.label}
              subtitle="Q8 — typical disposal route for unused or damaged electronics"
              validN={summary.distributions.q8.validN}
              tableData={tableRows(summary.distributions.q8)}
            >
              <BarChartView distribution={summary.distributions.q8} horizontal color="#ca8a04" />
            </ChartFrame>
          </section>

          {/* Facilities & willingness */}
          <section className="grid gap-5 lg:grid-cols-2">
            <ChartFrame
              title={summary.distributions.q11.label}
              subtitle="Q11 — awareness of campus collection facilities"
              validN={summary.distributions.q11.validN}
              tableData={tableRows(summary.distributions.q11)}
            >
              <BarChartView distribution={summary.distributions.q11} color="#7c3aed" />
            </ChartFrame>

            <ChartFrame
              title={summary.distributions.q12.label}
              subtitle="Q12 — willingness to use a campus collection facility"
              validN={summary.distributions.q12.validN}
              tableData={tableRows(summary.distributions.q12)}
            >
              <BarChartView distribution={summary.distributions.q12} color="#0284c7" />
            </ChartFrame>
          </section>

          {/* Barriers & campaigns */}
          <section className="grid gap-5 lg:grid-cols-2">
            <ChartFrame
              title={summary.distributions.q13.label}
              subtitle="Q13 — multiple selection; percentages are of respondents answering this item"
              validN={summary.distributions.q13.validN}
              tableData={tableRows(summary.distributions.q13)}
            >
              <BarChartView distribution={summary.distributions.q13} horizontal color="#ea580c" />
            </ChartFrame>

            <ChartFrame
              title={summary.distributions.q14.label}
              subtitle="Q14 — perceived usefulness of awareness campaigns"
              validN={summary.distributions.q14.validN}
              tableData={tableRows(summary.distributions.q14)}
            >
              <BarChartView distribution={summary.distributions.q14} color="#db2777" />
            </ChartFrame>
          </section>

          {/* Improvement measures & environmental knowledge */}
          <section className="grid gap-5 lg:grid-cols-2">
            <ChartFrame
              title={summary.distributions.q15.label}
              subtitle="Q15 — multiple selection; percentages are of respondents answering this item"
              validN={summary.distributions.q15.validN}
              tableData={tableRows(summary.distributions.q15)}
            >
              <BarChartView distribution={summary.distributions.q15} horizontal color="#65a30d" />
            </ChartFrame>

            <ChartFrame
              title={summary.distributions.q16.label}
              subtitle="Q16 — knowledge of uncontrolled incineration risks"
              validN={summary.distributions.q16.validN}
              tableData={tableRows(summary.distributions.q16)}
            >
              <BarChartView distribution={summary.distributions.q16} color="#16a34a" />
            </ChartFrame>
          </section>

          <section className="grid gap-5 lg:grid-cols-2">
            <ChartFrame
              title={summary.distributions.q17.label}
              subtitle="Q17 — knowledge of landfill contamination pathways"
              validN={summary.distributions.q17.validN}
              tableData={tableRows(summary.distributions.q17)}
            >
              <BarChartView distribution={summary.distributions.q17} color="#0d9488" />
            </ChartFrame>

            <ChartFrame
              title={summary.distributions.q18.label}
              subtitle="Q18 — multiple selection; percentages are of respondents answering this item"
              validN={summary.distributions.q18.validN}
              tableData={tableRows(summary.distributions.q18)}
            >
              <BarChartView distribution={summary.distributions.q18} horizontal color="#ea580c" />
            </ChartFrame>
          </section>

          <section className="grid gap-5 lg:grid-cols-2">
            <ChartFrame
              title={summary.distributions.q19.label}
              subtitle="Q19 — multiple selection; percentages are of respondents answering this item"
              validN={summary.distributions.q19.validN}
              tableData={tableRows(summary.distributions.q19)}
            >
              <BarChartView distribution={summary.distributions.q19} horizontal color="#0284c7" />
            </ChartFrame>

            <ChartFrame
              title={summary.distributions.q20.label}
              subtitle="Q20 — multiple selection; percentages are of respondents answering this item"
              validN={summary.distributions.q20.validN}
              tableData={tableRows(summary.distributions.q20)}
            >
              <BarChartView distribution={summary.distributions.q20} color="#7c3aed" />
            </ChartFrame>
          </section>

          {/* Student vs staff */}
          <section aria-labelledby="comparisons-heading">
            <h2 id="comparisons-heading" className="text-lg font-semibold text-brand-900">
              Student vs staff comparisons
            </h2>
            <p className="mt-1 mb-4 max-w-3xl text-sm text-slate-600">
              Exploratory comparisons of proportions with Wilson 95% confidence intervals. This is a
              cross-sectional survey — differences are associations, not causal effects. Groups with
              fewer than 5 responses are not tested.
            </p>
            <div className="grid gap-5 lg:grid-cols-2">
              {summary.comparisons.map((c) => (
                <ComparisonBarChart key={c.key} label={c.label} groupA={c.groupA} groupB={c.groupB} />
              ))}
            </div>
            <div className="mt-4 overflow-x-auto rounded-xl border border-brand-100 bg-white p-4">
              <table className="w-full min-w-[640px] text-left text-sm text-slate-700">
                <caption className="pb-3 text-left text-sm font-semibold text-brand-900">
                  Comparison summary (exploratory)
                </caption>
                <thead>
                  <tr className="border-b border-brand-100 text-xs uppercase tracking-wide text-slate-500">
                    <th scope="col" className="py-2 pr-3">Item</th>
                    <th scope="col" className="py-2 pr-3">Students</th>
                    <th scope="col" className="py-2 pr-3">Staff</th>
                    <th scope="col" className="py-2 pr-3">Difference (pp)</th>
                    <th scope="col" className="py-2">p-value</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.comparisons.map((c) => (
                    <tr key={c.key} className="border-b border-slate-50">
                      <td className="py-2 pr-3 text-xs">{c.label}</td>
                      <td className="py-2 pr-3 tabular-nums">
                        {c.groupA.proportion}% <span className="text-slate-400">(n={c.groupA.n})</span>
                      </td>
                      <td className="py-2 pr-3 tabular-nums">
                        {c.groupB.proportion}% <span className="text-slate-400">(n={c.groupB.n})</span>
                      </td>
                      <td className="py-2 pr-3 tabular-nums">{c.pValue === null ? '—' : c.difference}</td>
                      <td className="py-2 tabular-nums text-xs">
                        {c.pValue === null ? (c.note ?? 'not tested') : `${c.pValue}${c.pValue < 0.05 ? ' *' : ''}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {summary.comparisons.some((c) => c.pValue !== null) ? (
                <p className="mt-2 text-xs text-slate-500">* p &lt; 0.05 (two-proportion z-test, exploratory; no multiple-comparison correction applied).</p>
              ) : null}
            </div>
          </section>

          {/* Detailed distributions */}
          <details className="rounded-xl border border-brand-100 bg-white p-5 shadow-sm">
            <summary className="cursor-pointer text-sm font-semibold text-brand-800">
              Show all question-level distributions (Q1–Q20)
            </summary>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {Object.values(summary.distributions).map((dist) => (
                <div key={dist.questionId} className="rounded-lg border border-slate-100 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                    {dist.questionId.toUpperCase()}
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-800">{dist.label}</p>
                  {dist.type === 'text' ? (
                    <p className="mt-2 text-xs text-slate-500">
                      {dist.textResponseCount ?? 0} written suggestions received. Free text is never
                      published — review it manually in the linked sheet.
                    </p>
                  ) : (
                    <ul className="mt-2 space-y-1 text-xs text-slate-600">
                      {dist.buckets
                        .filter((b) => b.count > 0)
                        .map((b) => (
                          <li key={b.value} className="flex justify-between gap-2">
                            <span>{b.label}</span>
                            <span className="tabular-nums">
                              {b.count} · {b.percentage}%
                            </span>
                          </li>
                        ))}
                    </ul>
                  )}
                  <p className="mt-2 text-[11px] text-slate-400">
                    valid n = {dist.validN} · missing = {dist.missingN}
                    {dist.unexpectedN > 0 ? ` · unrecognised = ${dist.unexpectedN}` : ''}
                  </p>
                </div>
              ))}
            </div>
          </details>

          <div className="flex flex-wrap gap-3 border-t border-brand-100 pt-4">
            <button
              type="button"
              onClick={handleCsv}
              disabled={exportDisabled}
              className="rounded-lg border border-brand-300 px-4 py-2 text-sm font-medium text-brand-800 hover:bg-brand-50 disabled:opacity-40"
            >
              Download aggregate CSV
            </button>
            <button
              type="button"
              onClick={() => handlePdf(true)}
              disabled={exportDisabled}
              className="rounded-lg border border-brand-300 px-4 py-2 text-sm font-medium text-brand-800 hover:bg-brand-50 disabled:opacity-40"
            >
              Download IEEE manuscript draft (PDF)
            </button>
            <span className="self-center text-xs text-slate-400">
              Dataset {summary.meta.datasetVersion} · generated {new Date(summary.meta.generatedAt).toLocaleString()}
            </span>
          </div>
        </>
      ) : null}
    </div>
  )
}
