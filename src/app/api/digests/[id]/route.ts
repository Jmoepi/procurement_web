/**
 * GET /api/digests/:id - Get digest details with included tenders
 * PATCH /api/digests/:id - Retry or cancel a digest run
 */

import { after, NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import {
  createDurableRateLimiter,
  getClientIdentifier,
} from "@/lib/rate-limiter";
import {
  createErrorResponse,
  createSuccessResponse,
  toNextResponse,
  API_ERRORS,
} from "@/lib/api-errors";
import { requireAdmin, requireAuth } from "@/lib/api-auth";
import {
  getDigestFailureRecipients,
  getDigestJobInfo,
  getDigestRecipientCount,
  getDigestTenderCount,
  normalizeDigestStatus,
} from "@/lib/digests";
import { processDigestRunById } from "@/lib/digest-jobs";
import { getSupabaseServiceRoleConfig } from "@/lib/supabase/config";

const rateLimiter = createDurableRateLimiter(
  "api:digests:id",
  60 * 60 * 1000,
  100
);

const DigestIdSchema = z.string().uuid();
const DigestActionSchema = z.object({
  action: z.enum(["retry", "cancel"]),
});

function getSupabaseAdmin() {
  const { url, serviceRoleKey } = getSupabaseServiceRoleConfig();

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
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

type DigestMetadata = Record<string, unknown>;
type DigestRow = {
  id: string;
  tenant_id: string;
  run_date: string;
  status: string;
  tenders_found: number;
  emails_sent: number;
  started_at: string;
  finished_at: string | null;
  logs: string | null;
  error_message: string | null;
  metadata: DigestMetadata | null;
  created_at?: string;
};

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

function getDigestMetadata(value: unknown): DigestMetadata {
  return value && typeof value === "object"
    ? (value as DigestMetadata)
    : {};
}

function getDigestTenderIds(metadata: DigestMetadata) {
  const rawTenderIds = Array.isArray(metadata.tender_ids)
    ? metadata.tender_ids
    : Array.isArray(metadata.tenders_included)
      ? metadata.tenders_included
      : [];

  return [...new Set(rawTenderIds.filter((value): value is string => typeof value === "string"))];
}

function serializeDigest(digest: DigestRow) {
  return {
    ...digest,
    status: normalizeDigestStatus(digest.status),
    job: getDigestJobInfo(digest),
  };
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> } // ✅ Next.js 16 expects params as Promise
) {
  try {
    // Rate limit
    const clientId = getClientIdentifier(request);
    const rateLimit = await rateLimiter(clientId);
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
        "id, tenant_id, run_date, status, tenders_found, emails_sent, started_at, finished_at, logs, error_message, metadata, created_at"
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

    const digestRow = digest as DigestRow;
    const metadata = getDigestMetadata(digestRow.metadata);

    const tenderIds = getDigestTenderIds(metadata);

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
      digest: {
        ...serializeDigest(digestRow),
      },
      tenders: tendersData,
      summary: {
        total_tenders:
          tendersData.length > 0 ? tendersData.length : getDigestTenderCount(digestRow),
        total_recipients: getDigestRecipientCount(digestRow),
        status: normalizeDigestStatus(digestRow.status),
        failed_recipients: getDigestFailureRecipients(digestRow).length,
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

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const clientId = getClientIdentifier(request);
    const rateLimit = await rateLimiter(clientId);
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

    const body = await request.json().catch(() => null);
    const validation = DigestActionSchema.safeParse(body);

    if (!validation.success) {
      const [errorData, statusCode] = createErrorResponse(
        API_ERRORS.VALIDATION_ERROR.code,
        "Invalid digest action",
        API_ERRORS.VALIDATION_ERROR.statusCode
      );
      return toNextResponse(errorData, statusCode);
    }

    const digestId = parsedId.data;
    const action = validation.data.action;
    const supabase = getSupabaseAdmin();

    const { data: digest, error: digestError } = await supabase
      .from("digest_runs")
      .select(
        "id, tenant_id, run_date, status, tenders_found, emails_sent, started_at, finished_at, logs, error_message, metadata, created_at"
      )
      .eq("id", digestId)
      .eq("tenant_id", auth!.tenantId)
      .maybeSingle();

    if (digestError) {
      console.error("Database error (PATCH /digests/:id):", digestError);
      const [errorData, statusCode] = createErrorResponse(
        API_ERRORS.INTERNAL_ERROR.code,
        "Failed to load digest",
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

    const digestRow = digest as DigestRow;
    const normalizedStatus = normalizeDigestStatus(digestRow.status);
    const metadata = getDigestMetadata(digestRow.metadata);
    const now = new Date().toISOString();

    if (action === "cancel") {
      if (normalizedStatus !== "pending" && normalizedStatus !== "running") {
        const [errorData, statusCode] = createErrorResponse(
          API_ERRORS.CONFLICT.code,
          "Only queued or running digests can be cancelled",
          API_ERRORS.CONFLICT.statusCode
        );
        return toNextResponse(errorData, statusCode);
      }

      if (normalizedStatus === "pending") {
        const { data: cancelledDigest, error: cancelError } = await supabase
          .from("digest_runs")
          .update({
            status: "fail",
            finished_at: now,
            error_message: "Digest cancelled by admin.",
            metadata: {
              ...metadata,
              cancel_requested: true,
              cancel_requested_at: now,
              cancel_requested_by: auth!.userId,
              cancelled_at: now,
              cancelled_by: auth!.userId,
              job_finished_at: now,
              job_last_status: "fail",
            },
          })
          .eq("id", digestId)
          .eq("tenant_id", auth!.tenantId)
          .eq("status", "pending")
          .select(
            "id, tenant_id, run_date, status, tenders_found, emails_sent, started_at, finished_at, logs, error_message, metadata, created_at"
          )
          .maybeSingle();

        if (cancelError) {
          console.error("Database error (cancel pending digest):", cancelError);
          const [errorData, statusCode] = createErrorResponse(
            API_ERRORS.INTERNAL_ERROR.code,
            "Failed to cancel digest",
            API_ERRORS.INTERNAL_ERROR.statusCode
          );
          return toNextResponse(errorData, statusCode);
        }

        if (!cancelledDigest) {
          const [errorData, statusCode] = createErrorResponse(
            API_ERRORS.CONFLICT.code,
            "Digest state changed before it could be cancelled",
            API_ERRORS.CONFLICT.statusCode
          );
          return toNextResponse(errorData, statusCode);
        }

        return toNextResponse(
          createSuccessResponse({
            digest: serializeDigest(cancelledDigest as DigestRow),
            message: "Digest cancelled.",
          }),
          200
        );
      }

      if (
        metadata.cancel_requested === true ||
        typeof metadata.cancel_requested_at === "string"
      ) {
        return toNextResponse(
          createSuccessResponse({
            digest: serializeDigest(digestRow),
            message: "Cancellation has already been requested for this digest.",
          }),
          202
        );
      }

      const { data: queuedCancelDigest, error: queuedCancelError } = await supabase
        .from("digest_runs")
        .update({
          metadata: {
            ...metadata,
            cancel_requested: true,
            cancel_requested_at: now,
            cancel_requested_by: auth!.userId,
          },
        })
        .eq("id", digestId)
        .eq("tenant_id", auth!.tenantId)
        .eq("status", "running")
        .select(
          "id, tenant_id, run_date, status, tenders_found, emails_sent, started_at, finished_at, logs, error_message, metadata, created_at"
        )
        .maybeSingle();

      if (queuedCancelError) {
        console.error("Database error (cancel running digest):", queuedCancelError);
        const [errorData, statusCode] = createErrorResponse(
          API_ERRORS.INTERNAL_ERROR.code,
          "Failed to request digest cancellation",
          API_ERRORS.INTERNAL_ERROR.statusCode
        );
        return toNextResponse(errorData, statusCode);
      }

      if (!queuedCancelDigest) {
        const [errorData, statusCode] = createErrorResponse(
          API_ERRORS.CONFLICT.code,
          "Digest state changed before cancellation could be requested",
          API_ERRORS.CONFLICT.statusCode
        );
        return toNextResponse(errorData, statusCode);
      }

      return toNextResponse(
        createSuccessResponse({
          digest: serializeDigest(queuedCancelDigest as DigestRow),
          message: "Cancellation requested. The current send will stop shortly.",
        }),
        202
      );
    }

    if (normalizedStatus === "pending" || normalizedStatus === "running") {
      const [errorData, statusCode] = createErrorResponse(
        API_ERRORS.CONFLICT.code,
        "Only completed or failed digests can be retried",
        API_ERRORS.CONFLICT.statusCode
      );
      return toNextResponse(errorData, statusCode);
    }

    const { data: activeDigest } = await supabase
      .from("digest_runs")
      .select("id")
      .eq("tenant_id", auth!.tenantId)
      .in("status", ["pending", "running"])
      .limit(1)
      .maybeSingle();

    if (activeDigest) {
      const [errorData, statusCode] = createErrorResponse(
        API_ERRORS.CONFLICT.code,
        "Another digest is already queued or running for this workspace",
        API_ERRORS.CONFLICT.statusCode
      );
      return toNextResponse(errorData, statusCode);
    }

    const { data: retryDigest, error: retryError } = await supabase
      .from("digest_runs")
      .insert({
        tenant_id: auth!.tenantId,
        run_date: new Date().toISOString().slice(0, 10),
        tenders_found: 0,
        emails_sent: 0,
        status: "pending",
        error_message: null,
        metadata: {
          manual_triggered: true,
          triggered_at: now,
          triggered_by: auth!.userId,
          retry_of: digestId,
          retry_of_status: digestRow.status,
          retry_requested_at: now,
          retry_requested_by: auth!.userId,
          tender_ids: getDigestTenderIds(metadata),
        },
      })
      .select(
        "id, tenant_id, run_date, status, tenders_found, emails_sent, started_at, finished_at, logs, error_message, metadata, created_at"
      )
      .single();

    if (retryError) {
      console.error("Database error (retry digest):", retryError);
      const [errorData, statusCode] = createErrorResponse(
        API_ERRORS.INTERNAL_ERROR.code,
        "Failed to queue digest retry",
        API_ERRORS.INTERNAL_ERROR.statusCode
      );
      return toNextResponse(errorData, statusCode);
    }

    after(async () => {
      const result = await processDigestRunById({
        digestId: retryDigest.id,
        expectedTenantId: auth!.tenantId,
      });

      if (result.status === "failed") {
        console.error("Background digest retry failed", {
          digestId: result.digestId,
          tenantId: result.tenantId,
          message: result.message,
        });
      }
    });

    return toNextResponse(
      createSuccessResponse({
        digest: serializeDigest(retryDigest as DigestRow),
        message: "Digest retry queued. Delivery will continue in the background.",
      }),
      202
    );
  } catch (error) {
    console.error("API Error (PATCH /digests/:id):", error);
    const [errorData, statusCode] = createErrorResponse(
      API_ERRORS.INTERNAL_ERROR.code,
      "Internal server error",
      API_ERRORS.INTERNAL_ERROR.statusCode
    );
    return toNextResponse(errorData, statusCode);
  }
}
