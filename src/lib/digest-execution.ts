import { createClient } from "@supabase/supabase-js"
import { sendTransactionalEmail } from "@/lib/email"
import { getAppBaseUrl } from "@/lib/app-url"
import { getSupabaseServiceRoleConfig } from "@/lib/supabase/config"
import {
  matchesTenderCategorySelection,
  normalizeTenderCategorySelection,
} from "@/lib/tender-categories"
import type { TenderCategory } from "@/types/database"

type DigestMetadata = Record<string, unknown>

type DigestTenant = {
  id: string
  name: string | null
}

type DigestSubscriber = {
  id: string
  email: string
  preferences: unknown
  unsubscribe_token: string
}

type DigestTenderRaw = {
  id: string
  title: string
  url: string
  category: string
  priority: string
  closing_at: string | null
  summary: string | null
  first_seen: string
  metadata: unknown
  source?: { name: string }[] | { name: string } | null
}

type DigestTender = {
  id: string
  title: string
  url: string
  category: string
  priority: string
  closing_at: string | null
  summary: string | null
  first_seen: string
  issuer: string | null
  referenceNumber: string | null
  sourceName: string | null
}

type DigestPreferences = {
  categories: TenderCategory[]
  highPriorityOnly: boolean
  keywordsInclude: string[]
  keywordsExclude: string[]
  maxItems: number
}

type DeliveryAttempt =
  | { status: "skipped"; subscriberId: string }
  | { status: "sent"; subscriberId: string }
  | { status: "failed"; subscriberId: string; email: string; message: string }

export type ExecuteDigestRunResult = {
  digest: {
    id: string
    tenant_id: string
    run_date: string
    status: string
    tenders_found: number
    emails_sent: number
    started_at: string
    finished_at: string | null
    logs: string | null
    error_message: string | null
    metadata: DigestMetadata | null
    created_at: string
  }
  summary: {
    recipientCount: number
    matchedRecipientCount: number
    failedRecipientCount: number
    tenderCount: number
    windowStartedAt: string
  }
}

export class DigestExecutionCancelledError extends Error {
  constructor(message = "Digest cancelled by admin.") {
    super(message)
    this.name = "DigestExecutionCancelledError"
  }
}

export class DigestExecutionAbortedError extends Error {
  constructor(message = "Digest run is no longer active.") {
    super(message)
    this.name = "DigestExecutionAbortedError"
  }
}

const PRIORITY_ORDER: Record<string, number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
}

function getSupabaseAdmin() {
  const { url, serviceRoleKey } = getSupabaseServiceRoleConfig()

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  })
}

function getMetadataValue(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {}
}

function getStringList(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
}

function getQueuedTenderIds(metadata: DigestMetadata) {
  const tenderIds = Array.isArray(metadata.tender_ids) ? metadata.tender_ids : metadata.tenders_included

  return [...new Set(getStringList(tenderIds))]
}

async function loadDigestMetadata(digestId: string) {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from("digest_runs")
    .select("metadata")
    .eq("id", digestId)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to load digest metadata: ${error.message}`)
  }

  return getMetadataValue(data?.metadata)
}

async function resolveDigestTenderIds(digestId: string, metadata: DigestMetadata) {
  const directTenderIds = getQueuedTenderIds(metadata)
  if (directTenderIds.length > 0) {
    return directTenderIds
  }

  const retryOf =
    typeof metadata.retry_of === "string" && metadata.retry_of.trim().length > 0
      ? metadata.retry_of.trim()
      : null

  if (!retryOf) {
    return []
  }

  const sourceMetadata = await loadDigestMetadata(retryOf)
  return getQueuedTenderIds(sourceMetadata)
}

async function loadDigestTenders(options: {
  tenantId: string
  tenderIds: string[]
  windowStartedAt: string
}) {
  const supabase = getSupabaseAdmin()
  let query = supabase
    .from("tenders")
    .select("id, title, url, category, priority, closing_at, summary, first_seen, metadata, source:sources(name)")
    .eq("tenant_id", options.tenantId)

  if (options.tenderIds.length > 0) {
    const { data, error } = await query.in("id", options.tenderIds)

    if (error) {
      throw new Error(`Failed to load queued tenders: ${error.message}`)
    }

    const tendersById = new Map(
      ((data ?? []) as DigestTenderRaw[]).map((row) => [row.id, normalizeTender(row)])
    )

    return options.tenderIds
      .map((tenderId) => tendersById.get(tenderId))
      .filter((tender): tender is DigestTender => Boolean(tender))
  }

  const { data, error } = await query.eq("expired", false).gte("first_seen", options.windowStartedAt)

  if (error) {
    throw new Error(`Failed to load tenders: ${error.message}`)
  }

  return ((data ?? []) as DigestTenderRaw[]).map(normalizeTender)
}

async function getDigestRunControlState(digestId: string) {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from("digest_runs")
    .select("status, metadata")
    .eq("id", digestId)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to load digest control state: ${error.message}`)
  }

  if (!data) {
    return null
  }

  return {
    status: String(data.status),
    metadata: getMetadataValue(data.metadata),
  }
}

