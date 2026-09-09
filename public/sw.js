/*
 * SabiFlix service worker v3 — tiered caching for poor networks.
 *
 * - /_next/static/* (content-hashed) + /posters/* + /brand/*  → cache-first.
 *   Hashed URLs change when content changes, so a cached copy is always the
 *   right file for that URL; the copy is refreshed in the background.
 * - /api/catalog → stale-while-revalidate (instant paint, async refresh).
 * - Navigations + everything else → network-first with offline fallback
 *   (freshness wins for HTML: it references the newest hashed chunks).
 */

const VERSION = 'sabiflix-v3'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(
        keys.filter((key) => key !== VERSION).map((key) => caches.delete(key)),
      )
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/_next/webpack-hmr')) return
  if (url.pathname === '/sw.js') return

  const openCache = caches.open(VERSION)

  /** Cache-first: immutable, content-addressed responses. */
  const cacheFirst = async () => {
    const cache = await openCache
    const cached = await cache.match(request)
    if (cached) {
      // Refresh the copy in the background so it never goes truly stale.
      event.waitUntil(
        (async () => {
          try {
            const fresh = await fetch(request)
            if (fresh.ok) await cache.put(request, fresh)
          } catch {
            /* offline — cached copy remains */
          }
        })(),
      )
      return cached
    }
    const response = await fetch(request)
    if (response.ok) cache.put(request, response.clone())
    return response
  }

  /** Stale-while-revalidate: instant paint, async refresh. */
  const staleWhileRevalidate = async () => {
    const cache = await openCache
    const cached = await cache.match(request)
    if (cached) {
      event.waitUntil(
        (async () => {
          try {
            const fresh = await fetch(request)
            if (fresh.ok) await cache.put(request, fresh)
          } catch {
            /* offline — keep serving the cached catalog */
          }
        })(),
      )
      return cached
    }
    const response = await fetch(request)
    if (response.ok) cache.put(request, response.clone())
    return response
  }

  /** Network-first with offline fallback (HTML + personal APIs). */
  const networkFirst = async () => {
    const cache = await openCache
    try {
      const response = await fetch(request)
      if (response.ok) cache.put(request, response.clone())
      return response
    } catch {
      const offline = await cache.match(request)
      if (offline) return offline
      if (request.mode === 'navigate') {
        const home = await caches.match('/')
        if (home) return home
      }
      throw new Error('offline and not cached')
    }
  }

  // Immutable, content-addressed assets — cache-first.
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/posters/') ||
    url.pathname.startsWith('/brand/')
  ) {
    event.respondWith(cacheFirst())
    return
  }

  // Public catalog — instant from cache, refreshed in the background.
  if (url.pathname === '/api/catalog') {
    event.respondWith(staleWhileRevalidate())
    return
  }

  // Navigations & everything else — freshness wins, cached offline fallback.
  event.respondWith(networkFirst())
})

