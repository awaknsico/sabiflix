/**
 * Drizzle Kit configuration — generates SQL migrations from the schema.
 *
 * Usage:
 *   npx drizzle-kit generate   → creates SQL in d1/migrations/
 *   npx drizzle-kit migrate    → applies to local SQLite (dev)
 *   wrangler d1 migrations apply sabiflix  → applies to remote D1
 */

import type { Config } from 'drizzle-kit'

export default {
  schema: './lib/db/schema.ts',
  out: './d1/migrations',
  dialect: 'sqlite',
  driver: 'd1-http',
  dbCredentials: {
    accountId: process.env.CF_ACCOUNT_ID ?? '',
    databaseId: process.env.CF_D1_DATABASE_ID ?? '',
    token: process.env.CF_D1_TOKEN ?? '',
  },
} satisfies Config
