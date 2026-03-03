-- Fix plan_limits table by ensuring the starter plan has a non-zero source limit.

INSERT INTO public.plan_limits (
  plan,
  max_sources,
  max_subscribers,
  max_tenders_per_day,
  pdf_extraction,
  api_access,
  priority_support,
  custom_branding,
  webhook_notifications
)
VALUES (
  'starter',
  10,
  5,
  50,      -- pick a sensible starter cap
  false,
  false,
  false,
  false,
  false
)
ON CONFLICT (plan)
DO UPDATE SET
  max_sources = GREATEST(public.plan_limits.max_sources, EXCLUDED.max_sources),
  max_subscribers = GREATEST(public.plan_limits.max_subscribers, EXCLUDED.max_subscribers),
  max_tenders_per_day = GREATEST(public.plan_limits.max_tenders_per_day, EXCLUDED.max_tenders_per_day),
  pdf_extraction = public.plan_limits.pdf_extraction OR EXCLUDED.pdf_extraction,
  api_access = public.plan_limits.api_access OR EXCLUDED.api_access,
  priority_support = public.plan_limits.priority_support OR EXCLUDED.priority_support,
  custom_branding = public.plan_limits.custom_branding OR EXCLUDED.custom_branding,
  webhook_notifications = public.plan_limits.webhook_notifications OR EXCLUDED.webhook_notifications;