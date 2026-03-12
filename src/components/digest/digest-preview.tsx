import Link from "next/link";
import {
  ArrowRight,
  Clock3,
  Eye,
  Mail,
  Settings2,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Tender } from "@/types/database";
import { formatDate, getCategoryColor, getDaysRemaining, getPriorityColor } from "@/lib/utils";

interface DigestPreviewProps {
  tenders: Tender[];
  tenantName: string;
  digestTime: string;
  recipientCount: number;
}

export function DigestPreview({
  tenders,
  tenantName,
  digestTime,
  recipientCount,
}: DigestPreviewProps) {
  const todayLabel = new Date().toLocaleDateString("en-ZA", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const highPriorityTenders = tenders.filter((tender) => tender.priority === "high");
  const closingSoonTenders = tenders.filter((tender) => {
    if (!tender.closing_at) return false;
    const daysRemaining = getDaysRemaining(tender.closing_at);
    return daysRemaining >= 0 && daysRemaining <= 5;
  });

  if (tenders.length === 0) {
    return (
      <Card className="rounded-[30px] border-border/60 bg-background/85 shadow-sm">
        <CardContent className="px-6 py-12 text-center sm:px-10">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Mail className="h-6 w-6" />
          </div>
          <h2 className="mt-5 text-2xl font-semibold tracking-tight">
            No tenders in today&apos;s preview
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-muted-foreground">
            As soon as new opportunities are discovered, they will be staged here before
            the next scheduled digest send.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs font-medium">
              Scheduled for {digestTime} SAST
            </Badge>
            <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs font-medium">
              {recipientCount} active recipients
            </Badge>
          </div>
          <Button className="mt-8" asChild>
            <Link href="/settings">
              Adjust digest settings
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-[1.08fr,0.92fr]">
        <Card className="rounded-[28px] border-border/60 bg-background/85 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Clock3 className="h-5 w-5 text-primary" />
              Next digest run
            </CardTitle>
            <CardDescription>
              Preview what is lined up before the scheduled send window.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <PreviewStat label="Send time" value={`${digestTime} SAST`} />
              <PreviewStat label="Recipients" value={recipientCount} />
              <PreviewStat label="Draft items" value={tenders.length} />
            </div>
            <div className="rounded-[22px] border border-border/60 bg-muted/20 p-4">
              <p className="text-sm font-semibold">What this preview confirms</p>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                It shows the opportunities currently queued for {tenantName}, highlights
                urgent items, and gives you a clean read on what recipients will see.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild>
                <Link href="/tenders">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Review all tenders
                </Link>
              </Button>
              <Button variant="outline" className="border-border/60" asChild>
                <Link href="/settings">
                  <Settings2 className="mr-2 h-4 w-4" />
                  Manage preferences
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
          <SummaryCard
            title="New tenders"
            value={tenders.length}
            detail="Included in the current preview"
          />
          <SummaryCard
            title="High priority"
            value={highPriorityTenders.length}
            detail="Worth checking first"
            accent="text-red-500"
          />
          <SummaryCard
            title="Closing soon"
            value={closingSoonTenders.length}
            detail="Deadlines inside five days"
            accent="text-orange-500"
          />
        </div>
      </div>

      <Card className="overflow-hidden rounded-[32px] border-border/60 bg-background/85 shadow-sm">
        <div className="border-b border-border/60 bg-gradient-to-br from-primary/12 via-primary/5 to-transparent px-6 py-6 md:px-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Preview mode
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                Procurement Radar SA daily digest
              </h2>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                Drafted for {todayLabel} with the strongest opportunities currently in queue.
              </p>
            </div>
            <Badge className="rounded-full px-3 py-1 text-xs font-medium">
              <Eye className="mr-1.5 h-3.5 w-3.5" />
              Preview only
            </Badge>
          </div>
        </div>

        <CardContent className="space-y-6 p-6 md:p-8">
          <div className="rounded-[24px] border border-border/60 bg-muted/15 p-5">
            <p className="text-lg font-semibold">Good day, {tenantName}</p>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              Here is the current digest draft. We found{" "}
              <span className="font-semibold text-foreground">{tenders.length} opportunities</span>{" "}
              matching your workspace criteria, including{" "}
              <span className="font-semibold text-foreground">
                {highPriorityTenders.length} high-priority items
              </span>
              .
            </p>
          </div>

          {highPriorityTenders.length > 0 ? (
            <DigestSection
              title="High priority opportunities"
              description="The strongest matches based on urgency and fit."
              tenders={highPriorityTenders.slice(0, 5)}
            />
          ) : null}

          {closingSoonTenders.length > 0 ? (
            <DigestSection
              title="Closing soon"
              description="Items with deadlines that need attention quickly."
              tenders={closingSoonTenders.slice(0, 5)}
            />
          ) : null}

          <DigestSection
            title="All draft tenders"
            description="Everything currently queued for the next send."
            tenders={tenders.slice(0, 10)}
          />

          {tenders.length > 10 ? (
            <div className="rounded-[20px] border border-dashed border-border/60 bg-muted/10 p-4 text-center text-sm text-muted-foreground">
              {tenders.length - 10} more tenders are queued and will appear in the full digest.
            </div>
          ) : null}

          <div className="flex flex-col gap-3 rounded-[24px] border border-border/60 bg-muted/15 p-5 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <div>
              Recipients are receiving this digest because they are active subscribers on
              your workspace.
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="border-border/60" asChild>
                <Link href="/settings">Preferences</Link>
              </Button>
              <Button variant="outline" size="sm" className="border-border/60" asChild>
                <Link href="/tenders">All tenders</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  detail,
  accent,
}: {
  title: string;
  value: number;
  detail: string;
  accent?: string;
}) {
  return (
    <Card className="rounded-[24px] border-border/60 bg-background/85 shadow-sm">
      <CardContent className="p-5">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <p className={`mt-2 text-3xl font-bold tracking-tight ${accent ?? ""}`}>{value}</p>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

function PreviewStat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-[20px] border border-border/60 bg-background/75 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-base font-semibold">{value}</p>
    </div>
  );
}

function DigestSection({
  title,
  description,
  tenders,
}: {
  title: string;
  description: string;
  tenders: Tender[];
}) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="space-y-3">
        {tenders.map((tender) => (
          <TenderItem key={tender.id} tender={tender} />
        ))}
      </div>
    </section>
  );
}

