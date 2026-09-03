'use client'

import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { DashboardView } from '@/components/dashboard-view'
import { ProtectedPlaceholder } from '@/components/protected-placeholder'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/lib/use-auth'

export default function DashboardPage() {
  const { isSignedIn, ready } = useAuth()

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        {!ready ? (
          <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
            <Skeleton className="h-9 w-56" />
            <Skeleton className="mt-3 h-5 w-80" />
            <Skeleton className="mt-8 h-10 w-full max-w-md" />
            <div className="mt-6 flex flex-col gap-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          </div>
        ) : isSignedIn ? (
          <DashboardView />
        ) : (
          <ProtectedPlaceholder area="your dashboard" />
        )}
      </main>
      <SiteFooter />
    </div>
  )
}
