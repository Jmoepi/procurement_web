/**
 * GET /api/analytics/dashboard - Dashboard statistics
 * Includes: tender counts, category distribution, priority breakdown, recent activity
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

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch all stats in parallel
    const [
      { data: allTenders },
      { data: categoryStats },
      { data: priorityStats },
      { data: sourceStats },
      { data: recentTenders },
      { data: activeTenders },
      { data: expiredTenders },
      { data: recentDigests },
    ] = await Promise.all([
      // Total tenders
      supabase
        .from("tenders")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", auth!.tenantId),

      // By category
      supabase
        .from("tenders")
        .select("category")
        .eq("tenant_id", auth!.tenantId),

      // By priority
      supabase
        .from("tenders")
        .select("priority")
        .eq("tenant_id", auth!.tenantId),

      // Top sources
      supabase
        .from("sources")
        .select("id, name")
        .eq("tenant_id", auth!.tenantId)
        .order("tenders_found", { ascending: false })
        .limit(5),

      // Recent tenders
      supabase
        .from("tenders")
        .select("id, title, category, priority, created_at")
        .eq("tenant_id", auth!.tenantId)
        .order("created_at", { ascending: false })
        .limit(5),

      // Active (not expired) tenders
      supabase
        .from("tenders")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", auth!.tenantId)
        .gte("closing_date", new Date().toISOString()),

      // Expired tenders
      supabase
        .from("tenders")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", auth!.tenantId)
        .lt("closing_date", new Date().toISOString()),

      // Recent digests
      supabase
        .from("digest_runs")
        .select("id, status, created_at, sent_count")
        .eq("tenant_id", auth!.tenantId)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    // Process category stats
    const categoryBreakdown = (categoryStats || []).reduce(
      (acc: any, t: any) => {
        acc[t.category] = (acc[t.category] || 0) + 1;
        return acc;
      },
      {}
    );

    // Process priority stats
    const priorityBreakdown = (priorityStats || []).reduce(
      (acc: any, t: any) => {
        acc[t.priority] = (acc[t.priority] || 0) + 1;
        return acc;
      },
      {}
    );

    // Get tenant info for limits
    const { data: tenant } = await supabase
      .from("tenants")
      .select("plan, trial_ends_at")
      .eq("id", auth!.tenantId)
      .single();

    // Get subscriber count
    const { count: subscriberCount } = await supabase
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", auth!.tenantId)
      .eq("is_active", true);

    const responseData = createSuccessResponse({
      overview: {
        total_tenders: allTenders?.length || 0,
        active_tenders: activeTenders?.length || 0,
        expired_tenders: expiredTenders?.length || 0,
        active_subscribers: subscriberCount || 0,
        plan: tenant?.plan || "starter",
        trial_ends_at: tenant?.trial_ends_at,
      },
      breakdown: {
        by_category: categoryBreakdown,
        by_priority: priorityBreakdown,
      },
      top_sources: sourceStats || [],
      recent_tenders: recentTenders || [],
      recent_digests: recentDigests || [],
      charts_data: {
        categories: Object.entries(categoryBreakdown).map(([name, count]) => ({
          name,
          value: count,
        })),
        priorities: Object.entries(priorityBreakdown).map(([name, count]) => ({
          name,
          value: count,
        })),
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