function TenderItem({ tender }: { tender: Tender }) {
  const daysRemaining = tender.closing_at ? getDaysRemaining(tender.closing_at) : null;
  const issuer = (tender.metadata?.issuer as string) || tender.source?.name || "Unknown issuer";
  const referenceNumber = (tender.metadata?.reference_number as string) || "N/A";
  const estimatedValue = tender.metadata?.estimated_value as number | undefined;

  return (
    <div className="rounded-[24px] border border-border/60 bg-background/80 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h4 className="line-clamp-2 text-sm font-semibold leading-6">{tender.title}</h4>
          <p className="mt-2 text-xs text-muted-foreground">
            {issuer} · Ref {referenceNumber}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <Badge className={`${getCategoryColor(tender.category)} rounded-full text-[10px] font-medium`}>
            {tender.category}
          </Badge>
          <Badge className={`${getPriorityColor(tender.priority)} rounded-full text-[10px] font-medium`}>
            {tender.priority}
          </Badge>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="text-muted-foreground">
          Closes {tender.closing_at ? formatDate(tender.closing_at) : "without a deadline"}
        </span>
        {daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 7 ? (
          <span className={daysRemaining <= 3 ? "font-semibold text-red-500" : "font-semibold text-orange-500"}>
            {daysRemaining === 0 ? "Closes today" : `${daysRemaining} days left`}
          </span>
        ) : null}
        {estimatedValue ? (
          <span className="font-semibold text-foreground">R{estimatedValue.toLocaleString()}</span>
        ) : null}
      </div>
    </div>
  );
}
