'use client'

import { useRef } from 'react'
import type { ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MovieCard } from '@/components/movie-card'
import type { Movie } from '@/lib/mock-data'

export function MovieCarousel({
  title,
  description,
  movies,
  index,
  action,
}: {
  title: string
  description?: string
  movies: Movie[]
  /** Section leader — renders the gold "No. 01" kicker (audit step 6). */
  index?: number
  /** Optional extra header control (e.g. a segmentation toggle), shown on the right. */
  action?: ReactNode
}) {
  const scrollerRef = useRef<HTMLDivElement>(null)

  function scrollBy(direction: 1 | -1) {
    const el = scrollerRef.current
    if (!el) return
    el.scrollBy({ left: direction * (el.clientWidth * 0.8), behavior: 'smooth' })
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-1.5">
          {typeof index === 'number' ? (
            <span className="text-xs font-semibold uppercase tracking-[0.18em] tabular-nums text-primary">
              No. {String(index).padStart(2, '0')}
            </span>
          ) : null}
          <h2 className="font-serif text-xl font-semibold tracking-tight sm:text-2xl">
            {title}
          </h2>
          {description ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {action ? <div className="shrink-0">{action}</div> : null}
          <div className="hidden gap-2 sm:flex">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Scroll ${title} left`}
              onClick={() => scrollBy(-1)}
              className="rounded-full border border-white/10 bg-white/5 backdrop-blur-md hover:bg-white/10"
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Scroll ${title} right`}
              onClick={() => scrollBy(1)}
              className="rounded-full border border-white/10 bg-white/5 backdrop-blur-md hover:bg-white/10"
            >
              <ChevronRight />
            </Button>
          </div>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-4 pb-2 sm:px-6 lg:px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {movies.map((movie) => (
          <div
            key={movie.id}
            className="w-[42vw] shrink-0 snap-start sm:w-44 lg:w-48"
          >
            <MovieCard movie={movie} />
          </div>
        ))}
      </div>
    </section>
  )
}
