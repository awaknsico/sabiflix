/**
 * Watchlist endpoints.
 *
 * GET    /api/watchlist  — current user's watchlist
 * POST   /api/watchlist  — toggle { movieId } — returns { added: boolean }
 * DELETE /api/watchlist  — remove { movieId }
 */

import { handler, ok, Errors } from '@/lib/api/envelope'
import { requireUser } from '@/lib/api/auth'
import { watchlistToggleSchema } from '@/lib/validations'
import { getWatchlist, toggleWatchlist, isInWatchlist } from '@/lib/repositories/watchlist'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = handler(async () => {
  const user = await requireUser()
  const items = await getWatchlist(user.id)
  return ok({
    items: items.map((i) => ({
      movieId: i.movieId,
      title: i.title,
      posterUrl: i.posterUrl,
      year: i.year,
      category: i.category,
      addedAt: i.addedAt,
    })),
  })
})

export const POST = handler(async (request: Request) => {
  const user = await requireUser()
  const body = await request.json().catch(() => null)
  if (!body) throw Errors.validation('Request body must be valid JSON')

  const { movieId } = watchlistToggleSchema.parse(body)
  const added = await toggleWatchlist(user.id, movieId)
  return ok({ added, isInWatchlist: added })
})

export const DELETE = handler(async (request: Request) => {
  const user = await requireUser()
  const body = await request.json().catch(() => null)
  if (!body) throw Errors.validation('Request body must be valid JSON')

  const { movieId } = watchlistToggleSchema.parse(body)
  const wasInWatchlist = await isInWatchlist(user.id, movieId)
  if (wasInWatchlist) toggleWatchlist(user.id, movieId) // toggle off
  return ok({ removed: wasInWatchlist })
})
