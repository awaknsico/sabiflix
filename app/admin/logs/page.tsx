'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Clock, Inbox, Search, Upload, UserCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import { TablePagination } from '@/components/ui/pagination'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

/** Server-paginated log window. */
const PER_PAGE = 20

type LogType = 'requests' | 'submissions' | 'applications'

/** A resolved (found / not found) film request. */
interface RequestLogItem {
  id: string
  requestedTitle: string
  status: 'found' | 'closed'
  requesterName: string | null
  requesterEmail: string | null
  requestedAt: string
  handledAt: string | null
  handledByName: string | null
  turnaroundSeconds: number | null
  fulfilledByMovieId: string | null
  movieTitle: string | null
  resolutionNote: string | null
}

/** A reviewed (approved / rejected) film submission. */
interface SubmissionLogItem {
  id: string
  title: string
  status: 'approved' | 'rejected'
  filmmakerName: string | null
  filmmakerEmail: string | null
  submittedAt: string
  reviewedAt: string | null
  reviewedByName: string | null
  turnaroundSeconds: number | null
  adminNotes: string | null
  publishedMovieId: string | null
  movieTitle: string | null
}

/** A decided (approved / rejected) filmmaker access application. */
interface ApplicationLogItem {
  id: string
  applicantName: string | null
  applicantEmail: string | null
  message: string | null
  status: 'approved' | 'rejected'
  submittedAt: string
  reviewedAt: string | null
  reviewedByName: string | null
  turnaroundSeconds: number | null
  rejectionReason: string | null
}

interface LogStats {
  requests: { found: number; closed: number; total: number; avgTurnaroundSeconds: number | null }
  submissions: { approved: number; rejected: number; published: number; total: number; avgTurnaroundSeconds: number | null }
  applications: { approved: number; rejected: number; total: number; avgTurnaroundSeconds: number | null }
}

type AnyLogItem = RequestLogItem | SubmissionLogItem | ApplicationLogItem

const TAB_META: Record<LogType, { label: string; icon: typeof Inbox }> = {
  requests: { label: 'Requests', icon: Inbox },
  submissions: { label: 'Submissions', icon: Upload },
  applications: { label: 'Filmmaker access', icon: UserCheck },
}

const STATUS_OPTIONS: Record<LogType, { value: string; label: string }[]> = {
  requests: [
    { value: 'found', label: 'Found' },
    { value: 'closed', label: 'Not found / closed' },
  ],
  submissions: [
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
  ],
  applications: [
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
  ],
}

