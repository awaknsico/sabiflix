'use client'

import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Shared pagination controls.
 *
 * `TablePagination` serves the admin queue/table pages: a "Showing X–Y of Z"
 * summary, prev/next arrows, and numbered pages with ellipsis. Page state is
 * held by the caller (server-paginated fetches); the component is purely
 * presentational aside from the summary line's `aria-live` announcement.
 */

const SIBLING_COUNT = 1

/**
 * Compact page list with ellipses, e.g. [1, '…', 4, 5, 6, '…', 20].
 * Returns every page when they all fit.
 */
function getPageRange(
  current: number,
  totalPages: number,
): (number | 'ellipsis-start' | 'ellipsis-end')[] {
  if (totalPages <= 5 + SIBLING_COUNT * 2) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }
  const pages: (number | 'ellipsis-start' | 'ellipsis-end')[] = [1]
  const start = Math.max(2, current - SIBLING_COUNT)
  const end = Math.min(totalPages - 1, current + SIBLING_COUNT)
  if (start > 2) pages.push('ellipsis-start')
  for (let p = start; p <= end; p++) pages.push(p)
  if (end < totalPages - 1) pages.push('ellipsis-end')
  pages.push(totalPages)
  return pages
}

export interface TablePaginationProps {
  /** Current page, 1-based. */
  page: number
  perPage: number
  /** Total item count across all pages (from the API's `meta.total`). */
  total: number
  onPageChange: (page: number) => void
  /** Plural noun for the summary line, e.g. "titles", "requests". */
  itemName?: string
  disabled?: boolean
  className?: string
}

export function TablePagination({
  page,
  perPage,
  total,
  onPageChange,
  itemName = 'items',
  disabled = false,
  className,
}: TablePaginationProps) {
  if (total <= 0) return null

  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const start = (page - 1) * perPage + 1
  const end = Math.min(page * perPage, total)
  const pages = getPageRange(Math.min(page, totalPages), totalPages)

  return (
    <nav
      aria-label="Pagination"
      className={cn('flex flex-wrap items-center justify-between gap-3', className)}
    >
      <p className="text-sm text-muted-foreground" aria-live="polite">
        Showing <span className="font-medium text-foreground">{start}&ndash;{end}</span> of{' '}
        <span className="font-medium text-foreground">{total}</span> {itemName}
      </p>

      {totalPages > 1 ? (
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Previous page"
            disabled={disabled || page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft />
          </Button>

          {pages.map((p) =>
            typeof p === 'number' ? (
              <Button
                key={p}
                variant={p === page ? 'secondary' : 'ghost'}
                size="icon-sm"
                aria-label={`Page ${p}`}
                aria-current={p === page ? 'page' : undefined}
                disabled={disabled}
                className={cn(p === page && 'pointer-events-none font-semibold')}
                onClick={() => {
                  if (p !== page) onPageChange(p)
                }}
              >
                {p}
              </Button>
            ) : (
              <span
                key={p}
                aria-hidden
                className="flex size-7 items-center justify-center text-muted-foreground"
              >
                <MoreHorizontal className="size-3.5" />
              </span>
            ),
          )}

          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Next page"
            disabled={disabled || page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            <ChevronRight />
          </Button>
        </div>
      ) : null}
    </nav>
  )
}
