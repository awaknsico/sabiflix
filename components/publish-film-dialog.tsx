'use client'

import { useState } from 'react'
import { Rocket } from 'lucide-react'
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
import {
  CATEGORIES,
  COUNTRIES,
  LANGUAGES,
  type MovieCategory,
} from '@/lib/mock-data'
import type { Movie, MovieSource } from '@/lib/mock-data'

export interface PublishedResult {
  movie: Movie
  source: MovieSource
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
            posterUrl: posterUrl.trim(),
            curated: true,
          },
          source: {
            youtubeVideoId: videoId,
            youtubeChannelName: '',
            previewStartSeconds: 60,
          },
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok || !data.entry) {
        throw new Error(data.error ?? 'Publish failed.')
      }
      const entry = data.entry as PublishedResult
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
              <FieldLabel htmlFor="publish-synopsis">Synopsis</FieldLabel>
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