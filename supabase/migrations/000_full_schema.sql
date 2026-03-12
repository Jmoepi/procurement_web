-- =============================================
-- PROCUREMENT RADAR SA - FULL SCHEMA MIGRATION (FIXED)
-- Supabase/Postgres-safe: no "CREATE POLICY IF NOT EXISTS"
-- =============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- ENUMS
-- =============================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('admin', 'member');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'source_type') THEN
    CREATE TYPE source_type AS ENUM ('portal', 'company');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'crawl_frequency') THEN
    CREATE TYPE crawl_frequency AS ENUM ('daily', 'weekly');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tender_category') THEN
    CREATE TYPE tender_category AS ENUM ('courier', 'printing', 'both', 'other');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tender_priority') THEN
    CREATE TYPE tender_priority AS ENUM ('high', 'medium', 'low');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'doc_type') THEN
    CREATE TYPE doc_type AS ENUM ('html', 'pdf');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'digest_status') THEN
    CREATE TYPE digest_status AS ENUM ('success', 'fail', 'pending');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'plan_type') THEN
    CREATE TYPE plan_type AS ENUM ('starter', 'pro', 'enterprise');
  END IF;
END $$;

-- =============================================
-- TABLES
-- =============================================

-- Tenants (Organizations)
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    plan plan_type DEFAULT 'starter' NOT NULL,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    settings JSONB DEFAULT '{}'::jsonb,
    trial_ends_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true NOT NULL,
    digest_time TIME DEFAULT '08:00:00'::time NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Profiles (linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    role user_role DEFAULT 'member' NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Sources (websites to crawl)
CREATE TABLE IF NOT EXISTS public.sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    type source_type DEFAULT 'portal' NOT NULL,
    enabled BOOLEAN DEFAULT true NOT NULL,
    requires_js BOOLEAN DEFAULT false NOT NULL,
    crawl_frequency crawl_frequency DEFAULT 'daily' NOT NULL,
    tags TEXT[] DEFAULT '{}',
    categories TEXT[] DEFAULT '{}',
    last_crawled_at TIMESTAMPTZ,
    last_crawl_status TEXT,
    crawl_success_rate NUMERIC(5,2) DEFAULT 100.00,
    tenders_found INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(tenant_id, url)
);

CREATE INDEX IF NOT EXISTS idx_sources_tenant_id ON public.sources(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sources_enabled ON public.sources(enabled) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_sources_tenant_enabled ON public.sources(tenant_id, enabled);

-- Tenders
CREATE TABLE IF NOT EXISTS public.tenders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    source_id UUID REFERENCES public.sources(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    category tender_category DEFAULT 'other' NOT NULL,
    priority tender_priority DEFAULT 'medium' NOT NULL,
    closing_at TIMESTAMPTZ,
    days_remaining INTEGER,
    summary TEXT,
    description TEXT,
    reference_number TEXT,
    issuer TEXT,
    source_url TEXT,
    published_date TIMESTAMPTZ,
    estimated_value NUMERIC,
    location TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    content_hash TEXT NOT NULL,
    raw_content TEXT,
    first_seen TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    last_seen TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    expired BOOLEAN DEFAULT false NOT NULL,
    notified BOOLEAN DEFAULT false NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(tenant_id, content_hash)
);

CREATE INDEX IF NOT EXISTS idx_tenders_tenant_id ON public.tenders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenders_source_id ON public.tenders(source_id);
CREATE INDEX IF NOT EXISTS idx_tenders_category ON public.tenders(category);
CREATE INDEX IF NOT EXISTS idx_tenders_priority ON public.tenders(priority);
CREATE INDEX IF NOT EXISTS idx_tenders_expired ON public.tenders(expired) WHERE expired = false;
CREATE INDEX IF NOT EXISTS idx_tenders_closing_at ON public.tenders(closing_at) WHERE closing_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tenders_first_seen ON public.tenders(first_seen);
CREATE INDEX IF NOT EXISTS idx_tenders_content_hash ON public.tenders(content_hash);
CREATE INDEX IF NOT EXISTS idx_tenders_reference_number
  ON public.tenders(tenant_id, reference_number) WHERE reference_number IS NOT NULL;

-- Tender Documents
CREATE TABLE IF NOT EXISTS public.tender_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tender_id UUID NOT NULL REFERENCES public.tenders(id) ON DELETE CASCADE,
    doc_type doc_type NOT NULL,
    filename TEXT,
    storage_path TEXT,
    file_size INTEGER,
    extracted_text TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tender_documents_tender_id ON public.tender_documents(tender_id);

-- Subscriptions (email subscribers)
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    email TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    preferences JSONB DEFAULT '{
        "categories": ["courier", "printing", "both"],
        "highPriorityOnly": false,
        "keywordsInclude": [],
        "keywordsExclude": [],
        "maxItems": 15,
        "digestFrequency": "daily"
    }'::jsonb NOT NULL,
    last_digest_sent_at TIMESTAMPTZ,
    unsubscribe_token UUID DEFAULT uuid_generate_v4() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(tenant_id, email)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant_id ON public.subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_is_active ON public.subscriptions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_subscriptions_unsubscribe_token ON public.subscriptions(unsubscribe_token);

