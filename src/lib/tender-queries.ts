import "server-only";

import {
  expandTenderCategoryFilter,
  isTenderCategoryFilter,
} from "@/lib/tender-categories";
import type {
  Database,
  Source,
  Tender,
  TenderDocument,
  TenderPriority,
  Tables,
} from "@/types";
import type { SupabaseClient } from "@supabase/supabase-js";

const TENDER_READ_MODEL_VIEW = "tender_read_model";

type SupabaseLike = {
  from: SupabaseClient<Database>["from"];
}

export type TenderListItem = Omit<Tender, "source"> & {
  source: Pick<Source, "name" | "url"> | null;
};

export type TenderSummaryItem = Omit<Tender, "source"> & {
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
    `issuer.ilike.${pattern}`,
    `reference_number.ilike.${pattern}`,
    `source_name.ilike.${pattern}`,
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
    .from(TENDER_READ_MODEL_VIEW)
    .select("*", { count: "exact" })
    .eq("tenant_id", options.tenantId);

  query = applyTenderFilters(query, options);

  const { data, count, error } = await query
    .order("first_seen", { ascending: false })
    .range(offset, offset + options.pageSize - 1);

  return {
    data: mapTenderListItems(data),
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
    .from(TENDER_READ_MODEL_VIEW)
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("expired", false)
    .order("first_seen", { ascending: false })
    .limit(limit);

  return {
    data: mapTenderSummaryItems(data),
    error,
  };
}

export async function getHighPriorityTenantTenders(
  supabase: SupabaseLike,
  tenantId: string,
  limit = 5
) {
  const { data, error } = await supabase
    .from(TENDER_READ_MODEL_VIEW)
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("priority", "high")
    .eq("expired", false)
    .order("closing_at", { ascending: true })
    .limit(limit);

  return {
    data: mapTenderRows(data),
    error,
  };
}

export async function getClosingSoonTenantTenders(
  supabase: SupabaseLike,
  tenantId: string,
  limit = 6
) {
  const { data, error } = await supabase
    .from(TENDER_READ_MODEL_VIEW)
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("expired", false)
    .gte("days_remaining", 0)
    .lte("days_remaining", 7)
    .order("days_remaining", { ascending: true })
    .limit(limit);

  return {
    data: mapTenderRows(data),
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
    .from(TENDER_READ_MODEL_VIEW)
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("expired", false)
    .gte("first_seen", windowStartedAtIso)
    .order("priority", { ascending: false })
    .order("closing_at", { ascending: true })
    .limit(limit);

  return {
    data: mapTenderSummaryItems(data),
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

export function compareTendersForDigestPreview<
  T extends { priority: TenderPriority | string; closing_at?: string }
>(left: T, right: T) {
  const priorityDiff = getTenderPriorityRank(right.priority) - getTenderPriorityRank(left.priority);
  if (priorityDiff !== 0) {
    return priorityDiff;
  }

  const leftDeadline = left.closing_at ? new Date(left.closing_at).getTime() : Number.MAX_SAFE_INTEGER;
  const rightDeadline = right.closing_at ? new Date(right.closing_at).getTime() : Number.MAX_SAFE_INTEGER;
  return leftDeadline - rightDeadline;
}

function mapTenderRows(rows: unknown) {
  return ((rows as Tables<"tender_read_model">[] | null) ?? [])
    .map(normalizeTenderReadModelRow)
    .filter((row): row is Tender => Boolean(row));
}

function mapTenderListItems(rows: unknown): TenderListItem[] {
  return ((rows as Tables<"tender_read_model">[] | null) ?? [])
    .map((row) => {
      const normalized = normalizeTenderReadModelRow(row);
      if (!normalized) {
        return null;
      }

      return {
        ...normalized,
        source: row.source_name || row.source_website_url
          ? {
              name: row.source_name ?? "Unknown source",
              url: row.source_website_url ?? "",
            }
          : null,
      };
    })
    .filter((row): row is TenderListItem => Boolean(row));
}

function mapTenderSummaryItems(rows: unknown): TenderSummaryItem[] {
  return ((rows as Tables<"tender_read_model">[] | null) ?? []).map(
    (row) => {
      const normalized = normalizeTenderReadModelRow(row);
      if (!normalized) {
        return null;
      }

      return {
        ...normalized,
        source: row.source_name
          ? {
              name: row.source_name,
            }
          : null,
      };
    }
  ).filter((row): row is TenderSummaryItem => Boolean(row));
}

function normalizeTenderReadModelRow(row: Tables<"tender_read_model">): Tender | null {
  if (
    !row.id ||
    !row.tenant_id ||
    !row.title ||
    !row.url ||
    !row.category ||
    !row.priority ||
    !row.content_hash ||
    !row.first_seen ||
    !row.last_seen ||
    row.expired === null ||
    row.notified === null ||
    !row.created_at ||
    !row.updated_at
  ) {
    return null;
  }

  return {
    id: row.id,
    tenant_id: row.tenant_id,
    source_id: row.source_id ?? undefined,
    title: row.title,
    url: row.url,
    category: row.category,
    priority: row.priority,
    closing_at: row.closing_at ?? undefined,
    days_remaining: row.days_remaining ?? undefined,
    summary: row.summary ?? undefined,
    description: row.description ?? undefined,
    reference_number: row.reference_number ?? undefined,
    issuer: row.issuer ?? undefined,
    source_url: row.source_url ?? undefined,
    published_date: row.published_date ?? undefined,
    estimated_value: row.estimated_value ?? undefined,
    location: row.location ?? undefined,
    contact_email: row.contact_email ?? undefined,
    contact_phone: row.contact_phone ?? undefined,
    content_hash: row.content_hash,
    raw_content: row.raw_content ?? undefined,
    first_seen: row.first_seen,
    last_seen: row.last_seen,
    expired: row.expired,
    notified: row.notified,
    metadata: normalizeMetadata(row.metadata),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function normalizeMetadata(value: Database["public"]["Views"]["tender_read_model"]["Row"]["metadata"]) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}
