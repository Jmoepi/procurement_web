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
(0, node_test_1.default)("POST /api/digests queues a manual digest and kicks off background processing", async () => {
    const nextServer = (0, test_runtime_1.createNextServerMock)();
    const rateLimiter = (0, test_runtime_1.createRateLimiterMock)({ allowed: true, remaining: 99 });
    const auth = (0, test_runtime_1.createApiAuthMock)();
    const backgroundCalls = [];
    const supabase = (0, test_runtime_1.createSupabaseMock)([
        {
            assert(state) {
                strict_1.default.equal(state.table, "digest_runs");
                strict_1.default.equal(state.method, "select");
                strict_1.default.equal(state.cardinality, "maybeSingle");
            },
            result: { data: null, error: null },
        },
        {
            assert(state) {
                strict_1.default.equal(state.table, "digest_runs");
                strict_1.default.equal(state.method, "insert");
                strict_1.default.equal(state.cardinality, "single");
                const payload = state.payload;
                strict_1.default.equal(payload.tenant_id, "tenant-1");
                strict_1.default.equal(payload.status, "pending");
            },
            result: {
                data: {
                    id: "digest-1",
                    tenant_id: "tenant-1",
                    run_date: "2026-03-13",
                    tenders_found: 0,
                    emails_sent: 0,
                    status: "pending",
                    error_message: null,
                    metadata: {},
                    created_at: "2026-03-13T09:00:00.000Z",
                },
                error: null,
            },
        },
    ]);
    (0, test_runtime_1.mockModule)("next/server", nextServer.module);
    (0, test_runtime_1.mockModule)("@/lib/rate-limiter", rateLimiter.module);
    (0, test_runtime_1.mockModule)("@/lib/api-auth", auth.module);
    (0, test_runtime_1.mockModule)("@supabase/supabase-js", supabase.module);
    (0, test_runtime_1.mockModule)("@/lib/digest-jobs", {
        async processDigestRunById(input) {
            backgroundCalls.push(input);
            return {
                status: "completed",
                digestId: input.digestId,
                tenantId: input.expectedTenantId,
                message: null,
            };
        },
    });
    (0, test_runtime_1.mockModule)("@/lib/supabase/config", {
        getSupabaseServiceRoleConfig() {
            return { url: "https://example.supabase.co", serviceRoleKey: "service-role" };
        },
    });
    const route = (0, test_runtime_1.loadFreshModule)("src/app/api/digests/route");
    const response = await route.POST((0, test_runtime_1.createJsonRequest)("http://localhost/api/digests", {
        method: "POST",
        headers: { authorization: "Bearer token" },
    }));
    await Promise.resolve();
    strict_1.default.equal(response.status, 202);
    strict_1.default.equal(backgroundCalls.length, 1);
    strict_1.default.deepEqual(backgroundCalls[0], {
        digestId: "digest-1",
        expectedTenantId: "tenant-1",
    });
    strict_1.default.equal(supabase.pending.length, 0);
    const body = await (0, test_runtime_1.readJson)(response);
    strict_1.default.equal(body.success, true);
    strict_1.default.equal(body.data.digest.id, "digest-1");
    strict_1.default.equal(body.data.digest.status, "pending");
    strict_1.default.match(body.data.message, /queued/i);
});
(0, node_test_1.default)("PATCH /api/digests/[id] cancels a pending digest immediately", async () => {
    const nextServer = (0, test_runtime_1.createNextServerMock)();
    const rateLimiter = (0, test_runtime_1.createRateLimiterMock)({ allowed: true });
    const auth = (0, test_runtime_1.createApiAuthMock)();
    const supabase = (0, test_runtime_1.createSupabaseMock)([
        {
            assert(state) {
                strict_1.default.equal(state.table, "digest_runs");
                strict_1.default.equal(state.method, "select");
                strict_1.default.equal(state.cardinality, "maybeSingle");
            },
            result: {
                data: {
                    id: "digest-1",
                    tenant_id: "tenant-1",
                    run_date: "2026-03-13",
                    status: "pending",
                    tenders_found: 0,
                    emails_sent: 0,
                    started_at: "2026-03-13T09:00:00.000Z",
                    finished_at: null,
                    logs: null,
                    error_message: null,
                    metadata: {},
                    created_at: "2026-03-13T09:00:00.000Z",
                },
                error: null,
            },
        },
        {
            assert(state) {
                strict_1.default.equal(state.table, "digest_runs");
                strict_1.default.equal(state.method, "update");
                strict_1.default.equal(state.cardinality, "maybeSingle");
                const payload = state.payload;
                strict_1.default.equal(payload.status, "fail");
                strict_1.default.equal(payload.error_message, "Digest cancelled by admin.");
            },
            result: {
                data: {
                    id: "digest-1",
                    tenant_id: "tenant-1",
                    run_date: "2026-03-13",
                    status: "fail",
                    tenders_found: 0,
                    emails_sent: 0,
                    started_at: "2026-03-13T09:00:00.000Z",
                    finished_at: "2026-03-13T09:01:00.000Z",
                    logs: null,
                    error_message: "Digest cancelled by admin.",
                    metadata: {
                        cancel_requested: true,
                        cancel_requested_by: "user-1",
                    },
                    created_at: "2026-03-13T09:00:00.000Z",
                },
                error: null,
            },
        },
    ]);
    (0, test_runtime_1.mockModule)("next/server", nextServer.module);
    (0, test_runtime_1.mockModule)("@/lib/rate-limiter", rateLimiter.module);
    (0, test_runtime_1.mockModule)("@/lib/api-auth", auth.module);
    (0, test_runtime_1.mockModule)("@supabase/supabase-js", supabase.module);
    (0, test_runtime_1.mockModule)("@/lib/digest-jobs", {
        async processDigestRunById() {
            throw new Error("Background processor should not run on immediate cancellation");
        },
    });
    (0, test_runtime_1.mockModule)("@/lib/supabase/config", {
        getSupabaseServiceRoleConfig() {
            return { url: "https://example.supabase.co", serviceRoleKey: "service-role" };
        },
    });
    const route = (0, test_runtime_1.loadFreshModule)("src/app/api/digests/[id]/route");
    const response = await route.PATCH((0, test_runtime_1.createJsonRequest)("http://localhost/api/digests/digest-1", {
        method: "PATCH",
        headers: { authorization: "Bearer token" },
        body: { action: "cancel" },
    }), { params: Promise.resolve({ id: "11111111-1111-1111-1111-111111111111" }) });
    strict_1.default.equal(response.status, 200);
    strict_1.default.equal(supabase.pending.length, 0);
    const body = await (0, test_runtime_1.readJson)(response);
    strict_1.default.equal(body.success, true);
    strict_1.default.equal(body.data.digest.status, "fail");
    strict_1.default.equal(body.data.message, "Digest cancelled.");
});
(0, node_test_1.default)("PATCH /api/digests/[id] queues a retry for a completed digest", async () => {
    const nextServer = (0, test_runtime_1.createNextServerMock)();
    const rateLimiter = (0, test_runtime_1.createRateLimiterMock)({ allowed: true });
    const auth = (0, test_runtime_1.createApiAuthMock)();
    const backgroundCalls = [];
    const supabase = (0, test_runtime_1.createSupabaseMock)([
        {
            assert(state) {
                strict_1.default.equal(state.table, "digest_runs");
                strict_1.default.equal(state.method, "select");
                strict_1.default.equal(state.cardinality, "maybeSingle");
            },
            result: {
                data: {
                    id: "digest-1",
                    tenant_id: "tenant-1",
                    run_date: "2026-03-13",
                    status: "success",
                    tenders_found: 5,
                    emails_sent: 12,
                    started_at: "2026-03-13T09:00:00.000Z",
                    finished_at: "2026-03-13T09:05:00.000Z",
                    logs: null,
                    error_message: null,
                    metadata: {},
                    created_at: "2026-03-13T09:00:00.000Z",
                },
                error: null,
            },
        },
        {
            assert(state) {
                strict_1.default.equal(state.table, "digest_runs");
                strict_1.default.equal(state.method, "select");
                strict_1.default.equal(state.cardinality, "maybeSingle");
            },
            result: { data: null, error: null },
        },
        {
            assert(state) {
                strict_1.default.equal(state.table, "digest_runs");
                strict_1.default.equal(state.method, "insert");
                strict_1.default.equal(state.cardinality, "single");
                const payload = state.payload;
                strict_1.default.equal(payload.tenant_id, "tenant-1");
                strict_1.default.equal(payload.status, "pending");
                strict_1.default.equal(payload.metadata.retry_of, "11111111-1111-1111-1111-111111111111");
            },
            result: {
                data: {
                    id: "digest-retry-1",
                    tenant_id: "tenant-1",
                    run_date: "2026-03-13",
                    status: "pending",
                    tenders_found: 0,
                    emails_sent: 0,
                    started_at: "2026-03-13T09:06:00.000Z",
                    finished_at: null,
                    logs: null,
                    error_message: null,
                    metadata: {
                        retry_of: "11111111-1111-1111-1111-111111111111",
                    },
                    created_at: "2026-03-13T09:06:00.000Z",
                },
                error: null,
            },
        },
    ]);
    (0, test_runtime_1.mockModule)("next/server", nextServer.module);
    (0, test_runtime_1.mockModule)("@/lib/rate-limiter", rateLimiter.module);
    (0, test_runtime_1.mockModule)("@/lib/api-auth", auth.module);
    (0, test_runtime_1.mockModule)("@supabase/supabase-js", supabase.module);
    (0, test_runtime_1.mockModule)("@/lib/digest-jobs", {
        async processDigestRunById(input) {
            backgroundCalls.push(input);
            return {
                status: "completed",
                digestId: input.digestId,
                tenantId: input.expectedTenantId,
                message: null,
            };
        },
    });
    (0, test_runtime_1.mockModule)("@/lib/supabase/config", {
        getSupabaseServiceRoleConfig() {
            return { url: "https://example.supabase.co", serviceRoleKey: "service-role" };
        },
    });
    const route = (0, test_runtime_1.loadFreshModule)("src/app/api/digests/[id]/route");
    const response = await route.PATCH((0, test_runtime_1.createJsonRequest)("http://localhost/api/digests/digest-1", {
        method: "PATCH",
        headers: { authorization: "Bearer token" },
        body: { action: "retry" },
    }), { params: Promise.resolve({ id: "11111111-1111-1111-1111-111111111111" }) });
    await Promise.resolve();
    strict_1.default.equal(response.status, 202);
    strict_1.default.equal(backgroundCalls.length, 1);
    strict_1.default.deepEqual(backgroundCalls[0], {
        digestId: "digest-retry-1",
        expectedTenantId: "tenant-1",
    });
    strict_1.default.equal(supabase.pending.length, 0);
    const body = await (0, test_runtime_1.readJson)(response);
    strict_1.default.equal(body.success, true);
    strict_1.default.equal(body.data.digest.id, "digest-retry-1");
    strict_1.default.equal(body.data.digest.status, "pending");
    strict_1.default.match(body.data.message, /retry queued/i);
});
