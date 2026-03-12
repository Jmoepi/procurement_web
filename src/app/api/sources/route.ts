/**
 * GET /api/sources - List data sources for authenticated user
 * POST /api/sources - Create a new data source
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

const rateLimiter = createRateLimiter(60 * 60 * 1000, 100);

const CreateSourceSchema = z.object({
  name: z.string().min(1).max(255),
  url: z.string().url(),
  type: z.enum(["portal", "company"]),
  requires_js: z.boolean().optional().default(false),
  crawl_frequency: z.enum(["daily", "weekly"]).optional().default("daily"),
  categories: z.array(z.string()).optional(),
});

// --- Plan typing (fixes TS7053) ---
const PlanSchema = z.enum(["starter", "pro", "enterprise"]);
type Plan = z.infer<typeof PlanSchema>;

const MAX_SOURCES: Record<Plan, number | null> = {
  starter: 30,
  pro: 150,
  enterprise: null, // unlimited
};

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

export async function GET(request: NextRequest) {
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

    const supabase = getSupabaseAdmin();

    const { data: sources, error } = await supabase
      .from("sources")
      .select("*")
      .eq("tenant_id", auth!.tenantId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Database error (GET /sources):", error);
      const [errorData, statusCode] = createErrorResponse(
        API_ERRORS.INTERNAL_ERROR.code,
        "Failed to fetch sources",
        API_ERRORS.INTERNAL_ERROR.statusCode
      );
      return toNextResponse(errorData, statusCode);
    }

    const responseData = createSuccessResponse({
      sources: sources ?? [],
      count: sources?.length ?? 0,
    });

    return toNextResponse(responseData, 200);
  } catch (error) {
    console.error("API Error (GET /sources):", error);
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

    // Validate body
    const body = await request.json().catch(() => null);
    const validation = CreateSourceSchema.safeParse(body);

    if (!validation.success) {
      const [errorData, statusCode] = createErrorResponse(
        API_ERRORS.VALIDATION_ERROR.code,
        "Invalid source data",
        API_ERRORS.VALIDATION_ERROR.statusCode,
        formatZodErrors(validation.error)
      );
      return toNextResponse(errorData, statusCode);
    }

    const supabase = getSupabaseAdmin();

    // Fetch tenant plan (use maybeSingle to avoid thrown errors when missing)
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .select("plan")
      .eq("id", auth!.tenantId)
      .maybeSingle();

    if (tenantError) {
      console.error("Database error (tenant plan):", tenantError);
      const [errorData, statusCode] = createErrorResponse(
        API_ERRORS.INTERNAL_ERROR.code,
        "Failed to validate tenant plan",
        API_ERRORS.INTERNAL_ERROR.statusCode
      );
      return toNextResponse(errorData, statusCode);
    }

    const plan: Plan = PlanSchema.catch("starter").parse(tenant?.plan);
    const maxSources = MAX_SOURCES[plan];

    // Count current sources for tenant (head:true avoids fetching rows)
    const { count: sourceCount, error: countError } = await supabase
      .from("sources")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", auth!.tenantId);

    if (countError) {
      console.error("Database error (source count):", countError);
      const [errorData, statusCode] = createErrorResponse(
        API_ERRORS.INTERNAL_ERROR.code,
        "Failed to check source limit",
        API_ERRORS.INTERNAL_ERROR.statusCode
      );
      return toNextResponse(errorData, statusCode);
    }

    if (maxSources !== null && (sourceCount ?? 0) >= maxSources) {
      const [errorData, statusCode] = createErrorResponse(
        API_ERRORS.CONFLICT.code,
        `Maximum sources limit (${maxSources}) reached for your plan (${plan})`,
        API_ERRORS.CONFLICT.statusCode
      );
      return toNextResponse(errorData, statusCode);
    }

    // Optional: prevent duplicate URLs within tenant
    const normalizedUrl = validation.data.url.trim();

    const { data: existing, error: existingError } = await supabase
      .from("sources")
      .select("id")
      .eq("tenant_id", auth!.tenantId)
      .eq("url", normalizedUrl)
      .maybeSingle();

    if (existingError) {
      console.error("Database error (existing source check):", existingError);
      const [errorData, statusCode] = createErrorResponse(
        API_ERRORS.INTERNAL_ERROR.code,
        "Failed to check existing source",
        API_ERRORS.INTERNAL_ERROR.statusCode
      );
      return toNextResponse(errorData, statusCode);
    }

    if (existing?.id) {
      const [errorData, statusCode] = createErrorResponse(
        API_ERRORS.CONFLICT.code,
        "Source URL already exists for this tenant",
        API_ERRORS.CONFLICT.statusCode
      );
      return toNextResponse(errorData, statusCode);
    }

    // Insert new source
    const { data: newSource, error: insertError } = await supabase
      .from("sources")
      .insert({
        tenant_id: auth!.tenantId,
        name: validation.data.name.trim(),
        url: normalizedUrl,
        type: validation.data.type,
        requires_js: validation.data.requires_js,
        crawl_frequency: validation.data.crawl_frequency,
        categories: validation.data.categories ?? [],
      })
      .select("*")
      .single();

    if (insertError) {
      console.error("Insert error (POST /sources):", insertError);
      const [errorData, statusCode] = createErrorResponse(
        API_ERRORS.INTERNAL_ERROR.code,
        "Failed to create source",
        API_ERRORS.INTERNAL_ERROR.statusCode
      );
      return toNextResponse(errorData, statusCode);
    }

    const responseData = createSuccessResponse(newSource);
    return toNextResponse(responseData, 201);
  } catch (error) {
    console.error("API Error (POST /sources):", error);
    const [errorData, statusCode] = createErrorResponse(
      API_ERRORS.INTERNAL_ERROR.code,
      "Internal server error",
      API_ERRORS.INTERNAL_ERROR.statusCode
    );
    return toNextResponse(errorData, statusCode);
  }
}
