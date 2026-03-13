"use strict";
/**
 * Standardized API Error Responses
 * Ensures consistent error handling across all API routes
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.API_ERRORS = void 0;
exports.createErrorResponse = createErrorResponse;
exports.createSuccessResponse = createSuccessResponse;
exports.formatZodErrors = formatZodErrors;
exports.toNextResponse = toNextResponse;
exports.withErrorHandling = withErrorHandling;
const server_1 = require("next/server");
const zod_1 = require("zod");
/**
 * Create error response
 */
function createErrorResponse(code, message, statusCode = 400, details) {
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
function createSuccessResponse(data) {
    return {
        success: true,
        data,
    };
}
/**
 * Common API error codes
 */
exports.API_ERRORS = {
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
function formatZodErrors(error) {
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
function toNextResponse(data, statusCode) {
    const headers = {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
    };
    return server_1.NextResponse.json(data, {
        status: statusCode,
        headers,
    });
}
/**
 * Wrap API handler with error handling
 */
function withErrorHandling(handler) {
    return async (req) => {
        try {
            return await handler(req);
        }
        catch (error) {
            console.error("API Error:", error);
            // Handle Zod validation errors
            if (error instanceof zod_1.ZodError) {
                const [errorData, statusCode] = createErrorResponse(exports.API_ERRORS.VALIDATION_ERROR.code, "Validation failed", exports.API_ERRORS.VALIDATION_ERROR.statusCode, formatZodErrors(error));
                return toNextResponse(errorData, statusCode);
            }
            // Handle known errors
            if (error instanceof Error) {
                if (error.message.includes("Unauthorized")) {
                    const [errorData, statusCode] = createErrorResponse(exports.API_ERRORS.UNAUTHORIZED.code, "Unauthorized", exports.API_ERRORS.UNAUTHORIZED.statusCode);
                    return toNextResponse(errorData, statusCode);
                }
                if (error.message.includes("Not found")) {
                    const [errorData, statusCode] = createErrorResponse(exports.API_ERRORS.NOT_FOUND.code, "Resource not found", exports.API_ERRORS.NOT_FOUND.statusCode);
                    return toNextResponse(errorData, statusCode);
                }
            }
            // Default to internal server error
            const [errorData, statusCode] = createErrorResponse(exports.API_ERRORS.INTERNAL_ERROR.code, "Internal server error", exports.API_ERRORS.INTERNAL_ERROR.statusCode);
            return toNextResponse(errorData, statusCode);
        }
    };
}
