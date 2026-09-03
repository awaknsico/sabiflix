import { sql } from 'drizzle-orm'
import {
  boolean,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

/**
 * SabiFlix database schema.
 *
 * NOTE: This is the data model definition only. No database is provisioned yet.
 * The UI reads from typed mock data in `lib/mock-data.ts` that mirrors these tables.
 */

/* ------------------------------------------------------------------ */
/* Users & Sessions                                                    */
/* ------------------------------------------------------------------ */

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  displayName: text('display_name').notNull(),
  isAdmin: boolean('is_admin').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: text('token').notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    revoked: boolean('revoked').notNull().default(false),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
  },
  (t) => [
    index('idx_sessions_user_id').on(t.userId),
    index('idx_sessions_token').on(t.token),
    index('idx_sessions_expires_at').on(t.expiresAt),
  ],
)

/* ------------------------------------------------------------------ */
/* Movies & Sources                                                    */
/* ------------------------------------------------------------------ */

export const movies = pgTable(
  'movies',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(),
    alternativeTitles: text('alternative_titles').array(),
    actors: text('actors').array(),
    year: integer('year'),
    country: text('country'),
    language: text('language'),
    category: text('category'), // 'feature' | 'short' | 'documentary'
    synopsis: text('synopsis'),
    posterUrl: text('poster_url'),
    isActive: boolean('is_active').notNull().default(true),
    curationType: text('curation_type'), // 'admin' | 'requested' | 'filmmaker'
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_movies_category').on(t.category),
    index('idx_movies_country').on(t.country),
    // Full-text search index over title + synopsis
    index('idx_movies_search').using(
      'gin',
      sql`to_tsvector('english', ${t.title} || ' ' || coalesce(${t.synopsis}, ''))`,
    ),
  ],
)

export const movieSources = pgTable('movie_sources', {
  id: uuid('id').primaryKey().defaultRandom(),
  movieId: uuid('movie_id')
    .notNull()
    .references(() => movies.id, { onDelete: 'cascade' }),
  youtubeVideoId: text('youtube_video_id').notNull(),
  youtubeChannelName: text('youtube_channel_name'),
  partNumber: integer('part_number').notNull().default(1),
  isPrimary: boolean('is_primary').notNull().default(true),
  quality: text('quality'), // '360p' | '480p' | '720p' | '1080p'
  // Cinematic preview: where the muted ambient loop and "Play preview" snippet
  // start (seconds into the source). NULL falls back to the static poster.
  previewStartSeconds: integer('preview_start_seconds'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

/* ------------------------------------------------------------------ */
/* Watch History & Favorites                                           */
/* ------------------------------------------------------------------ */

export const watchHistory = pgTable(
  'watch_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    movieId: uuid('movie_id')
      .notNull()
      .references(() => movies.id, { onDelete: 'cascade' }),
    watchedAt: timestamp('watched_at', { withTimezone: true }).notNull().defaultNow(),
    progressSeconds: integer('progress_seconds').notNull().default(0),
    /** Runtime snapshot at watch time — sources can be re-uploaded or swapped. */
    durationSeconds: integer('duration_seconds'),
    /** Set once the viewer finishes (player ENDED or manually marked complete). */
    completedAt: timestamp('completed_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_watch_history_user_id').on(t.userId),
    index('idx_watch_history_movie_id').on(t.movieId),
    index('idx_watch_history_updated_at').on(t.updatedAt),
  ],
)

export const favorites = pgTable(
  'favorites',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    movieId: uuid('movie_id')
      .notNull()
      .references(() => movies.id, { onDelete: 'cascade' }),
    addedAt: timestamp('added_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.movieId] }),
    index('idx_favorites_user_id').on(t.userId),
  ],
)

/* ------------------------------------------------------------------ */
/* Submissions & Requests                                              */
/* ------------------------------------------------------------------ */

export const filmSubmissions = pgTable(
  'film_submissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    youtubeUrl: text('youtube_url').notNull(),
    description: text('description'),
    status: text('status').notNull().default('pending'), // 'pending' | 'approved' | 'rejected'
    adminNotes: text('admin_notes'),
    submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('idx_submissions_status').on(t.status)],
)

export const filmRequests = pgTable(
  'film_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    requestedTitle: text('requested_title').notNull(),
    requestedAt: timestamp('requested_at', { withTimezone: true }).notNull().defaultNow(),
    status: text('status').notNull().default('open'), // 'open' | 'found' | 'closed'
  },
  (t) => [index('idx_requests_status').on(t.status)],
)

/* ------------------------------------------------------------------ */
/* Playlists                                                           */
/* ------------------------------------------------------------------ */

export const playlists = pgTable('playlists', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  isFeatured: boolean('is_featured').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const playlistMovies = pgTable(
  'playlist_movies',
  {
    playlistId: uuid('playlist_id')
      .notNull()
      .references(() => playlists.id, { onDelete: 'cascade' }),
    movieId: uuid('movie_id')
      .notNull()
      .references(() => movies.id, { onDelete: 'cascade' }),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.playlistId, t.movieId] })],
)

/* ------------------------------------------------------------------ */
/* Admin Logs                                                          */
/* ------------------------------------------------------------------ */

export const adminLogs = pgTable('admin_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  adminId: uuid('admin_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  action: text('action').notNull(),
  details: text('details'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
