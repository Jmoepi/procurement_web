/**
 * GET /api/subscribers/:id - Get subscriber
 * PUT /api/subscribers/:id - Update subscriber
 * DELETE /api/subscribers/:id - Delete subscriber
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

const SubscriberIdSchema = z.string().uuid();

const UpdateSubscriberSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(1).max(255).optional(),
  categories: z.array(z.string()).min(1).optional(),
  is_active: z.boolean().optional(),
});

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

/** ✅ Preflight */
export async function OPTIONS(request: NextRequest) {
  return handleOptions(request);
}

async function readId(context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params; // ✅ Next.js 16 typing
  const parsed = SubscriberIdSchema.safeParse(id);
  if (!parsed.success) return null;
  return parsed.data;
}

function rateLimitOrReturn(request: NextRequest) {
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
  return null;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const rl = rateLimitOrReturn(request);
    if (rl) return rl;

    const { auth, response } = await requireAuth(request);
    if (response) return withCors(request, response);

    const subscriberId = await readId(context);
    if (!subscriberId) {
      const [errorData, statusCode] = createErrorResponse(
        API_ERRORS.INVALID_REQUEST.code,
        "Invalid subscriber id",
        API_ERRORS.INVALID_REQUEST.statusCode
      );
      return withCors(request, toNextResponse(errorData, statusCode));
    }

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("subscriptions")
      .select("id,email,name,is_active,preferences,created_at,last_digest_sent_at")
      .eq("tenant_id", auth!.tenantId)
      .eq("id", subscriberId)
      .maybeSingle();

    if (error) {
      console.error("DB error (GET subscriber):", error);
      const [errorData, statusCode] = createErrorResponse(
        API_ERRORS.INTERNAL_ERROR.code,
        "Failed to fetch subscriber",
        API_ERRORS.INTERNAL_ERROR.statusCode
      );
      return withCors(request, toNextResponse(errorData, statusCode));
    }

    if (!data) {
      const [errorData, statusCode] = createErrorResponse(
        API_ERRORS.NOT_FOUND.code,
        "Subscriber not found",
        API_ERRORS.NOT_FOUND.statusCode
      );
      return withCors(request, toNextResponse(errorData, statusCode));
    }

    return withCors(request, toNextResponse(createSuccessResponse(data), 200));
  } catch (err) {
    console.error("API Error (GET /subscribers/:id):", err);
    const [errorData, statusCode] = createErrorResponse(
      API_ERRORS.INTERNAL_ERROR.code,
      "Internal server error",
      API_ERRORS.INTERNAL_ERROR.statusCode
    );
    return withCors(request, toNextResponse(errorData, statusCode));
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const rl = rateLimitOrReturn(request);
    if (rl) return rl;

    const { auth, response } = await requireAuth(request);
    if (response) return withCors(request, response);

    const subscriberId = await readId(context);
    if (!subscriberId) {
      const [errorData, statusCode] = createErrorResponse(
        API_ERRORS.INVALID_REQUEST.code,
        "Invalid subscriber id",
        API_ERRORS.INVALID_REQUEST.statusCode
      );
      return withCors(request, toNextResponse(errorData, statusCode));
    }

    const body = await request.json().catch(() => null);
    const validation = UpdateSubscriberSchema.safeParse(body);

    if (!validation.success) {
      const [errorData, statusCode] = createErrorResponse(
        API_ERRORS.VALIDATION_ERROR.code,
        "Invalid update payload",
        API_ERRORS.VALIDATION_ERROR.statusCode,
        formatZodErrors(validation.error)
      );
      return withCors(request, toNextResponse(errorData, statusCode));
    }

    const patch = validation.data;

    // Normalize email if provided
    const email = patch.email ? patch.email.trim().toLowerCase() : undefined;
    const name = patch.name ? patch.name.trim() : undefined;

    const update: Record<string, any> = {};
    if (email) update.email = email;
    if (name) update.name = name;
    if (typeof patch.is_active === "boolean") update.is_active = patch.is_active;

    if (patch.categories) {
      update.preferences = { categories: patch.categories };
    }

    if (Object.keys(update).length === 0) {
      const [errorData, statusCode] = createErrorResponse(
        API_ERRORS.INVALID_REQUEST.code,
        "No valid fields to update",
        API_ERRORS.INVALID_REQUEST.statusCode
      );
      return withCors(request, toNextResponse(errorData, statusCode));
    }

    const supabase = getSupabaseAdmin();

    // Prevent changing email to one that already exists in the same tenant
    if (email) {
      const { data: existing, error: existingError } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("tenant_id", auth!.tenantId)
        .eq("email", email)
        .neq("id", subscriberId)
        .maybeSingle();

      if (existingError) {
        console.error("DB error (email check):", existingError);
        const [errorData, statusCode] = createErrorResponse(
          API_ERRORS.INTERNAL_ERROR.code,
          "Failed to validate email",
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
    }

    const { data: updated, error: updateError } = await supabase
      .from("subscriptions")
      .update(update)
      .eq("tenant_id", auth!.tenantId)
      .eq("id", subscriberId)
      .select("id,email,name,is_active,preferences,created_at,last_digest_sent_at")
      .maybeSingle();

    if (updateError) {
      console.error("DB error (PUT subscriber):", updateError);
      const [errorData, statusCode] = createErrorResponse(
        API_ERRORS.INTERNAL_ERROR.code,
        "Failed to update subscriber",
        API_ERRORS.INTERNAL_ERROR.statusCode
      );
      return withCors(request, toNextResponse(errorData, statusCode));
    }

    if (!updated) {
      const [errorData, statusCode] = createErrorResponse(
        API_ERRORS.NOT_FOUND.code,
        "Subscriber not found",
        API_ERRORS.NOT_FOUND.statusCode
      );
      return withCors(request, toNextResponse(errorData, statusCode));
    }

    return withCors(request, toNextResponse(createSuccessResponse(updated), 200));
  } catch (err) {
    console.error("API Error (PUT /subscribers/:id):", err);
    const [errorData, statusCode] = createErrorResponse(
      API_ERRORS.INTERNAL_ERROR.code,
      "Internal server error",
      API_ERRORS.INTERNAL_ERROR.statusCode
    );
    return withCors(request, toNextResponse(errorData, statusCode));
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const rl = rateLimitOrReturn(request);
    if (rl) return rl;

    const { auth, response } = await requireAuth(request);
    if (response) return withCors(request, response);

    const subscriberId = await readId(context);
    if (!subscriberId) {
      const [errorData, statusCode] = createErrorResponse(
        API_ERRORS.INVALID_REQUEST.code,
        "Invalid subscriber id",
        API_ERRORS.INVALID_REQUEST.statusCode
      );
      return withCors(request, toNextResponse(errorData, statusCode));
    }

    const supabase = getSupabaseAdmin();

    const { error: delError } = await supabase
      .from("subscriptions")
      .delete()
      .eq("tenant_id", auth!.tenantId)
      .eq("id", subscriberId);

    if (delError) {
      console.error("DB error (DELETE subscriber):", delError);
      const [errorData, statusCode] = createErrorResponse(
        API_ERRORS.INTERNAL_ERROR.code,
        "Failed to delete subscriber",
        API_ERRORS.INTERNAL_ERROR.statusCode
      );
      return withCors(request, toNextResponse(errorData, statusCode));
    }

    return withCors(request, toNextResponse(createSuccessResponse({ ok: true }), 200));
  } catch (err) {
    console.error("API Error (DELETE /subscribers/:id):", err);
    const [errorData, statusCode] = createErrorResponse(
      API_ERRORS.INTERNAL_ERROR.code,
      "Internal server error",
      API_ERRORS.INTERNAL_ERROR.statusCode
    );
    return withCors(request, toNextResponse(errorData, statusCode));
  }
}