-- Digest Runs
CREATE TABLE IF NOT EXISTS public.digest_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    run_date DATE NOT NULL,
    status digest_status DEFAULT 'pending' NOT NULL,
    tenders_found INTEGER DEFAULT 0,
    emails_sent INTEGER DEFAULT 0,
    started_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    finished_at TIMESTAMPTZ,
    logs TEXT,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_digest_runs_tenant_id ON public.digest_runs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_digest_runs_run_date ON public.digest_runs(run_date);
CREATE INDEX IF NOT EXISTS idx_digest_runs_status ON public.digest_runs(status);

-- Plan limits
CREATE TABLE IF NOT EXISTS public.plan_limits (
    plan plan_type PRIMARY KEY,
    max_sources INTEGER NOT NULL,
    max_subscribers INTEGER NOT NULL,
    max_tenders_per_day INTEGER NOT NULL,
    pdf_extraction BOOLEAN DEFAULT false NOT NULL,
    api_access BOOLEAN DEFAULT false NOT NULL,
    priority_support BOOLEAN DEFAULT false NOT NULL,
    custom_branding BOOLEAN DEFAULT false NOT NULL,
    webhook_notifications BOOLEAN DEFAULT false NOT NULL
);

INSERT INTO public.plan_limits
(plan, max_sources, max_subscribers, max_tenders_per_day, pdf_extraction, api_access, priority_support, custom_branding, webhook_notifications)
VALUES
('starter', 30, 1, 100, false, false, false, false, false),
('pro', 150, 20, 1000, true, true, false, false, true),
('enterprise', 999999, 999999, 999999, true, true, true, true, true)
ON CONFLICT (plan) DO UPDATE SET
  max_sources = EXCLUDED.max_sources,
  max_subscribers = EXCLUDED.max_subscribers,
  max_tenders_per_day = EXCLUDED.max_tenders_per_day,
  pdf_extraction = EXCLUDED.pdf_extraction,
  api_access = EXCLUDED.api_access,
  priority_support = EXCLUDED.priority_support,
  custom_branding = EXCLUDED.custom_branding,
  webhook_notifications = EXCLUDED.webhook_notifications;

-- =============================================
-- INVITES (for role-based onboarding)
-- =============================================

CREATE TABLE IF NOT EXISTS public.invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token TEXT UNIQUE NOT NULL,
  email TEXT,
  role user_role DEFAULT 'member' NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  used BOOLEAN DEFAULT false NOT NULL,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_invites_token ON public.invites(token);

-- Ensure invites are scoped to a tenant (added after table creation for existing installs)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invites' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE public.invites ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_invites_tenant_id ON public.invites(tenant_id);

