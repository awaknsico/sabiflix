import { NextResponse } from 'next/server'
import { resolveYouTubeMeta } from '@/lib/youtube'

/**
 * Resolves a single YouTube URL to its metadata + best thumbnail.
 * GET /api/youtube/meta?url=<encoded>
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const raw = searchParams.get('url') ?? ''

  if (!raw.trim()) {
    return NextResponse.json({ ok: false, error: 'Missing url parameter.' }, { status: 400 })
  }

  try {
    const meta = await resolveYouTubeMeta(raw)
    return NextResponse.json({ ok: true, ...meta })
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Could not resolve that video.' },
      { status: 422 },
    )
  }
}

/**
 * Resolves many URLs at once (batch import on the admin console).
 * POST /api/youtube/meta  body: { urls: string[] }
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { urls?: unknown } | null
  const urls = Array.isArray(body?.urls) ? body.urls.filter((u): u is string => typeof u === 'string') : []

  if (urls.length === 0) {
    return NextResponse.json({ ok: false, error: 'No URLs provided.' }, { status: 400 })
  }

  const results = await Promise.all(
    urls.map(async (url) => {
      try {
        const meta = await resolveYouTubeMeta(url)
        return { ok: true, sourceUrl: url, ...meta }
      } catch (err) {
        return {
          ok: false,
          sourceUrl: url,
          error: err instanceof Error ? err.message : 'Could not resolve that video.',
        }
      }
    }),
  )

  return NextResponse.json({ ok: true, results })
}