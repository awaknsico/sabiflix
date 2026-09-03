'use client'

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { favoriteMovieIds } from '@/lib/mock-data'

/**
 * Prototype watchlist ("save for later") state.
 *
 * Mirrors the `use-auth.ts` pattern: the list lives in localStorage and is
 * broadcast through a custom event (+ `storage` for other tabs) so every
 * mounted consumer stays in sync. Seeded with the mock favorites on first
 * read so the prototype starts warm.
 */

const KEY = 'sabiflix:watchlist'
const EVENT = 'sabiflix:watchlist-change'

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

function readCurrent(): string[] {
  const raw = getSnapshot()
  if (raw === null) return [...favoriteMovieIds]
  try {
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === 'string')
      : []
  } catch {
    return []
  }
}

function writeNext(ids: string[]) {
  window.localStorage.setItem(KEY, JSON.stringify(ids))
  window.dispatchEvent(new Event(EVENT))
}

export function useWatchlist() {
  const raw = useSyncExternalStore(subscribe, getSnapshot, () => null)

  // `ready` flips after hydration so consumers can avoid flashing the
  // signed-out/empty state before localStorage has actually been read.
  const [ready, setReady] = useState(false)
  useEffect(() => {
    setReady(true)
  }, [])

  const ids = useMemo(() => readCurrent(), [raw])
  const has = useCallback((movieId: string) => ids.includes(movieId), [ids])

  const toggle = useCallback((movieId: string) => {
    const current = readCurrent()
    writeNext(
      current.includes(movieId)
        ? current.filter((id) => id !== movieId)
        : [movieId, ...current],
    )
  }, [])

  return { ids, ready, has, toggle }
}
