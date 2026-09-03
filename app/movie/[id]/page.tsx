import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { ArrowLeft, Calendar, Globe, Languages, Tag } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { WatchPlayer } from '@/components/watch-player'
import { WatchlistToggle } from '@/components/watchlist-toggle'
import { ShareActions } from '@/components/share-actions'
import { MoviePreview } from '@/components/movie-preview'
import { PreviewPlayer } from '@/components/preview-player'
import { RelatedFilms } from '@/components/related-films'
import { lookupMovieWithSource } from '@/lib/server-catalog'
import {
  movies,
  movieCast,
  CATEGORIES,
} from '@/lib/mock-data'

export function generateStaticParams() {
  return movies.map((m) => ({ id: m.id }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const movie = (await lookupMovieWithSource(id))?.movie
  if (!movie) return { title: 'Film not found — SabiFlix' }
  return {
    title: `${movie.title} (${movie.year}) — SabiFlix`,
    description: movie.synopsis,
  }
}

const categoryLabel = Object.fromEntries(CATEGORIES.map((c) => [c.value, c.label]))

export default async function MovieDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ t?: string }>
}) {
  const { id } = await params
  const { t } = await searchParams
  const found = await lookupMovieWithSource(id)
  const movie = found?.movie
  if (!movie) notFound()

  /* Resume position from "Continue watching" deep links (?t=<seconds>). */
  const parsedT = Number(t)
  const startAt = Number.isFinite(parsedT) && parsedT > 0 ? Math.floor(parsedT) : 0

  const source = found?.source
  const cast = movieCast[movie.id] ?? []
  /* Related: ranked blend of country > language > category, curated as a nudge. */
  const related = movies
    .filter((m) => m.id !== movie.id && m.isActive)
    .map((m) => ({
      movie: m,
      score:
        (m.country === movie.country ? 4 : 0) +
        (m.language === movie.language ? 2 : 0) +
        (m.category === movie.category ? 1 : 0) +
        (m.curationType === 'admin' ? 0.5 : 0),
    }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((r) => r.movie)

  /* Editorial heading — lean into the strongest shared attribute. */
  const relatedHeading =
    related.length > 0 && related.every((m) => m.country === movie.country)
      ? `More from ${movie.country}`
      : 'More like this'

  const facts = [
    { icon: Calendar, label: 'Year', value: String(movie.year) },
    { icon: Globe, label: 'Country', value: movie.country },
    { icon: Languages, label: 'Language', value: movie.language },
    { icon: Tag, label: 'Category', value: categoryLabel[movie.category] ?? movie.category },
  ]

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        {/* Backdrop */}
        <div className="relative">
          <MoviePreview
            posterUrl={movie.posterUrl}
            title={movie.title}
            youtubeVideoId={source?.youtubeVideoId}
            previewStartSeconds={source?.previewStartSeconds}
          />

          <div className="relative mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
            <Button
              variant="ghost"
              size="sm"
              render={<Link href="/catalog" />}
              className="mb-6"
            >
              <ArrowLeft data-icon="inline-start" />
              Back to catalog
            </Button>

            <div className="flex flex-col gap-8 pb-8 md:flex-row md:gap-10">
              {/* Poster */}
              <div className="mx-auto w-52 shrink-0 sm:w-64 md:mx-0">
                <div className="relative aspect-[2/3] w-full overflow-hidden rounded-2xl border border-border/60 shadow-2xl">
                  <Image
                    src={movie.posterUrl || '/placeholder.svg'}
                    alt={`Poster for ${movie.title}`}
                    fill
                    sizes="256px"
                    className="object-cover"
                  />
                </div>
              </div>

              {/* Info */}
              <div className="flex flex-1 flex-col gap-5">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge>{categoryLabel[movie.category] ?? movie.category}</Badge>
                    {!movie.isActive ? (
                      <Badge variant="secondary">Coming soon</Badge>
                    ) : null}
                  </div>
                  <h1 className="font-serif text-3xl font-bold tracking-tight text-balance sm:text-4xl lg:text-5xl">
                    {movie.title}
                  </h1>
                  {movie.alternativeTitles.length > 0 ? (
                    <p className="text-sm italic text-muted-foreground">
                      Also known as {movie.alternativeTitles.join(', ')}
                    </p>
                  ) : null}
                </div>

                <p className="max-w-2xl leading-relaxed text-muted-foreground text-pretty">
                  {movie.synopsis}
                </p>

                <dl className="grid grid-cols-2 gap-4 sm:max-w-lg sm:grid-cols-4">
                  {facts.map((f) => (
                    <div key={f.label} className="flex flex-col gap-1">
                      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <f.icon className="size-3.5" />
                        {f.label}
                      </dt>
                      <dd className="text-sm font-medium">{f.value}</dd>
                    </div>
                  ))}
                </dl>

                {cast.length > 0 ? (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs text-muted-foreground">Starring</span>
                    <div className="flex flex-wrap gap-2">
                      {cast.map((actor) => (
                        <Badge key={actor} variant="outline">
                          {actor}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  {source ? (
                    <>
                      <WatchPlayer
                        youtubeVideoId={source.youtubeVideoId}
                        title={`${movie.title} (${movie.year})`}
                        startAt={startAt}
                        movieId={movie.id}
                      />
                      <PreviewPlayer
                        youtubeVideoId={source.youtubeVideoId}
                        title={movie.title}
                        startSeconds={source.previewStartSeconds}
                      />
                    </>
                  ) : (
                    <Button size="lg" disabled>
                      Not yet available
                    </Button>
                  )}
                  <WatchlistToggle movieId={movie.id} title={movie.title} variant="button" />
                </div>
                <ShareActions
                  title={`${movie.title} (${movie.year})`}
                  path={`/movie/${movie.id}`}
                />
                {source ? (
                  <p className="text-xs text-muted-foreground">
                    Curated source: {source.youtubeChannelName} &middot; {source.quality}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {/* Related — actor-aware picks, history-aware once the store hydrates */}
        {related.length > 0 ? (
          <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            <RelatedFilms movie={movie} fallback={related} fallbackHeading={relatedHeading} />
          </section>
        ) : null}
      </main>

      <SiteFooter />
    </div>
  )
}
