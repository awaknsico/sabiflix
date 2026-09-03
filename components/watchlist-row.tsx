'use client'

import { MovieCard } from '@/components/movie-card'
import { getMovieById } from '@/lib/mock-data'
import type { Movie } from '@/lib/mock-data'
import { useWatchlist } from '@/lib/watchlist'

/**
 * "Your watchlist" home row — only renders once hydration has read the store
 * and the viewer has actually saved something. Renders nothing otherwise.
 */
export function WatchlistRow() {
  const { ids, ready } = useWatchlist()

  const movies = ids
    .map((id) => getMovieById(id))
    .filter((m): m is Movie => m !== undefined && m.isActive)
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
