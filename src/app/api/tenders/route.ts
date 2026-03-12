/**
 * GET /api/tenders - List tenders for authenticated user
 * 
 * Query Parameters:
 * - category?: string (courier, printing, both, other)
 * - priority?: string (high, medium, low)
 * - expired?: boolean
 * - sourceId?: string
 * - limit?: number (default: 20, max: 100)
 * - offset?: number (default: 0)
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { createRateLimiter, getClientIdentifier } from "@/lib/rate-limiter";
import {
  createErrorResponse,
  createSuccessResponse,
  toNextResponse,
  API_ERRORS,
  formatZodErrors,
} from "@/lib/api-errors";
import { requireAuth } from "@/lib/api-auth";

// Initialize rate limiter: 100 requests per hour
const rateLimiter = createRateLimiter(60 * 60 * 1000, 100);

// Validation schema
const QuerySchema = z.object({
  category: z.enum(["courier", "printing", "both", "other"]).optional(),
  priority: z.enum(["high", "medium", "low"]).optional(),
  expired: z.boolean().optional(),
  sourceId: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});

type QueryParams = z.infer<typeof QuerySchema>;

export async function GET(request: NextRequest) {
  try {
    // 1. Rate limiting
    const clientId = getClientIdentifier(request);
    const rateLimit = rateLimiter(clientId);

    if (!rateLimit.allowed) {
      const [errorData, statusCode] = createErrorResponse(
        API_ERRORS.RATE_LIMITED.code,
        "Too many requests. Please try again later.",
        API_ERRORS.RATE_LIMITED.statusCode
      );
      return toNextResponse(errorData, statusCode);
    }

    // 2. Authentication
    const { auth, response } = await requireAuth(request);
    if (response) return response;

    // 3. Parse and validate query parameters
    const searchParams = request.nextUrl.searchParams;
    const queryData = {
      category: searchParams.get("category"),
      priority: searchParams.get("priority"),
      expired: searchParams.get("expired") === "true",
      sourceId: searchParams.get("sourceId"),
      limit: parseInt(searchParams.get("limit") || "20"),
      offset: parseInt(searchParams.get("offset") || "0"),
    };

    const validation = QuerySchema.safeParse(queryData);
    if (!validation.success) {
      const [errorData, statusCode] = createErrorResponse(
        API_ERRORS.VALIDATION_ERROR.code,
        "Invalid query parameters",
        API_ERRORS.VALIDATION_ERROR.statusCode,
        formatZodErrors(validation.error)
      );
      return toNextResponse(errorData, statusCode);
    }

    const params: QueryParams = validation.data;

    // 4. Fetch data from Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let query = supabase
      .from("tenders")
      .select("*", { count: "exact" })
      .eq("tenant_id", auth!.tenantId);

    // Apply filters
    if (params.category) {
      query = query.eq("category", params.category);
    }
    if (params.priority) {
      query = query.eq("priority", params.priority);
    }
    if (params.sourceId) {
      query = query.eq("source_id", params.sourceId);
    }
    if (params.expired !== undefined) {
      if (params.expired) {
        query = query.lt("closing_date", new Date().toISOString());
      } else {
        query = query.gte("closing_date", new Date().toISOString());
      }
    }

    // Pagination
    const { data: tenders, count, error } = await query
      .order("created_at", { ascending: false })
      .range(params.offset, params.offset + params.limit - 1);

    if (error) {
      console.error("Database error:", error);
      const [errorData, statusCode] = createErrorResponse(
        API_ERRORS.INTERNAL_ERROR.code,
        "Failed to fetch tenders",
        API_ERRORS.INTERNAL_ERROR.statusCode
      );
      return toNextResponse(errorData, statusCode);
    }

    // 5. Return success response
    const responseData = createSuccessResponse({
      tenders: tenders || [],
      pagination: {
        total: count || 0,
        limit: params.limit,
        offset: params.offset,
        hasMore: (count || 0) > params.offset + params.limit,
      },
    });

    return toNextResponse(responseData, 200);
  } catch (error) {
    console.error("API Error:", error);
    const [errorData, statusCode] = createErrorResponse(
      API_ERRORS.INTERNAL_ERROR.code,
      "Internal server error",
      API_ERRORS.INTERNAL_ERROR.statusCode
    );
    return toNextResponse(errorData, statusCode);
  }
}
