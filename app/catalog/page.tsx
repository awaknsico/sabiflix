import { Suspense } from 'react'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { CatalogBrowser } from '@/components/catalog-browser'
import { MovieCardSkeleton } from '@/components/movie-card'
import { getPublishedEntries } from '@/lib/server-catalog'

export const metadata = {
  title: 'Catalog — SabiFlix',
  description: 'Browse curated Nollywood, African films, short films, and documentaries.',
}

function CatalogFallback() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {Array.from({ length: 10 }).map((_, i) => (
        <MovieCardSkeleton key={i} />
      ))}
    </div>
  )
}

export default async function CatalogPage() {
  const publishedEntries = await getPublishedEntries()

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-2">
          <h1 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl">
            The Catalog
          </h1>
          <p className="max-w-2xl text-muted-foreground text-pretty">
            Every title here has been watched and approved by a human curator. Filter by
            category, country, or language to find your next film.
          </p>
        </div>
        <Suspense fallback={<CatalogFallback />}>
          <CatalogBrowser publishedMovies={publishedEntries.map((e) => e.movie)} />
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  )
}
