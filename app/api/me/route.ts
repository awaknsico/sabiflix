/**
 * Current authenticated user — used by client shells to gate on the real
 * DB-backed role (Clerk only knows identity; roles live in our database).
 *
 * GET /api/me
 */

import { handler, ok } from '@/lib/api/envelope'
import { getCurrentUser } from '@/lib/api/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = handler(async () => {
  const user = await getCurrentUser()
  if (!user) return ok({ user: null })
  return ok({
    user: {
      id: user.id,
      displayName: user.displayName,
      role: user.role,
      status: user.status,
      avatarUrl: user.avatarUrl,
    },
  })
})