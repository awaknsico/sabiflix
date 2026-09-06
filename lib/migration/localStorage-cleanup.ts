/**
 * localStorage Migration Cleanup
 *
 * The app used to store watch history, watchlist, and UI state in localStorage.
 * These are now server-backed via D1 APIs. This module cleans up legacy keys
 * to free space and prevent stale data from causing issues.
 *
 * Run once on app initialization (see components/local-storage-cleanup.tsx).
 */

/** Legacy localStorage keys that should be removed */
export const LEGACY_KEYS = [
  // Watch history (now server-backed via /api/watch-history)
  'sabiflix:watch-history',
  'sabiflix:history',
  'watchHistory',
  'history',

  // Watchlist/favorites (now server-backed via /api/watchlist)
  'sabiflix:watchlist',
  'sabiflix:favorites',
  'watchlist',
  'favorites',

  // UI state (no longer needed)
  'sabiflix:theme',
  'sabiflix:sidebar-collapsed',
  'sabiflix:last-tab',

  // Deprecated user preferences
  'sabiflix:user-prefs',
  'sabiflix:display-mode',

  // Old catalog cache
  'sabiflix:catalog-cache',
  'sabiflix:movie-cache',
] as const

/** Current keys that should be preserved */
export const PRESERVED_KEYS = [
  'sabiflix:last-visit', // Used by NewSinceVisit component
] as const

export interface CleanupResult {
  removed: string[]
  preserved: string[]
  errors: string[]
}

/**
 * Clean up legacy localStorage keys.
 * Returns a report of what was removed/preserved.
 */
export function cleanupLegacyStorage(): CleanupResult {
  const result: CleanupResult = {
    removed: [],
    preserved: [],
    errors: [],
  }

  if (typeof window === 'undefined' || !window.localStorage) {
    return result
  }

  const legacyKeySet = new Set<string>(LEGACY_KEYS)
  const preservedKeySet = new Set<string>(PRESERVED_KEYS)

  // Iterate through all localStorage keys
  for (let i = window.localStorage.length - 1; i >= 0; i--) {
    const key = window.localStorage.key(i)
    if (!key) continue

    // Only process sabiflix-prefixed keys or known legacy keys
    if (!key.startsWith('sabiflix:') && !legacyKeySet.has(key)) {
      continue
    }

    // Preserve current keys
    if (preservedKeySet.has(key)) {
      result.preserved.push(key)
      continue
    }

    // Remove legacy keys
    if (legacyKeySet.has(key)) {
      try {
        window.localStorage.removeItem(key)
        result.removed.push(key)
      } catch (err) {
        result.errors.push(key)
      }
    }
  }

  return result
}

/**
 * Check if a specific legacy key exists.
 * Useful for conditional migration logic.
 */
export function hasLegacyData(): boolean {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false
  }

  const legacyKeySet = new Set<string>(LEGACY_KEYS)
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i)
    if (key && legacyKeySet.has(key)) {
      return true
    }
  }
  return false
}

/**
 * Get a report of current localStorage usage.
 * Useful for debugging.
 */
export function getStorageReport(): {
  totalKeys: number
  legacyKeys: string[]
  preservedKeys: string[]
  otherKeys: string[]
} {
  const report = {
    totalKeys: 0,
    legacyKeys: [] as string[],
    preservedKeys: [] as string[],
    otherKeys: [] as string[],
  }

  if (typeof window === 'undefined' || !window.localStorage) {
    return report
  }

  report.totalKeys = window.localStorage.length
  const legacyKeySet = new Set<string>(LEGACY_KEYS)
  const preservedKeySet = new Set<string>(PRESERVED_KEYS)

  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i)
    if (!key) continue

    if (legacyKeySet.has(key)) {
      report.legacyKeys.push(key)
    } else if (preservedKeySet.has(key)) {
      report.preservedKeys.push(key)
    } else {
      report.otherKeys.push(key)
    }
  }

  return report
}
