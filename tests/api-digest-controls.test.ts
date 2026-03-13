import assert from "node:assert/strict"
import test from "node:test"

import {
  clearModuleMocks,
  createApiAuthMock,
  createJsonRequest,
  createNextServerMock,
  createRateLimiterMock,
  createSupabaseMock,
  loadFreshModule,
  mockModule,
  readJson,
} from "./test-runtime"

type ApiEnvelope<T> = {
  success: boolean
  data: T
}

test.afterEach(() => {
  clearModuleMocks()
})

test("POST /api/digests queues a manual digest and kicks off background processing", async () => {
  const nextServer = createNextServerMock()
  const rateLimiter = createRateLimiterMock({ allowed: true, remaining: 99 })
  const auth = createApiAuthMock()
  const backgroundCalls: Array<{ digestId: string; expectedTenantId: string }> = []
  const supabase = createSupabaseMock([
    {
      assert(state) {
        assert.equal(state.table, "digest_runs")
        assert.equal(state.method, "select")
        assert.equal(state.cardinality, "maybeSingle")
      },
      result: { data: null, error: null },
    },
    {
      assert(state) {
        assert.equal(state.table, "digest_runs")
        assert.equal(state.method, "insert")
        assert.equal(state.cardinality, "single")
        const payload = state.payload as Record<string, unknown>
        assert.equal(payload.tenant_id, "tenant-1")
        assert.equal(payload.status, "pending")
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
  ])

  mockModule("next/server", nextServer.module)
  mockModule("@/lib/rate-limiter", rateLimiter.module)
  mockModule("@/lib/api-auth", auth.module)
  mockModule("@supabase/supabase-js", supabase.module)
  mockModule("@/lib/digest-jobs", {
    async processDigestRunById(input: { digestId: string; expectedTenantId: string }) {
      backgroundCalls.push(input)
      return {
        status: "completed",
        digestId: input.digestId,
        tenantId: input.expectedTenantId,
        message: null,
      }
    },
  })
  mockModule("@/lib/supabase/config", {
    getSupabaseServiceRoleConfig() {
      return { url: "https://example.supabase.co", serviceRoleKey: "service-role" }
    },
  })

  const route = loadFreshModule<{
    POST(request: Request): Promise<Response>
  }>("src/app/api/digests/route")

  const response = await route.POST(
    createJsonRequest("http://localhost/api/digests", {
      method: "POST",
      headers: { authorization: "Bearer token" },
    })
  )

  await Promise.resolve()

  assert.equal(response.status, 202)
  assert.equal(backgroundCalls.length, 1)
  assert.deepEqual(backgroundCalls[0], {
    digestId: "digest-1",
    expectedTenantId: "tenant-1",
  })
  assert.equal(supabase.pending.length, 0)

  const body = await readJson<
    ApiEnvelope<{
      message: string
      digest: { id: string; status: string }
    }>
  >(response)
  assert.equal(body.success, true)
  assert.equal(body.data.digest.id, "digest-1")
  assert.equal(body.data.digest.status, "pending")
  assert.match(body.data.message, /queued/i)
})

test("PATCH /api/digests/[id] cancels a pending digest immediately", async () => {
  const nextServer = createNextServerMock()
  const rateLimiter = createRateLimiterMock({ allowed: true })
  const auth = createApiAuthMock()
  const supabase = createSupabaseMock([
    {
      assert(state) {
        assert.equal(state.table, "digest_runs")
        assert.equal(state.method, "select")
        assert.equal(state.cardinality, "maybeSingle")
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
        assert.equal(state.table, "digest_runs")
        assert.equal(state.method, "update")
        assert.equal(state.cardinality, "maybeSingle")
        const payload = state.payload as Record<string, unknown>
        assert.equal(payload.status, "fail")
        assert.equal(payload.error_message, "Digest cancelled by admin.")
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
  ])

  mockModule("next/server", nextServer.module)
  mockModule("@/lib/rate-limiter", rateLimiter.module)
  mockModule("@/lib/api-auth", auth.module)
  mockModule("@supabase/supabase-js", supabase.module)
  mockModule("@/lib/digest-jobs", {
    async processDigestRunById() {
      throw new Error("Background processor should not run on immediate cancellation")
    },
  })
  mockModule("@/lib/supabase/config", {
    getSupabaseServiceRoleConfig() {
      return { url: "https://example.supabase.co", serviceRoleKey: "service-role" }
    },
  })

  const route = loadFreshModule<{
    PATCH(
      request: Request,
      context: { params: Promise<{ id: string }> }
    ): Promise<Response>
  }>("src/app/api/digests/[id]/route")

  const response = await route.PATCH(
    createJsonRequest("http://localhost/api/digests/digest-1", {
      method: "PATCH",
      headers: { authorization: "Bearer token" },
      body: { action: "cancel" },
    }),
    { params: Promise.resolve({ id: "11111111-1111-1111-1111-111111111111" }) }
  )

  assert.equal(response.status, 200)
  assert.equal(supabase.pending.length, 0)

  const body = await readJson<
    ApiEnvelope<{
      message: string
      digest: { status: string; error_message: string | null }
    }>
  >(response)
  assert.equal(body.success, true)
  assert.equal(body.data.digest.status, "fail")
  assert.equal(body.data.message, "Digest cancelled.")
})

test("PATCH /api/digests/[id] queues a retry for a completed digest", async () => {
  const nextServer = createNextServerMock()
  const rateLimiter = createRateLimiterMock({ allowed: true })
  const auth = createApiAuthMock()
  const backgroundCalls: Array<{ digestId: string; expectedTenantId: string }> = []
  const supabase = createSupabaseMock([
    {
      assert(state) {
        assert.equal(state.table, "digest_runs")
        assert.equal(state.method, "select")
        assert.equal(state.cardinality, "maybeSingle")
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
        assert.equal(state.table, "digest_runs")
        assert.equal(state.method, "select")
        assert.equal(state.cardinality, "maybeSingle")
      },
      result: { data: null, error: null },
    },
    {
      assert(state) {
        assert.equal(state.table, "digest_runs")
        assert.equal(state.method, "insert")
        assert.equal(state.cardinality, "single")
        const payload = state.payload as Record<string, unknown>
        assert.equal(payload.tenant_id, "tenant-1")
        assert.equal(payload.status, "pending")
        assert.equal(
          (payload.metadata as Record<string, unknown>).retry_of,
          "11111111-1111-1111-1111-111111111111"
        )
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
  ])

  mockModule("next/server", nextServer.module)
  mockModule("@/lib/rate-limiter", rateLimiter.module)
  mockModule("@/lib/api-auth", auth.module)
  mockModule("@supabase/supabase-js", supabase.module)
  mockModule("@/lib/digest-jobs", {
    async processDigestRunById(input: { digestId: string; expectedTenantId: string }) {
      backgroundCalls.push(input)
      return {
        status: "completed",
        digestId: input.digestId,
        tenantId: input.expectedTenantId,
        message: null,
      }
    },
  })
  mockModule("@/lib/supabase/config", {
    getSupabaseServiceRoleConfig() {
      return { url: "https://example.supabase.co", serviceRoleKey: "service-role" }
    },
  })

  const route = loadFreshModule<{
    PATCH(
      request: Request,
      context: { params: Promise<{ id: string }> }
    ): Promise<Response>
  }>("src/app/api/digests/[id]/route")

  const response = await route.PATCH(
    createJsonRequest("http://localhost/api/digests/digest-1", {
      method: "PATCH",
      headers: { authorization: "Bearer token" },
      body: { action: "retry" },
    }),
    { params: Promise.resolve({ id: "11111111-1111-1111-1111-111111111111" }) }
  )

  await Promise.resolve()

  assert.equal(response.status, 202)
  assert.equal(backgroundCalls.length, 1)
  assert.deepEqual(backgroundCalls[0], {
    digestId: "digest-retry-1",
    expectedTenantId: "tenant-1",
  })
  assert.equal(supabase.pending.length, 0)

  const body = await readJson<
    ApiEnvelope<{
      message: string
      digest: { id: string; status: string }
    }>
  >(response)
  assert.equal(body.success, true)
  assert.equal(body.data.digest.id, "digest-retry-1")
  assert.equal(body.data.digest.status, "pending")
  assert.match(body.data.message, /retry queued/i)
})
