'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useWatchHistory } from '@/lib/watch-history'

declare global {
  interface Window {
    YT?: {
      Player: new (el: HTMLElement, options: Record<string, unknown>) => unknown
    }
    onYouTubeIframeAPIReady?: () => void
  }
}

type YTPlayerLike = {
  getCurrentTime?: () => number
  getDuration?: () => number
  getPlayerState?: () => number
  playVideo?: () => void
  unMute?: () => void
  seekTo?: (seconds: number, allowSeekAhead: boolean) => void
  destroy?: () => void
  setVolume?: (percent: number) => void
  getVolume?: () => number
}

const YT_STATE = { ENDED: 0, PLAYING: 1, PAUSED: 2 } as const
const PROGRESS_INTERVAL_MS = 5000
const MIN_PROGRESS_DELTA = 3

let apiPromise: Promise<void> | null = null
const API_LOAD_TIMEOUT_MS = 10_000

function buildEmbedUrl(videoId: string, params: Record<string, string | number | null | undefined> = {}): string {
  const base = 'https://www.youtube.com/embed/' + encodeURIComponent(videoId)
  const pairs = Object.entries(params).filter(([, v]) => v != null && v !== '')
  if (pairs.length === 0) return base
  return base + '?' + pairs.map(([k, v]) => k + '=' + encodeURIComponent(v as string)).join('&')
}

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
        apiPromise = null
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


