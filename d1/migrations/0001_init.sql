-- =============================================================================
-- SabiFlix — D1 schema migration 0001 (initial production schema)
-- Run:  wrangler d1 migrations apply sabiflix   (or paste into the D1 console)
-- Engine: SQLite (Cloudflare D1).
--
-- This mirrors lib/db/schema.ts (the authoritative Drizzle definition) so the
-- deployed schema always matches the code that reads/writes it.
--
-- Conventions:
--   * Primary keys are application-generated UUID v7 strings (time-sortable).
--   * All timestamps are UTC stored as INTEGER unixepoch seconds.
--   * Booleans are INTEGER 0/1.
--   * Soft deletes: movies.is_active, users.status, reviews.status.
-- =============================================================================

PRAGMA foreign_keys = ON;

-- ------------------------------------------------------------------
-- Users & Sessions (Clerk-synced)
-- ------------------------------------------------------------------

CREATE TABLE users (
  id            TEXT PRIMARY KEY,                 -- UUID v7
  clerk_id      TEXT UNIQUE,                      -- Clerk user id (user_xxx)
  email         TEXT NOT NULL UNIQUE,
  display_name  TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'user'
                CHECK (role IN ('admin', 'creator', 'user')),
  status        TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'suspended')),
  avatar_url    TEXT,
  created_at    INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at    INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX idx_users_clerk_id ON users(clerk_id);
CREATE INDEX idx_users_role     ON users(role);

