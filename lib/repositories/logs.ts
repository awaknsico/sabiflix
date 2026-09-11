/**
 * Request & review logs repository (admin).
 *
 * Read-only operational views over everything that has been HANDLED:
 *   - film requests resolved by an admin (found / not found-closed)
 *   - film submissions reviewed by an admin (approved / rejected)
 *   - filmmaker access applications reviewed by an admin
 *
 * Every row carries the full audit story: who asked, which admin attended,
 * when it was attended, how long it took (turnaround = handled_at -
 * created_at) and the operational outcome (linked/published movie, admin
 * note / rejection reason). Powers GET /api/admin/logs and /admin/logs.
 */

import { getDB } from '@/lib/db/client'
import {
  filmRequests,
  filmSubmissions,
  filmSubmissionApplications,
  movies,
  users,
} from '@/lib/db/schema'
import { and, count, desc, eq, inArray, like, ne, or, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import type { Paged } from '@/lib/api/pagination'

function db() { return getDB() }

/** Second join handle on `users` for the handling admin (reviewer) row. */
const reviewer = alias(users, 'reviewer')

export interface LogListParams {
  page?: number
  perPage?: number
  /** Per-type status filter: found|closed / approved|rejected. */
  status?: string
  /** Free-text search over title + requester/applicant name/email. */
  q?: string
}

/* ------------------------------------------------------------------ */
/* Requests (found / not found)                                        */
/* ------------------------------------------------------------------ */

export type HandledRequestLogRow = {
  id: string
  requestedTitle: string
  status: string
  requesterName: string | null
  requesterEmail: string | null
  requestedAt: number
  handledAt: number | null
  handledByName: string | null
  turnaroundSeconds: number | null
  fulfilledByMovieId: string | null
  movieTitle: string | null
  resolutionNote: string | null
}

export async function listHandledRequests(
  params: LogListParams = {},
): Promise<Paged<HandledRequestLogRow>> {
  const d = db()
  const page = params.page ?? 1
  const perPage = params.perPage ?? 20
  const off = (page - 1) * perPage

  const conds: any[] = [ne(filmRequests.status, 'open')]
  if (params.status === 'found' || params.status === 'closed') {
    conds.push(eq(filmRequests.status, params.status))
  }
  const term = params.q?.trim()
  if (term) {
    conds.push(or(
      like(filmRequests.requestedTitle, `%${term}%`),
      like(users.displayName, `%${term}%`),
      like(users.email, `%${term}%`),
    ))
  }
  const where = and(...conds)

  const rows = await d
    .select({
      id: filmRequests.id,
      requestedTitle: filmRequests.requestedTitle,
      status: filmRequests.status,
      requesterName: users.displayName,
      requesterEmail: users.email,
      requestedAt: filmRequests.createdAt,
      handledAt: filmRequests.reviewedAt,
      handledByName: reviewer.displayName,
      turnaroundSeconds: sql<number | null>`${filmRequests.reviewedAt} - ${filmRequests.createdAt}`,
      fulfilledByMovieId: filmRequests.fulfilledByMovieId,
      movieTitle: movies.title,
      resolutionNote: filmRequests.resolutionNote,
    })
    .from(filmRequests)
    .leftJoin(users, eq(users.id, filmRequests.userId))
    .leftJoin(reviewer, eq(reviewer.id, filmRequests.reviewedBy))
    .leftJoin(movies, eq(movies.id, filmRequests.fulfilledByMovieId))
    .where(where)
    .orderBy(desc(sql`coalesce(${filmRequests.reviewedAt}, ${filmRequests.updatedAt})`))
    .limit(perPage)
    .offset(off)
    .all()

  const countRows = await d
    .select({ value: count() })
    .from(filmRequests)
    .leftJoin(users, eq(users.id, filmRequests.userId))
    .where(where)
    .all()

  return {
    items: rows as unknown as HandledRequestLogRow[],
    total: Number(countRows[0]?.value ?? 0),
    page,
    perPage,
  }
}

/* ------------------------------------------------------------------ */
/* Submissions (approved / rejected)                                   */
/* ------------------------------------------------------------------ */

export type ReviewedSubmissionLogRow = {
  id: string
  title: string
  status: string
  filmmakerName: string | null
  filmmakerEmail: string | null
  submittedAt: number
  reviewedAt: number | null
  reviewedByName: string | null
  turnaroundSeconds: number | null
  adminNotes: string | null
  publishedMovieId: string | null
  movieTitle: string | null
}

export async function listReviewedSubmissions(
  params: LogListParams = {},
): Promise<Paged<ReviewedSubmissionLogRow>> {
  const d = db()
  const page = params.page ?? 1
  const perPage = params.perPage ?? 20
  const off = (page - 1) * perPage

  const conds: any[] = [or(
    eq(filmSubmissions.status, 'rejected'),
    and(
      eq(filmSubmissions.status, 'approved'),
      sql`${filmSubmissions.publishedMovieId} is not null`,
    ),
  )]
  if (params.status === 'approved' || params.status === 'rejected') {
    conds.push(eq(filmSubmissions.status, params.status))
  }
  const term = params.q?.trim()
  if (term) {
    conds.push(or(
      like(filmSubmissions.title, `%${term}%`),
      like(users.displayName, `%${term}%`),
      like(users.email, `%${term}%`),
    ))
  }
  const where = and(...conds)

  const rows = await d
    .select({
      id: filmSubmissions.id,
      title: filmSubmissions.title,
      status: filmSubmissions.status,
      filmmakerName: users.displayName,
      filmmakerEmail: users.email,
      submittedAt: filmSubmissions.createdAt,
      reviewedAt: filmSubmissions.reviewedAt,
      reviewedByName: reviewer.displayName,
      turnaroundSeconds: sql<number | null>`${filmSubmissions.reviewedAt} - ${filmSubmissions.createdAt}`,
      adminNotes: filmSubmissions.adminNotes,
      publishedMovieId: filmSubmissions.publishedMovieId,
      movieTitle: movies.title,
    })
    .from(filmSubmissions)
    .leftJoin(users, eq(users.id, filmSubmissions.userId))
    .leftJoin(reviewer, eq(reviewer.id, filmSubmissions.reviewedBy))
    .leftJoin(movies, eq(movies.id, filmSubmissions.publishedMovieId))
    .where(where)
    .orderBy(desc(filmSubmissions.reviewedAt), desc(filmSubmissions.updatedAt))
    .limit(perPage)
    .offset(off)
    .all()

  const countRows = await d
    .select({ value: count() })
    .from(filmSubmissions)
    .leftJoin(users, eq(users.id, filmSubmissions.userId))
    .where(where)
    .all()

  return {
    items: rows as unknown as ReviewedSubmissionLogRow[],
    total: Number(countRows[0]?.value ?? 0),
    page,
    perPage,
  }
}

/* ------------------------------------------------------------------ */
/* Filmmaker access applications (approved / rejected)                 */
/* ------------------------------------------------------------------ */

export type ReviewedApplicationLogRow = {
  id: string
  applicantName: string | null
  applicantEmail: string | null
  message: string | null
  status: string
  submittedAt: number
  reviewedAt: number | null
  reviewedByName: string | null
  turnaroundSeconds: number | null
  rejectionReason: string | null
}

export async function listReviewedFilmmakerApplications(
  params: LogListParams = {},
): Promise<Paged<ReviewedApplicationLogRow>> {
  const d = db()
  const page = params.page ?? 1
  const perPage = params.perPage ?? 20
  const off = (page - 1) * perPage

  const conds: any[] = [inArray(filmSubmissionApplications.status, ['approved', 'rejected'])]
  if (params.status === 'approved' || params.status === 'rejected') {
    conds.push(eq(filmSubmissionApplications.status, params.status))
  }
  const term = params.q?.trim()
  if (term) {
    conds.push(or(
      like(users.displayName, `%${term}%`),
      like(users.email, `%${term}%`),
    ))
  }
  const where = and(...conds)

  const rows = await d
    .select({
      id: filmSubmissionApplications.id,
      applicantName: users.displayName,
      applicantEmail: users.email,
      message: filmSubmissionApplications.message,
      status: filmSubmissionApplications.status,
      submittedAt: filmSubmissionApplications.createdAt,
      reviewedAt: filmSubmissionApplications.reviewedAt,
      reviewedByName: reviewer.displayName,
      turnaroundSeconds: sql<number | null>`${filmSubmissionApplications.reviewedAt} - ${filmSubmissionApplications.createdAt}`,
      rejectionReason: filmSubmissionApplications.rejectionReason,
    })
    .from(filmSubmissionApplications)
    .leftJoin(users, eq(users.id, filmSubmissionApplications.userId))
    .leftJoin(reviewer, eq(reviewer.id, filmSubmissionApplications.reviewedBy))
    .where(where)
    .orderBy(desc(filmSubmissionApplications.reviewedAt), desc(filmSubmissionApplications.updatedAt))
    .limit(perPage)
    .offset(off)
    .all()

  const countRows = await d
    .select({ value: count() })
    .from(filmSubmissionApplications)
    .leftJoin(users, eq(users.id, filmSubmissionApplications.userId))
    .where(where)
    .all()

  return {
    items: rows as unknown as ReviewedApplicationLogRow[],
    total: Number(countRows[0]?.value ?? 0),
    page,
    perPage,
  }
}

/* ------------------------------------------------------------------ */
/* Cross-type summary stats                                            */
/* ------------------------------------------------------------------ */

export type LogStats = {
  requests: { found: number; closed: number; total: number; avgTurnaroundSeconds: number | null }
  submissions: { approved: number; rejected: number; published: number; total: number; avgTurnaroundSeconds: number | null }
  applications: { approved: number; rejected: number; total: number; avgTurnaroundSeconds: number | null }
}

/**
 * Handled counts + average turnaround (seconds) per type. Averaged over rows
 * that carry a review stamp; null when nothing has been handled yet.
 */
export async function getLogStats(): Promise<LogStats> {
  const d = db()

  const requestRows = await d
    .select({
      status: filmRequests.status,
      value: count(),
      avgTurnaround: sql<number | null>`avg(${filmRequests.reviewedAt} - ${filmRequests.createdAt})`,
    })
    .from(filmRequests)
    .where(ne(filmRequests.status, 'open'))
    .groupBy(filmRequests.status)
    .all()

  const submissionRows = await d
    .select({
      status: filmSubmissions.status,
      value: count(),
      published: sql<number>`sum(case when ${filmSubmissions.publishedMovieId} is not null then 1 else 0 end)`,
      avgTurnaround: sql<number | null>`avg(${filmSubmissions.reviewedAt} - ${filmSubmissions.createdAt})`,
    })
    .from(filmSubmissions)
    .where(or(
      eq(filmSubmissions.status, 'rejected'),
      and(
        eq(filmSubmissions.status, 'approved'),
        sql`${filmSubmissions.publishedMovieId} is not null`,
      ),
    ))
    .groupBy(filmSubmissions.status)
    .all()

  const applicationRows = await d
    .select({
      status: filmSubmissionApplications.status,
      value: count(),
      avgTurnaround: sql<number | null>`avg(${filmSubmissionApplications.reviewedAt} - ${filmSubmissionApplications.createdAt})`,
    })
    .from(filmSubmissionApplications)
    .where(inArray(filmSubmissionApplications.status, ['approved', 'rejected']))
    .groupBy(filmSubmissionApplications.status)
    .all()

  const toAvg = (rows: { avgTurnaround: unknown }[]): number | null => {
    const values = rows.map((r) => Number(r.avgTurnaround)).filter((v) => Number.isFinite(v) && v >= 0)
    return values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null
  }

  const requests = { found: 0, closed: 0, total: 0, avgTurnaroundSeconds: null as number | null }
  for (const r of requestRows) {
    const n = Number(r.value)
    requests.total += n
    if (r.status === 'found') requests.found = n
    if (r.status === 'closed') requests.closed = n
  }
  requests.avgTurnaroundSeconds = toAvg(requestRows)

  const submissions = { approved: 0, rejected: 0, published: 0, total: 0, avgTurnaroundSeconds: null as number | null }
  for (const r of submissionRows) {
    const n = Number(r.value)
    submissions.total += n
    if (r.status === 'approved') submissions.approved = n
    if (r.status === 'rejected') submissions.rejected = n
    submissions.published += Number(r.published ?? 0)
  }
  submissions.avgTurnaroundSeconds = toAvg(submissionRows)

  const applications = { approved: 0, rejected: 0, total: 0, avgTurnaroundSeconds: null as number | null }
  for (const r of applicationRows) {
    const n = Number(r.value)
    applications.total += n
    if (r.status === 'approved') applications.approved = n
    if (r.status === 'rejected') applications.rejected = n
  }
  applications.avgTurnaroundSeconds = toAvg(applicationRows)

  return { requests, submissions, applications }
}