function isCancellationRequested(metadata: DigestMetadata) {
  return metadata.cancel_requested === true || typeof metadata.cancel_requested_at === "string"
}

function normalizeSourceName(source: DigestTenderRaw["source"]) {
  if (!source) {
    return null
  }

  if (Array.isArray(source)) {
    return source[0]?.name ?? null
  }

  return source.name ?? null
}

function normalizeTender(row: DigestTenderRaw): DigestTender {
  const metadata = getMetadataValue(row.metadata)

  return {
    id: row.id,
    title: row.title,
    url: row.url,
    category: row.category,
    priority: row.priority,
    closing_at: row.closing_at,
    summary: row.summary,
    first_seen: row.first_seen,
    issuer: typeof metadata.issuer === "string" ? metadata.issuer : null,
    referenceNumber:
      typeof metadata.reference_number === "string" ? metadata.reference_number : null,
    sourceName: normalizeSourceName(row.source),
  }
}

function normalizeList(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => (typeof item === "string" ? item.trim().toLowerCase() : ""))
    .filter(Boolean)
}

function parsePreferences(value: unknown): DigestPreferences {
  const raw = value && typeof value === "object" ? (value as Record<string, unknown>) : {}
  const maxItems =
    typeof raw.maxItems === "number" && Number.isFinite(raw.maxItems)
      ? Math.min(Math.max(Math.floor(raw.maxItems), 1), 25)
      : 15

  return {
    categories: normalizeTenderCategorySelection(
      Array.isArray(raw.categories) ? raw.categories : []
    ),
    highPriorityOnly: raw.highPriorityOnly === true,
    keywordsInclude: normalizeList(raw.keywordsInclude),
    keywordsExclude: normalizeList(raw.keywordsExclude),
    maxItems,
  }
}

function rankPriority(priority: string) {
  return PRIORITY_ORDER[priority.toLowerCase()] ?? 0
}

