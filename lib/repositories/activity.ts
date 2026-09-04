/**
 * Activity log repository.
 */

import { getDB } from '@/lib/db/client'
import { activityLogs, type ActivityLog } from '@/lib/db/schema'
import { eq, desc, and, count } from 'drizzle-orm'
import { nowEpoch } from '@/lib/time'

function db() { return getDB() }

export async function logActivity(data: {
  actorId?: string | null
  actorRole?: string | null
  action: string
  entityType?: string | null
  entityId?: string | null
  details?: string | null
}): Promise<void> {
  const { uuid_v7 } = await import('@/lib/ids')
  const d = db()
  await d.insert(activityLogs).values({
    id: uuid_v7(),
    actorId: data.actorId ?? null,
    actorRole: data.actorRole ?? null,
    action: data.action,
    entityType: data.entityType ?? null,
    entityId: data.entityId ?? null,
    details: data.details ?? null,
    createdAt: nowEpoch(),
  })
}

export async function getActivityLogs(params: {
  page?: number; perPage?: number
  actorId?: string
  action?: string
  entityType?: string
}): Promise<{ items: ActivityLog[]; total: number; page: number; perPage: number }> {
  const d = db()
  const page = params.page ?? 1
  const perPage = params.perPage ?? 50
  const off = (page - 1) * perPage
  const conds: any[] = []
  if (params.actorId) conds.push(eq(activityLogs.actorId, params.actorId))
  if (params.action) conds.push(eq(activityLogs.action, params.action))
  if (params.entityType) conds.push(eq(activityLogs.entityType, params.entityType))
  const where = conds.length ? and(...conds) : undefined
  const rows = await d.select().from(activityLogs).where(where).orderBy(desc(activityLogs.createdAt)).limit(perPage).offset(off).all()
  const countRows = await d.select({ value: count() }).from(activityLogs).where(where).all()
  const total = Number(countRows[0]?.value ?? 0)
  return { items: rows, total, page, perPage }
}