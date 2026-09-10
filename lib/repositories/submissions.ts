/**
 * Film submissions repository.
 */

import { getDB } from '@/lib/db/client'
import { filmSubmissions, filmSubmissionApplications, users, type FilmSubmission } from '@/lib/db/schema'
import { eq, and, desc, sql, count } from 'drizzle-orm'
import { nowEpoch } from '@/lib/time'
import type { Paged } from '@/lib/api/pagination'

function db() { return getDB() }

export type FilmSubmissionRow = FilmSubmission & { userDisplayName: string | null }

/** Paged window over submissions (newest first) with a total count.
 *
 * When `includeAll` is true (admin view), returns every submission across all
 * users. Otherwise scopes to the requesting user.
 */
export async function listSubmissions(
  userId: string,
  includeAll: boolean = false,
  params: { page?: number; perPage?: number } = {},
): Promise<Paged<FilmSubmissionRow>> {
  const d = db()
  const page = params.page ?? 1
  const perPage = params.perPage ?? 20
  const off = (page - 1) * perPage
  const where = includeAll ? undefined : eq(filmSubmissions.userId, userId)
  const rows = await d
    .select({
      id: filmSubmissions.id,
      userId: filmSubmissions.userId,
      title: filmSubmissions.title,
      youtubeUrl: filmSubmissions.youtubeUrl,
      youtubeVideoId: filmSubmissions.youtubeVideoId,
      description: filmSubmissions.description,
      status: filmSubmissions.status,
      adminNotes: filmSubmissions.adminNotes,
      reviewedBy: filmSubmissions.reviewedBy,
      reviewedAt: filmSubmissions.reviewedAt,
      publishedMovieId: filmSubmissions.publishedMovieId,
      createdAt: filmSubmissions.createdAt,
      updatedAt: filmSubmissions.updatedAt,
      userDisplayName: users.displayName,
    })
    .from(filmSubmissions)
    .leftJoin(users, eq(users.id, filmSubmissions.userId))
    .where(where)
    .orderBy(desc(filmSubmissions.createdAt))
    .limit(perPage)
    .offset(off)
    .all()
  const countRows = await d.select({ value: count() }).from(filmSubmissions).where(where).all()
  return {
    items: rows as unknown as FilmSubmissionRow[],
    total: Number(countRows[0]?.value ?? 0),
    page,
    perPage,
  }
}

/** How many pending submissions a single user is allowed to have at once. */
const MAX_PENDING_SUBMISSIONS_PER_USER = 3

/**
 * True when the given user is allowed to create new film submissions.
 *
 * Admins and already-approved creators can always submit. Everyone else needs
 * an approved filmmaker access application (or a pre-existing application row
 * for legacy accounts — see `ensureUserCanSubmit` below).
 *
 * Queries the database directly for both role and application status rather
 * than trusting caller-provided values.
 */
export async function canSubmitFilms(userId: string): Promise<boolean> {
  const d = db()
  const userRows = await d
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
    .all()
  const role = userRows[0]?.role
  if (role === 'admin' || role === 'creator') return true
  const appRows = await d
    .select({ status: filmSubmissionApplications.status })
    .from(filmSubmissionApplications)
    .where(eq(filmSubmissionApplications.userId, userId))
    .orderBy(desc(filmSubmissionApplications.createdAt))
    .limit(1)
    .all()
  return appRows[0]?.status === 'approved'
}

/**
 * Returns the submitter-facing reason a user is currently blocked from
 * submitting, or null when they are eligible.
 */
export async function submissionBlockedReason(user: { id: string; role: string; status: string }): Promise<string | null> {
  if (user.role === 'admin' || user.role === 'creator') return null
  if (user.status !== 'active') return 'Your account is not active.'
  const rows = await db()
    .select({
      status: filmSubmissionApplications.status,
      rejectionReason: filmSubmissionApplications.rejectionReason,
    })
    .from(filmSubmissionApplications)
    .where(eq(filmSubmissionApplications.userId, user.id))
    .limit(1)
    .all()
  const app = rows[0]
  if (!app) return 'You need filmmaker access before you can submit films.'
  if (app.status === 'pending') return 'Your filmmaker access request is still under review.'
  if (app.status === 'rejected') {
    return app.rejectionReason
      ? `Your filmmaker access request was not approved: ${app.rejectionReason}`
      : 'Your filmmaker access request was not approved. You can apply again.'
  }
  return 'You need filmmaker access before you can submit films.'
}

/**
 * Noop for eligible users. For ineligible users, inserts a pending filmmaker
 * access application row behind the scenes so legacy / pre-gate accounts keep
 * being able to submit until an admin reviews them — otherwise the first
 * submission attempt by a long-standing user would be silently dropped.
 */
