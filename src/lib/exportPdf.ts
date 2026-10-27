import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Distribution, Summary } from './types'

function fmt(n: number | null | undefined, suffix = ''): string {
  if (n === null || n === undefined) return '—'
  return `${n}${suffix}`
}

function addHeader(doc: jsPDF, title: string): void {
  doc.setFillColor(240, 253, 244)
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 26, 'F')
  doc.setTextColor(20, 83, 45)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text('MSRIT E-Waste Disposal Survey — Aggregate Report', 14, 11)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(55, 80, 63)
  doc.text(title, 14, 19)
  doc.setTextColor(28, 43, 35)
}

function newPage(doc: jsPDF, title: string): void {
  doc.addPage()
  addHeader(doc, title)
}

export function buildSummaryPdf(summary: Summary, options: { manuscript?: boolean } = {}): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const margin = 14
  const contentW = pageW - margin * 2
  const m = summary.meta

  addHeader(doc, options.manuscript ? 'Manuscript draft (provisional)' : 'Aggregate analysis summary')

  let y = 34
  const ensure = (needed: number, title = 'Aggregate analysis summary'): void => {
    if (y + needed > doc.internal.pageSize.getHeight() - 16) {
      newPage(doc, title)
      y = 34
    }
  }

  const heading = (text: string, level: 1 | 2 = 1, title = 'Aggregate analysis summary'): void => {
    ensure(14, title)
    doc.setFont('helvetica', level === 1 ? 'bold' : 'bold')
    doc.setFontSize(level === 1 ? 13 : 11)
    doc.setTextColor(level === 1 ? 20 : 22, level === 1 ? 83 : 101, level === 1 ? 45 : 63)
    doc.text(text, margin, y)
    y += level === 1 ? 7 : 6
    doc.setTextColor(28, 43, 35)
  }

  const para = (text: string, size = 9.5, title = 'Aggregate analysis summary'): void => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(size)
    const lines = doc.splitTextToSize(text, contentW) as string[]
    for (const line of lines) {
      ensure(5, title)
      doc.text(line, margin, y)
      y += 4.6
    }
    y += 1.5
  }

  const table = (
    head: string[],
    body: (string | number)[][],
    title = 'Aggregate analysis summary',
  ): void => {
    ensure(20, title)
    autoTable(doc, {
      head: [head],
      body,
      startY: y,
      margin: { left: margin, right: margin },
      styles: { fontSize: 8.5, cellPadding: 2, textColor: [28, 43, 35], lineColor: [220, 235, 224] },
      headStyles: { fillColor: [22, 101, 52], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [240, 253, 244] },
      theme: 'grid',
    })
    const prev = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable
    y = (prev?.finalY ?? y) + 7
  }

  const isDemo = m.isDemo
  if (isDemo) {
    doc.setFillColor(254, 243, 199)
    doc.setDrawColor(245, 158, 11)
    doc.roundedRect(margin, y - 4, contentW, 14, 2, 2, 'FD')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(146, 64, 14)
    doc.text('DEMONSTRATION DATA — synthetic rows for interface preview only; NOT real MSRIT survey responses.', margin + 3, y + 3)
    doc.setTextColor(28, 43, 35)
    y += 18
  }

  heading('1. Dataset overview')
  table(
    ['Property', 'Value'],
    [
      ['Source', m.source],
      ['Generated at', m.generatedAt],
      ['Last refresh', m.lastRefresh ?? '—'],
      ['Dataset date', m.datasetDate ?? '—'],
      ['Dataset version', m.datasetVersion],
      ['Total rows', String(m.totalRows)],
      ['Valid responses', String(m.validResponses)],
      ['Invalid responses excluded', String(m.invalidResponses)],
      ['Filters', `category=${m.filters.category ?? 'all'}, department=${m.filters.department ?? 'all'}, since=${m.filters.since ?? 'all'}`],
    ],
  )

  if (summary.kpis.length > 0) {
    heading('2. Key indicators')
    table(
      ['Indicator', 'Value', 'Detail'],
      summary.kpis.map((k) => [k.label, k.value, k.detail]),
    )
  }

  heading(summary.kpis.length > 0 ? '3. Respondent profile' : '2. Respondent profile')
  table(
    ['Category', 'Count', '% of valid'],
    summary.respondentCategory.buckets.map((b) => [b.label, String(b.count), `${b.percentage}%`]),
  )
  para(
    `Denominator: ${summary.respondentCategory.validN} valid responses to this question (${summary.respondentCategory.missingN} missing). Percentages are calculated on valid responses only; missing answers are never treated as negative answers.`,
  )

  ensure(30)
  heading('Department / school distribution')
  table(
    ['Department', 'Count', '% of valid'],
    summary.departments.buckets.map((b) => [b.label, String(b.count), `${b.percentage}%`]),
  )

  const writeDist = (dist: Distribution, sectionNo: string): void => {
    ensure(24)
    heading(`${sectionNo} ${dist.label.slice(0, 90)}${dist.label.length > 90 ? '…' : ''}`, 2)
    if (dist.type === 'text') {
      para(`Free-text item — ${dist.textResponseCount ?? 0} written suggestions received. Text is not exported to protect respondents; analyse manually.`)
      return
    }
    table(
      ['Answer', 'Count', '% of valid'],
      dist.buckets.map((b) => [b.label, String(b.count), `${b.percentage}%`]),
    )
    para(
      `Valid n = ${dist.validN}; missing = ${dist.missingN}; unrecognised answers = ${dist.unexpectedN}.`,
      8.5,
    )
  }

  let counter = summary.kpis.length > 0 ? 4 : 3
  for (const dist of Object.values(summary.distributions)) {
    if (!dist) continue
    if (dist.questionId === 'q1' || dist.questionId === 'q2') continue
    writeDist(dist, String(counter))
    counter += 1
  }

  const a = summary.awarenessScore
  heading(`${counter}. Awareness score (descriptive composite)`, 1)
  para(
    `Rule (specified before analysis): ${a.ruleDescription} Limitations: equal item weighting, self-reported items, no reliability or validity testing — do not describe it as a validated scale.`,
  )
  if (a.validN > 0) {
    table(
      ['Statistic', 'Value'],
      [
        ['Mean score', fmt(a.mean, '/100')],
        ['Valid n', String(a.validN)],
        ['Missing n', String(a.missingN)],
        ...a.distribution.map((b) => [`Band: ${b.label}`, `${b.count} (${b.percentage}%)`]),
        ...a.scoreByCategory.map((r) => [`Mean — ${r.category} (n=${r.n})`, String(r.mean)]),
      ],
    )
  } else {
    para('No valid responses available for scoring yet.')
  }
  counter += 1

  heading(`${counter}. Student vs staff comparisons`, 1)
  para(
    'Exploratory two-proportion comparisons with Wilson 95% confidence intervals. Cross-sectional survey — differences are associations only; no causal claims. Comparisons with fewer than 5 responses per group are not tested.',
  )
  const tested = summary.comparisons.filter((c) => c.pValue !== null)
  if (tested.length > 0) {
    table(
      ['Item', 'Students % (n)', 'Staff % (n)', 'Diff (pp)', 'p'],
      tested.map((c) => [
        c.label.slice(0, 64),
        `${c.groupA.proportion} (${c.groupA.n})`,
        `${c.groupB.proportion} (${c.groupB.n})`,
        String(c.difference),
        String(c.pValue),
      ]),
    )
  }
  const untested = summary.comparisons.filter((c) => c.pValue === null)
  for (const c of untested) {
    para(`• ${c.label}: students ${c.groupA.proportion}% (n=${c.groupA.n}), staff ${c.groupB.proportion}% (n=${c.groupB.n}) — ${c.note ?? 'not tested'}.`, 8.5)
  }
  counter += 1

  const measured = summary.findings.filter((f) => f.kind === 'measured')
  const proposed = summary.findings.filter((f) => f.kind === 'proposed')
  if (measured.length > 0 || proposed.length > 0) {
    heading(`${counter}. Findings and recommendations`, 1)
    if (measured.length > 0) {
      heading('Measured observations (from actual aggregated data)', 2)
      for (const f of measured) para(`• ${f.title}: ${f.body}${f.basis ? ` [${f.basis}]` : ''}`, 9)
    }
    if (proposed.length > 0) {
      heading('Proposed interventions (not measured results)', 2)
      for (const f of proposed) para(`• ${f.title}: ${f.body}`, 9)
    }
    counter += 1
  }

  heading(`${counter}. Methodology`, 1)
  para(
    'Design: cross-sectional, voluntary, anonymous campus survey of students and staff at MSRIT. ' +
      'Instrument: a 15-item Google Form covering respondent category, department (optional), e-waste familiarity, identification ability, impact awareness, prior training, device replacement frequency, disposal practices, recycling-facility use, knowledge of disposal locations, campus-facility awareness, willingness to use a campus facility, barriers, perceived usefulness of campaigns, and open suggestions. ' +
      'No names or contact details are collected by default. Analysis: unweighted descriptive statistics; percentages computed per question on valid responses with missing counts reported; optional pre-specified awareness composite; exploratory student/staff comparisons with Wilson intervals and two-proportion z-tests.',
  )
  heading(`${counter + 1}. Limitations`, 1)
  para(
    'Convenience/voluntary sampling — results may not represent the whole campus. Self-reported responses are subject to recall and social-desirability bias. ' +
      'Cross-sectional data cannot support causal inference. Small subgroup counts are suppressed for privacy (fewer than 5 responses). ' +
      'The awareness score is an unvalidated descriptive composite. Non-response bias is unquantified.',
  )
  heading(`${counter + 2}. Data provenance`, 1)
  para(
    `Report generated ${m.generatedAt} from dataset version "${m.datasetVersion}". ` +
      `Every figure above is computed at export time from the aggregated response data; no percentages are hard-coded. ` +
      (isDemo
        ? 'WARNING: this report was generated from demonstration data and contains no real survey findings.'
        : 'Source attribution: ' + m.source),
  )

  return doc
}

