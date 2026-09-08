-- =============================================================================
-- SabiFlix — D1 migration 0002: align remote schema with the code (Drizzle).
--
-- NOTE: this migration repairs one-time schema drift on the production DB and
-- is NOT idempotent against a database freshly created by 0001 (e.g. a new
-- environment) — 0001 already creates these columns, so the ALTERs here would
-- fail. Fresh databases should apply 0001 only and record this migration as
-- applied in d1_migrations, or baseline directly (see
-- d1/baseline-migrations-table.sql).
--
-- The production D1 database drifted from lib/db/schema.ts (its `watchlist`
-- table was never created, and watch_history / film_requests / film_submissions
-- were provisioned with older column names). This migration is additive and
-- data-preserving:
--   * CREATEs the `watchlist` table the code expects (copies legacy `favorites`)
--   * ADDs watch_history.created_at          (legacy source column: `watched_at`)
--   * ADDs film_requests.description /
--         film_requests.fulfilled_by_movie_id /
--         film_requests.created_at / updated_at
--         (legacy source columns: `fulfilled_movie_id`, `requested_at`, `resolved_at`)
--   * ADDs film_submissions.created_at / updated_at
--         (legacy source column: `submitted_at`)
--
-- Old columns are left in place (unused by the code) to avoid data loss.
-- =============================================================================

-- ------------------------------------------------------------------
-- 1) watchlist (composite PK, mirrors lib/db/schema.ts)
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS watchlist (
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  movie_id   TEXT NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (user_id, movie_id)
);
CREATE INDEX IF NOT EXISTS idx_watchlist_user ON watchlist(user_id);

-- Carry over any legacy favorites rows (idempotent; favorites is empty today).
INSERT OR IGNORE INTO watchlist (user_id, movie_id, created_at)
SELECT user_id, movie_id, COALESCE(added_at, unixepoch()) FROM favorites;

-- ------------------------------------------------------------------
-- 2) watch_history: add created_at (populate from legacy `watched_at`)
-- ------------------------------------------------------------------
ALTER TABLE watch_history ADD COLUMN created_at INTEGER NOT NULL DEFAULT (unixepoch());
UPDATE watch_history SET created_at = watched_at WHERE watched_at IS NOT NULL;

-- ------------------------------------------------------------------
-- 3) film_requests: add the columns the code reads/writes
-- ------------------------------------------------------------------
ALTER TABLE film_requests ADD COLUMN description TEXT;
ALTER TABLE film_requests ADD COLUMN fulfilled_by_movie_id TEXT;
ALTER TABLE film_requests ADD COLUMN created_at INTEGER NOT NULL DEFAULT (unixepoch());
ALTER TABLE film_requests ADD COLUMN updated_at INTEGER NOT NULL DEFAULT (unixepoch());

UPDATE film_requests
SET fulfilled_by_movie_id = fulfilled_movie_id
WHERE fulfilled_movie_id IS NOT NULL;

UPDATE film_requests
SET created_at = requested_at,
    updated_at = COALESCE(resolved_at, requested_at, unixepoch())
WHERE requested_at IS NOT NULL;

-- ------------------------------------------------------------------
-- 4) film_submissions: add the columns the code reads/writes
-- ------------------------------------------------------------------
ALTER TABLE film_submissions ADD COLUMN created_at INTEGER NOT NULL DEFAULT (unixepoch());
ALTER TABLE film_submissions ADD COLUMN updated_at INTEGER NOT NULL DEFAULT (unixepoch());

UPDATE film_submissions
SET created_at = submitted_at, updated_at = submitted_at
WHERE submitted_at IS NOT NULL;