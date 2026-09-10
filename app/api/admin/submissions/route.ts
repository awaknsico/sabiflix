import { handler, ok, Errors } from '@/lib/api/envelope'
import { requireAdmin } from '@/lib/api/auth'
import { parsePaginationParams, paginationMeta } from '@/lib/api/pagination'
import { listSubmissions, listPendingFilmmakerApplications, reviewFilmmakerApplication } from '@/lib/repositories/submissions'
import { epochToIso } from '@/lib/time'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Admin paginated submission queue. */
export const GET = handler(async (request: Request) => {
  const admin = await requireAdmin()
  const { page, perPage } = parsePaginationParams(new URL(request.url).searchParams)
  const { items, total } = await listSubmissions(admin.id, true, { page, perPage })
  return ok(
    {
      submissions: items.map((r) => ({
        id: r.id, title: r.title, youtubeUrl: r.youtubeUrl,
        youtubeVideoId: r.youtubeVideoId, description: r.description,
        status: r.status, adminNotes: r.adminNotes,
        userDisplayName: r.userDisplayName,
        publishedMovieId: r.publishedMovieId,
        submittedAt: epochToIso(r.createdAt),
      })),
    },
    paginationMeta(page, perPage, total),
  )
})

/** Pending filmmaker access applications for the admin queue. */
export const GET_FILMMAKER_APPLICATIONS = handler(async () => {
  const admin = await requireAdmin()
  const apps = await listPendingFilmmakerApplications()
  return ok({
    applications: apps.map((a) => ({
      id: a.id,
      userId: a.userId,
      message: a.message,
      createdAt: epochToIso(a.createdAt),
    })),
  })
})