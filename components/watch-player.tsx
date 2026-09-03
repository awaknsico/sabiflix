'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, Play, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useWatchHistory } from '@/lib/watch-history'

/* Minimal typings for the YouTube IFrame API we use. */
declare global {
  interface Window {
    YT?: {
      Player: new (el: HTMLElement, options: Record<string, unknown>) => unknown
    }
    onYouTubeIframeAPIReady?: () => void
  }
}

/** Minimal typing for the subset of the YouTube player API we call at runtime. */
type YTPlayerLike = {
  getCurrentTime?: () => number
  getDuration?: () => number
  getPlayerState?: () => number
  playVideo?: () => void
  unMute?: () => void
  seekTo?: (seconds: number, allowSeekAhead: boolean) => void
  destroy?: () => void
}

/** YouTube IFrame API player state codes (mirror of window.YT.PlayerState). */
const YT_STATE = { ENDED: 0, PLAYING: 1, PAUSED: 2 } as const

/** Heartbeat cadence while playback is active. */
const PROGRESS_INTERVAL_MS = 5000

/** Only persist when the position moved meaningfully (avoids noisy writes). */
const MIN_PROGRESS_DELTA = 3

let apiPromise: Promise<void> | null = null

/** How long we wait for the IFrame API before falling back to a plain embed. */
const API_LOAD_TIMEOUT_MS = 10_000

/**
 * Load the YouTube IFrame API. Rejects (instead of hanging forever) when the
 * script fails to load or stalls — ad blockers, strict tracking prevention,
 * and flaky networks all trip this, and an unsettled promise used to leave
 * the dialog stuck on its loading spinner. A rejected load resets the cached
 * promise so the next open can retry.
 */
function loadYouTubeApi(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'))
  if (window.YT?.Player) return Promise.resolve()
  if (apiPromise) return apiPromise

  apiPromise = new Promise<void>((resolve, reject) => {
    let settled = false
    const timer = window.setTimeout(() => finish(false, 'timed out'), API_LOAD_TIMEOUT_MS)

    function finish(ok: boolean, why: string) {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      if (ok) {
        resolve()
      } else {
        apiPromise = null // allow the next open to retry from scratch
        reject(new Error(`YouTube IFrame API ${why}`))
      }
    }

    const prev = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      prev?.()
      finish(window.YT?.Player != null, 'loaded without a Player constructor')
    }

    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    tag.async = true
    tag.onerror = () => finish(false, 'failed to load')
    document.head.appendChild(tag)
  })
  return apiPromise
}


/**
 * Shared distraction-free player dialog.
 *
 * Every playback surface in the app funnels through here — the primary
 * "Watch Film" button, the "Play preview" CTA, and the film page's
 * tap-for-sound pill — so they all share resume support and the same
 * "no related videos / end screens / annotations" configuration.
 */
