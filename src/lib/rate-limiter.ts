/**
 * Rate Limiting Middleware
 * Simple in-memory rate limiter for API routes
 * For production, use Redis or a dedicated solution like Upstash
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store (use Map for simplicity; use Redis in production)
const store = new Map<string, RateLimitEntry>();

export function createRateLimiter(
  windowMs: number = 60 * 60 * 1000, // 1 hour
  maxRequests: number = 100
) {
  return function rateLimiter(identifier: string): { allowed: boolean; remaining: number } {
    const now = Date.now();
    const entry = store.get(identifier);

    // Clean up expired entries
    if (entry && entry.resetTime < now) {
      store.delete(identifier);
      return { allowed: true, remaining: maxRequests - 1 };
    }

    if (!entry) {
      // First request in this window
      store.set(identifier, {
        count: 1,
        resetTime: now + windowMs,
      });
      return { allowed: true, remaining: maxRequests - 1 };
    }

    if (entry.count >= maxRequests) {
      return { allowed: false, remaining: 0 };
    }

    // Increment counter
    entry.count++;
    return { allowed: true, remaining: maxRequests - entry.count };
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
