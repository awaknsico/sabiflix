import Link from 'next/link'
import { FilmIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-24 sm:px-6 lg:px-8">
        <div className="flex max-w-md flex-col items-center gap-4 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
            <FilmIcon className="size-6 text-muted-foreground" />
          </span>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            This reel isn&rsquo;t in the archive.
          </h1>
          <p className="text-pretty text-muted-foreground">
            The page you&rsquo;re looking for was moved, retired, or never made it past our
            curators. The catalog is still full of stories worth your full attention.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button size="lg" variant="premium" render={<Link href="/catalog" />}>
              Browse the catalog
            </Button>
            <Button
              size="lg"
              variant="outline"
              render={<Link href="/" />}
              className="rounded-full border-white/15 bg-white/[0.04] hover:border-white/30 hover:bg-white/10"
            >
              Back to home
            </Button>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
