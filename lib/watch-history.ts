'use client'

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { getMovieById, movies as catalog, watchHistory as seedHistory } from '@/lib/mock-data'
import type { Movie, WatchHistoryEntry } from '@/lib/mock-data'

/**
 * Prototype watch-history state.
 *
 * Mirrors the `watchlist.ts` pattern: the list lives in localStorage,
 * broadcast through a custom event (+ `storage` for other tabs) so every
 * mounted consumer stays in sync. Seeded with the mock history on first read
 * so the prototype starts warm. Clearing writes an empty array (instead of
 * removing the key) so the seeded mock entries do not resurrect.
 *
 * Entries are upserted per movie (one row per film), always sorted by last
 * activity (`updatedAt`) descending so consumers can render straight through.
 */

const KEY = 'sabiflix:watch-history'
const EVENT = 'sabiflix:watch-history-change'

/** Entries at/above this completion ratio count as "finished". */
export const COMPLETE_RATIO = 0.95

export interface WatchHistoryItem extends WatchHistoryEntry {
  updatedAt: string
  completedAt: string | null
}

export type WatchPeriod = 'week' | 'all'

function subscribe(callback: () => void) {
  window.addEventListener(EVENT, callback)
  window.addEventListener('storage', callback)
  return () => {
    window.removeEventListener(EVENT, callback)
    window.removeEventListener('storage', callback)
  }
}

/** Raw snapshot — a stable string (or null when unset / on the server). */
function getSnapshot(): string | null {
  return typeof window !== 'undefined' ? window.localStorage.getItem(KEY) : null
}

function normalize(entry: WatchHistoryEntry): WatchHistoryItem {
  const updatedAt = entry.updatedAt ?? entry.watchedAt
   return {
    ...entry,
    updatedAt,
    completedAt:
      entry.completedAt ??
      (entry.durationSeconds > 0 && entry.progressSeconds / entry.durationSeconds >= COMPLETE_RATIO
        ? entry.watchedAt
        : null),
  }
}

function parseEntries(raw: string | null): WatchHistoryItem[] {
  if (raw === null) return seedHistory.map(normalize)
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(
        (e): e is WatchHistoryEntry =>
          typeof e === 'object' && e !== null && typeof (e as WatchHistoryEntry).movieId === 'string',
      )
      .map(normalize)
      .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))
  } catch {
    return seedHistory.map(normalize)
  }
}

function writeNext(entries: WatchHistoryItem[]) {
  window.localStorage.setItem(
    KEY,
    JSON.stringify([...entries].sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))),
  )
  window.dispatchEvent(new Event(EVENT))
}

/** True when the viewer has finished — explicitly completed, or ≥95% in. */
export function isComplete(
  entry: Pick<WatchHistoryItem, 'completedAt' | 'progressSeconds' | 'durationSeconds'>,
): boolean {
  return (
    Boolean(entry.completedAt) ||
    (entry.durationSeconds > 0 && entry.progressSeconds / entry.durationSeconds >= COMPLETE_RATIO)
  )
}

/** Incomplete entries, latest activity first — the raw material for "Continue watching". */
export function resumeCandidates(
  entries: WatchHistoryItem[],
  { limit = 5 }: { limit?: number } = {},
): WatchHistoryItem[] {
  return entries
    .filter((e) => !isComplete(e))
    .filter((e) => getMovieById(e.movieId)?.isActive === true)
    .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))
    .slice(0, limit)
}

/**
 * Community "most watched" ranking: every watch contributes a recency-weighted
 * score (1.0 today, ~0.5 a week ago, ~0.25 after two) so one binge session
 * cannot dominate the rail — count + freshness, not raw plays.
 */
