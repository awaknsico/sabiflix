/**
 * Notifications endpoints.
 *
 * GET   /api/notifications  — current user's notifications
 * PATCH /api/notifications  — mark as read { id } or mark all read
 */

import { handler, ok } from '@/lib/api/envelope'
import { requireUser } from '@/lib/api/auth'
import { getUserNotifications, markNotificationsRead } from '@/lib/repositories/notifications'
import { epochToIso } from '@/lib/time'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = handler(async () => {
  const user = await requireUser()
  const { items } = await getUserNotifications(user.id)

  return ok({
    notifications: items.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      link: n.link,
      readAt: n.readAt ? epochToIso(n.readAt) : null,
      createdAt: epochToIso(n.createdAt),
    })),
  })
})

export const PATCH = handler(async (request) => {
  const user = await requireUser()
  const body = await request.json().catch(() => null)
  const ids = body?.id ? [body.id] : undefined
  await markNotificationsRead(user.id, ids)
  return ok({ success: true })
})