'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { VolumeX } from 'lucide-react'
import { PlayerDialog } from '@/components/watch-player'

/** Length of the ambient loop window (seconds past `previewStartSeconds`). */
const PREVIEW_SLICE_SECONDS = 90

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

function reportsSaveData(): boolean {
  if (typeof window === 'undefined') return false
  const nav = navigator as Navigator & { connection?: { saveData?: boolean } }
  return nav.connection?.saveData === true
}

function isTouchMobile(): boolean {
  if (typeof window === 'undefined') return false
  if (/Android|iPhone|iPad|iPod|Windows Phone/i.test(navigator.userAgent)) return true
  // Coarse-pointer devices (touch-only phones/tablets) tend to stream over
  // cellular — keep the quiet static poster for them.
  return typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches
}

/**
 * Cinematic preview backdrop for the film page.
 *
 * When the environment is eligible (no reduced motion, no save-data, not a
 * coarse-pointer mobile, backdrop in view, tab visible) a muted 90-second loop
 * from the film plays behind the existing scrims — motion as décor, never an
 * interruption. Everyone else gets the calm static poster treatment. The glass
 * "Preview · muted loop" pill is the tap-for-sound path into the shared
 * distraction-free player.
 */
export function MoviePreview({
  posterUrl,
  title,
  youtubeVideoId,
  previewStartSeconds,
}: {
  posterUrl: string
  title: string
  youtubeVideoId?: string | null
  previewStartSeconds?: number
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(true)
  const [pageVisible, setPageVisible] = useState(true)
  const [eligible, setEligible] = useState(false)
  const [videoReady, setVideoReady] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const closeDialog = useCallback(() => setDialogOpen(false), [])

  const videoId = youtubeVideoId ?? ''
  const hasPreview = Boolean(videoId && typeof previewStartSeconds === 'number')
  const startSeconds = Math.max(0, Math.floor(previewStartSeconds ?? 0))
  const endSeconds = startSeconds + PREVIEW_SLICE_SECONDS

  // The origin YouTube handshakes against to trust the embed. Mirroring
  // window.location.origin here prevents the "confirm you're not a bot"
  // interstitial; absent in SSR, so captured only after mount.
  const [origin, setOrigin] = useState('')

  // Resolve environment eligibility once per visit.
  useEffect(() => {
    const disabled: string[] = []
    if (prefersReducedMotion()) disabled.push('prefers-reduced-motion')
    if (reportsSaveData()) disabled.push('save-data')
    if (isTouchMobile()) disabled.push('coarse-pointer / mobile')
    setOrigin(window.location.origin)
    setEligible(disabled.length === 0)
    // Surface the exact gate so a "the background loop stopped" report can be
    // diagnosed from the console instead of guesswork.
    if (process.env.NODE_ENV === 'development' && disabled.length > 0) {
      console.info(`[MoviePreview] Ambient preview loop disabled: ${disabled.join(', ')}`)
    }
  }, [])

  // Pause the ambient loop when it scrolls out of view…
  useEffect(() => {
    const el = wrapRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry) setInView(entry.isIntersecting)
      },
      { threshold: 0.05 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  // …and when the tab is hidden.
  useEffect(() => {
    function onVisibilityChange() {
      setPageVisible(document.visibilityState === 'visible')
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [])

  const playing = eligible && hasPreview && inView && pageVisible

  return (
    <div ref={wrapRef} className="absolute inset-0 h-[420px] overflow-hidden">
      {playing && endSeconds > startSeconds ? (
        <iframe
          key={`${videoId}-${startSeconds}`}
          src={`https://www.youtube.com/embed/${encodeURIComponent(videoId)}?origin=${encodeURIComponent(origin)}&autoplay=1&mute=1&controls=0&disablekb=1&loop=1&playlist=${encodeURIComponent(videoId)}&playsinline=1&rel=0&modestbranding=1&iv_load_policy=3&start=${startSeconds}&end=${endSeconds}`}
          title=""
          aria-hidden="true"
          tabIndex={-1}
          loading="eager"
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
          className={`absolute inset-x-0 top-1/2 aspect-video w-full -translate-y-1/2 transition-opacity duration-700 ${videoReady ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setVideoReady(true)}
        />
      ) : null}

      {/* Static poster treatment — the calm default, and the underlay while the loop loads. */}
      <Image
        src={posterUrl || '/placeholder.svg'}
        alt=""
        fill
        priority
        sizes="100vw"
        className={`scale-110 object-cover object-top blur-2xl transition-opacity duration-700 ${playing && videoReady ? 'opacity-0' : 'opacity-100'}`}
      />

      {/* Legibility scrim */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/90 to-background" />

      {hasPreview ? (
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className="absolute bottom-4 left-4 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80 backdrop-blur-md transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-ring sm:left-6"
          aria-label={`Show preview of ${title} with sound`}
        >
          <VolumeX className="size-3.5" />
          Preview{playing ? ' · muted loop' : ''}
        </button>
      ) : null}

      <PlayerDialog
        open={dialogOpen}
        youtubeVideoId={videoId}
        title={`${title} — preview`}
        startAt={startSeconds}
        onClose={closeDialog}
        caption={`Preview excerpt of ${title}. Close to continue browsing.`}
      />
    </div>
  )
}