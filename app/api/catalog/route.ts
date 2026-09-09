import { handler, ok, Errors } from '@/lib/api/envelope'
import { requireAdmin } from '@/lib/api/auth'
import { checkRateLimit } from '@/lib/api/rate-limit'
import {
  getPublishedEntries,
  removePublishedEntry,
  upsertPublishedEntry,
} from '@/lib/server-catalog'
import type { Movie, MovieCategory, MovieSource } from '@/lib/types'

/**
 * Admin console publish/read/delete for the published catalog.
 * Films written here get a real, navigable `/movie/<id>` page from D1.
 *
 * GET  /api/catalog — public: list published catalog
 * POST /api/catalog — admin only: publish a film
 * DELETE /api/catalog?id=xxx — admin only: remove a published film
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = handler(async (request: Request) => {
  // Rate limit: 60 requests per minute per IP
  const rateLimit = await checkRateLimit(request, 'catalog', 60, 60)
  if (!rateLimit.allowed) return rateLimit.response

  const entries = await getPublishedEntries()
  const res = ok({
    movies: entries.map((e) => e.movie),
    sources: entries.map((e) => e.source),
  })
  // Public catalog is immutable-ish — edge-cache it hard. CDN caches for 5 min,
  // serves stale while it refreshes for up to a day (poor-network friendly).
  res.headers.set(
    'Cache-Control',
    'public, max-age=60, s-maxage=300, stale-while-revalidate=86400',
  )
  return res
})

const MOVIE_CATEGORIES = new Set<MovieCategory>(['feature', 'short', 'documentary'])

export const POST = handler(async (request: Request) => {
  await requireAdmin()
  const body = (await request.json().catch(() => null)) as {
    movie?: Partial<Movie>
    source?: Partial<MovieSource>
  } | null

  if (!body?.movie?.title?.trim()) {
    throw Errors.validation('A title is required to publish.')
  }

  const title = body.movie.title.trim()
  const now = new Date().toISOString()
  const presetId = body.movie.id?.trim() || undefined

  const movie: Movie = {
    id:
      presetId && presetId.startsWith('mov-')
        ? presetId
        : `mov-pub-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title,
    alternativeTitles: [],
    actors: Array.isArray(body.movie.actors) ? body.movie.actors : [],
    year: Number(body.movie.year) || new Date().getFullYear(),
    country: body.movie.country || 'Nigeria',
    language: body.movie.language || 'English',
    category: MOVIE_CATEGORIES.has(body.movie.category as MovieCategory)
      ? (body.movie.category as MovieCategory)
      : 'feature',
    curationType: body.movie.curationType || undefined,
    synopsis: body.movie.synopsis?.trim() || '',
    posterUrl: body.movie.posterUrl?.trim() || '/placeholder.svg',
    isActive: body.movie.isActive ?? true,
    createdAt: body.movie.createdAt || now,
    updatedAt: now,
  }

  const videoId = body.source?.youtubeVideoId?.trim()
  const source: MovieSource = {
    id: `src-${movie.id}`,
    movieId: movie.id,
    youtubeVideoId: videoId ?? '',
    youtubeChannelName: body.source?.youtubeChannelName?.trim() || 'SabiFlix Curated',
    partNumber: 1,
    isPrimary: true,
    quality: body.source?.quality?.trim() || '1080p',
    previewStartSeconds: Number.isFinite(Number(body.source?.previewStartSeconds))
      ? Number(body.source?.previewStartSeconds)
      : 60,
  }

  const entry = await upsertPublishedEntry(movie, source)
  return ok({ entry }, undefined, 201)
})

export const DELETE = handler(async (request: Request) => {
  await requireAdmin()
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) throw Errors.validation('Missing id parameter.')
  const removed = await removePublishedEntry(id)
  return ok({ removed })
})