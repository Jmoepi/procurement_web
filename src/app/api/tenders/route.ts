/**
 * GET /api/tenders - List tenders for authenticated user
 * 
 * Query Parameters:
 * - category?: string (canonical category, both, other)
 * - priority?: string (high, medium, low)
 * - expired?: boolean
 * - search?: string
 * - closingSoon?: boolean
 * - sourceId?: string
 * - limit?: number (default: 20, max: 100)
 * - offset?: number (default: 0)
 */

import { NextRequest } from "next/server";
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
import { getSupabaseServiceRoleConfig } from "@/lib/supabase/config";
import { TENDER_CATEGORY_FILTER_VALUES } from "@/lib/tender-categories";
import { applyTenderFilters } from "@/lib/tender-queries";

// Initialize rate limiter: 100 requests per hour
const rateLimiter = createRateLimiter(60 * 60 * 1000, 100);

// Validation schema
const QuerySchema = z.object({
  category: z.enum(TENDER_CATEGORY_FILTER_VALUES).optional(),
  priority: z.enum(["high", "medium", "low"]).optional(),
  expired: z.boolean().optional(),
  search: z.string().trim().min(1).max(160).optional(),
  closingSoon: z.boolean().optional(),
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
      expired: searchParams.has("expired")
        ? searchParams.get("expired") === "true"
        : undefined,
      search: searchParams.get("search") || undefined,
      closingSoon: searchParams.has("closingSoon")
        ? searchParams.get("closingSoon") === "true"
        : undefined,
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
    const { url, serviceRoleKey } = getSupabaseServiceRoleConfig();
    const supabase = createClient(url, serviceRoleKey, {
      auth: { persistSession: false },
    });

    let query = supabase
      .from("tenders")
      .select("*", { count: "exact" })
      .eq("tenant_id", auth!.tenantId);

    query = applyTenderFilters(query, {
      category: params.category,
      priority: params.priority,
      sourceId: params.sourceId,
      search: params.search,
      closingSoon: params.closingSoon,
      expired: params.expired,
    });

    // Pagination
    const { data: tenders, count, error } = await query
      .order("first_seen", { ascending: false })
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
