/**
 * Rate limiting — Upstash Redis with in-memory fallback.
 *
 * Uses a fixed-window counter keyed by IP + route prefix.
 * When Upstash is not configured, falls back to an in-memory Map
 * (suitable for single-instance dev; use Redis in production).
 */

import { Redis } from '@upstash/redis'

let redis: Redis | null = null

function getRedis(): Redis | null {
  if (redis) return redis
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  redis = new Redis({ url, token })
  return redis
}

// In-memory fallback
const memoryStore = new Map<string, { count: number; resetAt: number }>()

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

export async function rateLimit(
  key: string,
  limit = 60,
  windowSeconds = 60,
): Promise<RateLimitResult> {
  const now = Date.now()
  const redis = getRedis()

  if (redis) {
    // Upstash fixed-window
    const windowKey = `rl:${key}:${Math.floor(now / 1000 / windowSeconds)}`
    const count = await redis.incr(windowKey)
    if (count === 1) await redis.expire(windowKey, windowSeconds)
    return {
      allowed: count <= limit,
      remaining: Math.max(0, limit - count),
      resetAt: Math.floor(now / 1000 / windowSeconds) * windowSeconds * 1000 + windowSeconds * 1000,
    }
  }

  // In-memory fallback
  const existing = memoryStore.get(key)
  if (!existing || existing.resetAt < now) {
    memoryStore.set(key, { count: 1, resetAt: now + windowSeconds * 1000 })
    return { allowed: true, remaining: limit - 1, resetAt: now + windowSeconds * 1000 }
  }

  existing.count++
  return {
    allowed: existing.count <= limit,
    remaining: Math.max(0, limit - existing.count),
    resetAt: existing.resetAt,
  }
}

/** Extract client IP from request headers. */
export function clientIp(request: Request): string {
  const xff = request.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return 'unknown'
}
