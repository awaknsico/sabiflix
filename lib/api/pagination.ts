/**
 * Shared pagination contract for list endpoints.
 *
 * Every paginated GET endpoint:
 *   1. validates `?page=&perPage=` with `parsePaginationParams`,
 *   2. queries a paged window in its repository,
 *   3. answers with the standard envelope meta `{ page, perPage, total, hasMore }`
 *      (see `ApiSuccess['meta']` in '@/lib/api/envelope').
 */

import { paginationSchema } from '@/lib/validations'

/** Repository-level paged result shape (mirrors `listMovies`). */
export interface Paged<T> {
  items: T[]
  total: number
  page: number
  perPage: number
}

/**
 * Parse + validate `?page=&perPage=` from a URL's search params.
 * Falls back to page 1 and `defaultPerPage` when the params are absent.
 */
export function parsePaginationParams(
  searchParams: URLSearchParams,
  defaultPerPage = 20,
): { page: number; perPage: number } {
  return paginationSchema.parse({
    page: searchParams.get('page') ?? '1',
    perPage: searchParams.get('perPage') ?? String(defaultPerPage),
  })
}

/** Build the standard envelope meta for a paged response. */
export function paginationMeta(page: number, perPage: number, total: number): {
  page: number
  perPage: number
  total: number
  hasMore: boolean
} {
  return { page, perPage, total, hasMore: page * perPage < total }
}
