/**
 * Watchlist endpoints.
 *
 * GET    /api/watchlist  - current user's watchlist
 *                           (with ?page=&perPage= a paged window + meta;
 *                           without, the complete list the client-side
 *                           toggle state needs)
 * POST   /api/watchlist  - toggle { movieId } - returns { added: boolean }
 * DELETE /api/watchlist  - remove { movieId }
 */

import { handler, ok, Errors } from '@/lib/api/envelope'
import { requireUser } from '@/lib/api/auth'
import { watchlistToggleSchema } from '@/lib/validations'
import { parsePaginationParams, paginationMeta } from '@/lib/api/pagination'
import {
  getWatchlist,
  getWatchlistPage,
  toggleWatchlist,
  removeFromWatchlist,
} from '@/lib/repositories/watchlist'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = handler(async (request: Request) => {
  const user = await requireUser()
  const { searchParams } = new URL(request.url)

  /* Explicit ?page/&perPage -> paged window. Otherwise return everything:
     `useWatchlist` and the homepage context map over all ids for the
     save-toggle state, so the default must stay complete. */
  if (searchParams.has('page') || searchParams.has('perPage')) {
    const { page, perPage } = parsePaginationParams(searchParams)
    const { items, total } = await getWatchlistPage(user.id, { page, perPage })
    return ok({ items: items.map(toItem) }, paginationMeta(page, perPage, total))
  }

  const items = await getWatchlist(user.id)
  return ok({ items: items.map(toItem) }, { total: items.length })
})

function toItem(i: {
  movieId: string; title: string; posterUrl: string | null
  year: number | null; category: string | null; addedAt: number
}) {
  return {
    movieId: i.movieId,
    title: i.title,
    posterUrl: i.posterUrl,
    year: i.year,
    category: i.category,
    addedAt: i.addedAt,
  }
}

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
  const removed = await removeFromWatchlist(user.id, movieId)
  return ok({ removed })
})
