"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_module_1 = __importDefault(require("node:module"));
const node_path_1 = __importDefault(require("node:path"));
const runtime = {
    compiledRoot: node_path_1.default.resolve(__dirname, ".."),
    mocks: new Map(),
};
globalThis.__codexTestRuntime = runtime;
const moduleApi = node_module_1.default;
const originalLoad = moduleApi._load.bind(moduleApi);
const originalResolveFilename = moduleApi._resolveFilename.bind(moduleApi);
moduleApi._resolveFilename = function patchedResolveFilename(request, parent, isMain, options) {
    if (request.startsWith("@/")) {
        const compiledPath = node_path_1.default.join(runtime.compiledRoot, "src", request.slice(2));
        return originalResolveFilename(compiledPath, parent, isMain, options);
    }
    return originalResolveFilename(request, parent, isMain, options);
};
moduleApi._load = function patchedLoad(request, parent, isMain) {
    if (runtime.mocks.has(request)) {
        return runtime.mocks.get(request);
    }
    if (request === "server-only") {
        return {};
    }
    return originalLoad(request, parent, isMain);
};
