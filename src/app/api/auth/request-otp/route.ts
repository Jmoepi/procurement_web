import crypto from "crypto";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendTransactionalEmail } from "@/lib/email";
import { createRateLimiter, getClientIdentifier } from "@/lib/rate-limiter";
import { getSupabaseServiceRoleConfig } from "@/lib/supabase/config";

const otpRequestLimiter = createRateLimiter(15 * 60 * 1000, 5);
const OTP_COOLDOWN_MS = 60 * 1000;
const OTP_TTL_MS = 15 * 60 * 1000;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getSupabaseAdmin() {
  const { url, serviceRoleKey } = getSupabaseServiceRoleConfig();

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

function genCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function hashCode(code: string) {
  const secret = process.env.OTP_HASH_SECRET;
  if (secret) {
    return crypto.createHmac("sha256", secret).update(code).digest("hex");
  }

  return crypto.createHash("sha256").update(code).digest("hex");
}

export async function POST(req: Request) {
  try {
    const rateLimit = otpRequestLimiter(getClientIdentifier(req));
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many OTP requests. Please wait before trying again." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const email = String(body?.email ?? "")
      .trim()
      .toLowerCase();

    if (!email) {
      return NextResponse.json({ error: "missing email" }, { status: 400 });
    }

    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: "invalid email" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data: latestOtp, error: latestOtpError } = await supabase
      .from("email_otps")
      .select("id, created_at")
      .eq("email", email)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestOtpError) {
      return NextResponse.json({ error: latestOtpError.message }, { status: 500 });
    }

    const now = Date.now();
    if (
      latestOtp?.created_at &&
      now - new Date(latestOtp.created_at).getTime() < OTP_COOLDOWN_MS
    ) {
      const retryAfterSeconds = Math.ceil(
        (OTP_COOLDOWN_MS - (now - new Date(latestOtp.created_at).getTime())) / 1000
      );

      return NextResponse.json(
        {
          error: `Please wait ${retryAfterSeconds}s before requesting another code.`,
          retry_after_seconds: retryAfterSeconds,
        },
        { status: 429 }
      );
    }

    await supabase
      .from("email_otps")
      .update({ used: true })
      .eq("email", email)
      .eq("used", false);

    const code = genCode();
    const code_hash = hashCode(code);
    const expiresAt = new Date(now + OTP_TTL_MS).toISOString();

    const { data: otpRecord, error: insertErr } = await supabase
      .from("email_otps")
      .insert({
        email,
        code,
        code_hash,
        expires_at: expiresAt,
      })
      .select("id")
      .single();

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    try {
      await sendTransactionalEmail({
        to: email,
        subject: "Your verification code",
        text: `Your verification code is: ${code}. It expires in 15 minutes.`,
      });
    } catch (error) {
      await supabase.from("email_otps").delete().eq("id", otpRecord.id);
      console.error("OTP email send error", error);
      return NextResponse.json(
        { error: "Failed to send verification code. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      cooldown_seconds: OTP_COOLDOWN_MS / 1000,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