-- Audit columns for invites (revocation tracking)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invites' AND column_name = 'revoked_by'
  ) THEN
    ALTER TABLE public.invites ADD COLUMN revoked_by UUID REFERENCES auth.users(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invites' AND column_name = 'revoked_at'
  ) THEN
    ALTER TABLE public.invites ADD COLUMN revoked_at TIMESTAMPTZ;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_invites_revoked_by ON public.invites(revoked_by);

-- Email OTPs for signup verification
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'email_otps'
  ) THEN
    CREATE TABLE public.email_otps (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      email TEXT NOT NULL,
      code TEXT NOT NULL,
      code_hash TEXT,
      used BOOLEAN DEFAULT false NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_email_otps_email ON public.email_otps(email);

-- =============================================
-- FUNCTIONS (ORDER FIXED)
-- =============================================

-- updated_at helper
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Helper: get current user's tenant_id
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT tenant_id
    FROM public.profiles
    WHERE id = auth.uid()
  );
END;
$$;

-- Helper: is current user admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT role = 'admin'
    FROM public.profiles
    WHERE id = auth.uid()
  );
END;
$$;

-- Trial helpers
CREATE OR REPLACE FUNCTION public.is_trial_active()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT trial_ends_at > NOW()
    FROM public.tenants
    WHERE id = public.get_user_tenant_id()
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_trial_days_remaining()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT GREATEST(0, EXTRACT(DAY FROM (trial_ends_at - NOW()))::INTEGER)
    FROM public.tenants
    WHERE id = public.get_user_tenant_id()
  );
END;
$$;

-- Plan limit checks
CREATE OR REPLACE FUNCTION public.check_source_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  current_count INTEGER;
  max_allowed INTEGER;
BEGIN
  SELECT COUNT(*) INTO current_count
  FROM public.sources
  WHERE tenant_id = NEW.tenant_id;

  SELECT pl.max_sources INTO max_allowed
  FROM public.tenants t
  JOIN public.plan_limits pl ON pl.plan = t.plan
  WHERE t.id = NEW.tenant_id;

  IF current_count >= max_allowed THEN
    RAISE EXCEPTION 'Source limit reached for your plan. Please upgrade.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_subscriber_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  current_count INTEGER;
  max_allowed INTEGER;
BEGIN
  SELECT COUNT(*) INTO current_count
  FROM public.subscriptions
  WHERE tenant_id = NEW.tenant_id AND is_active = true;

  SELECT pl.max_subscribers INTO max_allowed
  FROM public.tenants t
  JOIN public.plan_limits pl ON pl.plan = t.plan
  WHERE t.id = NEW.tenant_id;

  IF current_count >= max_allowed THEN
    RAISE EXCEPTION 'Subscriber limit reached for your plan. Please upgrade.';
  END IF;

  RETURN NEW;
END;
$$;

-- Optional utility (not used by triggers here, but kept)
CREATE OR REPLACE FUNCTION public.compute_days_remaining(closing_date TIMESTAMPTZ)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF closing_date IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN EXTRACT(DAY FROM (closing_date - NOW()))::INTEGER;
END;
$$;

-- New user signup handler (creates tenant + profile + subscription)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_tenant_id UUID;
  requested_role TEXT := COALESCE(NEW.raw_user_meta_data->>'role', 'member');
  invite_token TEXT := NULLIF(NEW.raw_user_meta_data->>'invite_token', '');
  assign_role TEXT := 'member';
  tenant_count INTEGER;
