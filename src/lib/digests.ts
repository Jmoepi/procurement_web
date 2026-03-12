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

export function normalizeDigestStatus(status: string) {
  if (status === "completed") return "success"
  if (status === "failed") return "fail"
  return status
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
