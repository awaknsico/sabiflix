'use client'

import { useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { movies } from '@/lib/mock-data'

const KEY = 'sabiflix:last-visit'

/**
 * "New since your last visit" — a quiet editorial pill beside Latest
 * Additions. Compares film createdAt dates against the previous visit stamp
 * in localStorage. First-time visitors see nothing; the stamp updates after
 * the count is computed, so the pill naturally clears on the next visit.
 */
export function NewSinceVisit() {
  const [newCount, setNewCount] = useState(0)

  useEffect(() => {
    const previous = window.localStorage.getItem(KEY)
    if (previous) {
      const since = new Date(previous).getTime()
      const count = movies.filter(
        (m) => m.isActive && +new Date(m.createdAt) > since,
      ).length
      setNewCount(count)
    }
    window.localStorage.setItem(KEY, new Date().toISOString())
  }, [])

  if (newCount === 0) return null

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[0.6875rem] font-semibold uppercase tracking-[0.14em] tabular-nums text-primary">
      <Sparkles className="size-3" />
      {newCount} new since your last visit
    </span>
  )
}
