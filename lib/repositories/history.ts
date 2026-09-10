/**
 * Watch history repository.
 */

import { getDB } from '@/lib/db/client'
import { watchHistory, movies } from '@/lib/db/schema'
import { eq, and, desc, count } from 'drizzle-orm'
import { nowEpoch } from '@/lib/time'
import type { Paged } from '@/lib/api/pagination'

function db() { return getDB() }

export interface HistoryEntry {
  id: string
  movieId: string
  title: string
  posterUrl: string | null
  year: number | null
  progressSeconds: number
  durationSeconds: number
  completedAt: number | null
  updatedAt: number
}

export async function recordProgress(data: {
  userId: string; movieId: string; progressSeconds: number; durationSeconds?: number; completed?: boolean
}): Promise<HistoryEntry | null> {
  const d = db()
  const now = nowEpoch()
  const existing = await d.select().from(watchHistory)
    .where(and(eq(watchHistory.userId, data.userId), eq(watchHistory.movieId, data.movieId))).all()
  const effectiveDuration = data.durationSeconds ?? existing[0]?.durationSeconds ?? 0
  const reachedEnd =
    data.completed === true ||
    (effectiveDuration > 0 && data.progressSeconds >= effectiveDuration) ||
    (effectiveDuration > 0 && data.progressSeconds / effectiveDuration >= 0.95)
  // Once finished, stay finished unless the viewer rewinds well below the
  // completion threshold (explicit replay). A plain progress heartbeat must
  // never clear a previous completion.
  const nextCompletedAt = reachedEnd
    ? now
    : data.completed === false
      ? null
      : (existing[0]?.completedAt ?? null)
  if (existing[0]) {
    await d.update(watchHistory)
      .set({
        progressSeconds: data.progressSeconds,
        durationSeconds: data.durationSeconds ?? existing[0].durationSeconds,
        completedAt: nextCompletedAt,
        updatedAt: now,
      })
      .where(eq(watchHistory.id, existing[0].id))
  } else {
    const { uuid_v7 } = await import('@/lib/ids')
    await d.insert(watchHistory).values({
      id: uuid_v7(), userId: data.userId, movieId: data.movieId,
      progressSeconds: data.progressSeconds,
      durationSeconds: data.durationSeconds ?? 0,
      completedAt: nextCompletedAt,
      updatedAt: now, createdAt: now,
    })
  }
  return getLastProgressEntry(data.userId, data.movieId)
}

export async function getLastProgressEntry(userId: string, movieId: string): Promise<HistoryEntry | null> {
  const rows = await db()
    .select({
      id: watchHistory.id, movieId: watchHistory.movieId, title: movies.title,
      posterUrl: movies.posterUrl, year: movies.year,
      progressSeconds: watchHistory.progressSeconds,
      durationSeconds: watchHistory.durationSeconds,
      completedAt: watchHistory.completedAt,
      updatedAt: watchHistory.updatedAt,
    })
    .from(watchHistory)
    .innerJoin(movies, eq(movies.id, watchHistory.movieId))
    .where(and(eq(watchHistory.userId, userId), eq(watchHistory.movieId, movieId)))
    .limit(1)
    .all()
  const r = rows[0]
  return r ? (r as unknown as HistoryEntry) : null
}

/** Resume list — recent watch history entries, most recently watched first. */
export async function getResumeList(userId: string, limit = 50): Promise<HistoryEntry[]> {
  const rows = await db()
    .select({
      id: watchHistory.id, movieId: watchHistory.movieId, title: movies.title,
      posterUrl: movies.posterUrl, year: movies.year,
      progressSeconds: watchHistory.progressSeconds,
      durationSeconds: watchHistory.durationSeconds,
      completedAt: watchHistory.completedAt,
      updatedAt: watchHistory.updatedAt,
    })
    .from(watchHistory)
    .innerJoin(movies, eq(movies.id, watchHistory.movieId))
    .where(eq(watchHistory.userId, userId))
    .orderBy(desc(watchHistory.updatedAt))
    .limit(limit)
    .all()
  return rows as unknown as HistoryEntry[]
}

export async function getHistory(userId: string, limit = 50): Promise<HistoryEntry[]> {
  return getResumeList(userId, limit)
}

/**
 * Paged window over the full watch history, for surfaces that page through
 * it (the default `/api/watch-history` response stays the 50-entry resume
 * list that client stores expect).
 */
export async function getHistoryPage(
  userId: string,
  params: { page?: number; perPage?: number },
): Promise<Paged<HistoryEntry>> {
  const d = db()
  const page = params.page ?? 1
  const perPage = params.perPage ?? 20
  const off = (page - 1) * perPage
  const where = eq(watchHistory.userId, userId)
  const rows = await d
    .select({
      id: watchHistory.id, movieId: watchHistory.movieId, title: movies.title,
      posterUrl: movies.posterUrl, year: movies.year,
      progressSeconds: watchHistory.progressSeconds,
      durationSeconds: watchHistory.durationSeconds,
      completedAt: watchHistory.completedAt,
      updatedAt: watchHistory.updatedAt,
    })
    .from(watchHistory)
    .innerJoin(movies, eq(movies.id, watchHistory.movieId))
    .where(where)
    .orderBy(desc(watchHistory.updatedAt))
    .limit(perPage)
    .offset(off)
    .all()
  const countRows = await d.select({ value: count() }).from(watchHistory).where(where).all()
  return {
    items: rows as unknown as HistoryEntry[],
    total: Number(countRows[0]?.value ?? 0),
    page,
    perPage,
  }
}

export async function getContinueWatching(userId: string, limit = 10): Promise<HistoryEntry[]> {
  return getResumeList(userId, limit)
}

export async function getLastProgress(userId: string, movieId: string): Promise<number | null> {
  const rows = await db().select({ progressSeconds: watchHistory.progressSeconds })
    .from(watchHistory)
    .where(and(eq(watchHistory.userId, userId), eq(watchHistory.movieId, movieId)))
    .orderBy(desc(watchHistory.updatedAt))
    .limit(1)
    .all()
  return rows[0]?.progressSeconds ?? null
}

export async function countHistoryForUser(userId: string): Promise<number> {
  const rows = await db().select({ value: count() }).from(watchHistory)
    .where(eq(watchHistory.userId, userId)).all()
  return Number(rows[0]?.value ?? 0)
}