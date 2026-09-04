/**
 * Consistent API response envelope + helpers.
 *
 * Every JSON response from the API follows the same shape so the frontend
 * can handle errors uniformly:
 *
 *   { ok: true, data: ... }            success
 *   { ok: false, error: "...", code: "..." }   failure (with optional machine code)
 */

import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

export interface ApiSuccess<T> {
  ok: true
  data: T
  meta?: {
    page?: number
    perPage?: number
    total?: number
    hasMore?: boolean
  }
}

export interface ApiError {
  ok: false
  error: string
  code?: string
  details?: unknown
}

export function ok<T>(data: T, meta?: ApiSuccess<T>['meta'], status = 200): NextResponse {
  return NextResponse.json({ ok: true, data, meta } satisfies ApiSuccess<T>, { status })
}

export function fail(
  error: string,
  status = 400,
  code?: string,
  details?: unknown,
): NextResponse {
  return NextResponse.json(
    { ok: false, error, code, details } satisfies ApiError,
    { status },
  )
}

/** Wrap a handler so thrown errors become clean JSON responses. */
export function handler<T extends any[]>(
  fn: (...args: T) => Promise<NextResponse>,
): (...args: T) => Promise<NextResponse> {
  return async (...args: T) => {
    try {
      return await fn(...args)
    } catch (err) {
      if (err instanceof ZodError) {
        return fail('Validation failed', 422, 'VALIDATION_ERROR', err.flatten())
      }
      if (err instanceof ApiHttpError) {
        return fail(err.message, err.status, err.code)
      }
      console.error('[API error]', err)
      const message = err instanceof Error ? err.message : 'Internal server error'
      return fail(message, 500, 'INTERNAL_ERROR')
    }
  }
}

/** Throw this inside a handler to short-circuit with a specific status. */
export class ApiHttpError extends Error {
  status: number
  code?: string
  constructor(message: string, status = 400, code?: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

export const Errors = {
  unauthorized: () => new ApiHttpError('Authentication required', 401, 'UNAUTHORIZED'),
  forbidden: () => new ApiHttpError('You do not have permission', 403, 'FORBIDDEN'),
  notFound: (what = 'Resource') => new ApiHttpError(`${what} not found`, 404, 'NOT_FOUND'),
  validation: (msg: string) => new ApiHttpError(msg, 422, 'VALIDATION_ERROR'),
  rateLimited: () => new ApiHttpError('Too many requests', 429, 'RATE_LIMITED'),
}