function formatDigestDate() {
  return new Intl.DateTimeFormat("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date())
}

function formatDeadline(date: string | null) {
  if (!date) {
    return "No deadline listed"
  }

  const deadline = new Date(date)
  if (Number.isNaN(deadline.getTime())) {
    return "No deadline listed"
  }

  return new Intl.DateTimeFormat("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(deadline)
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function buildSearchText(tender: DigestTender) {
  return [
    tender.title,
    tender.summary ?? "",
    tender.issuer ?? "",
    tender.referenceNumber ?? "",
    tender.category,
    tender.priority,
  ]
    .join(" ")
    .toLowerCase()
}

function matchesCategories(tender: DigestTender, categories: TenderCategory[]) {
  return matchesTenderCategorySelection(tender.category.toLowerCase(), categories)
}

function filterTendersForSubscriber(tenders: DigestTender[], preferences: DigestPreferences) {
  const filtered = tenders.filter((tender) => {
    if (!matchesCategories(tender, preferences.categories)) {
      return false
    }

    if (preferences.highPriorityOnly && rankPriority(tender.priority) < rankPriority("high")) {
      return false
    }

    const haystack = buildSearchText(tender)

    if (
      preferences.keywordsInclude.length > 0 &&
      !preferences.keywordsInclude.some((keyword) => haystack.includes(keyword))
    ) {
      return false
    }

    if (preferences.keywordsExclude.some((keyword) => haystack.includes(keyword))) {
      return false
    }

    return true
  })

  return filtered
    .sort((left, right) => {
      const priorityDelta = rankPriority(right.priority) - rankPriority(left.priority)
      if (priorityDelta !== 0) {
        return priorityDelta
      }

      const leftDeadline = left.closing_at ? new Date(left.closing_at).getTime() : Number.MAX_SAFE_INTEGER
      const rightDeadline = right.closing_at ? new Date(right.closing_at).getTime() : Number.MAX_SAFE_INTEGER
      return leftDeadline - rightDeadline
    })
    .slice(0, preferences.maxItems)
}

function buildDigestTextEmail(options: {
  tenantName: string
  tenders: DigestTender[]
  dashboardUrl: string
  unsubscribeUrl: string
}) {
  const tenderLines = options.tenders
    .map(
      (tender, index) =>
        [
          `${index + 1}. ${tender.title}`,
          `Category: ${tender.category} | Priority: ${tender.priority} | Closing: ${formatDeadline(tender.closing_at)}`,
          tender.sourceName ? `Source: ${tender.sourceName}` : null,
          tender.referenceNumber ? `Reference: ${tender.referenceNumber}` : null,
          tender.summary ? tender.summary : null,
          `Open: ${tender.url}`,
        ]
          .filter(Boolean)
          .join("\n")
    )
    .join("\n\n")

  return [
    `Procurement Radar SA digest for ${options.tenantName}`,
    "",
    `We found ${options.tenders.length} new opportunities that match this recipient's settings.`,
    "",
    tenderLines,
    "",
    `View all tenders: ${options.dashboardUrl}`,
    `Unsubscribe: ${options.unsubscribeUrl}`,
  ].join("\n")
}

function buildDigestHtmlEmail(options: {
  tenantName: string
  tenders: DigestTender[]
  dashboardUrl: string
  unsubscribeUrl: string
}) {
  const urgentCount = options.tenders.filter((tender) => tender.priority.toLowerCase() === "urgent").length
  const highCount = options.tenders.filter((tender) => tender.priority.toLowerCase() === "high").length
  const tenderCards = options.tenders
    .map((tender) => {
      const summary = tender.summary ? escapeHtml(tender.summary) : "No summary available."

      return `
        <tr>
          <td style="padding:0 0 16px;">
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border:1px solid #e5e7eb;border-radius:18px;background:#ffffff;">
              <tr>
                <td style="padding:20px 22px;">
                  <p style="margin:0 0 10px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#6b7280;">
                    ${escapeHtml(tender.category)} · ${escapeHtml(tender.priority)}
                  </p>
                  <h3 style="margin:0 0 10px;font-size:20px;line-height:1.35;color:#111827;">
                    ${escapeHtml(tender.title)}
                  </h3>
                  <p style="margin:0 0 14px;font-size:14px;line-height:1.7;color:#4b5563;">
                    ${summary}
                  </p>
                  <p style="margin:0 0 14px;font-size:13px;line-height:1.6;color:#6b7280;">
                    ${tender.sourceName ? `Source: ${escapeHtml(tender.sourceName)}<br />` : ""}
                    ${tender.referenceNumber ? `Reference: ${escapeHtml(tender.referenceNumber)}<br />` : ""}
                    Closing: ${escapeHtml(formatDeadline(tender.closing_at))}
                  </p>
                  <a href="${escapeHtml(tender.url)}" style="display:inline-block;background:#111827;color:#ffffff;padding:11px 16px;border-radius:999px;text-decoration:none;font-size:13px;font-weight:600;">
                    Open tender
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      `
    })
    .join("")

  return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Procurement Radar SA Digest</title>
  </head>
  <body style="margin:0;padding:24px;background:#f3f4f6;font-family:Arial,sans-serif;color:#111827;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:720px;margin:0 auto;background:#ffffff;border-radius:28px;overflow:hidden;">
      <tr>
        <td style="padding:36px 36px 30px;background:linear-gradient(135deg,#0f172a,#166534);color:#ffffff;">
          <p style="margin:0 0 10px;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;opacity:0.8;">Procurement Radar SA</p>
          <h1 style="margin:0 0 12px;font-size:30px;line-height:1.2;">Daily digest for ${escapeHtml(options.tenantName)}</h1>
          <p style="margin:0;font-size:15px;line-height:1.7;opacity:0.9;">
            ${options.tenders.length} opportunities matched this subscriber's criteria on ${escapeHtml(formatDigestDate())}.
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding:28px 36px 12px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td width="33.33%" style="padding:0 8px 0 0;">
                <div style="border-radius:18px;background:#f9fafb;padding:18px;text-align:center;">
                  <p style="margin:0;font-size:28px;font-weight:700;color:#111827;">${options.tenders.length}</p>
                  <p style="margin:6px 0 0;font-size:12px;color:#6b7280;text-transform:uppercase;">Matches</p>
                </div>
              </td>
              <td width="33.33%" style="padding:0 4px;">
                <div style="border-radius:18px;background:#f9fafb;padding:18px;text-align:center;">
                  <p style="margin:0;font-size:28px;font-weight:700;color:#dc2626;">${urgentCount}</p>
                  <p style="margin:6px 0 0;font-size:12px;color:#6b7280;text-transform:uppercase;">Urgent</p>
                </div>
              </td>
              <td width="33.33%" style="padding:0 0 0 8px;">
                <div style="border-radius:18px;background:#f9fafb;padding:18px;text-align:center;">
                  <p style="margin:0;font-size:28px;font-weight:700;color:#ea580c;">${highCount}</p>
                  <p style="margin:6px 0 0;font-size:12px;color:#6b7280;text-transform:uppercase;">High Priority</p>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:18px 36px 12px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            ${tenderCards}
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 36px 36px;">
          <a href="${escapeHtml(options.dashboardUrl)}" style="display:inline-block;background:#16a34a;color:#ffffff;padding:14px 22px;border-radius:999px;text-decoration:none;font-size:14px;font-weight:600;">
            View all tenders
          </a>
        </td>
      </tr>
      <tr>
        <td style="padding:22px 36px;background:#f9fafb;border-top:1px solid #e5e7eb;">
          <p style="margin:0 0 8px;font-size:12px;color:#6b7280;">
            You are receiving this because you are subscribed to Procurement Radar SA updates.
          </p>
          <p style="margin:0;font-size:12px;">
            <a href="${escapeHtml(options.dashboardUrl)}" style="color:#166534;text-decoration:none;">Open dashboard</a>
            &nbsp;·&nbsp;
            <a href="${escapeHtml(options.unsubscribeUrl)}" style="color:#166534;text-decoration:none;">Unsubscribe</a>
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>
  `
}

function buildDigestSubject(tenderCount: number) {
  const label = tenderCount === 1 ? "new tender" : "new tenders"
  return `Procurement Radar: ${tenderCount} ${label} - ${formatDigestDate()}`
}

async function updateDigestRun(options: {
  digestId: string
  status: "success" | "fail"
  tenders: DigestTender[]
  recipientCount: number
  matchedRecipientCount: number
  emailsSent: number
  failures: Array<{ email: string; message: string }>
  metadata: DigestMetadata
  windowStartedAt: string
  errorMessage?: string | null
}) {
  const supabase = getSupabaseAdmin()
  const finishedAt = new Date().toISOString()

  const logs = [
    `Window start: ${options.windowStartedAt}`,
    `Matched tenders: ${options.tenders.length}`,
    `Recipients with matches: ${options.matchedRecipientCount}`,
    `Emails sent: ${options.emailsSent}`,
    `Failures: ${options.failures.length}`,
  ].join("\n")

  const failureSummary =
    options.failures.length > 0 ? options.failures.map((failure) => `${failure.email}: ${failure.message}`).join(" | ") : null

  const { data, error } = await supabase
    .from("digest_runs")
    .update({
      status: options.status,
      tenders_found: options.tenders.length,
      emails_sent: options.emailsSent,
      finished_at: finishedAt,
      logs,
      error_message:
        options.status === "fail"
          ? options.errorMessage ?? failureSummary ?? "Digest delivery failed"
          : null,
      metadata: {
        ...options.metadata,
        job_finished_at: finishedAt,
        job_last_status: options.status,
        recipient_count: options.recipientCount,
        matched_recipient_count: options.matchedRecipientCount,
        failed_recipient_count: options.failures.length,
        window_started_at: options.windowStartedAt,
        tender_ids: options.tenders.map((tender) => tender.id),
        failure_recipients: options.failures.map((failure) => ({
          email: failure.email,
          message: failure.message,
        })),
      },
    })
    .eq("id", options.digestId)
    .select("id, tenant_id, run_date, status, tenders_found, emails_sent, started_at, finished_at, logs, error_message, metadata, created_at")
    .single()

  if (error) {
    throw new Error(`Failed to update digest run: ${error.message}`)
  }

  return data as ExecuteDigestRunResult["digest"]
}

export async function executeDigestRun(options: {
  digestId: string
  tenantId: string
  metadata?: DigestMetadata | null
}): Promise<ExecuteDigestRunResult> {
  const supabase = getSupabaseAdmin()
  const metadata = options.metadata ?? {}

  const { data: latestSuccessfulDigest, error: latestDigestError } = await supabase
    .from("digest_runs")
    .select("started_at")
    .eq("tenant_id", options.tenantId)
    .eq("status", "success")
    .neq("id", options.digestId)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (latestDigestError) {
    throw new Error(`Failed to load digest history: ${latestDigestError.message}`)
  }

  const fallbackWindowStart = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const windowStartedAt =
    typeof metadata.triggered_at === "string" && metadata.triggered_at.trim().length > 0
      ? metadata.triggered_at
      : latestSuccessfulDigest?.started_at ?? fallbackWindowStart
  const tenderIds = await resolveDigestTenderIds(options.digestId, metadata)

  const [tenantResult, subscribersResult, tenders] = await Promise.all([
    supabase.from("tenants").select("id, name").eq("id", options.tenantId).maybeSingle(),
    supabase
      .from("subscriptions")
      .select("id, email, preferences, unsubscribe_token")
      .eq("tenant_id", options.tenantId)
      .eq("is_active", true),
    loadDigestTenders({
      tenantId: options.tenantId,
      tenderIds,
      windowStartedAt,
    }),
  ])

  if (tenantResult.error) {
    throw new Error(`Failed to load tenant: ${tenantResult.error.message}`)
  }
  if (subscribersResult.error) {
    throw new Error(`Failed to load subscribers: ${subscribersResult.error.message}`)
  }

  const tenant = tenantResult.data as DigestTenant | null
  if (!tenant) {
    throw new Error("Tenant not found")
  }

  const subscribers = (subscribersResult.data ?? []) as DigestSubscriber[]

  if (subscribers.length === 0 || tenders.length === 0) {
    const digest = await updateDigestRun({
      digestId: options.digestId,
      status: "success",
      tenders,
      recipientCount: subscribers.length,
      matchedRecipientCount: 0,
      emailsSent: 0,
      failures: [],
      metadata,
      windowStartedAt,
    })

    return {
      digest,
      summary: {
        recipientCount: subscribers.length,
        matchedRecipientCount: 0,
        failedRecipientCount: 0,
        tenderCount: tenders.length,
        windowStartedAt,
      },
    }
  }

  const appBaseUrl = getAppBaseUrl()
  const dashboardUrl = `${appBaseUrl}/tenders`

  const attempts: DeliveryAttempt[] = []

  const finalizeCancellation = async (controlMetadata?: DigestMetadata) => {
    const sentAttempts = attempts.filter(
      (attempt): attempt is Extract<DeliveryAttempt, { status: "sent" }> => attempt.status === "sent"
    )
    const failedAttempts = attempts.filter(
      (attempt): attempt is Extract<DeliveryAttempt, { status: "failed" }> => attempt.status === "failed"
    )
    const matchedRecipientCount = attempts.filter((attempt) => attempt.status !== "skipped").length

    const digest = await updateDigestRun({
      digestId: options.digestId,
      status: "fail",
      tenders,
      recipientCount: subscribers.length,
      matchedRecipientCount,
      emailsSent: sentAttempts.length,
      failures: failedAttempts.map((attempt) => ({
        email: attempt.email,
        message: attempt.message,
      })),
      metadata: {
        ...metadata,
        ...(controlMetadata ?? {}),
        cancelled_at: new Date().toISOString(),
      },
      windowStartedAt,
      errorMessage: "Digest cancelled by admin.",
    })

    return {
      digest,
      summary: {
        recipientCount: subscribers.length,
        matchedRecipientCount,
        failedRecipientCount: failedAttempts.length,
        tenderCount: tenders.length,
        windowStartedAt,
      },
    }
  }

  for (const subscriber of subscribers) {
    const controlState = await getDigestRunControlState(options.digestId)

    if (!controlState || controlState.status !== "running") {
      throw new DigestExecutionAbortedError()
    }

    if (isCancellationRequested(controlState.metadata)) {
      return finalizeCancellation(controlState.metadata)
    }

    const preferences = parsePreferences(subscriber.preferences)
    const matchedTenders = filterTendersForSubscriber(tenders, preferences)

    if (matchedTenders.length === 0) {
      attempts.push({ status: "skipped", subscriberId: subscriber.id })
      continue
    }

    const unsubscribeUrl = `${appBaseUrl}/unsubscribe?token=${encodeURIComponent(subscriber.unsubscribe_token)}`

    try {
      await sendTransactionalEmail({
        to: subscriber.email,
        subject: buildDigestSubject(matchedTenders.length),
        text: buildDigestTextEmail({
          tenantName: tenant.name || "Your organization",
          tenders: matchedTenders,
          dashboardUrl,
          unsubscribeUrl,
        }),
        html: buildDigestHtmlEmail({
          tenantName: tenant.name || "Your organization",
          tenders: matchedTenders,
          dashboardUrl,
          unsubscribeUrl,
        }),
      })

      attempts.push({ status: "sent", subscriberId: subscriber.id })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown email error"
      attempts.push({
        status: "failed",
        subscriberId: subscriber.id,
        email: subscriber.email,
        message,
      })
    }
  }

  const matchedRecipientCount = attempts.filter((attempt) => attempt.status !== "skipped").length
  const sentAttempts = attempts.filter(
    (attempt): attempt is Extract<DeliveryAttempt, { status: "sent" }> => attempt.status === "sent"
  )
  const failedAttempts = attempts.filter(
    (attempt): attempt is Extract<DeliveryAttempt, { status: "failed" }> => attempt.status === "failed"
  )

  if (sentAttempts.length > 0) {
    const sentSubscriberIds = sentAttempts.map((attempt) => attempt.subscriberId)
    const { error: subscriberUpdateError } = await supabase
      .from("subscriptions")
      .update({
        last_digest_sent_at: new Date().toISOString(),
      })
      .in("id", sentSubscriberIds)

    if (subscriberUpdateError) {
      throw new Error(`Failed to update subscriber delivery state: ${subscriberUpdateError.message}`)
    }
  }

  const finalControlState = await getDigestRunControlState(options.digestId)
  if (finalControlState && isCancellationRequested(finalControlState.metadata)) {
    return finalizeCancellation(finalControlState.metadata)
  }

  const digest = await updateDigestRun({
    digestId: options.digestId,
    status: sentAttempts.length > 0 || matchedRecipientCount === 0 ? "success" : "fail",
    tenders,
    recipientCount: subscribers.length,
    matchedRecipientCount,
      emailsSent: sentAttempts.length,
      failures: failedAttempts.map((attempt) => ({
        email: attempt.email,
        message: attempt.message,
      })),
      metadata,
      windowStartedAt,
    })

  return {
    digest,
    summary: {
      recipientCount: subscribers.length,
      matchedRecipientCount,
      failedRecipientCount: failedAttempts.length,
      tenderCount: tenders.length,
      windowStartedAt,
    },
  }
}
