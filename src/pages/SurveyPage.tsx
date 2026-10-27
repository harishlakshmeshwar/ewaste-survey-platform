import { useOutletContext } from 'react-router-dom'
import { useState } from 'react'
import { Badge, Card, EmptyState, Notice, PageHeader } from '../components/ui'
import type { LayoutContext } from '../types'

export function SurveyPage() {
  const { config } = useOutletContext<LayoutContext>()
  const embedUrl = config?.surveyEmbedUrl ?? null
  const [prevEmbedUrl, setPrevEmbedUrl] = useState(embedUrl)
  const [embedBlocked, setEmbedBlocked] = useState(false)
  if (embedUrl !== prevEmbedUrl) {
    setPrevEmbedUrl(embedUrl)
    setEmbedBlocked(false)
  }

  const surveyUrl = config?.surveyUrl ?? null

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Participate in the survey"
        subtitle="Your response is voluntary, anonymous, and takes about 4–6 minutes. No names or contact details are collected."
        actions={
          surveyUrl ? (
            <a
              href={surveyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
            >
              Open the Google Form ↗
            </a>
          ) : undefined
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {surveyUrl ? (
            embedUrl && !embedBlocked ? (
              <div className="overflow-hidden rounded-xl border border-brand-100 bg-white shadow-sm">
                <iframe
                  title="E-waste survey form"
                  src={embedUrl}
                  className="h-[720px] w-full"
                  loading="lazy"
                  onError={() => setEmbedBlocked(true)}
                >
                  Loading the survey form…
                </iframe>
              </div>
            ) : (
              <Card>
                <h2 className="text-base font-semibold text-brand-900">Complete the form</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  The questionnaire opens in Google Forms in a new tab. Please answer all closed
                  items; the suggestion box is optional.
                </p>
                <a
                  href={surveyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
                >
                  Launch survey ↗
                </a>
                {embedUrl && embedBlocked ? (
                  <p className="mt-3 text-xs text-slate-500">
                    The embedded preview could not load in this browser — the button above works
                    regardless.
                  </p>
                ) : null}
              </Card>
            )
          ) : (
            <EmptyState
              title="Survey link not published yet"
              description="The Google Form has not been created or its URL has not been configured on this deployment. Follow docs/SURVEY-SETUP.md to create the form in the authorised Google account, then set SURVEY_URL (and optionally SURVEY_EMBED_URL) in the server environment."
            />
          )}

          <Notice tone="info" title="Research-purpose and voluntary-participation statement">
            This survey is conducted for an academic engineering-research project on campus e-waste
            management. Participation is voluntary; you may stop at any time without consequence.
            Responses are analysed only in aggregate, and no personally identifying information is
            requested. Small groups are suppressed in published views.
          </Notice>
        </div>

        <aside className="space-y-4">
          <Card>
            <h2 className="text-sm font-semibold text-brand-900">Before you start</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li>• Estimated time: 4–6 minutes</li>
              <li>• 20 questions — 5 sections, 2 optional (department, Q15)</li>
              <li>• No login required beyond the form's access settings</li>
              <li>• Demographic items (department) are optional</li>
              <li>• One submission per person is requested</li>
            </ul>
          </Card>
          <Card>
            <h2 className="text-sm font-semibold text-brand-900">What we do not collect</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li>• Names or roll numbers</li>
              <li>• Email addresses (ignored if a form adds them)</li>
              <li>• Device serial numbers or personal files</li>
            </ul>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-brand-900">Integration status</h2>
              <Badge tone={config?.dataSourceConfigured ? 'live' : 'neutral'}>
                {config?.dataSourceConfigured ? 'Configured' : 'Not configured'}
              </Badge>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              Source: {config?.dataSourceKind ?? 'unknown'}. The Analytics page shows live response
              counts once the linked sheet receives submissions.
            </p>
          </Card>
        </aside>
      </div>
    </div>
  )
}
