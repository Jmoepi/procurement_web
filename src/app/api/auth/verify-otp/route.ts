import crypto from "crypto";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  createDurableRateLimiter,
  getClientIdentifier,
} from "@/lib/rate-limiter";
import { getSupabaseServiceRoleConfig } from "@/lib/supabase/config";

const otpVerifyLimiter = createDurableRateLimiter(
  "auth:verify-otp",
  15 * 60 * 1000,
  10
);

const VerifyOtpSchema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/),
  password: z.string().min(6).optional(),
  full_name: z.string().trim().min(1).max(255).optional(),
  invite_token: z.string().trim().min(1).optional(),
});

function getSupabaseAdmin() {
  const { url, serviceRoleKey } = getSupabaseServiceRoleConfig();

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
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
    const rateLimit = await otpVerifyLimiter(getClientIdentifier(req));
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many verification attempts. Please wait and try again." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = VerifyOtpSchema.safeParse({
      email: String(body?.email ?? "")
        .trim()
        .toLowerCase(),
      code: String(body?.code ?? "").trim(),
      password: body?.password,
      full_name: body?.full_name,
      invite_token: body?.invite_token,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: "missing or invalid fields" }, { status: 400 });
    }

    const { email, code, password, full_name, invite_token } = parsed.data;
    const supabase = getSupabaseAdmin();
    const now = new Date().toISOString();
    const codeHash = hashCode(code);

    const { data: otpRow, error } = await supabase
      .from("email_otps")
      .select("id")
      .eq("email", email)
      .eq("code", codeHash)
      .eq("used", false)
      .gt("expires_at", now)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!otpRow) {
      return NextResponse.json({ error: "invalid or expired code" }, { status: 400 });
    }

    if (password) {
      const { error: createUserError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: full_name ?? "",
          invite_token: invite_token ?? undefined,
        },
      });

      if (createUserError) {
        const message = createUserError.message.toLowerCase();
        const status = message.includes("already") || message.includes("registered") ? 409 : 400;
        return NextResponse.json(
          {
            error:
              status === 409
                ? "An account with this email already exists. Try signing in instead."
                : createUserError.message,
          },
          { status }
        );
      }
    }

    const { error: updErr } = await supabase
      .from("email_otps")
      .update({ used: true })
      .eq("id", otpRow.id)
      .eq("used", false);

    if (updErr && !password) {
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }

    if (updErr) {
      console.error("OTP used-flag update error after signup:", updErr);
    }

    return NextResponse.json({ ok: true, created: Boolean(password) });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