BEGIN
  -- First user bootstrap: first tenant created becomes admin
  SELECT COUNT(*) INTO tenant_count FROM public.tenants;

  IF tenant_count = 0 THEN
    assign_role := 'admin';
  ELSIF invite_token IS NOT NULL THEN
    -- Validate invite token and take role from invite if valid
    SELECT role INTO assign_role
    FROM public.invites
    WHERE token = invite_token
      AND used = false
      AND (expires_at IS NULL OR expires_at > NOW())
    LIMIT 1;

    IF NOT FOUND THEN
      assign_role := 'member';
    ELSE
      -- Mark invite as used
      UPDATE public.invites SET used = true WHERE token = invite_token;
    END IF;
  ELSE
    -- No invite: default to member (even if client requested admin)
    assign_role := 'member';
  END IF;

  INSERT INTO public.tenants (name, slug, trial_ends_at)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    LOWER(REPLACE(COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)), ' ', '-'))
      || '-' || substr(NEW.id::text, 1, 8),
    NOW() + INTERVAL '30 days'
  )
  RETURNING id INTO new_tenant_id;

  INSERT INTO public.profiles (id, tenant_id, role, full_name)
  VALUES (
    NEW.id,
    new_tenant_id,
    assign_role::user_role,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );

  INSERT INTO public.subscriptions (tenant_id, user_id, email)
  VALUES (new_tenant_id, NEW.id, NEW.email);

  RETURN NEW;
END;
$$;

