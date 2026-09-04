'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ThumbnailPicker } from '@/components/thumbnail-picker'
import { useYouTubeMeta } from '@/lib/use-youtube-meta'
import { parseYouTubeId } from '@/lib/youtube'
import {
  CATEGORIES,
  COUNTRIES,
  LANGUAGES,
  type Movie,
  type MovieCategory,
} from '@/lib/mock-data'

function emptyForm() {
  return {
    title: '',
    actors: '',
    year: String(new Date().getFullYear()),
    country: COUNTRIES[0] as string,
    language: LANGUAGES[0] as string,
    category: 'feature' as MovieCategory,
    curationType: '' as string,
    synopsis: '',
    posterUrl: '',
    youtubeUrl: '',
  }
}

const isPublished = (m: Movie) => m.id.startsWith('mov-pub-')

export default function AdminMoviesPage() {
  const [list, setList] = useState<Movie[]>([])
  const [sourcesById, setSourcesById] = useState<Record<string, { videoId: string; channel: string }>>({})
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const { resolving, meta, error } = useYouTubeMeta(form.youtubeUrl)

  const refreshCatalog = useCallback(async () => {
    try {
      const res = await fetch('/api/movies?perPage=100&sort=title&sortDir=asc')
      const data = await res.json()
      if (!res.ok || !Array.isArray(data?.data?.movies)) throw new Error('Catalog unavailable')
      const movies = data.data.movies as Array<Movie & { youtubeVideoId?: string | null }>
      setList(movies.map(({ youtubeVideoId: _youtubeVideoId, ...movie }) => movie))
      setSourcesById(
        Object.fromEntries(
          movies
            .filter((movie) => movie.youtubeVideoId)
            .map((movie) => [movie.id, { videoId: movie.youtubeVideoId!, channel: '' }]),
        ),
      )
    } catch {
      setList([])
      setSourcesById({})
    }
  }, [])

  useEffect(() => {
    refreshCatalog()
  }, [refreshCatalog])

  /* When the URL resolves, prefill title + poster without clobbering
     anything the curator typed or picked manually. */
  useEffect(() => {
    if (!meta) return
    setForm((f) => ({
      ...f,
      title: f.title.trim() ? f.title : meta.title,
      posterUrl: f.posterUrl ? f.posterUrl : meta.thumbnailUrl,
    }))
  }, [meta])

  function openAdd() {
    setEditingId(null)
    setForm(emptyForm())
    setDialogOpen(true)
  }

  function openEdit(movie: Movie) {
    setEditingId(movie.id)
    const src = sourcesById[movie.id]
    setForm({
      title: movie.title,
      actors: (movie.actors ?? []).join(', '),
      year: String(movie.year),
      country: movie.country,
      language: movie.language,
      category: movie.category,
      curationType: movie.curationType ?? '',
      synopsis: movie.synopsis,
      posterUrl: movie.posterUrl,
      youtubeUrl: src?.videoId ? `https://www.youtube.com/watch?v=${src.videoId}` : '',
    })
    setDialogOpen(true)
  }

  function handleDelete(movie: Movie) {
    void (async () => {
      try {
        const endpoint = isPublished(movie) ? `/api/catalog?id=${encodeURIComponent(movie.id)}` : `/api/movies/${movie.id}`
        const res = await fetch(endpoint, { method: 'DELETE' })
        const data = await res.json().catch(() => null)
        if (!res.ok || data?.ok === false) throw new Error(data?.error ?? 'Delete failed')
        setList((prev) => prev.filter((m) => m.id !== movie.id))
        toast.success('Movie deleted', { description: `“${movie.title}” was removed from the catalog.` })
      } catch (err) {
        toast.error('Delete failed', { description: err instanceof Error ? err.message : 'Please try again.' })
      }
    })()
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    try {
      const existing = editingId ? list.find((m) => m.id === editingId) : undefined
      const videoId = parseYouTubeId(form.youtubeUrl)
      const payload = {
        title: form.title.trim(),
        actors: form.actors
          .split(',')
          .map((a) => a.trim())
          .filter(Boolean),
        year: Number(form.year) || new Date().getFullYear(),
        country: form.country,
        language: form.language,
        category: form.category,
        curationType: (form.curationType || undefined) as Movie['curationType'],
        synopsis: form.synopsis.trim(),
        posterUrl: form.posterUrl.trim() || meta?.thumbnailUrl || undefined,
        youtubeVideoId: videoId ?? (editingId ? sourcesById[editingId]?.videoId : undefined),
        youtubeChannelName: meta?.authorName ?? (editingId ? sourcesById[editingId]?.channel : undefined),
        previewStartSeconds: 60,
      }
      const res = await fetch(editingId ? `/api/movies/${editingId}` : '/api/movies', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.ok) throw new Error(data?.error ?? 'Save failed')
      await refreshCatalog()
      toast.success(editingId ? 'Movie updated' : 'Movie added', {
        description: `“${form.title.trim()}” is now in the catalog.`,
      })
      setDialogOpen(false)
    } catch {
      toast.error('Save failed', {
        description: 'The catalog store could not be updated. Please try again.',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-serif text-3xl font-bold tracking-tight">Movies</h1>
          <p className="text-muted-foreground">
            Manage the catalog — {list.length} title{list.length === 1 ? '' : 's'} in total.
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus data-icon="inline-start" />
          Add New Movie
        </Button>
      </div>

      <div className="mt-8">
        {list.length === 0 ? (
          <Empty className="border py-16">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Plus />
              </EmptyMedia>
              <EmptyTitle>No movies yet</EmptyTitle>
              <EmptyDescription>Add your first film to start building the catalog.</EmptyDescription>
            </EmptyHeader>
            <Button variant="outline" size="sm" onClick={openAdd}>
              <Plus data-icon="inline-start" />
              Add New Movie
            </Button>
          </Empty>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border/60">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((movie) => (
                  <TableRow key={movie.id}>
                    <TableCell>
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate font-medium">{movie.title}</span>
                        <span className="truncate text-xs text-muted-foreground">
                          {movie.country} · {movie.language} · {movie.category}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{movie.year}</TableCell>
                    <TableCell>
                      <Badge variant={movie.isActive ? 'default' : 'outline'}>
                        {movie.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Edit ${movie.title}`}
                          onClick={() => openEdit(movie)}
                        >
                          <Pencil />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-destructive hover:text-destructive"
                          aria-label={`Delete ${movie.title}`}
                          onClick={() => handleDelete(movie)}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit movie' : 'Add new movie'}</DialogTitle>
            <DialogDescription>
              {editingId
                ? 'Update the catalog details for this film.'
                : 'Add a new film to the SabiFlix catalog.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="movie-title">Title</FieldLabel>
                <Input
                  id="movie-title"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Living in Bondage"
                  required
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel htmlFor="movie-year">Year</FieldLabel>
                  <Input
                    id="movie-year"
                    type="number"
                    min={1900}
                    max={2100}
                    value={form.year}
                    onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))}
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel>Category</FieldLabel>
                  <Select
                    value={form.category}
                    onValueChange={(v) => setForm((f) => ({ ...f, category: v as MovieCategory }))}
                  >
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
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel>Country</FieldLabel>
                  <Select
                    value={form.country}
                    onValueChange={(v) => setForm((f) => ({ ...f, country: v as string }))}
                  >
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
                <Field>
                  <FieldLabel>Language</FieldLabel>
                  <Select
                    value={form.language}
                    onValueChange={(v) => setForm((f) => ({ ...f, language: v as string }))}
                  >
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
              </div>

              <Field>
                <FieldLabel htmlFor="movie-actors">Lead Actors</FieldLabel>
                <Input
                  id="movie-actors"
                  value={form.actors}
                  onChange={(e) => setForm((f) => ({ ...f, actors: e.target.value }))}
                  placeholder="e.g. Gideon Okeke, Rita Dominic"
                />
                <p className="pt-1 text-xs text-muted-foreground">
                  Comma-separated list of lead actors.
                </p>
              </Field>

              <Field>
                <FieldLabel>Curation Badge</FieldLabel>
                <Select
                  value={form.curationType}
                  onValueChange={(v) => setForm((f) => ({ ...f, curationType: v ?? '' }))}
                >
                  <SelectTrigger aria-label="Curation badge">
                    <SelectValue placeholder="No badge" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="">No badge</SelectItem>
                      <SelectItem value="admin">Admin Curated (gold)</SelectItem>
                      <SelectItem value="requested">Community Requested (cyan)</SelectItem>
                      <SelectItem value="filmmaker">Filmmaker Submitted (green)</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel htmlFor="movie-youtube">YouTube URL (auto-fetch)</FieldLabel>
                <Input
                  id="movie-youtube"
                  type="url"
                  value={form.youtubeUrl}
                  onChange={(e) => setForm((f) => ({ ...f, youtubeUrl: e.target.value }))}
                  placeholder="https://www.youtube.com/watch?v=..."
                  required={!editingId}
                />
              </Field>

              {resolving ? (
                <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Fetching film details from YouTube…
                </div>
              ) : meta ? (
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                    <Check className="size-3.5 text-primary" />
                    <span className="truncate font-medium text-foreground">{meta.title}</span>
                    <span>· {meta.authorName}</span>
                    {!meta.embeddable ? (
                      <span className="text-destructive">· cannot be embedded</span>
                    ) : null}
                  </div>
                  <ThumbnailPicker
                    videoId={meta.videoId}
                    value={form.posterUrl}
                    onChange={(url) => setForm((f) => ({ ...f, posterUrl: url }))}
                  />
                </div>
              ) : error ? (
                <p className="text-xs text-destructive" role="alert">
                  {error}
                </p>
              ) : null}

              <Field>
                <FieldLabel htmlFor="movie-poster">Poster URL</FieldLabel>
                <div className="flex items-center gap-3">
                  <Input
                    id="movie-poster"
                    className="flex-1"
                    value={form.posterUrl}
                    onChange={(e) => setForm((f) => ({ ...f, posterUrl: e.target.value }))}
                    placeholder="/posters/your-poster.png"
                  />
                  {form.posterUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={form.posterUrl}
                      alt=""
                      className="aspect-video h-9 w-16 shrink-0 rounded-md border border-border/60 object-cover"
                    />
                  ) : null}
                </div>
                <p className="pt-1 text-xs text-muted-foreground">
                  Paste a YouTube URL above to auto-fetch poster frames, or set a custom poster URL.
                </p>
              </Field>

              <Field>
                <FieldLabel htmlFor="movie-synopsis">Synopsis</FieldLabel>
                <Textarea
                  id="movie-synopsis"
                  rows={3}
                  value={form.synopsis}
                  onChange={(e) => setForm((f) => ({ ...f, synopsis: e.target.value }))}
                  placeholder="A short synopsis of the film."
                />
              </Field>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add movie'}
                </Button>
              </DialogFooter>
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
