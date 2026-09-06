'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

/**
 * Server-backed watchlist ("save for later") state.
 *
 * Reads from /api/watchlist and toggles via the same route. The list is the
 * server's shape (one row per film per user), sorted by most-recently-added
 * first so consumers can render straight through.
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

interface WatchlistApiResponse {
  ok: boolean
  data?: { items: WatchlistApiItem[]; added?: boolean; removed?: boolean }
  error?: string
}

/* ------------------------------------------------------------------ */
/* Hook                                                                */
/* ------------------------------------------------------------------ */

export function useWatchlist(validMovieIds?: readonly string[]) {
  const [ids, setIds] = useState<string[]>([])
  const [ready, setReady] = useState(false)

  const validIdsKey = validMovieIds?.join('\u0000')

  /* Fetch the watchlist from the server on mount. */
  useEffect(() => {
    let cancelled = false
    fetch('/api/watchlist')
      .then((r) => r.json())
      .then((data: WatchlistApiResponse) => {
        if (cancelled) return
        if (data.ok && data.data?.items) {
          setIds(data.data.items.map((i) => i.movieId))
        }
        setReady(true)
      })
      .catch(() => {
        if (cancelled) return
        /* 401 (signed-out) or network error → empty state, ready to render */
        setReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  /* In-memory filter against the active catalog (replaces localStorage cleanup). */
  const filteredIds = useMemo(() => {
    if (!validMovieIds?.length) return ids
    const validIds = new Set(validMovieIds)
    return ids.filter((id) => validIds.has(id))
  }, [ids, validIdsKey])

  const has = useCallback((movieId: string) => filteredIds.includes(movieId), [filteredIds])

  const toggle = useCallback(async (movieId: string) => {
    try {
      const res = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ movieId }),
      })
      const data = await res.json()
      if (data.ok && data.data?.added !== undefined) {
        const added = data.data.added
        setIds((prev) =>
          added
            ? [movieId, ...prev.filter((id) => id !== movieId)]
            : prev.filter((id) => id !== movieId),
        )
      }
    } catch {
      /* Silently fail — the toggle will retry on the next click. */
    }
  }, [])

  return { ids: filteredIds, ready, has, toggle }
}
