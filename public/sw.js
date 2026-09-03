/*
 * SabiFlix service worker — calm caching, MovieBoxHD-free of dark tricks.
 * - Navigations: network-first, fall back to the last cached page offline.
 * - Static assets & images: network-first, fall back to the cached copy
 *   offline. (Content-hashed Next chunks change every deploy; serving a
 *   stale copy first broke the app after each release — players never
 *   mounted and clicks did nothing — so freshness wins.)
 */

const VERSION = 'sabiflix-v2'
const STATIC_PATTERN = /\.(?:css|js|woff2?|png|jpe?g|svg|webp|avif|ico)$/i

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

  const networkFirstWithCache = async () => {
    const cache = await caches.open(VERSION)
    try {
      const response = await fetch(request)
      if (response.ok) cache.put(request, response.clone())
      return response
    } catch {
      const cached = await cache.match(request)
      if (cached) return cached
      throw new Error('offline and not cached')
    }
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      networkFirstWithCache().catch(() =>
        caches.match(request).then((cached) => cached || caches.match('/')),
      ),
    )
    return
  }

  const isStatic =
    STATIC_PATTERN.test(url.pathname) ||
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/_next/image') ||
    url.pathname.startsWith('/posters/')

  if (isStatic) {
    event.respondWith(networkFirstWithCache())
  }
})

