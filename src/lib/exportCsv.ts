import type { Summary } from './types'

export function summaryToCsv(summary: Summary): string {
  const lines: string[] = []
  const esc = (v: string | number): string => {
    const s = String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }

  lines.push('Section,Metric,Group,Count,Valid N,Percent,Notes')
  const m = summary.meta
  lines.push(
    ['Meta', 'Dataset source', '', '', '', '', m.source].map(esc).join(','),
  )
  lines.push(['Meta', 'Generated at', '', '', '', '', m.generatedAt].map(esc).join(','))
  lines.push(['Meta', 'Last refresh', '', '', '', '', m.lastRefresh ?? ''].map(esc).join(','))
  lines.push(['Meta', 'Total rows', '', m.totalRows, '', '', ''].map(esc).join(','))
  lines.push(['Meta', 'Valid responses', '', m.validResponses, '', '', ''].map(esc).join(','))
  lines.push(['Meta', 'Invalid responses', '', m.invalidResponses, '', '', ''].map(esc).join(','))
  lines.push(['Meta', 'Dataset date', '', '', '', '', m.datasetDate ?? ''].map(esc).join(','))
  lines.push(['Meta', 'Dataset version', '', '', '', '', m.datasetVersion].map(esc).join(','))
  lines.push(['Meta', 'Is demonstration data', '', '', '', '', String(m.isDemo)].map(esc).join(','))
  lines.push(
    ['Meta', 'Filters applied', '', '', '', '', `category=${m.filters.category ?? 'all'}; department=${m.filters.department ?? 'all'}; since=${m.filters.since ?? 'all'}`].map(esc).join(','),
  )

  const writeDist = (section: string, label: string, dist: Summary['respondentCategory']): void => {
    for (const bucket of dist.buckets) {
      lines.push([section, label, bucket.label, bucket.count, dist.validN, bucket.percentage, ''].map(esc).join(','))
    }
    if (dist.missingN > 0) {
      lines.push([section, label, '(missing)', dist.missingN, dist.validN, '', 'Not counted as a negative answer'].map(esc).join(','))
    }
  }

  writeDist('Distribution', 'Respondent category', summary.respondentCategory)
  writeDist('Distribution', 'Department or school', summary.departments)

  for (const [key, dist] of Object.entries(summary.distributions)) {
    if (!dist) continue
    writeDist('Distribution', `${key.toUpperCase()} — ${dist.label}`, dist)
  }

  const a = summary.awarenessScore
  lines.push(
    ['Awareness score', 'Mean score', '', a.mean ?? '', a.validN, '', a.ruleDescription].map(esc).join(','),
  )
  for (const bucket of a.distribution) {
    lines.push(['Awareness score', 'Distribution', bucket.label, bucket.count, a.validN, bucket.percentage, ''].map(esc).join(','))
  }
  for (const row of a.scoreByCategory) {
    lines.push(['Awareness score', 'Mean by category', row.category, row.n, row.n, row.mean, 'mean shown in Percent column'].map(esc).join(','))
  }

  for (const c of summary.comparisons) {
    lines.push(
      ['Comparison', c.label, c.groupA.label, c.groupA.count, c.groupA.n, c.groupA.proportion, `95% CI ${c.groupA.ciLow.toFixed(1)}–${c.groupA.ciHigh.toFixed(1)}`].map(esc).join(','),
    )
    lines.push(
      ['Comparison', c.label, c.groupB.label, c.groupB.count, c.groupB.n, c.groupB.proportion, `95% CI ${c.groupB.ciLow.toFixed(1)}–${c.groupB.ciHigh.toFixed(1)}`].map(esc).join(','),
    )
    lines.push(
      [
        'Comparison',
        c.label,
        'difference',
        '',
        '',
        c.difference,
        c.pValue === null
          ? (c.note ?? 'not tested')
          : `z=${c.zStatistic}; p=${c.pValue} (two-proportion, exploratory)`,
      ].map(esc).join(','),
    )
  }

  for (const f of summary.findings) {
    lines.push(['Finding', f.title, f.kind, '', '', '', `${f.body} ${f.basis ? `[${f.basis}]` : ''}`].map(esc).join(','))
  }

  lines.push('')
  lines.push('# Exported from the MSRIT e-waste survey analytics platform.')
  lines.push('# Percentages use the valid-response denominator for each question; missing answers are reported separately.')
  lines.push('# Student/staff comparisons are exploratory; this is a cross-sectional survey and no causal claims are made.')
  return lines.join('\n')
}

export function downloadText(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function timestampSlug(iso: string): string {
  return iso.replace(/[:.]/g, '-').replace(/T/, '_').slice(0, 19)
}
