/**
 * Playlist endpoints.
 *
 * GET  /api/playlists - all playlists with their ordered movies.
 * PUT  /api/playlists - replace one playlist's movie order (admin only).
 */

import { handler, ok, Errors } from '@/lib/api/envelope'
import { requireAdmin } from '@/lib/api/auth'
import { checkRateLimit } from '@/lib/api/rate-limit'
import { replacePlaylistMovies } from '@/lib/repositories/playlists'
import { getAllPlaylists } from '@/lib/server-catalog'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = handler(async (request: Request) => {
  // Rate limit: 60 requests per minute per IP
  const rateLimit = await checkRateLimit(request, 'playlists', 60, 60)
  if (!rateLimit.allowed) return rateLimit.response

  const playlists = await getAllPlaylists()
  return ok({
    playlists: playlists.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      isFeatured: p.isFeatured,
      movies: p.movies,
    })),
  })
})

export const PUT = handler(async (request: Request) => {
  await requireAdmin()
  const body = await request.json().catch(() => null) as {
    playlistId?: unknown
    movieIds?: unknown
  } | null

  if (typeof body?.playlistId !== 'string' || !body.playlistId.trim()) {
    throw Errors.validation('A playlist id is required')
  }
  if (!Array.isArray(body.movieIds) || body.movieIds.some((id) => typeof id !== 'string')) {
    throw Errors.validation('movieIds must be an array of strings')
  }

  const movieIds = [...new Set(body.movieIds as string[])]
  await replacePlaylistMovies(body.playlistId, movieIds)
  return ok({ saved: true, playlistId: body.playlistId, movieIds })
})