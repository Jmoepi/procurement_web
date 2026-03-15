/**
 * PATCH /api/sources/:id - Update a source
 * DELETE /api/sources/:id - Delete a source
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { createRateLimiter, getClientIdentifier } from "@/lib/rate-limiter";
import {
  API_ERRORS,
  createErrorResponse,
  createSuccessResponse,
  formatZodErrors,
  toNextResponse,
} from "@/lib/api-errors";
import { requireAdmin, requireAuth } from "@/lib/api-auth";
import { getSupabaseServiceRoleConfig } from "@/lib/supabase/config";

const rateLimiter = createRateLimiter(60 * 60 * 1000, 100);
const SourceIdSchema = z.string().uuid();

const UpdateSourceSchema = z
  .object({
    enabled: z.boolean().optional(),
    name: z.string().min(1).max(255).optional(),
    url: z.string().url().optional(),
    type: z.enum(["portal", "company"]).optional(),
    requires_js: z.boolean().optional(),
    crawl_frequency: z.enum(["daily", "weekly"]).optional(),
    tags: z.array(z.string()).optional(),
    categories: z.array(z.string()).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  });

function getSupabaseAdmin() {
  const { url, serviceRoleKey } = getSupabaseServiceRoleConfig();
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

async function readId(context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const parsed = SourceIdSchema.safeParse(id);
  return parsed.success ? parsed.data : null;
}

function rateLimitResponse(request: NextRequest) {
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

  return null;
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const rateLimited = rateLimitResponse(request);
    if (rateLimited) return rateLimited;

    const { auth, response } = await requireAuth(request);
    if (response) return response;
    const adminResponse = requireAdmin(auth!);
    if (adminResponse) return adminResponse;

    const sourceId = await readId(context);
    if (!sourceId) {
      const [errorData, statusCode] = createErrorResponse(
        API_ERRORS.INVALID_REQUEST.code,
        "Invalid source id",
        API_ERRORS.INVALID_REQUEST.statusCode
      );
      return toNextResponse(errorData, statusCode);
    }

    const body = await request.json().catch(() => null);
    const validation = UpdateSourceSchema.safeParse(body);

    if (!validation.success) {
      const [errorData, statusCode] = createErrorResponse(
        API_ERRORS.VALIDATION_ERROR.code,
        "Invalid source update payload",
        API_ERRORS.VALIDATION_ERROR.statusCode,
        formatZodErrors(validation.error)
      );
      return toNextResponse(errorData, statusCode);
    }

    const payload = validation.data;
    const update: Record<string, unknown> = {};

    if (typeof payload.enabled === "boolean") update.enabled = payload.enabled;
    if (typeof payload.name === "string") update.name = payload.name.trim();
    if (typeof payload.url === "string") update.url = payload.url.trim();
    if (typeof payload.type === "string") update.type = payload.type;
    if (typeof payload.requires_js === "boolean") update.requires_js = payload.requires_js;
    if (typeof payload.crawl_frequency === "string") {
      update.crawl_frequency = payload.crawl_frequency;
    }
    if (payload.tags) update.tags = payload.tags;
    if (payload.categories) update.categories = payload.categories;

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("sources")
      .update(update)
      .eq("tenant_id", auth!.tenantId)
      .eq("id", sourceId)
      .select("*")
      .maybeSingle();

    if (error) {
      console.error("Database error (PATCH /sources/:id):", error);
      const [errorData, statusCode] = createErrorResponse(
        API_ERRORS.INTERNAL_ERROR.code,
        "Failed to update source",
        API_ERRORS.INTERNAL_ERROR.statusCode
      );
      return toNextResponse(errorData, statusCode);
    }

    if (!data) {
      const [errorData, statusCode] = createErrorResponse(
        API_ERRORS.NOT_FOUND.code,
        "Source not found",
        API_ERRORS.NOT_FOUND.statusCode
      );
      return toNextResponse(errorData, statusCode);
    }

    return toNextResponse(createSuccessResponse(data), 200);
  } catch (error) {
    console.error("API Error (PATCH /sources/:id):", error);
    const [errorData, statusCode] = createErrorResponse(
      API_ERRORS.INTERNAL_ERROR.code,
      "Internal server error",
      API_ERRORS.INTERNAL_ERROR.statusCode
    );
    return toNextResponse(errorData, statusCode);
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const rateLimited = rateLimitResponse(request);
    if (rateLimited) return rateLimited;

    const { auth, response } = await requireAuth(request);
    if (response) return response;
    const adminResponse = requireAdmin(auth!);
    if (adminResponse) return adminResponse;

    const sourceId = await readId(context);
    if (!sourceId) {
      const [errorData, statusCode] = createErrorResponse(
        API_ERRORS.INVALID_REQUEST.code,
        "Invalid source id",
        API_ERRORS.INVALID_REQUEST.statusCode
      );
      return toNextResponse(errorData, statusCode);
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("sources")
      .delete()
      .eq("tenant_id", auth!.tenantId)
      .eq("id", sourceId);

    if (error) {
      console.error("Database error (DELETE /sources/:id):", error);
      const [errorData, statusCode] = createErrorResponse(
        API_ERRORS.INTERNAL_ERROR.code,
        "Failed to delete source",
        API_ERRORS.INTERNAL_ERROR.statusCode
      );
      return toNextResponse(errorData, statusCode);
    }

    return toNextResponse(createSuccessResponse({ ok: true }), 200);
  } catch (error) {
    console.error("API Error (DELETE /sources/:id):", error);
    const [errorData, statusCode] = createErrorResponse(
      API_ERRORS.INTERNAL_ERROR.code,
      "Internal server error",
      API_ERRORS.INTERNAL_ERROR.statusCode
    );
    return toNextResponse(errorData, statusCode);
  }
}
