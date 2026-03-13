"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importDefault(require("node:test"));
const test_runtime_1 = require("./test-runtime");
node_test_1.default.afterEach(() => {
    (0, test_runtime_1.clearModuleMocks)();
});
(0, node_test_1.default)("POST /api/auth/request-otp returns 429 when rate limited", async () => {
    const nextServer = (0, test_runtime_1.createNextServerMock)();
    const rateLimiter = (0, test_runtime_1.createRateLimiterMock)({ allowed: false });
    (0, test_runtime_1.mockModule)("next/server", nextServer.module);
    (0, test_runtime_1.mockModule)("@/lib/rate-limiter", rateLimiter.module);
    (0, test_runtime_1.mockModule)("@supabase/supabase-js", {
        createClient() {
            throw new Error("Supabase should not be called when rate limited");
        },
    });
    (0, test_runtime_1.mockModule)("@/lib/email", {
        async sendTransactionalEmail() {
            throw new Error("Email should not be sent when rate limited");
        },
    });
    (0, test_runtime_1.mockModule)("@/lib/supabase/config", {
        getSupabaseServiceRoleConfig() {
            return { url: "https://example.supabase.co", serviceRoleKey: "service-role" };
        },
    });
    const route = (0, test_runtime_1.loadFreshModule)("src/app/api/auth/request-otp/route");
    const response = await route.POST((0, test_runtime_1.createJsonRequest)("http://localhost/api/auth/request-otp", {
        method: "POST",
        body: { email: "person@example.com" },
    }));
    strict_1.default.equal(response.status, 429);
    const body = await (0, test_runtime_1.readJson)(response);
    strict_1.default.equal(body.error, "Too many OTP requests. Please wait before trying again.");
});
(0, node_test_1.default)("POST /api/auth/request-otp stores an OTP and sends email", async () => {
    const nextServer = (0, test_runtime_1.createNextServerMock)();
    const rateLimiter = (0, test_runtime_1.createRateLimiterMock)({ allowed: true, remaining: 4 });
    const sentEmails = [];
    const supabase = (0, test_runtime_1.createSupabaseMock)([
        {
            assert(state) {
                strict_1.default.equal(state.table, "email_otps");
                strict_1.default.equal(state.method, "select");
                strict_1.default.equal(state.cardinality, "maybeSingle");
            },
            result: { data: null, error: null },
        },
        {
            assert(state) {
                strict_1.default.equal(state.table, "email_otps");
                strict_1.default.equal(state.method, "update");
                strict_1.default.deepEqual(state.filters.filter((filter) => filter.operator === "eq"), [
                    { operator: "eq", column: "email", value: "person@example.com" },
                    { operator: "eq", column: "used", value: false },
                ]);
            },
            result: { data: null, error: null },
        },
        {
            assert(state) {
                strict_1.default.equal(state.table, "email_otps");
                strict_1.default.equal(state.method, "insert");
                strict_1.default.equal(state.cardinality, "single");
                const payload = state.payload;
                strict_1.default.equal(payload.email, "person@example.com");
                strict_1.default.equal(typeof payload.code, "string");
                strict_1.default.equal(typeof payload.code_hash, "string");
                strict_1.default.equal(typeof payload.expires_at, "string");
            },
            result: { data: { id: "otp-1" }, error: null },
        },
    ]);
    (0, test_runtime_1.mockModule)("next/server", nextServer.module);
    (0, test_runtime_1.mockModule)("@/lib/rate-limiter", rateLimiter.module);
    (0, test_runtime_1.mockModule)("@supabase/supabase-js", supabase.module);
    (0, test_runtime_1.mockModule)("@/lib/email", {
        async sendTransactionalEmail(message) {
            sentEmails.push(message);
        },
    });
    (0, test_runtime_1.mockModule)("@/lib/supabase/config", {
        getSupabaseServiceRoleConfig() {
            return { url: "https://example.supabase.co", serviceRoleKey: "service-role" };
        },
    });
    const route = (0, test_runtime_1.loadFreshModule)("src/app/api/auth/request-otp/route");
    const response = await route.POST((0, test_runtime_1.createJsonRequest)("http://localhost/api/auth/request-otp", {
        method: "POST",
        body: { email: "person@example.com" },
    }));
    strict_1.default.equal(response.status, 200);
    strict_1.default.equal(sentEmails.length, 1);
    strict_1.default.equal(sentEmails[0]?.to, "person@example.com");
    strict_1.default.equal(supabase.pending.length, 0);
    const body = await (0, test_runtime_1.readJson)(response);
    strict_1.default.equal(body.ok, true);
    strict_1.default.equal(body.cooldown_seconds, 60);
});
(0, node_test_1.default)("POST /api/auth/verify-otp creates an account after a valid code", async () => {
    const nextServer = (0, test_runtime_1.createNextServerMock)();
    const rateLimiter = (0, test_runtime_1.createRateLimiterMock)({ allowed: true, remaining: 9 });
    const supabase = (0, test_runtime_1.createSupabaseMock)([
        {
            assert(state) {
                strict_1.default.equal(state.table, "email_otps");
                strict_1.default.equal(state.method, "select");
                strict_1.default.equal(state.cardinality, "maybeSingle");
            },
            result: { data: { id: "otp-1" }, error: null },
        },
        {
            assert(state) {
                strict_1.default.equal(state.table, "email_otps");
                strict_1.default.equal(state.method, "update");
                strict_1.default.deepEqual(state.filters.filter((filter) => filter.operator === "eq"), [
                    { operator: "eq", column: "id", value: "otp-1" },
                    { operator: "eq", column: "used", value: false },
                ]);
            },
            result: { data: null, error: null },
        },
    ], {
        createUserResult: { data: { user: { id: "user-1" } }, error: null },
    });
    (0, test_runtime_1.mockModule)("next/server", nextServer.module);
    (0, test_runtime_1.mockModule)("@/lib/rate-limiter", rateLimiter.module);
    (0, test_runtime_1.mockModule)("@supabase/supabase-js", supabase.module);
    (0, test_runtime_1.mockModule)("@/lib/supabase/config", {
        getSupabaseServiceRoleConfig() {
            return { url: "https://example.supabase.co", serviceRoleKey: "service-role" };
        },
    });
    const route = (0, test_runtime_1.loadFreshModule)("src/app/api/auth/verify-otp/route");
    const response = await route.POST((0, test_runtime_1.createJsonRequest)("http://localhost/api/auth/verify-otp", {
        method: "POST",
        body: {
            email: "person@example.com",
            code: "123456",
            password: "strong-password",
            full_name: "Person Example",
            invite_token: "invite-1",
        },
    }));
    strict_1.default.equal(response.status, 200);
    strict_1.default.equal(supabase.pending.length, 0);
    strict_1.default.equal(supabase.createUserCalls.length, 1);
    const createUserPayload = supabase.createUserCalls[0];
    strict_1.default.equal(createUserPayload.email, "person@example.com");
    strict_1.default.equal(createUserPayload.password, "strong-password");
    strict_1.default.deepEqual(createUserPayload.user_metadata, {
        full_name: "Person Example",
        invite_token: "invite-1",
    });
    const body = await (0, test_runtime_1.readJson)(response);
    strict_1.default.deepEqual(body, { ok: true, created: true });
});
