import { handler, ok, Errors } from '@/lib/api/envelope'
import { checkRateLimit } from '@/lib/api/rate-limit'
import { resolveYouTubeMeta } from '@/lib/youtube'

/**
 * YouTube metadata resolution endpoints.
 *
 * GET  /api/youtube/meta?url=<encoded>  - resolve single URL
 * POST /api/youtube/meta                - batch resolve { urls: string[] }
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = handler(async (request: Request) => {
  // Rate limit: 30 requests per minute per IP (external API call)
  const rateLimit = await checkRateLimit(request, 'youtube', 30, 60)
  if (!rateLimit.allowed) return rateLimit.response

  const { searchParams } = new URL(request.url)
  const raw = searchParams.get('url') ?? ''

  if (!raw.trim()) {
    throw Errors.validation('Missing url parameter.')
  }

  const meta = await resolveYouTubeMeta(raw)
  return ok(meta)
})

export const POST = handler(async (request: Request) => {
  // Rate limit: 10 requests per minute per IP (batch endpoint)
  const rateLimit = await checkRateLimit(request, 'youtube-batch', 10, 60)
  if (!rateLimit.allowed) return rateLimit.response

  const body = (await request.json().catch(() => null)) as { urls?: unknown } | null
  const urls = Array.isArray(body?.urls) ? body.urls.filter((u): u is string => typeof u === 'string') : []

  if (urls.length === 0) {
    throw Errors.validation('No URLs provided.')
  }

  const results = await Promise.all(
    urls.map(async (url) => {
      try {
        const meta = await resolveYouTubeMeta(url)
        return { sourceUrl: url, ...meta }
      } catch (err) {
        return {
          sourceUrl: url,
          error: err instanceof Error ? err.message : 'Could not resolve that video.',
        }
      }
    }),
  )

  return ok({ results })
})