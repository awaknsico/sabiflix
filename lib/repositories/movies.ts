/**
 * Movie repository — all D1/SQLite access for movies and sources.
 */

import { getDB } from '@/lib/db/client'
import { movies, movieSources, type NewMovie } from '@/lib/db/schema'
import { eq, and, desc, asc, sql, like, or, count, inArray } from 'drizzle-orm'
import { nowEpoch } from '@/lib/time'
import { uuid_v7 } from '@/lib/ids'

function db() { return getDB() }

export interface MovieListItem {
  id: string; title: string; year: number | null; country: string | null
  language: string | null; category: string | null; posterUrl: string | null
  actors: string[]; synopsis: string | null; isActive: boolean
  curationType: string | null; avgRating: number; ratingCount: number
  youtubeVideoId: string | null
}

export interface MovieSource {
  id: string; youtubeVideoId: string; youtubeChannelName: string | null
  partNumber: number; isPrimary: boolean; quality: string | null
  previewStartSeconds: number | null
}

export interface MovieDetail {
  id: string; title: string; alternativeTitles: string[]; actors: string[]
  year: number | null; country: string | null; language: string | null
  category: string | null; synopsis: string | null; posterUrl: string | null
  curationType: string | null; avgRating: number; ratingCount: number
  createdAt: number; updatedAt: number; sources: MovieSource[]
}

/** Input type for movie create/update — accepts JS arrays for JSON columns. */
export interface MovieInput {
  /** Client-supplied id (e.g. to preserve a `mov-pub-…` slug). When absent, createMovie generates a UUID. */
  id?: string
  title?: string
  alternativeTitles?: string[] | string
  actors?: string[] | string
  year?: number | null
  country?: string | null
  language?: string | null
  category?: string | null
  synopsis?: string | null
  posterUrl?: string | null
  curationType?: string | null
  isActive?: boolean
  avgRating?: number
  ratingCount?: number
  createdBy?: string | null
  youtubeVideoId?: string
  youtubeChannelName?: string | null
  quality?: string | null
  previewStartSeconds?: number | null
}

function parseJson(value: string | null): string[] {
  if (!value) return []
  try {
    const p = JSON.parse(value)
    return Array.isArray(p) ? p.filter((x: any) => typeof x === 'string') : []
  } catch { return [] }
}

function toJson(value: string[] | string | undefined): string {
  if (value === undefined) return '[]'
  return Array.isArray(value) ? JSON.stringify(value) : value
}

export async function listMovies(params: {
  page?: number; perPage?: number; category?: string; country?: string
  language?: string; year?: number; q?: string
  sort?: 'newest' | 'rating' | 'title' | 'year'; sortDir?: 'asc' | 'desc'
}): Promise<{ items: MovieListItem[]; total: number; page: number; perPage: number }> {
  const d = db()
  const page = params.page ?? 1
  const perPage = params.perPage ?? 20
  const off = (page - 1) * perPage

  const conds: any[] = [eq(movies.isActive, true)]
  if (params.category) conds.push(eq(movies.category, params.category as any))
  if (params.country) conds.push(eq(movies.country, params.country))
  if (params.language) conds.push(eq(movies.language, params.language))
  if (params.year) conds.push(eq(movies.year, params.year))
  if (params.q?.trim()) {
    const t = `%${params.q.trim().toLowerCase()}%`
    conds.push(or(
      like(sql`lower(${movies.title})`, t),
      like(sql`lower(${movies.synopsis})`, t),
      like(sql`lower(${movies.alternativeTitles})`, t),
      like(sql`lower(${movies.actors})`, t),
    )!)
  }

  const sortCol = params.sort === 'rating' ? movies.avgRating
    : params.sort === 'title' ? movies.title
    : params.sort === 'year' ? movies.year : movies.createdAt
  const orderBy = params.sortDir === 'asc' ? asc(sortCol) : desc(sortCol)

  const countRows = await d.select({ value: count() }).from(movies).where(and(...conds)).all()
  const total = Number(countRows[0]?.value ?? 0)

  const rows = await d.select({
    id: movies.id, title: movies.title, year: movies.year,
    country: movies.country, language: movies.language, category: movies.category,
    actors: movies.actors, synopsis: movies.synopsis, isActive: movies.isActive,
    posterUrl: movies.posterUrl, curationType: movies.curationType,
    avgRating: movies.avgRating, ratingCount: movies.ratingCount,
    youtubeVideoId: movieSources.youtubeVideoId,
  }).from(movies)
    .leftJoin(movieSources, and(eq(movieSources.movieId, movies.id), eq(movieSources.isPrimary, true)))
    .where(and(...conds)).orderBy(orderBy).limit(perPage).offset(off).all()

  return {
    items: rows.map((row) => ({
      ...row,
      actors: parseJson(row.actors),
      isActive: !!row.isActive,
    })) as MovieListItem[],
    total,
    page,
    perPage,
  }
}

