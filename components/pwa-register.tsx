'use client'

import { useEffect } from 'react'

/**
 * Registers the service worker. Production only — a caching worker in dev
 * would serve stale Turbopack chunks and break hot reload.
 */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (!('serviceWorker' in navigator)) return

    function register() {
      navigator.serviceWorker.register('/sw.js').catch((error) => {
        console.error('Service worker registration failed', error)
      })
    }

    if (document.readyState === 'complete') {
      register()
    } else {
      window.addEventListener('load', register, { once: true })
      return () => window.removeEventListener('load', register)
    }
  }, [])

  return null
}
