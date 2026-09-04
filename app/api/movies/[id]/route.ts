/**
 * Single movie endpoints.
 *
 * GET    /api/movies/:id  — public movie detail with sources
 * PATCH  /api/movies/:id  — admin update
 * DELETE /api/movies/:id  — admin soft-delete
 */

import { handler, ok, Errors } from '@/lib/api/envelope'
import { requireAdmin } from '@/lib/api/auth'
import { movieUpdateSchema } from '@/lib/validations'
import { getMovieById, updateMovie, softDeleteMovie } from '@/lib/repositories/movies'
import { epochToIso } from '@/lib/time'
import { logActivity } from '@/lib/repositories/activity'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = handler(async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const movie = await getMovieById(id)
  if (!movie) throw Errors.notFound('Movie')

  return ok({
    movie: {
      id: movie.id,
      title: movie.title,
      alternativeTitles: movie.alternativeTitles,
      actors: movie.actors,
      year: movie.year,
      country: movie.country,
      language: movie.language,
      category: movie.category,
      synopsis: movie.synopsis,
      posterUrl: movie.posterUrl,
      curationType: movie.curationType,
      avgRating: movie.avgRating,
      ratingCount: movie.ratingCount,
      createdAt: epochToIso(movie.createdAt),
      updatedAt: epochToIso(movie.updatedAt),
      sources: movie.sources.map((s) => ({
        id: s.id,
        youtubeVideoId: s.youtubeVideoId,
        youtubeChannelName: s.youtubeChannelName,
        partNumber: s.partNumber,
        isPrimary: s.isPrimary,
        quality: s.quality,
        previewStartSeconds: s.previewStartSeconds,
      })),
    },
  })
})

export const PATCH = handler(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const admin = await requireAdmin()
  const { id } = await params
  const body = await request.json().catch(() => null)
  if (!body) throw Errors.validation('Request body must be valid JSON')

  const data = movieUpdateSchema.parse(body)
  const movie = await updateMovie(id, data)
  if (!movie) throw Errors.notFound('Movie')

  await logActivity({
    actorId: admin.id,
    actorRole: admin.role,
    action: 'movie.update',
    entityType: 'movie',
    entityId: id,
    details: JSON.stringify({ changes: Object.keys(data) }),
  })

  return ok({
    movie: {
      id: movie.id,
      title: movie.title,
      year: movie.year,
      category: movie.category,
      updatedAt: epochToIso(movie.updatedAt),
    },
  })
})

export const DELETE = handler(async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const admin = await requireAdmin()
  const { id } = await params
  const success = await softDeleteMovie(id)
  if (!success) throw Errors.notFound('Movie')

  await logActivity({
    actorId: admin.id,
    actorRole: admin.role,
    action: 'movie.delete',
    entityType: 'movie',
    entityId: id,
  })

  return ok({ deleted: true })
})
