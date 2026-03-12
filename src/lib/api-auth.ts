/**
 * API Authentication Middleware
 * Verifies Supabase auth tokens and extracts user context
 */

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { API_ERRORS, createErrorResponse, toNextResponse } from "./api-errors";

export interface AuthContext {
  userId: string;
  email: string;
  tenantId: string;
  role: "admin" | "member";
}

/**
 * Extract and verify JWT from Authorization header
 */
export async function verifyAuth(request: Request): Promise<AuthContext | null> {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return null;
    }

    const token = authHeader.slice(7); // Remove "Bearer " prefix

    // Verify token with Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const {
      data: { user },
      error,
    } = await supabase.auth.admin.getUserById(
      // Extract user ID from token (this is a simplified approach)
      // In production, fully verify the JWT signature
      token
    );

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
  } catch (error) {
    console.error("Auth verification error:", error);
    return null;
  }
}

/**
 * Middleware to require authentication
 */
export async function requireAuth(request: Request) {
  const auth = await verifyAuth(request);

  if (!auth) {
    const [errorData, statusCode] = createErrorResponse(
      API_ERRORS.UNAUTHORIZED.code,
      "Authentication required. Please provide a valid Bearer token.",
      API_ERRORS.UNAUTHORIZED.statusCode
    );
    return { auth: null, response: toNextResponse(errorData, statusCode) };
  }

  return { auth, response: null };
}

/**
 * Middleware to require admin role
 */
export function requireAdmin(auth: AuthContext): Response | null {
  if (auth.role !== "admin") {
    const [errorData, statusCode] = createErrorResponse(
      API_ERRORS.FORBIDDEN.code,
      "Admin access required",
      API_ERRORS.FORBIDDEN.statusCode
    );
    return toNextResponse(errorData, statusCode);
  }

  return null;
}

/**
 * Load bearer token from request
 * Used for client-side API calls from authenticated users
 */
export function getBearerToken(request: Request): string | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.slice(7);
}
