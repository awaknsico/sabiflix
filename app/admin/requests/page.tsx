'use client'

import { useState } from 'react'
import { Check, Inbox, X } from 'lucide-react'
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
  filmRequests as seedRequests,
  getMovieById,
  movies,
  type FilmRequest,
} from '@/lib/mock-data'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const statusVariant: Record<FilmRequest['status'], 'default' | 'secondary' | 'outline'> = {
  open: 'secondary',
  found: 'default',
  closed: 'outline',
}

export default function AdminRequestsPage() {
  const [reqs, setReqs] = useState<FilmRequest[]>(seedRequests)
  const [pickingId, setPickingId] = useState<string | null>(null)
  const [movieChoice, setMovieChoice] = useState('')

  function markFound(id: string) {
    const linked = getMovieById(movieChoice)
    setReqs((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'found' } : r)))
    toast.success('Request marked as found', {
      description: linked ? `Linked to “${linked.title}” in the catalog.` : undefined,
    })
    setPickingId(null)
    setMovieChoice('')
  }

  function closeRequest(id: string) {
    setReqs((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'closed' } : r)))
    toast.success('Request closed')
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
      <div className="flex flex-col gap-1">
        <h1 className="font-serif text-3xl font-bold tracking-tight">Requests</h1>
        <p className="text-muted-foreground">
          Community film requests — when you source a title, mark it found and link it to the
          catalog entry.
        </p>
      </div>

      <div className="mt-8">
        {reqs.length === 0 ? (
          <Empty className="border py-16">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Inbox />
              </EmptyMedia>
              <EmptyTitle>No requests yet</EmptyTitle>
              <EmptyDescription>Community film requests will appear here.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="flex flex-col gap-3">
            {reqs.map((req) => (
              <Card key={req.id}>
                <CardContent className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate font-medium">{req.requestedTitle}</span>
                      <span className="text-xs text-muted-foreground">
                        {req.userDisplayName} · Requested {formatDate(req.requestedAt)}
                      </span>
                    </div>
                    <Badge variant={statusVariant[req.status]} className="capitalize">
                      {req.status}
                    </Badge>
                  </div>

                  {req.status === 'open' ? (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <Select
                        value={pickingId === req.id ? movieChoice : ''}
                        onValueChange={(v) => {
                          setPickingId(req.id)
                          setMovieChoice((v as string) ?? '')
                        }}
                      >
                        <SelectTrigger className="w-full sm:w-64" aria-label="Link to a movie">
                          <SelectValue placeholder="Link to a movie…" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {movies.map((m) => (
                              <SelectItem key={m.id} value={m.id}>
                                {m.title} ({m.year})
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          disabled={pickingId !== req.id || !movieChoice}
                          onClick={() => markFound(req.id)}
                        >
                          <Check data-icon="inline-start" />
                          Mark as Found
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => closeRequest(req.id)}>
                          <X data-icon="inline-start" />
                          Close
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
