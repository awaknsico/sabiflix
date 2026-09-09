'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { Play } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Distraction-free playback dialog — extracted to its own module so the heavy
 * YouTube IFrame API loader + dialog only download when a visitor actually
 * opens a player. Home/catalog pages never ship it; WatchPlayer's button
 * (and the preview CTA) stay in the static bundle.
 */
export const PlayerDialog = dynamic(
  () => import('@/components/player-dialog').then((m) => m.PlayerDialog),
  { ssr: false },
)

export function WatchPlayer({
  youtubeVideoId,
  title,
  size = 'lg',
  startAt = 0,
  movieId,
  autoPlay = false,
}: {
  youtubeVideoId: string
  title: string
  size?: 'sm' | 'lg'
  /** Resume position in seconds (from a "Continue watching" deep link). */
  startAt?: number
  /** Records this playback in watch history (full-film watches only). */
  movieId?: string
  /**
   * When true the player dialog opens immediately on mount — used by
   * resume deep links (`?play=1`) so "Resume" skips the details page
   * and serves playback straight away.
   */
  autoPlay?: boolean
}) {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  // Resume deep link — open playback without requiring another click.
  useEffect(() => {
    if (autoPlay) setOpen(true)
  }, [autoPlay])

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