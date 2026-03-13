"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importDefault(require("node:test"));
const digests_1 = require("../src/lib/digests");
(0, node_test_1.default)("normalizeDigestStatus maps legacy states and keeps active states", () => {
    strict_1.default.equal((0, digests_1.normalizeDigestStatus)("completed"), "success");
    strict_1.default.equal((0, digests_1.normalizeDigestStatus)("failed"), "fail");
    strict_1.default.equal((0, digests_1.normalizeDigestStatus)("running"), "running");
    strict_1.default.equal((0, digests_1.normalizeDigestStatus)("pending"), "pending");
});
(0, node_test_1.default)("digest counts prefer canonical fields and metadata fallbacks", () => {
    strict_1.default.equal((0, digests_1.getDigestTenderCount)({
        status: "success",
        tenders_found: 4,
        tender_count: 2,
    }), 2);
    strict_1.default.equal((0, digests_1.getDigestRecipientCount)({
        status: "success",
        emails_sent: 9,
        metadata: { recipient_count: 5 },
    }), 5);
    strict_1.default.equal((0, digests_1.getDigestRecipientCount)({
        status: "success",
        emails_sent: 3,
    }), 3);
});
(0, node_test_1.default)("digest completion prefers sent_at and falls back to finished_at", () => {
    strict_1.default.equal((0, digests_1.getDigestCompletedAt)({
        status: "success",
        sent_at: "2026-03-13T11:00:00.000Z",
        finished_at: "2026-03-13T10:55:00.000Z",
    }), "2026-03-13T11:00:00.000Z");
    strict_1.default.equal((0, digests_1.getDigestCompletedAt)({
        status: "success",
        finished_at: "2026-03-13T10:55:00.000Z",
    }), "2026-03-13T10:55:00.000Z");
});
(0, node_test_1.default)("digest failure recipients are filtered and normalized", () => {
    const recipients = (0, digests_1.getDigestFailureRecipients)({
        status: "fail",
        metadata: {
            failure_recipients: [
                { email: "a@example.com", message: "bounce" },
                { email: "b@example.com" },
                "invalid",
                { email: "c@example.com", message: "timeout" },
            ],
        },
    });
    strict_1.default.deepEqual(recipients, [
        { email: "a@example.com", message: "bounce" },
        { email: "c@example.com", message: "timeout" },
    ]);
});
(0, node_test_1.default)("digest job info exposes retry and cancellation controls", () => {
    const job = (0, digests_1.getDigestJobInfo)({
        status: "running",
        metadata: {
            job_attempt_count: 2,
            job_retry_count: 1,
            retry_of: "digest-123",
            retry_of_status: "fail",
            job_last_claimed_at: "2026-03-13T10:00:00.000Z",
            cancel_requested: true,
            cancel_requested_at: "2026-03-13T10:05:00.000Z",
            cancel_requested_by: "user-1",
            failure_recipients: [{ email: "ops@example.com", message: "smtp timeout" }],
        },
    });
    strict_1.default.equal(job.attempt_count, 2);
    strict_1.default.equal(job.retry_count, 1);
    strict_1.default.equal(job.retry_of, "digest-123");
    strict_1.default.equal(job.retry_of_status, "fail");
    strict_1.default.equal(job.cancel_requested, true);
    strict_1.default.equal(job.cancel_requested_by, "user-1");
    strict_1.default.equal(job.can_retry, false);
    strict_1.default.equal(job.can_cancel, true);
    strict_1.default.deepEqual(job.failure_recipients, [
        { email: "ops@example.com", message: "smtp timeout" },
    ]);
});
(0, node_test_1.default)("digest action helpers reflect queueable and cancelable states", () => {
    strict_1.default.equal((0, digests_1.canRetryDigest)("success"), true);
    strict_1.default.equal((0, digests_1.canRetryDigest)("fail"), true);
    strict_1.default.equal((0, digests_1.canRetryDigest)("pending"), false);
    strict_1.default.equal((0, digests_1.canRetryDigest)("running"), false);
    strict_1.default.equal((0, digests_1.canCancelDigest)("pending"), true);
    strict_1.default.equal((0, digests_1.canCancelDigest)("running"), true);
    strict_1.default.equal((0, digests_1.canCancelDigest)("success"), false);
    strict_1.default.equal((0, digests_1.canCancelDigest)("fail"), false);
});
