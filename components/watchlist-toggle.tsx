'use client'

import { Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useWatchlist } from '@/lib/watchlist'
import { cn } from '@/lib/utils'

/**
 * Save-to-watchlist control.
 * `overlay` floats on a poster frame (cards, inside the poster Link);
 * `button` is the labeled action on the film page.
 */
export function WatchlistToggle({
  movieId,
  title,
  variant = 'overlay',
  size,
  className,
}: {
  movieId: string
  title: string
  variant?: 'overlay' | 'button'
  /** Override the overlay button size. 'sm' for compact cards (MovieCard), 'md' default. */
  size?: 'sm' | 'md'
  className?: string
}) {
  const { has, toggle, ready } = useWatchlist()
  const saved = has(movieId)

  if (variant === 'button') {
    return (
      <Button
        variant="outline"
        size="lg"
        onClick={() => toggle(movieId)}
        aria-pressed={saved}
        aria-label={saved ? 'Remove from your watchlist' : `Save ${title} to your watchlist`}
        className={cn(
          'rounded-full border-white/15 bg-white/[0.04] backdrop-blur-md hover:border-white/30 hover:bg-white/10',
          saved && 'border-primary/40 text-primary hover:border-primary/40 hover:bg-primary/10 hover:text-primary',
          className,
        )}
      >
        <Heart data-icon="inline-start" className={cn(saved && 'fill-current')} />
        {ready && saved ? 'In your watchlist' : 'Save for later'}
      </Button>
    )
  }

  return (
    <button
      type="button"
      onClick={(event) => {
        // Swallow the click so the surrounding poster Link doesn't navigate.
        event.preventDefault()
        event.stopPropagation()
        toggle(movieId)
      }}
      aria-pressed={saved}
      aria-label={saved ? 'Remove from your watchlist' : `Save ${title} to your watchlist`}
      className={cn(
        'absolute right-2 top-2 z-10 flex items-center justify-center rounded-full',
        'border border-white/10 bg-[#0A0B0F]/60 backdrop-blur-md transition-all',
        'hover:scale-105 hover:bg-[#0A0B0F]/85',
        'focus-visible:ring-3 focus-visible:ring-ring/50',
        // Touch: always visible. Desktop: reveal on hover (saved stays pinned).
        'sm:opacity-0 sm:group-hover:opacity-100',
        saved && 'sm:opacity-100 border-primary/50 text-primary',
        // Size variants
        size === 'sm' ? 'size-6' : 'size-8',
        className,
      )}
    >
      <Heart className={cn(size === 'sm' ? 'size-3' : 'size-4', saved && 'fill-current')} />
    </button>
  )
}
