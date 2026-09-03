'use client'

import { useEffect, useState } from 'react'
import { parseYouTubeId, type YouTubeMeta } from '@/lib/youtube'

export interface YouTubeMetaState {
  resolving: boolean
  meta: YouTubeMeta | null
  error: string | null
}

const IDLE: YouTubeMetaState = { resolving: false, meta: null, error: null }

/**
 * Debounced, client-side resolver for a YouTube URL input.
 * Only fetches when the URL contains a plausible video ID, so typing "https://"
 * doesn't hammer the API.
 */
export function useYouTubeMeta(url: string, { enabled = true }: { enabled?: boolean } = {}) {
  const [state, setState] = useState<YouTubeMetaState>(IDLE)

  useEffect(() => {
    if (!enabled || !parseYouTubeId(url)) {
      setState(IDLE)
      return
    }

    let cancelled = false
    setState({ resolving: true, meta: null, error: null })

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/youtube/meta?url=${encodeURIComponent(url)}`)
        const data = (await res.json()) as YouTubeMeta & { ok?: boolean; error?: string }
        if (cancelled) return
        if (res.ok && data.ok) {
          setState({ resolving: false, meta: data, error: null })
        } else {
          setState({ resolving: false, meta: null, error: data.error ?? 'Could not resolve that video.' })
        }
      } catch {
        if (!cancelled) {
          setState({ resolving: false, meta: null, error: 'Network error while resolving the video. Please try again.' })
        }
      }
    }, 550)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [url, enabled])

  return state
}