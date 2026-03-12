import { NextRequest } from "next/server"
import { z } from "zod"
import {
  API_ERRORS,
  createErrorResponse,
  createSuccessResponse,
  formatZodErrors,
  toNextResponse,
} from "@/lib/api-errors"
import {
  dispatchPendingDigestRuns,
  isDigestJobAuthorized,
  isDigestJobConfigured,
  processDigestRunById,
  recoverStaleDigestRuns,
} from "@/lib/digest-jobs"

const DispatchSchema = z.object({
  digestId: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(25).optional(),
  staleMinutes: z.number().int().min(5).max(240).optional(),
  maxRetries: z.number().int().min(0).max(10).optional(),
  recoverOnly: z.boolean().optional(),
})

export async function POST(request: NextRequest) {
  if (!isDigestJobConfigured()) {
    const [errorData, statusCode] = createErrorResponse(
      API_ERRORS.SERVICE_UNAVAILABLE.code,
      "Digest job secret is not configured",
      API_ERRORS.SERVICE_UNAVAILABLE.statusCode
    )
    return toNextResponse(errorData, statusCode)
  }

  if (!isDigestJobAuthorized(request)) {
    const [errorData, statusCode] = createErrorResponse(
      API_ERRORS.UNAUTHORIZED.code,
      "Unauthorized digest job request",
      API_ERRORS.UNAUTHORIZED.statusCode
    )
    return toNextResponse(errorData, statusCode)
  }

  const body = await request.json().catch(() => ({}))
  const validation = DispatchSchema.safeParse(body)

  if (!validation.success) {
    const [errorData, statusCode] = createErrorResponse(
      API_ERRORS.VALIDATION_ERROR.code,
      "Invalid digest dispatch payload",
      API_ERRORS.VALIDATION_ERROR.statusCode,
      formatZodErrors(validation.error)
    )
    return toNextResponse(errorData, statusCode)
  }

  try {
    if (validation.data.digestId) {
      const result = await processDigestRunById({
        digestId: validation.data.digestId,
      })

      return toNextResponse(createSuccessResponse(result), 200)
    }

    if (validation.data.recoverOnly) {
      const result = await recoverStaleDigestRuns({
        staleMinutes: validation.data.staleMinutes,
        maxRetries: validation.data.maxRetries,
      })

      return toNextResponse(createSuccessResponse(result), 200)
    }

    const result = await dispatchPendingDigestRuns({
      limit: validation.data.limit,
      staleMinutes: validation.data.staleMinutes,
      maxRetries: validation.data.maxRetries,
    })

    return toNextResponse(createSuccessResponse(result), 200)
  } catch (error) {
    console.error("API Error (POST /api/internal/digests/dispatch):", error)
    const [errorData, statusCode] = createErrorResponse(
      API_ERRORS.INTERNAL_ERROR.code,
      "Failed to dispatch digest jobs",
      API_ERRORS.INTERNAL_ERROR.statusCode
    )
    return toNextResponse(errorData, statusCode)
  }
}
