import {
  getMovieById as repoGetMovieById,
  listMovies,
  createMovie,
  updateMovie,
  softDeleteMovie,
  type MovieDetail,
  type MovieInput,
} from '@/lib/repositories/movies'
import {
  getMovieById as mockGetMovieById,
  getPrimarySource as mockGetPrimarySource,
  type Movie,
  type MovieCategory,
  type MovieSource,
} from '@/lib/mock-data'

/**
 * Server-side published-catalog adapter.
 *
 * The canonical catalog store is Cloudflare D1 (`movies` / `movie_sources`),
 * accessed through `@/lib/repositories/movies`. This module is a thin adapter
 * that maps D1 rows into the `Movie` / `MovieSource` shapes the UI already
 * understands, so the call sites (`/api/catalog`, `/catalog`, `/movie/[id]`)
 * stay identical while the backing store is now the real database.
 *
 * The seed movies we ship are imported through the local seed script into D1,
 * so `getPublishedEntries()` is entirely database-driven. `lookupMovieWithSource`
 * additionally falls back to the bundled mock catalog so a specific seed id
 * still resolves before a DB is provisioned.
 */

export interface PublishedEntry {
  movie: Movie
  source: MovieSource
}

const CATEGORIES: ReadonlySet<string> = new Set(['feature', 'short', 'documentary'])

function toMockCategory(value: string | null | undefined): MovieCategory {
  return CATEGORIES.has(value as string) ? (value as MovieCategory) : 'feature'
}

function toMockMovie(d: MovieDetail): Movie {
  return {
    id: d.id,
    title: d.title,
    alternativeTitles: d.alternativeTitles,
    actors: d.actors,
    year: d.year ?? new Date().getFullYear(),
    country: d.country ?? 'Nigeria',
    language: d.language ?? 'English',
    category: toMockCategory(d.category),
    synopsis: d.synopsis ?? '',
    posterUrl: d.posterUrl ?? '/placeholder.svg',
    isActive: true,
    curationType: d.curationType as Movie['curationType'] | undefined,
    createdAt: new Date(d.createdAt * 1000).toISOString(),
    updatedAt: new Date(d.updatedAt * 1000).toISOString(),
  }
}

function toSource(d: MovieDetail): MovieSource {
  const s = d.sources.find((x) => x.isPrimary) ?? d.sources[0]
  if (!s) {
    return {
      id: `src-${d.id}`,
      movieId: d.id,
      youtubeVideoId: '',
      youtubeChannelName: 'SabiFlix Curated',
      partNumber: 1,
      isPrimary: true,
      quality: '1080p',
    }
  }
  return toSourceFromRow(d, s)
}

/** Like `toSource` but returns `undefined` when the film genuinely has no source,
 *  so the film page can show "Not yet available" instead of an empty player. */
function toOptionalSource(d: MovieDetail): MovieSource | undefined {
  if (d.sources.length === 0) return undefined
  const s = d.sources.find((x) => x.isPrimary) ?? d.sources[0]
  return toSourceFromRow(d, s)
}

function toSourceFromRow(d: MovieDetail, s: { id: string; youtubeVideoId: string; youtubeChannelName: string | null; partNumber: number; isPrimary: boolean; quality: string | null; previewStartSeconds: number | null }): MovieSource {
  return {
    id: s.id,
    movieId: d.id,
    youtubeVideoId: s.youtubeVideoId,
    youtubeChannelName: s.youtubeChannelName ?? 'SabiFlix Curated',
    partNumber: s.partNumber,
    isPrimary: s.isPrimary,
    quality: s.quality ?? '1080p',
    previewStartSeconds: s.previewStartSeconds ?? undefined,
  }
}

function toEntry(d: MovieDetail): PublishedEntry {
  return { movie: toMockMovie(d), source: toSource(d) }
}

function toMovieInput(movie: Movie, source?: MovieSource): MovieInput {
  return {
    title: movie.title,
    alternativeTitles: movie.alternativeTitles,
    actors: movie.actors,
    year: movie.year,
    country: movie.country,
    language: movie.language,
    category: movie.category as MovieInput['category'],
    synopsis: movie.synopsis,
    posterUrl: movie.posterUrl,
    curationType: movie.curationType as MovieInput['curationType'],
    isActive: true,
    createdBy: null,
    ...(source?.youtubeVideoId
      ? {
          youtubeVideoId: source.youtubeVideoId,
          youtubeChannelName: source.youtubeChannelName ?? null,
          quality: source.quality ?? null,
          previewStartSeconds: source.previewStartSeconds ?? 0,
        }
      : {}),
  }
}

/** All non-deleted movies currently in D1 (the canonical published store). */
export async function getPublishedEntries(): Promise<PublishedEntry[]> {
  try {
    const { items } = await listMovies({ perPage: 1000 })
    const entries: PublishedEntry[] = []
    for (const m of items) {
      const detail = await repoGetMovieById(m.id)
      if (detail) entries.push(toEntry(detail))
    }
    return entries
  } catch {
    // No database provisioned yet — healthy empty set; seed still renders.
    return []
  }
}

export async function findPublishedEntry(id: string): Promise<PublishedEntry | undefined> {
  const detail = await repoGetMovieById(id)
  return detail ? toEntry(detail) : undefined
}

/**
 * Look up a film across both the seed catalog and the D1 published store.
 * Seed movies resolve without touching the database; D1-published ones are
 * fetched from the canonical store.
 */
export async function lookupMovieWithSource(
  id: string,
): Promise<{ movie: Movie; source?: MovieSource } | undefined> {
  const mockMovie = mockGetMovieById(id)
  if (mockMovie) {
    return { movie: mockMovie, source: mockGetPrimarySource(id) }
  }
  try {
    const detail = await repoGetMovieById(id)
    if (detail) return { movie: toMockMovie(detail), source: toOptionalSource(detail) }
  } catch {
    return undefined
  }
  return undefined
}

export async function upsertPublishedEntry(
  movie: Movie,
  source?: MovieSource,
): Promise<PublishedEntry> {
  const input = toMovieInput(movie, source)

  let detail: MovieDetail | null
  const existing = movie.id ? await repoGetMovieById(movie.id) : null
  if (existing) {
    await updateMovie(movie.id, input)
    detail = await repoGetMovieById(movie.id)
  } else {
    detail = await createMovie({ ...input, id: movie.id || undefined })
  }

  if (!detail) throw new Error('Failed to persist published entry')
  return toEntry(detail)
}

export async function removePublishedEntry(id: string): Promise<boolean> {
  return softDeleteMovie(id)
}