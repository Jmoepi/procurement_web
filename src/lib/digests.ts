type DigestLike = {
  status: string
  tenders_found?: number | null
  tender_count?: number | null
  emails_sent?: number | null
  recipient_count?: number | null
  finished_at?: string | null
  sent_at?: string | null
  metadata?: Record<string, unknown> | null
}

export type DigestFailureRecipient = {
  email: string
  message: string
}

export type DigestJobInfo = {
  attempt_count: number | null
  retry_count: number | null
  retry_of: string | null
  retry_of_status: string | null
  last_claimed_at: string | null
  last_recovered_at: string | null
  last_finished_at: string | null
  last_status: string | null
  cancel_requested: boolean
  cancel_requested_at: string | null
  cancel_requested_by: string | null
  cancelled_at: string | null
  cancelled_by: string | null
  failure_recipients: DigestFailureRecipient[]
  can_retry: boolean
  can_cancel: boolean
}

function getDigestMetadata(digest: DigestLike) {
  return digest.metadata && typeof digest.metadata === "object"
    ? digest.metadata
    : {}
}

function getOptionalString(metadata: Record<string, unknown>, key: string) {
  return typeof metadata[key] === "string" ? (metadata[key] as string) : null
}

function getOptionalNumber(metadata: Record<string, unknown>, key: string) {
  return typeof metadata[key] === "number" ? (metadata[key] as number) : null
}

export function normalizeDigestStatus(status: string) {
  if (status === "completed") return "success"
  if (status === "failed") return "fail"
  return status
}

export function canRetryDigest(status: string) {
  const normalizedStatus = normalizeDigestStatus(status)
  return normalizedStatus !== "pending" && normalizedStatus !== "running"
}

export function canCancelDigest(status: string) {
  const normalizedStatus = normalizeDigestStatus(status)
  return normalizedStatus === "pending" || normalizedStatus === "running"
}

export function isDigestSuccess(status: string) {
  return normalizeDigestStatus(status) === "success"
}

export function getDigestTenderCount(digest: DigestLike) {
  return digest.tender_count ?? digest.tenders_found ?? 0
}

export function getDigestRecipientCount(digest: DigestLike) {
  const metadataCount = digest.metadata?.recipient_count

  return (
    digest.recipient_count ??
    (typeof metadataCount === "number" ? metadataCount : null) ??
    digest.emails_sent ??
    0
  )
}

export function getDigestCompletedAt(digest: DigestLike) {
  return digest.sent_at ?? digest.finished_at ?? null
}

export function getDigestFailureRecipients(
  digest: DigestLike
): DigestFailureRecipient[] {
  const metadata = getDigestMetadata(digest)

  if (!Array.isArray(metadata.failure_recipients)) {
    return []
  }

  return metadata.failure_recipients
    .map((recipient) => {
      if (!recipient || typeof recipient !== "object") {
        return null
      }

      const email = (recipient as Record<string, unknown>).email
      const message = (recipient as Record<string, unknown>).message

      if (typeof email !== "string" || typeof message !== "string") {
        return null
      }

      return { email, message }
    })
    .filter(
      (recipient): recipient is DigestFailureRecipient => recipient !== null
    )
}

export function getDigestJobInfo(digest: DigestLike): DigestJobInfo {
  const metadata = getDigestMetadata(digest)
  const cancelRequested =
    metadata.cancel_requested === true ||
    typeof metadata.cancel_requested_at === "string"

  return {
    attempt_count: getOptionalNumber(metadata, "job_attempt_count"),
    retry_count: getOptionalNumber(metadata, "job_retry_count"),
    retry_of: getOptionalString(metadata, "retry_of"),
    retry_of_status: getOptionalString(metadata, "retry_of_status"),
    last_claimed_at: getOptionalString(metadata, "job_last_claimed_at"),
    last_recovered_at: getOptionalString(metadata, "job_last_recovered_at"),
    last_finished_at: getOptionalString(metadata, "job_finished_at"),
    last_status: getOptionalString(metadata, "job_last_status"),
    cancel_requested: cancelRequested,
    cancel_requested_at: getOptionalString(metadata, "cancel_requested_at"),
    cancel_requested_by: getOptionalString(metadata, "cancel_requested_by"),
    cancelled_at: getOptionalString(metadata, "cancelled_at"),
    cancelled_by: getOptionalString(metadata, "cancelled_by"),
    failure_recipients: getDigestFailureRecipients(digest),
    can_retry: canRetryDigest(digest.status),
    can_cancel: canCancelDigest(digest.status),
  }
}
