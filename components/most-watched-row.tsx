'use client'

import { useState } from 'react'
import { MovieCarousel } from '@/components/movie-carousel'
import { rankMostWatched, useWatchHistory } from '@/lib/watch-history'
import type { WatchPeriod } from '@/lib/watch-history'
import { cn } from '@/lib/utils'

/**
 * "Most watched on SabiFlix" — a community pulse rail computed from watch
 * history (recency-weighted, so one binge session can't dominate). Framed as
 * a quiet pulse beneath the curated rows — not as an algorithm's picks.
 */
export function MostWatchedRow() {
  const { entries, ready } = useWatchHistory()
  const [period, setPeriod] = useState<WatchPeriod>('all')
  const ranked = rankMostWatched(entries, { period, limit: 10 })
  const movies = ranked.map((r) => r.movie)

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
        movies={movies}
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