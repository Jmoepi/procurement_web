import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SourcesTable } from "@/components/sources/sources-table";
import { AddSourceDialog } from "@/components/sources/add-source-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { getPlanLimitMessage } from "@/lib/plans";
import type { Source, TenantStats } from "@/types";
import { getCurrentWorkspaceContext } from "@/lib/current-workspace";

export default async function SourcesPage() {
  const supabase = await createClient();
  const workspace = await getCurrentWorkspaceContext(supabase);
  const profile = workspace?.profile ?? null;

  // Only admins can access this page
  if (!workspace?.hasAdminAccess || !profile) {
    redirect("/dashboard");
  }

  // Get sources
  const { data: sources } = await supabase
    .from("sources")
    .select("*")
    .eq("tenant_id", profile.tenant_id)
    .order("created_at", { ascending: false }) as { data: Source[] | null };

  // Get tenant stats for limits
  const { data: stats } = await supabase
    .from("tenant_stats")
    .select("*")
    .eq("tenant_id", profile.tenant_id)
    .single() as { data: TenantStats | null };

  const limitMessage = getPlanLimitMessage(
    stats?.source_count ?? 0,
    stats?.max_sources ?? 30,
    "sources"
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sources</h1>
          <p className="text-muted-foreground">
            Manage the websites and portals to monitor for tenders
          </p>
        </div>
        <AddSourceDialog tenantId={profile.tenant_id} />
      </div>

      {/* Plan Limit Warning */}
      {limitMessage && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{limitMessage}</AlertDescription>
        </Alert>
      )}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.source_count ?? 0} / {stats?.max_sources ?? 30}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sources?.filter((s) => s.enabled).length ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Requiring JS</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sources?.filter((s) => s.requires_js).length ?? 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sources Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Sources</CardTitle>
          <CardDescription>
            Click on a source to edit or disable it
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SourcesTable sources={sources ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}