-- Seed demo sources
CREATE OR REPLACE FUNCTION public.seed_demo_sources(p_tenant_id UUID)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.sources (tenant_id, name, url, type, enabled, tags) VALUES
    (p_tenant_id, 'eTender Portal (National Treasury)', 'https://www.etenders.gov.za', 'portal', true, ARRAY['government', 'national']),
    (p_tenant_id, 'CSD Supplier Database', 'https://secure.csd.gov.za/Tenders', 'portal', true, ARRAY['government', 'csd']),
    (p_tenant_id, 'Gauteng Provincial Treasury', 'https://www.treasury.gpg.gov.za/Pages/Tenders.aspx', 'portal', true, ARRAY['government', 'gauteng']),
    (p_tenant_id, 'Western Cape Government', 'https://www.westerncape.gov.za/tenders', 'portal', true, ARRAY['government', 'western-cape']),
    (p_tenant_id, 'KwaZulu-Natal Treasury', 'https://www.kzntreasury.gov.za/tenders', 'portal', true, ARRAY['government', 'kzn']),
    (p_tenant_id, 'Eastern Cape Treasury', 'https://www.ectreasury.gov.za/tenders', 'portal', true, ARRAY['government', 'eastern-cape']),
    (p_tenant_id, 'Limpopo Treasury', 'https://www.limtreasury.gov.za/tenders', 'portal', true, ARRAY['government', 'limpopo']),
    (p_tenant_id, 'Mpumalanga Treasury', 'https://www.mpumalanga.gov.za/tenders', 'portal', true, ARRAY['government', 'mpumalanga']),
    (p_tenant_id, 'Free State Treasury', 'https://www.fstreasury.gov.za/tenders', 'portal', true, ARRAY['government', 'free-state']),
    (p_tenant_id, 'Northern Cape Treasury', 'https://www.northern-cape.gov.za/tenders', 'portal', true, ARRAY['government', 'northern-cape']),
    (p_tenant_id, 'North West Treasury', 'https://www.nwpg.gov.za/tenders', 'portal', true, ARRAY['government', 'north-west']),

    (p_tenant_id, 'City of Johannesburg', 'https://www.joburg.org.za/work_/tenders', 'portal', true, ARRAY['municipality', 'johannesburg']),
    (p_tenant_id, 'City of Cape Town', 'https://www.capetown.gov.za/Work%20and%20business/Tenders-and-supplier-management', 'portal', true, ARRAY['municipality', 'cape-town']),
    (p_tenant_id, 'eThekwini Municipality (Durban)', 'https://www.durban.gov.za/pages/services/tenders', 'portal', true, ARRAY['municipality', 'durban']),
    (p_tenant_id, 'City of Tshwane (Pretoria)', 'https://www.tshwane.gov.za/sites/business/tenders', 'portal', true, ARRAY['municipality', 'pretoria']),
    (p_tenant_id, 'Nelson Mandela Bay', 'https://www.nelsonmandelabay.gov.za/tenders', 'portal', true, ARRAY['municipality', 'port-elizabeth']),
    (p_tenant_id, 'Ekurhuleni Metropolitan', 'https://www.ekurhuleni.gov.za/tenders', 'portal', true, ARRAY['municipality', 'ekurhuleni']),
    (p_tenant_id, 'Buffalo City Metro', 'https://www.buffalocity.gov.za/tenders', 'portal', true, ARRAY['municipality', 'east-london']),
    (p_tenant_id, 'Mangaung Metropolitan', 'https://www.mangaung.co.za/tenders', 'portal', true, ARRAY['municipality', 'bloemfontein']),

    (p_tenant_id, 'Transnet', 'https://www.transnet.net/BusinessWithUs/TenderBulletin', 'company', true, ARRAY['soe', 'logistics']),
    (p_tenant_id, 'Eskom', 'https://www.eskom.co.za/suppliers/tenders', 'company', true, ARRAY['soe', 'energy']),
    (p_tenant_id, 'PRASA', 'https://www.prasa.com/Tenders.html', 'company', true, ARRAY['soe', 'transport']),
    (p_tenant_id, 'SANRAL', 'https://www.sanral.co.za/tenders', 'company', true, ARRAY['soe', 'roads']),
    (p_tenant_id, 'South African Post Office', 'https://www.postoffice.co.za/tenders', 'company', true, ARRAY['soe', 'courier', 'postal']),
    (p_tenant_id, 'ACSA (Airports Company)', 'https://www.airports.co.za/suppliers/tenders', 'company', true, ARRAY['soe', 'airports']),
    (p_tenant_id, 'Rand Water', 'https://www.randwater.co.za/tenders', 'company', true, ARRAY['soe', 'water']),
    (p_tenant_id, 'Umgeni Water', 'https://www.umgeni.co.za/tenders', 'company', true, ARRAY['soe', 'water']),

    (p_tenant_id, 'University of Cape Town', 'https://www.uct.ac.za/main/explore-uct/procurement/tenders', 'company', true, ARRAY['university', 'education']),
    (p_tenant_id, 'University of Pretoria', 'https://www.up.ac.za/procurement/tenders', 'company', true, ARRAY['university', 'education']),
    (p_tenant_id, 'Wits University', 'https://www.wits.ac.za/finance/procurement/tenders', 'company', true, ARRAY['university', 'education']),
    (p_tenant_id, 'Stellenbosch University', 'https://www.sun.ac.za/english/finance/procurement/tenders', 'company', true, ARRAY['university', 'education']),
    (p_tenant_id, 'University of KwaZulu-Natal', 'https://scm.ukzn.ac.za/tenders', 'company', true, ARRAY['university', 'education']),
    (p_tenant_id, 'University of Johannesburg', 'https://www.uj.ac.za/about/procurement/tenders', 'company', true, ARRAY['university', 'education']),

    (p_tenant_id, 'TenderInfo SA', 'https://www.tenderinfo.co.za', 'portal', true, ARRAY['aggregator']),
    (p_tenant_id, 'SA Tenders', 'https://www.satenders.co.za', 'portal', true, ARRAY['aggregator']),
    (p_tenant_id, 'Government Tenders', 'https://www.govtenders.co.za', 'portal', true, ARRAY['aggregator'])

  ON CONFLICT (tenant_id, url) DO UPDATE SET
    name = EXCLUDED.name,
    enabled = EXCLUDED.enabled,
    tags = EXCLUDED.tags,
    updated_at = NOW();
END;
$$;

