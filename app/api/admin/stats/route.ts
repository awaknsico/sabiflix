/**
 * Admin dashboard stats — real counts from D1.
 *
 * GET /api/admin/stats
 */

import { handler, ok } from '@/lib/api/envelope'
import { requireAdmin } from '@/lib/api/auth'
import { getAdminStats } from '@/lib/repositories/stats'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = handler(async () => {
  await requireAdmin()
  const stats = await getAdminStats()
  return ok({ stats })
})
