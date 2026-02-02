import { createClient } from "@/lib/supabase/server";
import { TendersTable } from "@/components/tenders/tenders-table";
import { TendersFilters } from "@/components/tenders/tenders-filters";
import type { Tender } from "@/types";

interface TendersPageProps {
  searchParams: Promise<{
    category?: string;
    priority?: string;
    search?: string;
    expired?: string;
    page?: string;
  }>;
}

export default async function TendersPage({ searchParams }: TendersPageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user?.id ?? "")
    .single();

  // Build query with filters
  let query = supabase
    .from("tenders")
    .select("*, source:sources(name, url)", { count: "exact" })
    .eq("tenant_id", profile?.tenant_id ?? "")
    .order("first_seen", { ascending: false });

  // Apply filters
  if (params.category && params.category !== "all") {
    query = query.eq("category", params.category);
  }
  if (params.priority && params.priority !== "all") {
    query = query.eq("priority", params.priority);
  }
  if (params.expired !== "true") {
    query = query.eq("expired", false);
  }
  if (params.search) {
    query = query.ilike("title", `%${params.search}%`);
  }

  // Pagination
  const page = parseInt(params.page ?? "1");
  const pageSize = 20;
  const offset = (page - 1) * pageSize;
  query = query.range(offset, offset + pageSize - 1);

  const { data: tenders, count } = await query as { 
    data: (Tender & { source: { name: string; url: string } | null })[] | null; 
    count: number | null;
  };

  const totalPages = Math.ceil((count ?? 0) / pageSize);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tenders</h1>
        <p className="text-muted-foreground">
          Browse and filter all tender opportunities
        </p>
      </div>

      {/* Filters */}
      <TendersFilters />

      {/* Results */}
      <div className="rounded-lg border">
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
