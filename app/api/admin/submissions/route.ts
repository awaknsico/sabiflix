import { handler, ok } from '@/lib/api/envelope'
import { requireAdmin } from '@/lib/api/auth'
import { parsePaginationParams, paginationMeta } from '@/lib/api/pagination'
import { listSubmissions } from '@/lib/repositories/submissions'
import { epochToIso } from '@/lib/time'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Admin paginated submission queue - actionable items only (pending +
 * approved-but-unpublished). Handled rows (rejected, approved+published)
 * graduate to Request & Review Logs. */
export const GET = handler(async (request: Request) => {
  const admin = await requireAdmin()
  const { page, perPage } = parsePaginationParams(new URL(request.url).searchParams)
  const { items, total } = await listSubmissions(admin.id, true, { page, perPage }, { actionableOnly: true })
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