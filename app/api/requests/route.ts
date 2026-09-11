/**
 * Film request endpoints.
 */

import { handler, ok, Errors } from '@/lib/api/envelope'
import { requireUser } from '@/lib/api/auth'
import { requestCreateSchema } from '@/lib/validations'
import { parsePaginationParams, paginationMeta } from '@/lib/api/pagination'
import { createRequest, listRequests } from '@/lib/repositories/requests'
import { epochToIso } from '@/lib/time'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = handler(async (request: Request) => {
  const user = await requireUser()
  const { page, perPage } = parsePaginationParams(new URL(request.url).searchParams)
  const isAdmin = user.role === 'admin'
  const { items, total } = await listRequests(user.id, isAdmin, { page, perPage }, { actionableOnly: isAdmin })
  return ok(
    {
      requests: items.map((r) => ({
        id: r.id, requestedTitle: r.requestedTitle, description: r.description,
        status: r.status, userDisplayName: r.userDisplayName,
        fulfilledByMovieId: r.fulfilledByMovieId,
        requestedAt: epochToIso(r.createdAt),
      })),
    },
    paginationMeta(page, perPage, total),
  )
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
