import type { ComponentType } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock3,
  FileText,
  Globe,
  Mail,
  Sparkles,
  TrendingUp,
  Users2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { createClient } from "@/lib/supabase/server";
import { getDigestCompletedAt, getDigestRecipientCount, getDigestTenderCount, normalizeDigestStatus } from "@/lib/digests";
import { formatDateShort, formatDaysRemaining, getCategoryColor, getPriorityColor } from "@/lib/utils";
import type { PlanType, Tender, TenantStats } from "@/types";

type TenderWithSource = Tender & {
  source: { name: string } | null;
};

type SourceSnapshot = {
  name: string;
  last_crawled_at?: string | null;
  crawl_success_rate?: number | null;
  tenders_found?: number | null;
};

type DigestSnapshot = {
  status: string;
  created_at: string;
  finished_at?: string | null;
  tenders_found?: number | null;
  emails_sent?: number | null;
  metadata?: Record<string, unknown> | null;
};

type TenantInfo = {
  name: string;
  plan: PlanType;
  settings: Record<string, unknown> | null;
};

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, full_name")
    .eq("id", user?.id ?? "")
    .single();

  const tenantId = profile?.tenant_id ?? "";

  const [
    statsResult,
    recentTendersResult,
    highPriorityTendersResult,
    closingSoonTendersResult,
    sourcesResult,
    latestDigestResult,
    tenantResult,
  ] = await Promise.all([
    supabase.from("tenant_stats").select("*").eq("tenant_id", tenantId).single(),
    supabase
      .from("tenders")
      .select("*, source:sources(name)")
      .eq("tenant_id", tenantId)
      .eq("expired", false)
      .order("first_seen", { ascending: false })
      .limit(5),
    supabase
      .from("tenders")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("priority", "high")
      .eq("expired", false)
      .order("closing_at", { ascending: true })
      .limit(5),
    supabase
      .from("tenders")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("expired", false)
      .gte("days_remaining", 0)
      .lte("days_remaining", 7)
      .order("days_remaining", { ascending: true })
      .limit(6),
    supabase
      .from("sources")
      .select("name, last_crawled_at, crawl_success_rate, tenders_found")
      .eq("tenant_id", tenantId)
      .eq("enabled", true)
      .order("tenders_found", { ascending: false })
      .limit(4),
    supabase
      .from("digest_runs")
      .select("status, created_at, finished_at, tenders_found, emails_sent, metadata")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("tenants").select("name, plan, settings").eq("id", tenantId).maybeSingle(),
  ]);

  const stats = statsResult.data as TenantStats | null;
  const recentTenders = (recentTendersResult.data ?? []) as TenderWithSource[];
  const highPriorityTenders = (highPriorityTendersResult.data ?? []) as Tender[];
  const closingSoonTenders = (closingSoonTendersResult.data ?? []) as Tender[];
  const topSources = (sourcesResult.data ?? []) as SourceSnapshot[];
  const latestDigest = latestDigestResult.data as DigestSnapshot | null;
  const tenant = tenantResult.data as TenantInfo | null;

  const greeting = getGreeting();
  const firstName = profile?.full_name?.split(" ")[0] || "there";
  const tenantSettings =
    tenant?.settings && typeof tenant.settings === "object"
      ? (tenant.settings as Record<string, unknown>)
      : {};
  const digestTime =
    typeof tenantSettings.digest_time === "string" ? tenantSettings.digest_time : "07:00";
  const planName = tenant?.plan || "starter";
  const sourceUsage = stats?.source_count ?? 0;
  const sourceLimit = stats?.max_sources ?? 30;
  const subscriberUsage = stats?.subscriber_count ?? 0;
  const subscriberLimit = stats?.max_subscribers ?? 1;
  const closingSoonUrgentCount = closingSoonTenders.filter(
    (tender) => (tender.days_remaining ?? 99) <= 3
  ).length;
  const latestDigestStatus = latestDigest ? normalizeDigestStatus(latestDigest.status) : null;

  return (
    <div className="space-y-6 md:space-y-8">
      <section className="relative overflow-hidden rounded-[32px] border border-border/60 bg-background/80 p-6 shadow-sm backdrop-blur-sm sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_hsl(var(--primary)/0.18),transparent_42%)]" />
        <div className="pointer-events-none absolute -left-10 top-10 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Daily command center
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              {greeting}, {firstName}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
              Review your strongest opportunities, check delivery health, and keep the
              workspace moving without bouncing between pages.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <Badge className="rounded-full px-3 py-1 text-xs font-medium capitalize">
                {planName} plan
              </Badge>
              <Badge
                variant="secondary"
                className="rounded-full border border-border/60 bg-background/80 px-3 py-1 text-xs font-medium"
              >
                Digest at {digestTime} SAST
              </Badge>
              <Badge
                variant="secondary"
                className="rounded-full border border-border/60 bg-background/80 px-3 py-1 text-xs font-medium"
              >
                {(stats?.new_tenders_24h ?? 0).toLocaleString()} new in 24h
              </Badge>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" className="shadow-lg shadow-primary/20" asChild>
                <Link href="/tenders">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Review opportunities
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="border-border/60" asChild>
                <Link href="/digest">
                  <Mail className="mr-2 h-4 w-4" />
                  Check digest center
                </Link>
              </Button>
            </div>
          </div>

          <Card className="rounded-[28px] border-border/60 bg-background/85 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Activity className="h-5 w-5 text-primary" />
                Today&apos;s signal
              </CardTitle>
              <CardDescription>
                The quickest read on what needs attention first.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <SignalTile
                label="New opportunities"
                value={stats?.new_tenders_24h ?? 0}
                tone="blue"
                icon={FileText}
                detail="Freshly discovered since yesterday"
              />
              <SignalTile
                label="High priority"
                value={highPriorityTenders.length}
                tone="red"
                icon={TrendingUp}
                detail="Worth reviewing ahead of the rest"
              />
              <SignalTile
                label="Closing soon"
                value={closingSoonUrgentCount}
                tone="orange"
                icon={AlertTriangle}
                detail="Urgent items with less runway left"
              />
            </CardContent>
          </Card>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <MetricCard
          title="Active tenders"
          value={stats?.tender_count ?? 0}
          subtitle={`${stats?.new_tenders_24h ?? 0} added in the last 24 hours`}
          icon={FileText}
          accent="blue"
        />
        <MetricCard
          title="Sources online"
          value={sourceUsage}
          subtitle={`${Math.max(sourceLimit - sourceUsage, 0)} slots remaining on this plan`}
          icon={Globe}
          accent="emerald"
          progress={sourceLimit > 0 ? (sourceUsage / sourceLimit) * 100 : 0}
        />
        <MetricCard
          title="Digest recipients"
          value={subscriberUsage}
          subtitle={`${Math.max(subscriberLimit - subscriberUsage, 0)} recipient slots available`}
          icon={Users2}
          accent="violet"
          progress={subscriberLimit > 0 ? (subscriberUsage / subscriberLimit) * 100 : 0}
        />
        <MetricCard
          title="Recent delivery"
          value={latestDigest ? getDigestRecipientCount(latestDigest) : 0}
          subtitle={
            latestDigest
              ? `${getDigestTenderCount(latestDigest)} tenders in the latest digest`
              : "No digest has been sent yet"
          }
          icon={Mail}
          accent={latestDigestStatus === "fail" ? "red" : "orange"}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
        <Card className="rounded-[28px] border-border/60 bg-background/85 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-xl">Recent opportunities</CardTitle>
                <CardDescription>
                  The newest tenders across your monitored sources.
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="hidden rounded-xl sm:flex" asChild>
                <Link href="/tenders">
                  View all
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentTenders.length > 0 ? (
              <>
                {recentTenders.map((tender, index) => (
                  <OpportunityRow
                    key={tender.id}
                    tender={tender}
                    index={index}
                    metaLabel={tender.source?.name ?? "Unknown source"}
                    showFoundDate
                  />
                ))}
                <Button variant="ghost" size="sm" className="mt-2 w-full rounded-xl sm:hidden" asChild>
                  <Link href="/tenders">
                    View all tenders
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </>
            ) : (
              <DashboardEmptyState
                title="No tenders found yet"
                description="They will appear here as soon as the crawler finds new opportunities."
              />
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[28px] border-border/60 bg-background/85 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-xl">Workspace pulse</CardTitle>
            <CardDescription>
              Delivery health, source coverage, and usage in one view.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-[24px] border border-border/60 bg-muted/20 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Latest digest</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {latestDigest
                      ? `Last activity on ${formatDateShort(latestDigest.created_at)}`
                      : "No digest activity recorded yet"}
                  </p>
                </div>
                {latestDigestStatus ? (
                  <StatusBadge status={latestDigestStatus} />
                ) : (
                  <Badge variant="outline" className="rounded-full px-3 py-1 text-xs font-medium">
                    Pending setup
                  </Badge>
                )}
              </div>

              {latestDigest ? (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <PulseStat
                    label="Tenders"
                    value={getDigestTenderCount(latestDigest)}
                    accent="text-foreground"
                  />
                  <PulseStat
                    label="Recipients"
                    value={getDigestRecipientCount(latestDigest)}
                    accent="text-foreground"
                  />
                  <PulseStat
                    label="Completed"
                    value={
                      getDigestCompletedAt(latestDigest)
                        ? new Date(getDigestCompletedAt(latestDigest)!).toLocaleTimeString("en-ZA", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "-"
                    }
                    accent="text-muted-foreground"
                  />
                  <PulseStat
                    label="Status"
                    value={latestDigestStatus === "success" ? "Delivered" : latestDigestStatus === "fail" ? "Attention" : "Running"}
                    accent={latestDigestStatus === "fail" ? "text-red-500" : "text-emerald-500"}
                  />
                </div>
              ) : null}
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Top source health</p>
                  <p className="text-xs text-muted-foreground">
                    Based on tenders found and recent crawl performance.
                  </p>
                </div>
                <Button variant="ghost" size="sm" className="rounded-xl" asChild>
                  <Link href="/sources">Sources</Link>
                </Button>
              </div>

              {topSources.length > 0 ? (
                <div className="space-y-3">
                  {topSources.map((source) => (
                    <SourceHealthRow key={source.name} source={source} />
                  ))}
                </div>
              ) : (
                <DashboardEmptyState
                  title="No sources configured"
                  description="Add monitored portals to start building live intelligence."
                  compact
                />
              )}
            </div>

            <div className="space-y-4 rounded-[24px] border border-border/60 bg-muted/20 p-4">
              <CapacityRow label="Source capacity" used={sourceUsage} total={sourceLimit} />
              <CapacityRow
                label="Recipient capacity"
                used={subscriberUsage}
                total={subscriberLimit}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[28px] border-red-500/15 bg-background/85 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <TrendingUp className="h-5 w-5 text-red-500" />
                  High priority queue
                </CardTitle>
                <CardDescription>
                  Your strongest opportunities, ordered by nearest deadline.
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="hidden rounded-xl sm:flex" asChild>
                <Link href="/tenders?priority=high">
                  View all
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {highPriorityTenders.length > 0 ? (
              <>
                {highPriorityTenders.map((tender, index) => (
                  <OpportunityRow
                    key={tender.id}
                    tender={tender}
                    index={index}
                    metaLabel={
                      tender.closing_at
                        ? `Closes ${formatDateShort(tender.closing_at)}`
                        : "No deadline"
                    }
                    highlight="high"
                    showDaysRemaining
                  />
                ))}
                <Button variant="ghost" size="sm" className="mt-2 w-full rounded-xl sm:hidden" asChild>
                  <Link href="/tenders?priority=high">
                    View high priority
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </>
            ) : (
              <DashboardEmptyState
                title="No high priority tenders"
                description="Priority scoring will surface your strongest matches here."
              />
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[28px] border-orange-500/15 bg-background/85 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Clock3 className="h-5 w-5 text-orange-500" />
                  Closing soon
                </CardTitle>
                <CardDescription>
                  Short-deadline tenders that need a decision soon.
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="hidden rounded-xl sm:flex" asChild>
                <Link href="/tenders?closing_soon=true">
                  View all
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {closingSoonTenders.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {closingSoonTenders.map((tender, index) => (
                  <ClosingSoonCard key={tender.id} tender={tender} index={index} />
                ))}
              </div>
            ) : (
              <DashboardEmptyState
                title="Nothing urgent right now"
                description="As deadlines tighten, they will show up here automatically."
              />
            )}
            <Button variant="ghost" size="sm" className="mt-4 w-full rounded-xl sm:hidden" asChild>
              <Link href="/tenders?closing_soon=true">
                View closing soon
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  accent,
  progress,
}: {
  title: string;
  value: number;
  subtitle: string;
  icon: ComponentType<{ className?: string }>;
  accent: "blue" | "emerald" | "violet" | "orange" | "red";
  progress?: number;
}) {
  const accentClasses = {
    blue: "bg-blue-500/10 text-blue-500",
    emerald: "bg-emerald-500/10 text-emerald-500",
    violet: "bg-violet-500/10 text-violet-500",
    orange: "bg-orange-500/10 text-orange-500",
    red: "bg-red-500/10 text-red-500",
  } as const;

  return (
    <Card className="rounded-[24px] border-border/60 bg-background/85 shadow-sm">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              {value.toLocaleString()}
            </p>
          </div>
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-2xl ${accentClasses[accent]}`}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>
        {progress !== undefined ? (
          <div className="mt-4 space-y-2">
            <Progress value={Math.min(progress, 100)} className="h-1.5 bg-muted/80" />
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
        ) : (
          <p className="mt-4 text-xs text-muted-foreground">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}

function SignalTile({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  detail: string;
  icon: ComponentType<{ className?: string }>;
  tone: "blue" | "red" | "orange";
}) {
  const toneClasses = {
    blue: "bg-blue-500/10 text-blue-500",
    red: "bg-red-500/10 text-red-500",
    orange: "bg-orange-500/10 text-orange-500",
  } as const;

  return (
    <div className="rounded-[22px] border border-border/60 bg-muted/20 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
        </div>
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-2xl ${toneClasses[tone]}`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-3 text-xs leading-5 text-muted-foreground">{detail}</p>
    </div>
  );
}

function OpportunityRow({
  tender,
  index,
  metaLabel,
  highlight,
  showFoundDate,
  showDaysRemaining,
}: {
  tender: Tender & { source?: { name: string } | null };
  index: number;
  metaLabel: string;
  highlight?: "high";
  showFoundDate?: boolean;
  showDaysRemaining?: boolean;
}) {
  return (
    <Link
      href={`/tenders/${tender.id}`}
      className={`group flex items-start gap-3 rounded-[22px] border border-transparent px-3 py-3 transition-all duration-200 hover:border-border/60 hover:bg-muted/40 ${
        highlight === "high" ? "hover:border-red-500/20 hover:bg-red-500/5" : ""
      }`}
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-muted text-muted-foreground transition-colors duration-200 group-hover:bg-primary/10 group-hover:text-primary">
        <FileText className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm font-semibold leading-6 transition-colors duration-200 group-hover:text-primary">
          {tender.title}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="truncate">{metaLabel}</span>
          {showFoundDate ? (
            <Badge variant="secondary" className="rounded-full px-2 py-0.5 text-[10px] font-medium">
              Found {formatDateShort(tender.first_seen)}
            </Badge>
          ) : null}
          <Badge className={`${getCategoryColor(tender.category)} rounded-full text-[10px] font-medium`}>
            {tender.category}
          </Badge>
          <Badge className={`${getPriorityColor(tender.priority)} rounded-full text-[10px] font-medium`}>
            {tender.priority}
          </Badge>
        </div>
      </div>
      {showDaysRemaining && tender.days_remaining != null ? (
        <div className="shrink-0 text-right">
          <p
            className={`text-xs font-semibold ${
              tender.days_remaining <= 3 ? "text-red-500" : "text-muted-foreground"
            }`}
          >
            {formatDaysRemaining(tender.days_remaining)}
          </p>
        </div>
      ) : null}
    </Link>
  );
}

function SourceHealthRow({ source }: { source: SourceSnapshot }) {
  const successRate = Math.max(0, Math.min(source.crawl_success_rate ?? 0, 100));
  const tendersFound = source.tenders_found ?? 0;

  return (
    <div className="rounded-[22px] border border-border/60 bg-background/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{source.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {source.last_crawled_at
              ? `Last crawl ${formatDateShort(source.last_crawled_at)}`
              : "No crawl recorded yet"}
          </p>
        </div>
        <Badge variant="secondary" className="rounded-full px-2.5 py-1 text-[10px] font-medium">
          {tendersFound} found
        </Badge>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <Progress value={successRate} className="h-1.5 bg-muted/80" />
        <span className="text-xs font-medium text-muted-foreground">{Math.round(successRate)}%</span>
      </div>
    </div>
  );
}

function CapacityRow({
  label,
  used,
  total,
}: {
  label: string;
  used: number;
  total: number;
}) {
  const percentage = total > 0 ? (used / total) * 100 : 0;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          {used} / {total}
        </span>
      </div>
      <Progress value={Math.min(percentage, 100)} className="h-1.5 bg-muted/80" />
    </div>
  );
}

function PulseStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent: string;
}) {
  return (
    <div className="rounded-[18px] border border-border/60 bg-background/70 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className={`mt-2 text-base font-semibold ${accent}`}>{value}</p>
    </div>
  );
}

function ClosingSoonCard({ tender, index }: { tender: Tender; index: number }) {
  const isUrgent = (tender.days_remaining ?? 99) <= 2;

  return (
    <Link
      href={`/tenders/${tender.id}`}
      className={`block rounded-[24px] border p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg ${
        isUrgent
          ? "border-red-500/25 bg-red-500/5"
          : "border-border/60 bg-background/70 hover:border-orange-500/20"
      }`}
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <Badge className={`${getCategoryColor(tender.category)} rounded-full text-[10px] font-medium`}>
          {tender.category}
        </Badge>
        <span
          className={`text-xs font-semibold ${
            isUrgent ? "text-red-500" : "text-orange-500"
          }`}
        >
          {formatDaysRemaining(tender.days_remaining)}
        </span>
      </div>
      <p className="mt-3 line-clamp-2 text-sm font-semibold leading-6">{tender.title}</p>
      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
        <span>{tender.closing_at ? formatDateShort(tender.closing_at) : "No deadline"}</span>
        <Badge className={`${getPriorityColor(tender.priority)} rounded-full text-[10px] font-medium`}>
          {tender.priority}
        </Badge>
      </div>
    </Link>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "success") {
    return (
      <Badge className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600 hover:bg-emerald-500/10">
        <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
        Delivered
      </Badge>
    );
  }

  if (status === "fail") {
    return (
      <Badge variant="destructive" className="rounded-full px-3 py-1 text-xs font-medium">
        Attention needed
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="rounded-full px-3 py-1 text-xs font-medium">
      In progress
    </Badge>
  );
}

function DashboardEmptyState({
  title,
  description,
  compact,
}: {
  title: string;
  description: string;
  compact?: boolean;
}) {
  return (
    <div className={`rounded-[24px] border border-dashed border-border/60 bg-muted/10 text-center ${compact ? "p-4" : "p-8"}`}>
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/40">
        <BarChart3 className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="mt-4 text-sm font-semibold">{title}</p>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}
