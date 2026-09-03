'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Clapperboard, Loader2, Lock, Mail, User } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group'
import { useAuth } from '@/lib/use-auth'

export function AuthForm({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const router = useRouter()
  const { signIn } = useAuth()
  const [submitting, setSubmitting] = useState(false)
  const isSignUp = mode === 'sign-up'

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    // Prototype only — no backend. Fake a short delay then "sign in".
    setSubmitting(true)
    setTimeout(() => {
      signIn()
      toast.success(isSignUp ? 'Account created' : 'Welcome back', {
        description: 'This is a UI prototype — no real account was created.',
      })
      router.push('/dashboard')
    }, 800)
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-8">
      <div className="flex flex-col items-center gap-4 text-center">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Clapperboard className="size-5" />
          </span>
          <span className="font-serif text-2xl font-bold">
            Sabi<span className="text-primary">Flix</span>
          </span>
        </Link>
        <div className="flex flex-col gap-1">
          <h1 className="font-serif text-2xl font-bold tracking-tight">
            {isSignUp ? 'Create your account' : 'Welcome back'}
          </h1>
          <p className="text-sm text-muted-foreground text-pretty">
            {isSignUp
              ? 'Save favorites, track your history, and request films.'
              : 'Sign in to continue watching curated African cinema.'}
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit}>
        <FieldGroup>
          {isSignUp ? (
            <Field>
              <FieldLabel htmlFor="displayName">Display name</FieldLabel>
              <InputGroup>
                <InputGroupInput
                  id="displayName"
                  name="displayName"
                  placeholder="Ada Eze"
                  autoComplete="name"
                  required
                />
                <InputGroupAddon>
                  <User />
                </InputGroupAddon>
              </InputGroup>
            </Field>
          ) : null}

          <Field>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <InputGroup>
              <InputGroupInput
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
              <InputGroupAddon>
                <Mail />
              </InputGroupAddon>
            </InputGroup>
          </Field>

          <Field>
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <InputGroup>
              <InputGroupInput
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                required
              />
              <InputGroupAddon>
                <Lock />
              </InputGroupAddon>
            </InputGroup>
            {!isSignUp ? (
              <FieldDescription>
                <Link href="/sign-in">Forgot your password?</Link>
              </FieldDescription>
            ) : (
              <FieldDescription>Must be at least 8 characters.</FieldDescription>
            )}
          </Field>

          <Field>
            <Button type="submit" size="lg" disabled={submitting} className="w-full">
              {submitting ? (
                <>
                  <Loader2 className="animate-spin" data-icon="inline-start" />
                  {isSignUp ? 'Creating account…' : 'Signing in…'}
                </>
              ) : isSignUp ? (
                'Create account'
              ) : (
                'Sign in'
              )}
            </Button>
          </Field>
        </FieldGroup>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
        <Link
          href={isSignUp ? '/sign-in' : '/sign-up'}
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          {isSignUp ? 'Sign in' : 'Sign up'}
        </Link>
      </p>

      <p className="rounded-lg border border-border/60 bg-muted/40 p-3 text-center text-xs text-muted-foreground">
        Prototype notice: authentication is not wired to a backend. Submitting either form
        simply simulates a signed-in session.
      </p>
    </div>
  )
}
