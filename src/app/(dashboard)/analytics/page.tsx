import { Metadata } from "next";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Analytics | Procurement Radar SA",
  description: "View tender analytics and insights",
};

export default async function AnalyticsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/dashboard");

  const { data: categoryStats } = await supabase
    .from("tenders")
    .select("category")
    .eq("tenant_id", profile.tenant_id);

  const { data: priorityStats } = await supabase
    .from("tenders")
    .select("priority")
    .eq("tenant_id", profile.tenant_id);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: recentTenders } = await supabase
    .from("tenders")
    .select("created_at, category, priority")
    .eq("tenant_id", profile.tenant_id)
    .gte("created_at", thirtyDaysAgo.toISOString())
    .order("created_at", { ascending: true });

  const { data: sourceStats } = await supabase
    .from("sources")
    .select("name, last_crawled_at, crawl_success_rate, tenders_found, metadata")
    .eq("tenant_id", profile.tenant_id)
    .eq("enabled", true)
    .order("last_crawled_at", { ascending: false })
    .limit(10);

  const mappedSourceStats = (sourceStats || []).map((source) => ({
    name: source.name,
    last_crawled_at: source.last_crawled_at,
    crawl_success_rate:
      source.crawl_success_rate ??
      ((source.metadata as Record<string, unknown>)?.crawl_success_rate as number | null) ??
      null,
    tenders_found:
      source.tenders_found ??
      ((source.metadata as Record<string, unknown>)?.tenders_found as number | null) ??
      null,
  }));

  const { data: digestStats } = await supabase
    .from("digest_runs")
    .select("created_at, tenders_found, emails_sent, status, metadata")
    .eq("tenant_id", profile.tenant_id)
    .order("created_at", { ascending: false })
    .limit(30);

  const mappedDigestStats = (digestStats || []).map((digest) => ({
    created_at: digest.created_at,
    tenders_found: digest.tenders_found ?? 0,
    emails_sent: digest.emails_sent ?? 0,
    metadata: digest.metadata as Record<string, unknown>,
    status: digest.status,
  }));

  const categoryCounts = (categoryStats || []).reduce((acc, { category }) => {
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const priorityCounts = (priorityStats || []).reduce((acc, { priority }) => {
    acc[priority] = (acc[priority] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const dailyCounts = (recentTenders || []).reduce((acc, { created_at }) => {
    const date = new Date(created_at).toISOString().split("T")[0] as string;
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-[30px] border border-border/60 bg-background/80 p-5 shadow-sm backdrop-blur-sm sm:p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_hsl(var(--primary)/0.14),transparent_45%)]" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Workspace analytics
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Analytics
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
              Understand where tenders are coming from, how fast opportunities are
              moving, and how reliably digests are landing.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs font-medium">
              {(categoryStats?.length || 0).toLocaleString()} total tenders
            </Badge>
            <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs font-medium">
              {mappedSourceStats.length} active sources
            </Badge>
            <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs font-medium">
              {mappedDigestStats.length} recent digests
            </Badge>
          </div>
        </div>
      </div>

      <AnalyticsDashboard
        categoryCounts={categoryCounts}
        priorityCounts={priorityCounts}
        dailyCounts={dailyCounts}
        sourceStats={mappedSourceStats}
        digestStats={mappedDigestStats}
        totalTenders={categoryStats?.length || 0}
      />
    </div>
  );
}
