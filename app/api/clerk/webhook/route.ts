/**
 * Clerk webhook handler - syncs user.create / user.update / user.delete
 * to our D1 `users` table so the rest of the app can rely on local user rows.
 *
 * Configure in Clerk Dashboard -> Webhooks -> Add endpoint:
 *   URL: https://your-domain.com/api/clerk/webhook
 *   Events: user.created, user.updated, user.deleted
 */

import { ok, fail } from '@/lib/api/envelope'
import { Webhook } from 'svix'
import { getDB } from '@/lib/db/client'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { syncClerkUser } from '@/lib/api/auth'

/**
 * Clerk webhook handler - syncs user.create / user.update / user.delete
 * to our D1 `users` table so the rest of the app can rely on local user rows.
 *
 * Configure in Clerk Dashboard -> Webhooks -> Add endpoint:
 *   URL: https://your-domain.com/api/clerk/webhook
 *   Events: user.created, user.updated, user.deleted
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const webhookSecret = process.env.CLERK_WEBHOOK_SECRET

export async function POST(request: Request) {
  if (!webhookSecret) {
    // Dev mode: accept the payload without verification
    console.warn('[Clerk webhook] CLERK_WEBHOOK_SECRET not set - accepting unsigned payload')
  }

  const body = await request.text()
  const headers = Object.fromEntries(request.headers.entries())

  let event: any
  if (webhookSecret) {
    try {
      const wh = new Webhook(webhookSecret)
      event = wh.verify(body, headers)
    } catch {
      return fail('Invalid signature', 401, 'INVALID_SIGNATURE')
    }
  } else {
    event = JSON.parse(body)
  }

  const { type, data } = event

  try {
    switch (type) {
      case 'user.created':
      case 'user.updated': {
        const clerkId = data.id
        const email =
          data.email_addresses?.find((e: any) => e.id === data.primary_email_address_id)
            ?.email_address ?? data.email_addresses?.[0]?.email_address ?? ''
        const displayName =
          data.full_name?.trim() || data.username?.trim() || email.split('@')[0] || 'Anonymous'

        // Use syncClerkUser which handles upsert
        await syncClerkUser(clerkId)
        break
      }

      case 'user.deleted': {
        const clerkId = data.id
        if (clerkId) {
          const db = getDB()
          // Soft-delete: mark suspended, don't hard-delete (preserves watch history, reviews)
          db.update(users)
            .set({ status: 'suspended', email: `deleted_${clerkId}@deleted.local` })
            .where(eq(users.clerkId, clerkId))
            .run()
        }
        break
      }

      default:
        // Ignore other event types
        break
    }

    return ok({ received: true })
  } catch (err) {
    console.error('[Clerk webhook] error:', err)
    const message = err instanceof Error ? err.message : 'Webhook processing failed'
    return fail(message, 500, 'WEBHOOK_ERROR')
  }
}
