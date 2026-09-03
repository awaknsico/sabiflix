import { join } from 'path'
import { mkdir, readFile, writeFile } from 'fs/promises'
import {
  getMovieById,
  getPrimarySource,
  type Movie,
  type MovieSource,
} from '@/lib/mock-data'

/**
 * Server-side published-catalog store.
 *
 * A tiny JSON-file stand-in for the Drizzle `movies`/`movie_sources` tables so
 * that "Approve & Publish" from the admin console produces a real, navigable
 * film page today. Swap the internals for Drizzle queries when the DB is
 * provisioned — the call sites stay identical.
 */

export interface PublishedEntry {
  movie: Movie
  source: MovieSource
}

const DATA_DIR = join(process.cwd(), '.data')
const CATALOG_FILE = join(DATA_DIR, 'catalog.json')

async function readEntries(): Promise<PublishedEntry[]> {
  try {
    const raw = await readFile(CATALOG_FILE, 'utf8')
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as PublishedEntry[]) : []
  } catch {
    return []
  }
}

async function writeEntries(entries: PublishedEntry[]): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true })
  await writeFile(CATALOG_FILE, JSON.stringify(entries, null, 2), 'utf8')
}

export async function getPublishedEntries(): Promise<PublishedEntry[]> {
  return readEntries()
}

export async function findPublishedEntry(id: string): Promise<PublishedEntry | undefined> {
  const entries = await readEntries()
  return entries.find((e) => e.movie.id === id)
}

/**
 * Look up a film across both the mock seed catalog and the published store.
 * Mocks resolve synchronously-fast without touching the file system.
 */
export async function lookupMovieWithSource(id: string): Promise<
  { movie: Movie; source?: MovieSource } | undefined
> {
  const mockMovie = getMovieById(id)
  if (mockMovie) {
    return { movie: mockMovie, source: getPrimarySource(id) }
  }
  const entry = await findPublishedEntry(id)
  if (entry) {
    return { movie: entry.movie, source: entry.source }
  }
  return undefined
}

export async function upsertPublishedEntry(
  movie: Movie,
  source?: MovieSource,
): Promise<PublishedEntry> {
  const entries = await readEntries()
  const entry: PublishedEntry = { movie, source: source ?? fallbackSource(movie) }
  const idx = entries.findIndex((e) => e.movie.id === movie.id)
  if (idx >= 0) entries[idx] = entry
  else entries.unshift(entry)
  await writeEntries(entries)
  return entry
}

export async function removePublishedEntry(id: string): Promise<boolean> {
  const entries = await readEntries()
  const next = entries.filter((e) => e.movie.id !== id)
  if (next.length === entries.length) return false
  await writeEntries(next)
  return true
}

/** Sensible defaults for a source when only a movie (custom art) is supplied. */
function fallbackSource(movie: Movie): MovieSource {
  return {
    id: `src-${movie.id}`,
    movieId: movie.id,
    youtubeVideoId: '',
    youtubeChannelName: 'SabiFlix Curated',
    partNumber: 1,
    isPrimary: true,
    quality: '1080p',
  }
}