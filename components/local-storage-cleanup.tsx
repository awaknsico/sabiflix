'use client'

import { useEffect } from 'react'
import { cleanupLegacyStorage } from '@/lib/migration/localStorage-cleanup'

/**
 * LocalStorage cleanup runner.
 * Mount once near the root of the app to clear legacy localStorage data
 * that is no longer needed after the migration to server-backed APIs.
 */
export function LocalStorageCleanup() {
  useEffect(() => {
    // Run cleanup on mount
    const result = cleanupLegacyStorage()

    // Log result in development
    if (process.env.NODE_ENV === 'development' && result.removed.length > 0) {
      console.log(
        `[LocalStorage cleanup] Removed ${result.removed.length} legacy keys:`,
        result.removed,
      )
    }
  }, [])

  return null
}