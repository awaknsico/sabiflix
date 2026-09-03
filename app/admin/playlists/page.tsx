'use client'

import { useEffect, useState } from 'react'
import { GripVertical, ListVideo, Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  getPlaylistMovies,
  getMovieById,
  movies as allMovies,
  playlists,
  type Movie,
} from '@/lib/mock-data'

export default function AdminPlaylistsPage() {
  const [playlistId, setPlaylistId] = useState(playlists[0]?.id ?? '')
  const playlist = playlists.find((p) => p.id === playlistId)
  const [ordered, setOrdered] = useState<Movie[]>([])
  const [dragFrom, setDragFrom] = useState<number | null>(null)
  const [dirty, setDirty] = useState(false)

  // Load the selected playlist's movies (re-selecting resets local edits).
  useEffect(() => {
    const p = playlists.find((pl) => pl.id === playlistId)
    setOrdered(p ? getPlaylistMovies(p) : [])
    setDirty(false)
  }, [playlistId])

  function reorder(from: number, to: number) {
    setOrdered((prev) => {
      if (from === to || from < 0 || from >= prev.length) return prev
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next
    })
    setDirty(true)
  }

  function addMovie(movie: Movie, at?: number) {
    setOrdered((prev) => {
      if (prev.some((m) => m.id === movie.id)) return prev
      const next = [...prev]
      next.splice(at ?? next.length, 0, movie)
      return next
    })
    setDirty(true)
  }

  function removeMovie(id: string) {
    setOrdered((prev) => prev.filter((m) => m.id !== id))
    setDirty(true)
  }

  function handleDragStartRow(e: React.DragEvent, index: number) {
    e.dataTransfer.setData('text/plain', `row:${index}`)
    e.dataTransfer.effectAllowed = 'move'
    setDragFrom(index)
  }

  function handleDragStartPool(e: React.DragEvent, movie: Movie) {
    e.dataTransfer.setData('text/plain', `pool:${movie.id}`)
    e.dataTransfer.effectAllowed = 'copy'
  }

  function handleDropOnRow(e: React.DragEvent, index: number) {
    e.preventDefault()
    e.stopPropagation()
    const data = e.dataTransfer.getData('text/plain')
    if (data.startsWith('row:')) {
      reorder(dragFrom ?? Number(data.slice(4)), index)
    } else if (data.startsWith('pool:')) {
      const movie = getMovieById(data.slice(5))
      if (movie) addMovie(movie, index)
    }
    setDragFrom(null)
  }

  function handleDropOnList(e: React.DragEvent) {
    e.preventDefault()
    const data = e.dataTransfer.getData('text/plain')
    if (data.startsWith('pool:')) {
      const movie = getMovieById(data.slice(5))
      if (movie) addMovie(movie)
    }
    setDragFrom(null)
  }

  function handleSave() {
    if (!playlist) return
    toast.success('Playlist saved', {
      description: `“${playlist.name}” now has ${ordered.length} movie${ordered.length === 1 ? '' : 's'} in this order.`,
    })
    setDirty(false)
  }

  const pool = allMovies.filter(
    (m) => m.isActive && !ordered.some((o) => o.id === m.id),
  )

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-serif text-3xl font-bold tracking-tight">Playlists</h1>
          <p className="text-muted-foreground">
            Build and order playlists. Drag rows to reorder, or drag films in from the pool.
          </p>
        </div>
        {playlist ? (
          <Button onClick={handleSave} disabled={!dirty}>
            Save order
          </Button>
        ) : null}
      </div>

      <div className="mt-6 flex flex-col gap-2">
        <span className="text-sm font-medium text-muted-foreground">Playlist</span>
        <Select value={playlistId} onValueChange={(v) => setPlaylistId((v as string) ?? '')}>
          <SelectTrigger className="w-full sm:w-72" aria-label="Choose playlist">
            <SelectValue placeholder="Choose a playlist" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {playlists.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {!playlist ? (
        <Empty className="mt-8 border py-16">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ListVideo />
            </EmptyMedia>
            <EmptyTitle>No playlists yet</EmptyTitle>
            <EmptyDescription>Create a playlist to start curating collections.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          {/* Ordered playlist rows (drag to reorder) */}
          <Card>
            <CardContent className="flex flex-col gap-1">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h2 className="font-medium">{playlist.name}</h2>
                <Badge variant="secondary">{ordered.length} films</Badge>
              </div>
              {ordered.length === 0 ? (
                <Empty className="border py-10">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <ListVideo />
                    </EmptyMedia>
                    <EmptyTitle>Empty playlist</EmptyTitle>
                    <EmptyDescription>
                      Drag films in from the pool, or use the add buttons.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                ordered.map((movie, index) => (
                  <div
                    key={movie.id}
                    draggable
                    onDragStart={(e) => handleDragStartRow(e, index)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDropOnRow(e, index)}
                    className={`flex cursor-grab items-center gap-2 rounded-lg border border-border/60 bg-background px-2 py-1.5 transition-colors hover:border-primary/50 active:cursor-grabbing ${
                      dragFrom === index ? 'opacity-50' : ''
                    }`}
                  >
                    <GripVertical className="size-4 shrink-0 text-muted-foreground" />
                    <span className="w-5 shrink-0 text-center text-xs text-muted-foreground">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {movie.title}
                    </span>
                    <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
                      {movie.year}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label={`Remove ${movie.title} from playlist`}
                      onClick={() => removeMovie(movie.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Available movies pool (drag into the playlist) */}
          <Card>
            <CardContent className="flex flex-col gap-2">
              <h2 className="font-medium">Available movies</h2>
              <p className="text-xs text-muted-foreground">
                Drag a film onto the playlist, or use its add button.
              </p>
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDropOnList}
                className="grid max-h-[28rem] grid-cols-1 gap-2 overflow-y-auto pr-1"
              >
                {pool.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Every active film is already in this playlist.
                  </p>
                ) : (
                  pool.map((movie) => (
                    <div
                      key={movie.id}
                      draggable
                      onDragStart={(e) => handleDragStartPool(e, movie)}
                      className="flex cursor-grab items-center gap-2 rounded-lg border border-border/60 bg-background px-2 py-1.5 active:cursor-grabbing"
                    >
                      <span className="min-w-0 flex-1 truncate text-sm">{movie.title}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{movie.year}</span>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label={`Add ${movie.title} to playlist`}
                        onClick={() => addMovie(movie)}
                      >
                        <Plus />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
