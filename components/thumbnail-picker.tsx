'use client'

import {
  buildFrameCandidates,
  buildThumbnailUrl,
  THUMBNAIL_QUALITIES,
  type ThumbnailQuality,
} from '@/lib/youtube'
import { cn } from '@/lib/utils'

const QUALITY_LABELS: Record<ThumbnailQuality, string> = {
  maxresdefault: 'HD',
  sddefault: 'SD',
  hqdefault: 'HQ',
  mqdefault: 'MQ',
  default: 'Small',
}

/**
 * Curator's thumbnail-frame picker. Lets a moderator choose the poster art
 * from the auto-fetched frame options (quality ladder + the four storyboard
 * frames) instead of hunting for an image. Selection is the raw i.ytimg URL.
 */
export function ThumbnailPicker({
  videoId,
  value,
  onChange,
}: {
  videoId: string
  value: string
  onChange: (url: string) => void
}) {
  const frames = buildFrameCandidates(videoId)
  const options: { url: string; label: string }[] = [
    ...THUMBNAIL_QUALITIES.map((q) => ({
      url: buildThumbnailUrl(videoId, q),
      label: QUALITY_LABELS[q],
    })),
    ...frames.map((url, i) => ({ url, label: `Frame ${i + 1}` })),
  ]

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {options.map((option) => {
          const selected = option.url === value
          return (
            <button
              key={option.url}
              type="button"
              onClick={() => onChange(option.url)}
              aria-pressed={selected}
              aria-label={`Use ${option.label} thumbnail as poster`}
              className={cn(
                'group relative aspect-video overflow-hidden rounded-md border bg-muted transition-colors focus-visible:outline-2 focus-visible:outline-ring',
                selected
                  ? 'border-primary ring-2 ring-primary/40'
                  : 'border-border/60 hover:border-primary/50',
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={option.url}
                alt=""
                className="size-full object-cover"
                loading="lazy"
              />
              <span
                className={cn(
                  'absolute bottom-0.5 left-0.5 rounded px-1 text-[10px] font-medium uppercase tracking-wide',
                  selected ? 'bg-primary text-primary-foreground' : 'bg-black/60 text-white/90',
                )}
              >
                {option.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}