import { NextRequest } from "next/server"
import {
  createDurableRateLimiter,
  getClientIdentifier,
} from "@/lib/rate-limiter"
import {
  API_ERRORS,
  createErrorResponse,
  createSuccessResponse,
  toNextResponse,
} from "@/lib/api-errors"
import { parseUnsubscribeToken, unsubscribeByToken } from "@/lib/subscriptions"

const rateLimiter = createDurableRateLimiter(
  "public:unsubscribe",
  60 * 60 * 1000,
  100
)

function getToken(request: NextRequest, body: unknown) {
  const fromQuery = request.nextUrl.searchParams.get("token")
  if (typeof fromQuery === "string" && fromQuery) {
    return fromQuery
  }

  if (body && typeof body === "object" && "token" in body) {
    const token = (body as { token?: unknown }).token
    return typeof token === "string" ? token : null
  }

  return null
}

async function handleRequest(request: NextRequest, body: unknown = null) {
  const clientId = getClientIdentifier(request)
  const rateLimit = await rateLimiter(clientId)
  if (!rateLimit.allowed) {
    const [errorData, statusCode] = createErrorResponse(
      API_ERRORS.RATE_LIMITED.code,
      "Too many unsubscribe attempts",
      API_ERRORS.RATE_LIMITED.statusCode
    )
    return toNextResponse(errorData, statusCode)
  }

  const token = parseUnsubscribeToken(getToken(request, body))
  if (!token) {
    const [errorData, statusCode] = createErrorResponse(
      API_ERRORS.INVALID_REQUEST.code,
      "A valid unsubscribe token is required",
      API_ERRORS.INVALID_REQUEST.statusCode
    )
    return toNextResponse(errorData, statusCode)
  }

  try {
    const result = await unsubscribeByToken(token)

    if (result.status === "invalid_token") {
      const [errorData, statusCode] = createErrorResponse(
        API_ERRORS.NOT_FOUND.code,
        "Unsubscribe link is invalid or has expired",
        API_ERRORS.NOT_FOUND.statusCode
      )
      return toNextResponse(errorData, statusCode)
    }

    return toNextResponse(
      createSuccessResponse({
        status: result.status,
        email: result.maskedEmail,
        tenantName: result.tenantName,
      }),
      200
    )
  } catch (error) {
    console.error("API Error (unsubscribe):", error)
    const [errorData, statusCode] = createErrorResponse(
      API_ERRORS.INTERNAL_ERROR.code,
      "Failed to process unsubscribe request",
      API_ERRORS.INTERNAL_ERROR.statusCode
    )
    return toNextResponse(errorData, statusCode)
  }
}

export async function GET(request: NextRequest) {
  return handleRequest(request)
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  return handleRequest(request, body)
}
