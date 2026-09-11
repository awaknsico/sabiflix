'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, Inbox, X } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TablePagination } from '@/components/ui/pagination'
import { Card, CardContent } from '@/components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

/** Shape returned by GET /api/requests (admin sees every request). */
interface AdminRequest {
  id: string
  requestedTitle: string
  description: string | null
  status: 'open' | 'found' | 'closed'
  userDisplayName: string | null
  fulfilledByMovieId: string | null
  requestedAt: string
}

interface MovieOption {
  id: string
  title: string
  year: number | null
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const statusVariant: Record<AdminRequest['status'], 'default' | 'secondary' | 'outline'> = {
  open: 'secondary',
  found: 'default',
  closed: 'outline',
}

/** Server-paginated queue window. */
const PER_PAGE = 20

export default function AdminRequestsPage() {
  const [reqs, setReqs] = useState<AdminRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [movieOptions, setMovieOptions] = useState<MovieOption[]>([])
  const [pickingId, setPickingId] = useState<string | null>(null)
  const [movieChoice, setMovieChoice] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  /** Close-request dialog: which request is being closed + the optional reason. */
  const [closingId, setClosingId] = useState<string | null>(null)
  const [closeNote, setCloseNote] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/requests?page=${page}&perPage=${PER_PAGE}`)
      const data = await res.json()
      setReqs(Array.isArray(data?.data?.requests) ? data.data.requests : [])
      setTotal(Number(data?.meta?.total ?? 0))
    } catch {
      toast.error('Could not load requests', {
        description: 'Please refresh the page to try again.',
      })
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    load()
  }, [load])

  // Catalog options for the "link to a movie" picker (public endpoint).
  useEffect(() => {
    fetch('/api/movies?perPage=100&sort=title')
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d?.data?.movies)) setMovieOptions(d.data.movies)
      })
      .catch(() => {})
  }, [])

  /** Optimistically update one request, then persist via the admin PATCH. */
  function patchRequest(
    id: string,
    patch: { status: 'found' | 'closed'; fulfilledByMovieId?: string; resolutionNote?: string },
    successMessage: string,
  ) {
    const linked = movieOptions.find((m) => m.id === patch.fulfilledByMovieId)
    setReqs((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
    toast.success(successMessage, {
      description: patch.status === 'found' && linked ? `Linked to "${linked.title}" in the catalog.` : undefined,
    })
    setSavingId(id)
    fetch(`/api/requests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('save failed')
      })
      .catch(() =>
        toast.error('Could not save that change', { description: 'Reloading the latest state.' }),
      )
      .finally(() => {
        setSavingId(null)
        setPickingId(null)
        setMovieChoice('')
      })
  }

  function markFound(id: string) {
    if (!movieChoice) return
    patchRequest(id, { status: 'found', fulfilledByMovieId: movieChoice }, 'Request marked as found')
  }

  /** Opening the close dialog; the note travels to the review logs. */
  function closeRequest(id: string) {
    setClosingId(id)
    setCloseNote('')
  }

  /** Confirm the close with an optional reason (stored for the review logs). */
  function confirmCloseRequest() {
    if (!closingId) return
    const note = closeNote.trim()
    patchRequest(
      closingId,
      { status: 'closed', resolutionNote: note || undefined },
      'Request closed',
    )
    setClosingId(null)
    setCloseNote('')
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
      <div className="flex flex-col gap-1">
        <h1 className="font-serif text-3xl font-bold tracking-tight">Requests</h1>
        <p className="text-muted-foreground">
          Community film requests - when you source a title, mark it found and link it to the
          catalog entry.
        </p>
      </div>

      <div className="mt-8">
        {loading ? (
          <p className="text-sm text-muted-foreground" aria-live="polite">
            Loading requests...
          </p>
        ) : reqs.length === 0 ? (
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
                        {req.userDisplayName ?? 'Unknown viewer'} * Requested{' '}
                        {formatDate(req.requestedAt)}
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
                          <SelectValue placeholder="Link to a movie..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {movieOptions.map((m) => (
                              <SelectItem key={m.id} value={m.id}>
                                {m.title} ({m.year ?? '-'})
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          disabled={pickingId !== req.id || !movieChoice || savingId === req.id}
                          onClick={() => markFound(req.id)}
                        >
                          <Check data-icon="inline-start" />
                          Mark as Found
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={savingId === req.id}
                          onClick={() => closeRequest(req.id)}
                        >
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
        <TablePagination
          className="mt-6"
          page={page}
          perPage={PER_PAGE}
          total={total}
          onPageChange={setPage}
          itemName="requests"
        />
      </div>

      {/* Close-request dialog - the optional reason is recorded for the review logs. */}
      <Dialog
        open={closingId !== null}
        onOpenChange={(open) => {
          if (!open) setClosingId(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Close request</DialogTitle>
            <DialogDescription>
              Mark this request as not found and close it. The reason is optional but is recorded in
              the review logs for anyone auditing it later.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="close-reason">Reason (optional)</FieldLabel>
              <Textarea
                id="close-reason"
                rows={3}
                placeholder="e.g. No available master with English subtitles."
                value={closeNote}
                onChange={(e) => setCloseNote(e.target.value)}
              />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClosingId(null)}>
              Cancel
            </Button>
            <Button
              className="text-destructive hover:text-destructive"
              onClick={confirmCloseRequest}
            >
              <X data-icon="inline-start" />
              Close request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
