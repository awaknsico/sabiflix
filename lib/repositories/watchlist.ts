/**
 * Watchlist repository.
 */

import { getDB } from '@/lib/db/client'
import { watchlist, movies } from '@/lib/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { nowEpoch } from '@/lib/time'

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

export async function toggleWatchlist(userId: string, movieId: string): Promise<boolean> {
  const d = db()
  const existing = await d.select().from(watchlist)
    .where(and(eq(watchlist.userId, userId), eq(watchlist.movieId, movieId))).all()
  if (existing[0]) {
    await d.delete(watchlist)
      .where(and(eq(watchlist.userId, userId), eq(watchlist.movieId, movieId)))
    return false
  }
  // watchlist uses a composite primary key (user_id, movie_id) — no separate id column
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