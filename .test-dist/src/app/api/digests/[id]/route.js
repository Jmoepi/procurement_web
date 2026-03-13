"use strict";
/**
 * GET /api/digests/:id - Get digest details with included tenders
 * PATCH /api/digests/:id - Retry or cancel a digest run
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.PATCH = PATCH;
const server_1 = require("next/server");
const zod_1 = require("zod");
const supabase_js_1 = require("@supabase/supabase-js");
const rate_limiter_1 = require("@/lib/rate-limiter");
const api_errors_1 = require("@/lib/api-errors");
const api_auth_1 = require("@/lib/api-auth");
const digests_1 = require("@/lib/digests");
const digest_jobs_1 = require("@/lib/digest-jobs");
const config_1 = require("@/lib/supabase/config");
const rateLimiter = (0, rate_limiter_1.createDurableRateLimiter)("api:digests:id", 60 * 60 * 1000, 100);
const DigestIdSchema = zod_1.z.string().uuid();
const DigestActionSchema = zod_1.z.object({
    action: zod_1.z.enum(["retry", "cancel"]),
});
function getSupabaseAdmin() {
    const { url, serviceRoleKey } = (0, config_1.getSupabaseServiceRoleConfig)();
    return (0, supabase_js_1.createClient)(url, serviceRoleKey, {
        auth: { persistSession: false },
    });
}
function rankPriority(p) {
    const v = (p || "").toLowerCase();
    if (v === "urgent")
        return 4;
    if (v === "high")
        return 3;
    if (v === "medium")
        return 2;
    if (v === "low")
        return 1;
    return 0;
}
function normalizeSource(source) {
    if (!source)
        return null;
    if (Array.isArray(source))
        return source[0] ?? null;
    return source;
}
function getDigestMetadata(value) {
    return value && typeof value === "object"
        ? value
        : {};
}
function serializeDigest(digest) {
    return {
        ...digest,
        status: (0, digests_1.normalizeDigestStatus)(digest.status),
        job: (0, digests_1.getDigestJobInfo)(digest),
    };
}
async function GET(request, context // ✅ Next.js 16 expects params as Promise
) {
    try {
        // Rate limit
        const clientId = (0, rate_limiter_1.getClientIdentifier)(request);
        const rateLimit = await rateLimiter(clientId);
        if (!rateLimit.allowed) {
            const [errorData, statusCode] = (0, api_errors_1.createErrorResponse)(api_errors_1.API_ERRORS.RATE_LIMITED.code, "Too many requests", api_errors_1.API_ERRORS.RATE_LIMITED.statusCode);
            return (0, api_errors_1.toNextResponse)(errorData, statusCode);
        }
        // Auth
        const { auth, response } = await (0, api_auth_1.requireAuth)(request);
        if (response)
            return response;
        // ✅ Await params (Next.js 16 typing)
        const { id } = await context.params;
        const parsedId = DigestIdSchema.safeParse(id);
        if (!parsedId.success) {
            const [errorData, statusCode] = (0, api_errors_1.createErrorResponse)(api_errors_1.API_ERRORS.INVALID_REQUEST.code, "Invalid digest id", api_errors_1.API_ERRORS.INVALID_REQUEST.statusCode);
            return (0, api_errors_1.toNextResponse)(errorData, statusCode);
        }
        const digestId = parsedId.data;
        const supabase = getSupabaseAdmin();
        // Fetch digest run
        const { data: digest, error: digestError } = await supabase
            .from("digest_runs")
            .select("id, tenant_id, run_date, status, tenders_found, emails_sent, started_at, finished_at, logs, error_message, metadata, created_at")
            .eq("id", digestId)
            .eq("tenant_id", auth.tenantId)
            .maybeSingle();
        if (digestError) {
            console.error("Database error (digest_runs):", digestError);
            const [errorData, statusCode] = (0, api_errors_1.createErrorResponse)(api_errors_1.API_ERRORS.INTERNAL_ERROR.code, "Failed to fetch digest", api_errors_1.API_ERRORS.INTERNAL_ERROR.statusCode);
            return (0, api_errors_1.toNextResponse)(errorData, statusCode);
        }
        if (!digest) {
            const [errorData, statusCode] = (0, api_errors_1.createErrorResponse)(api_errors_1.API_ERRORS.NOT_FOUND.code, "Digest not found", api_errors_1.API_ERRORS.NOT_FOUND.statusCode);
            return (0, api_errors_1.toNextResponse)(errorData, statusCode);
        }
        const digestRow = digest;
        const metadata = getDigestMetadata(digestRow.metadata);
        const metadataTenderIds = Array.isArray(metadata.tender_ids)
            ? metadata.tender_ids
            : Array.isArray(metadata.tenders_included)
                ? metadata.tenders_included
                : [];
        const tenderIds = metadataTenderIds.filter((value) => typeof value === "string");
        let tendersData = [];
        if (tenderIds.length > 0) {
            const { data: tendersRaw, error: tendersError } = await supabase
                .from("tenders")
                .select("id, title, category, priority, source:sources(name)")
                .eq("tenant_id", auth.tenantId)
                .in("id", tenderIds);
            if (tendersError) {
                console.error("Database error (tenders):", tendersError);
                const [errorData, statusCode] = (0, api_errors_1.createErrorResponse)(api_errors_1.API_ERRORS.INTERNAL_ERROR.code, "Failed to fetch tenders for digest", api_errors_1.API_ERRORS.INTERNAL_ERROR.statusCode);
                return (0, api_errors_1.toNextResponse)(errorData, statusCode);
            }
            const normalized = (tendersRaw ?? []).map((t) => ({
                id: String(t.id),
                title: String(t.title),
                category: String(t.category),
                priority: String(t.priority),
                source: normalizeSource(t.source),
            }));
            tendersData = normalized.sort((a, b) => rankPriority(b.priority) - rankPriority(a.priority));
        }
        const byCategory = tendersData.reduce((acc, t) => {
            const key = t.category || "unknown";
            acc[key] = (acc[key] ?? 0) + 1;
            return acc;
        }, {});
        const byPriority = tendersData.reduce((acc, t) => {
            const key = t.priority || "unknown";
            acc[key] = (acc[key] ?? 0) + 1;
            return acc;
        }, {});
        const responseData = (0, api_errors_1.createSuccessResponse)({
            digest: {
                ...serializeDigest(digestRow),
            },
            tenders: tendersData,
            summary: {
                total_tenders: tendersData.length > 0 ? tendersData.length : (0, digests_1.getDigestTenderCount)(digestRow),
                total_recipients: (0, digests_1.getDigestRecipientCount)(digestRow),
                status: (0, digests_1.normalizeDigestStatus)(digestRow.status),
                failed_recipients: (0, digests_1.getDigestFailureRecipients)(digestRow).length,
                by_category: byCategory,
                by_priority: byPriority,
            },
        });
        return (0, api_errors_1.toNextResponse)(responseData, 200);
    }
    catch (error) {
        console.error("API Error (GET /digests/:id):", error);
        const [errorData, statusCode] = (0, api_errors_1.createErrorResponse)(api_errors_1.API_ERRORS.INTERNAL_ERROR.code, "Internal server error", api_errors_1.API_ERRORS.INTERNAL_ERROR.statusCode);
        return (0, api_errors_1.toNextResponse)(errorData, statusCode);
    }
}
async function PATCH(request, context) {
    try {
        const clientId = (0, rate_limiter_1.getClientIdentifier)(request);
        const rateLimit = await rateLimiter(clientId);
        if (!rateLimit.allowed) {
            const [errorData, statusCode] = (0, api_errors_1.createErrorResponse)(api_errors_1.API_ERRORS.RATE_LIMITED.code, "Too many requests", api_errors_1.API_ERRORS.RATE_LIMITED.statusCode);
            return (0, api_errors_1.toNextResponse)(errorData, statusCode);
        }
        const { auth, response } = await (0, api_auth_1.requireAuth)(request);
        if (response)
            return response;
        const adminResponse = (0, api_auth_1.requireAdmin)(auth);
        if (adminResponse)
            return adminResponse;
        const { id } = await context.params;
        const parsedId = DigestIdSchema.safeParse(id);
        if (!parsedId.success) {
            const [errorData, statusCode] = (0, api_errors_1.createErrorResponse)(api_errors_1.API_ERRORS.INVALID_REQUEST.code, "Invalid digest id", api_errors_1.API_ERRORS.INVALID_REQUEST.statusCode);
            return (0, api_errors_1.toNextResponse)(errorData, statusCode);
        }
        const body = await request.json().catch(() => null);
        const validation = DigestActionSchema.safeParse(body);
        if (!validation.success) {
            const [errorData, statusCode] = (0, api_errors_1.createErrorResponse)(api_errors_1.API_ERRORS.VALIDATION_ERROR.code, "Invalid digest action", api_errors_1.API_ERRORS.VALIDATION_ERROR.statusCode);
            return (0, api_errors_1.toNextResponse)(errorData, statusCode);
        }
        const digestId = parsedId.data;
        const action = validation.data.action;
        const supabase = getSupabaseAdmin();
        const { data: digest, error: digestError } = await supabase
            .from("digest_runs")
            .select("id, tenant_id, run_date, status, tenders_found, emails_sent, started_at, finished_at, logs, error_message, metadata, created_at")
            .eq("id", digestId)
            .eq("tenant_id", auth.tenantId)
            .maybeSingle();
        if (digestError) {
            console.error("Database error (PATCH /digests/:id):", digestError);
            const [errorData, statusCode] = (0, api_errors_1.createErrorResponse)(api_errors_1.API_ERRORS.INTERNAL_ERROR.code, "Failed to load digest", api_errors_1.API_ERRORS.INTERNAL_ERROR.statusCode);
            return (0, api_errors_1.toNextResponse)(errorData, statusCode);
        }
        if (!digest) {
            const [errorData, statusCode] = (0, api_errors_1.createErrorResponse)(api_errors_1.API_ERRORS.NOT_FOUND.code, "Digest not found", api_errors_1.API_ERRORS.NOT_FOUND.statusCode);
            return (0, api_errors_1.toNextResponse)(errorData, statusCode);
        }
        const digestRow = digest;
        const normalizedStatus = (0, digests_1.normalizeDigestStatus)(digestRow.status);
        const metadata = getDigestMetadata(digestRow.metadata);
        const now = new Date().toISOString();
        if (action === "cancel") {
            if (normalizedStatus !== "pending" && normalizedStatus !== "running") {
                const [errorData, statusCode] = (0, api_errors_1.createErrorResponse)(api_errors_1.API_ERRORS.CONFLICT.code, "Only queued or running digests can be cancelled", api_errors_1.API_ERRORS.CONFLICT.statusCode);
                return (0, api_errors_1.toNextResponse)(errorData, statusCode);
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
                        cancel_requested_by: auth.userId,
                        cancelled_at: now,
                        cancelled_by: auth.userId,
                        job_finished_at: now,
                        job_last_status: "fail",
                    },
                })
                    .eq("id", digestId)
                    .eq("tenant_id", auth.tenantId)
                    .eq("status", "pending")
                    .select("id, tenant_id, run_date, status, tenders_found, emails_sent, started_at, finished_at, logs, error_message, metadata, created_at")
                    .maybeSingle();
                if (cancelError) {
                    console.error("Database error (cancel pending digest):", cancelError);
                    const [errorData, statusCode] = (0, api_errors_1.createErrorResponse)(api_errors_1.API_ERRORS.INTERNAL_ERROR.code, "Failed to cancel digest", api_errors_1.API_ERRORS.INTERNAL_ERROR.statusCode);
                    return (0, api_errors_1.toNextResponse)(errorData, statusCode);
                }
                if (!cancelledDigest) {
                    const [errorData, statusCode] = (0, api_errors_1.createErrorResponse)(api_errors_1.API_ERRORS.CONFLICT.code, "Digest state changed before it could be cancelled", api_errors_1.API_ERRORS.CONFLICT.statusCode);
                    return (0, api_errors_1.toNextResponse)(errorData, statusCode);
                }
                return (0, api_errors_1.toNextResponse)((0, api_errors_1.createSuccessResponse)({
                    digest: serializeDigest(cancelledDigest),
                    message: "Digest cancelled.",
                }), 200);
            }
            if (metadata.cancel_requested === true ||
                typeof metadata.cancel_requested_at === "string") {
                return (0, api_errors_1.toNextResponse)((0, api_errors_1.createSuccessResponse)({
                    digest: serializeDigest(digestRow),
                    message: "Cancellation has already been requested for this digest.",
                }), 202);
            }
            const { data: queuedCancelDigest, error: queuedCancelError } = await supabase
                .from("digest_runs")
                .update({
                metadata: {
                    ...metadata,
                    cancel_requested: true,
                    cancel_requested_at: now,
                    cancel_requested_by: auth.userId,
                },
            })
                .eq("id", digestId)
                .eq("tenant_id", auth.tenantId)
                .eq("status", "running")
                .select("id, tenant_id, run_date, status, tenders_found, emails_sent, started_at, finished_at, logs, error_message, metadata, created_at")
                .maybeSingle();
            if (queuedCancelError) {
                console.error("Database error (cancel running digest):", queuedCancelError);
                const [errorData, statusCode] = (0, api_errors_1.createErrorResponse)(api_errors_1.API_ERRORS.INTERNAL_ERROR.code, "Failed to request digest cancellation", api_errors_1.API_ERRORS.INTERNAL_ERROR.statusCode);
                return (0, api_errors_1.toNextResponse)(errorData, statusCode);
            }
            if (!queuedCancelDigest) {
                const [errorData, statusCode] = (0, api_errors_1.createErrorResponse)(api_errors_1.API_ERRORS.CONFLICT.code, "Digest state changed before cancellation could be requested", api_errors_1.API_ERRORS.CONFLICT.statusCode);
                return (0, api_errors_1.toNextResponse)(errorData, statusCode);
            }
            return (0, api_errors_1.toNextResponse)((0, api_errors_1.createSuccessResponse)({
                digest: serializeDigest(queuedCancelDigest),
                message: "Cancellation requested. The current send will stop shortly.",
            }), 202);
        }
        if (normalizedStatus === "pending" || normalizedStatus === "running") {
            const [errorData, statusCode] = (0, api_errors_1.createErrorResponse)(api_errors_1.API_ERRORS.CONFLICT.code, "Only completed or failed digests can be retried", api_errors_1.API_ERRORS.CONFLICT.statusCode);
            return (0, api_errors_1.toNextResponse)(errorData, statusCode);
        }
        const { data: activeDigest } = await supabase
            .from("digest_runs")
            .select("id")
            .eq("tenant_id", auth.tenantId)
            .in("status", ["pending", "running"])
            .limit(1)
            .maybeSingle();
        if (activeDigest) {
            const [errorData, statusCode] = (0, api_errors_1.createErrorResponse)(api_errors_1.API_ERRORS.CONFLICT.code, "Another digest is already queued or running for this workspace", api_errors_1.API_ERRORS.CONFLICT.statusCode);
            return (0, api_errors_1.toNextResponse)(errorData, statusCode);
        }
        const { data: retryDigest, error: retryError } = await supabase
            .from("digest_runs")
            .insert({
            tenant_id: auth.tenantId,
            run_date: new Date().toISOString().slice(0, 10),
            tenders_found: 0,
            emails_sent: 0,
            status: "pending",
            error_message: null,
            metadata: {
                manual_triggered: true,
                triggered_at: now,
                triggered_by: auth.userId,
                retry_of: digestId,
                retry_of_status: digestRow.status,
                retry_requested_at: now,
                retry_requested_by: auth.userId,
            },
        })
            .select("id, tenant_id, run_date, status, tenders_found, emails_sent, started_at, finished_at, logs, error_message, metadata, created_at")
            .single();
        if (retryError) {
            console.error("Database error (retry digest):", retryError);
            const [errorData, statusCode] = (0, api_errors_1.createErrorResponse)(api_errors_1.API_ERRORS.INTERNAL_ERROR.code, "Failed to queue digest retry", api_errors_1.API_ERRORS.INTERNAL_ERROR.statusCode);
            return (0, api_errors_1.toNextResponse)(errorData, statusCode);
        }
        (0, server_1.after)(async () => {
            const result = await (0, digest_jobs_1.processDigestRunById)({
                digestId: retryDigest.id,
                expectedTenantId: auth.tenantId,
            });
            if (result.status === "failed") {
                console.error("Background digest retry failed", {
                    digestId: result.digestId,
                    tenantId: result.tenantId,
                    message: result.message,
                });
            }
        });
        return (0, api_errors_1.toNextResponse)((0, api_errors_1.createSuccessResponse)({
            digest: serializeDigest(retryDigest),
            message: "Digest retry queued. Delivery will continue in the background.",
        }), 202);
    }
    catch (error) {
        console.error("API Error (PATCH /digests/:id):", error);
        const [errorData, statusCode] = (0, api_errors_1.createErrorResponse)(api_errors_1.API_ERRORS.INTERNAL_ERROR.code, "Internal server error", api_errors_1.API_ERRORS.INTERNAL_ERROR.statusCode);
        return (0, api_errors_1.toNextResponse)(errorData, statusCode);
    }
}
