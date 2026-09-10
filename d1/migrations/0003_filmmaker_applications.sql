-- Film submission applications (filmmaker access gate)
-- One active application per user; approval promotes to `creator` role.

CREATE TABLE IF NOT EXISTS film_submission_applications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at INTEGER,
  rejection_reason TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_film_app_user ON film_submission_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_film_app_status ON film_submission_applications(status);
