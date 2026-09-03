'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  BadgeCheck,
  Clapperboard,
  LayoutDashboard,
  LogOut,
  Search,
  Shield,
  User,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group'
import {
  Avatar,
  AvatarFallback,
} from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/lib/use-auth'
import { mockUser, movieCast, movies, type Movie } from '@/lib/mock-data'
import { cn } from '@/lib/utils'

/** Rank active movies by a simple title > alt-title > cast > metadata match. */
function searchMovies(needleRaw: string): Movie[] {
  const needle = needleRaw.toLowerCase()
  return movies
    .filter((m) => m.isActive)
    .map((m) => {
      const inTitle = m.title.toLowerCase().includes(needle) ? 4 : 0
      const inAlt = m.alternativeTitles.some((t) => t.toLowerCase().includes(needle)) ? 2 : 0
      const inCast = (movieCast[m.id] ?? []).some((a) => a.toLowerCase().includes(needle)) ? 2 : 0
      const inMeta = `${m.country} ${m.language}`.toLowerCase().includes(needle) ? 1 : 0
      return { movie: m, score: inTitle + inAlt + inCast + inMeta }
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((r) => r.movie)
}

export function SiteHeader() {
  const router = useRouter()
  const pathname = usePathname()
  const { isSignedIn, signOut } = useAuth()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Movie[]>([])
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)

  // Debounced live matching over titles, alt titles, cast, country, language.
  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length === 0) {
      setResults([])
      setOpen(false)
      setActiveIndex(-1)
      return
    }
    const timer = setTimeout(() => {
      setResults(searchMovies(trimmed))
      setActiveIndex(-1)
      setOpen(true)
    }, 120)
    return () => clearTimeout(timer)
  }, [query])

  // Active nav item renders as ember gradient text (audit 5.4)
  const navItems = [
    { href: '/', label: 'Home' },
    { href: '/catalog', label: 'Catalog' },
  ]

  function goToMovie(id: string) {
    setOpen(false)
    setQuery('')
    setActiveIndex(-1)
    router.push(`/movie/${id}`)
  }

  function seeAllResults() {
    const trimmed = query.trim()
    setOpen(false)
    router.push(trimmed ? `/catalog?q=${encodeURIComponent(trimmed)}` : '/catalog')
  }

  function onSearch(e: React.FormEvent) {
    e.preventDefault()
    const active = activeIndex >= 0 ? results[activeIndex] : undefined
    if (active) {
      goToMovie(active.id)
      return
    }
    seeAllResults()
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#0A0B0F]/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:gap-6 sm:px-6 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-lg bg-ember text-[#14150E] shadow-[0_4px_16px_-4px_rgba(217,146,50,0.6)]">
            <Clapperboard className="size-5" />
          </span>
          <span className="font-serif text-xl font-bold tracking-tight">
            Sabi<span className="text-ember-gradient">Flix</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Button
                key={item.href}
                variant="ghost"
                size="sm"
                render={<Link href={item.href} />}
                className={cn(
                  'rounded-full hover:bg-white/5',
                  isActive
                    ? 'text-ember-gradient font-semibold hover:text-transparent'
                    : 'text-foreground/70 hover:text-foreground',
                )}
              >
                {item.label}
              </Button>
            )
          })}
        </nav>

        {/* Live search — instant, keyboard-navigable results (MovieBoxHD live panel) */}
        <div
          className="relative ml-auto w-full max-w-xs sm:max-w-sm"
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
              setOpen(false)
            }
          }}
        >
          <form onSubmit={onSearch}>
            {/* MovieBoxHD white-20 glass field, pill-shaped (audit 5.4) */}
            <InputGroup className="rounded-full border-white/10 bg-white/[0.05] backdrop-blur-md has-[[data-slot=input-group-control]:focus-visible]:border-primary/50">
              <InputGroupInput
                type="search"
                placeholder="Search films or actors..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => {
                  if (results.length > 0) setOpen(true)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault()
                    setOpen(true)
                    setActiveIndex((i) => Math.min(i + 1, results.length - 1))
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault()
                    setActiveIndex((i) => Math.max(i - 1, -1))
                  } else if (e.key === 'Escape') {
                    setOpen(false)
                  } else if (e.key === 'Enter' && activeIndex >= 0 && results[activeIndex]) {
                    e.preventDefault()
                    goToMovie(results[activeIndex].id)
                  }
                }}
                role="combobox"
                aria-expanded={open && results.length > 0}
                aria-controls="header-search-results"
                aria-activedescendant={
                  activeIndex >= 0 ? `search-result-${activeIndex}` : undefined
                }
                aria-autocomplete="list"
                aria-label="Search films or actors"
                className="placeholder:text-foreground/40"
              />
              <InputGroupAddon className="text-foreground/60">
                <Search />
              </InputGroupAddon>
            </InputGroup>
          </form>

          {open && results.length > 0 ? (
            <div
              id="header-search-results"
              role="listbox"
              aria-label="Search suggestions"
              /* Keep input focus when clicking a result so blur-handling stays simple. */
              onMouseDown={(e) => e.preventDefault()}
              className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-white/10 bg-[#0A0B0F]/95 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.9)] backdrop-blur-xl"
            >
              <div className="flex flex-col p-1.5">
                {results.map((movie, i) => (
                  <button
                    key={movie.id}
                    type="button"
                    role="option"
                    id={`search-result-${i}`}
                    aria-selected={i === activeIndex}
                    onMouseEnter={() => setActiveIndex(i)}
                    onClick={() => goToMovie(movie.id)}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-2.5 py-2 text-left outline-none transition-colors',
                      i === activeIndex ? 'bg-white/10' : 'hover:bg-white/5',
                    )}
                  >
                    <span className="relative h-14 w-10 shrink-0 overflow-hidden rounded-md bg-[#1C1E24]">
                      <Image
                        src={movie.posterUrl || '/placeholder.svg'}
                        alt=""
                        fill
                        sizes="40px"
                        className="object-cover"
                      />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate text-sm font-medium">{movie.title}</span>
                      <span className="inline-flex items-center gap-1 text-[0.625rem] uppercase tracking-[0.14em] tabular-nums text-foreground/50">
                        {movie.curationType === 'admin' ? (
                          <BadgeCheck
                            className="size-3 shrink-0 text-primary/90"
                            aria-label="Curated by a SabiFlix moderator"
                          />
                        ) : movie.curationType === 'requested' ? (
                          <Users
                            className="size-3 shrink-0 text-cyan-400"
                            aria-label="Added because the community requested it"
                          />
                        ) : movie.curationType === 'filmmaker' ? (
                          <Clapperboard
                            className="size-3 shrink-0 text-emerald-400"
                            aria-label="Submitted directly by the filmmaker"
                          />
                        ) : null}
                        {movie.year} &middot; {movie.country}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={seeAllResults}
                className="w-full border-t border-white/[0.06] px-3.5 py-2.5 text-left text-xs text-muted-foreground transition-colors outline-none hover:bg-white/5 hover:text-foreground"
              >
                See all results for &ldquo;{query.trim()}&rdquo;
              </button>
            </div>
          ) : null}
        </div>

        {isSignedIn ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  aria-label="Open account menu"
                  className="shrink-0 rounded-full outline-none ring-offset-2 ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                />
              }
            >
              <Avatar className="size-9 border border-primary/40">
                <AvatarFallback className="bg-primary/15 text-primary">
                  {mockUser.initials}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuGroup>
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span className="font-medium">{mockUser.displayName}</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      {mockUser.email}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/dashboard')}>
                  <LayoutDashboard />
                  Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/dashboard')}>
                  <User />
                  Profile
                </DropdownMenuItem>
                {mockUser.isAdmin ? (
                  <DropdownMenuItem onClick={() => router.push('/admin')}>
                    <Shield />
                    Admin Console
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => {
                  signOut()
                  router.push('/')
                }}
              >
                <LogOut />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              render={<Link href="/sign-in" />}
              className="hidden rounded-full hover:bg-white/5 sm:inline-flex"
            >
              Log in
            </Button>
            <Button size="sm" variant="premium" render={<Link href="/sign-up" />}>
              Sign up
            </Button>
          </div>
        )}
      </div>
    </header>
  )
}