export async function ensureUserCanSubmit(user: { id: string; role: string; status: string }): Promise<void> {
  if (await canSubmitFilms(user.id)) return
  const existing = await db()
    .select({ id: filmSubmissionApplications.id })
    .from(filmSubmissionApplications)
    .where(eq(filmSubmissionApplications.userId, user.id))
    .limit(1)
    .all()
  if (!existing[0]) {
    const { uuid_v7 } = await import('@/lib/ids')
    await db().insert(filmSubmissionApplications).values({
      id: uuid_v7(),
      userId: user.id,
      status: 'pending',
      createdAt: nowEpoch(),
      updatedAt: nowEpoch(),
    })
  }
}

/** Paged window over pending submissions for a single user — used for the cap. */
async function countPendingSubmissionsForUser(userId: string): Promise<number> {
  const d = db()
  const rows = await d
    .select({ value: count() })
    .from(filmSubmissions)
    .where(and(eq(filmSubmissions.userId, userId), eq(filmSubmissions.status, 'pending')))
    .all()
  return Number(rows[0]?.value ?? 0)
}

/**
 * Raised when a user tries to submit while already at the per-user pending cap.
 */
export class SubmissionLimitReached extends Error {
  constructor() {
    super(`You already have ${MAX_PENDING_SUBMISSIONS_PER_USER} pending submissions.`)
  }
}

/**
 * True when the user still has room for another pending submission.
 */
export async function canCreateAnotherSubmission(userId: string): Promise<boolean> {
  return (await countPendingSubmissionsForUser(userId)) < MAX_PENDING_SUBMISSIONS_PER_USER
}

export async function getSubmission(id: string): Promise<FilmSubmission | null> {
  const rows = await db().select().from(filmSubmissions).where(eq(filmSubmissions.id, id)).all()
  return rows[0] ?? null
}

/** Returns the active filmmaker access application for the given user, or null. */
export async function getFilmmakerApplicationForUser(userId: string): Promise<{
  id: string
  status: 'pending' | 'approved' | 'rejected'
  message: string | null
  rejectionReason: string | null
  reviewedBy: string | null
  reviewedAt: number | null
  createdAt: number
} | null> {
  return getFilmmakerApplication(userId)
}

export async function createSubmission(data: {
  userId: string; title: string; youtubeUrl: string; youtubeVideoId: string | null; description?: string | null
}): Promise<FilmSubmission> {
  const d = db()
  const existing = await d.select().from(filmSubmissions)
    .where(and(eq(filmSubmissions.userId, data.userId), eq(filmSubmissions.status, 'pending' as const)))
    .limit(1).all()
  if (existing[0]) {
    throw new Error('You already have a pending submission — finish or delete it before submitting another.')
  }

  const { uuid_v7 } = await import('@/lib/ids')
  const now = nowEpoch()
  const values = {
    id: uuid_v7(), userId: data.userId, title: data.title,
    youtubeUrl: data.youtubeUrl, youtubeVideoId: data.youtubeVideoId,
    description: data.description ?? null, status: 'pending' as const,
    adminNotes: null, reviewedBy: null, reviewedAt: null,
    publishedMovieId: null, createdAt: now, updatedAt: now,
  }
  await d.insert(filmSubmissions).values(values)
  return values as FilmSubmission
}

/** Read-only shape of a filmmaker access application, as seen by the applicant. */
export interface FilmmakerApplicationView {
  id: string
  status: 'pending' | 'approved' | 'rejected'
  message: string | null
  reviewedBy: string | null
  reviewedAt: number | null
  rejectionReason: string | null
  createdAt: number
  updatedAt: number
}

/** Stripped-down shape safe to show on another user's profile. */
export interface PublicFilmmakerApplicationView {
  id: string
  status: 'pending' | 'approved' | 'rejected'
  reviewedAt: number | null
  /** ISO-8601 string for renderer consumption. */
  reviewedAtIso: string | null
}

/**
 * Returns the applicant's current application (if any), or null.
 */
export async function getFilmmakerApplication(userId: string): Promise<FilmmakerApplicationView | null> {
  const rows = await db()
    .select({
      id: filmSubmissionApplications.id,
      status: filmSubmissionApplications.status,
      message: filmSubmissionApplications.message,
      reviewedBy: filmSubmissionApplications.reviewedBy,
      reviewedAt: filmSubmissionApplications.reviewedAt,
      rejectionReason: filmSubmissionApplications.rejectionReason,
      createdAt: filmSubmissionApplications.createdAt,
      updatedAt: filmSubmissionApplications.updatedAt,
    })
    .from(filmSubmissionApplications)
    .where(eq(filmSubmissionApplications.userId, userId))
    .orderBy(desc(filmSubmissionApplications.createdAt))
    .limit(1)
    .all()
  return rows[0] ?? null
}

/**
 * Creates a filmmaker access application for the current user.
 *
 * One active application per user: if they already have a pending application,
 * this is a no-op that returns the existing row. Otherwise inserts a new one.
 */
