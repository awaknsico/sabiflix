import Link from 'next/link'
import { ArrowRight, Film, Inbox, ListVideo, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  movies,
  playlists,
  filmRequests,
  filmSubmissions,
} from '@/lib/mock-data'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function AdminDashboardPage() {
  const stats = [
    {
      label: 'Movies',
      value: movies.length,
      href: '/admin/movies',
      icon: Film,
    },
    {
      label: 'Playlists',
      value: playlists.length,
      href: '/admin/playlists',
      icon: ListVideo,
    },
    {
      label: 'Pending submissions',
      value: filmSubmissions.filter((s) => s.status === 'pending').length,
      href: '/admin/submissions',
      icon: Upload,
    },
    {
      label: 'Open requests',
      value: filmRequests.filter((r) => r.status === 'open').length,
      href: '/admin/requests',
      icon: Inbox,
    },
  ]

  const pendingSubs = filmSubmissions
    .filter((s) => s.status === 'pending')
    .slice(0, 3)
  const openReqs = filmRequests.filter((r) => r.status === 'open').slice(0, 3)

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
      <div className="flex flex-col gap-1">
        <h1 className="font-serif text-3xl font-bold tracking-tight">Admin dashboard</h1>
        <p className="text-muted-foreground">
          Content health at a glance — moderate submissions, curate the catalog, and build
          playlists.
        </p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href} className="group">
            <Card className="h-full transition-colors group-hover:border-primary/50">
              <CardContent className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <stat.icon className="size-5" />
                </span>
                <div className="flex flex-col">
                  <span className="text-2xl font-bold leading-none">{stat.value}</span>
                  <span className="text-sm text-muted-foreground">{stat.label}</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-medium">Pending submissions</h2>
              <Button variant="ghost" size="sm" render={<Link href="/admin/submissions" />}>
                Review all
                <ArrowRight data-icon="inline-end" />
              </Button>
            </div>
            {pendingSubs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing waiting for review. 🎉</p>
            ) : (
              pendingSubs.map((sub) => (
                <div key={sub.id} className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium">{sub.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {sub.userDisplayName} · {formatDate(sub.submittedAt)}
                    </span>
                  </div>
                  <Badge variant="secondary">pending</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-medium">Open requests</h2>
              <Button variant="ghost" size="sm" render={<Link href="/admin/requests" />}>
                Review all
                <ArrowRight data-icon="inline-end" />
              </Button>
            </div>
            {openReqs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No open requests right now.</p>
            ) : (
              openReqs.map((req) => (
                <div key={req.id} className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium">{req.requestedTitle}</span>
                    <span className="text-xs text-muted-foreground">
                      {req.userDisplayName} · {formatDate(req.requestedAt)}
                    </span>
                  </div>
                  <Badge variant="secondary">open</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
