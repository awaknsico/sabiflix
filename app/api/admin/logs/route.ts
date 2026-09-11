/**
 * Request & review logs - admin-only operational history.
 *
 * GET /api/admin/logs?type=requests|submissions|applications
 *     &page=&perPage=&status=&q=
 *
 * Returns the paged window of HANDLED entries for the requested type with the
 * full audit story per row (who asked, which admin attended, when, turnaround,
 * linked/published movie, notes), plus cross-type summary stats for the page
 * header cards. Only handled items appear here - open/pending queues live on
 * /admin/requests and /admin/submissions.
 */

import { handler, ok } from '@/lib/api/envelope'
import { requireAdmin } from '@/lib/api/auth'
import { parsePaginationParams, paginationMeta } from '@/lib/api/pagination'
import { logsQuerySchema } from '@/lib/validations'
import {
  getLogStats,
  listHandledRequests,
  listReviewedFilmmakerApplications,
  listReviewedSubmissions,
} from '@/lib/repositories/logs'
import { epochToIso } from '@/lib/time'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = handler(async (request: Request) => {
  await requireAdmin()

  const url = new URL(request.url)
  const query = logsQuerySchema.parse(Object.fromEntries(url.searchParams.entries()))
  const { page, perPage } = parsePaginationParams(url.searchParams)
  const status = query.status && query.status !== 'all' ? query.status : undefined
  const list = { page, perPage, status, q: query.q }

  const [stats, { items, total }] = await Promise.all([
    getLogStats(),
    loadHandledPage(query.type, list),
  ])

  return ok(
    { type: query.type, items, stats },
    paginationMeta(page, perPage, total),
  )
})

/**
 * Load one paged log window and convert its timestamps to ISO strings at the
 * API boundary (mirrors the other list routes). Returns `items` as plain JSON
 * shapes so each entry type maps its own date fields.
 */
async function loadHandledPage(type: 'requests' | 'submissions' | 'applications', list: {
  page: number; perPage: number; status?: string; q?: string
}): Promise<{ items: unknown[]; total: number }> {
  if (type === 'requests') {
    const { items, total } = await listHandledRequests(list)
    return {
      total,
      items: items.map((r) => ({
        ...r,
        requestedAt: epochToIso(r.requestedAt),
        handledAt: r.handledAt != null ? epochToIso(r.handledAt) : null,
      })),
    }
  }
  if (type === 'submissions') {
    const { items, total } = await listReviewedSubmissions(list)
    return {
      total,
      items: items.map((s) => ({
        ...s,
        submittedAt: epochToIso(s.submittedAt),
        reviewedAt: s.reviewedAt != null ? epochToIso(s.reviewedAt) : null,
      })),
    }
  }
  const { items, total } = await listReviewedFilmmakerApplications(list)
  return {
    total,
    items: items.map((a) => ({
      ...a,
      submittedAt: epochToIso(a.submittedAt),
      reviewedAt: a.reviewedAt != null ? epochToIso(a.reviewedAt) : null,
    })),
  }
}
