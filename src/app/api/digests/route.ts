/**
 * GET /api/digests - List digest runs
 * POST /api/digests - Queue a manual digest send
 */

import { after, NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createRateLimiter, getClientIdentifier } from "@/lib/rate-limiter";
import {
  createErrorResponse,
  createSuccessResponse,
  toNextResponse,
  API_ERRORS,
} from "@/lib/api-errors";
import { requireAdmin, requireAuth } from "@/lib/api-auth";
import { processDigestRunById } from "@/lib/digest-jobs";
import { getSupabaseServiceRoleConfig } from "@/lib/supabase/config";
import { normalizeDigestStatus } from "@/lib/digests";

const rateLimiter = createRateLimiter(60 * 60 * 1000, 100);

function getSupabaseAdmin() {
  const { url, serviceRoleKey } = getSupabaseServiceRoleConfig();

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

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

    const supabase = getSupabaseAdmin();

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
      digests: (digests || []).map((digest) => ({
        ...digest,
        status: normalizeDigestStatus(digest.status),
      })),
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
    const adminResponse = requireAdmin(auth!);
    if (adminResponse) return adminResponse;

    const supabase = getSupabaseAdmin();

    // Check if a digest is already queued or running
    const { data: pendingDigest } = await supabase
      .from("digest_runs")
      .select("id")
      .eq("tenant_id", auth!.tenantId)
      .in("status", ["pending", "running"])
      .limit(1)
      .maybeSingle();

    if (pendingDigest) {
      const [errorData, statusCode] = createErrorResponse(
        API_ERRORS.CONFLICT.code,
        "A digest is already queued or running. Please wait for it to complete.",
        API_ERRORS.CONFLICT.statusCode
      );
      return toNextResponse(errorData, statusCode);
    }

    // Create digest run record
    const today = new Date().toISOString().slice(0, 10);
    const { data: newDigest, error: insertError } = await supabase
      .from("digest_runs")
      .insert({
        tenant_id: auth!.tenantId,
        run_date: today,
        tenders_found: 0,
        emails_sent: 0,
        status: "pending",
        error_message: null,
        metadata: {
          manual_triggered: true,
          triggered_at: new Date().toISOString(),
          triggered_by: auth!.userId,
        },
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

    after(async () => {
      const result = await processDigestRunById({
        digestId: newDigest.id,
        expectedTenantId: auth!.tenantId,
      });

      if (result.status === "failed") {
        console.error("Background digest job failed", {
          digestId: result.digestId,
          tenantId: result.tenantId,
          message: result.message,
        });
      }
    });

    const responseData = createSuccessResponse({
      digest: {
        ...newDigest,
        status: normalizeDigestStatus(newDigest.status),
      },
      message: "Digest queued. Delivery will continue in the background.",
    });

    return toNextResponse(responseData, 202);
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
