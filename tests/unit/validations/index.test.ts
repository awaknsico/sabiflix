/**
 * Unit tests for Zod validation schemas.
 */

import { describe, it, expect } from 'vitest'
import {
  paginationSchema,
  movieCreateSchema,
  movieUpdateSchema,
  movieQuerySchema,
  reviewCreateSchema,
  reviewUpdateSchema,
  watchlistToggleSchema,
  progressSchema,
  reportCreateSchema,
  profileUpdateSchema,
  adminUserUpdateSchema,
  playlistCreateSchema,
  playlistUpdateSchema,
  submissionCreateSchema,
  submissionReviewSchema,
  filmSubmissionApplicationSchema,
  filmSubmissionApplicationReviewSchema,
  requestCreateSchema,
  requestUpdateSchema,
  logsQuerySchema,
} from '@/lib/validations'

const VALID_UUID = '0190c0de-3000-7000-8000-000000000001'

describe('paginationSchema', () => {
  it('defaults page to 1 and perPage to 20', () => {
    expect(paginationSchema.parse({}).page).toBe(1)
    expect(paginationSchema.parse({}).perPage).toBe(20)
  })
  it('accepts custom page and perPage', () => {
    const r = paginationSchema.parse({ page: 3, perPage: 50 })
    expect(r.page).toBe(3)
    expect(r.perPage).toBe(50)
  })
  it('rejects perPage over 100', () => {
    expect(paginationSchema.safeParse({ perPage: 101 }).success).toBe(false)
  })
  it('rejects page 0', () => {
    expect(paginationSchema.safeParse({ page: 0 }).success).toBe(false)
  })
  it('rejects negative page', () => {
    expect(paginationSchema.safeParse({ page: -1 }).success).toBe(false)
  })
  it('coerces string numbers', () => {
    const r = paginationSchema.parse({ page: '2', perPage: '10' })
    expect(r.page).toBe(2)
    expect(r.perPage).toBe(10)
  })
})

describe('movieCreateSchema', () => {
  const valid = { title: 'Lagos Heat', youtubeVideoId: 'dQw4w9WgXcQ', category: 'feature', year: 2023 }
  it('accepts valid movie', () => {
    expect(movieCreateSchema.safeParse(valid).success).toBe(true)
  })
  it('rejects missing title', () => {
    expect(movieCreateSchema.safeParse({ ...valid, title: '' }).success).toBe(false)
  })
  it('rejects title longer than 200 chars', () => {
    expect(movieCreateSchema.safeParse({ ...valid, title: 'A'.repeat(201) }).success).toBe(false)
  })
  it('rejects missing youtubeVideoId', () => {
    expect(movieCreateSchema.safeParse({ ...valid, youtubeVideoId: '' }).success).toBe(false)
  })
  it('rejects year before 1900', () => {
    expect(movieCreateSchema.safeParse({ ...valid, year: 1899 }).success).toBe(false)
  })
  it('rejects year after 2099', () => {
    expect(movieCreateSchema.safeParse({ ...valid, year: 2100 }).success).toBe(false)
  })
  it('accepts optional fields omitted', () => {
    expect(movieCreateSchema.safeParse({ title: 'Minimal', youtubeVideoId: 'abc123' }).success).toBe(true)
  })
})

describe('movieUpdateSchema', () => {
  it('is partial - all fields optional', () => {
    expect(movieUpdateSchema.safeParse({}).success).toBe(true)
  })
  it('accepts only title update', () => {
    expect(movieUpdateSchema.safeParse({ title: 'New' }).success).toBe(true)
  })
})

describe('movieQuerySchema', () => {
  it('defaults sort to newest and sortDir to desc', () => {
    const r = movieQuerySchema.parse({})
    expect(r.sort).toBe('newest')
    expect(r.sortDir).toBe('desc')
  })
  it('accepts valid category filter', () => {
    expect(movieQuerySchema.parse({ category: 'short' }).category).toBe('short')
  })
  it('rejects invalid category', () => {
    expect(movieQuerySchema.safeParse({ category: 'invalid' }).success).toBe(false)
  })
  it('rejects q longer than 200 chars', () => {
    expect(movieQuerySchema.safeParse({ q: 'A'.repeat(201) }).success).toBe(false)
  })
  it('accepts all sort values', () => {
    for (const sort of ['newest', 'rating', 'title', 'year']) {
      expect(movieQuerySchema.safeParse({ sort }).success).toBe(true)
    }
  })
})

