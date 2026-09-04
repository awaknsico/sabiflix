/**
 * Single film request endpoints.
 *
 * PATCH /api/requests/:id — admin only: mark a request found (optionally
 *                           linking it to a catalog movie) or close it.
 */

import { handler, ok, Errors } from '@/lib/api/envelope'
import { requireAdmin } from '@/lib/api/auth'
import { requestUpdateSchema } from '@/lib/validations'
import { getRequest, updateRequest } from '@/lib/repositories/requests'
import { epochToIso, nowEpoch } from '@/lib/time'
import { logActivity } from '@/lib/repositories/activity'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const PATCH = handler(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const admin = await requireAdmin()
  const { id } = await params
  const body = await request.json().catch(() => null)
  if (!body) throw Errors.validation('Request body must be valid JSON')

  const data = requestUpdateSchema.parse(body)
  const existing = await getRequest(id)
  if (!existing) throw Errors.notFound('Request')

  await updateRequest(id, {
    status: data.status,
    fulfilledByMovieId: data.status === 'found' ? (data.fulfilledByMovieId ?? null) : null,
    updatedAt: nowEpoch(),
  })

  await logActivity({
    actorId: admin.id, actorRole: admin.role,
    action: `request.${data.status}`, entityType: 'request', entityId: id,
    details: JSON.stringify({ fulfilledByMovieId: data.fulfilledByMovieId ?? null }),
  })

  return ok({
    request: {
      id, status: data.status,
      fulfilledByMovieId: data.status === 'found' ? (data.fulfilledByMovieId ?? null) : null,
      updatedAt: epochToIso(nowEpoch()),
    },
  })
})