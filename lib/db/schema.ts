/**
 * SabiFlix — Drizzle ORM schema for Cloudflare D1 (SQLite dialect).
 * Mirrors d1/migrations/0001_init.sql
 */

import { sql } from 'drizzle-orm'
import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  clerkId: text('clerk_id').unique(),
  email: text('email').notNull().unique(),
  displayName: text('display_name').notNull(),
  role: text('role', { enum: ['admin', 'creator', 'user'] }).notNull().default('user'),
  status: text('status', { enum: ['active', 'suspended'] }).notNull().default('active'),
  avatarUrl: text('avatar_url'),
  createdAt: integer('created_at').notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at').notNull().default(sql`(unixepoch())`),
}, (t) => [index('idx_users_clerk_id').on(t.clerkId), index('idx_users_role').on(t.role)])

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  clerkSessionId: text('clerk_session_id').unique(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  revoked: integer('revoked', { mode: 'boolean' }).notNull().default(false),
  expiresAt: integer('expires_at'),
  createdAt: integer('created_at').notNull().default(sql`(unixepoch())`),
  lastSeenAt: integer('last_seen_at').notNull().default(sql`(unixepoch())`),
}, (t) => [index('idx_sessions_user_id').on(t.userId), index('idx_sessions_last_seen').on(t.lastSeenAt)])

export const movies = sqliteTable('movies', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  alternativeTitles: text('alternative_titles').notNull().default('[]'),
  actors: text('actors').notNull().default('[]'),
  year: integer('year'),
  country: text('country'),
  language: text('language'),
  category: text('category', { enum: ['feature', 'short', 'documentary'] }),
  synopsis: text('synopsis'),
  posterUrl: text('poster_url'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  curationType: text('curation_type', { enum: ['admin', 'requested', 'filmmaker'] }),
  avgRating: real('avg_rating').notNull().default(0),
  ratingCount: integer('rating_count').notNull().default(0),
  createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: integer('created_at').notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at').notNull().default(sql`(unixepoch())`),
}, (t) => [
  index('idx_movies_is_active').on(t.isActive),
  index('idx_movies_category').on(t.category),
  index('idx_movies_country').on(t.country),
  index('idx_movies_language').on(t.language),
  index('idx_movies_year').on(t.year),
  index('idx_movies_created_at').on(t.createdAt),
  index('idx_movies_rating').on(t.avgRating),
])

export const movieSources = sqliteTable('movie_sources', {
  id: text('id').primaryKey(),
  movieId: text('movie_id').notNull().references(() => movies.id, { onDelete: 'cascade' }),
  youtubeVideoId: text('youtube_video_id').notNull(),
  youtubeChannelName: text('youtube_channel_name'),
  partNumber: integer('part_number').notNull().default(1),
  isPrimary: integer('is_primary', { mode: 'boolean' }).notNull().default(true),
  quality: text('quality'),
  previewStartSeconds: integer('preview_start_seconds'),
  createdAt: integer('created_at').notNull().default(sql`(unixepoch())`),
}, (t) => [index('idx_movie_sources_movie_id').on(t.movieId)])

export const watchHistory = sqliteTable('watch_history', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  movieId: text('movie_id').notNull().references(() => movies.id, { onDelete: 'cascade' }),
  progressSeconds: integer('progress_seconds').notNull().default(0),
  durationSeconds: integer('duration_seconds').notNull().default(0),
  completedAt: integer('completed_at'),
  updatedAt: integer('updated_at').notNull().default(sql`(unixepoch())`),
  createdAt: integer('created_at').notNull().default(sql`(unixepoch())`),
}, (t) => [
  uniqueIndex('idx_watch_history_user_movie').on(t.userId, t.movieId),
  index('idx_watch_history_user_updated').on(t.userId, t.updatedAt),
])

