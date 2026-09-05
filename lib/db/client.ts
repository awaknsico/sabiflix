/**
 * D1 database client — binding-first with HTTP-API + libsql fallback.
 *
 * On Cloudflare (OpenNext) we get D1 via the workers binding: `env.DB`.
 * On Node / Vercel / local dev we fall back to:
 *   - D1 HTTP API (remote D1 from Node)
 *   - libsql local file (dev fallback, prebuilt binaries — no native compilation)
 *
 * NOTE on types: every consumer is written against ONE canonical API
 * (`select/insert/update/delete ... .all()/.run()/.get()`), so `DB` is typed
 * as the libsql dialect and the D1 bridges are cast to it. At runtime all
 * calls are awaited, which works for both the synchronous libsql driver and the
 * promise-returning D1 driver.
 */

import { drizzle as drizzleD1 } from 'drizzle-orm/d1'
import { drizzle as drizzleLibsql } from 'drizzle-orm/libsql'
import { createClient } from '@libsql/client'
import { existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import * as schema from './schema'

export type DB = ReturnType<typeof drizzleLibsql<typeof schema>>
export type SyncDB = DB

let _db: DB | null = null
let _mode: 'd1' | 'local-sqlite' | 'd1-http' = 'local-sqlite'

export function getDB(): DB {
  if (_db) return _db

  // 1) D1 binding (Cloudflare)
  try {
    const cf = (getCloudflareContext().env as { DB?: unknown }).DB
    if (cf && typeof cf === 'object' && 'prepare' in cf) {
      _db = drizzleD1(cf, { schema }) as unknown as DB
      _mode = 'd1'
      return _db
    }
  } catch { /* fall through */ }

  // 2) D1 HTTP API (remote) — in non-dev deployments (or when explicitly
  //    forced), we talk to the provisioned Cloudflare D1 over HTTP. In local
  //    dev the seeded local libsql file (path #3) is preferred so the app works
  //    without a live Cloudflare database; set FORCE_D1_HTTP=1 to opt into remote.

  const accountId = process.env.CF_ACCOUNT_ID
  const dbId = process.env.CF_D1_DATABASE_ID
  const token = process.env.CF_D1_TOKEN
  const isDev = process.env.NODE_ENV === 'development'
  const forced = process.env.FORCE_D1_HTTP === '1' || process.env.FORCE_D1_HTTP === 'true'
  if ((!isDev || forced) && accountId && dbId && token) {
    _db = createD1HttpProxy(accountId, dbId, token)
    _mode = 'd1-http'
    return _db
  }

  // 3) libsql local file fallback (dev)
  const dbPath = join(process.cwd(), '.data', 'sabiflix.db')
  if (!existsSync(join(process.cwd(), '.data'))) {
    mkdirSync(join(process.cwd(), '.data'), { recursive: true })
  }
  const libsql = createClient({ url: `file:${dbPath}` })
  _db = drizzleLibsql(libsql, { schema }) as DB
  _mode = 'local-sqlite'
  return _db
}

export function getSyncDB(): SyncDB {
  return getDB()
}

export function dbMode(): string { return _mode }

function createD1HttpProxy(accountId: string, databaseId: string, token: string): DB {
  const base = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}`

  async function d1Query(
    sql: string,
    params: unknown[] = [],
  ): Promise<{ rows: Record<string, unknown>[]; rawRows: unknown[][]; meta: Record<string, unknown> }> {
    const res = await fetch(`${base}/query`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql, params }),
    })
    if (!res.ok) throw new Error(`D1 HTTP ${res.status}: ${await res.text()}`)
    const json = (await res.json()) as any
    if (!json.success) throw new Error(`D1 error: ${JSON.stringify(json.errors)}`)
    const result = json.result?.[0]
    if (!result?.results) return { rows: [], rawRows: [], meta: result?.meta ?? {} }

    const results = result.results
    let rows: Record<string, unknown>[]
    let rawRows: unknown[][]
    if (Array.isArray(results)) {
      // Current D1 HTTP API — `results` is already an array of row objects
      // keyed by column name (column order preserved, matching select order).
      rows = results as Record<string, unknown>[]
      rawRows = rows.map((row) => Object.values(row))
    } else if (results && Array.isArray(results.rows)) {
      // Legacy response shape — `results` is `{ columns: string[], rows: unknown[][] }`.
      const columns = (results.columns ?? []) as string[]
      rawRows = results.rows as unknown[][]
      rows = rawRows.map((row) => {
        const obj: Record<string, unknown> = {}
        columns.forEach((col: string, i: number) => { obj[col] = (row as unknown[])[i] })
        return obj
      })
    } else {
      rows = []
      rawRows = []
    }
    return { rows, rawRows, meta: result.meta ?? {} }
  }

  /** The fluent bound-statement surface Drizzle's D1 driver requires. */
  function execute(sql: string, params: unknown[]) {
    return {
      all: async () => ({ results: (await d1Query(sql, params)).rows }),
      first: async () => (await d1Query(sql, params)).rows[0] ?? null,
      raw: async () => (await d1Query(sql, params)).rawRows,
      run: async () => ({ success: true, meta: (await d1Query(sql, params)).meta }),
    }
  }

  const d1Binding = {
    prepare: (sql: string) => ({
      bind: (...params: unknown[]) => execute(sql, params),
      ...execute(sql, []),
    }),
    batch: async (statements: any[]) => Promise.all(statements.map((s) => s.run())),
    exec: async (sql: string) => d1Query(sql),
  }

  return drizzleD1(d1Binding as any, { schema }) as unknown as DB
}

export { schema }