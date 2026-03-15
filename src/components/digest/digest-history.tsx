"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Clock3,
  Eye,
  Loader2,
  Mail,
  RotateCcw,
  Square,
  TriangleAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { authenticatedJsonFetch } from "@/lib/authenticated-fetch";
import {
  canCancelDigest,
  canRetryDigest,
  type DigestFailureRecipient,
  type DigestJobInfo,
  getDigestCompletedAt,
  getDigestRecipientCount,
  getDigestTenderCount,
  isDigestSuccess,
  normalizeDigestStatus,
} from "@/lib/digests";
import { toast } from "@/lib/sonner";
import { formatDateTime } from "@/lib/utils";
import type { DigestRun } from "@/types/database";

interface DigestHistoryProps {
  digests: DigestRun[];
  isAdmin: boolean;
}

type DigestDetailResponse = {
  digest: DigestRun & {
    logs?: string | null;
    job?: DigestJobInfo;
  };
  tenders: Array<{
    id: string;
    title: string;
    category: string;
    priority: string;
    source: { name: string } | null;
  }>;
  summary: {
    total_tenders: number;
    total_recipients: number;
    failed_recipients?: number;
    status: string;
    by_category: Record<string, number>;
    by_priority: Record<string, number>;
  };
};

export function DigestHistory({ digests, isAdmin }: DigestHistoryProps) {
  const [actionDigestId, setActionDigestId] = useState<string | null>(null);
  const [detailDigestId, setDetailDigestId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<DigestDetailResponse | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const router = useRouter();

  const successfulDigests = digests.filter((digest) => isDigestSuccess(digest.status)).length;
  const failedDigests = digests.filter(
    (digest) => normalizeDigestStatus(digest.status) === "fail"
  ).length;
  const successRate =
    digests.length > 0 ? Math.round((successfulDigests / digests.length) * 100) : 100;
  const latestCompletedDigest = digests.find((digest) => getDigestCompletedAt(digest));

  const openDigestDetails = async (digestId: string) => {
    setDetailOpen(true);
    setDetailDigestId(digestId);
    setDetailLoading(true);

    try {
      const data = await authenticatedJsonFetch<DigestDetailResponse>(
        `/api/digests/${digestId}`
      );
      setDetailData(data);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load digest details"
      );
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const runDigestAction = async (digest: DigestRun, action: "retry" | "cancel") => {
    const verb = action === "retry" ? "retry" : "cancel";
    const confirmationMessage =
      action === "retry"
        ? "Queue a new digest run based on this historical run?"
        : "Cancel this digest run?";

    if (!confirm(confirmationMessage)) {
      return;
    }

    setActionDigestId(digest.id);

    try {
      const data = await authenticatedJsonFetch<{
        digest: DigestRun;
        message: string;
      }>(`/api/digests/${digest.id}`, {
        method: "PATCH",
        body: JSON.stringify({ action }),
      });

      toast.success(
        action === "retry" ? "Digest retry queued" : "Digest updated",
        {
          description: data.message,
        }
      );

      if (detailOpen && detailDigestId === digest.id) {
        await openDigestDetails(digest.id);
      }

      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : `Failed to ${verb} digest`
      );
    } finally {
      setActionDigestId(null);
    }
  };

  if (digests.length === 0) {
    return (
      <Card className="rounded-[30px] border-border/60 bg-background/85 shadow-sm">
        <CardContent className="px-6 py-12 text-center sm:px-10">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Clock3 className="h-6 w-6" />
          </div>
          <h2 className="mt-5 text-2xl font-semibold tracking-tight">No digests sent yet</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-muted-foreground">
            Once delivery runs start, this view will show each send, its status, and the
            size of the audience it reached.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <HistorySummaryCard
            title="Total runs"
            value={digests.length}
            detail="Recent digest activity"
            icon={Mail}
          />
          <HistorySummaryCard
            title="Success rate"
            value={`${successRate}%`}
            detail={`${successfulDigests} successful · ${failedDigests} failed`}
            icon={CheckCircle2}
          />
          <HistorySummaryCard
            title="Last completed"
            value={
              latestCompletedDigest
                ? new Date(getDigestCompletedAt(latestCompletedDigest)!).toLocaleDateString("en-ZA", {
                    month: "short",
                    day: "numeric",
                  })
                : "-"
            }
            detail={
              latestCompletedDigest
                ? new Date(getDigestCompletedAt(latestCompletedDigest)!).toLocaleTimeString("en-ZA", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "Awaiting first completed run"
            }
            icon={Clock3}
          />
        </div>

        <div className="space-y-3 md:hidden">
          {digests.map((digest) => (
            <MobileDigestCard
              key={digest.id}
              digest={digest}
              isAdmin={isAdmin}
              loading={actionDigestId === digest.id}
              onViewDetails={() => openDigestDetails(digest.id)}
              onRetry={() => runDigestAction(digest, "retry")}
              onCancel={() => runDigestAction(digest, "cancel")}
            />
          ))}
        </div>

        <div className="hidden overflow-hidden rounded-[28px] border border-border/60 bg-background/85 shadow-sm md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Tenders</TableHead>
                <TableHead>Recipients</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {digests.map((digest) => (
                <TableRow key={digest.id}>
                  <TableCell className="font-medium">
                    {new Date(digest.created_at).toLocaleDateString("en-ZA", {
                      weekday: "short",
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </TableCell>
                  <TableCell>{getDigestTenderCount(digest)}</TableCell>
                  <TableCell>{getDigestRecipientCount(digest)}</TableCell>
                  <TableCell>{renderStatusBadge(digest.status)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {getDigestCompletedAt(digest)
                      ? new Date(getDigestCompletedAt(digest)!).toLocaleString("en-ZA", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-border/60"
                        onClick={() => openDigestDetails(digest.id)}
                      >
                        <Eye className="h-4 w-4" />
                        Details
                      </Button>
                      {isAdmin && canRetryDigest(digest.status) ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-border/60"
                          onClick={() => runDigestAction(digest, "retry")}
                          disabled={actionDigestId === digest.id}
                        >
                          {actionDigestId === digest.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RotateCcw className="h-4 w-4" />
                          )}
                          Retry
                        </Button>
                      ) : null}
                      {isAdmin && canCancelDigest(digest.status) ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-border/60"
                          onClick={() => runDigestAction(digest, "cancel")}
                          disabled={actionDigestId === digest.id}
                        >
                          {actionDigestId === digest.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                          Cancel
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) {
            setDetailData(null);
            setDetailDigestId(null);
          }
        }}
      >
        <DialogContent className="max-w-4xl rounded-[28px] p-0">
          <DialogHeader className="border-b border-border/60 px-6 py-6 sm:px-8">
            <DialogTitle className="text-2xl tracking-tight">
              {detailData ? "Digest run details" : "Loading digest details"}
            </DialogTitle>
            <DialogDescription>
              Review run state, matched tenders, failure recipients, and job activity.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[75vh]">
            <div className="space-y-6 px-6 py-6 sm:px-8">
              {detailLoading || !detailData ? (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div
                        key={index}
                        className="h-24 rounded-[24px] border border-border/60 bg-muted/20"
                      />
                    ))}
                  </div>
                  <div className="h-32 rounded-[24px] border border-border/60 bg-muted/20" />
                  <div className="h-48 rounded-[24px] border border-border/60 bg-muted/20" />
                </div>
              ) : (
                <DigestDetailPanel data={detailData} />
              )}
            </div>
          </ScrollArea>

          <DialogFooter className="border-t border-border/60 px-6 py-4 sm:px-8">
            {detailData ? (
              <>
                {isAdmin && canRetryDigest(detailData.digest.status) ? (
                  <Button
                    variant="outline"
                    className="border-border/60"
                    onClick={() => runDigestAction(detailData.digest, "retry")}
                    disabled={actionDigestId === detailData.digest.id}
                  >
                    {actionDigestId === detailData.digest.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RotateCcw className="h-4 w-4" />
                    )}
                    Retry run
                  </Button>
                ) : null}
                {isAdmin && canCancelDigest(detailData.digest.status) ? (
                  <Button
                    variant="outline"
                    className="border-border/60"
                    onClick={() => runDigestAction(detailData.digest, "cancel")}
                    disabled={actionDigestId === detailData.digest.id}
                  >
                    {actionDigestId === detailData.digest.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                    Cancel run
                  </Button>
                ) : null}
              </>
            ) : null}
            <Button variant="outline" className="border-border/60" onClick={() => setDetailOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function MobileDigestCard({
  digest,
  isAdmin,
  loading,
  onViewDetails,
  onRetry,
  onCancel,
}: {
  digest: DigestRun;
  isAdmin: boolean;
  loading: boolean;
  onViewDetails: () => void;
  onRetry: () => void;
  onCancel: () => void;
}) {
  const completedAt = getDigestCompletedAt(digest);
  const normalizedStatus = normalizeDigestStatus(digest.status);

  return (
    <Card className="rounded-[24px] border-border/60 bg-background/85 shadow-sm">
      <CardContent className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">
              {new Date(digest.created_at).toLocaleDateString("en-ZA", {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {completedAt
                ? new Date(completedAt).toLocaleTimeString("en-ZA", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "Still processing"}
            </p>
          </div>
          {renderStatusBadge(normalizedStatus)}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <DigestMetric label="Tenders" value={getDigestTenderCount(digest)} />
          <DigestMetric label="Recipients" value={getDigestRecipientCount(digest)} />
        </div>

        {normalizedStatus === "fail" && digest.error_message ? (
          <div className="rounded-[18px] border border-red-500/20 bg-red-500/5 p-3 text-xs leading-6 text-red-600">
            {digest.error_message}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-border/60"
            onClick={onViewDetails}
          >
            <Eye className="h-4 w-4" />
            Details
          </Button>
          {isAdmin && canRetryDigest(digest.status) ? (
            <Button
              variant="outline"
              size="sm"
              className="border-border/60"
              onClick={onRetry}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4" />
              )}
              Retry
            </Button>
          ) : null}
          {isAdmin && canCancelDigest(digest.status) ? (
            <Button
              variant="outline"
              size="sm"
              className="border-border/60"
              onClick={onCancel}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Square className="h-4 w-4" />
              )}
              Cancel
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function DigestDetailPanel({ data }: { data: DigestDetailResponse }) {
  const normalizedStatus = normalizeDigestStatus(data.digest.status);
  const failureRecipients = data.digest.job?.failure_recipients ?? [];
  const logLines = data.digest.logs
    ? data.digest.logs.split("\n").filter(Boolean)
    : [];
  const job = data.digest.job;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Digest run
          </p>
          <p className="mt-2 text-lg font-semibold tracking-tight">
            {formatDateTime(data.digest.created_at)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Run ID {data.digest.id.slice(0, 8)} · Tenant {data.digest.tenant_id.slice(0, 8)}
          </p>
        </div>
        {renderStatusBadge(normalizedStatus)}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <DetailStat
          label="Tenders"
          value={data.summary.total_tenders}
          detail="Matched in this run"
        />
        <DetailStat
          label="Recipients"
          value={data.summary.total_recipients}
          detail="Target audience"
        />
        <DetailStat
          label="Failures"
          value={data.summary.failed_recipients ?? failureRecipients.length}
          detail="Delivery issues"
        />
        <DetailStat
          label="Attempts"
          value={job?.attempt_count ?? 1}
          detail={`Retries ${job?.retry_count ?? 0}`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr,0.8fr]">
        <div className="rounded-[24px] border border-border/60 bg-background/85 p-5 shadow-sm">
          <p className="text-sm font-semibold">Run activity</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <ActivityItem label="Started" value={formatOptionalDate(data.digest.started_at)} />
            <ActivityItem
              label="Finished"
              value={formatOptionalDate(getDigestCompletedAt(data.digest))}
            />
            <ActivityItem
              label="Last claimed"
              value={formatOptionalDate(job?.last_claimed_at ?? null)}
            />
            <ActivityItem
              label="Last recovered"
              value={formatOptionalDate(job?.last_recovered_at ?? null)}
            />
            <ActivityItem
              label="Retry source"
              value={job?.retry_of ? job.retry_of.slice(0, 8) : "Original run"}
            />
            <ActivityItem
              label="Cancellation"
              value={
                job?.cancel_requested_at
                  ? `Requested ${formatOptionalDate(job.cancel_requested_at)}`
                  : "None"
              }
            />
          </div>

          {data.digest.error_message ? (
            <div className="mt-4 rounded-[18px] border border-red-500/20 bg-red-500/5 p-4 text-sm leading-6 text-red-600">
              {data.digest.error_message}
            </div>
          ) : null}

          {logLines.length > 0 ? (
            <div className="mt-4 rounded-[20px] border border-border/60 bg-muted/15 p-4">
              <p className="text-sm font-semibold">Worker log</p>
              <div className="mt-3 space-y-2 text-xs leading-6 text-muted-foreground">
                {logLines.map((line, index) => (
                  <p key={`${index}-${line}`}>{line}</p>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          <div className="rounded-[24px] border border-border/60 bg-background/85 p-5 shadow-sm">
            <p className="text-sm font-semibold">Breakdown</p>
            <div className="mt-4 space-y-4">
              <BreakdownGroup title="By category" values={data.summary.by_category} />
              <BreakdownGroup title="By priority" values={data.summary.by_priority} />
            </div>
          </div>

          {failureRecipients.length > 0 ? (
            <div className="rounded-[24px] border border-border/60 bg-background/85 p-5 shadow-sm">
              <p className="text-sm font-semibold">Failure recipients</p>
              <div className="mt-4 space-y-3">
                {failureRecipients.map((recipient) => (
                  <div
                    key={`${recipient.email}-${recipient.message}`}
                    className="rounded-[18px] border border-red-500/20 bg-red-500/5 p-3"
                  >
                    <p className="text-sm font-medium text-red-700">{recipient.email}</p>
                    <p className="mt-1 text-xs leading-6 text-red-600">{recipient.message}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="rounded-[24px] border border-border/60 bg-background/85 p-5 shadow-sm">
        <p className="text-sm font-semibold">Matched tenders</p>
        {data.tenders.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            No tender details were captured for this run.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {data.tenders.map((tender) => (
              <div
                key={tender.id}
                className="rounded-[18px] border border-border/60 bg-muted/10 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{tender.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {tender.source?.name ?? "Unknown source"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs capitalize">
                      {tender.category}
                    </Badge>
                    <Badge variant="outline" className="rounded-full px-3 py-1 text-xs capitalize">
                      {tender.priority}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BreakdownGroup({
  title,
  values,
}: {
  title: string;
  values: Record<string, number>;
}) {
  const entries = Object.entries(values);

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {title}
      </p>
      {entries.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">No data recorded.</p>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {entries.map(([key, value]) => (
            <Badge key={key} variant="secondary" className="rounded-full px-3 py-1 text-xs">
              {key}: {value}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

function DetailStat({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <div className="rounded-[24px] border border-border/60 bg-background/85 p-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-3 text-2xl font-semibold tracking-tight">{value}</p>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{detail}</p>
    </div>
  );
}

function ActivityItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-border/60 bg-muted/10 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-sm font-medium">{value}</p>
    </div>
  );
}

function HistorySummaryCard({
  title,
  value,
  detail,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  detail: string;
  icon: typeof Mail;
}) {
  return (
    <Card className="rounded-[24px] border-border/60 bg-background/85 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

function DigestMetric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-[18px] border border-border/60 bg-muted/15 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-base font-semibold">{value}</p>
    </div>
  );
}

function formatOptionalDate(value: string | null | undefined) {
  return value ? formatDateTime(value) : "Not recorded";
}

function renderStatusBadge(status: string) {
  const normalizedStatus = normalizeDigestStatus(status);

  if (normalizedStatus === "success") {
    return (
      <Badge className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600 hover:bg-emerald-500/10">
        Sent
      </Badge>
    );
  }

  if (normalizedStatus === "fail") {
    return (
      <Badge variant="destructive" className="rounded-full px-3 py-1 text-xs font-medium">
        <TriangleAlert className="mr-1.5 h-3.5 w-3.5" />
        Failed
      </Badge>
    );
  }

  if (normalizedStatus === "running") {
    return (
      <Badge variant="outline" className="rounded-full px-3 py-1 text-xs font-medium">
        <Clock3 className="mr-1.5 h-3.5 w-3.5" />
        Sending
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="rounded-full px-3 py-1 text-xs font-medium">
      Pending
    </Badge>
  );
}
