import { Card, Notice, PageHeader } from '../components/ui'

interface Topic {
  id: string
  title: string
  body: string[]
}

const TOPICS: Topic[] = [
  {
    id: 'what-is-ewaste',
    title: 'What e-waste includes',
    body: [
      'Electronic waste (e-waste) covers discarded products with a plug or battery: phones, chargers, laptops, monitors, cables, batteries, bulbs, and household appliances.',
      'Many items are small and easy to store at home, which delays disposal — "stored at home" responses in the survey describe exactly this behaviour.',
      'Even when working, replaced devices become e-waste; when broken, they become hazardous waste if mixed with ordinary household garbage.',
    ],
  },
  {
    id: 'incineration',
    title: 'Why uncontrolled burning and incineration release harmful pollutants',
    body: [
      'Burning e-waste in the open or in uncontrolled incinerators releases toxic fumes and pollutant particles from plastics, coatings, and residues.',
      'Uncontrolled combustion can generate dioxins and furans — persistent, toxic organic pollutants — as well as acidic gases and heavy-metal-bearing particulates.',
      'There is no safe household-scale method for burning e-waste: correct treatment requires controlled, permitted facilities.',
    ],
  },
  {
    id: 'landfills',
    title: 'How landfill disposal contaminates soil and groundwater',
    body: [
      'When e-waste is buried with ordinary waste, metals and other hazardous substances can leach from crushed devices over time.',
      'Leachate may carry lead, mercury, and cadmium into surrounding soil and, where protection layers fail, into groundwater.',
      'Landfills are designed for mixed municipal waste, not for concentrating heavy metals — so "it has no environmental impact" is not a correct answer.',
    ],
  },
  {
    id: 'health',
    title: 'Potential health risks from hazardous exposure',
    body: [
      'Populations most at risk are informal-sector workers and residents near uncontrolled processing sites, where exposure occurs through dust, fumes, and direct handling.',
      'Documented associations include respiratory problems and irritation, and — with sustained exposure to specific metals or compounds — effects on the nervous system and on kidney or liver function.',
      'General campus respondents rarely face occupational-level exposure, but safe identification, storage, and hand-off to authorized channels still reduce risk.',
    ],
  },
  {
    id: 'responsible',
    title: 'Responsible collection, reuse, refurbishment, and recycling',
    body: [
      'The preferred hierarchy: reduce and repair first, then reuse or donate working devices, then hand over broken devices to authorized recyclers who recover materials in controlled conditions.',
      'Authorized recyclers and manufacturer take-back schemes dismantle devices under engineering controls so metals are recovered instead of released.',
      'Before hand-off, wipe personal data from devices — data-safe decommissioning is part of responsible disposal.',
      'On campus, designated collection points and periodic collection drives keep devices out of the general waste stream.',
    ],
  },
]

const SOURCES = [
  {
    label: 'WHO — Children and digital dumpsites: e-waste and child health',
    url: 'https://www.who.int/publications/i/item/9789241513692',
    note: 'Health effects of e-waste exposure on children and workers',
  },
  {
    label: 'Basel Convention — e-waste technical guidelines',
    url: 'https://www.basel.int/Implementation/TechnicalAssistance/Technicaltopics/tabid/4371/Default.aspx',
    note: 'International framework for environmentally sound e-waste management',
  },
  {
    label: 'UNITAR/ITU — Global E-waste Monitor',
    url: 'https://ewastemonitor.info/',
    note: 'Global statistics on e-waste volumes and documented fate of discarded equipment',
  },
  {
    label: 'US EPA — Electronics Donation and Recycling',
    url: 'https://www.epa.gov/recycle/electronics-donation-and-recycling',
    note: 'Guidance on reuse, donation, and certified recycling channels',
  },
]

export function EnvironmentalPage() {
  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Environmental awareness"
        subtitle="Background on what e-waste is, why improper disposal harms the environment and health, and how responsible channels work."
      />

      <Notice tone="info" title="General education — not survey results">
        Everything on this page is general environmental and health education with cited sources. It
        is <strong>not</strong> a result of the MSRIT survey. Survey findings live on the
        Dashboard and Findings pages and are computed only from collected responses.
      </Notice>

      <div className="grid gap-5 lg:grid-cols-2">
        {TOPICS.map((topic) => (
          <Card key={topic.id} className="h-full">
            <h2 className="text-base font-semibold text-brand-900">{topic.title}</h2>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-700">
              {topic.body.map((line) => (
                <li key={line} className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" aria-hidden />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      <section aria-labelledby="sources-heading">
        <h2 id="sources-heading" className="text-lg font-semibold text-brand-900">
          Sources and further reading
        </h2>
        <p className="mt-1 mb-3 max-w-3xl text-sm text-slate-600">
          Each claim above is drawn from these organisations' published guidance. No figures are
          quoted here from the MSRIT survey itself.
        </p>
        <ul className="grid gap-3 sm:grid-cols-2">
          {SOURCES.map((s) => (
            <li key={s.url}>
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-xl border border-brand-100 bg-white p-4 transition hover:border-brand-300 hover:shadow-sm"
              >
                <span className="text-sm font-medium text-brand-800 underline-offset-2 hover:underline">
                  {s.label} ↗
                </span>
                <span className="mt-1 block text-xs text-slate-500">{s.note}</span>
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
