/**
 * Shared domain types + editorial constants for SabiFlix.
 *
 * These used to live in `lib/mock-data.ts` alongside the prototype seed data.
 * Now that the app reads from Cloudflare D1, the types are the ONLY thing the
 * UI still shares across pages/components — so they get a neutral home here,
 * decoupled from any dummy-data file.
 *
 * The runtime shapes mirror the Drizzle schema in `lib/db/schema.ts` (D1/SQLite).
 */

export type MovieCategory = 'feature' | 'short' | 'documentary'
export type SubmissionStatus = 'pending' | 'approved' | 'rejected'
export type RequestStatus = 'open' | 'found' | 'closed'

export const CATEGORIES: { value: MovieCategory; label: string }[] = [
  { value: 'feature', label: 'Feature' },
  { value: 'short', label: 'Short' },
  { value: 'documentary', label: 'Documentary' },
]

export const COUNTRIES = [
  'Nigeria',
  'Ghana',
  'South Africa',
  'Kenya',
  'Tanzania',
  'Senegal',
] as const

export const LANGUAGES = ['English', 'Yoruba', 'Igbo', 'Swahili', 'Hausa', 'Zulu'] as const

export interface Movie {
  id: string
  title: string
  alternativeTitles: string[]
  /** Lead actors — up to 2 shown on the card, full list available on the film page. */
  actors: string[]
  year: number
  country: string
  language: string
  category: MovieCategory
  synopsis: string
  posterUrl: string
  isActive: boolean
  /**
   * Provenance badge shown on the card.
   * - 'admin'      → gold Curator's Mark (personally screened by a moderator)
   * - 'requested'  → cyan Community Mark (added because users asked for it)
   * - 'filmmaker'  → green Filmmaker Mark (submitted directly by the creator)
   * - undefined    → no badge (standard catalog entry)
   */
  curationType?: 'admin' | 'requested' | 'filmmaker'
  createdAt: string
  updatedAt: string
}

export interface MovieSource {
  id: string
  movieId: string
  youtubeVideoId: string
  youtubeChannelName: string
  partNumber: number
  isPrimary: boolean
  quality: string
  /** Optional seek-in point (seconds) for the cinematic preview loop. */
  previewStartSeconds?: number
}

/**
 * Lean card projection — everything a poster card / rail needs, nothing more.
 *
 * The homepage passes this (not the full `Movie`) to all 7 client sections,
 * which is what shrinks the RSC flight payload from ~285KB toward <90KB:
 * no `alternativeTitles`, `actors`, or `synopsis` arrays/paragraphs are
 * serialized per film per section.
 *
 * `createdAt` stays because `RecommendedRow` (fresh-account fallback) and
 * `NewSinceVisit` sort/filter on it.
 */
export interface MovieCardDto {
  id: string
  title: string
  posterUrl: string
  year: number
  country: string
  language: string
  category: MovieCategory
  /** Lead actors — small array shown on the card. */
  actors: string[]
  curationType?: Movie['curationType']
  createdAt: string
}

/** Project a full `Movie` down to its card DTO. */
export function toCardDto(m: Movie): MovieCardDto {
  return {
    id: m.id,
    title: m.title,
    posterUrl: m.posterUrl,
    year: m.year,
    country: m.country,
    language: m.language,
    category: m.category,
    actors: m.actors ?? [],
    curationType: m.curationType,
    createdAt: m.createdAt,
  }
}

/** Newest-first active films, capped — drives "Latest Additions" style rails. */
export function sortLatest<T extends Pick<MovieCardDto, 'createdAt'>>(movies: readonly T[], limit = 10): T[] {
  return [...movies].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, limit)
}

export interface PlaylistWithMovies {
  id: string
  name: string
  description: string | null
  isFeatured: boolean
  movies: Movie[]
}

/**
 * Lean playlist projection — same shape, card DTOs instead of full movies.
 * The homepage hydrates carousels from these so playlist rails share the
 * shrunken payload instead of duplicating full `Movie` objects per rail.
 */
export interface PlaylistWithCards {
  id: string
  name: string
  description: string | null
  isFeatured: boolean
  movies: MovieCardDto[]
}

export interface WatchHistoryEntry {
  id: string
  movieId: string
  watchedAt: string
  progressSeconds: number
  durationSeconds: number
  /** Set once the viewer has finished (completion / mark-as-finished). */
  completedAt?: string | null
  /** Last playback activity — drives resume order and "watched this week". */
  updatedAt?: string
}

export interface FilmSubmission {
  id: string
  userDisplayName: string
  title: string
  youtubeUrl: string
  youtubeVideoId: string
  description: string
  status: SubmissionStatus
  adminNotes: string | null
  submittedAt: string
  /** Auto-fetched poster candidates when the URL was resolved on submit. */
  thumbnailUrl?: string
  /** Set when the moderator has published this film into the catalog. */
  publishedMovieId?: string
}

export interface FilmRequest {
  id: string
  userDisplayName: string
  requestedTitle: string
  requestedAt: string
  status: RequestStatus
}