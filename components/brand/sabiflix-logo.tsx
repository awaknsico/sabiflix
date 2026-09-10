import Image from 'next/image'
import { cn } from '@/lib/utils'

/**
 * SabiFlix brand kit - "woven motion".
 *
 * The symbol is an S built from two organic orange petals with a dark film
 * ribbon woven diagonally between them (sprocket dashes on the upper edge).
 * A warm cream underlay keeps the ribbon legible on both dark and light
 * surfaces. Brand palette: orange #F2921D, charcoal #2B2A27, cream #F5F1EA.
 */

export const BRAND_ORANGE = '#F2921D'
export const BRAND_DARK = '#2B2A27'
export const BRAND_CREAM = '#F5F1EA'

/** The woven-S mark rendered from the approved transparent artwork. */
export function SabiflixSymbol({
  className,
  decorative = false,
}: {
  className?: string
  decorative?: boolean
}) {
  return (
    <Image
      src="/brand/source/logo-symbol.png"
      alt={decorative ? '' : 'SabiFlix symbol'}
      width={337}
      height={477}
      aria-hidden={decorative || undefined}
      className={cn('h-9 w-auto shrink-0 object-contain', className)}
    />
  )
}

/** The approved lowercase wordmark artwork. */
export function SabiflixWordmark({ className }: { className?: string }) {
  return <Image src="/brand/source/logo-wordmark.png" alt="" width={2031} height={774} className={cn('h-5 w-auto', className)} />
}

/** Full lockup - symbol + wordmark. Wrap in a Link/navigation as needed. */
export function SabiflixLogo({
  className,
  symbolClassName,
  wordmarkClassName,
}: {
  className?: string
  symbolClassName?: string
  wordmarkClassName?: string
}) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <SabiflixSymbol decorative className={cn('h-9', symbolClassName)} />
      <SabiflixWordmark className={wordmarkClassName} />
    </span>
  )
}