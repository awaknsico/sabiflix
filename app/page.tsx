import Link from 'next/link'
import { ArrowRight, BadgeCheck, Play, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { HomepageDataProvider } from '@/components/homepage/homepage-data-context'
import { PersonalHero } from '@/components/homepage/personal-hero'
import { RecommendedRow } from '@/components/homepage/recommended-row'
import { MovieCarousel } from '@/components/movie-carousel'
import { MovieCard } from '@/components/movie-card'
import { HeroSlideshow, type HeroSlide } from '@/components/hero-slideshow'
import { ContinueWatching } from '@/components/continue-watching'
import { WatchlistRow } from '@/components/watchlist-row'
import { NewSinceVisit } from '@/components/new-since-visit'
import { MostWatchedRow } from '@/components/most-watched-row'
import { getFeaturedPlaylists, getPublishedEntries } from '@/lib/server-catalog'
import { getCurrentUser } from '@/lib/api/auth'
import { toCardDto } from '@/lib/types'

/** The seeded "Curator's Picks" playlist id (see d1/seed.sql). */
const CURATORS_PICKS_ID = '0190c0de-3000-7000-8000-000000000001'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  // Every row below is served by Cloudflare D1 — no bundled mock catalog.
  // One indexed users.clerk_id read detects signed-in members (page is
  // force-dynamic, so Clerk's auth() works here) for the personalized view.
  const [publishedEntries, member] = await Promise.all([
    getPublishedEntries(),
    getCurrentUser().catch(() => null),
  ])
  const featuredPlaylists = await getFeaturedPlaylists(publishedEntries)
  const catalog = publishedEntries.map((e) => e.movie)

  const latest = [...catalog]
    .filter((m) => m.isActive)
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, 10)
  // Lean card projections — the homepage passes these (not full `Movie`) to
  // every client section, which is what shrinks the RSC flight payload.
  const cards = catalog.map(toCardDto)

  /* Hero reel — the Curator's Picks playlist doubles as the featured backdrop. */
  const heroSource = (featuredPlaylists.find((p) => p.id === CURATORS_PICKS_ID) ?? featuredPlaylists[0])
  const heroSlides: HeroSlide[] = (heroSource?.movies ?? [])
    .filter((m) => m.isActive)
    .map((m) => ({ id: m.id, title: m.title, year: m.year, image: m.posterUrl }))

  // Extract movie IDs for filtering watch history/watchlist
  const movieIds = catalog.map((m) => m.id)

  /* Signed-in members get the "home base" view: no marketing hero, personal
   * rows first, plus a taste-based recommendation rail. Suspended accounts
   * fall back to the public view. */
  const signedIn = member !== null && member.status !== 'suspended'

  if (signedIn) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />

        <main className="flex flex-1 flex-col gap-12 pb-8">
          {/* Shared data provider — fetches watch history & watchlist once for all rows */}
          <HomepageDataProvider movieIds={movieIds}>
            {/* Welcome-back hero with one-tap resume */}
            <PersonalHero displayName={member.displayName || 'Member'} cards={cards} />

            {/* Continue watching — pick up where you left off */}
            <ContinueWatching cards={cards} />

            {/* Your watchlist — renders once the viewer has saved something */}
            <WatchlistRow cards={cards} />

            {/* Because you watched … — taste-based recommendations */}
            <RecommendedRow cards={cards} />
          </HomepageDataProvider>

          {/* Featured Playlists */}
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-12">
            {featuredPlaylists.map((playlist, i) => (
              <MovieCarousel
                key={playlist.id}
                index={i + 1}
                title={playlist.name}
                description={playlist.description ?? undefined}
                movies={playlist.movies.map((m) => toCardDto(m))}
              />
            ))}
          </div>

          {/* Most watched — community pulse, computed from watch history */}
          <MostWatchedRow cards={cards} />

          {/* Latest additions */}
          <section className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] tabular-nums text-primary">
                  No. {String(featuredPlaylists.length + 1).padStart(2, '0')}
                </span>
                <h2 className="font-serif text-xl font-semibold tracking-tight sm:text-2xl">
                  Latest Additions
                </h2>
                <p className="text-sm text-muted-foreground">
                  Freshly curated and added to the library.
                </p>
                <NewSinceVisit cards={cards} />
              </div>
              <Button
                variant="ghost"
                size="sm"
                render={<Link href="/catalog" />}
                className="rounded-full text-muted-foreground hover:bg-white/5 hover:text-foreground"
              >
                View all
                <ArrowRight data-icon="inline-end" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {latest.map((movie, i) => (
                <MovieCard key={movie.id} movie={movie} priority={i < 5} />
              ))}
            </div>
          </section>
        </main>

        <SiteFooter />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex flex-1 flex-col gap-16 pb-8">
        {/* Hero — quiet cinema reel behind the identity line, kept calm (audit 5.5) */}
        <HeroSlideshow slides={heroSlides}>
          {/* Content — kicker pill → headline → CTAs → trust chip */}
          <div className="relative mx-auto flex max-w-7xl flex-col items-start gap-6 px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-foreground/90 backdrop-blur-md">
              <Sparkles className="size-3.5 text-primary" />
              Curated by humans, not algorithms
            </span>
            <h1 className="max-w-3xl font-serif text-4xl font-bold leading-[1.02] tracking-tight text-balance sm:text-5xl lg:text-6xl">
              African stories, worth your full attention.
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-muted-foreground text-pretty">
              Stream the best of Nollywood, African cinema, short films, and documentaries
              in a calm, distraction-free player. No autoplay traps. No endless scroll.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="lg" variant="premium" render={<Link href="/catalog" />}>
                <Play className="fill-current" data-icon="inline-start" />
                Browse the catalog
              </Button>
              <Button
                size="lg"
                variant="outline"
                render={<Link href="/sign-up" />}
                className="rounded-full border-white/15 bg-white/[0.04] backdrop-blur-md hover:border-white/30 hover:bg-white/10"
              >
                Create free account
                <ArrowRight data-icon="inline-end" />
              </Button>
            </div>
            <span className="inline-flex items-center gap-2 text-sm text-foreground/60">
              <BadgeCheck className="size-4 text-verified" />
              Every film reviewed by a moderator for quality.
            </span>
          </div>
        </HeroSlideshow>

        {/* Shared data provider — fetches watch history & watchlist once for all rows.
            Signed-out visitors never fetch: both endpoints 401 without a session,
            so the provider stays disabled and children render empty states. */}
        <HomepageDataProvider movieIds={movieIds} enabled={false}>
          {/* Continue watching — pick up where you left off */}
          <ContinueWatching cards={cards} />

          {/* Your watchlist — renders once the viewer has saved something */}
          <WatchlistRow cards={cards} />
        </HomepageDataProvider>

        {/* Featured Playlists — lean card DTOs, not full Movie objects */}
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-12">
          {featuredPlaylists.map((playlist, i) => (
            <MovieCarousel
              key={playlist.id}
              index={i + 1}
              title={playlist.name}
              description={playlist.description ?? undefined}
              movies={playlist.movies.map((m) => toCardDto(m))}
            />
          ))}
        </div>

        {/* Most watched — community pulse, computed from watch history */}
        <MostWatchedRow cards={cards} />

        {/* Latest additions */}
        <section className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] tabular-nums text-primary">
                No. {String(featuredPlaylists.length + 1).padStart(2, '0')}
              </span>
              <h2 className="font-serif text-xl font-semibold tracking-tight sm:text-2xl">
                Latest Additions
              </h2>
              <p className="text-sm text-muted-foreground">
                Freshly curated and added to the library.
              </p>
              <NewSinceVisit cards={cards} />
            </div>
            <Button
              variant="ghost"
              size="sm"
              render={<Link href="/catalog" />}
              className="rounded-full text-muted-foreground hover:bg-white/5 hover:text-foreground"
            >
              View all
              <ArrowRight data-icon="inline-end" />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {latest.map((movie, i) => (
              <MovieCard key={movie.id} movie={movie} priority={i < 5} />
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
