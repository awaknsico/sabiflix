'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useUser } from '@clerk/nextjs'
import { User, Mail, Shield, Calendar, LayoutDashboard, Send } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'

interface ProfileUser {
  id: string
  displayName: string
  role: 'admin' | 'creator' | 'user'
  status: 'active' | 'suspended'
  avatarUrl: string | null
  email?: string
  createdAt?: string
}

function formatDate(iso: string | undefined): string {
  if (!iso) return 'Unknown'
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

const roleVariant: Record<string, 'default' | 'secondary' | 'outline'> = {
  admin: 'default',
  creator: 'secondary',
  user: 'outline',
}

interface ApplicationStatus {
  id: string
  status: 'pending' | 'approved' | 'rejected'
  message: string | null
  rejectionReason: string | null
  reviewedBy: string | null
  reviewedAt: string | null
  submittedAt: string
}

export function ProfileView() {
  const { user: clerkUser } = useUser()
  const [profile, setProfile] = useState<ProfileUser | null>(null)
  const [application, setApplication] = useState<ApplicationStatus | null>(null)
  const [applicationMessage, setApplicationMessage] = useState('')
  const [appSubmitting, setAppSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const loadData = async () => {
      let profileData: any = null
      try {
        const res = await fetch('/api/me')
        profileData = await res.json().catch(() => null)
      } catch {
        /* ignore */
      }
      if (!cancelled && profileData?.ok === true && profileData.data?.user) {
        setProfile({
          ...profileData.data.user,
          email: clerkUser?.primaryEmailAddress?.emailAddress,
          createdAt: clerkUser?.createdAt
            ? new Date(clerkUser.createdAt).toISOString()
            : undefined,
        })
      }

      let applicationData: any = null
      try {
        const res = await fetch('/api/submissions/filmmaker-applications')
        applicationData = await res.json().catch(() => null)
      } catch {
        /* ignore */
      }
      if (!cancelled && applicationData?.ok === true && applicationData.data?.application) {
        setApplication(applicationData.data.application as ApplicationStatus)
      } else if (!cancelled) {
        setApplication(null)
      }

      if (!cancelled) setLoading(false)
    }
    loadData()
    return () => {
      cancelled = true
    }
  }, [clerkUser])

  async function submitApplication(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setAppSubmitting(true)
    try {
      const res = await fetch('/api/submissions/filmmaker-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: applicationMessage.trim() || undefined }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || data?.ok !== true) throw new Error(data?.error || 'Could not submit your application.')
      setApplication(data.data.application as ApplicationStatus)
      setApplicationMessage('')
      toast.success('Application submitted', {
        description: 'A moderator will review your request for filmmaker access.',
      })
    } catch (err) {
      toast.error('Could not submit application', {
        description: err instanceof Error ? err.message : 'Please try again.',
      })
    } finally {
      setAppSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            <Skeleton className="h-9 w-56" />
            <Skeleton className="mt-2 h-5 w-80" />
          </div>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <User />
            </EmptyMedia>
            <EmptyTitle>Profile not found</EmptyTitle>
            <EmptyDescription>
              We couldn&apos;t load your profile information. Please try again later.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    )
  }
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-serif text-3xl font-bold tracking-tight">
            Your Profile
          </h1>
          <p className="text-muted-foreground">
            Manage your account details and view your activity.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {profile.role === 'admin' && (
            <Button variant="default" size="sm" render={<Link href="/admin" />}>
              <LayoutDashboard data-icon="inline-start" />
              CMS
            </Button>
          )}
          <Badge variant={roleVariant[profile.role]} className="capitalize">
            {profile.role}
          </Badge>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="size-5 text-primary" />
              Account Information
            </CardTitle>
            <CardDescription>Your personal details on SabiFlix.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-muted-foreground">
                Display Name
              </span>
              <span className="text-foreground">{profile.displayName}</span>
            </div>
            {profile.email && (
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium text-muted-foreground">
                  Email
                </span>
                <span className="flex items-center gap-2 text-foreground">
                  <Mail className="size-4 text-muted-foreground" />
                  {profile.email}
                </span>
              </div>
            )}
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-muted-foreground">
                Member Status
              </span>
              <span className="flex items-center gap-2 text-foreground">
                <Shield className="size-4 text-muted-foreground" />
                <span className="capitalize">{profile.status}</span>
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="size-5 text-primary" />
              Membership
            </CardTitle>
            <CardDescription>Your role and membership details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-muted-foreground">
                Role
              </span>
              <Badge variant={roleVariant[profile.role]} className="w-fit capitalize">
                {profile.role === 'admin'
                  ? 'Administrator'
                  : profile.role === 'creator'
                    ? 'Creator'
                    : 'Member'}
              </Badge>
            </div>
            {profile.createdAt && (
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium text-muted-foreground">
                  Member Since
                </span>
                <span className="text-foreground">
                  {formatDate(profile.createdAt)}
                </span>
              </div>
            )}
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-muted-foreground">
                Account ID
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                {profile.id}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="size-5 text-primary" />
              Filmmaker access
            </CardTitle>
            <CardDescription>
              Share your work on SabiFlix — approved filmmakers and curators can submit films for review
              from the dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {profile.role === 'creator' || profile.role === 'admin' ? (
              <p className="text-sm text-muted-foreground">
                You have full access — submit films from the{' '}
                <Link href="/dashboard" className="font-medium text-primary hover:underline">
                  submissions tab
                </Link>{' '}
                of your dashboard.
              </p>
            ) : application?.status === 'approved' ? (
              <p className="text-sm text-muted-foreground">
                <Badge variant="default" className="mb-1">
                  Approved
                </Badge>
                You are an approved filmmaker — submit films from the{' '}
                <Link href="/dashboard" className="font-medium text-primary hover:underline">
                  submissions tab
                </Link>{' '}
                of your dashboard.
              </p>
            ) : application?.status === 'pending' ? (
              <>
                <Badge variant="secondary">Pending review</Badge>
                <p className="text-sm text-muted-foreground">
                  Your application is with our moderators. We&apos;ll update this page as soon as it&apos;s
                  reviewed.
                </p>
              </>
            ) : application ? (
              <>
                <Badge variant="destructive">Application not approved</Badge>
                <p className="text-sm text-muted-foreground">
                  {application.rejectionReason
                    ? `Our moderators said: ${application.rejectionReason}`
                    : 'Your last application was not approved.'}
                </p>
                <Separator />
                <form onSubmit={submitApplication}>
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="filmmaker-message">
                        Why do you want to share films on SabiFlix?
                      </FieldLabel>
                      <Textarea
                        id="filmmaker-message"
                        rows={3}
                        placeholder="Tell us a little about your work and why it belongs on SabiFlix."
                        value={applicationMessage}
                        onChange={(e) => setApplicationMessage(e.target.value)}
                      />
                    </Field>
                    <Field>
                      <Button type="submit" disabled={appSubmitting}>
                        <Send data-icon="inline-start" />
                        {appSubmitting ? 'Submitting…' : 'Re-apply for access'}
                      </Button>
                    </Field>
                  </FieldGroup>
                </form>
              </>
            ) : (
              <form onSubmit={submitApplication}>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="filmmaker-message">
                      Why do you want to share films on SabiFlix?
                    </FieldLabel>
                    <Textarea
                      id="filmmaker-message"
                      rows={3}
                      placeholder="Tell us a little about your work and why it belongs on SabiFlix."
                      value={applicationMessage}
                      onChange={(e) => setApplicationMessage(e.target.value)}
                    />
                  </Field>
                  <Field>
                    <Button type="submit" disabled={appSubmitting}>
                      <Send data-icon="inline-start" />
                      {appSubmitting ? 'Submitting…' : 'Request filmmaker access'}
                    </Button>
                  </Field>
                </FieldGroup>
              </form>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common account actions.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => window.location.href = '/dashboard'}>
              Go to Dashboard
            </Button>
            <Button variant="outline" onClick={() => window.location.href = '/catalog'}>
              Browse Catalog
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
