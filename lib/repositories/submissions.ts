/**
 * Film submissions repository.
 */

import { getDB } from '@/lib/db/client'
import { filmSubmissions, users, type FilmSubmission } from '@/lib/db/schema'
import { eq, and, desc, sql, count } from 'drizzle-orm'
import { nowEpoch } from '@/lib/time'

function db() { return getDB() }

export type FilmSubmissionRow = FilmSubmission & { userDisplayName: string | null }

export async function listSubmissions(
  userId: string, includeAll: boolean = false,
): Promise<FilmSubmissionRow[]> {
  const d = db()
  const where = includeAll ? undefined : eq(filmSubmissions.userId, userId)
  const rows = await d
    .select({
      id: filmSubmissions.id,
      userId: filmSubmissions.userId,
      title: filmSubmissions.title,
      youtubeUrl: filmSubmissions.youtubeUrl,
      youtubeVideoId: filmSubmissions.youtubeVideoId,
      description: filmSubmissions.description,
      status: filmSubmissions.status,
      adminNotes: filmSubmissions.adminNotes,
      reviewedBy: filmSubmissions.reviewedBy,
      reviewedAt: filmSubmissions.reviewedAt,
      publishedMovieId: filmSubmissions.publishedMovieId,
      createdAt: filmSubmissions.createdAt,
      updatedAt: filmSubmissions.updatedAt,
      userDisplayName: users.displayName,
    })
    .from(filmSubmissions)
    .leftJoin(users, eq(users.id, filmSubmissions.userId))
    .where(where)
    .orderBy(desc(filmSubmissions.createdAt))
    .all()
  return rows as unknown as FilmSubmissionRow[]
}

export async function getSubmission(id: string): Promise<FilmSubmission | null> {
  const rows = await db().select().from(filmSubmissions).where(eq(filmSubmissions.id, id)).all()
  return rows[0] ?? null
}

export async function createSubmission(data: {
  userId: string; title: string; youtubeUrl: string; youtubeVideoId: string | null; description?: string | null
}): Promise<FilmSubmission> {
  const { uuid_v7 } = await import('@/lib/ids')
  const d = db()
  const now = nowEpoch()
  const values = {
    id: uuid_v7(), userId: data.userId, title: data.title,
    youtubeUrl: data.youtubeUrl, youtubeVideoId: data.youtubeVideoId,
    description: data.description ?? null, status: 'pending' as const,
    adminNotes: null, reviewedBy: null, reviewedAt: null,
    publishedMovieId: null, createdAt: now, updatedAt: now,
  }
  await d.insert(filmSubmissions).values(values)
  return values as FilmSubmission
}

export async function updateSubmission(id: string, data: Partial<{
  status: string; adminNotes: string | null; reviewedBy: string | null;
  reviewedAt: number | null; publishedMovieId: string | null; updatedAt: number
}>): Promise<void> {
  const d = db()
  const updates: Record<string, unknown> = { updatedAt: data.updatedAt ?? nowEpoch() }
  if (data.status !== undefined) updates.status = data.status
  if (data.adminNotes !== undefined) updates.adminNotes = data.adminNotes
  if (data.reviewedBy !== undefined) updates.reviewedBy = data.reviewedBy
  if (data.reviewedAt !== undefined) updates.reviewedAt = data.reviewedAt
  if (data.publishedMovieId !== undefined) updates.publishedMovieId = data.publishedMovieId
  await d.update(filmSubmissions).set(updates).where(eq(filmSubmissions.id, id))
}

export async function countSubmissionsByStatus(): Promise<Record<string, number>> {
  const d = db()
  const rows = await d.select({ status: filmSubmissions.status, count: sql`count(*)` })
    .from(filmSubmissions).groupBy(filmSubmissions.status).all()
  return rows.reduce((acc: Record<string, number>, r: any) => {
    acc[r.status] = Number(r.count)
    return acc
  }, {})
}