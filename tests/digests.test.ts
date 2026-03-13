import assert from "node:assert/strict"
import test from "node:test"

import {
  canCancelDigest,
  canRetryDigest,
  getDigestCompletedAt,
  getDigestFailureRecipients,
  getDigestJobInfo,
  getDigestRecipientCount,
  getDigestTenderCount,
  normalizeDigestStatus,
} from "../src/lib/digests"

test("normalizeDigestStatus maps legacy states and keeps active states", () => {
  assert.equal(normalizeDigestStatus("completed"), "success")
  assert.equal(normalizeDigestStatus("failed"), "fail")
  assert.equal(normalizeDigestStatus("running"), "running")
  assert.equal(normalizeDigestStatus("pending"), "pending")
})

test("digest counts prefer canonical fields and metadata fallbacks", () => {
  assert.equal(
    getDigestTenderCount({
      status: "success",
      tenders_found: 4,
      tender_count: 2,
    }),
    2
  )

  assert.equal(
    getDigestRecipientCount({
      status: "success",
      emails_sent: 9,
      metadata: { recipient_count: 5 },
    }),
    5
  )

  assert.equal(
    getDigestRecipientCount({
      status: "success",
      emails_sent: 3,
    }),
    3
  )
})

test("digest completion prefers sent_at and falls back to finished_at", () => {
  assert.equal(
    getDigestCompletedAt({
      status: "success",
      sent_at: "2026-03-13T11:00:00.000Z",
      finished_at: "2026-03-13T10:55:00.000Z",
    }),
    "2026-03-13T11:00:00.000Z"
  )

  assert.equal(
    getDigestCompletedAt({
      status: "success",
      finished_at: "2026-03-13T10:55:00.000Z",
    }),
    "2026-03-13T10:55:00.000Z"
  )
})

test("digest failure recipients are filtered and normalized", () => {
  const recipients = getDigestFailureRecipients({
    status: "fail",
    metadata: {
      failure_recipients: [
        { email: "a@example.com", message: "bounce" },
        { email: "b@example.com" },
        "invalid",
        { email: "c@example.com", message: "timeout" },
      ],
    },
  })

  assert.deepEqual(recipients, [
    { email: "a@example.com", message: "bounce" },
    { email: "c@example.com", message: "timeout" },
  ])
})

test("digest job info exposes retry and cancellation controls", () => {
  const job = getDigestJobInfo({
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
  })

  assert.equal(job.attempt_count, 2)
  assert.equal(job.retry_count, 1)
  assert.equal(job.retry_of, "digest-123")
  assert.equal(job.retry_of_status, "fail")
  assert.equal(job.cancel_requested, true)
  assert.equal(job.cancel_requested_by, "user-1")
  assert.equal(job.can_retry, false)
  assert.equal(job.can_cancel, true)
  assert.deepEqual(job.failure_recipients, [
    { email: "ops@example.com", message: "smtp timeout" },
  ])
})

test("digest action helpers reflect queueable and cancelable states", () => {
  assert.equal(canRetryDigest("success"), true)
  assert.equal(canRetryDigest("fail"), true)
  assert.equal(canRetryDigest("pending"), false)
  assert.equal(canRetryDigest("running"), false)

  assert.equal(canCancelDigest("pending"), true)
  assert.equal(canCancelDigest("running"), true)
  assert.equal(canCancelDigest("success"), false)
  assert.equal(canCancelDigest("fail"), false)
})
