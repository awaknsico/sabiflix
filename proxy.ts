/**
 * Clerk authentication proxy — protects routes and syncs users.
 *
 * Public routes (no auth required):
 *   - /, /catalog, /movie/*, /sign-in, /sign-up
 *   - /api/movies (GET), /api/reviews (GET), /api/youtube/*
 *   - /api/clerk/webhook
 *
 * Protected routes (auth required):
 *   - /dashboard, /api/watchlist, /api/watch-history, /api/submissions, /api/requests
 *
 * Admin routes (admin role required — enforced in the route handler):
 *   - /admin/*, /api/admin/*
 *
 * NOTE: Next.js v16 renamed the `middleware` file convention to `proxy`.
 */

import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/api/watchlist(.*)',
  '/api/watch-history(.*)',
  '/api/submissions(.*)',
  '/api/requests(.*)',
  '/api/notifications(.*)',
  '/api/reviews(.*)',
  '/api/admin(.*)',
])

export default clerkMiddleware(async (auth, request) => {
  if (isProtectedRoute(request)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next|[^?]*\\.(?:html|css|js|jpe?g|png|gif|svg|ico|woff2?|ttf|eot)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}