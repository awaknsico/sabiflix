'use client'

import { MovieCard } from '@/components/movie-card'
import { Separator } from '@/components/ui/separator'
import type { Movie } from '@/lib/mock-data'
import { recommendFor, useWatchHistory } from '@/lib/watch-history'

/**
 * History-aware related picks for the film page. Once the watch-history store
 * hydrates, the section is computed from the shared-attribute blend (actors
 * heaviest) with already-watched titles excluded; until then — and whenever
 * the blend comes up empty — the server's fallback list renders unchanged.
 * Headings stay editorial ("More films starring…"), never algorithm language.
 */
export function RelatedFilms({
  movie,
  fallback,
  fallbackHeading,
  catalog = [],
}: {
  movie: Movie
  fallback: Movie[]
  fallbackHeading: string
  /** Full active catalog (D1-backed) used for history-aware re-blending. */
  catalog?: Movie[]
}) {
  const { entries, ready } = useWatchHistory()

  if (!ready) return null

  const recommended = recommendFor(movie, entries, catalog)
  const list = recommended.length > 0 ? recommended : fallback
  if (list.length === 0) return null

  let heading = fallbackHeading
  if (recommended.length > 0) {
    const sharedActor = (movie.actors ?? []).find((a) =>
      recommended.some((r) => (r.actors ?? []).includes(a)),
    )
    if (sharedActor) {
      heading = `More films starring ${sharedActor}`
    } else if (recommended.every((r) => r.country === movie.country)) {
      heading = `More from ${movie.country}`
    } else {
      heading = 'More like this'
    }
  }

  return (
    <>
      <Separator className="mb-8" />
      <h2 className="mb-6 font-serif text-xl font-semibold tracking-tight sm:text-2xl">
        {heading}
      </h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {list.map((m) => (
          <MovieCard key={m.id} movie={m} />
        ))}
      </div>
    </>
  )
}