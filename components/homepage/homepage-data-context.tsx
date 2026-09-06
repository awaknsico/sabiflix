'use client'

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Movie } from '@/lib/types'
import type { WatchHistoryItem } from '@/lib/watch-history'

interface HomepageData {
  watchHistory: WatchHistoryItem[]
  watchlistIds: string[]
  ready: boolean
  removeFromHistory: (movieId: string) => void
  clearHistory: () => void
}

const HomepageDataContext = createContext<HomepageData>({
  watchHistory: [],
  watchlistIds: [],
  ready: false,
  removeFromHistory: () => {},
  clearHistory: () => {},
})

interface HomepageDataProviderProps {
  children: ReactNode
  movieIds: string[]
}

/**
 * Homepage data provider — fetches watch history and watchlist ONCE
 * and shares them across all homepage components.
 *
 * This eliminates duplicate API calls when multiple components
 * (ContinueWatching, MostWatchedRow, WatchlistRow) each fetch the same data.
 */
export function HomepageDataProvider({ children, movieIds }: HomepageDataProviderProps) {
  const [watchHistory, setWatchHistory] = useState<WatchHistoryItem[]>([])
  const [watchlistIds, setWatchlistIds] = useState<string[]>([])
  const [ready, setReady] = useState(false)

  // Fetch watch history once
  useEffect(() => {
    let cancelled = false
    fetch('/api/watch-history')
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        if (data.ok && data.data?.items) {
          const items: WatchHistoryItem[] = data.data.items.map((item: any) => ({
            id: `wh-${item.movieId}`,
            movieId: item.movieId,
            watchedAt: new Date(item.updatedAt * 1000).toISOString(),
            progressSeconds: item.progressSeconds,
            durationSeconds: item.durationSeconds,
            updatedAt: new Date(item.updatedAt * 1000).toISOString(),
            completedAt:
              item.durationSeconds > 0 && item.progressSeconds / item.durationSeconds >= 0.95
                ? new Date(item.updatedAt * 1000).toISOString()
                : null,
          }))
          setWatchHistory(items)
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setReady((prev) => prev || true)
      })

    return () => {
      cancelled = true
    }
  }, [])

  // Fetch watchlist once
  useEffect(() => {
    let cancelled = false
    fetch('/api/watchlist')
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        if (data.ok && data.data?.items) {
          setWatchlistIds(data.data.items.map((i: any) => i.movieId))
        }
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [])

  // Mark ready when both fetches complete
  useEffect(() => {
    if (watchHistory.length >= 0 && watchlistIds.length >= 0) {
      // Use a small delay to batch both fetches
      const timer = setTimeout(() => setReady(true), 100)
      return () => clearTimeout(timer)
    }
  }, [watchHistory, watchlistIds])

  // Client-side removal (no API endpoint for deleting history)
  const removeFromHistory = useMemo(
    () => (movieId: string) => {
      setWatchHistory((prev) => prev.filter((e) => e.movieId !== movieId))
    },
    [],
  )

  const clearHistory = useMemo(
    () => () => {
      setWatchHistory([])
    },
    [],
  )

  const value = useMemo(
    () => ({ watchHistory, watchlistIds, ready, removeFromHistory, clearHistory }),
    [watchHistory, watchlistIds, ready, removeFromHistory, clearHistory],
  )

  return (
    <HomepageDataContext.Provider value={value}>{children}</HomepageDataContext.Provider>
  )
}

/**
 * Hook to access shared homepage data.
 * Must be used within HomepageDataProvider.
 */
export function useHomepageData(): HomepageData {
  return useContext(HomepageDataContext)
}

/**
 * Filter watch history to only include valid movies.
 */
export function useFilteredWatchHistory(
  watchHistory: WatchHistoryItem[],
  movieIds: string[],
): WatchHistoryItem[] {
  const validIds = useMemo(() => new Set(movieIds), [movieIds])
  return useMemo(
    () => watchHistory.filter((e) => validIds.has(e.movieId)),
    [watchHistory, validIds],
  )
}

/**
 * Filter watchlist to only include valid movies.
 */
export function useFilteredWatchlist(
  watchlistIds: string[],
  movieIds: string[],
): string[] {
  const validIds = useMemo(() => new Set(movieIds), [movieIds])
  return useMemo(
    () => watchlistIds.filter((id) => validIds.has(id)),
    [watchlistIds, validIds],
  )
}
