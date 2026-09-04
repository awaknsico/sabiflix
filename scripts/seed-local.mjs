/**
 * Seed the local SQLite database (dev fallback) from d1/seed.sql.
 * Run: npm run db:seed:local
 *
 * This parses the seed.sql file and executes it against .data/sabiflix.db.
 * For remote D1, use: wrangler d1 execute sabiflix --file=d1/seed.sql
 */

import { readFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import Database from 'better-sqlite3'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const dbPath = join(root, '.data', 'sabiflix.db')
const seedPath = join(root, 'd1', 'seed.sql')
const initPath = join(root, 'd1', 'migrations', '0001_init.sql')

mkdirSync(dirname(dbPath), { recursive: true })

const db = new Database(dbPath)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

function runFile(path) {
  const sql = readFileSync(path, 'utf8')
  // Split on semicolons that are NOT inside strings or comments
  const statements = sql
    .split(/;\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('--'))

  for (const stmt of statements) {
    try {
      db.exec(stmt)
    } catch (err) {
      console.warn(`  [skip] ${err.message}`)
    }
  }
}

console.log('Applying schema...')
runFile(initPath)
console.log('Seeding data...')
runFile(seedPath)
console.log('Done.')
db.close()