GRANT EXECUTE ON FUNCTION public.seed_demo_sources(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.seed_demo_sources(UUID) TO service_role;

-- =============================================
-- TRIGGERS
-- =============================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_tenants_updated_at') THEN
    CREATE TRIGGER update_tenants_updated_at
      BEFORE UPDATE ON public.tenants
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_profiles_updated_at') THEN
    CREATE TRIGGER update_profiles_updated_at
      BEFORE UPDATE ON public.profiles
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_sources_updated_at') THEN
    CREATE TRIGGER update_sources_updated_at
      BEFORE UPDATE ON public.sources
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_tenders_updated_at') THEN
    CREATE TRIGGER update_tenders_updated_at
      BEFORE UPDATE ON public.tenders
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_subscriptions_updated_at') THEN
    CREATE TRIGGER update_subscriptions_updated_at
      BEFORE UPDATE ON public.subscriptions
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'check_source_limit_trigger') THEN
    CREATE TRIGGER check_source_limit_trigger
      BEFORE INSERT ON public.sources
      FOR EACH ROW
      EXECUTE FUNCTION public.check_source_limit();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'check_subscriber_limit_trigger') THEN
    CREATE TRIGGER check_subscriber_limit_trigger
      BEFORE INSERT ON public.subscriptions
      FOR EACH ROW
      EXECUTE FUNCTION public.check_subscriber_limit();
  END IF;
END $$;

-- New user trigger on auth.users
-- NOTE: This may require privileges in some Supabase setups.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- ROW LEVEL SECURITY & POLICIES (FIXED)
-- =============================================

ALTER TABLE IF EXISTS public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tenders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tender_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.digest_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.plan_limits ENABLE ROW LEVEL SECURITY;

-- Create policies safely (no IF NOT EXISTS)
DO $$
BEGIN
  -- tenants
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='tenants' AND policyname='Users can view their own tenant'
  ) THEN
    CREATE POLICY "Users can view their own tenant"
      ON public.tenants FOR SELECT
      USING (id = public.get_user_tenant_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='tenants' AND policyname='Admins can update their tenant'
  ) THEN
    CREATE POLICY "Admins can update their tenant"
      ON public.tenants FOR UPDATE
      USING (id = public.get_user_tenant_id() AND public.is_admin());
  END IF;

  -- profiles
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='Users can view profiles in their tenant'
  ) THEN
    CREATE POLICY "Users can view profiles in their tenant"
      ON public.profiles FOR SELECT
      USING (tenant_id = public.get_user_tenant_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='Users can update their own profile'
  ) THEN
    CREATE POLICY "Users can update their own profile"
      ON public.profiles FOR UPDATE
      USING (id = auth.uid());
  END IF;

  -- sources
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='sources' AND policyname='Users can view sources in their tenant'
  ) THEN
    CREATE POLICY "Users can view sources in their tenant"
      ON public.sources FOR SELECT
      USING (tenant_id = public.get_user_tenant_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='sources' AND policyname='Admins can insert sources'
  ) THEN
    CREATE POLICY "Admins can insert sources"
      ON public.sources FOR INSERT
      WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='sources' AND policyname='Admins can update sources'
  ) THEN
    CREATE POLICY "Admins can update sources"
      ON public.sources FOR UPDATE
      USING (tenant_id = public.get_user_tenant_id() AND public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='sources' AND policyname='Admins can delete sources'
  ) THEN
    CREATE POLICY "Admins can delete sources"
      ON public.sources FOR DELETE
      USING (tenant_id = public.get_user_tenant_id() AND public.is_admin());
  END IF;

  -- tenders
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='tenders' AND policyname='Users can view tenders in their tenant'
  ) THEN
    CREATE POLICY "Users can view tenders in their tenant"
      ON public.tenders FOR SELECT
      USING (tenant_id = public.get_user_tenant_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='tenders' AND policyname='Service role can manage tenders'
  ) THEN
    CREATE POLICY "Service role can manage tenders"
      ON public.tenders FOR ALL
      USING (auth.role() = 'service_role');
  END IF;

  -- tender_documents
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='tender_documents' AND policyname='Users can view tender documents in their tenant'
  ) THEN
    CREATE POLICY "Users can view tender documents in their tenant"
      ON public.tender_documents FOR SELECT
      USING (
        tender_id IN (
          SELECT id FROM public.tenders WHERE tenant_id = public.get_user_tenant_id()
        )
      );
  END IF;

  -- subscriptions
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='subscriptions' AND policyname='Users can view subscriptions in their tenant'
  ) THEN
    CREATE POLICY "Users can view subscriptions in their tenant"
      ON public.subscriptions FOR SELECT
      USING (tenant_id = public.get_user_tenant_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='subscriptions' AND policyname='Users can manage their own subscription'
  ) THEN
    CREATE POLICY "Users can manage their own subscription"
      ON public.subscriptions FOR UPDATE
      USING (user_id = auth.uid() OR (tenant_id = public.get_user_tenant_id() AND public.is_admin()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='subscriptions' AND policyname='Admins can insert subscriptions'
  ) THEN
    CREATE POLICY "Admins can insert subscriptions"
      ON public.subscriptions FOR INSERT
      WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='subscriptions' AND policyname='Admins can delete subscriptions'
  ) THEN
    CREATE POLICY "Admins can delete subscriptions"
      ON public.subscriptions FOR DELETE
      USING (tenant_id = public.get_user_tenant_id() AND public.is_admin());
  END IF;

  -- digest_runs
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='digest_runs' AND policyname='Admins can view digest runs'
  ) THEN
    CREATE POLICY "Admins can view digest runs"
      ON public.digest_runs FOR SELECT
      USING (tenant_id = public.get_user_tenant_id() AND public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='digest_runs' AND policyname='Service role can manage digest runs'
  ) THEN
    CREATE POLICY "Service role can manage digest runs"
      ON public.digest_runs FOR ALL
      USING (auth.role() = 'service_role');
  END IF;

  -- plan_limits
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='plan_limits' AND policyname='Anyone can read plan limits'
  ) THEN
    CREATE POLICY "Anyone can read plan limits"
      ON public.plan_limits FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='plan_limits' AND policyname='Service role can manage plan limits'
  ) THEN
    CREATE POLICY "Service role can manage plan limits"
      ON public.plan_limits FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

