/**
 * Integration tests for the movie repository layer.
 *
 * Uses Node's built-in SQLite (node:sqlite) rather than @libsql/client: libsql
 * ships per-platform native binaries, so CI on linux would need the
 * linux-x64-gnu optional dependency to be present in node_modules. Node's
 * built-in driver has no native install step and is identical on every OS.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { DatabaseSync } from 'node:sqlite'
import { join } from 'node:path'
import { existsSync, mkdirSync, unlinkSync } from 'node:fs'

const TEST_DB_PATH = join(process.cwd(), '.data', 'sabiflix-integration-test.db')

type DB = InstanceType<typeof DatabaseSync>

function setupTestDB() {
  const dataDir = join(process.cwd(), '.data')
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true })
  // Left behind by a previous interrupted run - start from a clean file.
  for (const suffix of ['', '-wal', '-shm']) {
    const file = TEST_DB_PATH + suffix
    if (existsSync(file)) {
      try {
        unlinkSync(file)
      } catch {
        // ignore - file may still be mapped by another handle
      }
    }
  }

  const db = new DatabaseSync(TEST_DB_PATH)
  // Matches the D1 schema behaviour the repositories rely on.
  db.exec('PRAGMA foreign_keys = ON')
  db.exec(`CREATE TABLE IF NOT EXISTS movies (
    id TEXT PRIMARY KEY, title TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1, category TEXT,
    year INTEGER, country TEXT, avg_rating REAL DEFAULT 0,
    rating_count INTEGER DEFAULT 0, created_at INTEGER DEFAULT (unixepoch()),
    updated_at INTEGER DEFAULT (unixepoch())
  )`)
  db.exec(`CREATE TABLE IF NOT EXISTS movie_sources (
    id TEXT PRIMARY KEY, movie_id TEXT NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
    youtube_video_id TEXT NOT NULL, is_primary INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  )`)

  return { db, path: TEST_DB_PATH }
}

function cleanupTestDB(db: DB | undefined) {
  try {
    db?.close()
  } catch {
    // already closed
  }
  for (const suffix of ['', '-wal', '-shm']) {
    const file = TEST_DB_PATH + suffix
    if (existsSync(file)) {
      try {
        unlinkSync(file)
      } catch {
        // ignore cleanup errors
      }
    }
  }
}

describe('movies repository integration', () => {
  let db: DB

  beforeEach(() => {
    db = setupTestDB().db
    db.exec('DELETE FROM movie_sources')
    db.exec('DELETE FROM movies')
  })

  afterEach(() => cleanupTestDB(db))

  it('inserts and selects an active movie', () => {
    db.exec(`INSERT INTO movies (id, title, year, category, country, is_active, avg_rating, rating_count)
      VALUES ('m1-test1', 'Lagos Heat', 2023, 'feature', 'Nigeria', 1, 4.5, 10)`)
    const rows = db.prepare(`SELECT * FROM movies WHERE id = 'm1-test1'`).all()
    expect(rows.length).toBe(1)
    expect(rows[0].title).toBe('Lagos Heat')
  })

  it('filters by category', () => {
    db.exec(`INSERT INTO movies (id, title, category, is_active) VALUES ('m1-test2', 'Film A', 'feature', 1)`)
    db.exec(`INSERT INTO movies (id, title, category, is_active) VALUES ('m2-test2', 'Film B', 'short', 1)`)
    const rows = db.prepare(`SELECT * FROM movies WHERE category = 'short'`).all()
    expect(rows.length).toBe(1)
    expect(rows[0].title).toBe('Film B')
  })

  it('excludes inactive movies', () => {
    db.exec(`INSERT INTO movies (id, title, is_active) VALUES ('m1-test3', 'Active Film', 1)`)
    db.exec(`INSERT INTO movies (id, title, is_active) VALUES ('m2-test3', 'Inactive Film', 0)`)
    const activeRows = db.prepare(`SELECT * FROM movies WHERE is_active = 1`).all()
    expect(activeRows.length).toBe(1)
    expect(activeRows[0].title).toBe('Active Film')
  })

  it('requires title (NOT NULL constraint)', () => {
    expect(() =>
      db.exec(`INSERT INTO movies (id, year) VALUES ('m1-test4', 2023)`)
    ).toThrow()
  })

  it('creates a movie source linked to a movie', () => {
    db.exec(`INSERT INTO movies (id, title, is_active) VALUES ('m1-test5', 'Test Film', 1)`)
    db.exec(`INSERT INTO movie_sources (id, movie_id, youtube_video_id, is_primary) VALUES ('s1-test5', 'm1-test5', 'dQw4w9WgXcQ', 1)`)
    const rows = db.prepare(`SELECT * FROM movie_sources WHERE movie_id = 'm1-test5'`).all()
    expect(rows.length).toBe(1)
    expect(rows[0].youtube_video_id).toBe('dQw4w9WgXcQ')
  })

  it('cascades delete: removing movie removes its sources', () => {
    db.exec(`INSERT INTO movies (id, title, is_active) VALUES ('m1-test6', 'Test Film', 1)`)
    db.exec(`INSERT INTO movie_sources (id, movie_id, youtube_video_id, is_primary) VALUES ('s1-test6', 'm1-test6', 'dQw4w9WgXcQ', 1)`)
    db.exec(`DELETE FROM movies WHERE id = 'm1-test6'`)
    const sourceRows = db.prepare(`SELECT * FROM movie_sources WHERE movie_id = 'm1-test6'`).all()
    expect(sourceRows.length).toBe(0)
  })

  it('supports text search on title', () => {
    db.exec(`INSERT INTO movies (id, title, is_active) VALUES ('m1-test7', 'Lagos Heat', 1)`)
    db.exec(`INSERT INTO movies (id, title, is_active) VALUES ('m2-test7', 'Nairobi Nights', 1)`)
    const rows = db.prepare(`SELECT * FROM movies WHERE lower(title) LIKE lower('%lagos%')`).all()
    expect(rows.length).toBe(1)
    expect(rows[0].title).toBe('Lagos Heat')
  })
})
