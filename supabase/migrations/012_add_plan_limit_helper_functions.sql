-- Compatibility helpers for source/subscriber plan limit triggers.
-- Some live database triggers reference these helpers even though older repo
-- migrations only defined the inline trigger functions.

CREATE OR REPLACE FUNCTION public.get_source_limit_for_tenant(p_tenant_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(pl.max_sources, 0)
  FROM public.tenants t
  JOIN public.plan_limits pl ON pl.plan = t.plan
  WHERE t.id = p_tenant_id
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_subscriber_limit_for_tenant(p_tenant_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(pl.max_subscribers, 0)
  FROM public.tenants t
  JOIN public.plan_limits pl ON pl.plan = t.plan
  WHERE t.id = p_tenant_id
  LIMIT 1;
$$;
