-- Canonical tender read model for application list and summary queries.
-- This keeps UI reads stable even as crawler storage fields evolve.

DROP VIEW IF EXISTS public.tender_read_model;

CREATE VIEW public.tender_read_model
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
  COALESCE(NULLIF(t.summary, ''), NULLIF(t.description, '')) AS summary,
  t.content_hash,
  t.raw_content,
  t.first_seen,
  t.last_seen,
  t.expired,
  t.notified,
  COALESCE(NULLIF(t.reference_number, ''), NULLIF(t.metadata->>'reference_number', '')) AS reference_number,
  COALESCE(NULLIF(t.description, ''), NULLIF(t.summary, '')) AS description,
  COALESCE(NULLIF(t.issuer, ''), NULLIF(t.metadata->>'issuer', '')) AS issuer,
  COALESCE(NULLIF(t.source_url, ''), NULLIF(t.metadata->>'source_url', ''), t.url) AS source_url,
  t.published_date,
  t.estimated_value,
  COALESCE(NULLIF(t.location, ''), NULLIF(t.metadata->>'location', '')) AS location,
  COALESCE(NULLIF(t.contact_email, ''), NULLIF(t.metadata->>'contact_email', '')) AS contact_email,
  COALESCE(NULLIF(t.contact_phone, ''), NULLIF(t.metadata->>'contact_phone', '')) AS contact_phone,
  t.metadata,
  t.created_at,
  t.updated_at,
  s.name AS source_name,
  s.url AS source_website_url
FROM public.tenders t
LEFT JOIN public.sources s ON t.source_id = s.id;

GRANT SELECT ON public.tender_read_model TO authenticated;
