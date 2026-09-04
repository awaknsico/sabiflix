/**
 * Server-side authentication & role-based access control.
 */

import { auth, clerkClient } from '@clerk/nextjs/server'
import { getDB } from '@/lib/db/client'
import { users, type User } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { Errors } from './envelope'

export type Role = 'admin' | 'creator' | 'user'

function db() { return getDB() }

export async function currentUserId(): Promise<string | null> {
  const { userId } = await auth()
  return userId ?? null
}

export async function getCurrentUser(): Promise<User | null> {
  const clerkId = await currentUserId()
  if (!clerkId) return null
  const rows = await db().select().from(users).where(eq(users.clerkId, clerkId)).all()
  return rows[0] ?? null
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser()
  if (!user) throw Errors.unauthorized()
  if (user.status === 'suspended') throw Errors.forbidden()
  return user
}

export async function requireRole(...roles: Role[]): Promise<User> {
  const user = await requireUser()
  if (!roles.includes(user.role as Role)) throw Errors.forbidden()
  return user
}

export async function requireAdmin(): Promise<User> {
  return requireRole('admin')
}

export async function syncClerkUser(clerkId: string): Promise<User> {
  const client = await clerkClient()
  const clerkUser = await client.users.getUser(clerkId)
  const email =
    clerkUser.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId)?.emailAddress ??
    clerkUser.emailAddresses[0]?.emailAddress ?? ''
  const displayName =
    clerkUser.fullName?.trim() || clerkUser.username?.trim() || email.split('@')[0] || 'Anonymous'
  const avatarUrl = clerkUser.imageUrl ?? null

  const existing = await db().select().from(users).where(eq(users.clerkId, clerkId)).all()
  if (existing[0]) {
    await db()
      .update(users)
      .set({ email, displayName, avatarUrl, updatedAt: Math.floor(Date.now() / 1000) })
      .where(eq(users.id, existing[0].id))
    return { ...existing[0], email, displayName, avatarUrl }
  }

  const { uuid_v7 } = await import('@/lib/ids')
  const now = Math.floor(Date.now() / 1000)
  const newUser = {
    id: uuid_v7(), clerkId, email, displayName, role: 'user' as const,
    status: 'active' as const, avatarUrl,
    createdAt: now, updatedAt: now,
  }
  await db().insert(users).values(newUser)
  return newUser
}