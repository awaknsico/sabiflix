'use client'

import { useEffect } from 'react'

/**
 * Progressive enhancement for low-end devices on poor connections.
 *
 * Detects Data-Saver / 2G links and low-core CPUs once on mount and flips a
 * `data-lite` attribute on <html>. globals.css reads it to strip backdrop
 * blurs and collapse transitions/animations, and the hero reel freezes to
 * manual controls. Costs one attribute write - no layout thrash, no fetches.
 */
export function ProgressiveEnhancement() {
  useEffect(() => {
    const connection = (
      navigator as Navigator & {
        connection?: { saveData?: boolean; effectiveType?: string }
      }
    ).connection
    const slowLink =
      connection?.saveData === true ||
      /^(2g|slow-2g|economy)/i.test(connection?.effectiveType ?? '')
    const lowEnd = (navigator.hardwareConcurrency ?? 8) <= 4
    if (slowLink || lowEnd) {
      document.documentElement.setAttribute('data-lite', 'true')
    }
  }, [])

  return null
}