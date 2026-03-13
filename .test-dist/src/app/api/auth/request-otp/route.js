"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const crypto_1 = __importDefault(require("crypto"));
const server_1 = require("next/server");
const supabase_js_1 = require("@supabase/supabase-js");
const email_1 = require("@/lib/email");
const rate_limiter_1 = require("@/lib/rate-limiter");
const config_1 = require("@/lib/supabase/config");
const otpRequestLimiter = (0, rate_limiter_1.createDurableRateLimiter)("auth:request-otp", 15 * 60 * 1000, 5);
const OTP_COOLDOWN_MS = 60 * 1000;
const OTP_TTL_MS = 15 * 60 * 1000;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function getSupabaseAdmin() {
    const { url, serviceRoleKey } = (0, config_1.getSupabaseServiceRoleConfig)();
    return (0, supabase_js_1.createClient)(url, serviceRoleKey, {
        auth: { persistSession: false },
    });
}
function genCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}
function hashCode(code) {
    const secret = process.env.OTP_HASH_SECRET;
    if (secret) {
        return crypto_1.default.createHmac("sha256", secret).update(code).digest("hex");
    }
    return crypto_1.default.createHash("sha256").update(code).digest("hex");
}
async function POST(req) {
    try {
        const rateLimit = await otpRequestLimiter((0, rate_limiter_1.getClientIdentifier)(req));
        if (!rateLimit.allowed) {
            return server_1.NextResponse.json({ error: "Too many OTP requests. Please wait before trying again." }, { status: 429 });
        }
        const body = await req.json();
        const email = String(body?.email ?? "")
            .trim()
            .toLowerCase();
        if (!email) {
            return server_1.NextResponse.json({ error: "missing email" }, { status: 400 });
        }
        if (!EMAIL_REGEX.test(email)) {
            return server_1.NextResponse.json({ error: "invalid email" }, { status: 400 });
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
            return server_1.NextResponse.json({ error: latestOtpError.message }, { status: 500 });
        }
        const now = Date.now();
        if (latestOtp?.created_at &&
            now - new Date(latestOtp.created_at).getTime() < OTP_COOLDOWN_MS) {
            const retryAfterSeconds = Math.ceil((OTP_COOLDOWN_MS - (now - new Date(latestOtp.created_at).getTime())) / 1000);
            return server_1.NextResponse.json({
                error: `Please wait ${retryAfterSeconds}s before requesting another code.`,
                retry_after_seconds: retryAfterSeconds,
            }, { status: 429 });
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
            return server_1.NextResponse.json({ error: insertErr.message }, { status: 500 });
        }
        try {
            await (0, email_1.sendTransactionalEmail)({
                to: email,
                subject: "Your verification code",
                text: `Your verification code is: ${code}. It expires in 15 minutes.`,
            });
        }
        catch (error) {
            await supabase.from("email_otps").delete().eq("id", otpRecord.id);
            console.error("OTP email send error", error);
            return server_1.NextResponse.json({ error: "Failed to send verification code. Please try again." }, { status: 500 });
        }
        return server_1.NextResponse.json({
            ok: true,
            cooldown_seconds: OTP_COOLDOWN_MS / 1000,
        });
    }
    catch (err) {
        return server_1.NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
    }
}
