import Module from "node:module"
import path from "node:path"

type TestRuntime = {
  compiledRoot: string
  mocks: Map<string, unknown>
}

declare global {
  // eslint-disable-next-line no-var
  var __codexTestRuntime: TestRuntime | undefined
}

const runtime: TestRuntime = {
  compiledRoot: path.resolve(__dirname, ".."),
  mocks: new Map(),
}

globalThis.__codexTestRuntime = runtime

const moduleApi = Module as unknown as {
  _load: (
    request: string,
    parent: NodeModule | null | undefined,
    isMain: boolean
  ) => unknown
  _resolveFilename: (
    request: string,
    parent: NodeModule | null | undefined,
    isMain: boolean,
    options?: { paths?: string[] }
  ) => string
}

const originalLoad = moduleApi._load.bind(moduleApi)
const originalResolveFilename = moduleApi._resolveFilename.bind(moduleApi)

moduleApi._resolveFilename = function patchedResolveFilename(
  request: string,
  parent: NodeModule | null | undefined,
  isMain: boolean,
  options?: { paths?: string[] }
) {
  if (request.startsWith("@/")) {
    const compiledPath = path.join(runtime.compiledRoot, "src", request.slice(2))
    return originalResolveFilename(compiledPath, parent, isMain, options)
  }

  return originalResolveFilename(request, parent, isMain, options)
}

moduleApi._load = function patchedLoad(
  request: string,
  parent: NodeModule | null | undefined,
  isMain: boolean
) {
  if (runtime.mocks.has(request)) {
    return runtime.mocks.get(request)
  }

  if (request === "server-only") {
    return {}
  }

  return originalLoad(request, parent, isMain)
}
