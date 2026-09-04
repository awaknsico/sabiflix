/**
 * Watch history endpoints.
 *
 * GET  /api/watch-history  — resume list for the current user
 * POST /api/watch-history  — record progress { movieId, progressSeconds, durationSeconds }
 */

import { handler, ok, Errors } from '@/lib/api/envelope'
import { requireUser } from '@/lib/api/auth'
import { progressSchema } from '@/lib/validations'
import { recordProgress, getResumeList } from '@/lib/repositories/history'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = handler(async () => {
  const user = await requireUser()
  const items = await getResumeList(user.id)
  return ok({
    items: items.map((i) => ({
      movieId: i.movieId,
      title: i.title,
      posterUrl: i.posterUrl,
      progressSeconds: i.progressSeconds,
      durationSeconds: i.durationSeconds,
      updatedAt: i.updatedAt,
    })),
  })
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
