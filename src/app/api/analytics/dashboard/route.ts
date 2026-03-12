/**
 * GET /api/analytics/dashboard - Dashboard statistics
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
import { getSupabaseServiceRoleConfig } from "@/lib/supabase/config";

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

    const { url, serviceRoleKey } = getSupabaseServiceRoleConfig();
    const supabase = createClient(url, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const [
      { count: totalTenders },
      { count: activeTenders },
      { count: expiredTenders },
      { count: subscriberCount },
      { data: categoryStats },
      { data: priorityStats },
      { data: sourceStats },
      { data: recentTenders },
      { data: recentDigests },
      { data: tenant },
    ] = await Promise.all([
      supabase
        .from("tenders")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", auth!.tenantId),
      supabase
        .from("tenders")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", auth!.tenantId)
        .eq("expired", false),
      supabase
        .from("tenders")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", auth!.tenantId)
        .eq("expired", true),
      supabase
        .from("subscriptions")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", auth!.tenantId)
        .eq("is_active", true),
      supabase
        .from("tenders")
        .select("category")
        .eq("tenant_id", auth!.tenantId),
      supabase
        .from("tenders")
        .select("priority")
        .eq("tenant_id", auth!.tenantId),
      supabase
        .from("sources")
        .select("id, name, last_crawled_at, crawl_success_rate, tenders_found")
        .eq("tenant_id", auth!.tenantId)
        .order("tenders_found", { ascending: false })
        .limit(5),
      supabase
        .from("tenders")
        .select("id, title, category, priority, created_at")
        .eq("tenant_id", auth!.tenantId)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("digest_runs")
        .select("id, status, created_at, tenders_found, emails_sent, metadata")
        .eq("tenant_id", auth!.tenantId)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("tenants")
        .select("plan, trial_ends_at")
        .eq("id", auth!.tenantId)
        .single(),
    ]);

    const categoryBreakdown = (categoryStats ?? []).reduce<Record<string, number>>(
      (acc, row) => {
        const key = row.category ?? "unknown";
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      },
      {}
    );

    const priorityBreakdown = (priorityStats ?? []).reduce<Record<string, number>>(
      (acc, row) => {
        const key = row.priority ?? "unknown";
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      },
      {}
    );

    const responseData = createSuccessResponse({
      overview: {
        total_tenders: totalTenders ?? 0,
        active_tenders: activeTenders ?? 0,
        expired_tenders: expiredTenders ?? 0,
        active_subscribers: subscriberCount ?? 0,
        plan: tenant?.plan ?? "starter",
        trial_ends_at: tenant?.trial_ends_at ?? null,
      },
      breakdown: {
        by_category: categoryBreakdown,
        by_priority: priorityBreakdown,
      },
      top_sources: sourceStats ?? [],
      recent_tenders: recentTenders ?? [],
      recent_digests: recentDigests ?? [],
      charts_data: {
        categories: Object.entries(categoryBreakdown).map(([name, value]) => ({
          name,
          value,
        })),
        priorities: Object.entries(priorityBreakdown).map(([name, value]) => ({
          name,
          value,
        })),
      },
    });

    return toNextResponse(responseData, 200);
  } catch (error) {
    console.error("API Error (GET /analytics/dashboard):", error);
    const [errorData, statusCode] = createErrorResponse(
      API_ERRORS.INTERNAL_ERROR.code,
      "Internal server error",
      API_ERRORS.INTERNAL_ERROR.statusCode
    );
    return toNextResponse(errorData, statusCode);
  }
}