export const reviews = sqliteTable('reviews', {
  id: text('id').primaryKey(),
  movieId: text('movie_id').notNull().references(() => movies.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  rating: integer('rating').notNull(),
  body: text('body'),
  status: text('status', { enum: ['visible', 'hidden', 'flagged'] }).notNull().default('visible'),
  createdAt: integer('created_at').notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at').notNull().default(sql`(unixepoch())`),
}, (t) => [
  uniqueIndex('idx_reviews_movie_user').on(t.movieId, t.userId),
  index('idx_reviews_movie_id').on(t.movieId, t.status),
  index('idx_reviews_user_id').on(t.userId),
])

export const watchlist = sqliteTable('watchlist', {
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  movieId: text('movie_id').notNull().references(() => movies.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at').notNull().default(sql`(unixepoch())`),
}, (t) => [primaryKey({ columns: [t.userId, t.movieId] }), index('idx_watchlist_user').on(t.userId)])

export const filmSubmissions = sqliteTable('film_submissions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  youtubeUrl: text('youtube_url').notNull(),
  youtubeVideoId: text('youtube_video_id'),
  description: text('description'),
  status: text('status', { enum: ['pending', 'approved', 'rejected'] }).notNull().default('pending'),
  adminNotes: text('admin_notes'),
  reviewedBy: text('reviewed_by').references(() => users.id, { onDelete: 'set null' }),
  reviewedAt: integer('reviewed_at'),
  publishedMovieId: text('published_movie_id'),
  createdAt: integer('created_at').notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at').notNull().default(sql`(unixepoch())`),
}, (t) => [index('idx_submissions_status').on(t.status), index('idx_submissions_user').on(t.userId)])

export const filmRequests = sqliteTable('film_requests', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  requestedTitle: text('requested_title').notNull(),
  description: text('description'),
  status: text('status', { enum: ['open', 'found', 'closed'] }).notNull().default('open'),
  fulfilledByMovieId: text('fulfilled_by_movie_id'),
  createdAt: integer('created_at').notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at').notNull().default(sql`(unixepoch())`),
}, (t) => [index('idx_requests_status').on(t.status)])

export const playlists = sqliteTable('playlists', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  isFeatured: integer('is_featured', { mode: 'boolean' }).notNull().default(false),
  createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: integer('created_at').notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at').notNull().default(sql`(unixepoch())`),
}, (t) => [index('idx_playlists_featured').on(t.isFeatured)])

export const playlistMovies = sqliteTable('playlist_movies', {
  playlistId: text('playlist_id').notNull().references(() => playlists.id, { onDelete: 'cascade' }),
  movieId: text('movie_id').notNull().references(() => movies.id, { onDelete: 'cascade' }),
  sortOrder: integer('sort_order').notNull().default(0),
}, (t) => [primaryKey({ columns: [t.playlistId, t.movieId] }), index('idx_playlist_movies_movie').on(t.movieId)])

export const activityLogs = sqliteTable('activity_logs', {
  id: text('id').primaryKey(),
  actorId: text('actor_id').references(() => users.id, { onDelete: 'set null' }),
  actorRole: text('actor_role'),
  action: text('action').notNull(),
  entityType: text('entity_type'),
  entityId: text('entity_id'),
  details: text('details'),
  createdAt: integer('created_at').notNull().default(sql`(unixepoch())`),
}, (t) => [
  index('idx_activity_created').on(t.createdAt),
  index('idx_activity_actor').on(t.actorId),
  index('idx_activity_action').on(t.action),
])

export const contentReports = sqliteTable('content_reports', {
  id: text('id').primaryKey(),
  reporterId: text('reporter_id').references(() => users.id, { onDelete: 'set null' }),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  reason: text('reason').notNull(),
  status: text('status', { enum: ['open', 'resolved', 'dismissed'] }).notNull().default('open'),
  resolution: text('resolution'),
  resolvedBy: text('resolved_by').references(() => users.id, { onDelete: 'set null' }),
  resolvedAt: integer('resolved_at'),
  createdAt: integer('created_at').notNull().default(sql`(unixepoch())`),
}, (t) => [index('idx_reports_status').on(t.status)])

export const notifications = sqliteTable('notifications', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  title: text('title').notNull(),
  body: text('body'),
  link: text('link'),
  readAt: integer('read_at'),
  createdAt: integer('created_at').notNull().default(sql`(unixepoch())`),
}, (t) => [index('idx_notifications_user').on(t.userId, t.createdAt), index('idx_notifications_unread').on(t.userId)])

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Movie = typeof movies.$inferSelect
export type NewMovie = typeof movies.$inferInsert
export type MovieSource = typeof movieSources.$inferSelect
export type NewMovieSource = typeof movieSources.$inferInsert
export type WatchHistoryEntry = typeof watchHistory.$inferSelect
export type Review = typeof reviews.$inferSelect
export type FilmSubmission = typeof filmSubmissions.$inferSelect
export type FilmRequest = typeof filmRequests.$inferSelect
export type Playlist = typeof playlists.$inferSelect
export type ActivityLog = typeof activityLogs.$inferSelect
export type ContentReport = typeof contentReports.$inferSelect
export type Notification = typeof notifications.$inferSelect
export type Session = typeof sessions.$inferSelect
