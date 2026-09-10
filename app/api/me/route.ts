/**
 * Current authenticated user — used by client shells to gate on the real
 * DB-backed role (Clerk only knows identity; roles live in our database).
 *
 * GET /api/me
 */

import { handler, ok } from '@/lib/api/envelope'
import { getCurrentUser } from '@/lib/api/auth'
import { getFilmmakerApplication } from '@/lib/repositories/submissions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = handler(async () => {
  const user = await getCurrentUser()
  if (!user) return ok({ user: null })

  const canSubmitFilms =
    (user.role === 'admin' || user.role === 'creator') && user.status === 'active';
  const application = await getFilmmakerApplication(user.id)
  const hasPendingFilmmakerApplication =
    (user.role === 'user' || user.role === 'creator') && user.status === 'active'
      ? application?.status === 'pending'
      : false

  return ok({
    user: {
      id: user.id,
      displayName: user.displayName,
      role: user.role,
      status: user.status,
      avatarUrl: user.avatarUrl,
      canSubmitFilms,
      hasPendingFilmmakerApplication,
    },
  })
})