'use client'

import { useCallback, useState } from 'react'
import { Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PlayerDialog } from '@/components/watch-player'

/**
 * "Play preview" — a trailer-length excerpt in the shared distraction-free
 * player. Sits beside the primary "Watch Film" button so a visitor can sample
 * a film without committing to the full run time.
 */
export function PreviewPlayer({
  youtubeVideoId,
  title,
  startSeconds = 0,
  size = 'lg',
}: {
  youtubeVideoId: string
  title: string
  /** Where the preview snippet starts, in seconds. */
  startSeconds?: number
  size?: 'xs' | 'sm' | 'default' | 'lg'
}) {
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])

  return (
    <>
      <Button variant="outline" size={size} onClick={() => setOpen(true)}>
        <Play className="fill-current" data-icon="inline-start" />
        Play preview
      </Button>

      <PlayerDialog
        open={open}
        youtubeVideoId={youtubeVideoId}
        title={`${title} — preview`}
        startAt={startSeconds}
        onClose={close}
        caption={`Preview excerpt of ${title}. When you are sold, watch the full film.`}
      />
    </>
  )
}