/**
 * Watch history endpoints.
 *
 * GET  /api/watch-history  — resume list for the current user
 *                            (with ?page=&perPage= a paged window + meta;
 *                            without, the 50-entry resume list client
 *                            stores expect)
 * POST /api/watch-history  — record progress { movieId, progressSeconds, durationSeconds }
 */

import { handler, ok, Errors } from '@/lib/api/envelope'
import { requireUser } from '@/lib/api/auth'
import { progressSchema } from '@/lib/validations'
import { parsePaginationParams, paginationMeta } from '@/lib/api/pagination'
import { recordProgress, getResumeList, getHistoryPage } from '@/lib/repositories/history'
import type { HistoryEntry } from '@/lib/repositories/history'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function toItem(i: HistoryEntry) {
  return {
    movieId: i.movieId,
    title: i.title,
    posterUrl: i.posterUrl,
    progressSeconds: i.progressSeconds,
    durationSeconds: i.durationSeconds,
    updatedAt: i.updatedAt,
  }
}

export const GET = handler(async (request: Request) => {
  const user = await requireUser()
  const { searchParams } = new URL(request.url)

  /* Explicit ?page/&perPage → paged window over the full history. */
  if (searchParams.has('page') || searchParams.has('perPage')) {
    const { page, perPage } = parsePaginationParams(searchParams)
    const { items, total } = await getHistoryPage(user.id, { page, perPage })
    return ok({ items: items.map(toItem) }, paginationMeta(page, perPage, total))
  }

  /* Default: the bounded resume list (client stores read this straight
     through and only need the most recent entries). */
  const items = await getResumeList(user.id)
  return ok({ items: items.map(toItem) }, { total: items.length })
})

export const POST = handler(async (request: Request) => {
  const user = await requireUser()
  const body = await request.json().catch(() => null)
  if (!body) throw Errors.validation('Request body must be valid JSON')

  const data = progressSchema.parse(body)
  const entry = await recordProgress({
    userId: user.id,
    movieId: data.movieId,
    progressSeconds: data.progressSeconds,
    durationSeconds: data.durationSeconds,
  })

  return ok({
    entry: {
      movieId: entry!.movieId,
      progressSeconds: entry!.progressSeconds,
      durationSeconds: entry!.durationSeconds,
      updatedAt: entry!.updatedAt,
    },
  })
})
