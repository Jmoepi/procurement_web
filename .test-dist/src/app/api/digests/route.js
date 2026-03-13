"use strict";
/**
 * GET /api/digests - List digest runs
 * POST /api/digests - Queue a manual digest send
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
const server_1 = require("next/server");
const supabase_js_1 = require("@supabase/supabase-js");
const rate_limiter_1 = require("@/lib/rate-limiter");
const api_errors_1 = require("@/lib/api-errors");
const api_auth_1 = require("@/lib/api-auth");
const digest_jobs_1 = require("@/lib/digest-jobs");
const config_1 = require("@/lib/supabase/config");
const digests_1 = require("@/lib/digests");
const rateLimiter = (0, rate_limiter_1.createDurableRateLimiter)("api:digests", 60 * 60 * 1000, 100);
function getSupabaseAdmin() {
    const { url, serviceRoleKey } = (0, config_1.getSupabaseServiceRoleConfig)();
    return (0, supabase_js_1.createClient)(url, serviceRoleKey, {
        auth: { persistSession: false },
    });
}
async function GET(request) {
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
        // Get pagination params
        const searchParams = request.nextUrl.searchParams;
        const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
        const offset = parseInt(searchParams.get("offset") || "0");
        const status = searchParams.get("status"); // success, fail, pending
        const supabase = getSupabaseAdmin();
        let query = supabase
            .from("digest_runs")
            .select("*", { count: "exact" })
            .eq("tenant_id", auth.tenantId);
        if (status) {
            query = query.eq("status", status);
        }
        const { data: digests, count, error } = await query
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1);
        if (error) {
            console.error("Database error:", error);
            const [errorData, statusCode] = (0, api_errors_1.createErrorResponse)(api_errors_1.API_ERRORS.INTERNAL_ERROR.code, "Failed to fetch digests", api_errors_1.API_ERRORS.INTERNAL_ERROR.statusCode);
            return (0, api_errors_1.toNextResponse)(errorData, statusCode);
        }
        const responseData = (0, api_errors_1.createSuccessResponse)({
            digests: (digests || []).map((digest) => ({
                ...digest,
                status: (0, digests_1.normalizeDigestStatus)(digest.status),
            })),
            pagination: {
                total: count || 0,
                limit,
                offset,
                hasMore: (count || 0) > offset + limit,
            },
        });
        return (0, api_errors_1.toNextResponse)(responseData, 200);
    }
    catch (error) {
        console.error("API Error:", error);
        const [errorData, statusCode] = (0, api_errors_1.createErrorResponse)(api_errors_1.API_ERRORS.INTERNAL_ERROR.code, "Internal server error", api_errors_1.API_ERRORS.INTERNAL_ERROR.statusCode);
        return (0, api_errors_1.toNextResponse)(errorData, statusCode);
    }
}
async function POST(request) {
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
        const supabase = getSupabaseAdmin();
        // Check if a digest is already queued or running
        const { data: pendingDigest } = await supabase
            .from("digest_runs")
            .select("id")
            .eq("tenant_id", auth.tenantId)
            .in("status", ["pending", "running"])
            .limit(1)
            .maybeSingle();
        if (pendingDigest) {
            const [errorData, statusCode] = (0, api_errors_1.createErrorResponse)(api_errors_1.API_ERRORS.CONFLICT.code, "A digest is already queued or running. Please wait for it to complete.", api_errors_1.API_ERRORS.CONFLICT.statusCode);
            return (0, api_errors_1.toNextResponse)(errorData, statusCode);
        }
        // Create digest run record
        const today = new Date().toISOString().slice(0, 10);
        const { data: newDigest, error: insertError } = await supabase
            .from("digest_runs")
            .insert({
            tenant_id: auth.tenantId,
            run_date: today,
            tenders_found: 0,
            emails_sent: 0,
            status: "pending",
            error_message: null,
            metadata: {
                manual_triggered: true,
                triggered_at: new Date().toISOString(),
                triggered_by: auth.userId,
            },
        })
            .select()
            .single();
        if (insertError) {
            console.error("Insert error:", insertError);
            const [errorData, statusCode] = (0, api_errors_1.createErrorResponse)(api_errors_1.API_ERRORS.INTERNAL_ERROR.code, "Failed to create digest run", api_errors_1.API_ERRORS.INTERNAL_ERROR.statusCode);
            return (0, api_errors_1.toNextResponse)(errorData, statusCode);
        }
        (0, server_1.after)(async () => {
            const result = await (0, digest_jobs_1.processDigestRunById)({
                digestId: newDigest.id,
                expectedTenantId: auth.tenantId,
            });
            if (result.status === "failed") {
                console.error("Background digest job failed", {
                    digestId: result.digestId,
                    tenantId: result.tenantId,
                    message: result.message,
                });
            }
        });
        const responseData = (0, api_errors_1.createSuccessResponse)({
            digest: {
                ...newDigest,
                status: (0, digests_1.normalizeDigestStatus)(newDigest.status),
            },
            message: "Digest queued. Delivery will continue in the background.",
        });
        return (0, api_errors_1.toNextResponse)(responseData, 202);
    }
    catch (error) {
        console.error("API Error:", error);
        const [errorData, statusCode] = (0, api_errors_1.createErrorResponse)(api_errors_1.API_ERRORS.INTERNAL_ERROR.code, "Internal server error", api_errors_1.API_ERRORS.INTERNAL_ERROR.statusCode);
        return (0, api_errors_1.toNextResponse)(errorData, statusCode);
    }
}
