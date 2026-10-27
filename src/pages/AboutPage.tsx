import { Card, Notice, PageHeader } from '../components/ui'

/**
 * Authorship fields are intentionally empty. Fill them in after the research
 * team confirms identities — nothing here is invented by the application.
 */
const PROJECT_META = {
  authors: [] as string[],
  facultyGuide: '', // e.g. 'Prof. <name>, <department>'
  affiliation: '', // e.g. 'Department of <X>, MSR Institute of Technology'
  contact: '',
  references: [
    {
      id: 1,
      text: 'PLACEHOLDER — add a verified reference on global e-waste volumes (e.g. the latest UNIT/ITU or Global E-waste Monitor figures) after checking the original source.',
      verified: false,
    },
    {
      id: 2,
      text: 'PLACEHOLDER — add a verified reference on e-waste awareness survey methodology.',
      verified: false,
    },
    {
      id: 3,
      text: 'PLACEHOLDER — add a verified reference on campus or institutional waste-management interventions.',
      verified: false,
    },
    {
      id: 4,
      text: 'PLACEHOLDER — add a verified reference on health/environmental effects of informal e-waste processing.',
      verified: false,
    },
  ],
}

export function AboutPage() {
  const meta = PROJECT_META
  const hasAuthors = meta.authors.length > 0
  const hasGuide = meta.facultyGuide.trim().length > 0

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="About / references"
        subtitle="Project scope, authorship, and references. Fields are intentionally blank until the research team confirms them — this application does not invent identities, approvals, participant counts, or citations."
      />

      <Card>
        <h2 className="text-base font-semibold text-brand-900">Project scope</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">
          A single-campus, cross-sectional survey study of e-waste awareness, disposal practices, and
          attitudes among students and staff, carried out as an engineering college research project.
          The deliverables are: a published Google Form instrument, an aggregated analytics dashboard,
          evidence-based findings and recommendations, this documented methodology, and an IEEE-style
          manuscript draft for faculty review.
        </p>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <h2 className="text-base font-semibold text-brand-900">Authorship</h2>
          {hasAuthors ? (
            <ul className="mt-2 space-y-1 text-sm text-slate-700">
              {meta.authors.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-slate-500">
              [Not yet configured — add authors in <code>src/pages/AboutPage.tsx</code>]
            </p>
          )}
        </Card>

        <Card>
          <h2 className="text-base font-semibold text-brand-900">Faculty guide</h2>
          {hasGuide ? (
            <p className="mt-2 text-sm text-slate-700">{meta.facultyGuide}</p>
          ) : (
            <p className="mt-2 text-sm text-slate-500">
              [Not yet configured — faculty approval is not claimed until confirmed]
            </p>
          )}
          {meta.affiliation ? (
            <p className="mt-1 text-sm text-slate-600">{meta.affiliation}</p>
          ) : (
            <p className="mt-1 text-sm text-slate-500">[Affiliation — to be confirmed]</p>
          )}
        </Card>
      </div>

      <Notice tone="warning" title="No unverified claims">
        This page does not display participant numbers, approval status, publication status, or
        citations unless they have been supplied and confirmed by the research team. Demonstration
        data in the dashboard is synthetic and clearly labelled as such.
      </Notice>

      <Card>
        <h2 className="text-base font-semibold text-brand-900">References</h2>
        <p className="mt-1 text-xs text-slate-500">
          Verification status is shown for each entry. Do not reuse sample references from any
          template as if they were sources for this project.
        </p>
        <ol className="mt-3 space-y-3">
          {meta.references.map((ref) => (
            <li key={ref.id} className="flex gap-3 text-sm leading-relaxed text-slate-700">
              <span className="font-mono text-xs text-brand-700">[{ref.id}]</span>
              <span className={ref.verified ? '' : 'text-slate-500 italic'}>{ref.text}</span>
              <span
                className={`ml-auto h-fit shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                  ref.verified ? 'bg-brand-100 text-brand-800' : 'bg-amber-100 text-amber-800'
                }`}
              >
                {ref.verified ? 'Verified' : 'To verify'}
              </span>
            </li>
          ))}
        </ol>
      </Card>

      <Card>
        <h2 className="text-base font-semibold text-brand-900">Integrity statement</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">
          All analytics on this platform are computed from the connected response source at request
          time. No percentages are hard-coded, no participants are fabricated, and no integration is
          reported as connected unless it has actually been tested. Configuration status is visible
          on the Analytics page and, for maintainers, on the Admin diagnostics page.
        </p>
      </Card>
    </div>
  )
}
