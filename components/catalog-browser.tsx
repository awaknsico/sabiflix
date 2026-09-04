'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { FilmIcon, Search, SlidersHorizontal, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { MovieCard, MovieCardSkeleton } from '@/components/movie-card'
import { RequestFilmDialog } from '@/components/request-film-dialog'
import type { Movie, MovieCategory } from '@/lib/mock-data'

const ALL = 'all'

/* Filter option lists. These are editorial constants for the browse UI, not
   derived from the DB — the catalog itself (movies, search, cast) is served
   by the D1-backed `publishedMovies` prop. */
const CATEGORIES: { value: MovieCategory; label: string }[] = [
  { value: 'feature', label: 'Feature' },
  { value: 'short', label: 'Short' },
  { value: 'documentary', label: 'Documentary' },
]

const COUNTRIES = [
  'Nigeria',
  'Ghana',
  'South Africa',
  'Kenya',
  'Tanzania',
  'Senegal',
] as const

const LANGUAGES = ['English', 'Yoruba', 'Igbo', 'Swahili', 'Hausa', 'Zulu'] as const

export function CatalogBrowser({
  publishedMovies = [],
}: {
  publishedMovies?: Movie[]
}) {
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string>(ALL)
  const [country, setCountry] = useState<string>(ALL)
  const [language, setLanguage] = useState<string>(ALL)

  // Hydrate initial filters from the URL, then simulate an async fetch.
  useEffect(() => {
    setQuery(searchParams.get('q') ?? '')
    setCategory(searchParams.get('category') ?? ALL)
    setCountry(searchParams.get('country') ?? ALL)
    setLanguage(searchParams.get('language') ?? ALL)
  }, [searchParams])

  useEffect(() => {
    setLoading(true)
    const t = setTimeout(() => setLoading(false), 550)
    return () => clearTimeout(t)
  }, [])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    return publishedMovies
      .filter((m) => m.isActive)
      .filter((m) => (category === ALL ? true : m.category === category))
      .filter((m) => (country === ALL ? true : m.country === country))
      .filter((m) => (language === ALL ? true : m.language === language))
      .filter((m) => {
        if (!q) return true
        const inTitle =
          m.title.toLowerCase().includes(q) ||
          (m.alternativeTitles ?? []).some((t) => t.toLowerCase().includes(q))
        const inCast = (m.actors ?? []).some((a) => a.toLowerCase().includes(q))
        return inTitle || inCast
      })
  }, [query, category, country, language, publishedMovies])

  const activeFilters = [
    category !== ALL,
    country !== ALL,
    language !== ALL,
    query.trim() !== '',
  ].filter(Boolean).length

  function clearAll() {
    setQuery('')
    setCategory(ALL)
    setCountry(ALL)
    setLanguage(ALL)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Search */}
      <InputGroup className="h-10">
        <InputGroupInput
          type="search"
          placeholder="Search by film title or actor..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search by film title or actor"
        />
        <InputGroupAddon>
          <Search />
        </InputGroupAddon>
      </InputGroup>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <SlidersHorizontal className="size-4" />
          Filters
        </div>

        <Select value={category} onValueChange={(v) => setCategory((v as string) ?? ALL)}>
          <SelectTrigger className="w-full sm:w-40" aria-label="Filter by category">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value={ALL}>All categories</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        <Select value={country} onValueChange={(v) => setCountry((v as string) ?? ALL)}>
          <SelectTrigger className="w-full sm:w-40" aria-label="Filter by country">
            <SelectValue placeholder="Country" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value={ALL}>All countries</SelectItem>
              {COUNTRIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        <Select value={language} onValueChange={(v) => setLanguage((v as string) ?? ALL)}>
          <SelectTrigger className="w-full sm:w-40" aria-label="Filter by language">
            <SelectValue placeholder="Language" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value={ALL}>All languages</SelectItem>
              {LANGUAGES.map((l) => (
                <SelectItem key={l} value={l}>
                  {l}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        {activeFilters > 0 ? (
          <Button variant="ghost" size="sm" onClick={clearAll} className="sm:ml-auto">
            <X data-icon="inline-start" />
            Clear ({activeFilters})
          </Button>
        ) : null}
      </div>

      {/* Result count */}
      {!loading ? (
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {results.length} {results.length === 1 ? 'film' : 'films'}
          {query.trim() ? (
            <>
              {' '}for <span className="text-foreground">&ldquo;{query.trim()}&rdquo;</span>
            </>
          ) : null}
        </p>
      ) : null}

      {/* Grid / states */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <MovieCardSkeleton key={i} />
          ))}
        </div>
      ) : results.length === 0 ? (
        <Empty className="border py-16">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FilmIcon />
            </EmptyMedia>
            <EmptyTitle>No films match your filters</EmptyTitle>
            <EmptyDescription>
              Try a different search term or clear your filters. Or ask our curators to hunt
              the film down for you.
            </EmptyDescription>
          </EmptyHeader>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {activeFilters > 0 ? (
              <Button variant="outline" size="sm" onClick={clearAll}>
                Clear all filters
              </Button>
            ) : null}
            <RequestFilmDialog />
          </div>
        </Empty>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {results.map((movie, i) => (
            <MovieCard key={movie.id} movie={movie} priority={i < 5} />
          ))}
        </div>
      )}
    </div>
  )
}

/** Shown if the browser fails to render its data. */
export function CatalogError() {
  return (
    <Alert variant="destructive">
      <AlertTitle>Something went wrong</AlertTitle>
      <AlertDescription>
        We couldn&apos;t load the catalog right now. Please refresh the page to try again.
      </AlertDescription>
    </Alert>
  )
}

export function CatalogFilterBadges({ count }: { count: number }) {
  return <Badge variant="secondary">{count}</Badge>
}
