import { useCallback, useEffect, useState } from 'react'
import { ApiError, fetchSummary } from './api'
import type { Summary, SummaryQuery } from './types'

export type SummaryState =
  | { status: 'loading'; data: Summary | null }
  | { status: 'ready'; data: Summary }
  | { status: 'empty'; data: Summary }
  | { status: 'error'; data: Summary | null; error: { message: string; hint: string | null; status: number } }

export interface UseSummaryResult {
  state: SummaryState
  refresh: (options?: { force?: boolean }) => void
  lastLoadedAt: Date | null
  isStale: boolean
}

const STALE_AFTER_MS = 10 * 60 * 1000

/**
 * Static-host fallback: when the API is unreachable (e.g. the site is served
 * from a static host without the Express server), load a prebuilt snapshot
 * from `data/summary.json`. Snapshots are always built from demo/synthetic
 * data and are labelled as such in their own metadata. Filtered views are NOT
 * served from snapshots — they would misrepresent the active filter.
 */
async function loadSnapshot(query: SummaryQuery): Promise<Summary | null> {
  if (query.category || query.department || query.since) return null
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}data/summary.json`)
    if (!res.ok) return null
    const data = (await res.json()) as Summary
    return data && data.meta && Array.isArray(data.kpis) ? data : null
  } catch {
    return null
  }
}

export function useSummary(query: SummaryQuery, options: { demo?: boolean } = {}): UseSummaryResult {
  const [state, setState] = useState<SummaryState>({ status: 'loading', data: null })
  const [lastLoadedAt, setLastLoadedAt] = useState<Date | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [now, setNow] = useState(() => Date.now())
  const queryKey = JSON.stringify({ ...query, demo: options.demo ?? false })

  useEffect(() => {
    let cancelled = false
    setState((prev) => ({ status: 'loading', data: prev.data }))

    fetchSummary({ ...query, demo: options.demo })
      .then((data) => {
        if (cancelled) return
        setLastLoadedAt(new Date())
        if (data.meta.suppressed) {
          setState({ status: 'error', data, error: { message: data.meta.suppressionReason ?? 'Suppressed', hint: 'Choose a broader filter to view results.', status: 403 } })
          return
        }
        if (data.meta.validResponses === 0) {
          setState({ status: 'empty', data })
          return
        }
        setState({ status: 'ready', data })
      })
      .catch(async (err: unknown) => {
        if (cancelled) return
        const snapshot = await loadSnapshot(query)
        if (cancelled) return
        if (snapshot) {
          setLastLoadedAt(new Date())
          setState(
            snapshot.meta.validResponses === 0
              ? { status: 'empty', data: snapshot }
              : { status: 'ready', data: snapshot },
          )
          return
        }
        if (err instanceof ApiError) {
          setState({ status: 'error', data: null, error: { message: err.message, hint: err.hint, status: err.status } })
        } else {
          setState({
            status: 'error',
            data: null,
            error: { message: err instanceof Error ? err.message : 'Unexpected error', hint: null, status: 0 },
          })
        }
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey, reloadKey])

  const refresh = useCallback(
    (opts: { force?: boolean } = {}) => {
      if (opts.force) {
        fetchSummary({ ...query, demo: options.demo, refresh: true })
          .then((data) => {
            setLastLoadedAt(new Date())
            if (data.meta.suppressed) {
              setState({ status: 'error', data, error: { message: data.meta.suppressionReason ?? 'Suppressed', hint: 'Choose a broader filter.', status: 403 } })
            } else if (data.meta.validResponses === 0) {
              setState({ status: 'empty', data })
            } else setState({ status: 'ready', data })
          })
          .catch(async (err: unknown) => {
            const snapshot = await loadSnapshot(query)
            if (snapshot) {
              setLastLoadedAt(new Date())
              setState(
                snapshot.meta.validResponses === 0
                  ? { status: 'empty', data: snapshot }
                  : { status: 'ready', data: snapshot },
              )
              return
            }
            if (err instanceof ApiError) {
              setState({ status: 'error', data: null, error: { message: err.message, hint: err.hint, status: err.status } })
            }
          })
        return
      }
      setReloadKey((k) => k + 1)
    },
    [query, options.demo],
  )

  const isStale = lastLoadedAt !== null && now - lastLoadedAt.getTime() > STALE_AFTER_MS

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(timer)
  }, [])

  return { state, refresh, lastLoadedAt, isStale }
}
