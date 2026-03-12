/**
 * GET /api/analytics/trends - Tender trends over time
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

const rateLimiter = createRateLimiter(60 * 60 * 1000, 100);

const QuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
  groupBy: z.enum(["day", "week", "month"]).default("day"),
});

type GroupBy = z.infer<typeof QuerySchema>["groupBy"];

function getPeriodKey(date: Date, groupBy: GroupBy) {
  if (groupBy === "month") {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  }

  if (groupBy === "week") {
    const weekStart = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
    );
    const day = (weekStart.getUTCDay() + 6) % 7;
    weekStart.setUTCDate(weekStart.getUTCDate() - day);
    return weekStart.toISOString().slice(0, 10);
  }

  return date.toISOString().slice(0, 10);
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

    const parsed = QuerySchema.safeParse({
      days: request.nextUrl.searchParams.get("days") ?? "30",
      groupBy: request.nextUrl.searchParams.get("groupBy") ?? "day",
    });

    if (!parsed.success) {
      const [errorData, statusCode] = createErrorResponse(
        API_ERRORS.VALIDATION_ERROR.code,
        "Invalid query parameters",
        API_ERRORS.VALIDATION_ERROR.statusCode,
        formatZodErrors(parsed.error)
      );
      return toNextResponse(errorData, statusCode);
    }

    const { days, groupBy } = parsed.data;
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setUTCDate(startDate.getUTCDate() - days);

    const { url, serviceRoleKey } = getSupabaseServiceRoleConfig();
    const supabase = createClient(url, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { data: tenders, error } = await supabase
      .from("tenders")
      .select("created_at, category, priority")
      .eq("tenant_id", auth!.tenantId)
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString())
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Database error (GET /analytics/trends):", error);
      const [errorData, statusCode] = createErrorResponse(
        API_ERRORS.INTERNAL_ERROR.code,
        "Failed to fetch trend data",
        API_ERRORS.INTERNAL_ERROR.statusCode
      );
      return toNextResponse(errorData, statusCode);
    }

    const timelineMap = new Map<
      string,
      {
        period: string;
        total: number;
        categories: Record<string, number>;
        priorities: Record<string, number>;
      }
    >();

    for (const tender of tenders ?? []) {
      const period = getPeriodKey(new Date(tender.created_at), groupBy);

      if (!timelineMap.has(period)) {
        timelineMap.set(period, {
          period,
          total: 0,
          categories: {},
          priorities: {},
        });
      }

      const entry = timelineMap.get(period)!;
      const category = tender.category ?? "unknown";
      const priority = tender.priority ?? "unknown";

      entry.total += 1;
      entry.categories[category] = (entry.categories[category] ?? 0) + 1;
      entry.priorities[priority] = (entry.priorities[priority] ?? 0) + 1;
    }

    const timeline = Array.from(timelineMap.values()).sort((a, b) =>
      a.period.localeCompare(b.period)
    );

    const peakEntry = timeline.reduce<(typeof timeline)[number] | null>(
      (peak, entry) => {
        if (!peak || entry.total > peak.total) {
          return entry;
        }
        return peak;
      },
      null
    );

    const responseData = createSuccessResponse({
      metadata: {
        days,
        groupBy,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        total_tenders: tenders?.length ?? 0,
      },
      timeline,
      summary: {
        average_per_period:
          timeline.length > 0
            ? Number(
                (
                  timeline.reduce((sum, entry) => sum + entry.total, 0) /
                  timeline.length
                ).toFixed(1)
              )
            : 0,
        peak_period: peakEntry?.period ?? null,
        peak_count: peakEntry?.total ?? 0,
      },
    });

    return toNextResponse(responseData, 200);
  } catch (error) {
    console.error("API Error (GET /analytics/trends):", error);
    const [errorData, statusCode] = createErrorResponse(
      API_ERRORS.INTERNAL_ERROR.code,
      "Internal server error",
      API_ERRORS.INTERNAL_ERROR.statusCode
    );
    return toNextResponse(errorData, statusCode);
  }
}
