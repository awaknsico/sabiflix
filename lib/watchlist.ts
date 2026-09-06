'use client'

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react'

/**
 * Prototype watchlist ("save for later") state.
 *
 * The list lives in localStorage and is broadcast through a custom event
 * (+ `storage` for other tabs) so every mounted consumer stays in sync.
 * Starts empty — the demo favorites that used to ship in
 * `lib/mock-data.ts` have been removed.
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
  if (raw === null) return []
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

export function useWatchlist(validMovieIds?: readonly string[]) {
  const raw = useSyncExternalStore(subscribe, getSnapshot, () => null)

  const validIdsKey = validMovieIds?.join('\u0000')

  useEffect(() => {
    if (!validMovieIds?.length) return
    const validIds = new Set(validMovieIds)
    const current = readCurrent()
    const cleaned = current.filter((id) => validIds.has(id))
    if (cleaned.length !== current.length) writeNext(cleaned)
  }, [validIdsKey])

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
