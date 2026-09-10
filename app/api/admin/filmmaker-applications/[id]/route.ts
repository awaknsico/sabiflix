import { handler, ok, Errors } from '@/lib/api/envelope'
import { requireAdmin } from '@/lib/api/auth'
import { reviewFilmmakerApplication, getFilmmakerApplication } from '@/lib/repositories/submissions'
import { filmSubmissionApplicationReviewSchema } from '@/lib/validations'
import { logActivity } from '@/lib/repositories/activity'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function parseId(request: Request): string {
  const pathname = new URL(request.url).pathname.replace(/\/+$/, '')
  const id = decodeURIComponent(pathname.split('/').pop() ?? '')
  if (!id) throw Errors.validation('Application id required')
  return id
}

function throwNotFound(msg: string): never {
  const e = new Error(msg) as Error & { status?: number }
  e.status = 404
  throw e
}

/** Review (approve/reject) a filmmaker access application. */
export const PATCH = handler(async (request: Request) => {
  const admin = await requireAdmin()
  const id = parseId(request)
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') throw Errors.validation('Request body must be valid JSON')

  const review = filmSubmissionApplicationReviewSchema.parse(body)

  const existing = await getFilmmakerApplication(id)
  if (!existing) throwNotFound('Application not found')

  await reviewFilmmakerApplication(id, {
    status: review.status,
    rejectionReason: review.rejectionReason ?? null,
    reviewedBy: admin.id,
  })

  await logActivity({
    actorId: admin.id,
    actorRole: 'admin',
    action: review.status === 'approved' ? 'approved_filmmaker_application' : 'rejected_filmmaker_application',
    entityType: 'film_submission_application',
    entityId: id,
    details: JSON.stringify({ applicationId: id, status: review.status }),
  })

  return ok({ status: review.status })
})
