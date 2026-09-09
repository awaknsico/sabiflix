'use client'

import { useMemo, useState } from 'react'
import { MovieCarousel } from '@/components/movie-carousel'
import { rankMostWatched } from '@/lib/watch-history'
import type { WatchPeriod } from '@/lib/watch-history'
import type { Movie, MovieCardDto } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useHomepageData } from '@/components/homepage/homepage-data-context'

/**
 * "Most watched on SabiFlix" — a community pulse rail computed from watch
 * history (recency-weighted, so one binge session can't dominate). Framed as
 * a quiet pulse beneath the curated rows — not as an algorithm's picks.
 *
 * Uses shared homepage data to avoid duplicate API calls.
 */
export function MostWatchedRow() {
  const { watchHistory, ready, cards } = useHomepageData()
  const [period, setPeriod] = useState<WatchPeriod>('all')
  // rankMostWatched needs full Movies for its internal map — the DTO's id set
  // is enough to resolve here; ranking operates on history entries only.
  const ranked = useMemo(() => {
    const byId = new Map(cards.map((m) => [m.id, m] as const))
    return rankMostWatched(
      watchHistory,
      byId as unknown as Map<string, Movie>,
      { period, limit: 10 },
    ).map((r) => r.movie.id)
  }, [cards, watchHistory, period])
  const movies = useMemo(() => {
    const byId = new Map(cards.map((m) => [m.id, m] as const))
    return ranked.map((id) => byId.get(id)).filter((m): m is MovieCardDto => Boolean(m))
  }, [cards, ranked])

  if (!ready || movies.length < 2) return null

  return (
    <div className="mx-auto w-full max-w-7xl">
      <MovieCarousel
        title={period === 'week' ? 'Most watched this week' : 'Most watched on SabiFlix'}
        description={
          period === 'week'
            ? 'The films viewers are coming back to this week.'
            : 'The films viewers keep coming back to.'
        }
        movieIds={movies.map((m) => m.id)}
        action={
          <div className="flex gap-1 rounded-full border border-white/10 bg-white/5 p-1 backdrop-blur-md">
            {(['all', 'week'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors',
                  period === p
                    ? 'bg-ember text-[#14150E]'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {p === 'all' ? 'All time' : 'This week'}
              </button>
            ))}
          </div>
        }
      />
    </div>
  )
}