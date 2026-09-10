import { handler, ok, Errors } from '@/lib/api/envelope'
import { requireUser } from '@/lib/api/auth'
import { filmSubmissionApplicationSchema } from '@/lib/validations'
import { getFilmmakerApplication, createFilmmakerApplication } from '@/lib/repositories/submissions'
import { epochToIso } from '@/lib/time'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Read the current user's filmmaker application status (or null). */
export const GET = handler(async () => {
  const user = await requireUser()
  const app = await getFilmmakerApplication(user.id)
  if (!app) return ok({ application: null })
  return ok({
    application: {
      id: app.id,
      status: app.status,
      message: app.message,
      rejectionReason: app.rejectionReason,
      reviewedBy: app.reviewedBy,
      reviewedAt: app.reviewedAt ? epochToIso(app.reviewedAt) : null,
      createdAt: epochToIso(app.createdAt),
      updatedAt: epochToIso(app.updatedAt),
    },
  })
})

/** Submit a filmmaker access application. */
export const POST = handler(async (request: Request) => {
  const user = await requireUser()
  const body = await request.json().catch(() => null)
  if (!body) throw Errors.validation('Request body must be valid JSON')

  const data = filmSubmissionApplicationSchema.parse(body)
  const app = await createFilmmakerApplication(user.id, data.message ?? null)

  return ok({
    application: {
      id: app.id,
      status: app.status,
      message: app.message,
      rejectionReason: app.rejectionReason,
      reviewedBy: app.reviewedBy,
      reviewedAt: app.reviewedAt ? epochToIso(app.reviewedAt) : null,
      createdAt: epochToIso(app.createdAt),
      updatedAt: epochToIso(app.updatedAt),
    },
  })
})