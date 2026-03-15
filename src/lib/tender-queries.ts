import "server-only";

import {
  expandTenderCategoryFilter,
  isTenderCategoryFilter,
} from "@/lib/tender-categories";
import type {
  Source,
  Tender,
  TenderDocument,
  TenderPriority,
} from "@/types";

type SupabaseLike = {
  from: (table: string) => {
    select: (columns: string, options?: Record<string, unknown>) => any;
  };
};

export type TenderListItem = Tender & {
  source: Pick<Source, "name" | "url"> | null;
};

export type TenderSummaryItem = Tender & {
  source: Pick<Source, "name"> | null;
};

export type TenderDetailItem = Tender & {
  source: Source | null;
  documents: TenderDocument[];
};

export interface TenderListFilters {
  category?: string;
  priority?: string;
  search?: string;
  expired?: boolean;
  closingSoon?: boolean;
  sourceId?: string;
}

interface TenderListPageOptions extends TenderListFilters {
  tenantId: string;
  page: number;
  pageSize: number;
}

export function buildTenderSearchClause(search: string) {
  const normalized = search.replace(/[,%()]/g, " ").trim().replace(/\s+/g, " ");
  if (!normalized) {
    return null;
  }

  const pattern = `%${normalized.split(" ").join("%")}%`;
  return [
    `title.ilike.${pattern}`,
    `summary.ilike.${pattern}`,
    `metadata->>issuer.ilike.${pattern}`,
    `metadata->>reference_number.ilike.${pattern}`,
  ].join(",");
}

export function applyTenderFilters<TQuery extends Record<string, any>>(
  query: TQuery,
  filters: TenderListFilters
) {
  let nextQuery = query;

  if (filters.category && isTenderCategoryFilter(filters.category)) {
    nextQuery = nextQuery.in("category", expandTenderCategoryFilter(filters.category));
  }

  if (filters.priority) {
    nextQuery = nextQuery.eq("priority", filters.priority);
  }

  if (filters.sourceId) {
    nextQuery = nextQuery.eq("source_id", filters.sourceId);
  }

  if (filters.search) {
    const searchClause = buildTenderSearchClause(filters.search);
    if (searchClause) {
      nextQuery = nextQuery.or(searchClause);
    }
  }

  if (filters.closingSoon) {
    nextQuery = nextQuery.eq("expired", false).gte("days_remaining", 0).lte("days_remaining", 7);
  } else if (filters.expired !== undefined) {
    nextQuery = nextQuery.eq("expired", filters.expired);
  }

  return nextQuery;
}

export async function getTenderListPage(
  supabase: SupabaseLike,
  options: TenderListPageOptions
) {
  const offset = (options.page - 1) * options.pageSize;

  let query = supabase
    .from("tenders")
    .select("*, source:sources(name, url)", { count: "exact" })
    .eq("tenant_id", options.tenantId);

  query = applyTenderFilters(query, options);

  const { data, count, error } = await query
    .order("first_seen", { ascending: false })
    .range(offset, offset + options.pageSize - 1);

  return {
    data: (data ?? []) as TenderListItem[],
    count: count ?? 0,
    error,
  };
}

export async function getRecentTenantTenders(
  supabase: SupabaseLike,
  tenantId: string,
  limit = 5
) {
  const { data, error } = await supabase
    .from("tenders")
    .select("*, source:sources(name)")
    .eq("tenant_id", tenantId)
    .eq("expired", false)
    .order("first_seen", { ascending: false })
    .limit(limit);

  return {
    data: (data ?? []) as TenderSummaryItem[],
    error,
  };
}

export async function getHighPriorityTenantTenders(
  supabase: SupabaseLike,
  tenantId: string,
  limit = 5
) {
  const { data, error } = await supabase
    .from("tenders")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("priority", "high")
    .eq("expired", false)
    .order("closing_at", { ascending: true })
    .limit(limit);

  return {
    data: (data ?? []) as Tender[],
    error,
  };
}

export async function getClosingSoonTenantTenders(
  supabase: SupabaseLike,
  tenantId: string,
  limit = 6
) {
  const { data, error } = await supabase
    .from("tenders")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("expired", false)
    .gte("days_remaining", 0)
    .lte("days_remaining", 7)
    .order("days_remaining", { ascending: true })
    .limit(limit);

  return {
    data: (data ?? []) as Tender[],
    error,
  };
}

export async function getDigestPreviewTenders(
  supabase: SupabaseLike,
  tenantId: string,
  windowStartedAtIso: string,
  limit = 20
) {
  const { data, error } = await supabase
    .from("tenders")
    .select("*, source:sources(name)")
    .eq("tenant_id", tenantId)
    .eq("expired", false)
    .gte("first_seen", windowStartedAtIso)
    .order("priority", { ascending: false })
    .order("closing_at", { ascending: true })
    .limit(limit);

  return {
    data: (data ?? []) as TenderSummaryItem[],
    error,
  };
}

export async function getTenderDetailById(
  supabase: SupabaseLike,
  tenantId: string,
  tenderId: string
) {
  const { data, error } = (await supabase
    .from("tenders")
    .select("*, source:sources(*), documents:tender_documents(*)")
    .eq("tenant_id", tenantId)
    .eq("id", tenderId)
    .maybeSingle()) as {
    data: TenderDetailItem | null;
    error: unknown;
  };

  return { data, error };
}

export function getTenderPriorityRank(priority: TenderPriority | string) {
  if (priority === "high") return 3;
  if (priority === "medium") return 2;
  if (priority === "low") return 1;
  return 0;
}

export function compareTendersForDigestPreview(left: Tender, right: Tender) {
  const priorityDiff = getTenderPriorityRank(right.priority) - getTenderPriorityRank(left.priority);
  if (priorityDiff !== 0) {
    return priorityDiff;
  }

  const leftDeadline = left.closing_at ? new Date(left.closing_at).getTime() : Number.MAX_SAFE_INTEGER;
  const rightDeadline = right.closing_at ? new Date(right.closing_at).getTime() : Number.MAX_SAFE_INTEGER;
  return leftDeadline - rightDeadline;
}
