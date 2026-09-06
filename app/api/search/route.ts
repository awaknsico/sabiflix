/**
 * Global search endpoint (header / search box).
 *
 * GET /api/search?q=lagos — D1-backed, returns up to 6 active matches ranked
 * by recency across title, alt titles, synopsis, actors, country and language.
 * This replaces the old client-side scan over the bundled mock catalog.
 */

import { handler, ok } from '@/lib/api/envelope'
import { searchMovies } from '@/lib/repositories/movies'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = handler(async (request: Request) => {
  const q = new URL(request.url).searchParams.get('q')?.trim() ?? ''
  if (!q) return ok({ results: [] })

  const found = await searchMovies(q, 6)
  return ok({
    results: found.map((m) => ({
      id: m.id,
      title: m.title,
      year: m.year,
      country: m.country,
      language: m.language,
      category: m.category,
      actors: m.actors,
      synopsis: m.synopsis,
      posterUrl: m.posterUrl,
      curationType: m.curationType,
      youtubeVideoId: m.youtubeVideoId,
    })),
  })
})