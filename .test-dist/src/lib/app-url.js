"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAppBaseUrl = getAppBaseUrl;
function normalizeAppUrl(rawUrl) {
    const trimmed = rawUrl.trim();
    if (!trimmed) {
        return "http://localhost:3000";
    }
    if (/^https?:\/\//i.test(trimmed)) {
        return trimmed.replace(/\/+$/, "");
    }
    return `https://${trimmed}`.replace(/\/+$/, "");
}
function getAppBaseUrl() {
    return normalizeAppUrl(process.env.APP_BASE_URL ||
        process.env.NEXT_PUBLIC_APP_URL ||
        process.env.NEXT_PUBLIC_VERCEL_URL ||
        process.env.VERCEL_URL ||
        "http://localhost:3000");
}
