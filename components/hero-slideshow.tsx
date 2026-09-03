'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface HeroSlide {
  id: string
  title: string
  year: number
  image: string
}

const SLIDE_INTERVAL_MS = 8000

/**
 * Quiet cinema reel — a slow crossfade of featured key art behind the identity
 * line. Calm by design (audit 5.5): art stays at backdrop opacity under the
 * scrims, the autoplay pauses on hover/focus/hidden-tab, and
 * `prefers-reduced-motion` freezes the reel to manual controls only.
 */
export function HeroSlideshow({
  slides,
  children,
}: {
  slides: HeroSlide[]
  children: ReactNode
}) {
  const [index, setIndex] = useState(0)
  const [hovering, setHovering] = useState(false)
  const [focused, setFocused] = useState(false)
  const [tabHidden, setTabHidden] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)

  const count = slides.length
  const autoRotate = count > 1 && !hovering && !focused && !tabHidden && !reducedMotion

  /* Pause the reel while the tab is in the background. */
  useEffect(() => {
    const onVisibility = () => setTabHidden(document.visibilityState === 'hidden')
    onVisibility()
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  /* Honour prefers-reduced-motion: static frame, manual controls only. */
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReducedMotion(media.matches)
    onChange()
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  const next = useCallback(() => setIndex((i) => (i + 1) % count), [count])
  const prev = useCallback(() => setIndex((i) => (i - 1 + count) % count), [count])

  /* One quiet crossfade every 8s — the timer resets on any manual change. */
  useEffect(() => {
    if (!autoRotate) return
    const timer = setTimeout(next, SLIDE_INTERVAL_MS)
    return () => clearTimeout(timer)
  }, [index, autoRotate, next])

  if (count === 0) return null

  return (
    <section
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured films"
      className="relative overflow-hidden border-b border-white/[0.06]"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft') {
          event.preventDefault()
          prev()
        } else if (event.key === 'ArrowRight') {
          event.preventDefault()
          next()
        }
      }}
    >
      {/* Slides — each is the player-backdrop pair: blurred field + key art */}
      {slides.map((slide, i) => {
        const active = i === index
        return (
          <div
            key={slide.id}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${count}`}
            aria-hidden={!active}
            className={cn(
              'absolute inset-0 transition-opacity ease-in-out',
              reducedMotion ? 'duration-0' : 'duration-[1200ms]',
              active ? 'opacity-100' : 'opacity-0',
            )}
          >
            {/* Layer 1 — blurred field (MovieBoxHD player-backdrop) */}
            <Image
              src={slide.image}
              alt=""
              fill
              priority={i === 0}
              sizes="100vw"
              className="scale-110 object-cover opacity-60 blur-2xl"
            />
            {/* Layer 2 — key art */}
            <Image
              src={slide.image}
              alt=""
              fill
              priority={i === 0}
              sizes="100vw"
              className="object-cover opacity-40"
            />
          </div>
        )
      })}

      {/* Layer 3 — edge + bottom scrims (headline contrast holds on every slide) */}
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/40 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/60" />

      {/* Content — owned by the page: kicker pill → headline → CTAs → trust chip */}
      {children}

      {/* Reel controls — bottom-right glass chrome, quiet by design */}
      {count > 1 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10">
          <div className="mx-auto flex max-w-7xl items-center justify-end px-4 pb-6 sm:px-6 lg:px-8">
            <div className="pointer-events-auto flex items-center gap-3 sm:gap-4">
              <Link
                href={`/movie/${slides[index].id}`}
                className="hidden max-w-[260px] truncate text-[0.6875rem] font-semibold uppercase tracking-[0.14em] tabular-nums text-foreground/60 transition-colors hover:text-foreground sm:block"
              >
                Now showing &middot; {slides[index].title} &middot; {slides[index].year}
              </Link>
              <div className="flex items-center gap-1">
                {slides.map((slide, i) => (
                  <button
                    key={slide.id}
                    type="button"
                    onClick={() => setIndex(i)}
                    aria-label={`Show ${slide.title}`}
                    aria-current={i === index || undefined}
                    className="group flex size-6 items-center justify-center rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <span
                      className={cn(
                        'size-1.5 rounded-full transition-all duration-300',
                        i === index ? 'w-5 bg-primary' : 'bg-white/30 group-hover:bg-white/60',
                      )}
                    />
                  </button>
                ))}
              </div>
              <span className="hidden text-[0.6875rem] tabular-nums text-foreground/40 md:block">
                {String(index + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={prev}
                  aria-label="Previous featured film"
                  className="flex size-9 items-center justify-center rounded-full border border-white/10 bg-white/5 backdrop-blur-md transition-colors outline-none hover:bg-white/10 focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={next}
                  aria-label="Next featured film"
                  className="flex size-9 items-center justify-center rounded-full border border-white/10 bg-white/5 backdrop-blur-md transition-colors outline-none hover:bg-white/10 focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
