import { useOutletContext } from 'react-router-dom'
import { Badge, Card, Notice, PageHeader, Spinner } from '../components/ui'
import { downloadText, summaryToCsv, timestampSlug } from '../lib/exportCsv'
import { buildSummaryPdf } from '../lib/exportPdf'
import { QUESTIONS, RESPONSE_TARGETS, SECTIONS } from '../lib/schema'
import { useSummary } from '../lib/useSummary'
import type { LayoutContext } from '../types'

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-24">
      <Card>
        <h2 id={`${id}-h`} className="text-base font-semibold text-brand-900">
          {title}
        </h2>
        <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-700">{children}</div>
      </Card>
    </section>
  )
}

export function ReportPage() {
  const { config } = useOutletContext<LayoutContext>()
  const { state, lastLoadedAt } = useSummary({}, { demo: false })
  const summary = state.data
  const hasResults = Boolean(summary && summary.meta.validResponses > 0 && !summary.meta.suppressed)

  const handleCsv = (): void => {
    if (!summary) return
    downloadText(`ewaste-report-data-${timestampSlug(summary.meta.generatedAt)}.csv`, summaryToCsv(summary), 'text/csv')
  }

  const handlePdf = (): void => {
    if (!summary) return
    buildSummaryPdf(summary, { manuscript: false }).save(
      `ewaste-report-${timestampSlug(summary.meta.generatedAt)}.pdf`,
    )
  }

  return (
    <div className="animate-fade-in space-y-6 print:space-y-4">
      <div className="no-print">
        <PageHeader
          title="Research report"
          subtitle="Manuscript-style view of the study. Results sections are populated only from validated live data; until enough responses are collected, they are clearly marked as pending."
          actions={
            <>
              <button
                type="button"
                onClick={() => window.print()}
                className="rounded-lg border border-brand-300 bg-white px-4 py-2 text-sm font-medium text-brand-800 transition hover:bg-brand-50"
              >
                Print / Save as PDF
              </button>
              <button
                type="button"
                onClick={handleCsv}
                disabled={!hasResults}
                className="rounded-lg border border-brand-300 bg-white px-4 py-2 text-sm font-medium text-brand-800 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Export aggregate CSV
              </button>
              <button
                type="button"
                onClick={handlePdf}
                disabled={!hasResults}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Export report PDF
              </button>
            </>
          }
        />
      </div>

      {!hasResults ? (
        <Notice tone="warning" title="Results pending — no validated live data yet">
          The Results and Discussion sections below will populate automatically once the configured
          data source contains validated responses. Nothing here is fabricated; demo data is never
          used in this report.
          {state.status === 'loading' ? (
            <span className="mt-2 block">
              <Spinner label="Checking the response source" />
            </span>
          ) : null}
        </Notice>
      ) : (
        <div className="no-print flex flex-wrap items-center gap-3 rounded-xl border border-brand-100 bg-brand-50/60 px-4 py-3 text-xs text-slate-600">
          <Badge tone="live">LIVE DATA</Badge>
          <span>
            {summary!.meta.validResponses} validated responses from{' '}
            {summary!.meta.totalRows} source rows.
          </span>
          {lastLoadedAt ? <span>Fetched: {lastLoadedAt.toLocaleString()}.</span> : null}
        </div>
      )}

      <Section id="abstract" title="Abstract">
        {hasResults ? (
          <p>
            <em>
              Placeholder — compose the final abstract after the data collection window closes. The
              figures currently available ({summary!.meta.validResponses} validated responses; mean
              awareness score{' '}
              {summary!.awarenessScore.mean === null ? 'n/a' : `${summary!.awarenessScore.mean}/100`}
              ) are interim and should be updated before submission.
            </em>
          </p>
        ) : (
          <p className="italic text-slate-500">
            Abstract pending — to be written from the validated final dataset. Interim figures are
            deliberately omitted.
          </p>
        )}
      </Section>

      <Section id="introduction" title="Introduction">
        <p>
          Electronic waste (e-waste) is one of the fastest-growing waste streams, and its
          mismanagement through open burning or landfilling can release hazardous substances into
          air, soil, and water. Institutions that equip large numbers of students and staff with
          computing devices have a direct interest in understanding how their communities perceive
          and handle discarded electronics.
        </p>
        <p>
          This study surveys the MSRIT campus community — students, teaching staff, and
          non-teaching staff — to describe e-waste awareness, disposal practices, attitudes, and
          the perceived usefulness of campus-level interventions such as collection points and
          awareness campaigns.
        </p>
      </Section>

      <Section id="objectives" title="Objectives">
        <ul className="list-disc space-y-1 pl-5">
          <li>Measure familiarity with the term e-waste and the ability to identify e-waste items.</li>
          <li>Describe actual disposal routes for unused or damaged electronics.</li>
          <li>Assess awareness of environmental and health impacts, including incineration and landfill risks.</li>
          <li>Identify barriers to responsible disposal and demand for a campus collection facility.</li>
          <li>Compare descriptive patterns between students and staff.</li>
        </ul>
      </Section>

      <Section id="methodology" title="Methodology">
        <p>
          Single-institution, cross-sectional, voluntary and anonymous survey using a {''}
          {SECTIONS.length}-section, {QUESTIONS.length}-item Google Form with a
          planned target of {RESPONSE_TARGETS.total} genuine responses ({RESPONSE_TARGETS.byCategory.student}{' '}
          students, {RESPONSE_TARGETS.byCategory.teaching_staff} teaching staff,{' '}
          {RESPONSE_TARGETS.byCategory.non_teaching_staff} non-teaching staff).
        </p>
        <p>
          Responses are read from the linked response sheet, validated on ingestion, and analysed
          with per-question denominators; invalid rows and exact duplicates are excluded and
          reported. The full design, cleaning rules, and statistical methods are documented on the{' '}
          <a href="/methodology" className="text-brand-700 underline">
            Methodology page
          </a>
          .
        </p>
      </Section>

      <Section id="results" title="Results and discussion">
        {hasResults ? (
          <div className="space-y-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Interim results — {summary!.meta.validResponses} validated responses (planned target{' '}
              {RESPONSE_TARGETS.total})
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {summary!.kpis.slice(0, 6).map((kpi) => (
                <div key={kpi.id} className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                  <p className="text-xs text-slate-500">{kpi.label}</p>
                  <p className="mt-0.5 text-lg font-semibold text-brand-900">{kpi.value}</p>
                  <p className="text-[11px] text-slate-400">{kpi.detail}</p>
                </div>
              ))}
            </div>
            <ul className="space-y-2">
              {summary!.findings
                .filter((f) => f.kind === 'measured')
                .slice(0, 6)
                .map((f) => (
                  <li key={f.id} className="rounded-lg border border-slate-100 p-3">
                    <p className="text-sm font-medium text-brand-900">{f.title}</p>
                    <p className="mt-1 text-sm text-slate-600">{f.body}</p>
                    {f.basis ? <p className="mt-1 text-[11px] text-slate-400">{f.basis}</p> : null}
                  </li>
                ))}
            </ul>
            <p className="text-xs text-slate-500">
              These are interim, descriptive figures. Interpretation, discussion, and the final
              narrative should be written (and re-checked) when the collection window closes.
            </p>
          </div>
        ) : (
          <p className="italic text-slate-500">
            Pending — this section populates from validated live responses only. It will never be
            filled from demonstration data.
          </p>
        )}
      </Section>

      <Section id="limitations" title="Limitations">
        <ul className="list-disc space-y-1 pl-5">
          <li>Convenience/voluntary sampling — findings generalise to respondents, not the whole campus.</li>
          <li>Self-reported behaviour is subject to recall and social-desirability bias.</li>
          <li>Cross-sectional design — no causal or longitudinal claims.</li>
          <li>Group sizes (especially staff subgroups) may limit precision; sample sizes are always shown.</li>
          <li>The awareness composite is descriptive and unvalidated.</li>
        </ul>
      </Section>

      <Section id="conclusion" title="Conclusion">
        {hasResults ? (
          <p className="italic text-slate-600">
            Placeholder — draft the conclusion once the final dataset is analysed; the interim
            measured findings above provide the starting material.
          </p>
        ) : (
          <p className="italic text-slate-500">
            Pending until validated responses are available.
          </p>
        )}
      </Section>

      <Section id="recommendations" title="Recommendations">
        <p className="text-sm text-slate-600">
          Candidate interventions (clearly labelled as proposals, not measured results) include a
          structured awareness module during induction, clearly signed permanent collection bins
          emptied on a published schedule, a partnership with an authorized recycler for periodic
          drives, and a working-device donation channel. Adoption decisions should follow analysis
          of the final measured data.
        </p>
      </Section>

      <Section id="references" title="References">
        <ul className="list-disc space-y-1 pl-5 text-sm">
          <li>
            PLACEHOLDER — add verified references (e.g. the latest Global E-waste Monitor, WHO
            reports on e-waste and child health, Basel Convention technical guidance) after
            checking the original sources. No citation is invented by this application.
          </li>
        </ul>
        <p className="text-xs text-slate-500">
          Configured survey: {config?.surveyUrl ? (
            <a href={config.surveyUrl} target="_blank" rel="noopener noreferrer" className="underline">
              respondent form ↗
            </a>
          ) : (
            'link not configured'
          )}
        </p>
      </Section>
    </div>
  )
}
