// Database types for Procurement Radar SA

export type UserRole = 'admin' | 'member';
export type SourceType = 'portal' | 'company';
export type CrawlFrequency = 'daily' | 'weekly';
export type TenderCategory =
  | 'courier'
  | 'printing'
  | 'logistics'
  | 'stationery'
  | 'it_hardware'
  | 'general';
export type TenderCategoryFilter = TenderCategory | 'both' | 'other';
export type TenderPriority = 'high' | 'medium' | 'low';
export type DocType = 'html' | 'pdf';
export type DigestStatus = 'success' | 'fail' | 'pending' | 'running' | 'completed' | 'failed';
export type PlanType = 'starter' | 'pro' | 'enterprise';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: PlanType;
  trial_ends_at: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  tenant_id: string;
  role: UserRole;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
  tenant?: Tenant;
}

export interface Source {
  id: string;
  tenant_id: string;
  name: string;
  url: string;
  type: SourceType;
  enabled: boolean;
  requires_js: boolean;
  crawl_frequency: CrawlFrequency;
  tags: string[];
  last_crawled_at?: string;
  last_crawl_status?: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Tender {
  id: string;
  tenant_id: string;
  source_id?: string;
  title: string;
  url: string;
  category: TenderCategory;
  priority: TenderPriority;
  closing_at?: string;
  days_remaining?: number;
  summary?: string;
  description?: string;
  reference_number?: string;
  issuer?: string;
  source_url?: string;
  published_date?: string;
  estimated_value?: number;
  location?: string;
  contact_email?: string;
  contact_phone?: string;
  content_hash: string;
  raw_content?: string;
  first_seen: string;
  last_seen: string;
  expired: boolean;
  notified: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  source?: Source;
}

export interface TenderDocument {
  id: string;
  tender_id: string;
  doc_type: DocType;
  filename?: string;
  storage_path?: string;
  file_size?: number;
  extracted_text?: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface SubscriptionPreferences {
  categories: TenderCategory[];
  highPriorityOnly: boolean;
  keywordsInclude: string[];
  keywordsExclude: string[];
  maxItems: number;
  digestFrequency: 'daily' | 'weekly';
}

export interface Subscription {
  id: string;
  tenant_id: string;
  user_id?: string;
  email: string;
  is_active: boolean;
  preferences: SubscriptionPreferences;
  last_digest_sent_at?: string;
  unsubscribe_token: string;
  created_at: string;
  updated_at: string;
}

export interface DigestRun {
  id: string;
  tenant_id: string;
  run_date: string;
  status: DigestStatus;
  tenders_found: number;
  emails_sent: number;
  started_at: string;
  finished_at?: string;
  logs?: string;
  error_message?: string;
  metadata: Record<string, unknown> & {
    recipient_count?: number;
  };
  created_at: string;
  tender_count?: number;
  recipient_count?: number;
  sent_at?: string;
  tenders_included?: string[];
}

export interface PlanLimits {
  plan: PlanType;
  max_sources: number;
  max_subscribers: number;
  max_tenders_per_day: number;
  pdf_extraction: boolean;
  api_access: boolean;
  priority_support: boolean;
  custom_branding: boolean;
  webhook_notifications: boolean;
}

export interface TenantStats {
  tenant_id: string;
  tenant_name: string;
  plan: PlanType;
  source_count: number;
  subscriber_count: number;
  tender_count: number;
  new_tenders_24h: number;
  max_sources: number;
  max_subscribers: number;
}

// API response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Filter types
export interface TenderFilters {
  category?: TenderCategoryFilter;
  priority?: TenderPriority;
  expired?: boolean;
  sourceId?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface SourceFilters {
  type?: SourceType;
  enabled?: boolean;
  search?: string;
}
