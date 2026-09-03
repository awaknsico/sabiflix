import Link from 'next/link'
import Image from 'next/image'
import { BadgeCheck, Clapperboard, Play, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { WatchlistToggle } from '@/components/watchlist-toggle'
import { cn } from '@/lib/utils'
import type { Movie } from '@/lib/mock-data'

const categoryLabel: Record<Movie['category'], string> = {
  feature: 'Feature',
  short: 'Short',
  documentary: 'Documentary',
}

/**
 * Curation badge — communicates *why* a film is on SabiFlix.
 * Each variant has a distinct color + icon for instant recognition at any card size.
 */
function CurationBadge({ type }: { type: NonNullable<Movie['curationType']> }) {
  if (type === 'admin') {
    return (
      <span className="inline-flex shrink-0 items-center gap-0.5 text-primary" title="Curated by a SabiFlix moderator">
        <BadgeCheck className="size-3" aria-label="Curated by a SabiFlix moderator" />
      </span>
    )
  }
  if (type === 'requested') {
    return (
      <span className="inline-flex shrink-0 items-center gap-0.5 text-cyan-400" title="Added because the community requested it">
        <Users className="size-3" aria-label="Added because the community requested it" />
      </span>
    )
  }
  return (
    <span className="inline-flex shrink-0 items-center gap-0.5 text-emerald-400" title="Submitted directly by the filmmaker">
      <Clapperboard className="size-3" aria-label="Submitted directly by the filmmaker" />
    </span>
  )
}

export function MovieCard({
  movie,
  className,
  priority = false,
}: {
  movie: Movie
  className?: string
  priority?: boolean
}) {
  return (
    <Link
      href={`/movie/${movie.id}`}
      className={cn(
        'container-card group relative flex flex-col overflow-hidden rounded-xl',
        'border border-white/[0.06] bg-gradient-to-b from-card to-background',
        'outline-none transition-all duration-300',
        'hover:-translate-y-1.5 hover:border-primary/40 hover:shadow-[0_20px_50px_-16px_rgba(0,0,0,0.85),0_0_0_1px_rgba(240,201,135,0.12)]',
        'focus-visible:ring-3 focus-visible:ring-ring/50',
        className,
      )}
    >
      {/* ── Top section: Category | Year | Favorite ── */}
      <div className="flex items-start justify-between gap-2 px-2 pb-1 pt-2 @md:px-3 @md:pt-3">
        <div className="flex flex-col gap-1">
          <Badge
            variant="secondary"
            className="w-fit border border-white/10 bg-white/5 text-[0.5rem] uppercase tracking-[0.1em] text-foreground/90 @md:text-[0.625rem]"
          >
            {categoryLabel[movie.category]}
          </Badge>
          <span className="text-[0.55rem] font-medium tabular-nums text-foreground/70 @md:text-[0.6875rem]">
            {movie.year}
          </span>
        </div>
        <WatchlistToggle movieId={movie.id} title={movie.title} variant="overlay" size="sm" />
      </div>

      {/* ── Middle section: Poster (16:9-ish) ── */}
      <div className="relative aspect-[3/2] w-full overflow-hidden bg-[#1C1E24]">
        <Image
          src={movie.posterUrl || '/placeholder.svg'}
          alt={`Poster for ${movie.title}`}
          fill
          sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 220px"
          priority={priority}
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-110"
        />
        {/* Always-on bottom scrim */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0B0F]/95 via-[#0A0B0F]/10 to-transparent" />

        {/* Watch pill — revealed on hover */}
        <div className="absolute inset-x-0 bottom-0 flex translate-y-2 items-center justify-center pb-3 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-ember px-3.5 py-1.5 text-xs font-semibold text-[#14150E] shadow-[0_0_20px_rgba(240,201,135,0.35)]">
            <Play className="size-3.5 fill-current" />
            Watch
          </span>
        </div>
      </div>

      {/* ── Bottom section: Title | Actors | Country ── */}
      <div className="flex flex-1 flex-col gap-1 px-2 pb-2 @md:px-3 @md:pb-3">
        {/* Title: 2 lines */}
        <h3
          className="line-clamp-2 font-serif text-[0.75rem] font-semibold leading-tight @md:text-[0.9rem] @lg:text-[1rem]"
          title={movie.title}
        >
          {movie.title}
        </h3>
        {/* Actors + Country: 2 lines */}
        <div className="space-y-0.5">
          <p className="flex items-center gap-1 truncate text-[0.55rem] uppercase tracking-[0.06em] text-foreground/50 @md:text-[0.6875rem] @md:tracking-[0.08em]">
            {movie.curationType ? (
              <>
                <CurationBadge type={movie.curationType} />
                <span className="text-foreground/25">|</span>
              </>
            ) : null}
            <span className="truncate">
              {(movie.actors ?? []).join(' | ')}
            </span>
          </p>
          <p className="truncate text-[0.55rem] uppercase tracking-[0.06em] text-foreground/50 @md:text-[0.6875rem] @md:tracking-[0.08em]">
            {movie.country}
          </p>
        </div>
      </div>
    </Link>
  )
}

export function MovieCardSkeleton() {
  return (
    <div className="container-card flex flex-col overflow-hidden rounded-xl border border-white/[0.06] bg-gradient-to-b from-card to-background">
      {/* Top section skeleton */}
      <div className="flex items-start justify-between gap-2 px-2 pb-1 pt-2 @md:px-3 @md:pt-3">
        <div className="flex flex-col gap-1">
          <div className="h-4 w-14 animate-pulse rounded-full bg-white/10" />
          <div className="h-3 w-8 animate-pulse rounded bg-white/10" />
        </div>
        <div className="size-7 animate-pulse rounded-full bg-white/10" />
      </div>
      {/* Poster skeleton */}
      <div className="relative aspect-[3/2] w-full bg-[#1C1E24]" />
      {/* Bottom section skeleton */}
      <div className="flex flex-col gap-1.5 px-2 pb-2 @md:px-3 @md:pb-3">
        <div className="h-3.5 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-3.5 w-1/2 animate-pulse rounded bg-muted" />
        <div className="h-2.5 w-2/3 animate-pulse rounded bg-muted" />
      </div>
    </div>
  )
}
