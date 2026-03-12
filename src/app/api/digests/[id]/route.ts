/**
 * GET /api/digests/:id - Get digest details with included tenders
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
} from "@/lib/api-errors";
import { requireAuth } from "@/lib/api-auth";

const rateLimiter = createRateLimiter(60 * 60 * 1000, 100);

const DigestIdSchema = z.string().uuid();

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing Supabase env vars (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)"
    );
  }

  return createClient(url, key, { auth: { persistSession: false } });
}

type TenderRow = {
  id: string;
  title: string;
  category: string;
  priority: string;
  source: { name: string } | null;
};

// Supabase joins can return an array depending on relationship inference
type TenderRowRaw = {
  id: string;
  title: string;
  category: string;
  priority: string;
  source?: { name: string }[] | { name: string } | null;
};

type CountMap = Record<string, number>;

function rankPriority(p: string) {
  const v = (p || "").toLowerCase();
  if (v === "urgent") return 4;
  if (v === "high") return 3;
  if (v === "medium") return 2;
  if (v === "low") return 1;
  return 0;
}

function normalizeSource(
  source: TenderRowRaw["source"]
): { name: string } | null {
  if (!source) return null;
  if (Array.isArray(source)) return source[0] ?? null;
  return source;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> } // ✅ Next.js 16 expects params as Promise
) {
  try {
    // Rate limit
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

    // Auth
    const { auth, response } = await requireAuth(request);
    if (response) return response;

    // ✅ Await params (Next.js 16 typing)
    const { id } = await context.params;

    const parsedId = DigestIdSchema.safeParse(id);
    if (!parsedId.success) {
      const [errorData, statusCode] = createErrorResponse(
        API_ERRORS.INVALID_REQUEST.code,
        "Invalid digest id",
        API_ERRORS.INVALID_REQUEST.statusCode
      );
      return toNextResponse(errorData, statusCode);
    }

    const digestId = parsedId.data;
    const supabase = getSupabaseAdmin();

    // Fetch digest run
    const { data: digest, error: digestError } = await supabase
      .from("digest_runs")
      .select(
        "id, tenant_id, run_date, status, started_at, finished_at, logs, tenders_included"
      )
      .eq("id", digestId)
      .eq("tenant_id", auth!.tenantId)
      .maybeSingle();

    if (digestError) {
      console.error("Database error (digest_runs):", digestError);
      const [errorData, statusCode] = createErrorResponse(
        API_ERRORS.INTERNAL_ERROR.code,
        "Failed to fetch digest",
        API_ERRORS.INTERNAL_ERROR.statusCode
      );
      return toNextResponse(errorData, statusCode);
    }

    if (!digest) {
      const [errorData, statusCode] = createErrorResponse(
        API_ERRORS.NOT_FOUND.code,
        "Digest not found",
        API_ERRORS.NOT_FOUND.statusCode
      );
      return toNextResponse(errorData, statusCode);
    }

    // Extract tender IDs safely
    const tenderIds: string[] = Array.isArray(digest.tenders_included)
      ? digest.tenders_included.filter(
          (x: unknown): x is string => typeof x === "string"
        )
      : [];

    let tendersData: TenderRow[] = [];

    if (tenderIds.length > 0) {
      const { data: tendersRaw, error: tendersError } = await supabase
        .from("tenders")
        .select("id, title, category, priority, source:sources(name)")
        .eq("tenant_id", auth!.tenantId)
        .in("id", tenderIds);

      if (tendersError) {
        console.error("Database error (tenders):", tendersError);
        const [errorData, statusCode] = createErrorResponse(
          API_ERRORS.INTERNAL_ERROR.code,
          "Failed to fetch tenders for digest",
          API_ERRORS.INTERNAL_ERROR.statusCode
        );
        return toNextResponse(errorData, statusCode);
      }

      const normalized: TenderRow[] = ((tendersRaw ?? []) as unknown as TenderRowRaw[]).map(
        (t) => ({
          id: String(t.id),
          title: String(t.title),
          category: String(t.category),
          priority: String(t.priority),
          source: normalizeSource(t.source),
        })
      );

      tendersData = normalized.sort(
        (a, b) => rankPriority(b.priority) - rankPriority(a.priority)
      );
    }

    const byCategory = tendersData.reduce<CountMap>((acc, t) => {
      const key = t.category || "unknown";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});

    const byPriority = tendersData.reduce<CountMap>((acc, t) => {
      const key = t.priority || "unknown";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});

    const responseData = createSuccessResponse({
      digest,
      tenders: tendersData,
      summary: {
        total_tenders: tendersData.length,
        by_category: byCategory,
        by_priority: byPriority,
      },
    });

    return toNextResponse(responseData, 200);
  } catch (error) {
    console.error("API Error (GET /digests/:id):", error);
    const [errorData, statusCode] = createErrorResponse(
      API_ERRORS.INTERNAL_ERROR.code,
      "Internal server error",
      API_ERRORS.INTERNAL_ERROR.statusCode
    );
    return toNextResponse(errorData, statusCode);
  }
}
