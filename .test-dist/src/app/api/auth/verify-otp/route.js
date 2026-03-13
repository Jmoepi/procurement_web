"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const crypto_1 = __importDefault(require("crypto"));
const server_1 = require("next/server");
const supabase_js_1 = require("@supabase/supabase-js");
const zod_1 = require("zod");
const rate_limiter_1 = require("@/lib/rate-limiter");
const config_1 = require("@/lib/supabase/config");
const otpVerifyLimiter = (0, rate_limiter_1.createDurableRateLimiter)("auth:verify-otp", 15 * 60 * 1000, 10);
const VerifyOtpSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    code: zod_1.z.string().regex(/^\d{6}$/),
    password: zod_1.z.string().min(6).optional(),
    full_name: zod_1.z.string().trim().min(1).max(255).optional(),
    invite_token: zod_1.z.string().trim().min(1).optional(),
});
function getSupabaseAdmin() {
    const { url, serviceRoleKey } = (0, config_1.getSupabaseServiceRoleConfig)();
    return (0, supabase_js_1.createClient)(url, serviceRoleKey, {
        auth: { persistSession: false },
    });
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
        const rateLimit = await otpVerifyLimiter((0, rate_limiter_1.getClientIdentifier)(req));
        if (!rateLimit.allowed) {
            return server_1.NextResponse.json({ error: "Too many verification attempts. Please wait and try again." }, { status: 429 });
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
            return server_1.NextResponse.json({ error: "missing or invalid fields" }, { status: 400 });
        }
        const { email, code, password, full_name, invite_token } = parsed.data;
        const supabase = getSupabaseAdmin();
        const now = new Date().toISOString();
        const code_hash = hashCode(code);
        const { data: otpRow, error } = await supabase
            .from("email_otps")
            .select("id")
            .eq("email", email)
            .eq("code_hash", code_hash)
            .eq("used", false)
            .gt("expires_at", now)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
        if (error) {
            return server_1.NextResponse.json({ error: error.message }, { status: 500 });
        }
        if (!otpRow) {
            return server_1.NextResponse.json({ error: "invalid or expired code" }, { status: 400 });
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
                return server_1.NextResponse.json({
                    error: status === 409
                        ? "An account with this email already exists. Try signing in instead."
                        : createUserError.message,
                }, { status });
            }
        }
        const { error: updErr } = await supabase
            .from("email_otps")
            .update({ used: true })
            .eq("id", otpRow.id)
            .eq("used", false);
        if (updErr && !password) {
            return server_1.NextResponse.json({ error: updErr.message }, { status: 500 });
        }
        if (updErr) {
            console.error("OTP used-flag update error after signup:", updErr);
        }
        return server_1.NextResponse.json({ ok: true, created: Boolean(password) });
    }
    catch (err) {
        return server_1.NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
    }
}
