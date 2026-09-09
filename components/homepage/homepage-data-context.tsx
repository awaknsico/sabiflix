'use client'

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { MovieCardDto } from '@/lib/types'
import type { WatchHistoryItem } from '@/lib/watch-history'
import { useWatchlist } from '@/lib/watchlist'

interface HomepageData {
  watchHistory: WatchHistoryItem[]
  watchlistIds: string[]
  ready: boolean
  /** Lean card projections shared by every section (deduped RSC payload). */
  cards: MovieCardDto[]
  cardsById: Map<string, MovieCardDto>
  removeFromHistory: (movieId: string) => void
  clearHistory: () => void
}

const HomepageDataContext = createContext<HomepageData>({
  watchHistory: [],
  watchlistIds: [],
  ready: false,
  cards: [],
  cardsById: new Map(),
  removeFromHistory: () => {},
  clearHistory: () => {},
})

interface HomepageDataProviderProps {
  children: ReactNode
  movieIds: string[]
  /** Lean card projections — serialized ONCE for the whole page. */
  cards: MovieCardDto[]
  /**
   * When false the provider never fetches (signed-out visitors hit 401 on
   * both endpoints anyway). Children simply render their empty states.
   */
  enabled?: boolean
}

/**
 * Homepage data provider — fetches watch history and watchlist ONCE
 * and shares them across all homepage components.
 *
 * This eliminates duplicate API calls when multiple components
 * (ContinueWatching, MostWatchedRow, WatchlistRow) each fetch the same data.
 */
export function HomepageDataProvider({ children, movieIds, cards, enabled = true }: HomepageDataProviderProps) {
  const [watchHistory, setWatchHistory] = useState<WatchHistoryItem[]>([])
  const [ready, setReady] = useState(!enabled)
  const cardsById = useMemo(() => new Map(cards.map((m) => [m.id, m] as const)), [cards])

  /* Shared watchlist store — ONE fetch serves this provider and every
     per-card save toggle on the page (previously one request per card). */
  const { ids: watchlistIds, ready: watchlistReady } = useWatchlist()

  // Fetch watch history once (skipped entirely for signed-out visitors)
  useEffect(() => {
    if (!enabled) return
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
  }, [enabled])

  // Mark ready when both fetches complete (already ready when disabled)
  useEffect(() => {
    if (!enabled) return
    if (watchHistory.length >= 0 && watchlistReady) {
      // Use a small delay to batch both fetches
      const timer = setTimeout(() => setReady(true), 100)
      return () => clearTimeout(timer)
    }
  }, [watchHistory, watchlistReady, enabled])

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
    () => ({ watchHistory, watchlistIds, ready, cards, cardsById, removeFromHistory, clearHistory }),
    [watchHistory, watchlistIds, ready, cards, cardsById, removeFromHistory, clearHistory],
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