describe('reviewCreateSchema', () => {
  const valid = { movieId: VALID_UUID, rating: 5 }
  it('accepts valid rating 1-5', () => {
    for (const rating of [1, 2, 3, 4, 5]) {
      expect(reviewCreateSchema.safeParse({ ...valid, rating }).success).toBe(true)
    }
  })
  it('rejects rating 0', () => {
    expect(reviewCreateSchema.safeParse({ ...valid, rating: 0 }).success).toBe(false)
  })
  it('rejects rating 6', () => {
    expect(reviewCreateSchema.safeParse({ ...valid, rating: 6 }).success).toBe(false)
  })
  it('rejects negative rating', () => {
    expect(reviewCreateSchema.safeParse({ ...valid, rating: -1 }).success).toBe(false)
  })
  it('rejects invalid UUID', () => {
    expect(reviewCreateSchema.safeParse({ movieId: 'not-a-uuid', rating: 5 }).success).toBe(false)
  })

describe('reviewUpdateSchema', () => {
  it('is partial - all fields optional', () => {
    expect(reviewUpdateSchema.safeParse({}).success).toBe(true)
  })
  it('rejects rating 0 even in partial', () => {
    expect(reviewUpdateSchema.safeParse({ rating: 0 }).success).toBe(false)
  })
})

describe('watchlistToggleSchema', () => {
  it('accepts valid UUID', () => {
    expect(watchlistToggleSchema.safeParse({ movieId: VALID_UUID }).success).toBe(true)
  })
  it('rejects missing movieId', () => {
    expect(watchlistToggleSchema.safeParse({}).success).toBe(false)
  })
  it('rejects invalid UUID', () => {
    expect(watchlistToggleSchema.safeParse({ movieId: 'invalid' }).success).toBe(false)
  })
})

describe('progressSchema', () => {
  it('accepts valid progress', () => {
    expect(progressSchema.safeParse({ movieId: VALID_UUID, progressSeconds: 120 }).success).toBe(true)
  })
  it('rejects negative progressSeconds', () => {
    expect(progressSchema.safeParse({ movieId: VALID_UUID, progressSeconds: -1 }).success).toBe(false)
  })
  it('rejects missing movieId', () => {
    expect(progressSchema.safeParse({ progressSeconds: 10 }).success).toBe(false)
  })
})

describe('reportCreateSchema', () => {
  it('accepts valid report', () => {
    expect(reportCreateSchema.safeParse({ entityType: 'movie', entityId: VALID_UUID, reason: 'Bad' }).success).toBe(true)
  })
  it('accepts all entity types', () => {
    for (const type of ['movie', 'review', 'user']) {
      expect(reportCreateSchema.safeParse({ entityType: type, entityId: VALID_UUID, reason: 'Spam' }).success).toBe(true)
    }
  })
  it('rejects invalid entityType', () => {
    expect(reportCreateSchema.safeParse({ entityType: 'comment', entityId: VALID_UUID, reason: 'Spam' }).success).toBe(false)
  })
  it('rejects reason longer than 500 chars', () => {
    expect(reportCreateSchema.safeParse({ entityType: 'movie', entityId: VALID_UUID, reason: 'A'.repeat(501) }).success).toBe(false)
  })

describe('profileUpdateSchema', () => {
  it('accepts valid displayName', () => {
    expect(profileUpdateSchema.safeParse({ displayName: 'John' }).success).toBe(true)
  })
  it('rejects displayName longer than 100 chars', () => {
    expect(profileUpdateSchema.safeParse({ displayName: 'A'.repeat(101) }).success).toBe(false)
  })
  it('is partial', () => {
    expect(profileUpdateSchema.safeParse({}).success).toBe(true)
  })
})

describe('adminUserUpdateSchema', () => {
  it('accepts valid role', () => {
    for (const role of ['admin', 'creator', 'user']) {
      expect(adminUserUpdateSchema.safeParse({ role }).success).toBe(true)
    }
  })
  it('accepts valid status', () => {
    for (const status of ['active', 'suspended']) {
      expect(adminUserUpdateSchema.safeParse({ status }).success).toBe(true)
    }
  })
  it('rejects invalid role', () => {
    expect(adminUserUpdateSchema.safeParse({ role: 'superadmin' }).success).toBe(false)
  })
  it('is partial', () => {
    expect(adminUserUpdateSchema.safeParse({}).success).toBe(true)
  })
})

describe('playlistCreateSchema', () => {
  it('accepts valid playlist', () => {
    expect(playlistCreateSchema.safeParse({ name: 'Favs', movieIds: [VALID_UUID] }).success).toBe(true)
  })
  it('rejects missing name', () => {
    expect(playlistCreateSchema.safeParse({ name: '' }).success).toBe(false)
  })
  it('rejects name longer than 100 chars', () => {
    expect(playlistCreateSchema.safeParse({ name: 'A'.repeat(101) }).success).toBe(false)
  })
  it('rejects description longer than 500 chars', () => {
    expect(playlistCreateSchema.safeParse({ name: 'Test', description: 'A'.repeat(501) }).success).toBe(false)
  })
  it('defaults movieIds to empty array', () => {
    expect(playlistCreateSchema.parse({ name: 'Test' }).movieIds).toEqual([])
  })
})

describe('playlistUpdateSchema', () => {

describe('submissionCreateSchema', () => {
  it('accepts valid submission', () => {
    expect(submissionCreateSchema.safeParse({
      title: 'Film',
      youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    }).success).toBe(true)
  })
  it('rejects missing title', () => {
    expect(submissionCreateSchema.safeParse({ title: '', youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }).success).toBe(false)
  })
  it('rejects non-YouTube URL', () => {
    expect(submissionCreateSchema.safeParse({ title: 'Test', youtubeUrl: 'https://vimeo.com/123' }).success).toBe(false)
  })
  it('rejects title longer than 200 chars', () => {
    expect(submissionCreateSchema.safeParse({ title: 'A'.repeat(201), youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }).success).toBe(false)
  })
})

describe('submissionReviewSchema', () => {
  it('accepts approved', () => {
    expect(submissionReviewSchema.safeParse({ status: 'approved' }).success).toBe(true)
  })
  it('accepts rejected', () => {
    expect(submissionReviewSchema.safeParse({ status: 'rejected' }).success).toBe(true)
  })
  it('rejects invalid status', () => {
    expect(submissionReviewSchema.safeParse({ status: 'pending' }).success).toBe(false)
  })
  it('rejects adminNotes longer than 1000 chars', () => {
    expect(submissionReviewSchema.safeParse({ status: 'rejected', adminNotes: 'A'.repeat(1001) }).success).toBe(false)
  })
})

describe('filmSubmissionApplicationSchema', () => {
  it('accepts valid application', () => {
    expect(filmSubmissionApplicationSchema.safeParse({ message: 'Hi' }).success).toBe(true)
  })
  it('rejects message longer than 2000 chars', () => {
    expect(filmSubmissionApplicationSchema.safeParse({ message: 'A'.repeat(2001) }).success).toBe(false)
  })
  it('accepts optional message', () => {
    expect(filmSubmissionApplicationSchema.safeParse({}).success).toBe(true)
  })
})

describe('filmSubmissionApplicationReviewSchema', () => {
  it('accepts approved', () => {
    expect(filmSubmissionApplicationReviewSchema.safeParse({ status: 'approved' }).success).toBe(true)
  })
  it('rejects invalid status', () => {
    expect(filmSubmissionApplicationReviewSchema.safeParse({ status: 'pending' }).success).toBe(false)
  })
  it('rejects rejectionReason longer than 10000 chars', () => {
    expect(filmSubmissionApplicationReviewSchema.safeParse({ status: 'rejected', rejectionReason: 'A'.repeat(10001) }).success).toBe(false)
  })
})

describe('requestCreateSchema', () => {
  it('accepts valid request', () => {
    expect(requestCreateSchema.safeParse({ requestedTitle: 'Film' }).success).toBe(true)
  })
  it('rejects missing requestedTitle', () => {
    expect(requestCreateSchema.safeParse({ requestedTitle: '' }).success).toBe(false)
  })
  it('rejects requestedTitle longer than 200 chars', () => {
    expect(requestCreateSchema.safeParse({ requestedTitle: 'A'.repeat(201) }).success).toBe(false)
  })
})

describe('requestUpdateSchema', () => {
  it('accepts all status values', () => {
    for (const status of ['open', 'found', 'closed']) {
      expect(requestUpdateSchema.safeParse({ status }).success).toBe(true)
    }
  })
  it('rejects invalid status', () => {
    expect(requestUpdateSchema.safeParse({ status: 'archived' }).success).toBe(false)
  })
  it('rejects resolutionNote longer than 1000 chars', () => {
    expect(requestUpdateSchema.safeParse({ status: 'closed', resolutionNote: 'A'.repeat(1001) }).success).toBe(false)
  })
})

describe('logsQuerySchema', () => {
  it('defaults type to requests', () => {
    expect(logsQuerySchema.parse({}).type).toBe('requests')
  })
  it('accepts all types', () => {
    for (const type of ['requests', 'submissions', 'applications']) {
      expect(logsQuerySchema.safeParse({ type }).success).toBe(true)
    }
  })
  it('rejects q longer than 200 chars', () => {
    expect(logsQuerySchema.safeParse({ q: 'A'.repeat(201) }).success).toBe(false)
  })
  it('rejects status longer than 20 chars', () => {
    expect(logsQuerySchema.safeParse({ status: 'A'.repeat(21) }).success).toBe(false)
  })
})
  it('is partial', () => {
    expect(playlistUpdateSchema.safeParse({}).success).toBe(true)
  })
})
  it('rejects empty reason', () => {
    expect(reportCreateSchema.safeParse({ entityType: 'movie', entityId: VALID_UUID, reason: '' }).success).toBe(false)
  })
})
  it('accepts optional body', () => {
    expect(reviewCreateSchema.safeParse({ ...valid, body: 'Great!' }).success).toBe(true)
  })
  it('rejects body longer than 2000 chars', () => {
    expect(reviewCreateSchema.safeParse({ ...valid, body: 'A'.repeat(2001) }).success).toBe(false)
  })
})