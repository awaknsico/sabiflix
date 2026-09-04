/**
 * Admin stats repository.
 */

import { getDB } from '@/lib/db/client'
import { movies, reviews, users, filmSubmissions, filmRequests, watchlist } from '@/lib/db/schema'
import { sql, count, eq, ne } from 'drizzle-orm'
import { countSubmissionsByStatus } from './submissions'
import { countRequestsByStatus } from './requests'

function db() { return getDB() }

export async function getAdminStats(): Promise<{
  totalMovies: number
  totalUsers: number
  totalReviews: number
  totalWatchlistItems: number
  totalSubmissions: Record<string, number>
  totalRequests: Record<string, number>
}> {
  const d = db()
  const mCount = await d.select({ value: count() }).from(movies).where(eq(movies.isActive, true)).all()
  const uCount = await d.select({ value: count() }).from(users).all()
  const rCount = await d.select({ value: count() }).from(reviews).all()
  const wCount = await d.select({ value: count() }).from(watchlist).all()
  const submissions = await countSubmissionsByStatus()
  const requests = await countRequestsByStatus()
  return {
    totalMovies: Number(mCount[0]?.value ?? 0),
    totalUsers: Number(uCount[0]?.value ?? 0),
    totalReviews: Number(rCount[0]?.value ?? 0),
    totalWatchlistItems: Number(wCount[0]?.value ?? 0),
    totalSubmissions: submissions,
    totalRequests: requests,
  }
}