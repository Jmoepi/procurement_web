/**
 * CSRF Token Protection
 * Generates and validates CSRF tokens for dangerous operations
 */

import crypto from "crypto";

const CSRF_TOKEN_LENGTH = 32;
const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface CSRFToken {
  token: string;
  issuedAt: number;
}

/**
 * Generate a cryptographically secure CSRF token
 */
export function generateCSRFToken(): CSRFToken {
  const token = crypto.randomBytes(CSRF_TOKEN_LENGTH).toString("hex");
  return {
    token,
    issuedAt: Date.now(),
  };
}

/**
 * Validate CSRF token
 */
export function validateCSRFToken(
  token: string,
  issuedAt: number
): { valid: boolean; reason?: string } {
  if (!token || typeof token !== "string") {
    return { valid: false, reason: "Token missing" };
  }

  // Check token format (should be hex string of CSRF_TOKEN_LENGTH * 2 characters)
  if (!/^[a-f0-9]{64}$/.test(token)) {
    return { valid: false, reason: "Invalid token format" };
  }

  // Check expiry
  const age = Date.now() - issuedAt;
  if (age > TOKEN_EXPIRY_MS) {
    return { valid: false, reason: "Token expired" };
  }

  return { valid: true };
}

/**
 * Extract CSRF token from request
 * Checks: header > body > cookie
 */
export function extractCSRFToken(request: Request, body: any): string | null {
  // Check X-CSRF-Token header
  const headerToken = request.headers.get("x-csrf-token");
  if (headerToken) return headerToken;

  // Check request body (for form submissions)
  if (body?.csrf_token) return body.csrf_token;

  // In production, also check cookies
  const cookieToken = request.headers
    .get("cookie")
    ?.split(";")
    .find((c) => c.trim().startsWith("csrf_token="))
    ?.split("=")[1];

  return cookieToken || null;
}

/**
 * Methods that require CSRF protection
 */
export const CSRF_PROTECTED_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function requiresCSRFProtection(method: string): boolean {
  return CSRF_PROTECTED_METHODS.has(method.toUpperCase());
}
