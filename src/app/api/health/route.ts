import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    // Check Supabase connectivity
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        {
          status: "degraded",
          message: "Missing Supabase configuration",
          timestamp: new Date().toISOString(),
        },
        { status: 503 }
      );
    }

    // Simple connectivity check
    const healthData = {
      status: "ok",
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      services: {
        supabase: "connected",
      },
    };

    return NextResponse.json(healthData, { status: 200 });
  } catch (error) {
    console.error("Health check failed:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Health check failed",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