CREATE TABLE sessions (
  id               TEXT PRIMARY KEY,              -- UUID v7
  user_id          TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  clerk_session_id TEXT UNIQUE,
  ip_address       TEXT,
  user_agent       TEXT,
  revoked          INTEGER NOT NULL DEFAULT 0,    -- boolean
  expires_at       INTEGER,
  created_at       INTEGER NOT NULL DEFAULT (unixepoch()),
  last_seen_at     INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX idx_sessions_user_id   ON sessions(user_id);
CREATE INDEX idx_sessions_last_seen ON sessions(last_seen_at);

-- ------------------------------------------------------------------
-- Movies & Sources (the canonical published catalog)
-- ------------------------------------------------------------------

CREATE TABLE movies (
  id                 TEXT PRIMARY KEY,            -- UUID v7 (or mov-pub-… slug)
  title              TEXT NOT NULL,
  alternative_titles TEXT NOT NULL DEFAULT '[]',  -- JSON string[]
  actors             TEXT NOT NULL DEFAULT '[]',  -- JSON string[]
  year               INTEGER,
  country            TEXT,
  language           TEXT,
  category           TEXT CHECK (category IN ('feature', 'short', 'documentary')),
  synopsis           TEXT,
  poster_url         TEXT,
  is_active          INTEGER NOT NULL DEFAULT 1,  -- soft delete
  curation_type      TEXT CHECK (curation_type IN ('admin', 'requested', 'filmmaker')),
  avg_rating         REAL NOT NULL DEFAULT 0,     -- denormalized from reviews
  rating_count       INTEGER NOT NULL DEFAULT 0,
  created_by         TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at         INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at         INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX idx_movies_is_active  ON movies(is_active);
CREATE INDEX idx_movies_category   ON movies(category);
CREATE INDEX idx_movies_country    ON movies(country);
CREATE INDEX idx_movies_language   ON movies(language);
CREATE INDEX idx_movies_year       ON movies(year);
CREATE INDEX idx_movies_created_at ON movies(created_at DESC);
CREATE INDEX idx_movies_rating     ON movies(avg_rating DESC);

CREATE TABLE movie_sources (
  id                     TEXT PRIMARY KEY,        -- UUID v7
  movie_id               TEXT NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  youtube_video_id       TEXT NOT NULL,
  youtube_channel_name   TEXT,
  part_number            INTEGER NOT NULL DEFAULT 1,
  is_primary             INTEGER NOT NULL DEFAULT 1, -- boolean
  quality                TEXT,
  preview_start_seconds  INTEGER,
  created_at             INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX idx_movie_sources_movie_id ON movie_sources(movie_id);

-- ------------------------------------------------------------------
-- Engagement: watch history, watchlist, reviews
-- ------------------------------------------------------------------

CREATE TABLE watch_history (
  id                TEXT PRIMARY KEY,             -- UUID v7
  user_id           TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  movie_id          TEXT NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  progress_seconds  INTEGER NOT NULL DEFAULT 0,
  duration_seconds  INTEGER NOT NULL DEFAULT 0,
  completed_at      INTEGER,
  updated_at        INTEGER NOT NULL DEFAULT (unixepoch()),
  created_at        INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE UNIQUE INDEX idx_watch_history_user_movie ON watch_history(user_id, movie_id);
CREATE INDEX idx_watch_history_user_updated ON watch_history(user_id, updated_at DESC);

CREATE TABLE watchlist (
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  movie_id   TEXT NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (user_id, movie_id)
);
CREATE INDEX idx_watchlist_user ON watchlist(user_id);

CREATE TABLE reviews (
  id         TEXT PRIMARY KEY,                    -- UUID v7
  movie_id   TEXT NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating     INTEGER NOT NULL,
  body       TEXT,
  status     TEXT NOT NULL DEFAULT 'visible'
             CHECK (status IN ('visible', 'hidden', 'flagged')),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE UNIQUE INDEX idx_reviews_movie_user ON reviews(movie_id, user_id);
CREATE INDEX idx_reviews_movie_id ON reviews(movie_id, status);
CREATE INDEX idx_reviews_user_id  ON reviews(user_id);

-- ------------------------------------------------------------------
-- Community: submissions, requests
-- ------------------------------------------------------------------

CREATE TABLE film_submissions (
  id                  TEXT PRIMARY KEY,           -- UUID v7
  user_id             TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title               TEXT NOT NULL,
  youtube_url         TEXT NOT NULL,
  youtube_video_id    TEXT,
  description         TEXT,
  status              TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes         TEXT,
  reviewed_by         TEXT REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at         INTEGER,
  published_movie_id  TEXT REFERENCES movies(id) ON DELETE SET NULL,
  created_at          INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at          INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX idx_submissions_status ON film_submissions(status);
CREATE INDEX idx_submissions_user   ON film_submissions(user_id);

CREATE TABLE film_requests (
  id                   TEXT PRIMARY KEY,          -- UUID v7
  user_id              TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  requested_title      TEXT NOT NULL,
  description          TEXT,
  status               TEXT NOT NULL DEFAULT 'open'
                       CHECK (status IN ('open', 'found', 'closed')),
  fulfilled_by_movie_id TEXT,
  created_at           INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at           INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX idx_requests_status ON film_requests(status);

-- ------------------------------------------------------------------
-- Curation: playlists, activity, reports, notifications
-- ------------------------------------------------------------------

CREATE TABLE playlists (
  id          TEXT PRIMARY KEY,                   -- UUID v7
  name        TEXT NOT NULL,
  description TEXT,
  is_featured INTEGER NOT NULL DEFAULT 0,         -- boolean
  created_by  TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at  INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX idx_playlists_featured ON playlists(is_featured);

CREATE TABLE playlist_movies (
  playlist_id TEXT NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  movie_id    TEXT NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (playlist_id, movie_id)
);
CREATE INDEX idx_playlist_movies_movie ON playlist_movies(movie_id);

CREATE TABLE activity_logs (
  id          TEXT PRIMARY KEY,                   -- UUID v7
  actor_id    TEXT REFERENCES users(id) ON DELETE SET NULL,
  actor_role  TEXT,                               -- 'admin' | 'creator' | 'user' | 'system'
  action      TEXT NOT NULL,                      -- e.g. 'movie.publish', 'submission.approve'
  entity_type TEXT,                               -- e.g. 'movie' | 'submission' | 'user'
  entity_id   TEXT,
  details     TEXT,                               -- JSON blob
  created_at  INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX idx_activity_created ON activity_logs(created_at DESC);
CREATE INDEX idx_activity_actor   ON activity_logs(actor_id);
CREATE INDEX idx_activity_action  ON activity_logs(action);

CREATE TABLE content_reports (
  id          TEXT PRIMARY KEY,                   -- UUID v7
  reporter_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL,
  entity_id   TEXT NOT NULL,
  reason      TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'open'
              CHECK (status IN ('open', 'resolved', 'dismissed')),
  resolution  TEXT,
  resolved_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  resolved_at INTEGER,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX idx_reports_status ON content_reports(status);

CREATE TABLE notifications (
  id         TEXT PRIMARY KEY,                    -- UUID v7
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,                       -- 'system' | 'submission' | 'request' | 'moderation'
  title      TEXT NOT NULL,
  body       TEXT,
  link       TEXT,
  read_at    INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX idx_notifications_user   ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(user_id);