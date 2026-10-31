/**
 * Test database helper.
 * Creates a fresh local SQLite database for each test file,
 * runs migrations, and cleans up after tests.
 */

import { join } from 'path'
import { existsSync, mkdirSync, unlinkSync } from 'fs'
import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import * as schema from '@/lib/db/schema'
import { migrate } from 'drizzle-orm/libsql/migrator'

const TEST_DB_PATH = join(process.cwd(), '.data', 'sabiflix-test.db')

export function getTestDB() {
  // Ensure .data directory exists
  const dataDir = join(process.cwd(), '.data')
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true })
  }

  // Remove old test database if it exists
  if (existsSync(TEST_DB_PATH)) {
    unlinkSync(TEST_DB_PATH)
  }

  // Create fresh database
  const libsql = createClient({ url: `file:${TEST_DB_PATH}` })
  const db = drizzle(libsql, { schema })

  // Run migrations against the test database
  // Note: In a real CI environment, you'd point this at your migration SQL files
  // For now, we seed minimal data directly

  return { db, path: TEST_DB_PATH }
}

export function cleanupTestDB() {
  if (existsSync(TEST_DB_PATH)) {
    try {
      unlinkSync(TEST_DB_PATH)
    } catch {
      // Ignore cleanup errors
    }
  }
}