"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearModuleMocks = clearModuleMocks;
exports.mockModule = mockModule;
exports.loadFreshModule = loadFreshModule;
exports.createJsonRequest = createJsonRequest;
exports.readJson = readJson;
exports.createNextServerMock = createNextServerMock;
exports.createRateLimiterMock = createRateLimiterMock;
exports.createApiAuthMock = createApiAuthMock;
exports.createSupabaseMock = createSupabaseMock;
const strict_1 = __importDefault(require("node:assert/strict"));
const node_path_1 = __importDefault(require("node:path"));
function getRuntime() {
    const runtime = globalThis.__codexTestRuntime;
    if (!runtime) {
        throw new Error("Test runtime is not initialized. Did register-tests run?");
    }
    return runtime;
}
function clearModuleMocks() {
    getRuntime().mocks.clear();
}
function mockModule(id, value) {
    getRuntime().mocks.set(id, value);
}
function loadFreshModule(sourcePath) {
    const runtime = getRuntime();
    const normalizedPath = sourcePath.replace(/\\/g, "/").replace(/\.ts$/, ".js");
    const absolutePath = node_path_1.default.join(runtime.compiledRoot, normalizedPath);
    const resolved = require.resolve(absolutePath);
    delete require.cache[resolved];
    return require(resolved);
}
function createJsonRequest(url, init = {}) {
    const headers = new Headers(init.headers);
    let body;
    if (init.body !== undefined) {
        headers.set("content-type", "application/json");
        body = JSON.stringify(init.body);
    }
    return new Request(url, {
        method: init.method ?? "GET",
        headers,
        body,
    });
}
async function readJson(response) {
    return (await response.json());
}
function createNextServerMock() {
    const afterCalls = [];
    class MockNextResponse extends Response {
        static json(data, init = {}) {
            const headers = new Headers(init.headers);
            if (!headers.has("content-type")) {
                headers.set("content-type", "application/json");
            }
            return new Response(JSON.stringify(data), {
                ...init,
                headers,
            });
        }
    }
    return {
        afterCalls,
        module: {
            NextRequest: Request,
            NextResponse: MockNextResponse,
            after(callback) {
                afterCalls.push(callback);
                void Promise.resolve().then(callback);
            },
        },
    };
}
function createRateLimiterMock(result) {
    const calls = [];
    return {
        calls,
        module: {
            createDurableRateLimiter() {
                return async (identifier) => {
                    calls.push(identifier);
                    const value = typeof result === "function"
                        ? await result()
                        : result;
                    return {
                        allowed: value.allowed,
                        remaining: value.remaining ?? 0,
                        resetTime: value.resetTime ?? Date.now() + 60000,
                    };
                };
            },
            createRateLimiter() {
                return () => ({
                    allowed: true,
                    remaining: 999,
                    resetTime: Date.now() + 60000,
                });
            },
            getClientIdentifier() {
                return "test-client";
            },
        },
    };
}
function createApiAuthMock(overrides = {}) {
    const auth = overrides.auth ?? {
        userId: "user-1",
        email: "admin@example.com",
        tenantId: "tenant-1",
        role: "admin",
    };
    return {
        module: {
            async requireAuth() {
                return {
                    auth,
                    response: overrides.response ?? null,
                };
            },
            requireAdmin() {
                return overrides.adminResponse ?? null;
            },
        },
    };
}
function createSupabaseMock(expectations, options = {}) {
    const executed = [];
    const createUserCalls = [];
    const pending = [...expectations];
    async function resolveExpectation(state) {
        const expectation = pending.shift();
        strict_1.default.ok(expectation, `Unexpected Supabase query: ${state.table} ${state.method ?? "unknown"}`);
        expectation.assert?.(state);
        executed.push(state);
        const result = typeof expectation.result === "function"
            ? await expectation.result(state)
            : expectation.result;
        return {
            data: null,
            error: null,
            ...result,
        };
    }
    class QueryBuilder {
        constructor(table) {
            this.state = {
                table,
                method: null,
                payload: null,
                selectClause: null,
                filters: [],
                cardinality: null,
            };
        }
        select(selectClause = "*") {
            this.state.selectClause = selectClause;
            if (!this.state.method) {
                this.state.method = "select";
            }
            return this;
        }
        insert(payload) {
            this.state.method = "insert";
            this.state.payload = payload;
            return this;
        }
        update(payload) {
            this.state.method = "update";
            this.state.payload = payload;
            return this;
        }
        delete() {
            this.state.method = "delete";
            return this;
        }
        eq(column, value) {
            this.state.filters.push({ operator: "eq", column, value });
            return this;
        }
        in(column, value) {
            this.state.filters.push({ operator: "in", column, value });
            return this;
        }
        gt(column, value) {
            this.state.filters.push({ operator: "gt", column, value });
            return this;
        }
        order(column, value) {
            this.state.filters.push({ operator: "order", column, value });
            return this;
        }
        limit(value) {
            this.state.filters.push({ operator: "limit", column: "limit", value });
            return this;
        }
        single() {
            this.state.cardinality = "single";
            return resolveExpectation({ ...this.state, filters: [...this.state.filters] });
        }
        maybeSingle() {
            this.state.cardinality = "maybeSingle";
            return resolveExpectation({ ...this.state, filters: [...this.state.filters] });
        }
        then(onfulfilled, onrejected) {
            return resolveExpectation({
                ...this.state,
                filters: [...this.state.filters],
            }).then(onfulfilled, onrejected);
        }
    }
    return {
        executed,
        createUserCalls,
        pending,
        module: {
            createClient() {
                return {
                    from(table) {
                        return new QueryBuilder(table);
                    },
                    auth: {
                        admin: {
                            async createUser(input) {
                                createUserCalls.push(input);
                                const result = typeof options.createUserResult === "function"
                                    ? await options.createUserResult(input)
                                    : options.createUserResult;
                                return {
                                    data: null,
                                    error: null,
                                    ...result,
                                };
                            },
                        },
                    },
                };
            },
        },
    };
}
