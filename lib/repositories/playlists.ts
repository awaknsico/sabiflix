/**
 * Playlist repository - D1 access for playlists + playlist_movies.
 *
 * This is the database source for the homepage hero reel and featured
 * carousels (previously driven by `lib/mock-data.ts`). It avoids the N+1 and
 * >100-bound-variable pitfalls documented in `listMovieDetails()` by loading
 * playlists and their ordered movie ids in two queries, then grouping in JS.
 */

import { getDB } from '@/lib/db/client'
import { playlists, playlistMovies, movies } from '@/lib/db/schema'
import { eq, asc, and } from 'drizzle-orm'

function db() { return getDB() }

export interface PlaylistRow {
  id: string
  name: string
  description: string | null
  isFeatured: boolean
  /** Ordered active movie ids (by playlist_movies.sort_order). */
  movieIds: string[]
}

/**
 * List playlists with their ordered active movie ids.
 * `featuredOnly` limits to curated rows (is_featured = 1) for the homepage.
 */
export async function listPlaylists({ featuredOnly = false }: { featuredOnly?: boolean } = {}): Promise<PlaylistRow[]> {
  const d = db()

  const playlistRows = await d
    .select()
    .from(playlists)
    .where(featuredOnly ? eq(playlists.isFeatured, true) : undefined)
    .orderBy(asc(playlists.createdAt))
    .all()

  if (playlistRows.length === 0) return []

  // Pull the ordered movie membership for every playlist in one query and
  // group client-side (no per-playlist round trips, no IN over many ids).
  const membership = await d
    .select({
      playlistId: playlistMovies.playlistId,
      movieId: playlistMovies.movieId,
    })
    .from(playlistMovies)
    .innerJoin(movies, eq(movies.id, playlistMovies.movieId))
    .innerJoin(playlists, eq(playlists.id, playlistMovies.playlistId))
    .where(
      featuredOnly
        ? and(eq(playlists.isFeatured, true), eq(movies.isActive, true))
        : eq(movies.isActive, true),
    )
    .orderBy(asc(playlistMovies.sortOrder))
    .all()

  const idsByPlaylist = new Map<string, string[]>()
  for (const row of membership) {
    const list = idsByPlaylist.get(row.playlistId) ?? []
    list.push(row.movieId)
    idsByPlaylist.set(row.playlistId, list)
  }

  return playlistRows.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    isFeatured: !!(p.isFeatured as unknown as number | boolean),
    movieIds: idsByPlaylist.get(p.id) ?? [],
  }))
}

/** Convenience scoping used by the server-catalog adapter. */
export async function listFeaturedPlaylists(): Promise<PlaylistRow[]> {
  return listPlaylists({ featuredOnly: true })
}

/** Replace a playlist's ordered active memberships. */
export async function replacePlaylistMovies(playlistId: string, movieIds: string[]): Promise<void> {
  const d = db()
  await d.delete(playlistMovies).where(eq(playlistMovies.playlistId, playlistId))
  if (movieIds.length === 0) return

  await d.insert(playlistMovies).values(
    movieIds.map((movieId, sortOrder) => ({ playlistId, movieId, sortOrder })),
  )
}