export function PlayerDialog({
  open,
  youtubeVideoId,
  title,
  startAt = 0,
  movieId,
  onClose,
  advancedPlayer = false,
  playerParams,
  caption = 'Distraction-free player - related videos, end screens, and annotations are hidden.',
}: {
  open: boolean
  youtubeVideoId: string
  title: string
  startAt?: number
  movieId?: string
  onClose: () => void
  advancedPlayer?: boolean
  playerParams?: Record<string, string | number | null | undefined>
  caption?: string
}) {
  const start = Math.max(0, Math.floor(startAt))
  const [ready, setReady] = useState(false)
  const [playerError, setPlayerError] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [apiFailed, setApiFailed] = useState(false)
  const { recordProgress, markComplete } = useWatchHistory()
  const mountRef = useRef<HTMLDivElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<YTPlayerLike | null>(null)
  const durationRef = useRef(0)
  const lastReportedRef = useRef(Math.max(0, Math.floor(startAt)))
  const playingRef = useRef(false)
  const immersiveRunningRef = useRef(false)
  const policyResumeRef = useRef({ until: 0, used: false })

  const enterImmersivePlayback = useCallback(async () => {
    if (typeof window === 'undefined') return
    if (immersiveRunningRef.current) return
    immersiveRunningRef.current = true
    try {
      const dialogEl = dialogRef.current
      if (dialogEl && !document.fullscreenElement && typeof dialogEl.requestFullscreen === 'function') {
        await dialogEl.requestFullscreen().catch(() => {})
      }
      const orientation = (window.screen as unknown as { orientation?: { lock?: (value: string) => Promise<void> } }).orientation
      if (orientation && typeof orientation.lock === 'function') {
        await orientation.lock('landscape').catch(() => {})
      }
    } finally {
      immersiveRunningRef.current = false
    }
  }, [dialogRef])

  const restoreOrientation = useCallback(async () => {
    try {
      if (typeof window === 'undefined') return
      const screenOrientation = (window.screen as unknown as { orientation?: { unlock?: () => void } }).orientation
      screenOrientation?.unlock?.()
      if ((document as Document & { exitFullscreen?: () => Promise<void> }).fullscreenElement) {
        await document.exitFullscreen?.().catch(() => {})
      }
    } catch {
      /* ignore */
    }
  }, [])

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
    void restoreOrientation()
    onClose()
  }, [flushProgress, onClose, restoreOrientation])


  // Lock scroll + Escape to close while the player is open.
  useEffect(() => {
    if (!open) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') handleClose()
    }
    function onFullscreenChange() {
      setIsFullscreen(document.fullscreenElement != null)
    }
    window.addEventListener('keydown', onKey)
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => {
      document.body.style.overflow = original
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('fullscreenchange', onFullscreenChange)
    }
  }, [open, handleClose])

  // Initialise the player when opened.
  useEffect(() => {
    if (!open) {
      setReady(false)
      setPlayerError(false)
      setApiFailed(false)
      return
    }
    let cancelled = false
    lastReportedRef.current = Math.max(0, Math.floor(startAt))
    playingRef.current = false
    immersiveRunningRef.current = false

    if (advancedPlayer) {
      loadYouTubeApi()
        .then(() => {
          if (cancelled || !mountRef.current || !window.YT?.Player) return
          const player = new window.YT.Player(mountRef.current, {
            videoId: youtubeVideoId,
            playerVars: {
              autoplay: 1,
              ...(playerParams ?? {}),
              color: 'white',
            },
            events: {
              onReady: () => {
                if (cancelled) return
                const p = playerRef.current
                if (!p) return
                const duration = p.getDuration?.()
                if (typeof duration === 'number' && Number.isFinite(duration) && duration > 0) {
                  durationRef.current = Math.floor(duration)
                  if (start > durationRef.current) {
                    lastReportedRef.current = 0
                    p.seekTo?.(0, true)
                  }
                }
                setPlayerError(false)
                policyResumeRef.current = { until: Date.now() + 6000, used: false }
                p.playVideo?.()
                p.unMute?.()
                setReady(true)
              },
              onStateChange: (event: { data?: number }) => {
                if (cancelled) return
                if (event?.data === YT_STATE.PLAYING) {
                  playingRef.current = true
                  void enterImmersivePlayback()
                } else if (event?.data === YT_STATE.PAUSED) {
                  playingRef.current = false
                  const recovery = policyResumeRef.current
                  if (!recovery.used && Date.now() < recovery.until) {
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
                if (cancelled) return
                setPlayerError(true)
              },
            },
          })
          playerRef.current = player as YTPlayerLike
        })
        .catch(() => {
          if (cancelled) return
          setApiFailed(true)
          setReady(true)
        })
    } else {
      // SuperSports-style plain iframe embed - reliable, no API dependency.
      setReady(true)
      setPlayerError(false)
      setApiFailed(false)
    }

    return () => {
      cancelled = true
      void restoreOrientation()
      if (advancedPlayer) {
        playerRef.current?.destroy?.()
        playerRef.current = null
      }
    }
  }, [open, youtubeVideoId, start, advancedPlayer, playerParams])

  // Heartbeat: while full-film playback is active, record progress throttled.
  useEffect(() => {
    if (!open || !advancedPlayer || !movieId) return
    if (apiFailed) return
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
  }, [open, movieId, advancedPlayer, apiFailed, recordProgress])


  if (!open) return null

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Now playing: ${title}`}
      className="fixed inset-0 z-[100] flex h-svh flex-col bg-black"
    >
      <div className={isFullscreen ? 'sr-only' : 'flex items-center justify-between gap-4 px-4 py-3 sm:px-6'}>
        <p className="truncate font-serif text-sm font-medium text-white/90 sm:text-base">{title}</p>
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
              This film&apos;s source can&apos;t be played right now - it may have been
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
            <span className="text-sm">Loading film...</span>
          </div>
        ) : null}

        <div className="mx-auto aspect-video w-full max-w-6xl px-0 sm:px-6">
          {advancedPlayer ? (
            <div ref={mountRef} className="aspect-video w-full" />
          ) : (
            <iframe
              key={`${youtubeVideoId}-${start}`}
              src={buildEmbedUrl(youtubeVideoId, {
                autoplay: 1,
                mute: 1,
                start,
                origin: window.location.origin,
                rel: 0,
                modestbranding: 1,
                iv_load_policy: 3,
                controls: 1,
                fs: 1,
                playsinline: 1,
                color: 'white',
                ...playerParams,
              })}
              title={title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              className="aspect-video w-full max-h-full"
            />
          )
         }
        </div>
      </div>

      <p
        className={isFullscreen ? 'sr-only' : 'px-4 pb-3 text-center text-sm text-white/40 sm:px-6'}
      >
        {caption}
      </p>
    </div>
  )
}

