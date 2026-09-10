import { handler, ok, Errors } from '@/lib/api/envelope'
import { requireAdmin } from '@/lib/api/auth'
import { submissionReviewSchema, applicationReviewSchema } from '@/lib/validations'
import { getSyncDB } from '@/lib/db/client'
import { filmSubmissions } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { nowEpoch, epochToIso } from '@/lib/time'
import { logActivity } from '@/lib/repositories/activity'
import { createMovie } from '@/lib/repositories/movies'
import { updateSubmission, getSubmission, reviewFilmmakerApplication } from '@/lib/repositories/submissions'

/**
 * Admin submission review endpoints.
 *
 * PATCH  /api/admin/submissions/:id  — approve or reject a submission
 * PATCH  /api/admin/submissions/:id/filmmaker-application  — approve or reject a filmmaker access application
 */

import { handler, ok, Errors } from '@/lib/api/envelope'
import { requireAdmin } from '@/lib/api/auth'
import { submissionReviewSchema, applicationReviewSchema } from '@/lib/validations'
import { getSyncDB } from '@/lib/db/client'
import { filmSubmissions } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { nowEpoch, epochToIso } from '@/lib/time'
import { logActivity } from '@/lib/repositories/activity'
import { createMovie } from '@/lib/repositories/movies'
import { updateSubmission, getSubmission, reviewFilmmakerApplication } from '@/lib/repositories/submissions'