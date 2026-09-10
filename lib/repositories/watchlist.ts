/**
 * Watchlist repository.
 */

import { getDB } from '@/lib/db/client'
import { watchlist, movies } from '@/lib/db/schema'
import { eq, and, desc, count } from 'drizzle-orm'
import { nowEpoch } from '@/lib/time'
import type { Paged } from '@/lib/api/pagination'

function db() { return getDB() }

export interface WatchlistItem {
  movieId: string
  title: string
  posterUrl: string | null
  year: number | null
  category: string | null
  addedAt: number
}

export async function getWatchlist(userId: string): Promise<WatchlistItem[]> {
  const rows = await db()
    .select({
      movieId: watchlist.movieId, title: movies.title, posterUrl: movies.posterUrl,
      year: movies.year, category: movies.category, addedAt: watchlist.createdAt,
    })
    .from(watchlist)
    .innerJoin(movies, eq(movies.id, watchlist.movieId))
    .where(eq(watchlist.userId, userId))
    .orderBy(desc(watchlist.createdAt))
    .all()
  return rows as unknown as WatchlistItem[]
}

/**
 * Paged window over the same list, for surfaces that render the watchlist in
 * full (the default `/api/watchlist` response stays complete because the
 * client-side toggle state needs every id).
 */
export async function getWatchlistPage(
  userId: string,
  params: { page?: number; perPage?: number },
): Promise<Paged<WatchlistItem>> {
  const d = db()
  const page = params.page ?? 1
  const perPage = params.perPage ?? 20
  const off = (page - 1) * perPage
  const where = eq(watchlist.userId, userId)
  const rows = await d
    .select({
      movieId: watchlist.movieId, title: movies.title, posterUrl: movies.posterUrl,
      year: movies.year, category: movies.category, addedAt: watchlist.createdAt,
    })
    .from(watchlist)
    .innerJoin(movies, eq(movies.id, watchlist.movieId))
    .where(where)
    .orderBy(desc(watchlist.createdAt))
    .limit(perPage)
    .offset(off)
    .all()
  const countRows = await d.select({ value: count() }).from(watchlist).where(where).all()
  return {
    items: rows as unknown as WatchlistItem[],
    total: Number(countRows[0]?.value ?? 0),
    page,
    perPage,
  }
}

export async function toggleWatchlist(userId: string, movieId: string): Promise<boolean> {
  const d = db()
  const existing = await d.select().from(watchlist)
    .where(and(eq(watchlist.userId, userId), eq(watchlist.movieId, movieId))).all()
  if (existing[0]) {
    await d.delete(watchlist)
      .where(and(eq(watchlist.userId, userId), eq(watchlist.movieId, movieId)))
    return false
  }
  // watchlist uses a composite primary key (user_id, movie_id) - no separate id column
  await d.insert(watchlist).values({
    userId, movieId, createdAt: nowEpoch(),
  })
  return true
}

export async function isInWatchlist(userId: string, movieId: string): Promise<boolean> {
  const rows = await db().select().from(watchlist)
    .where(and(eq(watchlist.userId, userId), eq(watchlist.movieId, movieId))).all()
  return !!rows[0]
}

export async function removeFromWatchlist(userId: string, movieId: string): Promise<boolean> {
  const d = db()
  const existing = await d.select().from(watchlist)
    .where(and(eq(watchlist.userId, userId), eq(watchlist.movieId, movieId))).all()
  if (!existing[0]) return false
  await d.delete(watchlist)
    .where(and(eq(watchlist.userId, userId), eq(watchlist.movieId, movieId)))
  return true
}