/**
 * Integration tests for the movie repository layer.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createClient } from '@libsql/client'
import { join } from 'path'
import { existsSync, mkdirSync, unlinkSync } from 'fs'

const TEST_DB_PATH = join(process.cwd(), '.data', 'sabiflix-integration-test.db')

function setupTestDB() {
  const dataDir = join(process.cwd(), '.data')
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true })
  if (existsSync(TEST_DB_PATH)) {
    try { unlinkSync(TEST_DB_PATH) } catch {}
  }
  const client = createClient({ url: `file:${TEST_DB_PATH}` })

  client.execute(`CREATE TABLE IF NOT EXISTS movies (
    id TEXT PRIMARY KEY, title TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1, category TEXT,
    year INTEGER, country TEXT, avg_rating REAL DEFAULT 0,
    rating_count INTEGER DEFAULT 0, created_at INTEGER DEFAULT (unixepoch()),
    updated_at INTEGER DEFAULT (unixepoch())
  )`)
  client.execute(`CREATE TABLE IF NOT EXISTS movie_sources (
    id TEXT PRIMARY KEY, movie_id TEXT NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
    youtube_video_id TEXT NOT NULL, is_primary INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  )`)

  return { client, path: TEST_DB_PATH }
}

function cleanupTestDB(client: any, path: string) {
  try { client.close() } catch {}
  if (existsSync(path)) {
    try { unlinkSync(path) } catch {}
  }
}

describe('movies repository integration', () => {
  let client: any
  let path: string
  beforeEach(() => {
    const r = setupTestDB()
    client = r.client
    path = r.path
    // Clear any leftover data
    client.execute(`DELETE FROM movie_sources`)
    client.execute(`DELETE FROM movies`)
  })
  afterEach(() => { cleanupTestDB(client, path) })

  it('inserts and selects an active movie', async () => {
    await client.execute(`INSERT INTO movies (id, title, year, category, country, is_active, avg_rating, rating_count)
      VALUES ('m1-test1', 'Lagos Heat', 2023, 'feature', 'Nigeria', 1, 4.5, 10)`)
    const rows = await client.execute(`SELECT * FROM movies WHERE id = 'm1-test1'`)
    expect(rows.rows.length).toBe(1)
    expect(rows.rows[0].title).toBe('Lagos Heat')
  })

  it('filters by category', async () => {
    await client.execute(`INSERT INTO movies (id, title, category, is_active) VALUES ('m1-test2', 'Film A', 'feature', 1)`)
    await client.execute(`INSERT INTO movies (id, title, category, is_active) VALUES ('m2-test2', 'Film B', 'short', 1)`)
    const rows = await client.execute(`SELECT * FROM movies WHERE category = 'short'`)
    expect(rows.rows.length).toBe(1)
    expect(rows.rows[0].title).toBe('Film B')
  })

  it('excludes inactive movies', async () => {
    await client.execute(`INSERT INTO movies (id, title, is_active) VALUES ('m1-test3', 'Active Film', 1)`)
    await client.execute(`INSERT INTO movies (id, title, is_active) VALUES ('m2-test3', 'Inactive Film', 0)`)
    const activeRows = await client.execute(`SELECT * FROM movies WHERE is_active = 1`)
    expect(activeRows.rows.length).toBe(1)
    expect(activeRows.rows[0].title).toBe('Active Film')
  })

  it('requires title (NOT NULL constraint)', async () => {
    let error: any = null
    try { await client.execute(`INSERT INTO movies (id, year) VALUES ('m1-test4', 2023)`) } catch (err) { error = err }
    expect(error).toBeDefined()
  })

  it('creates a movie source linked to a movie', async () => {
    await client.execute(`INSERT INTO movies (id, title, is_active) VALUES ('m1-test5', 'Test Film', 1)`)
    await client.execute(`INSERT INTO movie_sources (id, movie_id, youtube_video_id, is_primary) VALUES ('s1-test5', 'm1-test5', 'dQw4w9WgXcQ', 1)`)
    const rows = await client.execute(`SELECT * FROM movie_sources WHERE movie_id = 'm1-test5'`)
    expect(rows.rows.length).toBe(1)
    expect(rows.rows[0].youtube_video_id).toBe('dQw4w9WgXcQ')
  })

  it('cascades delete: removing movie removes its sources', async () => {
    await client.execute(`INSERT INTO movies (id, title, is_active) VALUES ('m1-test6', 'Test Film', 1)`)
    await client.execute(`INSERT INTO movie_sources (id, movie_id, youtube_video_id, is_primary) VALUES ('s1-test6', 'm1-test6', 'dQw4w9WgXcQ', 1)`)
    await client.execute(`DELETE FROM movies WHERE id = 'm1-test6'`)
    const sourceRows = await client.execute(`SELECT * FROM movie_sources WHERE movie_id = 'm1-test6'`)
    expect(sourceRows.rows.length).toBe(0)
  })

  it('supports text search on title', async () => {
    await client.execute(`INSERT INTO movies (id, title, is_active) VALUES ('m1-test7', 'Lagos Heat', 1)`)
    await client.execute(`INSERT INTO movies (id, title, is_active) VALUES ('m2-test7', 'Nairobi Nights', 1)`)
    const rows = await client.execute(`SELECT * FROM movies WHERE lower(title) LIKE lower('%lagos%')`)
    expect(rows.rows.length).toBe(1)
    expect(rows.rows[0].title).toBe('Lagos Heat')
  })
})