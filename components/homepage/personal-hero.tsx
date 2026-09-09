'use client'

import Link from 'next/link'
import { ArrowRight, LayoutDashboard, Play, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useHomepageData } from '@/components/homepage/homepage-data-context'
import { resumeCandidates } from '@/lib/watch-history'
import type { Movie } from '@/lib/types'

/**
 * Signed-in welcome hero — replaces the marketing hero for members.
 *
 * Two variants (all data comes from the already-fetched homepage context,
 * so this adds zero API calls):
 * - Returning viewer: greeting + Resume pill for the latest unfinished film.
 * - Fresh account: onboarding prompt pointing at Curator's Picks.
 */
export function PersonalHero({ displayName, catalog }: { displayName: string; catalog: Movie[] }) {
  const { watchHistory, ready } = useHomepageData()
  const movieById = new Map(catalog.map((m) => [m.id, m] as const))

  const latest = resumeCandidates(watchHistory, { limit: 1 })
    .map((entry) => ({ entry, movie: movieById.get(entry.movieId) }))
    .find((item): item is { entry: (typeof watchHistory)[number]; movie: Movie } =>
      Boolean(item.movie?.isActive),
    )

  const firstName = displayName.split(/\s+/)[0] || displayName

  return (
    <section className="relative overflow-hidden border-b border-white/[0.06] bg-gradient-to-b from-primary/[0.07] via-transparent to-transparent">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-start gap-5 px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-foreground/90 backdrop-blur-md">
          <Sparkles className="size-3.5 text-primary" />
          Welcome back{firstName ? `, ${firstName}` : ''}
        </span>
        <h1 className="max-w-3xl font-serif text-3xl font-bold leading-[1.05] tracking-tight text-balance sm:text-4xl lg:text-5xl">
          {ready && latest ? 'Pick up right where you left off.' : 'Your cinema is ready.'}
        </h1>
        <p className="max-w-xl text-base leading-relaxed text-muted-foreground text-pretty sm:text-lg">
          {ready && latest
            ? `${latest.movie.title} is waiting — resume in one tap, or browse something new.`
            : 'Start with Curator\u2019s Picks, save films to your watchlist, and we\u2019ll keep your place.'}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          {ready && latest ? (
            <Button size="lg" variant="premium" render={<Link href={`/movie/${latest.movie.id}?t=${latest.entry.progressSeconds}`} />}>
              <Play className="fill-current" data-icon="inline-start" />
              Resume {latest.movie.title}
            </Button>
          ) : (
            <Button size="lg" variant="premium" render={<Link href="/catalog" />}>
              <Play className="fill-current" data-icon="inline-start" />
              Browse the catalog
            </Button>
          )}
          <Button
            size="lg"
            variant="outline"
            render={<Link href="/dashboard" />}
            className="rounded-full border-white/15 bg-white/[0.04] backdrop-blur-md hover:border-white/30 hover:bg-white/10"
          >
            <LayoutDashboard data-icon="inline-start" />
            My dashboard
            <ArrowRight data-icon="inline-end" />
          </Button>
        </div>
      </div>
    </section>
  )
}
