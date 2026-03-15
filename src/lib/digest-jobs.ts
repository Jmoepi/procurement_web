import { timingSafeEqual } from "crypto"
import { NextRequest } from "next/server"
import { createClient } from "@supabase/supabase-js"
import {
  DigestExecutionAbortedError,
  DigestExecutionCancelledError,
  executeDigestRun,
  type ExecuteDigestRunResult,
} from "@/lib/digest-execution"
import { getSupabaseServiceRoleConfig } from "@/lib/supabase/config"
import type { Database } from "@/types"

type DigestMetadata = Record<string, unknown>

type DigestJobRow = {
  id: string
  tenant_id: string
  status: string
  metadata: DigestMetadata | null
  started_at?: string | null
}

type ClaimedDigestRunResult =
  | {
      status: "claimed"
      digest: DigestJobRow
    }
  | {
      status: "skipped"
      digestId: string
      tenantId?: string
      reason:
        | "not_found"
        | "tenant_mismatch"
        | "already_running"
        | "not_pending"
        | "state_changed"
        | "cancelled"
    }

export type DigestJobRunResult =
  | {
      status: "processed"
      digestId: string
      tenantId: string
      summary: ExecuteDigestRunResult["summary"]
    }
  | {
      status: "skipped"
      digestId: string
      tenantId?: string
      reason:
        | "not_found"
        | "tenant_mismatch"
        | "already_running"
        | "not_pending"
        | "state_changed"
        | "cancelled"
    }
  | {
      status: "failed"
      digestId: string
      tenantId: string
      message: string
    }

export type DigestRecoveryResult =
  | {
      status: "requeued"
      digestId: string
      tenantId: string
      retryCount: number
    }
  | {
      status: "failed"
      digestId: string
      tenantId: string
      retryCount: number
      message: string
    }

function parseNumber(value: unknown, fallback: number) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  if (typeof value === "string") {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return fallback
}

function getDigestJobStaleMinutes() {
  return Math.max(parseNumber(process.env.DIGEST_JOB_STALE_MINUTES, 30), 5)
}

function getDigestJobMaxRetries() {
  return Math.max(parseNumber(process.env.DIGEST_JOB_MAX_RETRIES, 2), 0)
}

function getSupabaseAdmin() {
  const { url, serviceRoleKey } = getSupabaseServiceRoleConfig()

  return createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false },
  })
}

function normalizeMetadata(value: unknown) {
  return value && typeof value === "object" ? (value as DigestMetadata) : {}
}

function getDigestJobSecret() {
  return process.env.DIGEST_JOB_SECRET?.trim() ?? ""
}

function parseProvidedSecret(request: NextRequest) {
  const headerSecret = request.headers.get("x-digest-job-secret")?.trim()
  if (headerSecret) {
    return headerSecret
  }

  const authorization = request.headers.get("authorization") ?? ""
  if (authorization.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length).trim()
  }

  return ""
}

function secretsMatch(expected: string, provided: string) {
  const expectedBuffer = Buffer.from(expected)
  const providedBuffer = Buffer.from(provided)

  if (expectedBuffer.length === 0 || expectedBuffer.length !== providedBuffer.length) {
    return false
  }

  return timingSafeEqual(expectedBuffer, providedBuffer)
}

