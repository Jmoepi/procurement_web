/**
 * Standardized API Error Responses
 * Ensures consistent error handling across all API routes
 */

import { NextResponse } from "next/server";
import { ZodError } from "zod";

export interface ApiError {
  code: string;
  message: string;
  details?: any;
  statusCode: number;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

/**
 * Create error response
 */
export function createErrorResponse(
  code: string,
  message: string,
  statusCode: number = 400,
  details?: any
): [ApiErrorResponse, number] {
  return [
    {
      success: false,
      error: {
        code,
        message,
        ...(details && { details }),
      },
    },
    statusCode,
  ];
}

/**
 * Create success response
 */
export function createSuccessResponse<T>(data: T): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
  };
}

/**
 * Common API error codes
 */
export const API_ERRORS = {
  INVALID_REQUEST: { code: "INVALID_REQUEST", statusCode: 400 },
  UNAUTHORIZED: { code: "UNAUTHORIZED", statusCode: 401 },
  FORBIDDEN: { code: "FORBIDDEN", statusCode: 403 },
  NOT_FOUND: { code: "NOT_FOUND", statusCode: 404 },
  CONFLICT: { code: "CONFLICT", statusCode: 409 },
  RATE_LIMITED: { code: "RATE_LIMITED", statusCode: 429 },
  VALIDATION_ERROR: { code: "VALIDATION_ERROR", statusCode: 400 },
  INTERNAL_ERROR: { code: "INTERNAL_ERROR", statusCode: 500 },
  SERVICE_UNAVAILABLE: { code: "SERVICE_UNAVAILABLE", statusCode: 503 },
};

/**
 * Format Zod validation errors
 */
export function formatZodErrors(error: ZodError) {
  const issues = error.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
    code: issue.code,
  }));

  return issues;
}

/**
 * Convert to NextResponse with proper headers
 */
export function toNextResponse(
  data: ApiErrorResponse | ApiSuccessResponse<any>,
  statusCode: number
) {
  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "no-cache, no-store, must-revalidate",
  };

  return NextResponse.json(data, {
    status: statusCode,
    headers,
  });
}

/**
 * Wrap API handler with error handling
 */
export function withErrorHandling(
  handler: (req: Request) => Promise<Response>
) {
  return async (req: Request) => {
    try {
      return await handler(req);
    } catch (error) {
      console.error("API Error:", error);

      // Handle Zod validation errors
      if (error instanceof ZodError) {
        const [errorData, statusCode] = createErrorResponse(
          API_ERRORS.VALIDATION_ERROR.code,
          "Validation failed",
          API_ERRORS.VALIDATION_ERROR.statusCode,
          formatZodErrors(error)
        );
        return toNextResponse(errorData, statusCode);
      }

      // Handle known errors
      if (error instanceof Error) {
        if (error.message.includes("Unauthorized")) {
          const [errorData, statusCode] = createErrorResponse(
            API_ERRORS.UNAUTHORIZED.code,
            "Unauthorized",
            API_ERRORS.UNAUTHORIZED.statusCode
          );
          return toNextResponse(errorData, statusCode);
        }

        if (error.message.includes("Not found")) {
          const [errorData, statusCode] = createErrorResponse(
            API_ERRORS.NOT_FOUND.code,
            "Resource not found",
            API_ERRORS.NOT_FOUND.statusCode
          );
          return toNextResponse(errorData, statusCode);
        }
      }

      // Default to internal server error
      const [errorData, statusCode] = createErrorResponse(
        API_ERRORS.INTERNAL_ERROR.code,
        "Internal server error",
        API_ERRORS.INTERNAL_ERROR.statusCode
      );
      return toNextResponse(errorData, statusCode);
    }
  };
}