const SEARCH_PLACEHOLDER: Record<LogType, string> = {
  requests: 'Search title or requester...',
  submissions: 'Search title or filmmaker...',
  applications: 'Search applicant name or email...',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatDateTime(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/** Human-readable turnaround ("45 min", "3 h 20 min", "2 d 5 h"). */
function formatTurnaround(seconds: number | null): string {
  if (seconds == null || seconds < 0) return '—'
  if (seconds < 60) return '< 1 min'
  const mins = Math.floor(seconds / 60)
  if (mins < 60) return `${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 72) return `${hours} h ${mins % 60} min`
  const days = Math.floor(hours / 24)
  return `${days} d ${hours % 24} h`
}

/** Outcome badges: found → default, not found / rejected → destructive. */
function outcomeBadge(status: string) {
  if (status === 'found' || status === 'approved') {
    return <Badge className="capitalize">{status === 'found' ? 'Found' : 'Approved'}</Badge>
  }
  if (status === 'closed') return <Badge variant="destructive">Not found</Badge>
  return <Badge variant="destructive">Rejected</Badge>
}

/** Movie link used in the "outcome" column for requests & submissions. */
function MovieLink({ movieId, title }: { movieId: string; title: string | null }) {
  return (
    <Link
      href={`/movie/${movieId}`}
      className="text-primary underline-offset-4 hover:underline"
    >
      {title ?? 'View movie'}
    </Link>
  )
}

export default function AdminLogsPage() {
  const [type, setType] = useState<LogType>('requests')
  const [status, setStatus] = useState('all')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [page, setPage] = useState(1)
  const [items, setItems] = useState<AnyLogItem[]>([])
  const [stats, setStats] = useState<LogStats | null>(null)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ type, page: String(page), perPage: String(PER_PAGE) })
      if (status !== 'all') params.set('status', status)
      if (search.trim()) params.set('q', search.trim())
      const res = await fetch(`/api/admin/logs?${params.toString()}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? 'Failed to load logs')
      setItems(Array.isArray(data?.data?.items) ? data.data.items : [])
      setStats(data?.data?.stats ?? null)
      setTotal(Number(data?.meta?.total ?? 0))
    } catch {
      toast.error('Could not load the logs', {
        description: 'Please refresh the page to try again.',
      })
    } finally {
      setLoading(false)
    }
  }, [type, page, status, search])

  useEffect(() => {
    load()
  }, [load])

  function changeType(next: LogType) {
    if (next === type) return
    setType(next)
    setStatus('all')
    setSearch('')
    setSearchInput('')
    setPage(1)
  }

  const activeMeta = TAB_META[type]
  const avgTurnaround =
    type === 'requests'
      ? stats?.requests.avgTurnaroundSeconds ?? null
      : type === 'submissions'
        ? stats?.submissions.avgTurnaroundSeconds ?? null
        : stats?.applications.avgTurnaroundSeconds ?? null

  const avgSubLabel: Record<LogType, string> = {
    requests: 'to handle a request',
    submissions: 'to review a submission',
    applications: 'to review an application',
  }

  const summaryCards = [
    {
      label: 'Handled requests',
      value: stats ? String(stats.requests.found + stats.requests.closed) : null,
      sub: stats
        ? `${stats.requests.found} found · ${stats.requests.closed} not found`
        : '',
      icon: Inbox,
    },
    {
      label: 'Reviewed submissions',
      value: stats ? String(stats.submissions.approved + stats.submissions.rejected) : null,
      sub: stats
        ? `${stats.submissions.approved} approved · ${stats.submissions.rejected} rejected · ${stats.submissions.published} published`
        : '',
      icon: Upload,
    },
    {
      label: 'Filmmaker access',
      value: stats ? String(stats.applications.approved + stats.applications.rejected) : null,
      sub: stats
        ? `${stats.applications.approved} approved · ${stats.applications.rejected} rejected`
        : '',
      icon: UserCheck,
    },
    {
      label: 'Avg turnaround',
      value: avgTurnaround == null ? null : formatTurnaround(avgTurnaround),
      sub: avgSubLabel[type],
      icon: Clock,
    },
  ]

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
      <div className="flex flex-col gap-1">
        <h1 className="font-serif text-3xl font-bold tracking-tight">Request &amp; review logs</h1>
        <p className="text-muted-foreground">
          Every handled request and reviewed submission - who asked, which admin attended, how long
          it took, and the outcome.
        </p>
      </div>

      {/* Operational summary */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <Card key={card.label} className="h-full">
            <CardContent className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <card.icon className="size-5" />
              </span>
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-2xl font-bold leading-none">
                  {loading && card.value == null ? <Skeleton className="h-6 w-12" /> : card.value ?? '0'}
                </span>
                <span className="truncate text-sm text-muted-foreground">{card.label}</span>
                {card.sub ? (
                  <span className="truncate text-xs text-muted-foreground/80">{card.sub}</span>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Type tabs + filters */}
      <div className="mt-8 flex flex-col gap-4">
        <Tabs value={type} onValueChange={(v) => changeType(v as LogType)}>
          <TabsList className="w-full max-w-xl">
            {(Object.keys(TAB_META) as LogType[]).map((key) => {
              const meta = TAB_META[key]
              return (
                <TabsTrigger key={key} value={key}>
                  <meta.icon data-icon="inline-start" />
                  {meta.label}
                </TabsTrigger>
              )
            })}
          </TabsList>

          <TabsContent value={type} className="mt-4 flex flex-col gap-4">
            {/* Status filter + search */}
            <div className="flex flex-wrap items-center gap-3">
              <Select
                value={status}
                onValueChange={(v) => {
                  setStatus((v as string) ?? 'all')
                  setPage(1)
                }}
              >
                <SelectTrigger className="w-56" aria-label="Filter by status">
                  <SelectValue placeholder="All outcomes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All outcomes</SelectItem>
                  {STATUS_OPTIONS[type].map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <form
                className="flex min-w-0 flex-1 items-center gap-2 sm:flex-none"
                onSubmit={(e) => {
                  e.preventDefault()
                  setSearch(searchInput)
                  setPage(1)
                }}
              >
                <Input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder={SEARCH_PLACEHOLDER[type]}
                  aria-label="Search logs"
                  className="w-full sm:w-72"
                />
                <Button type="submit" variant="outline" size="icon-sm" aria-label="Search">
                  <Search />
                </Button>
              </form>
            </div>

            {loading ? (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <Empty className="border py-16">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <activeMeta.icon />
                  </EmptyMedia>
                  <EmptyTitle>No handled entries</EmptyTitle>
                  <EmptyDescription>
                    {type === 'requests'
                      ? 'Requests you mark found or closed will appear here with the full audit trail.'
                      : type === 'submissions'
                        ? 'Submissions you approve or reject will appear here with the full audit trail.'
                        : 'Filmmaker access applications you decide will appear here.'}
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <>
                {type === 'requests' ? <RequestsLogTable items={items as RequestLogItem[]} /> : null}
                {type === 'submissions' ? <SubmissionsLogTable items={items as SubmissionLogItem[]} /> : null}
                {type === 'applications' ? <ApplicationsLogTable items={items as ApplicationLogItem[]} /> : null}
                <TablePagination
                  className="mt-2"
                  page={page}
                  perPage={PER_PAGE}
                  total={total}
                  onPageChange={setPage}
                  itemName="entries"
                />
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Log tables - one per entry type                                     */
/* ------------------------------------------------------------------ */

function RequestsLogTable({ items }: { items: RequestLogItem[] }) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Request</TableHead>
            <TableHead>Outcome</TableHead>
            <TableHead>Handled by</TableHead>
            <TableHead>Attended</TableHead>
            <TableHead>Turnaround</TableHead>
            <TableHead>Linked movie</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="max-w-[260px]">
                <div className="flex flex-col">
                  <span className="truncate font-medium" title={item.requestedTitle}>
                    {item.requestedTitle}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {item.requesterName ?? 'Unknown viewer'} · Requested {formatDate(item.requestedAt)}
                  </span>
                  {item.resolutionNote ? (
                    <span className="mt-0.5 truncate text-xs text-muted-foreground/80" title={item.resolutionNote}>
                      &ldquo;{item.resolutionNote}&rdquo;
                    </span>
                  ) : null}
                </div>
              </TableCell>
              <TableCell>{outcomeBadge(item.status)}</TableCell>
              <TableCell>{item.handledByName ?? 'Unknown admin'}</TableCell>
              <TableCell>{formatDateTime(item.handledAt)}</TableCell>
              <TableCell>{formatTurnaround(item.turnaroundSeconds)}</TableCell>
              <TableCell>
                {item.fulfilledByMovieId ? (
                  <MovieLink movieId={item.fulfilledByMovieId} title={item.movieTitle} />
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function SubmissionsLogTable({ items }: { items: SubmissionLogItem[] }) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Film</TableHead>
            <TableHead>Outcome</TableHead>
            <TableHead>Reviewed by</TableHead>
            <TableHead>Reviewed</TableHead>
            <TableHead>Turnaround</TableHead>
            <TableHead>Outcome detail</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="max-w-[260px]">
                <div className="flex flex-col">
                  <span className="truncate font-medium" title={item.title}>
                    {item.title}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {item.filmmakerName ?? 'Unknown filmmaker'} · Submitted {formatDate(item.submittedAt)}
                  </span>
                </div>
              </TableCell>
              <TableCell>{outcomeBadge(item.status)}</TableCell>
              <TableCell>{item.reviewedByName ?? 'Unknown admin'}</TableCell>
              <TableCell>{formatDateTime(item.reviewedAt)}</TableCell>
              <TableCell>{formatTurnaround(item.turnaroundSeconds)}</TableCell>
              <TableCell className="max-w-[220px]">
                {item.publishedMovieId ? (
                  <MovieLink movieId={item.publishedMovieId} title={item.movieTitle} />
                ) : item.adminNotes ? (
                  <span className="block truncate text-xs text-muted-foreground" title={item.adminNotes}>
                    {item.adminNotes}
                  </span>
                ) : item.status === 'approved' ? (
                  <span className="text-xs text-muted-foreground">Approved - awaiting publish</span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function ApplicationsLogTable({ items }: { items: ApplicationLogItem[] }) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Applicant</TableHead>
            <TableHead>Outcome</TableHead>
            <TableHead>Reviewed by</TableHead>
            <TableHead>Reviewed</TableHead>
            <TableHead>Turnaround</TableHead>
            <TableHead>Decision note</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="max-w-[260px]">
                <div className="flex flex-col">
                  <span className="truncate font-medium">
                    {item.applicantName ?? 'Unknown applicant'}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {item.applicantEmail ?? '—'} · Applied {formatDate(item.submittedAt)}
                  </span>
                  {item.message ? (
                    <span className="mt-0.5 truncate text-xs text-muted-foreground/80" title={item.message}>
                      &ldquo;{item.message}&rdquo;
                    </span>
                  ) : null}
                </div>
              </TableCell>
              <TableCell>{outcomeBadge(item.status)}</TableCell>
              <TableCell>{item.reviewedByName ?? 'Unknown admin'}</TableCell>
              <TableCell>{formatDateTime(item.reviewedAt)}</TableCell>
              <TableCell>{formatTurnaround(item.turnaroundSeconds)}</TableCell>
              <TableCell className="max-w-[220px]">
                {item.rejectionReason ? (
                  <span className="block truncate text-xs text-muted-foreground" title={item.rejectionReason}>
                    {item.rejectionReason}
                  </span>
                ) : item.status === 'approved' ? (
                  <span className="text-xs text-muted-foreground">Promoted to creator</span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
