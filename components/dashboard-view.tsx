'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { Check, Clock, Film, Heart, Inbox, Loader2, Plus, Send, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { MovieCard } from '@/components/movie-card'
import {
  filmRequests as seedRequests,
  filmSubmissions as seedSubmissions,
  getMovieById,
  type FilmRequest,
  type FilmSubmission,
} from '@/lib/mock-data'
import { isComplete, useWatchHistory } from '@/lib/watch-history'
import { useWatchlist } from '@/lib/watchlist'
import { useYouTubeMeta } from '@/lib/use-youtube-meta'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function progressPercent(entry: { progressSeconds: number; durationSeconds: number }) {
  if (entry.durationSeconds <= 0) return 0
  return Math.min(100, Math.round((entry.progressSeconds / entry.durationSeconds) * 100))
}

const statusVariant: Record<string, 'default' | 'secondary' | 'outline'> = {
  pending: 'secondary',
  approved: 'default',
  rejected: 'outline',
  open: 'secondary',
  found: 'default',
  closed: 'outline',
}

export function DashboardView() {
  /* Favorites live in the shared watchlist store (heart toggles everywhere). */
  const { ids: favoriteIds } = useWatchlist()
  const favorites = favoriteIds
    .map((id) => getMovieById(id))
    .filter((m): m is NonNullable<ReturnType<typeof getMovieById>> => Boolean(m))

  const [requests, setRequests] = useState<FilmRequest[]>(
    seedRequests.filter((r) => r.userDisplayName === 'Tunde Bakare' || r.status === 'open'),
  )
  const [submissions, setSubmissions] = useState<FilmSubmission[]>(
    seedSubmissions.slice(0, 2),
  )

  /* Live watch history — same store the player records into. */
  const {
    entries: historyEntries,
    ready: historyReady,
    remove: removeHistory,
    markComplete,
    clear: clearHistory,
  } = useWatchHistory()
  const [historyFilter, setHistoryFilter] = useState<'all' | 'watched' | 'in-progress'>('all')
  const visibleHistory = historyEntries.filter((entry) =>
    historyFilter === 'all' || (historyFilter === 'watched') === isComplete(entry),
  )

  /* "Submit your film" — paste a URL, we auto-fetch the details. */
  const [subTitle, setSubTitle] = useState('')
  const [submitUrl, setSubmitUrl] = useState('')
  const [subDescription, setSubDescription] = useState('')
  const { resolving, meta, error } = useYouTubeMeta(submitUrl)

  function handleRequest(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const data = new FormData(form)
    const title = String(data.get('requestedTitle') || '').trim()
    if (!title) return
    setRequests((prev) => [
      {
        id: `req-${Date.now()}`,
        userDisplayName: 'Ada Eze',
        requestedTitle: title,
        requestedAt: new Date().toISOString(),
        status: 'open',
      },
      ...prev,
    ])
    form.reset()
    toast.success('Film request submitted', {
      description: 'Our curators will review it soon.',
    })
  }

  function handleSubmission(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const title = subTitle.trim()
    const url = submitUrl.trim()
    if (!title || !url) return
    setSubmissions((prev) => [
      {
        id: `sub-${Date.now()}`,
        userDisplayName: 'Ada Eze',
        title,
        youtubeUrl: url,
        youtubeVideoId: meta?.videoId ?? '',
        description: subDescription.trim(),
        thumbnailUrl: meta?.thumbnailUrl,
        status: 'pending',
        adminNotes: null,
        submittedAt: new Date().toISOString(),
      },
      ...prev,
    ])
    setSubTitle('')
    setSubmitUrl('')
    setSubDescription('')
    if (meta?.videoId) {
      toast.success('Film submitted for review', {
        description: `Details auto-filled from YouTube — a moderator will watch “${title}” shortly.`,
      })
    } else {
      toast.success('Film submitted for review', {
        description: 'Thanks — a moderator will watch it shortly.',
      })
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
      <div className="flex flex-col gap-1">
        <h1 className="font-serif text-3xl font-bold tracking-tight">Your dashboard</h1>
        <p className="text-muted-foreground">
          Track what you have watched, saved, requested, and submitted.
        </p>
      </div>

      <Tabs defaultValue="history" className="mt-8 gap-6">
        <TabsList className="flex-wrap">
          <TabsTrigger value="history">
            <Clock data-icon="inline-start" />
            Watch History
          </TabsTrigger>
          <TabsTrigger value="favorites">
            <Heart data-icon="inline-start" />
            Favorites
          </TabsTrigger>
          <TabsTrigger value="requests">
            <Inbox data-icon="inline-start" />
            Film Requests
          </TabsTrigger>
          <TabsTrigger value="submissions">
            <Upload data-icon="inline-start" />
            Submissions
          </TabsTrigger>
        </TabsList>

        {/* Watch History */}
        <TabsContent value="history">
          {!historyReady ? null : historyEntries.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Clock />
                </EmptyMedia>
                <EmptyTitle>Nothing watched yet</EmptyTitle>
                <EmptyDescription>
                  Films you play will appear here so you can pick up where you left off.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  {(['all', 'watched', 'in-progress'] as const).map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setHistoryFilter(filter)}
                      className={cn(
                        'rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors',
                        historyFilter === filter
                          ? 'border-primary/40 bg-primary/10 text-primary'
                          : 'border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground',
                      )}
                    >
                      {filter === 'all'
                        ? 'All'
                        : filter === 'watched'
                          ? 'Watched'
                          : 'In progress'}
                    </button>
                  ))}
                </div>
                {historyEntries.length > 0 ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearHistory}
                    className="rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 data-icon="inline-start" />
                    Clear history
                  </Button>
                ) : null}
              </div>

              {visibleHistory.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  {historyFilter === 'watched'
                    ? 'No completed films yet — keep watching.'
                    : 'Nothing in progress right now.'}
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {visibleHistory.map((entry) => {
                    const movie = getMovieById(entry.movieId)
                    if (!movie) return null
                    const pct = progressPercent(entry)
                    const done = isComplete(entry)
                    return (
                      <Card key={entry.id}>
                    <CardContent className="flex items-center gap-4">
                      <Link
                        href={
                          done
                            ? `/movie/${movie.id}`
                            : `/movie/${movie.id}?t=${entry.progressSeconds}`
                        }
                        className="relative aspect-2/3 w-14 shrink-0 overflow-hidden rounded-md"
                      >
                        <Image
                          src={movie.posterUrl || '/placeholder.svg'}
                          alt={`${movie.title} poster`}
                          fill
                          sizes="56px"
                          className="object-cover"
                        />
                      </Link>
                      <div className="flex min-w-0 flex-1 flex-col gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={
                              done
                                ? `/movie/${movie.id}`
                                : `/movie/${movie.id}?t=${entry.progressSeconds}`
                            }
                            className="truncate font-medium hover:text-primary"
                          >
                            {movie.title}
                          </Link>
                          {done ? (
                            <Badge
                              variant="outline"
                              className="gap-1 text-[0.625rem] text-foreground/70"
                            >
                              <Check className="size-2.5 text-verified" />
                              Done
                            </Badge>
                          ) : null}
                          <span className="ml-auto text-xs text-muted-foreground">
                            {formatDate(entry.updatedAt)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div
                            className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
                            role="progressbar"
                            aria-valuenow={pct}
                            aria-valuemin={0}
                            aria-valuemax={100}
                          >
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="w-24 shrink-0 text-right text-xs text-muted-foreground">
                            {pct === 100 ? 'Completed' : `${pct}% watched`}
                          </span>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col gap-2">
                        {!done ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markComplete(entry.movieId)}
                          >
                            <Check data-icon="inline-start" />
                            Finished
                          </Button>
                        ) : null}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeHistory(entry.movieId)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 data-icon="inline-start" />
                          Remove
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* Favorites */}
        <TabsContent value="favorites">
          {favorites.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Heart />
                </EmptyMedia>
                <EmptyTitle>No favorites saved</EmptyTitle>
                <EmptyDescription>
                  Tap the heart on any film to keep it here for later.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {favorites.map((movie) => (
                <MovieCard key={movie.id} movie={movie} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Film Requests */}
        <TabsContent value="requests">
          <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
            <Card className="h-fit">
              <CardHeader>
                <CardTitle>Request a film</CardTitle>
                <CardDescription>
                  Can&apos;t find something? Tell our curators what to hunt down.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleRequest}>
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="requestedTitle">Film title</FieldLabel>
                      <Input
                        id="requestedTitle"
                        name="requestedTitle"
                        placeholder="e.g. Living in Bondage (1992)"
                        required
                      />
                    </Field>
                    <Field>
                      <Button type="submit">
                        <Send data-icon="inline-start" />
                        Submit request
                      </Button>
                    </Field>
                  </FieldGroup>
                </form>
              </CardContent>
            </Card>

            <div className="flex flex-col gap-3">
              <h2 className="text-sm font-medium text-muted-foreground">Your requests</h2>
              {requests.length === 0 ? (
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <Inbox />
                    </EmptyMedia>
                    <EmptyTitle>No requests yet</EmptyTitle>
                    <EmptyDescription>Requested titles will show up here.</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                requests.map((req) => (
                  <Card key={req.id}>
                    <CardContent className="flex items-center justify-between gap-4">
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate font-medium">{req.requestedTitle}</span>
                        <span className="text-xs text-muted-foreground">
                          Requested {formatDate(req.requestedAt)}
                        </span>
                      </div>
                      <Badge variant={statusVariant[req.status]} className="capitalize">
                        {req.status === 'found' ? 'Found' : req.status}
                      </Badge>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </TabsContent>

        {/* Submissions */}
        <TabsContent value="submissions">
          <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
            <Card className="h-fit">
              <CardHeader>
                <CardTitle>Submit your film</CardTitle>
                <CardDescription>
                  Filmmakers: share a YouTube link and our moderators will review it.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmission}>
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="title">Film title</FieldLabel>
                      <Input
                        id="title"
                        name="title"
                        placeholder="Your film's title"
                        value={subTitle}
                        onChange={(e) => setSubTitle(e.target.value)}
                        required
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="youtubeUrl">YouTube URL</FieldLabel>
                      <Input
                        id="youtubeUrl"
                        name="youtubeUrl"
                        type="url"
                        placeholder="https://www.youtube.com/watch?v=..."
                        value={submitUrl}
                        onChange={(e) => setSubmitUrl(e.target.value)}
                        required
                      />
                    </Field>

                    {resolving ? (
                      <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground">
                        <Loader2 className="size-4 animate-spin" />
                        Fetching film details from YouTube…
                      </div>
                    ) : meta ? (
                      <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/40 p-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={meta.thumbnailUrl}
                          alt=""
                          className="aspect-video w-24 shrink-0 rounded-md object-cover"
                        />
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <span className="flex items-center gap-1.5 text-sm font-medium">
                            <Check className="size-3.5 text-primary" />
                            Auto-filled from YouTube
                          </span>
                          <span className="truncate text-xs text-muted-foreground">{meta.title}</span>
                          <span className="truncate text-xs text-muted-foreground">
                            {meta.authorName}
                            {meta.embeddable
                              ? ' · can be embedded on SabiFlix'
                              : ' · cannot be embedded on SabiFlix'}
                          </span>
                          {!meta.embeddable ? (
                            <span className="text-xs text-destructive">
                              We won&apos;t be able to play this film — pick a different upload.
                            </span>
                          ) : null}
                        </div>
                      </div>
                    ) : error ? (
                      <p className="text-xs text-destructive" role="alert">
                        {error}
                      </p>
                    ) : null}

                    <Field>
                      <FieldLabel htmlFor="description">Description</FieldLabel>
                      <Textarea
                        id="description"
                        name="description"
                        placeholder="Language, runtime, and a short synopsis."
                        rows={3}
                        value={subDescription}
                        onChange={(e) => setSubDescription(e.target.value)}
                      />
                    </Field>
                    <Field>
                      <Button type="submit">
                        <Upload data-icon="inline-start" />
                        Submit for review
                      </Button>
                    </Field>
                  </FieldGroup>
                </form>
              </CardContent>
            </Card>

            <div className="flex flex-col gap-3">
              <h2 className="text-sm font-medium text-muted-foreground">Your submissions</h2>
              {submissions.length === 0 ? (
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <Film />
                    </EmptyMedia>
                    <EmptyTitle>No submissions yet</EmptyTitle>
                    <EmptyDescription>
                      Films you submit for review will appear here with their status.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                submissions.map((sub) => (
                  <Card key={sub.id}>
                    <CardContent className="flex flex-col gap-2">
                      <div className="flex items-start justify-between gap-4">
                        <span className="font-medium">{sub.title}</span>
                        <Badge variant={statusVariant[sub.status]} className="capitalize">
                          {sub.status}
                        </Badge>
                      </div>
                      <span className="truncate text-xs text-muted-foreground">
                        {sub.youtubeUrl}
                      </span>
                      {sub.adminNotes ? (
                        <>
                          <Separator />
                          <p className="text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">Moderator note: </span>
                            {sub.adminNotes}
                          </p>
                        </>
                      ) : null}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