async function loadDigestRun(digestId: string) {
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from("digest_runs")
    .select("id, tenant_id, status, metadata, started_at")
    .eq("id", digestId)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to load digest job: ${error.message}`)
  }

  return data as DigestJobRow | null
}

async function markDigestRunFailed(options: {
  digestId: string
  metadata: DigestMetadata
  message: string
}) {
  const supabase = getSupabaseAdmin()
  const finishedAt = new Date().toISOString()
  const { error } = await supabase
    .from("digest_runs")
    .update({
      status: "fail",
      finished_at: finishedAt,
      error_message: options.message,
      metadata: {
        ...options.metadata,
        job_failed_at: finishedAt,
        job_failure_message: options.message,
      },
    })
    .eq("id", options.digestId)

  if (error) {
    throw new Error(`Failed to mark digest run as failed: ${error.message}`)
  }
}

async function claimDigestRun(options: {
  digestId: string
  expectedTenantId?: string
}): Promise<ClaimedDigestRunResult> {
  const existing = await loadDigestRun(options.digestId)

  if (!existing) {
    return { status: "skipped", digestId: options.digestId, reason: "not_found" as const }
  }

  if (options.expectedTenantId && existing.tenant_id !== options.expectedTenantId) {
    return {
      status: "skipped",
      digestId: options.digestId,
      tenantId: existing.tenant_id,
      reason: "tenant_mismatch" as const,
    }
  }

  if (existing.status === "running") {
    return {
      status: "skipped",
      digestId: options.digestId,
      tenantId: existing.tenant_id,
      reason: "already_running" as const,
    }
  }

  if (existing.status !== "pending") {
    return {
      status: "skipped",
      digestId: options.digestId,
      tenantId: existing.tenant_id,
      reason: "not_pending" as const,
    }
  }

  const supabase = getSupabaseAdmin()
  const claimedAt = new Date().toISOString()
  const metadata = normalizeMetadata(existing.metadata)

  const { data, error } = await supabase
    .from("digest_runs")
    .update({
      status: "running",
      started_at: claimedAt,
      metadata: {
        ...metadata,
        job_claimed_at: claimedAt,
        job_last_claimed_at: claimedAt,
        job_attempt_count: parseNumber(metadata.job_attempt_count, 0) + 1,
      },
    })
    .eq("id", existing.id)
    .eq("status", "pending")
    .select("id, tenant_id, status, metadata, started_at")
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to claim digest run: ${error.message}`)
  }

  if (!data) {
    return {
      status: "skipped",
      digestId: existing.id,
      tenantId: existing.tenant_id,
      reason: "already_running" as const,
    }
  }

  return {
    status: "claimed" as const,
    digest: data as DigestJobRow,
  }
}

async function requeueDigestRun(options: {
  digestId: string
  tenantId: string
  metadata: DigestMetadata
  retryCount: number
  startedAt: string | null | undefined
}) {
  const supabase = getSupabaseAdmin()
  const recoveredAt = new Date().toISOString()

  const { data, error } = await supabase
    .from("digest_runs")
    .update({
      status: "pending",
      error_message: null,
      finished_at: null,
      metadata: {
        ...options.metadata,
        job_recovered_at: recoveredAt,
        job_last_recovered_at: recoveredAt,
        job_retry_count: options.retryCount,
        last_stale_started_at: options.startedAt ?? null,
      },
    })
    .eq("id", options.digestId)
    .eq("status", "running")
    .select("id")
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to requeue stale digest run: ${error.message}`)
  }

  return Boolean(data?.id)
}

async function failStaleDigestRun(options: {
  digestId: string
  tenantId: string
  metadata: DigestMetadata
  retryCount: number
}) {
  const message = "Digest job exceeded the stale retry limit and was marked as failed."
  const supabase = getSupabaseAdmin()
  const failedAt = new Date().toISOString()

  const { data, error } = await supabase
    .from("digest_runs")
    .update({
      status: "fail",
      finished_at: failedAt,
      error_message: message,
      metadata: {
        ...options.metadata,
        job_failed_at: failedAt,
        job_failure_message: message,
        job_retry_count: options.retryCount,
      },
    })
    .eq("id", options.digestId)
    .eq("status", "running")
    .select("id")
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to fail stale digest run: ${error.message}`)
  }

  return Boolean(data?.id)
}

export function isDigestJobConfigured() {
  return getDigestJobSecret().length > 0
}

export function isDigestJobAuthorized(request: NextRequest) {
  const expectedSecret = getDigestJobSecret()
  const providedSecret = parseProvidedSecret(request)

  if (!expectedSecret || !providedSecret) {
    return false
  }

  return secretsMatch(expectedSecret, providedSecret)
}

