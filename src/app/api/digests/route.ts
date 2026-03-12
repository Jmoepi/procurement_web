/**
 * GET /api/digests - List digest runs
 * POST /api/digests/send - Manually trigger digest send
 */

import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createRateLimiter, getClientIdentifier } from "@/lib/rate-limiter";
import {
  createErrorResponse,
  createSuccessResponse,
  toNextResponse,
  API_ERRORS,
} from "@/lib/api-errors";
import { requireAuth } from "@/lib/api-auth";

const rateLimiter = createRateLimiter(60 * 60 * 1000, 100);

export async function GET(request: NextRequest) {
  try {
    const clientId = getClientIdentifier(request);
    const rateLimit = rateLimiter(clientId);
    if (!rateLimit.allowed) {
      const [errorData, statusCode] = createErrorResponse(
        API_ERRORS.RATE_LIMITED.code,
        "Too many requests",
        API_ERRORS.RATE_LIMITED.statusCode
      );
      return toNextResponse(errorData, statusCode);
    }

    const { auth, response } = await requireAuth(request);
    if (response) return response;

    // Get pagination params
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");
    const status = searchParams.get("status"); // success, fail, pending

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let query = supabase
      .from("digest_runs")
      .select("*", { count: "exact" })
      .eq("tenant_id", auth!.tenantId);

    if (status) {
      query = query.eq("status", status);
    }

    const { data: digests, count, error } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Database error:", error);
      const [errorData, statusCode] = createErrorResponse(
        API_ERRORS.INTERNAL_ERROR.code,
        "Failed to fetch digests",
        API_ERRORS.INTERNAL_ERROR.statusCode
      );
      return toNextResponse(errorData, statusCode);
    }

    const responseData = createSuccessResponse({
      digests: digests || [],
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit,
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

export async function POST(request: NextRequest) {
  try {
    const clientId = getClientIdentifier(request);
    const rateLimit = rateLimiter(clientId);
    if (!rateLimit.allowed) {
      const [errorData, statusCode] = createErrorResponse(
        API_ERRORS.RATE_LIMITED.code,
        "Too many requests",
        API_ERRORS.RATE_LIMITED.statusCode
      );
      return toNextResponse(errorData, statusCode);
    }

    const { auth, response } = await requireAuth(request);
    if (response) return response;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Check if a digest is already pending
    const { data: pendingDigest } = await supabase
      .from("digest_runs")
      .select("id")
      .eq("tenant_id", auth!.tenantId)
      .eq("status", "pending")
      .single();

    if (pendingDigest) {
      const [errorData, statusCode] = createErrorResponse(
        API_ERRORS.CONFLICT.code,
        "A digest is already pending. Please wait for it to complete.",
        API_ERRORS.CONFLICT.statusCode
      );
      return toNextResponse(errorData, statusCode);
    }

    // Create digest run record
    const { data: newDigest, error: insertError } = await supabase
      .from("digest_runs")
      .insert({
        tenant_id: auth!.tenantId,
        status: "pending",
        error_message: null,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      const [errorData, statusCode] = createErrorResponse(
        API_ERRORS.INTERNAL_ERROR.code,
        "Failed to create digest run",
        API_ERRORS.INTERNAL_ERROR.statusCode
      );
      return toNextResponse(errorData, statusCode);
    }

    // In production, trigger background job here
    // e.g., queue.enqueue('send_digest', { tenantId: auth.tenantId, digestId: newDigest.id })

    const responseData = createSuccessResponse({
      digest: newDigest,
      message: "Digest send triggered. Check back soon for results.",
    });

    return toNextResponse(responseData, 202); // 202 Accepted
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
