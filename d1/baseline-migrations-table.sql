-- =============================================================================
-- SabiFlix — D1 migrations baseline (ONE-TIME, for the existing production DB)
--
-- Establishes wrangler's `d1_migrations` bookkeeping table and records every
-- migration that has ALREADY been applied to the remote database, so that
-- `wrangler d1 migrations apply sabiflix --remote` starts from a clean slate
-- and only runs future migrations.
--
-- Applied so far (see d1/migrations/):
--   0001_init.sql                  — initial schema (tables existed remotely;
--                                    drift was reconciled by 0002)
--   0002_align_remote_schema.sql   — applied manually via `wrangler d1 execute
--                                    --file` on 2026-09-08
--
-- Apply with:
--   wrangler d1 execute sabiflix --remote --file=d1/baseline-migrations-table.sql
--
-- The DDL matches exactly what wrangler creates on first `d1 migrations apply`
-- (see wrangler src/d1/migrate: id/name/applied_at). INSERT OR IGNORE keeps
-- this file idempotent if some rows already exist.
--
-- NOTE for fresh databases: this baseline is only for the already-provisioned
-- production DB. A brand-new database should instead run `wrangler d1 migrations
-- apply` normally (0001 then 0002 in order) and must NOT run this file first —
-- but see the caveat in 0002: it repairs schema drift and is written for the
-- pre-drift remote DB, not for a schema freshly created by 0001.
-- =============================================================================

CREATE TABLE IF NOT EXISTS "d1_migrations"(
		id         INTEGER PRIMARY KEY AUTOINCREMENT,
		name       TEXT UNIQUE,
		applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

INSERT OR IGNORE INTO "d1_migrations" (name) VALUES ('0001_init.sql');
INSERT OR IGNORE INTO "d1_migrations" (name) VALUES ('0002_align_remote_schema.sql');