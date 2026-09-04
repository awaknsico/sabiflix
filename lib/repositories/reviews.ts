/**
 * Reviews repository.
 */

import { getDB } from '@/lib/db/client'
import { getMovieById } from './movies'
import { reviews, users, movies } from '@/lib/db/schema'
import { eq, and, desc, count, avg, asc } from 'drizzle-orm'
import { uuid_v7 } from '@/lib/ids'
import { nowEpoch } from '@/lib/time'

function db() { return getDB() }

export interface ReviewListItem {
  id: string
  rating: number
  body: string | null
  createdAt: number
  displayName: string | null
  avatarUrl: string | null
}

export async function listReviews(movieId: string): Promise<ReviewListItem[]> {
  const rows = await db()
    .select({
      id: reviews.id, rating: reviews.rating, body: reviews.body, createdAt: reviews.createdAt,
      displayName: users.displayName, avatarUrl: users.avatarUrl,
    })
    .from(reviews)
    .innerJoin(users, eq(users.id, reviews.userId))
    .where(and(eq(reviews.movieId, movieId), eq(reviews.status, 'visible')))
    .orderBy(desc(reviews.createdAt))
    .all()
  return rows as unknown as ReviewListItem[]
}

export async function createReview(data: {
  movieId: string; userId: string; rating: number; body?: string | null
}): Promise<ReviewListItem> {
  const d = db()
  const now = nowEpoch()
  const id = uuid_v7()
  await d.insert(reviews).values({
    id, movieId: data.movieId, userId: data.userId,
    rating: data.rating, body: data.body ?? null,
    status: 'visible', createdAt: now, updatedAt: now,
  })

  // Recompute the movie's aggregate rating
  const agg = await d.select({ count: count(), avg: avg(reviews.rating) })
    .from(reviews).where(eq(reviews.movieId, data.movieId)).all()
  const avgRating = Math.round(Number(agg[0]?.avg ?? 0) * 10) / 10
  const ratingCount = Number(agg[0]?.count ?? 0)
  await d.update(movies).set({ avgRating, ratingCount, updatedAt: now }).where(eq(movies.id, data.movieId))

  const user = await d.select().from(users).where(eq(users.id, data.userId)).all()
  return {
    id,
    rating: data.rating,
    body: data.body ?? null,
    createdAt: now,
    displayName: user[0]?.displayName ?? 'Anonymous',
    avatarUrl: user[0]?.avatarUrl ?? null,
  }
}

export async function getUserReview(movieId: string, userId: string) {
  const rows = await db().select().from(reviews)
    .where(and(eq(reviews.movieId, movieId), eq(reviews.userId, userId))).all()
  return rows[0] ?? null
}

export async function updateReview(id: string, data: { rating?: number; body?: string | null }) {
  const d = db()
  const rows = await d.select().from(reviews).where(eq(reviews.id, id)).all()
  if (!rows[0]) return null
  const now = nowEpoch()
  const updates: Record<string, unknown> = { updatedAt: now }
  if (data.rating !== undefined) updates.rating = data.rating
  if (data.body !== undefined) updates.body = data.body
  await d.update(reviews).set(updates).where(eq(reviews.id, id))

  // Recompute aggregate rating
  const agg = await d.select({ count: count(), avg: avg(reviews.rating) })
    .from(reviews).where(eq(reviews.movieId, rows[0].movieId)).all()
  const avgRating = Math.round(Number(agg[0]?.avg ?? 0) * 10) / 10
  const ratingCount = Number(agg[0]?.count ?? 0)
  await d.update(movies).set({ avgRating, ratingCount, updatedAt: now }).where(eq(movies.id, rows[0].movieId))

  return rows[0]
}

export async function deleteReview(id: string): Promise<boolean> {
  const d = db()
  const rows = await d.select().from(reviews).where(eq(reviews.id, id)).all()
  if (!rows[0]) return false
  await d.delete(reviews).where(eq(reviews.id, id))
  const movie = await getMovieById(rows[0].movieId)
  if (movie) {
    const agg = await d.select({ count: count(), avg: avg(reviews.rating) })
      .from(reviews).where(eq(reviews.movieId, rows[0].movieId)).all()
    await d.update(movies).set({
      avgRating: Math.round(Number(agg[0]?.avg ?? 0) * 10) / 10,
      ratingCount: Number(agg[0]?.count ?? 0),
    }).where(eq(movies.id, rows[0].movieId))
  }
  return true
}