/**
 * Zod schemas for all API input validation.
 * Each export validates one request shape and infers its TypeScript type.
 */

import { z } from 'zod'

/* ------------------------------------------------------------------ */
/* Primitive helpers                                                   */
/* ------------------------------------------------------------------ */

const uuid = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i, {
  message: 'Invalid id',
})

const youtubeUrl = z
  .string()
  .url()
  .refine(
    (u) =>
      u.includes('youtube.com/') ||
      u.includes('youtu.be/') ||
      u.includes('youtube.com/embed/'),
    'Must be a valid YouTube URL',
  )

/**
 * Shared page/perPage query validation. Exported so every list endpoint
 * (movies, requests, submissions, reviews, ...) speaks one pagination contract.
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
})

const sortDir = z.enum(['asc', 'desc']).default('desc')

/* ------------------------------------------------------------------ */
/* Movie                                                               */
/* ------------------------------------------------------------------ */

export const movieCreateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  alternativeTitles: z.array(z.string()).default([]),
  actors: z.array(z.string()).default([]),
  year: z.coerce.number().int().min(1900).max(2099).optional(),
  country: z.string().max(100).optional(),
  language: z.string().max(50).optional(),
  category: z.enum(['feature', 'short', 'documentary']).optional(),
  synopsis: z.string().max(5000).optional(),
  posterUrl: z.string().url().optional().or(z.literal('')),
  curationType: z.enum(['admin', 'requested', 'filmmaker']).optional(),
  youtubeVideoId: z.string().min(1, 'YouTube video id is required'),
  youtubeChannelName: z.string().optional(),
  previewStartSeconds: z.coerce.number().int().min(0).optional(),
})

export const movieUpdateSchema = movieCreateSchema.partial()

export const movieQuerySchema = paginationSchema.extend({
  category: z.enum(['feature', 'short', 'documentary']).optional(),
  country: z.string().optional(),
  language: z.string().optional(),
  year: z.coerce.number().int().optional(),
  q: z.string().max(200).optional(),
  sort: z.enum(['newest', 'rating', 'title', 'year']).default('newest'),
  sortDir,
})

export type MovieCreate = z.infer<typeof movieCreateSchema>
export type MovieUpdate = z.infer<typeof movieUpdateSchema>
export type MovieQuery = z.infer<typeof movieQuerySchema>

/* ------------------------------------------------------------------ */
/* Review                                                              */
/* ------------------------------------------------------------------ */

export const reviewCreateSchema = z.object({
  movieId: uuid,
  rating: z.number().int().min(1).max(5),
  body: z.string().max(2000).optional(),
})

export const reviewUpdateSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  body: z.string().max(2000).optional(),
})

export type ReviewCreate = z.infer<typeof reviewCreateSchema>
export type ReviewUpdate = z.infer<typeof reviewUpdateSchema>

/* ------------------------------------------------------------------ */
/* Submission                                                          */
/* ------------------------------------------------------------------ */

export const submissionCreateSchema = z.object({
  title: z.string().min(1).max(200),
  youtubeUrl,
  // 5000 matches the movie synopsis cap and YouTube's own description limit,
  // so an auto-fetched description can be carried through without truncation.
  description: z.string().max(5000).optional(),
})

export const submissionReviewSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  adminNotes: z.string().max(1000).optional(),
})

export type SubmissionCreate = z.infer<typeof submissionCreateSchema>
export type SubmissionReview = z.infer<typeof submissionReviewSchema>

/* ------------------------------------------------------------------ */
/* Filmmaker access application                                        */
/* ------------------------------------------------------------------ */

export const filmSubmissionApplicationSchema = z.object({
  message: z.string().min(1).max(2000).optional(),
})

/**
 * Review payload for the filmmaker access application review endpoint
 * (`PATCH /api/admin/filmmaker-applications/:id`). Mirrors the repository helper
 * `reviewFilmmakerApplication`.
 */
export const filmSubmissionApplicationReviewSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  rejectionReason: z.string().min(1).max(10000).optional(),
})

export type FilmSubmissionApplicationCreate = z.infer<typeof filmSubmissionApplicationSchema>
export type FilmSubmissionApplicationReview = z.infer<typeof filmSubmissionApplicationReviewSchema>

/* ------------------------------------------------------------------ */
/* Request                                                             */
/* ------------------------------------------------------------------ */

export const requestCreateSchema = z.object({
  requestedTitle: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
})

/* ------------------------------------------------------------------ */
/* Watchlist                                                           */
/* ------------------------------------------------------------------ */

export const watchlistToggleSchema = z.object({
  movieId: uuid,
})

/* ------------------------------------------------------------------ */
/* Watch progress                                                      */
/* ------------------------------------------------------------------ */

export const progressSchema = z.object({
  movieId: uuid,
  progressSeconds: z.number().min(0),
  durationSeconds: z.number().min(0).optional(),
  completed: z.boolean().optional(),
})

/* ------------------------------------------------------------------ */
/* Report                                                              */
/* ------------------------------------------------------------------ */

export const reportCreateSchema = z.object({
  entityType: z.enum(['movie', 'review', 'user']),
  entityId: uuid,
  reason: z.string().min(1).max(500),
})

/* ------------------------------------------------------------------ */
/* User profile                                                        */
/* ------------------------------------------------------------------ */

export const profileUpdateSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
})

/* ------------------------------------------------------------------ */
/* Admin                                                               */
/* ------------------------------------------------------------------ */

export const adminUserUpdateSchema = z.object({
  role: z.enum(['admin', 'creator', 'user']).optional(),
  status: z.enum(['active', 'suspended']).optional(),
})

/* ------------------------------------------------------------------ */
/* Playlist                                                            */
/* ------------------------------------------------------------------ */

export const playlistCreateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  movieIds: z.array(uuid).default([]),
})

export const playlistUpdateSchema = playlistCreateSchema.partial()

export const requestUpdateSchema = z.object({
  status: z.enum(['open', 'found', 'closed']),
  fulfilledByMovieId: uuid.optional(),
  /** Optional admin reason recorded for the review logs (mainly on close). */
  resolutionNote: z.string().max(1000).optional(),
})

export type RequestCreate = z.infer<typeof requestCreateSchema>
export type RequestUpdate = z.infer<typeof requestUpdateSchema>

/* ------------------------------------------------------------------ */
/* Admin request & review logs                                         */
/* ------------------------------------------------------------------ */

/**
 * Query params for GET /api/admin/logs. `status` is a per-type filter
 * (requests: found|closed - submissions/applications: approved|rejected) and
 * is narrowed in the repository; `q` searches title/applicant name/email.
 */
export const logsQuerySchema = paginationSchema.extend({
  type: z.enum(['requests', 'submissions', 'applications']).default('requests'),
  status: z.string().max(20).optional(),
  q: z.string().max(200).optional(),
})

export type LogsQuery = z.infer<typeof logsQuerySchema>
