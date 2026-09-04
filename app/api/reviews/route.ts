/**
 * Reviews endpoints.
 *
 * GET  /api/reviews?movieId=xxx  — list visible reviews for a movie
 * POST /api/reviews               — create/update a review (auth required)
 */

import { handler, ok, Errors } from '@/lib/api/envelope'
import { requireUser } from '@/lib/api/auth'
import { reviewCreateSchema } from '@/lib/validations'
import { listReviews, createReview } from '@/lib/repositories/reviews'
import { epochToIso } from '@/lib/time'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = handler(async (request: Request) => {
  const { searchParams } = new URL(request.url)
  const movieId = searchParams.get('movieId')
  if (!movieId) throw Errors.validation('movieId is required')

  const reviews = await listReviews(movieId)
  return ok({
    reviews: reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      body: r.body,
      createdAt: epochToIso(r.createdAt),
    })),
  })
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
