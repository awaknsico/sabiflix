/**
 * Film requests repository.
 */

import { getDB } from '@/lib/db/client'
import { filmRequests, type FilmRequest } from '@/lib/db/schema'
import { eq, desc, count } from 'drizzle-orm'
import { nowEpoch } from '@/lib/time'

function db() { return getDB() }

/** List requests — non-admins only see their own. */
export async function listRequests(userId?: string, includeAll: boolean = false): Promise<FilmRequest[]> {
  const d = db()
  const where = includeAll || !userId ? undefined : eq(filmRequests.userId, userId)
  const rows = await d.select().from(filmRequests).where(where).orderBy(desc(filmRequests.createdAt)).all()
  return rows
}

export async function getRequest(id: string): Promise<FilmRequest | null> {
  const rows = await db().select().from(filmRequests).where(eq(filmRequests.id, id)).all()
  return rows[0] ?? null
}

export async function createRequest(data: {
  requestedTitle: string; description?: string | null; userId: string;
}): Promise<FilmRequest> {
  const { uuid_v7 } = await import('@/lib/ids')
  const d = db()
  const now = nowEpoch()
  const values = {
    id: uuid_v7(), userId: data.userId, requestedTitle: data.requestedTitle,
    description: data.description ?? null, status: 'open' as const,
    fulfilledByMovieId: null, createdAt: now, updatedAt: now,
  }
  await d.insert(filmRequests).values(values)
  return values as FilmRequest
}

export async function updateRequest(id: string, data: Partial<{
  status: string; fulfilledByMovieId: string | null; updatedAt: number
}>): Promise<void> {
  const d = db()
  const updates: Record<string, unknown> = { updatedAt: data.updatedAt ?? nowEpoch() }
  if (data.status !== undefined) updates.status = data.status
  if (data.fulfilledByMovieId !== undefined) updates.fulfilledByMovieId = data.fulfilledByMovieId
  await d.update(filmRequests).set(updates).where(eq(filmRequests.id, id))
}

export async function countRequestsByStatus(): Promise<Record<string, number>> {
  const d = db()
  const rows = await d.select({ status: filmRequests.status, count: count() })
    .from(filmRequests).groupBy(filmRequests.status).all()
  return rows.reduce((acc: Record<string, number>, r: any) => {
    acc[r.status] = Number(r.count)
    return acc
  }, {})
}