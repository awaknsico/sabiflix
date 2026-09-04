/**
 * Notifications repository.
 */

import { getDB } from '@/lib/db/client'
import { notifications, type Notification } from '@/lib/db/schema'
import { eq, and, desc, or, count, isNull } from 'drizzle-orm'
import { nowEpoch } from '@/lib/time'

function db() { return getDB() }

export async function getUserNotifications(userId: string, params: {
  page?: number; perPage?: number; unreadOnly?: boolean
} = {}): Promise<{ items: Notification[]; total: number; page: number; perPage: number }> {
  const d = db()
  const page = params.page ?? 1
  const perPage = params.perPage ?? 50
  const off = (page - 1) * perPage
  const conds: any[] = [eq(notifications.userId, userId)]
  if (params.unreadOnly) conds.push(isNull(notifications.readAt))
  const where = and(...conds)
  const rows = await d.select().from(notifications).where(where).orderBy(desc(notifications.createdAt)).limit(perPage).offset(off).all()
  const countRows = await d.select({ value: count() }).from(notifications).where(where).all()
  const total = Number(countRows[0]?.value ?? 0)
  return { items: rows, total, page, perPage }
}

export async function createNotification(data: {
  userId: string; type: string; title: string; body?: string | null; link?: string | null
}): Promise<Notification> {
  const { uuid_v7 } = await import('@/lib/ids')
  const d = db()
  const now = nowEpoch()
  const values = {
    id: uuid_v7(), userId: data.userId, type: data.type, title: data.title,
    body: data.body ?? null, link: data.link ?? null, createdAt: now,
  }
  await d.insert(notifications).values(values)
  return values as Notification
}

export async function markNotificationsRead(userId: string, ids?: string[]): Promise<void> {
  const d = db()
  const now = nowEpoch()
  if (ids && ids.length) {
    const conds = ids.map((id) => eq(notifications.id, id))
    await d.update(notifications).set({ readAt: now }).where(and(eq(notifications.userId, userId), or(...conds)))
  } else {
    await d.update(notifications).set({ readAt: now }).where(eq(notifications.userId, userId))
  }
}

export async function countUnread(userId: string): Promise<number> {
  const rows = await db().select({ value: count() }).from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt))).all()
  return Number(rows[0]?.value ?? 0)
}