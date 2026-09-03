'use client'

import { useState } from 'react'
import { Check, Link2, MessageCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

/**
 * Quiet share row for the film page. WhatsApp first — it's the primary share
 * surface in SabiFlix's markets — plus a plain copy-link fallback.
 */
export function ShareActions({ title, path }: { title: string; path: string }) {
  const [copied, setCopied] = useState(false)

  function absoluteUrl() {
    return `${window.location.origin}${path}`
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(absoluteUrl())
      setCopied(true)
      toast.success('Link copied', {
        description: `Share ${title} with someone who needs it.`,
      })
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Couldn't copy the link")
    }
  }

  function shareWhatsApp() {
    const text = encodeURIComponent(
      `${title} — streaming free on SabiFlix: ${absoluteUrl()}`,
    )
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener')
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={copyLink}
        className="rounded-full text-muted-foreground hover:bg-white/5 hover:text-foreground"
      >
        {copied ? <Check data-icon="inline-start" /> : <Link2 data-icon="inline-start" />}
        {copied ? 'Copied' : 'Copy link'}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={shareWhatsApp}
        className="rounded-full text-muted-foreground hover:bg-white/5 hover:text-foreground"
      >
        <MessageCircle data-icon="inline-start" />
        WhatsApp
      </Button>
    </div>
  )
}
