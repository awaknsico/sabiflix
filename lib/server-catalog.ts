import {
  getMovieById as repoGetMovieById,
  listMovieDetails,
  createMovie,
  updateMovie,
  softDeleteMovie,
  type MovieDetail,
  type MovieInput,
} from '@/lib/repositories/movies'
import { listFeaturedPlaylists, listPlaylists } from '@/lib/repositories/playlists'
import type { Movie, MovieCategory, MovieSource, PlaylistWithMovies } from '@/lib/types'

export type { PlaylistWithMovies }

/**
 * Server-side published-catalog adapter.
 *
 * The canonical catalog store is Cloudflare D1 (`movies` / `movie_sources`),
 * accessed through `@/lib/repositories/movies`. This module is a thin adapter
 * that maps D1 rows into the `Movie` / `MovieSource` shapes the UI already
 * understands, so the call sites (`/api/catalog`, `/catalog`, `/movie/[id]`,
 * and now the homepage) stay identical while the backing store is the real
 * database.
 *
 * The seed movies shipped with the repo are imported into D1 through the local
 * seed script or `wrangler d1 execute`, so every read here is
 * database-driven — there is no bundled mock-catalog fallback anymore.
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
    // Batch-loaded in two queries — avoids the N+1 pattern that previously
    // did one detail fetch per movie and blew the Worker CPU budget.
    const details = await listMovieDetails()
    return details.map((d) => toEntry(d))
  } catch (err) {
    // No database provisioned yet — healthy empty set; seed still renders.
    console.error('[getPublishedEntries] failed:', err)
    return []
  }
}

export async function findPublishedEntry(id: string): Promise<PublishedEntry | undefined> {
  const detail = await repoGetMovieById(id)
  return detail ? toEntry(detail) : undefined
}

/**
 * Look up a film in the D1 published store and return its `Movie` + primary
 * source (when present). D1-only — no mock fallback.
 */
export async function lookupMovieWithSource(
  id: string,
): Promise<{ movie: Movie; source?: MovieSource } | undefined> {
  try {
    const detail = await repoGetMovieById(id)
    if (!detail) return undefined
    return { movie: toMockMovie(detail), source: toOptionalSource(detail) }
  } catch {
    return undefined
  }
}

/** Common resolver — maps playlist rows to PlaylistWithMovies using published movies. */
async function hydratePlaylists(
  rows: Awaited<ReturnType<typeof listPlaylists>>,
  entries: PublishedEntry[],
): Promise<PlaylistWithMovies[]> {
  const byId = new Map(entries.map((e) => [e.movie.id, e.movie] as const))
  return rows.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    isFeatured: p.isFeatured,
    movies: p.movieIds
      .map((id) => byId.get(id))
      .filter((m): m is Movie => Boolean(m)),
  }))
}

/** Featured (curator) playlists with their movies — drives the homepage hero + rows. */
export async function getFeaturedPlaylists(
  entries?: PublishedEntry[],
): Promise<PlaylistWithMovies[]> {
  try {
    const rows = await listFeaturedPlaylists()
    if (rows.length === 0) return []
    return await hydratePlaylists(rows, entries ?? await getPublishedEntries())
  } catch (err) {
    console.error('[getFeaturedPlaylists] failed:', err)
    return []
  }
}

/** All playlists with their movies — used by the admin playlists console. */
export async function getAllPlaylists(
  entries?: PublishedEntry[],
): Promise<PlaylistWithMovies[]> {
  try {
    return await hydratePlaylists(await listPlaylists(), entries ?? await getPublishedEntries())
  } catch (err) {
    console.error('[getAllPlaylists] failed:', err)
    return []
  }
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