/**
 * User-facing filmmaker access application endpoints.
 *
 * GET    /api/submissions/filmmaker-applications        - current user's application (if any)
 * POST   /api/submissions/filmmaker-applications        - submit / resubmit an application
 */

import { handler, ok, Errors } from '@/lib/api/envelope'
import { requireUser } from '@/lib/api/auth'
import { getFilmmakerApplication, createFilmmakerApplication } from '@/lib/repositories/submissions'
import { epochToIso } from '@/lib/time'
import { filmSubmissionApplicationSchema } from '@/lib/validations'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** The applicant's current application (if any). */
export const GET = handler(async (request: Request) => {
  const user = await requireUser()
  const application = await getFilmmakerApplication(user.id)
  if (!application) return ok({ application: null })
  return ok({
    application: {
      id: application.id,
      status: application.status,
      message: application.message,
      rejectionReason: application.rejectionReason,
      reviewedBy: application.reviewedBy,
      reviewedAt: application.reviewedAt ? epochToIso(application.reviewedAt) : null,
      submittedAt: epochToIso(application.createdAt),
    },
  })
})

/** Submit (or re-submit) a filmmaker access application. */
export const POST = handler(async (request: Request) => {
  const user = await requireUser()
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') throw Errors.validation('Request body must be valid JSON')
  const data = filmSubmissionApplicationSchema.parse(body)
  const application = await createFilmmakerApplication(user.id, data.message ?? null)
  return ok({
    application: {
      id: application.id,
      status: application.status,
      message: application.message,
      rejectionReason: application.rejectionReason,
      reviewedBy: application.reviewedBy,
      reviewedAt: application.reviewedAt ? epochToIso(application.reviewedAt) : null,
      submittedAt: epochToIso(application.createdAt),
    },
  })
})