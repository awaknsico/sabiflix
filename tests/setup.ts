/**
 * Vitest setup file - runs once before all tests.
 * Mocks Clerk auth and sets up the test environment.
 */

import { vi } from 'vitest'

// Mock Clerk auth functions so tests don't require real Clerk sessions
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(() => Promise.resolve({ userId: null })),
  clerkClient: vi.fn(() =>
    Promise.resolve({
      users: {
        getUser: vi.fn(() =>
          Promise.resolve({
            id: 'test-clerk-id',
            primaryEmailAddressId: 'email_1',
            emailAddresses: [{ id: 'email_1', emailAddress: 'test@example.com' }],
            fullName: 'Test User',
            username: 'testuser',
            imageUrl: null,
          })
        ),
      },
    })
  ),
}))

// Suppress console.error during tests unless explicitly testing error output
const originalError = console.error
console.error = (...args: unknown[]) => {
  const message = args.join(' ')
  if (
    message.includes('Warning:') ||
    message.includes('React') ||
    message.includes('act(')
  ) {
    return
  }
  originalError(...args)
}