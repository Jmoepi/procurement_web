import crypto from "crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServiceRoleConfig } from "@/lib/supabase/config";

/**
 * Rate limiting helpers.
 * The synchronous limiter is kept for lightweight/internal routes.
 * Public or cost-sensitive routes should use the durable limiter.
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
}

const store = new Map<string, RateLimitEntry>();
let supabaseAdmin: SupabaseClient | null = null;
let durableFallbackWarningShown = false;

function consumeInMemoryRateLimit(
  storeKey: string,
  windowMs: number,
  maxRequests: number
): RateLimitResult {
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

function hashIdentifier(bucket: string, identifier: string) {
  return crypto
    .createHash("sha256")
    .update(`${bucket}:${identifier}`)
    .digest("hex");
}

function getSupabaseAdmin() {
  if (supabaseAdmin) {
    return supabaseAdmin;
  }

  try {
    const { url, serviceRoleKey } = getSupabaseServiceRoleConfig();
    supabaseAdmin = createClient(url, serviceRoleKey, {
      auth: { persistSession: false },
    });
    return supabaseAdmin;
  } catch {
    return null;
  }
}

function warnDurableFallback(message: string, error?: unknown) {
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

type DurableLimitRow = {
  allowed?: unknown;
  remaining?: unknown;
  reset_at?: unknown;
};

export function createRateLimiter(
  windowMs: number = 60 * 60 * 1000, // 1 hour
  maxRequests: number = 100
) {
  return function rateLimiter(identifier: string): RateLimitResult {
    return consumeInMemoryRateLimit(identifier, windowMs, maxRequests);
  };
}

export function createDurableRateLimiter(
  bucket: string,
  windowMs: number = 60 * 60 * 1000,
  maxRequests: number = 100
) {
  return async function durableRateLimiter(
    identifier: string
  ): Promise<RateLimitResult> {
    const hashedIdentifier = hashIdentifier(bucket, identifier);
    const fallback = () =>
      consumeInMemoryRateLimit(
        `${bucket}:${hashedIdentifier}`,
        windowMs,
        maxRequests
      );

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      warnDurableFallback(
        "Durable rate limiting is unavailable because Supabase service-role configuration is missing. Falling back to in-memory limiting."
      );
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
      warnDurableFallback(
        "Durable rate limiting RPC failed. Falling back to in-memory limiting.",
        error
      );
      return fallback();
    }

    const row = (Array.isArray(data) ? data[0] : data) as
      | DurableLimitRow
      | null;

    if (!row || typeof row !== "object") {
      warnDurableFallback(
        "Durable rate limiting RPC returned an invalid payload. Falling back to in-memory limiting."
      );
      return fallback();
    }

    const resetAt =
      typeof row.reset_at === "string"
        ? Date.parse(row.reset_at)
        : Date.now() + windowMs;

    return {
      allowed: row.allowed === true,
      remaining:
        typeof row.remaining === "number"
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
export function getClientIdentifier(request: Request, userId?: string): string {
  if (userId) {
    return `user:${userId}`;
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0] ||
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    "unknown";

  return `ip:${ip}`;
}

/**
 * Rate limit response headers
 */
export function getRateLimitHeaders(
  remaining: number,
  resetTime?: number
): Record<string, string> {
  return {
    "X-RateLimit-Remaining": remaining.toString(),
    "X-RateLimit-Reset": resetTime?.toString() || "",
  };
}
