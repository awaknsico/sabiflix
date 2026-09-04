/**
 * Admin submission review endpoints.
 *
 * PATCH  /api/admin/submissions/:id  — approve or reject a submission
 */

import { handler, ok, Errors } from '@/lib/api/envelope'
import { requireAdmin } from '@/lib/api/auth'
import { submissionReviewSchema } from '@/lib/validations'
import { getSyncDB } from '@/lib/db/client'
import { filmSubmissions } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { nowEpoch, epochToIso } from '@/lib/time'
import { logActivity } from '@/lib/repositories/activity'
import { createMovie } from '@/lib/repositories/movies'
import { updateSubmission, getSubmission } from '@/lib/repositories/submissions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const PATCH = handler(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const admin = await requireAdmin()
  const { id } = await params
  const body = await request.json().catch(() => null)
  if (!body) throw Errors.validation('Request body must be valid JSON')

  const data = submissionReviewSchema.parse(body)
  const now = nowEpoch()

  const submission = await getSubmission(id)
  if (!submission) throw Errors.notFound('Submission')

  await updateSubmission(id, {
    status: data.status, adminNotes: data.adminNotes ?? null,
    reviewedBy: admin.id, reviewedAt: now,
  })

  // If approved, auto-create the movie
  let publishedMovieId: string | null = null
  if (data.status === 'approved' && submission.youtubeVideoId) {
    const movie = await createMovie({
      title: submission.title,
      youtubeVideoId: submission.youtubeVideoId,
      curationType: 'filmmaker',
      createdBy: submission.userId,
    })
    publishedMovieId = movie.id

    const d = getSyncDB()
    await d.update(filmSubmissions).set({ publishedMovieId: movie.id }).where(eq(filmSubmissions.id, id))
  }

  await logActivity({
    actorId: admin.id, actorRole: admin.role,
    action: `submission.${data.status}`, entityType: 'submission', entityId: id,
    details: JSON.stringify({ publishedMovieId }),
  })

  return ok({
    submission: { id, status: data.status, reviewedAt: epochToIso(now), publishedMovieId },
  })
})