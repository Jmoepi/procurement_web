import assert from "node:assert/strict"
import path from "node:path"

type TestRuntime = {
  compiledRoot: string
  mocks: Map<string, unknown>
}

type QueryMethod = "select" | "insert" | "update" | "delete" | null

export type QueryState = {
  table: string
  method: QueryMethod
  payload: unknown
  selectClause: string | null
  filters: Array<{
    operator: "eq" | "in" | "gt" | "order" | "limit"
    column: string
    value: unknown
  }>
  cardinality: "single" | "maybeSingle" | null
}

type QueryResult = {
  data?: unknown
  error?: unknown
}

type QueryExpectation = {
  assert?: (state: QueryState) => void
  result: QueryResult | ((state: QueryState) => QueryResult | Promise<QueryResult>)
}

declare global {
  // eslint-disable-next-line no-var
  var __codexTestRuntime: TestRuntime | undefined
}

function getRuntime() {
  const runtime = globalThis.__codexTestRuntime

  if (!runtime) {
    throw new Error("Test runtime is not initialized. Did register-tests run?")
  }

  return runtime
}

export function clearModuleMocks() {
  getRuntime().mocks.clear()
}

export function mockModule(id: string, value: unknown) {
  getRuntime().mocks.set(id, value)
}

export function loadFreshModule<T>(sourcePath: string): T {
  const runtime = getRuntime()
  const normalizedPath = sourcePath.replace(/\\/g, "/").replace(/\.ts$/, ".js")
  const absolutePath = path.join(runtime.compiledRoot, normalizedPath)
  const resolved = require.resolve(absolutePath)
  delete require.cache[resolved]
  return require(resolved) as T
}

export function createJsonRequest(
  url: string,
  init: {
    method?: string
    body?: unknown
    headers?: HeadersInit
  } = {}
) {
  const headers = new Headers(init.headers)
  let body: string | undefined

  if (init.body !== undefined) {
    headers.set("content-type", "application/json")
    body = JSON.stringify(init.body)
  }

  return new Request(url, {
    method: init.method ?? "GET",
    headers,
    body,
  })
}

export async function readJson<T>(response: Response) {
  return (await response.json()) as T
}

export function createNextServerMock() {
  const afterCalls: Array<() => unknown | Promise<unknown>> = []

  class MockNextResponse extends Response {
    static json(data: unknown, init: ResponseInit = {}) {
      const headers = new Headers(init.headers)

      if (!headers.has("content-type")) {
        headers.set("content-type", "application/json")
      }

      return new Response(JSON.stringify(data), {
        ...init,
        headers,
      })
    }
  }

  return {
    afterCalls,
    module: {
      NextRequest: Request,
      NextResponse: MockNextResponse,
      after(callback: () => unknown | Promise<unknown>) {
        afterCalls.push(callback)
        void Promise.resolve().then(callback)
      },
    },
  }
}

export function createRateLimiterMock(
  result:
    | { allowed: boolean; remaining?: number; resetTime?: number }
    | (() => Promise<{ allowed: boolean; remaining?: number; resetTime?: number }>)
) {
  const calls: string[] = []

  return {
    calls,
    module: {
      createDurableRateLimiter() {
        return async (identifier: string) => {
          calls.push(identifier)

          const value =
            typeof result === "function"
              ? await result()
              : result

          return {
            allowed: value.allowed,
            remaining: value.remaining ?? 0,
            resetTime: value.resetTime ?? Date.now() + 60_000,
          }
        }
      },
      createRateLimiter() {
        return () => ({
          allowed: true,
          remaining: 999,
          resetTime: Date.now() + 60_000,
        })
      },
      getClientIdentifier() {
        return "test-client"
      },
    },
  }
}

export function createApiAuthMock(overrides: {
  auth?: {
    userId: string
    email: string
    tenantId: string
    role: "admin" | "member"
  }
  response?: Response | null
  adminResponse?: Response | null
} = {}) {
  const auth =
    overrides.auth ?? {
      userId: "user-1",
      email: "admin@example.com",
      tenantId: "tenant-1",
      role: "admin" as const,
    }

  return {
    module: {
      async requireAuth() {
        return {
          auth,
          response: overrides.response ?? null,
        }
      },
      requireAdmin() {
        return overrides.adminResponse ?? null
      },
    },
  }
}

export function createSupabaseMock(
  expectations: QueryExpectation[],
  options: {
    createUserResult?:
      | QueryResult
      | ((input: unknown) => QueryResult | Promise<QueryResult>)
  } = {}
) {
  const executed: QueryState[] = []
  const createUserCalls: unknown[] = []
  const pending = [...expectations]

  async function resolveExpectation(state: QueryState) {
    const expectation = pending.shift()

    assert.ok(
      expectation,
      `Unexpected Supabase query: ${state.table} ${state.method ?? "unknown"}`
    )

    expectation.assert?.(state)
    executed.push(state)

    const result =
      typeof expectation.result === "function"
        ? await expectation.result(state)
        : expectation.result

    return {
      data: null,
      error: null,
      ...result,
    }
  }

  class QueryBuilder {
    private state: QueryState

    constructor(table: string) {
      this.state = {
        table,
        method: null,
        payload: null,
        selectClause: null,
        filters: [],
        cardinality: null,
      }
    }

    select(selectClause = "*") {
      this.state.selectClause = selectClause
      if (!this.state.method) {
        this.state.method = "select"
      }
      return this
    }

    insert(payload: unknown) {
      this.state.method = "insert"
      this.state.payload = payload
      return this
    }

    update(payload: unknown) {
      this.state.method = "update"
      this.state.payload = payload
      return this
    }

    delete() {
      this.state.method = "delete"
      return this
    }

    eq(column: string, value: unknown) {
      this.state.filters.push({ operator: "eq", column, value })
      return this
    }

    in(column: string, value: unknown) {
      this.state.filters.push({ operator: "in", column, value })
      return this
    }

    gt(column: string, value: unknown) {
      this.state.filters.push({ operator: "gt", column, value })
      return this
    }

    order(column: string, value: unknown) {
      this.state.filters.push({ operator: "order", column, value })
      return this
    }

    limit(value: number) {
      this.state.filters.push({ operator: "limit", column: "limit", value })
      return this
    }

    single() {
      this.state.cardinality = "single"
      return resolveExpectation({ ...this.state, filters: [...this.state.filters] })
    }

    maybeSingle() {
      this.state.cardinality = "maybeSingle"
      return resolveExpectation({ ...this.state, filters: [...this.state.filters] })
    }

    then<TResult1 = unknown, TResult2 = never>(
      onfulfilled?:
        | ((value: { data: unknown; error: unknown }) => TResult1 | PromiseLike<TResult1>)
        | null,
      onrejected?:
        | ((reason: unknown) => TResult2 | PromiseLike<TResult2>)
        | null
    ) {
      return resolveExpectation({
        ...this.state,
        filters: [...this.state.filters],
      }).then(onfulfilled, onrejected)
    }
  }

  return {
    executed,
    createUserCalls,
    pending,
    module: {
      createClient() {
        return {
          from(table: string) {
            return new QueryBuilder(table)
          },
          auth: {
            admin: {
              async createUser(input: unknown) {
                createUserCalls.push(input)

                const result =
                  typeof options.createUserResult === "function"
                    ? await options.createUserResult(input)
                    : options.createUserResult

                return {
                  data: null,
                  error: null,
                  ...result,
                }
              },
            },
          },
        }
      },
    },
  }
}
