/**
 * GET /api/subscribers - List email subscribers
 * POST /api/subscribers - Create new subscriber
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
import { handleOptions, withCors } from "@/lib/cors";

const rateLimiter = createRateLimiter(60 * 60 * 1000, 100);

const CreateSubscriberSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(255),
  categories: z.array(z.string()).min(1),
  is_active: z.boolean().optional().default(true),
});

// ✅ Fix TS7053: strongly type plan + map
const PlanSchema = z.enum(["starter", "pro", "enterprise"]);
type Plan = z.infer<typeof PlanSchema>;

const MAX_SUBSCRIBERS: Record<Plan, number | null> = {
  starter: 1,
  pro: 20,
  enterprise: null,
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

function parsePagination(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const limitRaw = parseInt(searchParams.get("limit") || "20", 10);
  const offsetRaw = parseInt(searchParams.get("offset") || "0", 10);

  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(limitRaw, 1), 100)
    : 20;
  const offset = Number.isFinite(offsetRaw) ? Math.max(offsetRaw, 0) : 0;

  return { limit, offset };
}

/** ✅ Handles CORS preflight */
export async function OPTIONS(request: NextRequest) {
  return handleOptions(request);
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
      return withCors(request, toNextResponse(errorData, statusCode));
    }

    const { auth, response } = await requireAuth(request);
    if (response) return withCors(request, response);

    const { limit, offset } = parsePagination(request);
    const supabase = getSupabaseAdmin();

    const { data: subscribers, count, error } = await supabase
      .from("subscriptions")
      .select("id,email,name,is_active,preferences,created_at,last_digest_sent_at", {
        count: "exact",
      })
      .eq("tenant_id", auth!.tenantId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Database error (GET /subscribers):", error);
      const [errorData, statusCode] = createErrorResponse(
        API_ERRORS.INTERNAL_ERROR.code,
        "Failed to fetch subscribers",
        API_ERRORS.INTERNAL_ERROR.statusCode
      );
      return withCors(request, toNextResponse(errorData, statusCode));
    }

    const responseData = createSuccessResponse({
      subscribers: subscribers ?? [],
      pagination: {
        total: count ?? 0,
        limit,
        offset,
        hasMore: (count ?? 0) > offset + limit,
      },
    });

    return withCors(request, toNextResponse(responseData, 200));
  } catch (error) {
    console.error("API Error (GET /subscribers):", error);
    const [errorData, statusCode] = createErrorResponse(
      API_ERRORS.INTERNAL_ERROR.code,
      "Internal server error",
      API_ERRORS.INTERNAL_ERROR.statusCode
    );
    return withCors(request, toNextResponse(errorData, statusCode));
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
      return withCors(request, toNextResponse(errorData, statusCode));
    }

    const { auth, response } = await requireAuth(request);
    if (response) return withCors(request, response);

    const body = await request.json().catch(() => null);
    const validation = CreateSubscriberSchema.safeParse(body);

    if (!validation.success) {
      const [errorData, statusCode] = createErrorResponse(
        API_ERRORS.VALIDATION_ERROR.code,
        "Invalid subscriber data",
        API_ERRORS.VALIDATION_ERROR.statusCode,
        formatZodErrors(validation.error)
      );
      return withCors(request, toNextResponse(errorData, statusCode));
    }

    const supabase = getSupabaseAdmin();

    const email = validation.data.email.trim().toLowerCase();
    const name = validation.data.name.trim();
    const categories = validation.data.categories;
    const is_active = validation.data.is_active;

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
      return withCors(request, toNextResponse(errorData, statusCode));
    }

    const plan: Plan = PlanSchema.catch("starter").parse(tenant?.plan);
    const maxSubscribers = MAX_SUBSCRIBERS[plan];

    const { count: subscriberCount, error: countError } = await supabase
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", auth!.tenantId);

    if (countError) {
      console.error("Database error (subscriber count):", countError);
      const [errorData, statusCode] = createErrorResponse(
        API_ERRORS.INTERNAL_ERROR.code,
        "Failed to check subscriber limit",
        API_ERRORS.INTERNAL_ERROR.statusCode
      );
      return withCors(request, toNextResponse(errorData, statusCode));
    }

    if (maxSubscribers !== null && (subscriberCount ?? 0) >= maxSubscribers) {
      const [errorData, statusCode] = createErrorResponse(
        API_ERRORS.CONFLICT.code,
        `Maximum subscribers limit (${maxSubscribers}) reached for your plan (${plan})`,
        API_ERRORS.CONFLICT.statusCode
      );
      return withCors(request, toNextResponse(errorData, statusCode));
    }

    const { data: existing, error: existingError } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("tenant_id", auth!.tenantId)
      .eq("email", email)
      .maybeSingle();

    if (existingError) {
      console.error("Database error (existing check):", existingError);
      const [errorData, statusCode] = createErrorResponse(
        API_ERRORS.INTERNAL_ERROR.code,
        "Failed to check existing subscriber",
        API_ERRORS.INTERNAL_ERROR.statusCode
      );
      return withCors(request, toNextResponse(errorData, statusCode));
    }

    if (existing?.id) {
      const [errorData, statusCode] = createErrorResponse(
        API_ERRORS.CONFLICT.code,
        "Email already subscribed",
        API_ERRORS.CONFLICT.statusCode
      );
      return withCors(request, toNextResponse(errorData, statusCode));
    }

    const { data: newSubscriber, error: insertError } = await supabase
      .from("subscriptions")
      .insert({
        tenant_id: auth!.tenantId,
        email,
        name,
        preferences: { categories },
        is_active,
      })
      .select("id,email,name,is_active,preferences,created_at,last_digest_sent_at")
      .single();

    if (insertError) {
      console.error("Insert error (POST /subscribers):", insertError);
      const [errorData, statusCode] = createErrorResponse(
        API_ERRORS.INTERNAL_ERROR.code,
        "Failed to create subscriber",
        API_ERRORS.INTERNAL_ERROR.statusCode
      );
      return withCors(request, toNextResponse(errorData, statusCode));
    }

    const responseData = createSuccessResponse(newSubscriber);
    return withCors(request, toNextResponse(responseData, 201));
  } catch (error) {
    console.error("API Error (POST /subscribers):", error);
    const [errorData, statusCode] = createErrorResponse(
      API_ERRORS.INTERNAL_ERROR.code,
      "Internal server error",
      API_ERRORS.INTERNAL_ERROR.statusCode
    );
    return withCors(request, toNextResponse(errorData, statusCode));
  }
}
