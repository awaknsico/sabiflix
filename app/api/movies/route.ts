/**
 * Public movie catalog endpoints.
 *
 * GET  /api/movies?page=1&perPage=20&category=feature&q=lagos&sort=newest
 * POST /api/movies  (admin only) — create a new movie with its primary source
 */

import { NextResponse } from 'next/server'
import { handler, ok, Errors } from '@/lib/api/envelope'
import { requireAdmin } from '@/lib/api/auth'
import { movieCreateSchema, movieQuerySchema } from '@/lib/validations'
import { listMovies, createMovie } from '@/lib/repositories/movies'
import { epochToIso, nowEpoch } from '@/lib/time'
import { logActivity } from '@/lib/repositories/activity'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = handler(async (request: Request) => {
  const { searchParams } = new URL(request.url)
  const params = movieQuerySchema.parse({
    page: searchParams.get('page') ?? undefined,
    perPage: searchParams.get('perPage') ?? undefined,
    category: searchParams.get('category') ?? undefined,
    country: searchParams.get('country') ?? undefined,
    language: searchParams.get('language') ?? undefined,
    year: searchParams.get('year') ?? undefined,
    q: searchParams.get('q') ?? undefined,
    sort: searchParams.get('sort') ?? undefined,
    sortDir: searchParams.get('sortDir') ?? undefined,
  })

  const result = await listMovies(params)
  return ok(
    {
      movies: result.items.map((m) => ({
        id: m.id,
        title: m.title,
        year: m.year,
        country: m.country,
        language: m.language,
        category: m.category,
        posterUrl: m.posterUrl,
        curationType: m.curationType,
        avgRating: m.avgRating,
        ratingCount: m.ratingCount,
        youtubeVideoId: m.youtubeVideoId,
      })),
    },
    {
      page: result.page,
      perPage: result.perPage,
      total: result.total,
      hasMore: result.page * result.perPage < result.total,
    },
  )
})

export const POST = handler(async (request: Request) => {
  const admin = await requireAdmin()
  const body = await request.json().catch(() => null)
  if (!body) throw Errors.validation('Request body must be valid JSON')

  const data = movieCreateSchema.parse(body)

  const movie = await createMovie({
    ...data,
    createdBy: admin.id,
  })

  await logActivity({
    actorId: admin.id,
    actorRole: admin.role,
    action: 'movie.create',
    entityType: 'movie',
    entityId: movie.id,
    details: JSON.stringify({ title: movie.title }),
  })

  return ok(
    {
      movie: {
        id: movie.id,
        title: movie.title,
        year: movie.year,
        category: movie.category,
        sources: movie.sources,
      },
    },
    undefined,
    201,
  )
})
