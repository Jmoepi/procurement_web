"use strict";
/**
 * API Authentication Middleware
 * Verifies Supabase auth tokens and extracts user context
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyAuth = verifyAuth;
exports.requireAuth = requireAuth;
exports.requireAdmin = requireAdmin;
exports.getBearerToken = getBearerToken;
const supabase_js_1 = require("@supabase/supabase-js");
const api_errors_1 = require("./api-errors");
const config_1 = require("@/lib/supabase/config");
/**
 * Extract and verify JWT from Authorization header
 */
async function verifyAuth(request) {
    try {
        const authHeader = request.headers.get("authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return null;
        }
        const token = authHeader.slice(7); // Remove "Bearer " prefix
        const { url, anonKey } = (0, config_1.getSupabaseServerConfig)();
        const supabase = (0, supabase_js_1.createClient)(url, anonKey, {
            auth: { persistSession: false },
        });
        const { data: { user }, error, } = await supabase.auth.getUser(token);
        if (error || !user) {
            return null;
        }
        // Get user's profile and tenant info
        const { data: profile } = await supabase
            .from("profiles")
            .select("tenant_id, role")
            .eq("id", user.id)
            .single();
        if (!profile) {
            return null;
        }
        return {
            userId: user.id,
            email: user.email || "",
            tenantId: profile.tenant_id,
            role: profile.role || "member",
        };
    }
    catch (error) {
        console.error("Auth verification error:", error);
        return null;
    }
}
/**
 * Middleware to require authentication
 */
async function requireAuth(request) {
    const auth = await verifyAuth(request);
    if (!auth) {
        const [errorData, statusCode] = (0, api_errors_1.createErrorResponse)(api_errors_1.API_ERRORS.UNAUTHORIZED.code, "Authentication required. Please provide a valid Bearer token.", api_errors_1.API_ERRORS.UNAUTHORIZED.statusCode);
        return { auth: null, response: (0, api_errors_1.toNextResponse)(errorData, statusCode) };
    }
    return { auth, response: null };
}
/**
 * Middleware to require admin role
 */
function requireAdmin(auth) {
    if (auth.role !== "admin") {
        const [errorData, statusCode] = (0, api_errors_1.createErrorResponse)(api_errors_1.API_ERRORS.FORBIDDEN.code, "Admin access required", api_errors_1.API_ERRORS.FORBIDDEN.statusCode);
        return (0, api_errors_1.toNextResponse)(errorData, statusCode);
    }
    return null;
}
/**
 * Load bearer token from request
 * Used for client-side API calls from authenticated users
 */
function getBearerToken(request) {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
        return null;
    }
    return authHeader.slice(7);
}
