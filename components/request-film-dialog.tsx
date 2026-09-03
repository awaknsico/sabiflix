'use client'

import { useState } from 'react'
import { Send } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

/**
 * "Can't find it? Ask our curators" — inline request form for catalog
 * dead-ends, so a no-results search becomes an engagement loop instead of a
 * bounce. Mock-persisted, mirroring the dashboard request form.
 */
export function RequestFilmDialog({ className }: { className?: string }) {
  const [open, setOpen] = useState(false)

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    const title = String(data.get('requestedTitle') || '').trim()
    if (!title) return
    setOpen(false)
    form.reset()
    toast.success('Film request submitted', {
      description: `Our curators are on the hunt for “${title}”.`,
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className={className}>
            Request a film
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request a film</DialogTitle>
          <DialogDescription>
            Can&apos;t find something? Tell our curators what to hunt down.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="request-film-title" className="text-sm font-medium">
              Film title
            </label>
            <Input
              id="request-film-title"
              name="requestedTitle"
              placeholder="e.g. Living in Bondage (1992)"
              required
            />
          </div>
          <Button type="submit">
            <Send data-icon="inline-start" />
            Submit request
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