export async function createFilmmakerApplication(userId: string, message: string | null): Promise<FilmmakerApplicationView> {
  const d = db()
  const now = nowEpoch()

  const existing = await getFilmmakerApplication(userId)
  if (existing && existing.status === 'pending') return existing

  /* Re-applying after a rejection: `film_submission_applications.user_id` is
     UNIQUE, so we resurrect the existing row (back to pending) rather than
     inserting a duplicate. This keeps the applicant's history intact. */
  if (existing) {
    await d
      .update(filmSubmissionApplications)
      .set({
        message: message ?? null,
        status: 'pending' as const,
        reviewedBy: null,
        reviewedAt: null,
        rejectionReason: null,
        updatedAt: now,
      })
      .where(eq(filmSubmissionApplications.id, existing.id))
    const refreshed = await getFilmmakerApplication(userId)
    if (!refreshed) throw new Error('Failed to reload the application')
    return refreshed
  }

  const { uuid_v7 } = await import('@/lib/ids')
  const values = {
    id: uuid_v7(),
    userId,
    message: message ?? null,
    status: 'pending' as const,
    reviewedBy: null,
    reviewedAt: null,
    rejectionReason: null,
    createdAt: now,
    updatedAt: now,
  }
  await d.insert(filmSubmissionApplications).values(values)
  return values as unknown as FilmmakerApplicationView
}

/**
 * Admin review of a filmmaker access application.
 */
export async function reviewFilmmakerApplication(
  id: string,
  data: { status: 'approved' | 'rejected'; rejectionReason?: string | null; reviewedBy: string },
): Promise<void> {
  const d = db()
  const now = nowEpoch()

  /* Look up the applicant once — needed for the creator promotion on approve. */
  const appRows = await d
    .select({ userId: filmSubmissionApplications.userId })
    .from(filmSubmissionApplications)
    .where(eq(filmSubmissionApplications.id, id))
    .limit(1)
    .all()
  const applicantId = appRows[0]?.userId

  const updates: Record<string, unknown> = {
    status: data.status,
    reviewedBy: data.reviewedBy,
    reviewedAt: now,
    updatedAt: now,
  }
  if (data.status === 'rejected') {
    updates.rejectionReason = data.rejectionReason ?? null
  }
  if (data.status === 'approved') {
    updates.rejectionReason = null
    // Promote the applicant to an approved creator.
    if (applicantId) {
      await d
        .update(users)
        .set({ role: 'creator' as const, status: 'active' as const, updatedAt: now })
        .where(eq(users.id, applicantId))
    }
  }
  await d.update(filmSubmissionApplications).set(updates).where(eq(filmSubmissionApplications.id, id))
}

export type PendingApplication = {
  id: string
  userId: string
  message: string | null
  createdAt: number
}

/** Returns every pending filmmaker application for the admin queue. */
export async function listPendingFilmmakerApplications(): Promise<PendingApplication[]> {
  const d = db()
  const rows = await d
    .select({
      id: filmSubmissionApplications.id,
      userId: filmSubmissionApplications.userId,
      message: filmSubmissionApplications.message,
      createdAt: filmSubmissionApplications.createdAt,
    })
    .from(filmSubmissionApplications)
    .where(eq(filmSubmissionApplications.status, 'pending'))
    .orderBy(desc(filmSubmissionApplications.createdAt))
    .all()
  return rows as PendingApplication[]
}

/** Returns the current filmmaker application for a user in a renderer-safe shape. */
export async function getPublicFilmmakerApplication(userId: string): Promise<PublicFilmmakerApplicationView | null> {
  if (!userId) return null
  const app = await getFilmmakerApplication(userId)
  if (!app) return null
  return {
    id: app.id,
    status: app.status,
    reviewedAt: app.reviewedAt,
    reviewedAtIso: app.reviewedAt != null ? new Date(app.reviewedAt * 1000).toISOString() : null,
  }
}

export async function updateSubmission(id: string, data: Partial<{
  status: string; adminNotes: string | null; reviewedBy: string | null;
  reviewedAt: number | null; publishedMovieId: string | null; updatedAt: number
}>): Promise<void> {
  const d = db()
  const updates: Record<string, unknown> = { updatedAt: data.updatedAt ?? nowEpoch() }
  if (data.status !== undefined) updates.status = data.status
  if (data.adminNotes !== undefined) updates.adminNotes = data.adminNotes
  if (data.reviewedBy !== undefined) updates.reviewedBy = data.reviewedBy
  if (data.reviewedAt !== undefined) updates.reviewedAt = data.reviewedAt
  if (data.publishedMovieId !== undefined) updates.publishedMovieId = data.publishedMovieId
  await d.update(filmSubmissions).set(updates).where(eq(filmSubmissions.id, id))
}

export async function countSubmissionsByStatus(): Promise<Record<string, number>> {
  const d = db()
  const rows = await d.select({ status: filmSubmissions.status, count: sql`count(*)` })
    .from(filmSubmissions).groupBy(filmSubmissions.status).all()
  return rows.reduce((acc: Record<string, number>, r: any) => {
    acc[r.status] = Number(r.count)
    return acc
  }, {})
}