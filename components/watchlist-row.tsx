'use client'

import { MovieCard } from '@/components/movie-card'
import type { MovieCardDto } from '@/lib/types'
import { useHomepageData } from '@/components/homepage/homepage-data-context'

/**
 * "Your watchlist" home row — only renders once hydration has read the store
 * and the viewer has actually saved something. Renders nothing otherwise.
 *
 * Uses shared homepage data to avoid duplicate API calls.
 */
export function WatchlistRow({ cards }: { cards: MovieCardDto[] }) {
  const { watchlistIds, ready } = useHomepageData()
  const movieById = new Map(cards.map((m) => [m.id, m] as const))

  const movies = watchlistIds
    .map((id) => movieById.get(id))
    .filter((m): m is MovieCardDto => Boolean(m))
    .slice(0, 5)

  if (!ready || movies.length === 0) return null

  return (
    <section className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-1.5">
        <h2 className="font-serif text-xl font-semibold tracking-tight sm:text-2xl">
          Your watchlist
        </h2>
        <p className="text-sm text-muted-foreground">
          Saved by you, for later. Yours — not an algorithm&rsquo;s.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {movies.map((movie) => (
          <MovieCard key={movie.id} movie={movie} />
        ))}
      </div>
    </section>
  )
}