GRANT SELECT ON public.plan_limits TO authenticated;
GRANT SELECT ON public.plan_limits TO anon;

-- =============================================
-- VIEWS
-- =============================================

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
  s.name AS source_name,
  s.url AS source_website_url
FROM public.tenders t
LEFT JOIN public.sources s ON t.source_id = s.id
WHERE t.expired = false
ORDER BY t.first_seen DESC;

GRANT SELECT ON public.active_tenders TO authenticated;

DROP VIEW IF EXISTS public.tenant_stats;
CREATE VIEW public.tenant_stats
WITH (security_invoker = true)
AS
SELECT
  t.id AS tenant_id,
  t.name AS tenant_name,
  t.plan,
  COALESCE(tender_counts.total, 0) AS tender_count,
  COALESCE(tender_counts.new_24h, 0) AS new_tenders_24h,
  COALESCE(source_counts.total, 0) AS source_count,
  COALESCE(subscriber_counts.total, 0) AS subscriber_count,
  pl.max_sources,
  pl.max_subscribers
FROM public.tenants t
LEFT JOIN public.plan_limits pl ON t.plan = pl.plan
LEFT JOIN (
  SELECT tenant_id,
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE first_seen > NOW() - INTERVAL '24 hours') AS new_24h
  FROM public.tenders
  WHERE expired = false
  GROUP BY tenant_id
) tender_counts ON t.id = tender_counts.tenant_id
LEFT JOIN (
  SELECT tenant_id, COUNT(*) AS total
  FROM public.sources
  WHERE enabled = true
  GROUP BY tenant_id
) source_counts ON t.id = source_counts.tenant_id
LEFT JOIN (
  SELECT tenant_id, COUNT(*) AS total
  FROM public.subscriptions
  WHERE is_active = true
  GROUP BY tenant_id
) subscriber_counts ON t.id = subscriber_counts.tenant_id;

GRANT SELECT ON public.tenant_stats TO authenticated;

-- =============================================
-- END
-- =============================================