export async function getMovieById(id: string): Promise<MovieDetail | null> {
  const d = db()
  const rows = await d.select().from(movies).where(eq(movies.id, id)).all()
  if (!rows[0]) return null
  const r = rows[0]
  const sources = await d.select().from(movieSources)
    .where(eq(movieSources.movieId, id)).orderBy(asc(movieSources.partNumber)).all()
  return {
    id: r.id, title: r.title, alternativeTitles: parseJson(r.alternativeTitles),
    actors: parseJson(r.actors), year: r.year, country: r.country,
    language: r.language, category: r.category, synopsis: r.synopsis,
    posterUrl: r.posterUrl, curationType: r.curationType, avgRating: r.avgRating,
    ratingCount: r.ratingCount, createdAt: r.createdAt, updatedAt: r.updatedAt,
    sources: sources.map((s) => ({
      id: s.id, youtubeVideoId: s.youtubeVideoId, youtubeChannelName: s.youtubeChannelName,
      partNumber: s.partNumber, isPrimary: !!(s.isPrimary as unknown as number | boolean),
      quality: s.quality, previewStartSeconds: s.previewStartSeconds,
    })),
  }
}

/**
 * Batch-load every active movie together with its sources in exactly TWO
 * queries (movies + sources) instead of the previous N+1 pattern (1 list +
 * per-movie detail fetch). `getPublishedEntries()` renders the full catalog
 * on every film page for the related section, so a 100+ row N+1 over the
 * D1 HTTP bridge was blowing the Worker CPU time budget → 503 responses.
 *
 * The sources query filters with a correlated `IN (SELECT id FROM movies
 * WHERE is_active = 1)` subquery instead of `IN (?, ?, …)` over every movie id:
 * Cloudflare D1 rejects statements with more than 100 bound variables
 * ("too many SQL variables … SQLITE_ERROR"), and the live catalog already
 * exceeds that. A subquery keeps the exact same semantics with one bind
 * parameter, so it scales to any catalog size without hitting the limit.
 */
export async function listMovieDetails(): Promise<MovieDetail[]> {
  const d = db()
  const rows = await d
    .select()
    .from(movies)
    .where(eq(movies.isActive, true))
    .orderBy(desc(movies.createdAt))
    .all()

  if (rows.length === 0) return []

  const sourceRows = await d
    .select()
    .from(movieSources)
    .where(
      inArray(
        movieSources.movieId,
        d.select({ id: movies.id }).from(movies).where(eq(movies.isActive, true)),
      ),
    )
    .orderBy(asc(movieSources.partNumber))
    .all()

  const sourcesByMovie = new Map<string, (typeof sourceRows)[number][]>()
  for (const s of sourceRows) {
    const list = sourcesByMovie.get(s.movieId) ?? []
    list.push(s)
    sourcesByMovie.set(s.movieId, list)
  }

  return rows.map((r) => {
    const sources = (sourcesByMovie.get(r.id) ?? []).map((s) => ({
      id: s.id, youtubeVideoId: s.youtubeVideoId, youtubeChannelName: s.youtubeChannelName,
      partNumber: s.partNumber, isPrimary: !!(s.isPrimary as unknown as number | boolean),
      quality: s.quality, previewStartSeconds: s.previewStartSeconds,
    }))
    return {
      id: r.id, title: r.title, alternativeTitles: parseJson(r.alternativeTitles),
      actors: parseJson(r.actors), year: r.year, country: r.country,
      language: r.language, category: r.category, synopsis: r.synopsis,
      posterUrl: r.posterUrl, curationType: r.curationType, avgRating: r.avgRating,
      ratingCount: r.ratingCount, createdAt: r.createdAt, updatedAt: r.updatedAt,
      sources,
    }
  })
}

