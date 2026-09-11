import { handler, ok, Errors } from '@/lib/api/envelope'
import { requireAdmin } from '@/lib/api/auth'
import { getSubmission, updateSubmission } from '@/lib/repositories/submissions'
import { createMovie } from '@/lib/repositories/movies'
import { logActivity } from '@/lib/repositories/activity'
import { getSyncDB } from '@/lib/db/client'
import { filmSubmissions } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { nowEpoch, epochToIso } from '@/lib/time'
import { submissionReviewSchema } from '@/lib/validations'

/**
 * Admin submission review endpoints.
 *
 * PATCH  /api/admin/submissions/:id  - approve or reject a submission
 *    ({ action: 'notes', adminNotes }) sets admin notes
 *    ({ action: 'publish', ...source }) publishes a submission as a movie
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function parseId(request: Request): string {
  const pathname = new URL(request.url).pathname.replace(/\/+$/, '')
  const id = decodeURIComponent(pathname.split('/').pop() ?? '')
  if (!id) throw Errors.validation('Submission id required')
  return id
}

function throwNotFound(msg: string): never {
  const e = new Error(msg) as Error & { status?: number }
  e.status = 404
  throw e
}

/** Fetch a single submission by id. */
export const GET = handler(async (request: Request) => {
  await requireAdmin()
  const submission = await getSubmission(parseId(request))
  if (!submission) throwNotFound('Submission not found')
  return ok(submission)
})

/** Approve/reject a submission, or dispatch notes / publish sub-actions. */
export const PATCH = handler(async (request: Request) => {
  const admin = await requireAdmin()
  const id = parseId(request)
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') throw Errors.validation('Request body must be valid JSON')
  const payload = body as Record<string, unknown>

  if (payload.action === 'notes') {
    if (payload.adminNotes === undefined) throw Errors.validation('body.adminNotes is required')
    return ok(await setSubmissionNotes(admin.id, id, payload.adminNotes))
  }
  if (payload.action === 'publish') {
    return ok(await publishSubmission(admin.id, id, payload))
  }

  const review = submissionReviewSchema.parse(body)
  const submission = await getSubmission(id)
  if (!submission) throwNotFound('Submission not found')

  if (review.status === 'approved') {
    await updateSubmission(id, {
      status: 'approved',
      adminNotes: review.adminNotes ?? null,
      reviewedBy: admin.id,
      reviewedAt: nowEpoch(),
      /* Linking the catalog movie is what graduates the row: approved +
         published leaves the queue and appears in /admin/logs. Without it
         the item would sit in the queue forever. */
      publishedMovieId: review.publishedMovieId ?? undefined,
    })
    await logActivity({
      actorId: admin.id, actorRole: 'admin', action: 'approved_submission',
      entityType: 'film_submission', entityId: id,
      details: JSON.stringify({ submissionId: id, publishedMovieId: review.publishedMovieId ?? null }),
    })
    return ok({ status: 'approved' })
  }

  await updateSubmission(id, {
    status: 'rejected',
    adminNotes: review.adminNotes ?? null,
    reviewedBy: admin.id,
    reviewedAt: nowEpoch(),
  })
  await logActivity({
    actorId: admin.id, actorRole: 'admin', action: 'rejected_submission',
    entityType: 'film_submission', entityId: id,
    details: JSON.stringify({ submissionId: id }),
  })
  return ok({ status: 'rejected' })
})

/** Set admin notes on a submission (action-dispatched from PATCH). */
async function setSubmissionNotes(adminId: string, id: string, adminNotes: unknown) {
  const submission = await getSubmission(id)
  if (!submission) throwNotFound('Submission not found')
  await getSyncDB().update(filmSubmissions).set({
    adminNotes: (adminNotes ?? null) as string | null,
    reviewedBy: adminId,
    reviewedAt: nowEpoch(),
    updatedAt: nowEpoch(),
  }).where(eq(filmSubmissions.id, id))
  return { updated: true }
}

/** Publish a submitted film into the catalog (action-dispatched from PATCH). */
async function publishSubmission(adminId: string, id: string, body: Record<string, unknown>) {
  const { youtubeVideoId, youtubeChannelName, quality, previewStartSeconds, partNumber } = body as {
    youtubeVideoId?: unknown; youtubeChannelName?: unknown; quality?: unknown;
    previewStartSeconds?: unknown; partNumber?: unknown
  }
  if (!youtubeVideoId || typeof youtubeVideoId !== 'string') {
    throw Errors.validation('body.youtubeVideoId (string) is required')
  }
  if (!youtubeChannelName || typeof youtubeChannelName !== 'string') {
    throw Errors.validation('body.youtubeChannelName (string) is required')
  }
  const submission = await getSubmission(id)
  if (!submission) throwNotFound('Submission not found')

  const newMovie = await createMovie({
    title: submission.title,
    youtubeVideoId,
    youtubeChannelName,
    quality: typeof quality === 'string' ? quality : 'unknown',
    previewStartSeconds: typeof previewStartSeconds === 'number' ? previewStartSeconds : undefined,
    synopsis: submission.description ?? '',
    language: 'English',
    category: 'feature',
    country: 'Nigeria',
    actors: [],
  })
  await updateSubmission(id, {
    status: 'approved',
    publishedMovieId: newMovie.id,
    adminNotes: null,
    reviewedBy: adminId,
    reviewedAt: nowEpoch(),
  })
  await logActivity({
    actorId: adminId, actorRole: 'admin', action: 'published_submission',
    entityType: 'film_submission', entityId: id,
    details: JSON.stringify({ submissionId: id, movieId: newMovie.id }),
  })
  return { published: true, movieId: newMovie.id }
}