export function buildManuscriptDoc(summary: Summary): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const margin = 20
  const contentW = doc.internal.pageSize.getWidth() - margin * 2
  let y = 20

  const write = (text: string, opts: { bold?: boolean; size?: number; center?: boolean; gap?: number }): void => {
    doc.setFont('helvetica', opts.bold ? 'bold' : 'normal')
    doc.setFontSize(opts.size ?? 10)
    const lines = doc.splitTextToSize(text, contentW) as string[]
    for (const line of lines) {
      if (y > doc.internal.pageSize.getHeight() - 18) {
        doc.addPage()
        y = 20
      }
      if (opts.center) doc.text(line, doc.internal.pageSize.getWidth() / 2, y, { align: 'center' })
      else doc.text(line, margin, y)
      y += opts.size ? opts.size * 0.5 : 4.4
    }
    y += opts.gap ?? 3
  }

  const m = summary.meta
  write('TITLE PLACEHOLDER: Student and Staff Awareness, Practices and Attitudes towards E-Waste Disposal: A MSRIT Campus Survey', { bold: true, size: 13, center: true, gap: 4 })
  write('[Author names — to be inserted by the research team]', { center: true, size: 10 })
  write('[Department / affiliation — to be confirmed with faculty guide]', { center: true, size: 9, gap: 6 })
  write(
    m.isDemo || m.validResponses === 0
      ? 'ABSTRACT PLACEHOLDER — no real survey data is loaded yet. Replace this paragraph with a 150–250 word abstract once data collection closes: context, objective, method (n = ___ voluntary anonymous responses), headline results (___), and implications (___).'
      : `Abstract — This paper reports a cross-sectional campus survey (n = ${m.validResponses} valid responses; dataset ${m.datasetVersion}) on e-waste awareness, disposal practices, and attitudes among students and staff at MSRIT. ${summary.findings.filter((f) => f.kind === 'measured').slice(0, 2).map((f) => f.body).join(' ')} Exploratory student/staff comparisons are reported with confidence intervals. Limitations include convenience sampling and self-report bias. [This abstract is auto-drafted from loaded results and must be edited before submission.]`,
    { size: 9.5 }
  )
  write('Index terms — e-waste; environmental awareness; campus waste management; survey methodology; sustainability', { size: 9, gap: 6 })

  write('I. INTRODUCTION', { bold: true, size: 11 })
  write(
    'Electronic waste is one of the fastest-growing waste streams worldwide [ref-1]. Improper disposal releases hazardous materials and wastes recoverable resources. Institutions of higher education generate significant volumes of electronic equipment and consumables, and the behaviour of their students and staff determines whether that waste is handled responsibly. This paper studies awareness, practices, and attitudes towards e-waste disposal within a single engineering-campus setting to inform locally actionable interventions. Research questions: (RQ1) How familiar are respondents with e-waste and its impacts? (RQ2) What disposal routes are actually used? (RQ3) What barriers block responsible disposal? (RQ4) Is there demand for a campus collection facility and awareness campaigns?',
    { size: 9.5 }
  )

  write('II. RELATED WORK [REFERENCES TO BE VERIFIED]', { bold: true, size: 11 })
  write(
    'PLACEHOLDER — insert 4–6 verified references on e-waste awareness surveys and campus waste-management interventions. Do not reuse sample references from any template. Each entry must be checked against the original source before submission.',
    { size: 9.5 }
  )

  write('III. METHODOLOGY', { bold: true, size: 11 })
  write(
    `Study design: cross-sectional online survey. Instrument: 15-item Google Form (closed items plus one optional free-text item); voluntary participation with a research-purpose statement; no names collected; demographic items optional. Collection period: [start–end dates]. Sampling: convenience/voluntary response — not a probability sample, so representativeness is not claimed. Data handling: responses stored in a linked spreadsheet; analysis restricted to aggregates; subgroups with fewer than 5 responses are suppressed. Analysis: descriptive frequencies on valid responses per item; pre-specified awareness composite (equal-weighted, descriptive, unvalidated); exploratory two-proportion comparisons between students and staff with Wilson 95% intervals.`,
    { size: 9.5 }
  )

  write('IV. RESULTS', { bold: true, size: 11 })
  if (m.isDemo || summary.kpis.length === 0) {
    write(
      'PLACEHOLDER — no verified survey results are loaded. Tables and figures are generated on the Analytics Dashboard from live data; insert them here after data collection closes. Demonstration figures must never be reported as findings.',
      { size: 9.5 }
    )
  } else {
    write(
      `A. Sample — ${m.validResponses} valid responses (${m.invalidResponses} excluded of ${m.totalRows} rows). Respondent mix: ${summary.respondentCategory.buckets.map((b) => `${b.label} ${b.percentage}%`).join(', ')}.`,
      { size: 9.5 }
    )
    for (const f of summary.findings.filter((x) => x.kind === 'measured').slice(0, 6)) {
      write(`B.${f.id} — ${f.title}: ${f.body} ${f.basis ? `(${f.basis})` : ''}`, { size: 9.5 })
    }
    write('[Insert charts and tables exported from the Dashboard; caption each as Fig. N / Table N.]', { size: 9.5 })
  }

  write('V. DISCUSSION AND LIMITATIONS', { bold: true, size: 11 })
  write(
    'Interpret observed patterns against RQ1–RQ4. State explicitly: convenience sampling limits generalisability; self-report invites social-desirability and recall bias; cross-sectional associations are not causal; the awareness composite is descriptive and unvalidated; small cells are suppressed.',
    { size: 9.5 }
  )

  write('VI. RECOMMENDATIONS', { bold: true, size: 11 })
  write(
    summary.findings.filter((f) => f.kind === 'proposed').map((f) => `${f.title}: ${f.body}`).join(' ') ||
      '[Proposed campus interventions will be listed here once findings are loaded.]',
    { size: 9.5 }
  )

  write('VII. CONCLUSION AND FUTURE WORK', { bold: true, size: 11 })
  write(
    'PLACEHOLDER — summarise answers to RQ1–RQ4 after data collection, then propose longitudinal re-measurement after interventions are deployed.',
    { size: 9.5 }
  )

  write('ACKNOWLEDGMENT', { bold: true, size: 11 })
  write('[Add only after the faculty guide confirms approval and any funding or departmental support to acknowledge.]', { size: 9.5 })

  write('REFERENCES', { bold: true, size: 11 })
  write(
    '[1] PLACEHOLDER — verified reference. [2] PLACEHOLDER — verified reference. Number citations in IEEE style and confirm each entry against its original source. Template sample references must not be reused.',
    { size: 9.5 }
  )

  write(
    `Provisional draft generated ${m.generatedAt} · dataset ${m.datasetVersion} · ${m.isDemo || summary.kpis.length === 0 ? 'contains placeholders / demonstration context' : 'contains auto-drafted results that must be reviewed'}. Not IEEE-approved; confirm template and reference requirements with the faculty guide before submission.`,
    { size: 8 }
  )

  return doc
}
