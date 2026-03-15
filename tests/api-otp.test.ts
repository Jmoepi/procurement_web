import assert from "node:assert/strict"
import test from "node:test"

import {
  clearModuleMocks,
  createJsonRequest,
  createNextServerMock,
  createRateLimiterMock,
  createSupabaseMock,
  loadFreshModule,
  mockModule,
  readJson,
} from "./test-runtime"

type OtpSuccessResponse = {
  ok: boolean
  cooldown_seconds?: number
  created?: boolean
  error?: string
  delivery?: "resend" | "console"
  dev_code?: string
  message?: string
}

test.afterEach(() => {
  clearModuleMocks()
})

test("POST /api/auth/request-otp returns 429 when rate limited", async () => {
  const nextServer = createNextServerMock()
  const rateLimiter = createRateLimiterMock({ allowed: false })

  mockModule("next/server", nextServer.module)
  mockModule("@/lib/rate-limiter", rateLimiter.module)
  mockModule("@supabase/supabase-js", {
    createClient() {
      throw new Error("Supabase should not be called when rate limited")
    },
  })
  mockModule("@/lib/email", {
    async sendTransactionalEmail() {
      throw new Error("Email should not be sent when rate limited")
    },
  })
  mockModule("@/lib/supabase/config", {
    getSupabaseServiceRoleConfig() {
      return { url: "https://example.supabase.co", serviceRoleKey: "service-role" }
    },
  })

  const route = loadFreshModule<{
    POST(request: Request): Promise<Response>
  }>("src/app/api/auth/request-otp/route")

  const response = await route.POST(
    createJsonRequest("http://localhost/api/auth/request-otp", {
      method: "POST",
      body: { email: "person@example.com" },
    })
  )

  assert.equal(response.status, 429)

  const body = await readJson<OtpSuccessResponse>(response)
  assert.equal(body.error, "Too many OTP requests. Please wait before trying again.")
})

test("POST /api/auth/request-otp stores an OTP and sends email", async () => {
  const nextServer = createNextServerMock()
  const rateLimiter = createRateLimiterMock({ allowed: true, remaining: 4 })
  const sentEmails: Array<{ to: string; subject: string; text: string }> = []
  const supabase = createSupabaseMock([
    {
      assert(state) {
        assert.equal(state.table, "email_otps")
        assert.equal(state.method, "select")
        assert.equal(state.cardinality, "maybeSingle")
      },
      result: { data: null, error: null },
    },
    {
      assert(state) {
        assert.equal(state.table, "email_otps")
        assert.equal(state.method, "update")
        assert.deepEqual(
          state.filters.filter((filter) => filter.operator === "eq"),
          [
            { operator: "eq", column: "email", value: "person@example.com" },
            { operator: "eq", column: "used", value: false },
          ]
        )
      },
      result: { data: null, error: null },
    },
    {
      assert(state) {
        assert.equal(state.table, "email_otps")
        assert.equal(state.method, "insert")
        assert.equal(state.cardinality, "single")
        const payload = state.payload as Record<string, unknown>
        assert.equal(payload.email, "person@example.com")
        assert.equal(typeof payload.code, "string")
        assert.equal(typeof payload.code_hash, "string")
        assert.equal(typeof payload.expires_at, "string")
      },
      result: { data: { id: "otp-1" }, error: null },
    },
  ])

  mockModule("next/server", nextServer.module)
  mockModule("@/lib/rate-limiter", rateLimiter.module)
  mockModule("@supabase/supabase-js", supabase.module)
  mockModule("@/lib/email", {
    async sendTransactionalEmail(message: {
      to: string
      subject: string
      text: string
    }) {
      sentEmails.push(message)
      return { delivered: true, provider: "resend" as const }
    },
  })
  mockModule("@/lib/supabase/config", {
    getSupabaseServiceRoleConfig() {
      return { url: "https://example.supabase.co", serviceRoleKey: "service-role" }
    },
  })

  const route = loadFreshModule<{
    POST(request: Request): Promise<Response>
  }>("src/app/api/auth/request-otp/route")

  const response = await route.POST(
    createJsonRequest("http://localhost/api/auth/request-otp", {
      method: "POST",
      body: { email: "person@example.com" },
    })
  )

  assert.equal(response.status, 200)
  assert.equal(sentEmails.length, 1)
  assert.equal(sentEmails[0]?.to, "person@example.com")
  assert.equal(supabase.pending.length, 0)

  const body = await readJson<OtpSuccessResponse>(response)
  assert.equal(body.ok, true)
  assert.equal(body.cooldown_seconds, 60)
  assert.equal(body.delivery, "resend")
})

