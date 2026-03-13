"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRateLimiter = createRateLimiter;
exports.createDurableRateLimiter = createDurableRateLimiter;
exports.getClientIdentifier = getClientIdentifier;
exports.getRateLimitHeaders = getRateLimitHeaders;
const crypto_1 = __importDefault(require("crypto"));
const supabase_js_1 = require("@supabase/supabase-js");
const config_1 = require("@/lib/supabase/config");
const store = new Map();
let supabaseAdmin = null;
let durableFallbackWarningShown = false;
function consumeInMemoryRateLimit(storeKey, windowMs, maxRequests) {
    const now = Date.now();
    const windowStart = Math.floor(now / windowMs) * windowMs;
    const resetTime = windowStart + windowMs;
    const entry = store.get(storeKey);
    if (!entry || entry.resetTime <= now) {
        store.set(storeKey, {
            count: 1,
            resetTime,
        });
        return {
            allowed: true,
            remaining: Math.max(maxRequests - 1, 0),
            resetTime,
        };
    }
    if (entry.count >= maxRequests) {
        return { allowed: false, remaining: 0, resetTime: entry.resetTime };
    }
    entry.count += 1;
    return {
        allowed: true,
        remaining: Math.max(maxRequests - entry.count, 0),
        resetTime: entry.resetTime,
    };
}
function hashIdentifier(bucket, identifier) {
    return crypto_1.default
        .createHash("sha256")
        .update(`${bucket}:${identifier}`)
        .digest("hex");
}
function getSupabaseAdmin() {
    if (supabaseAdmin) {
        return supabaseAdmin;
    }
    try {
        const { url, serviceRoleKey } = (0, config_1.getSupabaseServiceRoleConfig)();
        supabaseAdmin = (0, supabase_js_1.createClient)(url, serviceRoleKey, {
            auth: { persistSession: false },
        });
        return supabaseAdmin;
    }
    catch {
        return null;
    }
}
function warnDurableFallback(message, error) {
    if (durableFallbackWarningShown) {
        return;
    }
    durableFallbackWarningShown = true;
    if (error) {
        console.warn(message, error);
        return;
    }
    console.warn(message);
}
function createRateLimiter(windowMs = 60 * 60 * 1000, // 1 hour
maxRequests = 100) {
    return function rateLimiter(identifier) {
        return consumeInMemoryRateLimit(identifier, windowMs, maxRequests);
    };
}
function createDurableRateLimiter(bucket, windowMs = 60 * 60 * 1000, maxRequests = 100) {
    return async function durableRateLimiter(identifier) {
        const hashedIdentifier = hashIdentifier(bucket, identifier);
        const fallback = () => consumeInMemoryRateLimit(`${bucket}:${hashedIdentifier}`, windowMs, maxRequests);
        const supabase = getSupabaseAdmin();
        if (!supabase) {
            warnDurableFallback("Durable rate limiting is unavailable because Supabase service-role configuration is missing. Falling back to in-memory limiting.");
            return fallback();
        }
        const windowSeconds = Math.max(1, Math.ceil(windowMs / 1000));
        const { data, error } = await supabase.rpc("consume_rate_limit", {
            p_bucket: bucket,
            p_identifier_hash: hashedIdentifier,
            p_window_seconds: windowSeconds,
            p_max_requests: maxRequests,
        });
        if (error) {
            warnDurableFallback("Durable rate limiting RPC failed. Falling back to in-memory limiting.", error);
            return fallback();
        }
        const row = (Array.isArray(data) ? data[0] : data);
        if (!row || typeof row !== "object") {
            warnDurableFallback("Durable rate limiting RPC returned an invalid payload. Falling back to in-memory limiting.");
            return fallback();
        }
        const resetAt = typeof row.reset_at === "string"
            ? Date.parse(row.reset_at)
            : Date.now() + windowMs;
        return {
            allowed: row.allowed === true,
            remaining: typeof row.remaining === "number"
                ? Math.max(row.remaining, 0)
                : 0,
            resetTime: Number.isFinite(resetAt) ? resetAt : Date.now() + windowMs,
        };
    };
}
/**
 * Extract client identifier from request
 * Priority: user ID > IP address > "anonymous"
 */
function getClientIdentifier(request, userId) {
    if (userId) {
        return `user:${userId}`;
    }
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ||
        request.headers.get("x-real-ip") ||
        request.headers.get("cf-connecting-ip") ||
        "unknown";
    return `ip:${ip}`;
}
/**
 * Rate limit response headers
 */
function getRateLimitHeaders(remaining, resetTime) {
    return {
        "X-RateLimit-Remaining": remaining.toString(),
        "X-RateLimit-Reset": resetTime?.toString() || "",
    };
}
