'use client'

import Link from 'next/link'
import { Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'

/**
 * Sign-in prompt shown when an unauthenticated visitor opens a protected area.
 * Real auth is Clerk-backed (see proxy.ts) - this is purely the fallback UI.
 */
export function ProtectedPlaceholder({ area }: { area: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-16">
      <Empty className="max-w-md">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Lock />
          </EmptyMedia>
          <EmptyTitle>Sign in to view {area}</EmptyTitle>
          <EmptyDescription>
            This is a protected area. Sign in to continue - it only takes a moment.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button render={<Link href="/sign-in" />}>Sign in</Button>
            <Button render={<Link href="/sign-up" />} variant="outline">
              Create account
            </Button>
          </div>
        </EmptyContent>
      </Empty>
    </div>
  )
}
