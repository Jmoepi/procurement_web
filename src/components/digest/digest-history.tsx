import { CheckCircle2, Clock3, Mail, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getDigestCompletedAt,
  getDigestRecipientCount,
  getDigestTenderCount,
  isDigestSuccess,
  normalizeDigestStatus,
} from "@/lib/digests";
import type { DigestRun } from "@/types/database";

interface DigestHistoryProps {
  digests: DigestRun[];
}

export function DigestHistory({ digests }: DigestHistoryProps) {
  const successfulDigests = digests.filter((digest) => isDigestSuccess(digest.status)).length;
  const failedDigests = digests.filter(
    (digest) => normalizeDigestStatus(digest.status) === "fail"
  ).length;
  const successRate =
    digests.length > 0 ? Math.round((successfulDigests / digests.length) * 100) : 100;
  const latestCompletedDigest = digests.find((digest) => getDigestCompletedAt(digest));

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
          <MobileDigestCard key={digest.id} digest={digest} />
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
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function MobileDigestCard({ digest }: { digest: DigestRun }) {
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
      </CardContent>
    </Card>
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
