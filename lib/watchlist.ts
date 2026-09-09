'use client'

import { useCallback, useMemo, useSyncExternalStore } from 'react'

/**
 * Server-backed watchlist ("save for later") state.
 *
 * One module-level store, ONE `/api/watchlist` fetch per page load: every
 * consumer (each movie card's save toggle, the dashboard, the homepage
 * provider) subscribes to the same snapshot instead of firing its own
 * request. This matters — a signed-in homepage previously re-fetched the
 * watchlist once per rendered card (~25 worker invocations per visit).
 *
 * The list is the server's shape (one row per film per user), sorted by
 * most-recently-added first so consumers can render straight through.
 */

/* ------------------------------------------------------------------ */
/* API shapes                                                          */
/* ------------------------------------------------------------------ */

interface WatchlistApiItem {
  movieId: string
  title: string
  posterUrl: string | null
  year: number | null
  category: string | null
  addedAt: number /* epoch seconds */
}

/* ------------------------------------------------------------------ */
/* Shared store (module singleton)                                     */
/* ------------------------------------------------------------------ */

interface WatchlistState {
  ids: string[]
  ready: boolean
}

const INITIAL_STATE: WatchlistState = { ids: [], ready: false }

let state: WatchlistState = INITIAL_STATE
let started = false
const listeners = new Set<() => void>()

function setState(next: WatchlistState) {
  state = next
  listeners.forEach((listener) => listener())
}

async function load() {
  try {
    const res = await fetch('/api/watchlist')
    const data = (await res.json().catch(() => null)) as {
      ok?: boolean
      data?: { items?: WatchlistApiItem[] }
    } | null
    if (data?.ok && data.data?.items) {
      setState({ ids: data.data.items.map((i) => i.movieId), ready: true })
      return
    }
  } catch {
    /* 401 (signed-out) or network error → empty state, ready to render */
  }
  setState({ ids: [], ready: true })
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  if (!started) {
    started = true
    void load()
  }
  return () => {
    listeners.delete(listener)
  }
}

/* ------------------------------------------------------------------ */
/* Hook                                                                */
/* ------------------------------------------------------------------ */

export function useWatchlist(validMovieIds?: readonly string[]) {
  const snapshot = useSyncExternalStore(subscribe, () => state, () => INITIAL_STATE)

  const validIdsKey = validMovieIds?.join('\u0000')

  /* In-memory filter against the active catalog (replaces localStorage cleanup). */
  const filteredIds = useMemo(() => {
    if (!validMovieIds?.length) return snapshot.ids
    const validIds = new Set(validMovieIds)
    return snapshot.ids.filter((id) => validIds.has(id))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot.ids, validIdsKey])

  const has = useCallback((movieId: string) => filteredIds.includes(movieId), [filteredIds])

  const toggle = useCallback(async (movieId: string) => {
    try {
      const res = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ movieId }),
      })
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean
        data?: { added?: boolean }
      } | null
      if (data?.ok && data.data?.added !== undefined) {
        const added = data.data.added
        setState({
          ids: added
            ? [movieId, ...state.ids.filter((id) => id !== movieId)]
            : state.ids.filter((id) => id !== movieId),
          ready: true,
        })
      }
    } catch {
      /* Silently fail — the toggle will retry on the next click. */
    }
  }, [])

  return { ids: filteredIds, ready: snapshot.ready, has, toggle }
}
