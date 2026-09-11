-- =============================================================================
-- SabiFlix — D1 migration 0004: request review audit trail
--
-- Adds first-class "who handled this request, when, and why" columns to
-- film_requests (film_submissions already has reviewed_by / reviewed_at), then
-- backfills them for every already-handled request from activity_logs — the
-- admin PATCH used to only record request.found / request.closed there.
--
-- These columns power the /admin/logs "Request & review logs" page:
--   * reviewed_by      -> which admin attended to the request
--   * reviewed_at      -> when it was attended (turnaround = reviewed_at - created_at)
--   * resolution_note  -> optional admin reason (e.g. why the film was not found)
-- =============================================================================

ALTER TABLE film_requests ADD COLUMN reviewed_by TEXT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE film_requests ADD COLUMN reviewed_at INTEGER;
ALTER TABLE film_requests ADD COLUMN resolution_note TEXT;

CREATE INDEX IF NOT EXISTS idx_requests_reviewed ON film_requests(reviewed_at);

-- Backfill handled requests (found / closed) from their latest handling
-- activity entry, so historical log rows show the right admin and date.
UPDATE film_requests
SET reviewed_by = (
      SELECT a.actor_id
      FROM activity_logs a
      WHERE a.entity_type = 'request'
        AND a.entity_id   = film_requests.id
        AND a.action IN ('request.found', 'request.closed')
      ORDER BY a.created_at DESC
      LIMIT 1
    ),
    reviewed_at = (
      SELECT a.created_at
      FROM activity_logs a
      WHERE a.entity_type = 'request'
        AND a.entity_id   = film_requests.id
        AND a.action IN ('request.found', 'request.closed')
      ORDER BY a.created_at DESC
      LIMIT 1
    )
WHERE status IN ('found', 'closed')
  AND reviewed_by IS NULL;
