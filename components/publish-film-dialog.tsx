'use client'

import { useEffect, useState } from 'react'
import { Loader2, Rocket, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ThumbnailPicker } from '@/components/thumbnail-picker'
import { CATEGORIES, COUNTRIES, LANGUAGES } from '@/lib/types'
import type { Movie, MovieCategory, MovieSource } from '@/lib/types'

export interface PublishedResult {
  movie: Movie
  source: MovieSource
}

/** Common quality labels the source store understands. */
const SOURCE_QUALITIES = ['2160p', '1440p', '1080p', '720p', '480p', '360p', '240p', 'Unknown']

/** Build the resolver URL for /api/youtube/meta from a bare video id. */
function metaUrl(videoId: string): string {
  return `/api/youtube/meta?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}`
}

/**
 * "Review & publish" dialog. Everything the film needs is prefilled from the
 * auto-resolved YouTube metadata — the curator just confirms the details and
 * picks the poster frame. Publishing writes through to the server catalog so
 * the film immediately gets a real `/movie/<id>` page.
 */
export function PublishFilmDialog({
  open,
  onOpenChange,
  initialTitle,
  initialDescription,
  videoId,
  initialPoster,
  onPublished,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialTitle: string
  initialDescription: string
  videoId: string
  initialPoster: string
  onPublished: (result: PublishedResult) => void
}) {
  const [submitting, setSubmitting] = useState(false)
  const [title, setTitle] = useState(initialTitle)
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [category, setCategory] = useState<MovieCategory>('feature')
  const [country, setCountry] = useState(COUNTRIES[0] as string)
  const [language, setLanguage] = useState(LANGUAGES[0] as string)
  const [synopsis, setSynopsis] = useState(initialDescription)
  const [posterUrl, setPosterUrl] = useState(initialPoster)
  const [actors, setActors] = useState('')
  const [curationType, setCurationType] = useState<Movie['curationType']>('filmmaker')
  const [quality, setQuality] = useState('1080p')
  const [channelName, setChannelName] = useState('')
  const [fetchingMeta, setFetchingMeta] = useState(false)

  /**
   * Resolve the video's metadata (full description + channel) and fill the
   * synopsis. `replace` is true for the manual "Pull from YouTube" button —
   * the curator clicked it, so overwriting their draft is expected. The
   * automatic fetch only fills an empty synopsis and never clobbers a draft.
   */
  async function pullDescription(replace = false) {
    if (!videoId) return
    setFetchingMeta(true)
    try {
      const res = await fetch(metaUrl(videoId))
      const payload = (await res.json().catch(() => null)) as {
        ok?: boolean
        data?: { description?: string; authorName?: string }
      } | null
      if (!payload?.ok || !payload.data) return
      if (typeof payload.data.authorName === 'string' && payload.data.authorName.trim()) {
        setChannelName(payload.data.authorName.trim())
      }
      const fetched =
        typeof payload.data.description === 'string'
          ? payload.data.description.trim().slice(0, 5000)
          : ''
      if (fetched) {
        setSynopsis((prev) => (replace || !prev.trim() ? fetched : prev))
      }
    } catch {
      // Best-effort — the curator can hit "Pull from YouTube" to retry.
    } finally {
      setFetchingMeta(false)
    }
  }

  /* Auto-fill on open: pull the description + channel so the curator sees
     real metadata with zero extra clicks (skips the draft if one exists). */
  useEffect(() => {
    if (!open || !videoId) return
    let cancelled = false
    setFetchingMeta(true)
    fetch(metaUrl(videoId))
      .then((res) => res.json().catch(() => null))
      .then((payload: { ok?: boolean; data?: { description?: string; authorName?: string } } | null) => {
        if (cancelled || !payload?.ok || !payload.data) return
        if (typeof payload.data.authorName === 'string' && payload.data.authorName.trim()) {
          setChannelName(payload.data.authorName.trim())
        }
        const fetched =
          typeof payload.data.description === 'string'
            ? payload.data.description.trim().slice(0, 5000)
            : ''
        if (fetched) {
          setSynopsis((prev) => (prev.trim() ? prev : fetched))
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setFetchingMeta(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, videoId])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!title.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          movie: {
            title: title.trim(),
            year: Number(year) || new Date().getFullYear(),
            country,
            language,
            category,
            synopsis: synopsis.trim(),
            posterUrl: posterUrl.trim() || '/placeholder.svg',
            curationType: curationType || undefined,
            actors: actors.split(',').map((a) => a.trim()).filter(Boolean),
          },
          source: {
            youtubeVideoId: videoId,
            youtubeChannelName: channelName.trim() || undefined,
            quality: quality || '1080p',
            previewStartSeconds: 60,
          },
        }),
      })
      const payload = (await res.json().catch(() => null)) as {
        ok?: boolean
        error?: string
        data?: { entry?: PublishedResult }
      } | null
      // The API wraps every payload in the standard { ok, data } envelope —
      // the entry lives at payload.data.entry. Reading it at the top level is
      // what made publishing appear to fail while the film was really saved.
      if (!payload?.ok || !payload.data?.entry) {
        throw new Error(payload?.error ?? 'Publish failed.')
      }
      const entry = payload.data.entry
      toast.success('Published to the catalog', {
        description: `“${entry.movie.title}” now has its own film page.`,
      })
      onOpenChange(false)
      onPublished(entry)
    } catch (err) {
      toast.error('Could not publish the film', {
        description: err instanceof Error ? err.message : 'Unexpected error.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Review &amp; publish</DialogTitle>
          <DialogDescription>
            Everything was auto-filled from the video. Confirm the details, pick the poster
            frame, and the film goes live immediately.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="publish-title">Title</FieldLabel>
              <Input id="publish-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </Field>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Field>
                <FieldLabel htmlFor="publish-year">Year</FieldLabel>
                <Input
                  id="publish-year"
                  type="number"
                  min={1900}
                  max={2100}
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  required
                />
              </Field>
              <Field>
                <FieldLabel>Category</FieldLabel>
                <Select value={category} onValueChange={(v) => setCategory(v as MovieCategory)}>
                  <SelectTrigger aria-label="Category">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel>Country</FieldLabel>
                <Select value={country} onValueChange={(v) => setCountry(v as string)}>
                  <SelectTrigger aria-label="Country">
                    <SelectValue placeholder="Country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Field>
              <FieldLabel>Language</FieldLabel>
              <Select value={language} onValueChange={(v) => setLanguage(v as string)}>
                <SelectTrigger aria-label="Language">
                  <SelectValue placeholder="Language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {LANGUAGES.map((l) => (
                      <SelectItem key={l} value={l}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="publish-actors">Lead Actors</FieldLabel>
              <Input
                id="publish-actors"
                value={actors}
                onChange={(e) => setActors(e.target.value)}
                placeholder="e.g. Gideon Okeke, Rita Dominic"
              />
              <p className="pt-1 text-xs text-muted-foreground">
                Comma-separated list of lead actors.
              </p>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel>Curation badge</FieldLabel>
                <Select
                  value={curationType ?? ''}
                  onValueChange={(v) => setCurationType((v || undefined) as Movie['curationType'])}
                >
                  <SelectTrigger aria-label="Curation badge">
                    <SelectValue placeholder="No badge" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="admin">Admin Curated (gold)</SelectItem>
                      <SelectItem value="requested">Community Requested (cyan)</SelectItem>
                      <SelectItem value="filmmaker">Filmmaker Submitted (green)</SelectItem>
                      <SelectItem value="">No badge</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel>Video quality</FieldLabel>
                <Select value={quality} onValueChange={(v) => setQuality(v ?? '1080p')}>
                  <SelectTrigger aria-label="Video quality">
                    <SelectValue placeholder="Quality" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {SOURCE_QUALITIES.map((q) => (
                        <SelectItem key={q} value={q}>
                          {q}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Field>
              <div className="flex items-center justify-between gap-2">
                <FieldLabel htmlFor="publish-synopsis">Synopsis</FieldLabel>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 text-xs text-muted-foreground"
                  onClick={() => pullDescription(true)}
                  disabled={fetchingMeta || !videoId}
                >
                  {fetchingMeta ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="size-3.5" />
                  )}
                  {fetchingMeta ? 'Fetching…' : 'Pull from YouTube'}
                </Button>
              </div>
              <Textarea
                id="publish-synopsis"
                rows={3}
                value={synopsis}
                onChange={(e) => setSynopsis(e.target.value)}
                placeholder="A short synopsis of the film."
              />
            </Field>

            <Field>
              <div className="flex items-center gap-2">
                <FieldLabel>Poster (choose a frame)</FieldLabel>
                <Badge variant="secondary">auto-fetched</Badge>
              </div>
              <ThumbnailPicker videoId={videoId} value={posterUrl} onChange={setPosterUrl} />
            </Field>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!title.trim() || submitting}>
                <Rocket data-icon="inline-start" />
                {submitting ? 'Publishing…' : 'Publish to catalog'}
              </Button>
            </DialogFooter>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  )
}