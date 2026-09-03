import { NextResponse } from 'next/server'
import {
  getPublishedEntries,
  removePublishedEntry,
  upsertPublishedEntry,
} from '@/lib/server-catalog'
import type { Movie, MovieCategory, MovieSource } from '@/lib/mock-data'

/**
 * Admin console publish/read/delete for the published catalog.
 * Films written here get a real, navigable `/movie/<id>` page (the server
 * catalog lookup merges them with the mock seed catalog).
 */

export const runtime = 'nodejs'

export async function GET() {
  const entries = await getPublishedEntries()
  return NextResponse.json({
    ok: true,
    movies: entries.map((e) => e.movie),
    sources: entries.map((e) => e.source),
  })
}

const MOVIE_CATEGORIES = new Set<MovieCategory>(['feature', 'short', 'documentary'])

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    movie?: Partial<Movie>
    source?: Partial<MovieSource>
  } | null

  if (!body?.movie?.title?.trim()) {
    return NextResponse.json({ ok: false, error: 'A title is required to publish.' }, { status: 422 })
  }

  const title = body.movie.title.trim()
  const now = new Date().toISOString()
  const presetId = body.movie.id?.trim() || undefined

  const movie: Movie = {
    id:
      presetId && presetId.startsWith('mov-')
        ? presetId
        : `mov-pub-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title,
    alternativeTitles: [],
    actors: Array.isArray(body.movie.actors) ? body.movie.actors : [],
    year: Number(body.movie.year) || new Date().getFullYear(),
    country: body.movie.country || 'Nigeria',
    language: body.movie.language || 'English',
    category: MOVIE_CATEGORIES.has(body.movie.category as MovieCategory)
      ? (body.movie.category as MovieCategory)
      : 'feature',
    curationType: body.movie.curationType || undefined,
    synopsis: body.movie.synopsis?.trim() || '',
    posterUrl: body.movie.posterUrl?.trim() || '/placeholder.svg',
    isActive: body.movie.isActive ?? true,
    createdAt: body.movie.createdAt || now,
    updatedAt: now,
  }

  const videoId = body.source?.youtubeVideoId?.trim()
  const source: MovieSource = {
    id: `src-${movie.id}`,
    movieId: movie.id,
    youtubeVideoId: videoId ?? '',
    youtubeChannelName: body.source?.youtubeChannelName?.trim() || 'SabiFlix Curated',
    partNumber: 1,
    isPrimary: true,
    quality: body.source?.quality?.trim() || '1080p',
    previewStartSeconds: Number.isFinite(Number(body.source?.previewStartSeconds))
      ? Number(body.source?.previewStartSeconds)
      : 60,
  }

  const entry = await upsertPublishedEntry(movie, source)
  return NextResponse.json({ ok: true, entry })
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) {
    return NextResponse.json({ ok: false, error: 'Missing id parameter.' }, { status: 400 })
  }
  const removed = await removePublishedEntry(id)
  return NextResponse.json({ ok: removed })
}