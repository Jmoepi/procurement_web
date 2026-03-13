"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeDigestStatus = normalizeDigestStatus;
exports.canRetryDigest = canRetryDigest;
exports.canCancelDigest = canCancelDigest;
exports.isDigestSuccess = isDigestSuccess;
exports.getDigestTenderCount = getDigestTenderCount;
exports.getDigestRecipientCount = getDigestRecipientCount;
exports.getDigestCompletedAt = getDigestCompletedAt;
exports.getDigestFailureRecipients = getDigestFailureRecipients;
exports.getDigestJobInfo = getDigestJobInfo;
function getDigestMetadata(digest) {
    return digest.metadata && typeof digest.metadata === "object"
        ? digest.metadata
        : {};
}
function getOptionalString(metadata, key) {
    return typeof metadata[key] === "string" ? metadata[key] : null;
}
function getOptionalNumber(metadata, key) {
    return typeof metadata[key] === "number" ? metadata[key] : null;
}
function normalizeDigestStatus(status) {
    if (status === "completed")
        return "success";
    if (status === "failed")
        return "fail";
    return status;
}
function canRetryDigest(status) {
    const normalizedStatus = normalizeDigestStatus(status);
    return normalizedStatus !== "pending" && normalizedStatus !== "running";
}
function canCancelDigest(status) {
    const normalizedStatus = normalizeDigestStatus(status);
    return normalizedStatus === "pending" || normalizedStatus === "running";
}
function isDigestSuccess(status) {
    return normalizeDigestStatus(status) === "success";
}
function getDigestTenderCount(digest) {
    return digest.tender_count ?? digest.tenders_found ?? 0;
}
function getDigestRecipientCount(digest) {
    const metadataCount = digest.metadata?.recipient_count;
    return (digest.recipient_count ??
        (typeof metadataCount === "number" ? metadataCount : null) ??
        digest.emails_sent ??
        0);
}
function getDigestCompletedAt(digest) {
    return digest.sent_at ?? digest.finished_at ?? null;
}
function getDigestFailureRecipients(digest) {
    const metadata = getDigestMetadata(digest);
    if (!Array.isArray(metadata.failure_recipients)) {
        return [];
    }
    return metadata.failure_recipients
        .map((recipient) => {
        if (!recipient || typeof recipient !== "object") {
            return null;
        }
        const email = recipient.email;
        const message = recipient.message;
        if (typeof email !== "string" || typeof message !== "string") {
            return null;
        }
        return { email, message };
    })
        .filter((recipient) => recipient !== null);
}
function getDigestJobInfo(digest) {
    const metadata = getDigestMetadata(digest);
    const cancelRequested = metadata.cancel_requested === true ||
        typeof metadata.cancel_requested_at === "string";
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
    };
}