test("POST /api/auth/request-otp returns console delivery metadata when email falls back locally", async () => {
  const nextServer = createNextServerMock()
  const rateLimiter = createRateLimiterMock({ allowed: true, remaining: 4 })
  const supabase = createSupabaseMock([
    {
      result: { data: null, error: null },
    },
    {
      result: { data: null, error: null },
    },
    {
      result: { data: { id: "otp-1" }, error: null },
    },
  ])

  mockModule("next/server", nextServer.module)
  mockModule("@/lib/rate-limiter", rateLimiter.module)
  mockModule("@supabase/supabase-js", supabase.module)
  mockModule("@/lib/email", {
    async sendTransactionalEmail() {
      return {
        delivered: false,
        provider: "console" as const,
        reason: "email provider not configured",
      }
    },
  })
  mockModule("@/lib/supabase/config", {
    getSupabaseServiceRoleConfig() {
      return { url: "https://example.supabase.co", serviceRoleKey: "service-role" }
    },
  })

  const previousEnv = process.env.NODE_ENV
  ;(process.env as Record<string, string | undefined>).NODE_ENV = "development"

  try {
    const route = loadFreshModule<{
      POST(request: Request): Promise<Response>
    }>("src/app/api/auth/request-otp/route")

    const response = await route.POST(
      createJsonRequest("http://localhost/api/auth/request-otp", {
        method: "POST",
        body: { email: "person@example.com" },
      })
    )

    assert.equal(response.status, 200)

    const body = await readJson<OtpSuccessResponse>(response)
    assert.equal(body.ok, true)
    assert.equal(body.delivery, "console")
    assert.equal(typeof body.dev_code, "string")
    assert.equal(body.dev_code?.length, 6)
  } finally {
    ;(process.env as Record<string, string | undefined>).NODE_ENV = previousEnv
  }
})

test("POST /api/auth/verify-otp creates an account after a valid code", async () => {
  const nextServer = createNextServerMock()
  const rateLimiter = createRateLimiterMock({ allowed: true, remaining: 9 })
  const supabase = createSupabaseMock(
    [
      {
        assert(state) {
          assert.equal(state.table, "email_otps")
          assert.equal(state.method, "select")
          assert.equal(state.cardinality, "maybeSingle")
        },
        result: { data: { id: "otp-1" }, error: null },
      },
      {
        assert(state) {
          assert.equal(state.table, "email_otps")
          assert.equal(state.method, "update")
          assert.deepEqual(
            state.filters.filter((filter) => filter.operator === "eq"),
            [
              { operator: "eq", column: "id", value: "otp-1" },
              { operator: "eq", column: "used", value: false },
            ]
          )
        },
        result: { data: null, error: null },
      },
    ],
    {
      createUserResult: { data: { user: { id: "user-1" } }, error: null },
    }
  )

  mockModule("next/server", nextServer.module)
  mockModule("@/lib/rate-limiter", rateLimiter.module)
  mockModule("@supabase/supabase-js", supabase.module)
  mockModule("@/lib/supabase/config", {
    getSupabaseServiceRoleConfig() {
      return { url: "https://example.supabase.co", serviceRoleKey: "service-role" }
    },
  })

  const route = loadFreshModule<{
    POST(request: Request): Promise<Response>
  }>("src/app/api/auth/verify-otp/route")

  const response = await route.POST(
    createJsonRequest("http://localhost/api/auth/verify-otp", {
      method: "POST",
      body: {
        email: "person@example.com",
        code: "123456",
        password: "strong-password",
        full_name: "Person Example",
        invite_token: "invite-1",
      },
    })
  )

  assert.equal(response.status, 200)
  assert.equal(supabase.pending.length, 0)
  assert.equal(supabase.createUserCalls.length, 1)

  const createUserPayload = supabase.createUserCalls[0] as Record<string, unknown>
  assert.equal(createUserPayload.email, "person@example.com")
  assert.equal(createUserPayload.password, "strong-password")
  assert.deepEqual(createUserPayload.user_metadata, {
    full_name: "Person Example",
    invite_token: "invite-1",
  })

  const body = await readJson<OtpSuccessResponse>(response)
  assert.deepEqual(body, { ok: true, created: true })
})
