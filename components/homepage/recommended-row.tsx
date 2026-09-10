'use client'

import { useMemo } from 'react'
import { MovieCarousel } from '@/components/movie-carousel'
import { useHomepageData } from '@/components/homepage/homepage-data-context'
import type { MovieCardDto } from '@/lib/types'
import { sortLatest } from '@/lib/types'

const CATEGORY_LABEL: Record<string, string> = {
  feature: 'feature films',
  short: 'short films',
  documentary: 'documentaries',
}

/**
 * "Because you watched ..." - taste-based recommendations, computed entirely
 * client-side from the already-fetched homepage context (zero new API calls).
 *
 * Scores unwatched, active catalog films by affinity to the viewer's history
 * + watchlist: +2 for the viewer's top category, +1 for their top country.
 * Falls back to newest unwatched films when there isn't enough signal.
 */
export function RecommendedRow() {
  const { watchHistory, watchlistIds, ready, cards } = useHomepageData()

  const movies = useMemo(() => {
    const movieById = new Map(cards.map((m) => [m.id, m] as const))
    const seen = new Set<string>([
      ...watchHistory.map((e) => e.movieId),
      ...watchlistIds,
    ])

    // Tally taste signal from history + watchlist.
    const categoryCount = new Map<string, number>()
    const countryCount = new Map<string, number>()
    for (const id of seen) {
      const m = movieById.get(id)
      if (!m) continue
      categoryCount.set(m.category, (categoryCount.get(m.category) ?? 0) + 1)
      countryCount.set(m.country, (countryCount.get(m.country) ?? 0) + 1)
    }
    const topCategory = [...categoryCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
    const topCountry = [...countryCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]

    const candidates = cards.filter((m) => !seen.has(m.id))
    if (candidates.length === 0) return { list: [], topCategory, topCountry }

    if (!topCategory && !topCountry) {
      // No signal yet (fresh account) - newest unwatched films.
      return { list: sortLatest(candidates, 10), topCategory, topCountry }
    }

    const scored = candidates.map((m) => ({
      m,
      score: (topCategory && m.category === topCategory ? 2 : 0) + (topCountry && m.country === topCountry ? 1 : 0),
    }))
    scored.sort(
      (a, b) => b.score - a.score || +new Date(b.m.createdAt) - +new Date(a.m.createdAt),
    )
    return { list: scored.slice(0, 10).map((s) => s.m), topCategory, topCountry }
  }, [cards, watchHistory, watchlistIds])

  if (!ready || movies.list.length < 2) return null

  const label = movies.topCategory ? (CATEGORY_LABEL[movies.topCategory] ?? movies.topCategory) : null
  const title = label ? `Because you watched ${label}` : 'Recommended for you'
  const description = label
    ? `More ${label}${movies.topCountry ? ` from ${movies.topCountry} and beyond` : ''}, picked from your taste - not an algorithm's.`
    : 'Films matching your taste, picked from your watch history.'

  return (
    <div className="mx-auto w-full max-w-7xl">
      <MovieCarousel title={title} description={description} movieIds={movies.list.map((m) => m.id)} />
    </div>
  )
}
