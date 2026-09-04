'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import {
  ArrowLeft,
  Clapperboard,
  Film,
  Inbox,
  LayoutDashboard,
  ListVideo,
  ShieldAlert,
  Upload,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { ProtectedPlaceholder } from '@/components/protected-placeholder'
import { Skeleton } from '@/components/ui/skeleton'

type NavItem = { href: string; label: string; icon: LucideIcon; exact?: boolean }

const NAV: NavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/movies', label: 'Movies', icon: Film },
  { href: '/admin/submissions', label: 'Submissions', icon: Upload },
  { href: '/admin/requests', label: 'Requests', icon: Inbox },
  { href: '/admin/playlists', label: 'Playlists', icon: ListVideo },
]

function AdminSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <Skeleton className="h-9 w-56" />
      <Skeleton className="mt-3 h-5 w-80" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  )
}

interface MeUser {
  id: string
  displayName: string
  role: 'admin' | 'creator' | 'user'
  status: 'active' | 'suspended'
  avatarUrl: string | null
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  /* Clerk answers "who is signed in"; /api/me answers "what can they do"
     (roles live in our database, not in Clerk). */
  const { isLoaded, isSignedIn } = useUser()
  const pathname = usePathname()
  const [me, setMe] = useState<MeUser | null>(null)
  const [meLoaded, setMeLoaded] = useState(false)

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      setMeLoaded(true)
      return
    }
    let cancelled = false
    fetch('/api/me')
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setMe(d?.data?.user ?? null)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setMeLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [isLoaded, isSignedIn])

  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href)

  if (!isLoaded || !meLoaded) return <AdminSkeleton />

  if (!isSignedIn) return <ProtectedPlaceholder area="the admin console" />

  if (me?.role !== 'admin') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4 py-16">
        <Empty className="max-w-md">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ShieldAlert />
            </EmptyMedia>
            <EmptyTitle>Admins only</EmptyTitle>
            <EmptyDescription>
              Your account does not have permission to view the admin console.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Mobile admin nav (single-column layout) */}
      <div className="border-b border-border/60 bg-background/95 backdrop-blur md:hidden">
        <div className="flex items-center gap-2 px-4 pt-3">
          <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Clapperboard className="size-4" />
          </span>
          <span className="font-serif text-lg font-bold">
            Sabi<span className="text-primary">Flix</span>
          </span>
          <span className="ml-auto text-xs text-muted-foreground">Admin</span>
        </div>
        <nav
          className="flex gap-1 overflow-x-auto p-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Admin sections"
        >
          {NAV.map((item) => (
            <Button
              key={item.href}
              size="sm"
              variant={isActive(item) ? 'secondary' : 'ghost'}
              render={<Link href={item.href} />}
            >
              <item.icon data-icon="inline-start" />
              {item.label}
            </Button>
          ))}
        </nav>
      </div>

      <div className="flex flex-1">
        {/* Desktop sidebar */}
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border/60 md:flex">
          <div className="flex items-center gap-2 px-4 py-5">
            <span className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Clapperboard className="size-5" />
            </span>
            <div className="flex flex-col">
              <span className="font-serif text-lg font-bold leading-none">
                Sabi<span className="text-primary">Flix</span>
              </span>
              <span className="text-xs text-muted-foreground">Admin console</span>
            </div>
          </div>

          <nav className="flex flex-1 flex-col gap-1 px-3" aria-label="Admin sections">
            {NAV.map((item) => (
              <Button
                key={item.href}
                variant={isActive(item) ? 'secondary' : 'ghost'}
                className="justify-start"
                render={<Link href={item.href} />}
              >
                <item.icon data-icon="inline-start" />
                {item.label}
              </Button>
            ))}
          </nav>

          <div className="border-t border-border/60 p-3">
            <Button variant="ghost" className="w-full justify-start" render={<Link href="/" />}>
              <ArrowLeft data-icon="inline-start" />
              Back to site
            </Button>
          </div>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  )
}
