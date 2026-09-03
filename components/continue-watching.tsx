'use client'

import Image from 'next/image'
import Link from 'next/link'
import { X } from 'lucide-react'
import { getMovieById } from '@/lib/mock-data'
import type { Movie } from '@/lib/mock-data'
import { resumeCandidates, useWatchHistory } from '@/lib/watch-history'
import type { WatchHistoryItem } from '@/lib/watch-history'
import { cn } from '@/lib/utils'

function formatDuration(totalSeconds: number) {
  const mins = Math.max(1, Math.round(totalSeconds / 60))
  if (mins < 60) return `${mins} min`
  const hours = Math.floor(mins / 60)
  const rest = mins % 60
  return rest ? `${hours}h ${rest}m` : `${hours}h`
}

/**
 * "Pick up where you left off" — the quiet return-rate row. Reads live watch
 * history and links straight into the player at the saved position (`?t=`).
 */
export function ContinueWatching() {
  const { entries, ready, remove } = useWatchHistory()

  const items = resumeCandidates(entries, { limit: 5 })
    .map((entry) => ({ entry, movie: getMovieById(entry.movieId) }))
    .filter((item): item is { entry: WatchHistoryItem; movie: Movie } => item.movie !== undefined)

  if (!ready || items.length === 0) return null

  return (
    <section className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-1.5">
        <h2 className="font-serif text-xl font-semibold tracking-tight sm:text-2xl">
          Continue watching
        </h2>
        <p className="text-sm text-muted-foreground">
          Your unfinished stories, kept exactly where you left them.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {items.map(({ entry, movie }) => {
          const pct =
            entry.durationSeconds > 0
              ? Math.min(100, Math.round((entry.progressSeconds / entry.durationSeconds) * 100))
              : 0
          const remaining = formatDuration(entry.durationSeconds - entry.progressSeconds)
          return (
            <Link
              key={entry.id}
              href={`/movie/${movie.id}?t=${entry.progressSeconds}`}
              className={cn(
                'group relative flex flex-col overflow-hidden rounded-xl',
                'border border-white/[0.06] bg-gradient-to-b from-card to-background',
                'outline-none transition-all duration-300',
                'hover:-translate-y-1.5 hover:border-primary/40 hover:shadow-[0_20px_50px_-16px_rgba(0,0,0,0.85),0_0_0_1px_rgba(240,201,135,0.12)]',
                'focus-visible:ring-3 focus-visible:ring-ring/50',
              )}
            >
              <div className="relative aspect-[2/3] w-full overflow-hidden bg-[#1C1E24]">
                {/* Dismiss — remove from history without leaving the page */}
                <button
                  type="button"
                  aria-label={`Remove ${movie.title} from watch history`}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    remove(movie.id)
                  }}
                  className="absolute right-2 top-2 z-10 rounded-full bg-black/60 p-1.5 text-white/70 backdrop-blur-sm transition-colors hover:bg-black/80 hover:text-white focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <X className="size-3.5" />
                </button>
                <Image
                  src={movie.posterUrl || '/placeholder.svg'}
                  alt={`Poster for ${movie.title}`}
                  fill
                  sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 220px"
                  className="object-cover transition-transform duration-500 ease-out group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A0B0F]/95 via-[#0A0B0F]/10 to-transparent" />
                {/* Resume pill — revealed on hover (matches MovieCard Watch pill) */}
                <div className="absolute inset-x-0 bottom-0 flex translate-y-2 items-center justify-center pb-3 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-ember px-3.5 py-1.5 text-xs font-semibold text-[#14150E] shadow-[0_0_20px_rgba(240,201,135,0.35)]">
                    Resume
                  </span>
                </div>
                {/* Saved position — ember progress line on the poster's bottom edge */}
                <div className="absolute inset-x-0 bottom-0 h-1 bg-white/15">
                  <div className="h-full bg-ember" style={{ width: `${pct}%` }} />
                </div>
              </div>
              <div className="flex flex-col gap-1 p-3">
                <h3 className="truncate font-serif font-semibold leading-tight" title={movie.title}>
                  {movie.title}
                </h3>
                <p className="text-[0.6875rem] uppercase tracking-[0.14em] tabular-nums text-foreground/50">
                  {pct}% &middot; {remaining} left
                </p>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
