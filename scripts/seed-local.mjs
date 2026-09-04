/**
 * Seed the local SQLite database (dev fallback) from the D1 migration + seed SQL.
 * Run: npm run db:seed:local
 *
 * Uses @libsql/client — the same driver the app uses at runtime
 * (lib/db/client.ts), with prebuilt binaries and no native compilation.
 * For remote D1, use: wrangler d1 execute sabiflix --file=d1/seed.sql
 */

import { createClient } from '@libsql/client'
import { readFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const dbPath = join(root, '.data', 'sabiflix.db')
const seedPath = join(root, 'd1', 'seed.sql')
const initPath = join(root, 'd1', 'migrations', '0001_init.sql')

mkdirSync(dirname(dbPath), { recursive: true })

/**
 * Split a SQL script into individual statements, respecting:
 *  - single/double-quoted string literals (incl. '' escapes)
 *  - '--' line comments and slash-star block comments
 *  - BEGIN ... END blocks (CREATE TRIGGER bodies) so inner `;` don't split
 */
function splitStatements(sql) {
  const out = []
  let cur = ''
  let i = 0
  const n = sql.length
  let depth = 0

  const isWord = (pos, word) =>
    new RegExp('^' + word + '\\b', 'i').test(sql.slice(pos))

  while (i < n) {
    const c = sql[i]
    const next = sql[i + 1]

    // Skip line comments (to end of line).
    if (c === '-' && next === '-') {
      while (i < n && sql[i] !== '\n') i++
      continue
    }
    // Skip block comments.
    if (c === '/' && next === '*') {
      i += 2
      while (i < n && !(sql[i] === '*' && sql[i + 1] === '/')) i++
      i += 2
      continue
    }
    // Copy string literals whole (handles '' escaping).
    if (c === "'" || c === '"') {
      const q = c
      cur += q
      i++
      while (i < n) {
        cur += sql[i]
        if (sql[i] === q) {
          if (sql[i + 1] === q) {
            cur += sql[i + 1]
            i += 2
            continue
          }
          i++
          break
        }
        i++
      }
      continue
    }
    // Track BEGIN...END nesting so trigger-body `;` don't terminate the statement.
    if (isWord(i, 'BEGIN')) {
      depth++
      cur += 'BEGIN'
      i += 5
      continue
    }
    if (isWord(i, 'END')) {
      depth = Math.max(0, depth - 1)
      cur += 'END'
      i += 3
      continue
    }
    // Statement terminator at nesting depth 0.
    if (c === ';' && depth === 0) {
      const trimmed = cur.trim()
      if (trimmed) out.push(trimmed)
      cur = ''
      i++
      continue
    }
    cur += c
    i++
  }
  const tail = cur.trim()
  if (tail) out.push(tail)
  return out
}

async function runFile(client, path, label) {
  const script = readFileSync(path, 'utf8')
  const stmts = splitStatements(script)
  let ok = 0
  for (const stmt of stmts) {
    try {
      await client.execute({ sql: stmt })
      ok++
    } catch (err) {
      console.log(`  [skip] ${err.message} — ${stmt.slice(0, 90)}`)
    }
  }
  console.log(`${label}: applied ${ok}/${stmts.length} statements`)
}

const client = createClient({ url: `file:${dbPath}` })

try {
  console.log('Applying schema...')
  await runFile(client, initPath, 'schema')
  console.log('Seeding data...')
  await runFile(client, seedPath, 'seed')
  console.log('Done.')
} finally {
  client.close()
}