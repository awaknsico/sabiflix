'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Movie, WatchHistoryEntry } from '@/lib/types'

/**
 * Server-backed watch history state.
 *
 * Reads from /api/watch-history and writes progress to the same route.
 * Entries are upserted per movie (one row per film), always sorted by last
 * activity (`updatedAt`) descending so consumers can render straight through.
 *
 * The API stores timestamps as epoch seconds; we convert to ISO-8601 strings
 * at the boundary so the rest of the codebase stays unchanged.
 */

/** Entries at/above this completion ratio count as "finished". */
export const COMPLETE_RATIO = 0.95

export interface WatchHistoryItem extends WatchHistoryEntry {
  updatedAt: string
  completedAt: string | null
}

export type WatchPeriod = 'week' | 'all'

/* ------------------------------------------------------------------ */
/* API shapes                                                          */
/* ------------------------------------------------------------------ */

interface HistoryApiItem {
  movieId: string
  title: string
  posterUrl: string | null
  progressSeconds: number
  durationSeconds: number
  completedAt: number | null
  updatedAt: number /* epoch seconds */
}

interface HistoryApiResponse {
  ok: boolean
  data?: { items: HistoryApiItem[]; entry?: HistoryApiItem }
  error?: string
}

/* ------------------------------------------------------------------ */
/* Conversion helpers                                                  */
/* ------------------------------------------------------------------ */

function apiToItem(entry: HistoryApiItem): WatchHistoryItem {
  const updatedAt = new Date(entry.updatedAt * 1000).toISOString()
  // The server is the source of truth for completion (completedAt survives
  // heartbeats that omit durationSeconds). Only fall back to the local
  // >=95% ratio when the server sent no completedAt (legacy rows).
  const completedAt =
    entry.completedAt != null
      ? new Date(entry.completedAt * 1000).toISOString()
      : entry.durationSeconds > 0 && entry.progressSeconds / entry.durationSeconds >= COMPLETE_RATIO
        ? updatedAt
        : null
  return {
    id: `wh-${entry.movieId}`,
    movieId: entry.movieId,
    watchedAt: updatedAt,
    progressSeconds: entry.progressSeconds,
    durationSeconds: entry.durationSeconds,
    updatedAt,
    completedAt,
  }
}

/* ------------------------------------------------------------------ */
/* Pure helpers (unchanged - operate on the normalized shape)          */
/* ------------------------------------------------------------------ */

/** True when the viewer has finished. The server's completedAt is the source
 * of truth - it survives heartbeats that omit durationSeconds, and it is
 * always a string|null (never undefined) after apiToItem normalization. */
export function isComplete(
  entry: Pick<WatchHistoryItem, 'completedAt' | 'progressSeconds' | 'durationSeconds'>,
): boolean {
  return entry.completedAt != null
}

/** Incomplete entries, latest activity first - the raw material for "Continue watching". */
export function resumeCandidates(
  entries: WatchHistoryItem[],
  { limit = 5 }: { limit?: number } = {},
): WatchHistoryItem[] {
  return entries
    .filter((e) => !isComplete(e))
    .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))
    .slice(0, limit)
}

/**
 * Community "most watched" ranking: every watch contributes a recency-weighted
 * score (1.0 today, ~0.5 a week ago, ~0.25 after two) so one binge session
 * cannot dominate the rail - count + freshness, not raw plays. Movies are
 * resolved through the passed D1-backed catalog.
 */
export function rankMostWatched(
  entries: WatchHistoryItem[],
  movies: Map<string, Movie>,
  { period = 'all', limit = 10 }: { period?: WatchPeriod; limit?: number } = {},
): { movie: Movie; score: number }[] {
  const now = Date.now()
  const dayMs = 24 * 60 * 60 * 1000
  const weekAgo = now - 7 * dayMs
  const scoped = period === 'week' ? entries.filter((e) => +new Date(e.updatedAt) >= weekAgo) : entries

  const byMovie = new Map<string, { movie: Movie; score: number }>()
  for (const e of scoped) {
    const movie = movies.get(e.movieId)
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

/* ------------------------------------------------------------------ */
/* Hook                                                                */
/* ------------------------------------------------------------------ */

export function useWatchHistory(validMovieIds?: readonly string[]) {
  const [entries, setEntries] = useState<WatchHistoryItem[]>([])
  const [ready, setReady] = useState(false)

  const validIdsKey = validMovieIds?.join('\u0000')

  /* Fetch the resume list from the server on mount. */
  useEffect(() => {
    let cancelled = false
    fetch('/api/watch-history')
      .then((r) => r.json())
      .then((data: HistoryApiResponse) => {
        if (cancelled) return
        if (data.ok && data.data?.items) {
          setEntries(data.data.items.map(apiToItem))
        }
        setReady(true)
      })
      .catch(() => {
        if (cancelled) return
        /* 401 (signed-out) or network error -> empty state, ready to render */
        setReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  /* In-memory filter against the active catalog (replaces localStorage cleanup). */
  const filteredEntries = useMemo(() => {
    if (!validMovieIds?.length) return entries
    const validIds = new Set(validMovieIds)
    return entries.filter((e) => validIds.has(e.movieId))
  }, [entries, validIdsKey])

  const get = useCallback(
    (movieId: string) => filteredEntries.find((e) => e.movieId === movieId),
    [filteredEntries],
  )

  const recordProgress = useCallback(
    async ({
      movieId,
      progressSeconds,
      durationSeconds,
    }: {
      movieId: string
      progressSeconds: number
      durationSeconds?: number
    }) => {
      try {
        const res = await fetch('/api/watch-history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            movieId,
            progressSeconds: Math.max(0, Math.floor(progressSeconds)),
            durationSeconds:
              Number.isFinite(durationSeconds) && (durationSeconds ?? 0) > 0
                ? Math.floor(durationSeconds!)
                : undefined,
          }),
        })
        const data = await res.json()
        if (data.ok && data.data?.entry) {
          const e = data.data.entry
          setEntries((prev) => [apiToItem(e), ...prev.filter((x) => x.movieId !== movieId)])
        }
      } catch {
        /* Silently fail - the player retries every 5s, so the next heartbeat
           will pick up the slack. No local write means no stale data. */
      }
    },
    [],
  )

  const markComplete = useCallback(
    async (movieId: string) => {
      const entry = entries.find((e) => e.movieId === movieId)
      try {
        const res = await fetch('/api/watch-history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            movieId,
            // Keep the current resume position - completion is an explicit
            // flag, not progress == duration.
            progressSeconds: entry?.progressSeconds ?? 0,
            durationSeconds:
              entry && Number.isFinite(entry.durationSeconds) && entry.durationSeconds > 0
                ? Math.floor(entry.durationSeconds)
                : undefined,
            completed: true,
          }),
        })
        const data = await res.json()
        if (data.ok && data.data?.entry) {
          const e = data.data.entry
          setEntries((prev) => [apiToItem(e), ...prev.filter((x) => x.movieId !== movieId)])
        }
      } catch {
        /* Silently fail - the next heartbeat will retry. */
      }
    },
    [entries],
  )

  const remove = useCallback((movieId: string) => {
    setEntries((prev) => prev.filter((e) => e.movieId !== movieId))
  }, [])

  const clear = useCallback(() => {
    setEntries([])
  }, [])

  return { entries: filteredEntries, ready, get, recordProgress, markComplete, remove, clear }
}