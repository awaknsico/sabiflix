/**
 * Unit tests for authentication & authorization.
 * Mocks Clerk and the database layer so tests run without external services.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock Clerk auth
const mockAuth = vi.fn()
const mockClerkClient = vi.fn()

vi.mock('@clerk/nextjs/server', () => ({
  auth: () => mockAuth(),
  clerkClient: async () => mockClerkClient(),
}))

// Mock the DB client
const mockUsers: any[] = []
const mockDb = {
  select: vi.fn(() => ({
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        all: vi.fn(() => Promise.resolve(mockUsers)),
      })),
    })),
  })),
  insert: vi.fn(() => ({
    values: vi.fn(() => Promise.resolve({})),
  })),
  update: vi.fn(() => ({
    set: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve({})),
    })),
  })),
}

vi.mock('@/lib/db/client', () => ({
  getDB: () => mockDb,
}))

// Mock ids
vi.mock('@/lib/ids', () => ({
  uuid_v7: () => 'test-uuid-1234',
}))

import { requireUser, requireAdmin, requireRole, getCurrentUser } from '@/lib/api/auth'
import { Errors } from '@/lib/api/envelope'

const mockUser = {
  id: 'user-1',
  clerkId: 'clerk-1',
  email: 'test@example.com',
  displayName: 'Test User',
  role: 'user',
  status: 'active',
  avatarUrl: null,
  createdAt: 1234567890,
  updatedAt: 1234567890,
}

const mockAdminUser = {
  ...mockUser,
  id: 'admin-1',
  clerkId: 'clerk-admin',
  email: 'admin@example.com',
  role: 'admin',
}

beforeEach(() => {
  mockUsers.length = 0
  mockAuth.mockReset()
  mockClerkClient.mockReset()
  vi.clearAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('currentUserId / getCurrentUser', () => {
  it('returns null when no user is signed in', async () => {
    mockAuth.mockReturnValue({ userId: null })
    const user = await getCurrentUser()
    expect(user).toBeNull()
  })

  it('returns the user when signed in and exists in DB', async () => {
    mockAuth.mockReturnValue({ userId: 'clerk-1' })
    mockUsers.push(mockUser)
    const user = await getCurrentUser()
    expect(user).toBeDefined()
    expect(user?.email).toBe('test@example.com')
  })

  it('returns null when signed in but user not in DB and sync fails', async () => {
    mockAuth.mockReturnValue({ userId: 'clerk-unknown' })
    mockClerkClient.mockRejectedValue(new Error('Clerk error'))
    const user = await getCurrentUser()
    expect(user).toBeNull()
  })
})

describe('requireUser', () => {
  it('throws 401 when no user is signed in', async () => {
    mockAuth.mockReturnValue({ userId: null })
    await expect(requireUser()).rejects.toMatchObject({
      status: 401,
      code: 'UNAUTHORIZED',
    })
  })

  it('throws 403 when user is suspended', async () => {
    mockAuth.mockReturnValue({ userId: 'clerk-1' })
    mockUsers.push({ ...mockUser, status: 'suspended' })
    await expect(requireUser()).rejects.toMatchObject({
      status: 403,
      code: 'FORBIDDEN',
    })
  })

  it('returns the user when active', async () => {
    mockAuth.mockReturnValue({ userId: 'clerk-1' })
    mockUsers.push(mockUser)
    const user = await requireUser()
    expect(user.id).toBe('user-1')
  })
})

describe('requireRole', () => {
  it('throws 403 when user role does not match', async () => {
    mockAuth.mockReturnValue({ userId: 'clerk-1' })
    mockUsers.push(mockUser)
    await expect(requireRole('admin')).rejects.toMatchObject({
      status: 403,
      code: 'FORBIDDEN',
    })
  })

  it('returns user when role matches', async () => {
    mockAuth.mockReturnValue({ userId: 'clerk-1' })
    mockUsers.push(mockUser)
    const user = await requireRole('user')
    expect(user.role).toBe('user')
  })

  it('accepts any of multiple roles', async () => {
    mockAuth.mockReturnValue({ userId: 'clerk-admin' })
    mockUsers.push(mockAdminUser)
    const user = await requireRole('admin', 'creator')
    expect(user.role).toBe('admin')
  })
})

describe('requireAdmin', () => {
  it('throws 403 for regular users', async () => {
    mockAuth.mockReturnValue({ userId: 'clerk-1' })
    mockUsers.push(mockUser)
    await expect(requireAdmin()).rejects.toMatchObject({
      status: 403,
      code: 'FORBIDDEN',
    })
  })

  it('returns user for admins', async () => {
    mockAuth.mockReturnValue({ userId: 'clerk-admin' })
    mockUsers.push(mockAdminUser)
    const user = await requireAdmin()
    expect(user.role).toBe('admin')
  })
})