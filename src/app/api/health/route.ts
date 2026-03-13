import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import {
  getSupabaseServerConfig,
  getSupabaseServiceRoleConfig,
} from "@/lib/supabase/config";

export const runtime = "nodejs";

export async function GET() {
  const timestamp = new Date().toISOString();

  try {
    const { url: serverUrl, anonKey } = getSupabaseServerConfig();
    const { serviceRoleKey } = getSupabaseServiceRoleConfig();
    const supabase = createClient(serverUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const [
      { count: pendingDigests, error: pendingError },
      { count: runningDigests, error: runningError },
      { count: failedDigests, error: failedError },
    ] = await Promise.all([
      supabase
        .from("digest_runs")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase
        .from("digest_runs")
        .select("id", { count: "exact", head: true })
        .eq("status", "running"),
      supabase
        .from("digest_runs")
        .select("id", { count: "exact", head: true })
        .eq("status", "fail"),
    ]);

    if (pendingError || runningError || failedError) {
      throw pendingError || runningError || failedError;
    }

    const digestJobConfigured = Boolean(process.env.DIGEST_JOB_SECRET?.trim());
    const staleMinutes = Number(process.env.DIGEST_JOB_STALE_MINUTES || "30");
    const maxRetries = Number(process.env.DIGEST_JOB_MAX_RETRIES || "2");
    const degraded = !digestJobConfigured;

    const healthData = {
      status: degraded ? "degraded" : "ok",
      timestamp,
      version: "1.0.0",
      services: {
        supabase: "connected",
        auth: anonKey ? "configured" : "missing",
        digest_jobs: digestJobConfigured ? "configured" : "missing_secret",
      },
      digests: {
        pending: pendingDigests ?? 0,
        running: runningDigests ?? 0,
        failed: failedDigests ?? 0,
        stale_minutes: Number.isFinite(staleMinutes) ? staleMinutes : 30,
        max_retries: Number.isFinite(maxRetries) ? maxRetries : 2,
      },
    };

    return NextResponse.json(healthData, {
      status: degraded ? 200 : 200,
    });
  } catch (error) {
    console.error("Health check failed:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Health check failed",
        timestamp,
      },
      { status: 503 }
    );
  }
}