export async function getMovieByYoutubeVideoId(youtubeVideoId: string): Promise<MovieDetail | null> {
  const d = db()
  const rows = await d
    .select()
    .from(movies)
    .innerJoin(movieSources, eq(movieSources.movieId, movies.id))
    .where(eq(movieSources.youtubeVideoId, youtubeVideoId))
    .all()
  const first = rows[0] as any
  const movie = first?.movies
  if (!movie) return null
  const sources = await d.select().from(movieSources).where(eq(movieSources.movieId, movie.id)).orderBy(asc(movieSources.partNumber)).all()
  return {
    id: movie.id, title: movie.title, alternativeTitles: parseJson(movie.alternativeTitles),
    actors: parseJson(movie.actors), year: movie.year, country: movie.country,
    language: movie.language, category: movie.category, synopsis: movie.synopsis,
    posterUrl: movie.posterUrl, curationType: movie.curationType, avgRating: movie.avgRating,
    ratingCount: movie.ratingCount, createdAt: movie.createdAt, updatedAt: movie.updatedAt,
    sources: sources.map((s) => ({
      id: s.id, youtubeVideoId: s.youtubeVideoId, youtubeChannelName: s.youtubeChannelName,
      partNumber: s.partNumber, isPrimary: !!(s.isPrimary as unknown as number | boolean),
      quality: s.quality, previewStartSeconds: s.previewStartSeconds,
    })),
  }
}

export async function createMovie(data: MovieInput): Promise<MovieDetail> {
  const d = db()
  const now = nowEpoch()
  const movieId = data.id || uuid_v7()
  await d.insert(movies).values({
    id: movieId,
    title: data.title!,
    alternativeTitles: toJson(data.alternativeTitles),
    actors: toJson(data.actors),
    year: data.year ?? null,
    country: data.country ?? null,
    language: data.language ?? null,
    category: (data.category ?? null) as NewMovie['category'],
    synopsis: data.synopsis ?? null,
    posterUrl: data.posterUrl ?? null,
    isActive: data.isActive ?? true,
    curationType: (data.curationType ?? null) as NewMovie['curationType'],
    avgRating: data.avgRating ?? 0,
    ratingCount: data.ratingCount ?? 0,
    createdBy: data.createdBy ?? null,
    createdAt: now,
    updatedAt: now,
  })
  if (data.youtubeVideoId) {
    await d.insert(movieSources).values({
      id: uuid_v7(), movieId,
      youtubeVideoId: data.youtubeVideoId,
      youtubeChannelName: data.youtubeChannelName ?? null,
      partNumber: 1,
      isPrimary: true,
      quality: data.quality ?? null,
      previewStartSeconds: data.previewStartSeconds ?? 0,
      createdAt: now,
    })
  }
  const result = await getMovieById(movieId)
  if (!result) throw new Error('Failed to create movie')
  return result
}

export async function updateMovie(id: string, data: MovieInput): Promise<MovieDetail | null> {
  const d = db()
  const now = nowEpoch()
  const updates: Record<string, unknown> = { updatedAt: now }
  if (data.title !== undefined) updates.title = data.title
  if (data.alternativeTitles !== undefined) updates.alternativeTitles = toJson(data.alternativeTitles)
  if (data.actors !== undefined) updates.actors = toJson(data.actors)
  if (data.year !== undefined) updates.year = data.year
  if (data.country !== undefined) updates.country = data.country
  if (data.language !== undefined) updates.language = data.language
  if (data.category !== undefined) updates.category = data.category
  if (data.synopsis !== undefined) updates.synopsis = data.synopsis
  if (data.posterUrl !== undefined) updates.posterUrl = data.posterUrl
  if (data.isActive !== undefined) updates.isActive = data.isActive
  if (data.curationType !== undefined) updates.curationType = data.curationType
  if (data.avgRating !== undefined) updates.avgRating = data.avgRating
  if (data.ratingCount !== undefined) updates.ratingCount = data.ratingCount
  await d.update(movies).set(updates).where(eq(movies.id, id))
  if (data.youtubeVideoId !== undefined || data.youtubeChannelName !== undefined || data.previewStartSeconds !== undefined) {
    const sourceUpdates: Record<string, unknown> = {}
    if (data.youtubeVideoId !== undefined) sourceUpdates.youtubeVideoId = data.youtubeVideoId
    if (data.youtubeChannelName !== undefined) sourceUpdates.youtubeChannelName = data.youtubeChannelName
    if (data.previewStartSeconds !== undefined) sourceUpdates.previewStartSeconds = data.previewStartSeconds
    await d.update(movieSources).set(sourceUpdates).where(
      and(eq(movieSources.movieId, id), eq(movieSources.isPrimary, true)),
    )
  }
  return getMovieById(id)
}

export async function softDeleteMovie(id: string): Promise<boolean> {
  const d = db()
  await d.update(movies).set({ isActive: false }).where(eq(movies.id, id))
  return true
}