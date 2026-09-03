'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Check, ExternalLink, ListPlus, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Textarea } from '@/components/ui/textarea'
import { PublishFilmDialog } from '@/components/publish-film-dialog'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { filmSubmissions as seedSubmissions, type FilmSubmission } from '@/lib/mock-data'
import { buildThumbnailUrl } from '@/lib/youtube'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const statusVariant: Record<
  FilmSubmission['status'],
  'default' | 'secondary' | 'outline'
> = {
  pending: 'secondary',
  approved: 'default',
  rejected: 'outline',
}

export default function AdminSubmissionsPage() {
  const [subs, setSubs] = useState<FilmSubmission[]>(seedSubmissions)
  const [publishTarget, setPublishTarget] = useState<FilmSubmission | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [importText, setImportText] = useState('')
  const [importing, setImporting] = useState(false)

  function review(id: string, status: 'approved' | 'rejected') {
    setSubs((prev) =>
      prev.map((sub) =>
        sub.id === id
          ? {
              ...sub,
              status,
              adminNotes:
                status === 'approved'
                  ? 'Meets curation guidelines — scheduled for the catalog.'
                  : 'Needs a cleaner master before we can feature it.',
            }
          : sub,
      ),
    )
    toast.success(status === 'approved' ? 'Submission approved' : 'Submission rejected', {
      description: 'The filmmaker will see this status on their dashboard.',
    })
  }

  function handlePublished(sub: FilmSubmission, movieId: string) {
    setSubs((prev) =>
      prev.map((s) =>
        s.id === sub.id
          ? {
              ...s,
              status: 'approved',
              publishedMovieId: movieId,
              adminNotes: 'Published to the catalog with auto-fetched art.',
            }
          : s,
      ),
    )
  }

  async function importUrls() {
    const urls = importText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
    if (urls.length === 0) return
    setImporting(true)
    try {
      const res = await fetch('/api/youtube/meta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls }),
      })
      const data = await res.json()
      const rows: Array<Record<string, unknown>> = Array.isArray(data.results)
        ? data.results
        : []
      const now = new Date().toISOString()
      const added: FilmSubmission[] = rows
        .filter((r) => r.ok && typeof r.videoId === 'string')
        .map((r) => ({
          id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          userDisplayName: 'Community import',
          title: String(r.title ?? 'Untitled film'),
          youtubeUrl: String(r.sourceUrl ?? ''),
          youtubeVideoId: String(r.videoId),
          description: '',
          thumbnailUrl: String(r.thumbnailUrl ?? ''),
          status: 'pending' as const,
          adminNotes: null,
          submittedAt: now,
        }))
      const failed = rows.filter((r) => !r.ok).length
      setSubs((prev) => [...added, ...prev])
      setImportOpen(false)
      setImportText('')
      toast.success(
        `Imported ${added.length} ${added.length === 1 ? 'film' : 'films'}`,
        {
          description: failed
            ? `${failed} ${failed === 1 ? 'URL could' : 'URLs could'} not be resolved.`
            : 'All ready for review — metadata was auto-filled.',
        },
      )
    } catch {
      toast.error('Import failed', {
        description: 'Could not resolve those URLs. Please try again.',
      })
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-serif text-3xl font-bold tracking-tight">Submissions</h1>
          <p className="text-muted-foreground">
            Watch community-submitted films and decide what makes it into the catalog.
          </p>
        </div>
        <Button variant="outline" onClick={() => setImportOpen(true)}>
          <ListPlus data-icon="inline-start" />
          Import from URLs
        </Button>
      </div>

      <div className="mt-8">
        {subs.length === 0 ? (
          <Empty className="border py-16">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Upload />
              </EmptyMedia>
              <EmptyTitle>No submissions to review</EmptyTitle>
              <EmptyDescription>
                Filmmaker submissions, or a batch import, will appear here for moderation.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {subs.map((sub) => (
              <Card key={sub.id}>
                <CardContent className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate font-medium">{sub.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {sub.userDisplayName} · {formatDate(sub.submittedAt)}
                      </span>
                    </div>
                    <Badge variant={statusVariant[sub.status]} className="capitalize">
                      {sub.status}
                    </Badge>
                  </div>

                  {sub.youtubeVideoId ? (
                    <div className="overflow-hidden rounded-lg border border-border/60 bg-black">
                      <iframe
                        className="aspect-video size-full"
                        src={`https://www.youtube-nocookie.com/embed/${sub.youtubeVideoId}?rel=0&modestbranding=1`}
                        title={`${sub.title} preview`}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        loading="lazy"
                      />
                    </div>
                  ) : (
                    <div className="flex aspect-video items-center justify-center rounded-lg border border-border/60 bg-muted text-sm text-muted-foreground">
                      Preview unavailable — add a resolvable YouTube URL
                    </div>
                  )}

                  {sub.description ? (
                    <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
                      {sub.description}
                    </p>
                  ) : null}

                  {sub.publishedMovieId ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="self-start"
                      render={<Link href={`/movie/${sub.publishedMovieId}`} />}
                    >
                      <ExternalLink data-icon="inline-start" />
                      Published — view film page
                    </Button>
                  ) : null}

                  {sub.adminNotes ? (
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Moderator note: </span>
                      {sub.adminNotes}
                    </p>
                  ) : null}

                  {sub.status === 'pending' || sub.status === 'approved' ? (
                    <div className="flex flex-wrap gap-2">
                      {sub.youtubeVideoId ? (
                        <Button size="sm" onClick={() => setPublishTarget(sub)}>
                          <Check data-icon="inline-start" />
                          Review &amp; publish
                        </Button>
                      ) : null}
                      {sub.status === 'pending' ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => review(sub.id, 'approved')}
                          >
                            Approve only
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive hover:text-destructive"
                            onClick={() => review(sub.id, 'rejected')}
                          >
                            <X data-icon="inline-start" />
                            Reject
                          </Button>
                        </>
                      ) : null}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Import films from URLs</DialogTitle>
            <DialogDescription>
              Paste one YouTube URL per line. Each video is resolved to its real title, channel,
              and thumbnail, then added as a pending submission for you to review.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="import-urls">YouTube URLs</FieldLabel>
              <Textarea
                id="import-urls"
                rows={6}
                placeholder={'https://www.youtube.com/watch?v=...\nhttps://youtu.be/...'}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
              />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>
              Cancel
            </Button>
            <Button onClick={importUrls} disabled={importing || !importText.trim()}>
              <ListPlus data-icon="inline-start" />
              {importing ? 'Resolving…' : 'Import'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {publishTarget ? (
        <PublishFilmDialog
          open
          onOpenChange={(open) => {
            if (!open) setPublishTarget(null)
          }}
          initialTitle={publishTarget.title}
          initialDescription={publishTarget.description}
          videoId={publishTarget.youtubeVideoId}
          initialPoster={
            publishTarget.thumbnailUrl ??
            buildThumbnailUrl(publishTarget.youtubeVideoId, 'hqdefault')
          }
          onPublished={(entry) => {
            handlePublished(publishTarget, entry.movie.id)
            setPublishTarget(null)
          }}
        />
      ) : null}
    </div>
  )
}