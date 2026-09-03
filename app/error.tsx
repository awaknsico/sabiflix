'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { RefreshCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-24 sm:px-6 lg:px-8">
        <div className="flex max-w-md flex-col items-center gap-4 text-center">
          <h1 className="font-serif text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            The projector jammed.
          </h1>
          <p className="text-pretty text-muted-foreground">
            Something went wrong on our side — not yours. Try again, or head back to the
            catalog while we thread the film back through.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button size="lg" variant="premium" onClick={reset}>
              <RefreshCcw data-icon="inline-start" />
              Try again
            </Button>
            <Button
              size="lg"
              variant="outline"
              render={<Link href="/catalog" />}
              className="rounded-full border-white/15 bg-white/[0.04] hover:border-white/30 hover:bg-white/10"
            >
              Back to catalog
            </Button>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
