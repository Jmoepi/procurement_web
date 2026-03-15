/**
 * API Authentication Middleware
 * Verifies Supabase auth tokens and extracts user context
 */

import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { API_ERRORS, createErrorResponse, toNextResponse } from "./api-errors";
import {
  getSupabaseServerConfig,
  getSupabaseServiceRoleConfig,
} from "@/lib/supabase/config";

export interface AuthContext {
  userId: string;
  email: string;
  tenantId: string;
  role: "admin" | "member";
}

async function loadAuthContextForUser(userId: string, email?: string | null): Promise<AuthContext | null> {
  const { url, serviceRoleKey } = getSupabaseServiceRoleConfig();
  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("tenant_id, role")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("Profile lookup failed during API auth", error);
    return null;
  }

  if (!profile) {
    return null;
  }

  return {
    userId,
    email: email || "",
    tenantId: profile.tenant_id,
    role: profile.role || "member",
  };
}

/**
 * Extract and verify JWT from Authorization header
 */
async function verifyBearerAuth(request: Request): Promise<AuthContext | null> {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return null;
    }

    const token = authHeader.slice(7); // Remove "Bearer " prefix

    const { url, anonKey } = getSupabaseServerConfig();

    const supabase = createClient(url, anonKey, {
      auth: { persistSession: false },
    });

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return null;
    }

    return loadAuthContextForUser(user.id, user.email);
  } catch (error) {
    console.error("Auth verification error:", error);
    return null;
  }
}

function getRequestCookies(request: Request) {
  const requestWithCookies = request as Request & {
    cookies?: {
      getAll?: () => Array<{ name: string; value: string }>;
    };
  };

  const nextRequestCookies =
    typeof requestWithCookies.cookies?.getAll === "function"
      ? requestWithCookies.cookies.getAll().map((cookie: { name: string; value: string }) => ({
          name: cookie.name,
          value: cookie.value,
        }))
      : [];

  if (nextRequestCookies.length > 0) {
    return nextRequestCookies;
  }

  const cookieHeader = request.headers.get("cookie") ?? "";
  if (!cookieHeader) {
    return [];
  }

  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((entry) => {
      const separatorIndex = entry.indexOf("=");
      if (separatorIndex === -1) {
        return null;
      }

      return {
        name: entry.slice(0, separatorIndex).trim(),
        value: decodeURIComponent(entry.slice(separatorIndex + 1).trim()),
      };
    })
    .filter((cookie): cookie is { name: string; value: string } => Boolean(cookie));
}

async function verifyCookieAuthFromRequest(request: Request): Promise<AuthContext | null> {
  try {
    const requestCookies = getRequestCookies(request);
    if (requestCookies.length === 0) {
      return null;
    }

    const { url, anonKey } = getSupabaseServerConfig();
    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll: () => requestCookies,
        setAll: () => {},
      },
    });

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    return loadAuthContextForUser(user.id, user.email);
  } catch (error) {
    console.error("Cookie auth verification error:", error);
    return null;
  }
}

export async function verifyAuth(request: Request): Promise<AuthContext | null> {
  const bearerAuth = await verifyBearerAuth(request);
  if (bearerAuth) {
    return bearerAuth;
  }

  return verifyCookieAuthFromRequest(request);
}

/**
 * Middleware to require authentication
 */
export async function requireAuth(request: Request) {
  const auth = await verifyAuth(request);

  if (!auth) {
    const [errorData, statusCode] = createErrorResponse(
      API_ERRORS.UNAUTHORIZED.code,
      "Authentication required. Please sign in again.",
      API_ERRORS.UNAUTHORIZED.statusCode
    );
    return { auth: null, response: toNextResponse(errorData, statusCode) };
  }

  return { auth, response: null };
}

/**
 * Middleware to require admin role
 */
export function requireAdmin(auth: AuthContext): NextResponse | null {
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
