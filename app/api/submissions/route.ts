/**
 * Film submission endpoints.
 */

import { handler, ok, Errors } from '@/lib/api/envelope'
import { requireUser } from '@/lib/api/auth'
import { submissionCreateSchema } from '@/lib/validations'
import { createSubmission, listSubmissions } from '@/lib/repositories/submissions'
import { epochToIso } from '@/lib/time'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = handler(async () => {
  const user = await requireUser()
  const rows = await listSubmissions(user.id, user.role === 'admin')
  return ok({
    submissions: rows.map((r) => ({
      id: r.id, title: r.title, youtubeUrl: r.youtubeUrl,
      status: r.status, adminNotes: r.adminNotes, createdAt: epochToIso(r.createdAt),
    })),
  })
})

export const POST = handler(async (request: Request) => {
  const user = await requireUser()
  const body = await request.json().catch(() => null)
  if (!body) throw Errors.validation('Request body must be valid JSON')

  const data = submissionCreateSchema.parse(body)
  const ytMatch = data.youtubeUrl.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/,
  )
  const submission = await createSubmission({
    userId: user.id, title: data.title, youtubeUrl: data.youtubeUrl,
    youtubeVideoId: ytMatch ? ytMatch[1] : null, description: data.description,
  })

  return ok(
    { submission: { id: submission!.id, title: submission!.title, status: 'pending', createdAt: epochToIso(submission!.createdAt) } },
    undefined, 201,
  )
})
