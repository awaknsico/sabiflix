'use client'

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'

/**
 * Prototype-only auth state.
 *
 * This is NOT real authentication — it just toggles a flag so the UI can show
 * a signed-in vs signed-out experience. No credentials are verified and no
 * session is created on any backend.
 */

const KEY = 'sabiflix:signed-in'
const EVENT = 'sabiflix:auth-change'

function emit() {
  window.dispatchEvent(new Event(EVENT))
}

function subscribe(callback: () => void) {
  window.addEventListener(EVENT, callback)
  window.addEventListener('storage', callback)
  return () => {
    window.removeEventListener(EVENT, callback)
    window.removeEventListener('storage', callback)
  }
}

function getSnapshot() {
  return typeof window !== 'undefined' && window.localStorage.getItem(KEY) === 'true'
}

export function useAuth() {
  const isSignedIn = useSyncExternalStore(subscribe, getSnapshot, () => false)

  // The signed-in flag lives in localStorage, which only exists in the browser.
  // `ready` flips to true once the app has hydrated and the flag has actually
  // been read, so protected pages can render a skeleton during SSR/hydration
  // instead of briefly flashing the signed-out state for signed-in users.
  const [ready, setReady] = useState(false)
  useEffect(() => {
    setReady(true)
  }, [])

  const signIn = useCallback(() => {
    window.localStorage.setItem(KEY, 'true')
    emit()
  }, [])

  const signOut = useCallback(() => {
    window.localStorage.removeItem(KEY)
    emit()
  }, [])

  return { isSignedIn, ready, signIn, signOut }
}
