import { NavLink, Outlet } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { fetchConfig, type HealthPayload, fetchHealth } from '../lib/api'
import type { PublicConfig } from '../lib/types'
import { Badge } from './ui'

const NAV = [
  { to: '/', label: 'Home', end: true },
  { to: '/survey', label: 'Survey' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/findings', label: 'Findings' },
  { to: '/environment', label: 'Environment' },
  { to: '/report', label: 'Report' },
  { to: '/methodology', label: 'Methodology' },
  { to: '/about', label: 'About' },
]

export function Layout() {
  const [open, setOpen] = useState(false)
  const [config, setConfig] = useState<PublicConfig | null>(null)
  const [health, setHealth] = useState<HealthPayload | null>(null)

  useEffect(() => {
    fetchConfig().then(setConfig).catch(() => setConfig(null))
    fetchHealth().then(setHealth).catch(() => setHealth(null))
  }, [])

  const connected = Boolean(health?.connected)

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-brand-700 focus:px-3 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b border-brand-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <NavLink to="/" className="flex items-center gap-2" aria-label="E-waste survey home">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
              eW
            </span>
            <span className="hidden text-sm font-semibold text-brand-900 sm:block">
              MSRIT E-Waste Survey
            </span>
          </NavLink>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-brand-50 text-brand-800'
                      : 'text-slate-600 hover:bg-brand-50 hover:text-brand-700'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <span className="hidden sm:block">
              {health && health.sourceConfigured ? (
                <Badge tone={connected ? 'live' : 'stale'}>
                  {connected ? 'Data source connected' : 'Source unreachable'}
                </Badge>
              ) : (
                <Badge tone="neutral">No data source</Badge>
              )}
            </span>
            <button
              type="button"
              className="rounded-lg border border-brand-200 px-3 py-1.5 text-sm text-brand-800 md:hidden"
              aria-expanded={open}
              aria-controls="mobile-nav"
              onClick={() => setOpen((v) => !v)}
            >
              {open ? 'Close' : 'Menu'}
            </button>
          </div>
        </div>

        {open ? (
          <nav id="mobile-nav" className="border-t border-brand-100 bg-white px-4 py-2 md:hidden" aria-label="Mobile navigation">
            <ul className="flex flex-col">
              {NAV.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      `block rounded-lg px-3 py-2.5 text-sm font-medium ${
                        isActive ? 'bg-brand-50 text-brand-800' : 'text-slate-600 hover:bg-brand-50'
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </header>

      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <Outlet context={{ config, health }} />
      </main>

      <footer className="border-t border-brand-100 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            Ramaiah Institute of Technology (MSRIT), Bengaluru — Student and Staff Awareness,
            Practices and Attitudes towards E-Waste Disposal: A MSRIT Campus Survey.
          </p>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>Voluntary · Anonymous · Aggregate results only</span>
            <NavLink to="/methodology" className="underline hover:text-brand-700">
              Methodology
            </NavLink>
            <NavLink to="/report" className="underline hover:text-brand-700">
              Research report
            </NavLink>
          </p>
        </div>
      </footer>
    </div>
  )
}
