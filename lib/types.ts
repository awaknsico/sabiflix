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

export interface PlaylistWithMovies {
  id: string
  name: string
  description: string | null
  isFeatured: boolean
  movies: Movie[]
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