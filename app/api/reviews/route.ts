/**
 * Reviews endpoints.
 *
 * GET  /api/reviews?movieId=xxx  — list visible reviews for a movie
 * POST /api/reviews               — create/update a review (auth required)
 */

import { handler, ok, Errors } from '@/lib/api/envelope'
import { requireUser } from '@/lib/api/auth'
import { checkRateLimit } from '@/lib/api/rate-limit'
import { reviewCreateSchema } from '@/lib/validations'
import { parsePaginationParams, paginationMeta } from '@/lib/api/pagination'
import { listReviews, createReview } from '@/lib/repositories/reviews'
import { epochToIso } from '@/lib/time'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = handler(async (request: Request) => {
  // Rate limit: 60 requests per minute per IP
  const rateLimit = await checkRateLimit(request, 'reviews', 60, 60)
  if (!rateLimit.allowed) return rateLimit.response

  const { searchParams } = new URL(request.url)
  const movieId = searchParams.get('movieId')
  if (!movieId) throw Errors.validation('movieId is required')

  const { page, perPage } = parsePaginationParams(searchParams, 10)
  const { items, total } = await listReviews(movieId, { page, perPage })
  return ok(
    {
      reviews: items.map((r) => ({
        id: r.id,
        rating: r.rating,
        body: r.body,
        createdAt: epochToIso(r.createdAt),
      })),
    },
    paginationMeta(page, perPage, total),
  )
})

export const POST = handler(async (request: Request) => {
  const user = await requireUser()
  const body = await request.json().catch(() => null)
  if (!body) throw Errors.validation('Request body must be valid JSON')

  const data = reviewCreateSchema.parse(body)
  const review = await createReview({
    movieId: data.movieId,
    userId: user.id,
    rating: data.rating,
    body: data.body,
  })

  return ok(
    {
      review: {
        id: review!.id,
        rating: review!.rating,
        body: review!.body,
        createdAt: epochToIso(review!.createdAt),
      },
    },
    undefined,
    201,
  )
})
