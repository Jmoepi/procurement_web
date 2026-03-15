import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { getTenderListPage } from "@/lib/tender-queries";
import { TendersFilters } from "@/components/tenders/tenders-filters";
import { TendersTable } from "@/components/tenders/tenders-table";
import { getCurrentWorkspaceContext } from "@/lib/current-workspace";

interface TendersPageProps {
  searchParams: Promise<{
    category?: string;
    priority?: string;
    search?: string;
    expired?: string;
    closing_soon?: string;
    page?: string;
  }>;
}

export default async function TendersPage({ searchParams }: TendersPageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const workspace = await getCurrentWorkspaceContext(supabase);
  const profile = workspace?.profile ?? null;

  const page = Math.max(1, parseInt(params.page ?? "1"));
  const pageSize = 20;
  const { data: tenders, count } = await getTenderListPage(supabase, {
    tenantId: profile?.tenant_id ?? "",
    category: params.category && params.category !== "all" ? params.category : undefined,
    priority: params.priority && params.priority !== "all" ? params.priority : undefined,
    search: params.search || undefined,
    expired: params.closing_soon === "true" ? undefined : params.expired !== "true" ? false : true,
    closingSoon: params.closing_soon === "true",
    page,
    pageSize,
  });

  const totalPages = Math.max(1, Math.ceil(count / pageSize));
  const activeFilterCount = [
    params.category && params.category !== "all" ? params.category : null,
    params.priority && params.priority !== "all" ? params.priority : null,
    params.search ? params.search : null,
    params.expired === "true" ? "expired" : null,
    params.closing_soon === "true" ? "closing_soon" : null,
  ].filter(Boolean).length;

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-[30px] border border-border/60 bg-background/80 p-5 shadow-sm backdrop-blur-sm sm:p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_hsl(var(--primary)/0.14),transparent_45%)]" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Tender intelligence
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Tenders
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
              Search, filter, and act on the opportunities most likely to matter
              to your team.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs font-medium">
              {(count ?? 0).toLocaleString()} opportunities
            </Badge>
            <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs font-medium">
              Page {page} of {totalPages}
            </Badge>
            {activeFilterCount > 0 && (
              <Badge className="rounded-full px-3 py-1 text-xs font-medium">
                {activeFilterCount} active filter{activeFilterCount === 1 ? "" : "s"}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <TendersFilters />

      <div className="overflow-hidden rounded-[28px] border border-border/60 bg-background/80 shadow-sm">
        <TendersTable
          tenders={tenders ?? []}
          totalCount={count ?? 0}
          currentPage={page}
          totalPages={totalPages}
        />
      </div>
    </div>
  );
}
