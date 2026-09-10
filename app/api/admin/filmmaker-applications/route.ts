import { handler, ok } from '@/lib/api/envelope'
import { requireAdmin } from '@/lib/api/auth'
import { listPendingFilmmakerApplications } from '@/lib/repositories/submissions'
import { epochToIso } from '@/lib/time'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Pending filmmaker access applications for the admin queue. */
export const GET = handler(async () => {
  await requireAdmin()
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
