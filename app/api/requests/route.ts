/**
 * Film request endpoints.
 */

import { handler, ok, Errors } from '@/lib/api/envelope'
import { requireUser } from '@/lib/api/auth'
import { requestCreateSchema } from '@/lib/validations'
import { createRequest, listRequests } from '@/lib/repositories/requests'
import { epochToIso } from '@/lib/time'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = handler(async () => {
  const user = await requireUser()
  const rows = await listRequests(user.id, user.role === 'admin')
  return ok({
    requests: rows.map((r) => ({
      id: r.id, requestedTitle: r.requestedTitle, status: r.status, createdAt: epochToIso(r.createdAt),
    })),
  })
})

export const POST = handler(async (request: Request) => {
  const user = await requireUser()
  const body = await request.json().catch(() => null)
  if (!body) throw Errors.validation('Request body must be valid JSON')

  const data = requestCreateSchema.parse(body)
  const req = await createRequest({
    userId: user.id, requestedTitle: data.requestedTitle, description: data.description,
  })

  return ok(
    { request: { id: req!.id, requestedTitle: req!.requestedTitle, status: 'open', createdAt: epochToIso(req!.createdAt) } },
    undefined, 201,
  )
})
