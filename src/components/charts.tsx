import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Bar,
  BarChart,
  CartesianGrid,
} from 'recharts'
import type { Distribution } from '../lib/types'

const CHART_COLORS = [
  '#16a34a',
  '#059669',
  '#0d9488',
  '#65a30d',
  '#ca8a04',
  '#ea580c',
  '#0284c7',
  '#7c3aed',
  '#db2777',
  '#64748b',
]

/* eslint-disable @typescript-eslint/no-explicit-any */
type TooltipFormatter = (value: any, name: any, item: any) => [string, string]

function makeFormatter(build: (payload: Record<string, unknown>) => [string, string]): TooltipFormatter {
  return (_value, _name, item) => build((item?.payload ?? {}) as Record<string, unknown>)
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function shortLabel(label: string, max = 34): string {
  return label.length > max ? `${label.slice(0, max - 1)}…` : label
}

interface ChartFrameProps {
  title: string
  subtitle?: string
  children: React.ReactNode
  tableData?: { label: string; count: number; percentage: number }[]
  validN: number
}

export function ChartFrame({ title, subtitle, children, tableData, validN }: ChartFrameProps) {
  return (
    <figure className="rounded-xl border border-brand-100 bg-white p-5 shadow-sm">
      <figcaption className="mb-3">
        <h3 className="text-sm font-semibold text-brand-900">{title}</h3>
        {subtitle ? <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p> : null}
        <p className="mt-0.5 text-xs text-slate-400">Valid responses (denominator): n = {validN}</p>
      </figcaption>
      <div className="h-64 w-full">{children}</div>
      {tableData && tableData.length > 0 ? (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs font-medium text-brand-700 hover:underline">
            View data table
          </summary>
          <table className="mt-2 w-full text-left text-xs text-slate-600">
            <thead>
              <tr className="border-b border-brand-100 text-slate-500">
                <th scope="col" className="py-1 pr-2 font-medium">Answer</th>
                <th scope="col" className="py-1 pr-2 font-medium">Count</th>
                <th scope="col" className="py-1 font-medium">%</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((row) => (
                <tr key={row.label} className="border-b border-slate-50">
                  <td className="py-1 pr-2">{row.label}</td>
                  <td className="py-1 pr-2 tabular-nums">{row.count}</td>
                  <td className="py-1 tabular-nums">{row.percentage}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      ) : null}
    </figure>
  )
}

export function DonutChart({ distribution }: { distribution: Distribution }) {
  const data = distribution.buckets
    .filter((b) => b.count > 0)
    .map((b) => ({ name: shortLabel(b.label), value: b.count, pct: b.percentage, full: b.label }))
  if (data.length === 0) return <p className="text-sm text-slate-500">No data yet.</p>
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius="55%"
          outerRadius="80%"
          paddingAngle={2}
          aria-label={`Donut chart: ${distribution.label}`}
        >
          {data.map((_, index) => (
            <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={makeFormatter((p) => [
            `${p.value ?? 0} (${p.pct ?? 0}%)`,
            typeof p.full === 'string' ? p.full : '',
          ])}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  )
}

export function BarChartView({
  distribution,
  horizontal = false,
  color = '#16a34a',
}: {
  distribution: Distribution
  horizontal?: boolean
  color?: string
}) {
  const data = distribution.buckets
    .filter((b) => b.count > 0 || b.percentage > 0)
    .map((b) => ({ name: shortLabel(b.label, 26), count: b.count, pct: b.percentage, full: b.label }))
  if (data.length === 0) return <p className="text-sm text-slate-500">No data yet.</p>

  if (horizontal) {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
          <XAxis type="number" unit="%" domain={[0, 100]} tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} />
          <Tooltip formatter={makeFormatter((p) => [`${p.pct ?? 0}% (${p.count ?? 0})`, typeof p.full === 'string' ? p.full : ''])} />
          <Bar dataKey="pct" fill={color} radius={[0, 4, 4, 0]} aria-label={`Bar chart: ${distribution.label}`} />
        </BarChart>
      </ResponsiveContainer>
    )
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ left: -18, right: 8, top: 8, bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="name" angle={-35} textAnchor="end" tick={{ fontSize: 10 }} interval={0} height={60} />
        <YAxis unit="%" domain={[0, 100]} tick={{ fontSize: 11 }} />
        <Tooltip formatter={makeFormatter((p) => [`${p.pct ?? 0}% (${p.count ?? 0})`, typeof p.full === 'string' ? p.full : ''])} />
        <Bar dataKey="pct" fill={color} radius={[4, 4, 0, 0]} aria-label={`Bar chart: ${distribution.label}`} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function ComparisonBarChart({
  label,
  groupA,
  groupB,
}: {
  label: string
  groupA: { label: string; proportion: number; n: number; ciLow: number; ciHigh: number }
  groupB: { label: string; proportion: number; n: number; ciLow: number; ciHigh: number }
}) {
  const data = [
    { name: `${groupA.label} (n=${groupA.n})`, pct: groupA.proportion, ci: `95% CI ${groupA.ciLow.toFixed(1)}–${groupA.ciHigh.toFixed(1)}` },
    { name: `${groupB.label} (n=${groupB.n})`, pct: groupB.proportion, ci: `95% CI ${groupB.ciLow.toFixed(1)}–${groupB.ciHigh.toFixed(1)}` },
  ]
  return (
    <figure className="rounded-xl border border-brand-100 bg-white p-5 shadow-sm">
      <figcaption className="mb-3">
        <h3 className="text-sm font-semibold text-brand-900">{label}</h3>
        <p className="mt-0.5 text-xs text-slate-500">Bars show percentages; the tooltip reports Wilson 95% confidence intervals.</p>
      </figcaption>
      <div className="h-52 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: -18, right: 8, top: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis unit="%" domain={[0, 100]} tick={{ fontSize: 11 }} />
            <Tooltip formatter={makeFormatter((p) => [`${p.pct ?? 0}%`, typeof p.ci === 'string' ? p.ci : ''])} />
            <Bar dataKey="pct" fill="#059669" radius={[4, 4, 0, 0]} aria-label={label} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </figure>
  )
}

export function AwarenessDistributionChart({ distribution }: { distribution: { label: string; count: number; percentage: number }[] }) {
  const data = distribution.map((b) => ({ name: shortLabel(b.label, 20), count: b.count, pct: b.percentage, full: b.label }))
  if (data.length === 0 || data.every((d) => d.count === 0)) return <p className="text-sm text-slate-500">No data yet.</p>
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ left: -18, right: 8, top: 8, bottom: 30 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={50} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip formatter={makeFormatter((p) => [`${p.count ?? 0} respondents`, typeof p.full === 'string' ? p.full : ''])} />
        <Bar dataKey="count" fill="#0d9488" radius={[4, 4, 0, 0]} aria-label="Awareness score distribution" />
      </BarChart>
    </ResponsiveContainer>
  )
}
