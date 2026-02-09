-- Fix Supabase Security Linter Errors
-- 1. Change SECURITY DEFINER views to SECURITY INVOKER
-- 2. Enable RLS on plan_limits table

-- ============================================
-- FIX 1: Recreate views with SECURITY INVOKER
-- ============================================

-- Drop and recreate tenant_stats view
DROP VIEW IF EXISTS public.tenant_stats;

CREATE VIEW public.tenant_stats
WITH (security_invoker = true)
AS
SELECT 
  t.id as tenant_id,
  t.name as tenant_name,
  t.plan,
  COALESCE(tender_counts.total, 0) as tender_count,
  COALESCE(tender_counts.new_24h, 0) as new_tenders_24h,
  COALESCE(source_counts.total, 0) as source_count,
  COALESCE(subscriber_counts.total, 0) as subscriber_count,
  pl.max_sources,
  pl.max_subscribers
FROM tenants t
LEFT JOIN plan_limits pl ON t.plan = pl.plan
LEFT JOIN (
  SELECT tenant_id, 
         COUNT(*) as total,
         COUNT(*) FILTER (WHERE first_seen > NOW() - INTERVAL '24 hours') as new_24h
  FROM tenders 
  WHERE expired = false
  GROUP BY tenant_id
) tender_counts ON t.id = tender_counts.tenant_id
LEFT JOIN (
  SELECT tenant_id, COUNT(*) as total
  FROM sources 
  WHERE enabled = true
  GROUP BY tenant_id
) source_counts ON t.id = source_counts.tenant_id
LEFT JOIN (
  SELECT tenant_id, COUNT(*) as total
  FROM subscriptions 
  WHERE is_active = true
  GROUP BY tenant_id
) subscriber_counts ON t.id = subscriber_counts.tenant_id;

-- Grant access
GRANT SELECT ON public.tenant_stats TO authenticated;

-- Drop tenant_crawl_stats view (crawl_runs table doesn't exist)
DROP VIEW IF EXISTS public.tenant_crawl_stats;

-- Drop and recreate active_tenders view
DROP VIEW IF EXISTS public.active_tenders;

CREATE VIEW public.active_tenders
WITH (security_invoker = true)
AS
SELECT 
  t.id,
  t.tenant_id,
  t.source_id,
  t.title,
  t.url,
  t.category,
  t.priority,
  t.closing_at,
  t.days_remaining,
  t.summary,
  t.content_hash,
  t.raw_content,
  t.first_seen,
  t.last_seen,
  t.expired,
  t.notified,
  t.metadata,
  t.created_at,
  t.updated_at,
  t.reference_number,
  t.description,
  t.issuer,
  t.source_url,
  t.published_date,
  t.estimated_value,
  t.location,
  t.contact_email,
  t.contact_phone,
  s.name as source_name,
  s.url as source_website_url
FROM tenders t
LEFT JOIN sources s ON t.source_id = s.id
WHERE t.expired = false
ORDER BY t.first_seen DESC;

-- Grant access
GRANT SELECT ON public.active_tenders TO authenticated;

-- ============================================
-- FIX 2: Enable RLS on plan_limits table
-- ============================================

-- Enable RLS
ALTER TABLE public.plan_limits ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Anyone can read plan limits" ON public.plan_limits;
DROP POLICY IF EXISTS "Service role can manage plan limits" ON public.plan_limits;

-- Allow everyone to read plan_limits (it's public reference data)
CREATE POLICY "Anyone can read plan limits"
  ON public.plan_limits
  FOR SELECT
  USING (true);

-- Only service role can modify plan_limits
CREATE POLICY "Service role can manage plan limits"
  ON public.plan_limits
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Grant read access to authenticated users
GRANT SELECT ON public.plan_limits TO authenticated;
GRANT SELECT ON public.plan_limits TO anon;