export function rankMostWatched(
  entries: WatchHistoryItem[],
  { period = 'all', limit = 10 }: { period?: WatchPeriod; limit?: number } = {},
): { movie: Movie; score: number }[] {
  const now = Date.now()
  const dayMs = 24 * 60 * 60 * 1000
  const weekAgo = now - 7 * dayMs
  const scoped = period === 'week' ? entries.filter((e) => +new Date(e.updatedAt) >= weekAgo) : entries

  const byMovie = new Map<string, { movie: Movie; score: number }>()
  for (const e of scoped) {
    const movie = getMovieById(e.movieId)
    if (!movie || !movie.isActive) continue
    const days = Math.max(0, (now - +new Date(e.updatedAt)) / dayMs)
    const recency = Math.pow(0.5, days / 7)
    const current = byMovie.get(movie.id)
    if (current) {
      current.score += recency
    } else {
      byMovie.set(movie.id, { movie, score: recency })
    }
  }

  return [...byMovie.values()]
    .map((r) => ({ ...r, score: Math.round(r.score * 100) / 100 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

/**
 * History-aware related picks: weighted blend of actors (heaviest), country,
 * language, category. Movies already watched (or in progress) are excluded
 * so the section always surfaces something new.
 */
export function recommendFor(movie: Movie, entries: WatchHistoryItem[], catalog: Movie[]): Movie[] {
  const watchedIds = new Set(entries.map((e) => e.movieId))
  const movieActors = movie.actors ?? []
  return catalog
    .filter((m) => m.id !== movie.id && m.isActive && !watchedIds.has(m.id))
    .map((c) => {
      const sharedActors = (c.actors ?? []).filter((a) => movieActors.includes(a)).length
      return {
        movie: c,
        score:
          sharedActors * 4 +
          (c.country === movie.country ? 2 : 0) +
          (c.language === movie.language ? 1 : 0) +
          (c.category === movie.category ? 0.5 : 0),
        sharedActors,
      }
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || b.movie.year - a.movie.year)
    .slice(0, 5)
    .map((r) => r.movie)
}

export function useWatchHistory() {
  const raw = useSyncExternalStore(subscribe, getSnapshot, () => null)

  // `ready` flips after hydration so consumers can avoid flashing the
  // empty state before localStorage has actually been read.
  const [ready, setReady] = useState(false)
  useEffect(() => {
    setReady(true)
  }, [])

  const entries = useMemo(() => parseEntries(raw), [raw])

  const get = useCallback(
    (movieId: string) => entries.find((e) => e.movieId === movieId),
    [entries],
  )

  const recordProgress = useCallback(
    ({
      movieId,
      progressSeconds,
      durationSeconds,
    }: {
      movieId: string
      progressSeconds: number
      durationSeconds?: number
    }) => {
      const current = parseEntries(getSnapshot())
      const now = new Date().toISOString()
      const existing = current.find((e) => e.movieId === movieId)
      const safeDuration =
        Number.isFinite(durationSeconds) && (durationSeconds ?? 0) > 0
          ? Math.floor(durationSeconds ?? 0)
          : existing?.durationSeconds ?? 0
      const progress = Math.max(0, Math.floor(progressSeconds))
      const next: WatchHistoryItem = {
        id: existing?.id ?? `wh-${Date.now()}`,
        movieId,
        watchedAt: existing?.watchedAt ?? now,
        progressSeconds: progress,
        durationSeconds: safeDuration,
        updatedAt: now,
        completedAt: existing?.completedAt ?? null,
      }
      writeNext([next, ...current.filter((e) => e.movieId !== movieId)])
    },
    [],
  )

  const markComplete = useCallback((movieId: string) => {
    const current = parseEntries(getSnapshot())
    const existing = current.find((e) => e.movieId === movieId)
    if (!existing) return
    const now = new Date().toISOString()
    writeNext(
      current.map((e) =>
        e.movieId === movieId
          ? {
              ...e,
              completedAt: now,
              updatedAt: now,
              progressSeconds: e.durationSeconds > 0 ? e.durationSeconds : e.progressSeconds,
            }
          : e,
      ),
    )
  }, [])

  const remove = useCallback((movieId: string) => {
    writeNext(parseEntries(getSnapshot()).filter((e) => e.movieId !== movieId))
  }, [])

  const clear = useCallback(() => {
    writeNext([])
  }, [])

  return { entries, ready, get, recordProgress, markComplete, remove, clear }
}