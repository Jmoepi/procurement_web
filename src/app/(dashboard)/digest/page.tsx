import { Metadata } from "next";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/server";
import { DigestHistory } from "@/components/digest/digest-history";
import { DigestPreview } from "@/components/digest/digest-preview";
import { normalizeDigestStatus } from "@/lib/digests";

export const metadata: Metadata = {
  title: "Digest Center | Procurement Radar SA",
  description: "Preview scheduled digests and review recent delivery history.",
};

export default async function DigestPage() {
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

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const [recentTendersResult, digestHistoryResult, tenantResult, subscribersResult] =
    await Promise.all([
      supabase
        .from("tenders")
        .select("*, source:sources(name)")
        .eq("tenant_id", profile.tenant_id)
        .eq("expired", false)
        .gte("first_seen", yesterday.toISOString())
        .order("priority", { ascending: false })
        .order("closing_at", { ascending: true })
        .limit(20),
      supabase
        .from("digest_runs")
        .select("id, tenant_id, run_date, status, tenders_found, emails_sent, started_at, finished_at, error_message, metadata, created_at")
        .eq("tenant_id", profile.tenant_id)
        .order("started_at", { ascending: false })
        .limit(30),
      supabase
        .from("tenants")
        .select("name, plan, settings")
        .eq("id", profile.tenant_id)
        .maybeSingle(),
      supabase
        .from("subscriptions")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", profile.tenant_id)
        .eq("is_active", true),
    ]);

  const recentTenders = (recentTendersResult.data || []).sort(
    (left, right) => getPriorityRank(right.priority) - getPriorityRank(left.priority)
  );
  const digestHistory = digestHistoryResult.data || [];
  const tenant = tenantResult.data;
  const activeRecipients = subscribersResult.count ?? 0;
  const latestDigest = digestHistory[0] ?? null;
  const tenantSettings =
    tenant?.settings && typeof tenant.settings === "object"
      ? (tenant.settings as Record<string, unknown>)
      : {};
  const digestTime =
    typeof tenantSettings.digest_time === "string" ? tenantSettings.digest_time : "07:00";
  const latestDigestStatus = latestDigest ? normalizeDigestStatus(latestDigest.status) : null;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[32px] border border-border/60 bg-background/80 p-6 shadow-sm backdrop-blur-sm sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_hsl(var(--primary)/0.18),transparent_42%)]" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Digest center
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Email digest
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
              Review today&apos;s draft, confirm the audience, and inspect recent delivery
              health without leaving the dashboard.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge className="rounded-full px-3 py-1 text-xs font-medium">
              {recentTenders.length} in today&apos;s preview
            </Badge>
            <Badge
              variant="secondary"
              className="rounded-full border border-border/60 bg-background/80 px-3 py-1 text-xs font-medium"
            >
              {activeRecipients} active recipients
            </Badge>
            <Badge
              variant="secondary"
              className="rounded-full border border-border/60 bg-background/80 px-3 py-1 text-xs font-medium"
            >
              Scheduled for {digestTime} SAST
            </Badge>
            {latestDigestStatus ? (
              <Badge
                variant={latestDigestStatus === "success" ? "secondary" : latestDigestStatus === "fail" ? "destructive" : "outline"}
                className="rounded-full px-3 py-1 text-xs font-medium capitalize"
              >
                Latest digest: {latestDigestStatus === "success" ? "sent" : latestDigestStatus}
              </Badge>
            ) : null}
          </div>
        </div>
      </section>

      <Tabs defaultValue="preview" className="space-y-4">
        <TabsList className="grid h-auto w-full max-w-md grid-cols-2 rounded-[20px] bg-muted/50 p-1">
          <TabsTrigger value="preview" className="rounded-2xl py-2.5">
            Today&apos;s preview
          </TabsTrigger>
          <TabsTrigger value="history" className="rounded-2xl py-2.5">
            Sending history
          </TabsTrigger>
        </TabsList>

        <TabsContent value="preview" className="space-y-4">
          <DigestPreview
            tenders={recentTenders}
            tenantName={tenant?.name || "Your organization"}
            digestTime={digestTime}
            recipientCount={activeRecipients}
          />
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <DigestHistory digests={digestHistory} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function getPriorityRank(priority: string) {
  if (priority === "high") return 3;
  if (priority === "medium") return 2;
  if (priority === "low") return 1;
  return 0;
}