export function PlayerDialog({
  open,
  youtubeVideoId,
  title,
  startAt = 0,
  movieId,
  onClose,
  caption = 'Distraction-free player — related videos, end screens, and annotations are hidden.',
}: {
  open: boolean
  youtubeVideoId: string
  title: string
  /** Resume / preview start position in seconds. */
  startAt?: number
  /**
   * When set, this is a full-film watch and playback is recorded into watch
   * history (progress heartbeats, completion on end). Previews omit this so
   * they never pollute the viewer's history.
   */
  movieId?: string
  onClose: () => void
  caption?: string
}) {
  const start = Math.max(0, Math.floor(startAt))
  const [ready, setReady] = useState(false)
  const [playerError, setPlayerError] = useState(false)
  /**
   * The IFrame API couldn't be loaded at all (blocked/stalled). We fall back
   * to a plain embed with the same distraction-free configuration so playback
   * still works — just without resume history reporting.
   */
  const [apiFailed, setApiFailed] = useState(false)
  const { recordProgress, markComplete } = useWatchHistory()
  const mountRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<YTPlayerLike | null>(null)
  const durationRef = useRef(0)
  const lastReportedRef = useRef(Math.max(0, Math.floor(startAt)))
  const playingRef = useRef(false)
  /**
   * Autoplay-with-sound recovery window. Browsers that refuse unmuted
   * autoplay pause the video the instant sound is restored. While this window
   * is open we resume playback once — worst case it continues muted instead
   * of freezing on the first frame.
   */
  const policyResumeRef = useRef({ until: 0, used: false })

  // Persist the current playhead when it moved enough to matter. Called on
  // pause, end, and close so the resume position is always fresh.
  const flushProgress = useCallback(() => {
    const p = playerRef.current
    if (!p || !movieId) return
    if (typeof p.getCurrentTime !== 'function') return
    const current = Math.floor(p.getCurrentTime())
    if (current < lastReportedRef.current + MIN_PROGRESS_DELTA) return
    const duration = durationRef.current > 0 ? durationRef.current : undefined
    recordProgress({ movieId, progressSeconds: current, durationSeconds: duration })
    lastReportedRef.current = current
  }, [movieId, recordProgress])

  const handleClose = useCallback(() => {
    flushProgress()
    onClose()
  }, [flushProgress, onClose])

  // Lock scroll + Escape to close while the player is open.
  useEffect(() => {
    if (!open) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = original
      window.removeEventListener('keydown', onKey)
    }
  }, [open, handleClose])

  // Initialise the IFrame API player when opened.
  useEffect(() => {
    if (!open) {
      setReady(false)
      setPlayerError(false)
      setApiFailed(false)
      return
    }
    let cancelled = false
    // New session — start reporting progress from the resume position.
    lastReportedRef.current = Math.max(0, Math.floor(startAt))
    playingRef.current = false

    loadYouTubeApi()
      .then(() => {
        if (cancelled || !mountRef.current || !window.YT?.Player) return
        const player = new window.YT.Player(mountRef.current, {
          videoId: youtubeVideoId,
          playerVars: {
            autoplay: 1,
            // Start muted — browsers only ever permit muted autoplay, and the
            // player is created asynchronously (after the click has passed), so
            // an unmuted autoplay would be silently blocked. We restore sound
            // in onReady (see below); if the click's activation window has
            // already closed, the policy-pause recovery in onStateChange keeps
            // the picture moving instead of freezing on the first frame.
            mute: 1,
            start, // resume where the viewer left off, or the preview start
            // origin must match the embedding page exactly, or YouTube drops
            // the postMessage handshake and serves a "confirm you're not a bot"
            // interstitial instead of the player. Required for embeds of any kind.
            origin: window.location.origin,
            // Distraction-free configuration:
            rel: 0, // no unrelated related videos at the end
            modestbranding: 1, // minimal YouTube branding
            iv_load_policy: 3, // hide video annotations
            controls: 1, // keep playback controls
            fs: 1, // allow fullscreen
            playsinline: 1,
            color: 'white',
          },
          events: {
            onReady: () => {
              if (cancelled) return
              const p = playerRef.current
              if (!p) return
              // Snapshot the runtime — accurate for any source, resilient to re-uploads.
              const duration = p.getDuration?.()
              if (typeof duration === 'number' && Number.isFinite(duration) && duration > 0) {
                durationRef.current = Math.floor(duration)
                // Source swapped since the resume/preview position was saved: if
                // the requested start is past the end, restart so the film plays.
                if (start > durationRef.current) {
                  lastReportedRef.current = 0
                  p.seekTo?.(0, true)
                }
              }
              setPlayerError(false)
              // Start playback FIRST (allowed while muted under every policy),
              // then restore sound. If unmuting trips a browser's autoplay
              // policy, onStateChange's recovery resumes within the window.
              policyResumeRef.current = { until: Date.now() + 6000, used: false }
              p.playVideo?.()
              p.unMute?.()
              setReady(true)
            },
            onStateChange: (event: { data?: number }) => {
              if (cancelled) return
              if (event?.data === YT_STATE.PLAYING) {
                playingRef.current = true
              } else if (event?.data === YT_STATE.PAUSED) {
                playingRef.current = false
                const recovery = policyResumeRef.current
                if (!recovery.used && Date.now() < recovery.until) {
                  // A policy pause right after unmute — resume once rather
                  // than showing a frozen player. Worst case: muted playback.
                  recovery.used = true
                  playerRef.current?.playVideo?.()
                  playerRef.current?.unMute?.()
                  return
                }
                flushProgress()
              } else if (event?.data === YT_STATE.ENDED) {
                playingRef.current = false
                if (movieId) {
                  flushProgress()
                  markComplete(movieId)
                }
              }
            },
            onError: () => {
              // Embed failed (removed video, blocked embedding, bad ID). Surface
              // it instead of leaving an endless spinner behind.
              if (cancelled) return
              setPlayerError(true)
            },
          },
        })
        playerRef.current = player as YTPlayerLike
      })
      .catch(() => {
        // The IFrame API is unavailable (blocked, stalled, offline CDN).
        // Swap in a plain embed with the same distraction-free configuration —
        // it autoplays muted and never depends on the API handshake. Resume
        // history is skipped for this session rather than breaking playback.
        if (cancelled) return
        setApiFailed(true)
        setReady(true)
      })

    return () => {
      cancelled = true
      playerRef.current?.destroy?.()
      playerRef.current = null
    }
  }, [open, youtubeVideoId, start])

  // Heartbeat: while full-film playback is active, record progress throttled.
  useEffect(() => {
    if (!open || !movieId) return
    const timer = window.setInterval(() => {
      const p = playerRef.current
      if (!p || !playingRef.current) return
      if (typeof p.getCurrentTime !== 'function') return
      const current = Math.floor(p.getCurrentTime())
      if (current < lastReportedRef.current + MIN_PROGRESS_DELTA) return
      const duration = durationRef.current > 0 ? durationRef.current : undefined
      recordProgress({ movieId, progressSeconds: current, durationSeconds: duration })
      lastReportedRef.current = current
    }, PROGRESS_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [open, movieId, recordProgress])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Now playing: ${title}`}
      className="fixed inset-0 z-[100] flex flex-col bg-black"
    >
      <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <p className="truncate font-serif text-sm font-medium text-white/90 sm:text-base">
          {title}
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClose}
          className="text-white/80 hover:bg-white/10 hover:text-white"
        >
          <X data-icon="inline-start" />
          Close
        </Button>
      </div>

      <div className="relative flex flex-1 items-center justify-center">
        {playerError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center text-white/70">
            <p className="max-w-md text-sm">
              This film&apos;s source can&apos;t be played right now — it may have been
              removed or blocked from embedding. Close and try another title.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClose}
              className="bg-white/10 text-white hover:bg-white/20 hover:text-white"
            >
              Close
            </Button>
          </div>
        ) : !ready ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/70">
            <Loader2 className="size-8 animate-spin" />
            <span className="text-sm">Loading film…</span>
          </div>
        ) : null}
        <div className="mx-auto aspect-video w-full max-w-6xl px-0 sm:px-6">
          {apiFailed ? (
            /* Graceful fallback when the IFrame API can't load: a plain embed
               with the same distraction-free configuration. It autoplays muted
               under every browser policy and needs no postMessage handshake. */
            <iframe
              key={`${youtubeVideoId}-${start}`}
              src={`https://www.youtube.com/embed/${encodeURIComponent(youtubeVideoId)}?autoplay=1&mute=1&start=${start}&origin=${encodeURIComponent(window.location.origin)}&rel=0&modestbranding=1&iv_load_policy=3&controls=1&fs=1&playsinline=1&color=white`}
              title={title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              className="size-full"
            />
          ) : (
            /* The IFrame API replaces this element with the player iframe. */
            <div ref={mountRef} className="size-full" />
          )}
        </div>
      </div>

      <p className="px-4 pb-3 text-center text-xs text-white/40 sm:px-6">{caption}</p>
    </div>
  )
}

export function WatchPlayer({
  youtubeVideoId,
  title,
  size = 'lg',
  startAt = 0,
  movieId,
}: {
  youtubeVideoId: string
  title: string
  size?: 'sm' | 'lg'
  /** Resume position in seconds (from a "Continue watching" deep link). */
  startAt?: number
  /** Records this playback in watch history (full-film watches only). */
  movieId?: string
}) {
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])

  return (
    <>
      <Button size={size} onClick={() => setOpen(true)}>
        <Play className="fill-current" data-icon="inline-start" />
        Watch Film
      </Button>

      <PlayerDialog
        open={open}
        youtubeVideoId={youtubeVideoId}
        title={title}
        startAt={startAt}
        movieId={movieId}
        onClose={close}
      />
    </>
  )
}