export async function processDigestRunById(options: {
  digestId: string
  expectedTenantId?: string
}): Promise<DigestJobRunResult> {
  const claim = await claimDigestRun(options)

  if (claim.status !== "claimed") {
    return claim
  }

  try {
    const execution = await executeDigestRun({
      digestId: claim.digest.id,
      tenantId: claim.digest.tenant_id,
      metadata: normalizeMetadata(claim.digest.metadata),
    })

    return {
      status: "processed",
      digestId: claim.digest.id,
      tenantId: claim.digest.tenant_id,
      summary: execution.summary,
    }
  } catch (error) {
    if (error instanceof DigestExecutionCancelledError) {
      try {
        await markDigestRunFailed({
          digestId: claim.digest.id,
          metadata: {
            ...normalizeMetadata(claim.digest.metadata),
            cancelled_at: new Date().toISOString(),
          },
          message: error.message,
        })
      } catch (markError) {
        console.error("Failed to persist digest cancellation", markError)
      }

      return {
        status: "skipped",
        digestId: claim.digest.id,
        tenantId: claim.digest.tenant_id,
        reason: "cancelled",
      }
    }

    if (error instanceof DigestExecutionAbortedError) {
      return {
        status: "skipped",
        digestId: claim.digest.id,
        tenantId: claim.digest.tenant_id,
        reason: "state_changed",
      }
    }

    const message = error instanceof Error ? error.message : "Digest job failed"

    try {
      await markDigestRunFailed({
        digestId: claim.digest.id,
        metadata: normalizeMetadata(claim.digest.metadata),
        message,
      })
    } catch (markError) {
      console.error("Failed to persist digest job failure", markError)
    }

    return {
      status: "failed",
      digestId: claim.digest.id,
      tenantId: claim.digest.tenant_id,
      message,
    }
  }
}

export async function recoverStaleDigestRuns(options?: {
  staleMinutes?: number
  maxRetries?: number
}) {
  const staleMinutes = Math.max(options?.staleMinutes ?? getDigestJobStaleMinutes(), 5)
  const maxRetries = Math.max(options?.maxRetries ?? getDigestJobMaxRetries(), 0)
  const staleBefore = new Date(Date.now() - staleMinutes * 60 * 1000).toISOString()
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from("digest_runs")
    .select("id, tenant_id, status, metadata, started_at")
    .eq("status", "running")
    .lt("started_at", staleBefore)
    .order("started_at", { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch stale digest runs: ${error.message}`)
  }

  const rows = (data ?? []) as DigestJobRow[]
  const results: DigestRecoveryResult[] = []

  for (const row of rows) {
    const metadata = normalizeMetadata(row.metadata)
    const retryCount = parseNumber(metadata.job_retry_count, 0) + 1

    if (retryCount <= maxRetries) {
      const requeued = await requeueDigestRun({
        digestId: row.id,
        tenantId: row.tenant_id,
        metadata,
        retryCount,
        startedAt: row.started_at,
      })

      if (requeued) {
        results.push({
          status: "requeued",
          digestId: row.id,
          tenantId: row.tenant_id,
          retryCount,
        })
      }
      continue
    }

    const failed = await failStaleDigestRun({
      digestId: row.id,
      tenantId: row.tenant_id,
      metadata,
      retryCount,
    })

    if (failed) {
      results.push({
        status: "failed",
        digestId: row.id,
        tenantId: row.tenant_id,
        retryCount,
        message: "Digest job exceeded the stale retry limit and was marked as failed.",
      })
    }
  }

  return {
    staleMinutes,
    maxRetries,
    scanned: rows.length,
    requeued: results.filter((result) => result.status === "requeued").length,
    failed: results.filter((result) => result.status === "failed").length,
    results,
  }
}

export async function dispatchPendingDigestRuns(options?: {
  limit?: number
  staleMinutes?: number
  maxRetries?: number
}) {
  const limit = Math.min(Math.max(options?.limit ?? 10, 1), 25)
  const recovery = await recoverStaleDigestRuns({
    staleMinutes: options?.staleMinutes,
    maxRetries: options?.maxRetries,
  })
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from("digest_runs")
    .select("id, tenant_id")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(limit)

  if (error) {
    throw new Error(`Failed to fetch pending digests: ${error.message}`)
  }

  const rows = (data ?? []) as Array<{ id: string; tenant_id: string }>
  const results: DigestJobRunResult[] = []

  for (const row of rows) {
    results.push(
      await processDigestRunById({
        digestId: row.id,
        expectedTenantId: row.tenant_id,
      })
    )
  }

  return {
    recovery,
    selected: rows.length,
    processed: results.filter((result) => result.status === "processed").length,
    failed: results.filter((result) => result.status === "failed").length,
    skipped: results.filter((result) => result.status === "skipped").length,
    results,
  }
}
