-- =============================================
-- PROCUREMENT RADAR SA - DATABASE SCHEMA
-- Version: 1.0.0
-- =============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- ENUMS
-- =============================================

CREATE TYPE user_role AS ENUM ('admin', 'member');
CREATE TYPE source_type AS ENUM ('portal', 'company');
CREATE TYPE crawl_frequency AS ENUM ('daily', 'weekly');
CREATE TYPE tender_category AS ENUM ('courier', 'printing', 'both', 'other');
CREATE TYPE tender_priority AS ENUM ('high', 'medium', 'low');
CREATE TYPE doc_type AS ENUM ('html', 'pdf');
CREATE TYPE digest_status AS ENUM ('success', 'fail', 'pending');
CREATE TYPE plan_type AS ENUM ('starter', 'pro', 'enterprise');

-- =============================================
-- TABLES
-- =============================================

-- Tenants (Organizations)
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    plan plan_type DEFAULT 'starter' NOT NULL,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Profiles (linked to auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    role user_role DEFAULT 'member' NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Sources (websites to crawl)
CREATE TABLE sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    type source_type DEFAULT 'portal' NOT NULL,
    enabled BOOLEAN DEFAULT true NOT NULL,
    requires_js BOOLEAN DEFAULT false NOT NULL,
    crawl_frequency crawl_frequency DEFAULT 'daily' NOT NULL,
    tags TEXT[] DEFAULT '{}',
    last_crawled_at TIMESTAMPTZ,
    last_crawl_status TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(tenant_id, url)
);

-- Indexes for sources
CREATE INDEX idx_sources_tenant_id ON sources(tenant_id);
CREATE INDEX idx_sources_enabled ON sources(enabled) WHERE enabled = true;
CREATE INDEX idx_sources_tenant_enabled ON sources(tenant_id, enabled);

-- Tenders
CREATE TABLE tenders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    source_id UUID REFERENCES sources(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    category tender_category DEFAULT 'other' NOT NULL,
    priority tender_priority DEFAULT 'medium' NOT NULL,
    closing_at TIMESTAMPTZ,
    days_remaining INTEGER,
    summary TEXT,
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

-- Indexes for tenders
CREATE INDEX idx_tenders_tenant_id ON tenders(tenant_id);
CREATE INDEX idx_tenders_source_id ON tenders(source_id);
CREATE INDEX idx_tenders_category ON tenders(category);
CREATE INDEX idx_tenders_priority ON tenders(priority);
CREATE INDEX idx_tenders_expired ON tenders(expired) WHERE expired = false;
CREATE INDEX idx_tenders_closing_at ON tenders(closing_at) WHERE closing_at IS NOT NULL;
CREATE INDEX idx_tenders_first_seen ON tenders(first_seen);
CREATE INDEX idx_tenders_content_hash ON tenders(content_hash);

-- Tender Documents
CREATE TABLE tender_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tender_id UUID NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
    doc_type doc_type NOT NULL,
    filename TEXT,
    storage_path TEXT,
    file_size INTEGER,
    extracted_text TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_tender_documents_tender_id ON tender_documents(tender_id);

-- Subscriptions (email subscribers)
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
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

CREATE INDEX idx_subscriptions_tenant_id ON subscriptions(tenant_id);
CREATE INDEX idx_subscriptions_is_active ON subscriptions(is_active) WHERE is_active = true;
CREATE INDEX idx_subscriptions_unsubscribe_token ON subscriptions(unsubscribe_token);

-- Digest Runs (log of email digest executions)
CREATE TABLE digest_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
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

CREATE INDEX idx_digest_runs_tenant_id ON digest_runs(tenant_id);
CREATE INDEX idx_digest_runs_run_date ON digest_runs(run_date);
CREATE INDEX idx_digest_runs_status ON digest_runs(status);

-- =============================================
-- PLAN LIMITS TABLE
-- =============================================

CREATE TABLE plan_limits (
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

-- Insert plan limits
INSERT INTO plan_limits (plan, max_sources, max_subscribers, max_tenders_per_day, pdf_extraction, api_access, priority_support, custom_branding, webhook_notifications) VALUES
    ('starter', 30, 1, 100, false, false, false, false, false),
    ('pro', 150, 20, 1000, true, true, false, false, true),
    ('enterprise', 999999, 999999, 999999, true, true, true, true, true);

-- =============================================
-- FUNCTIONS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to check plan limits for sources
CREATE OR REPLACE FUNCTION check_source_limit()
RETURNS TRIGGER AS $$
DECLARE
    current_count INTEGER;
    max_allowed INTEGER;
BEGIN
    SELECT COUNT(*) INTO current_count
    FROM sources
    WHERE tenant_id = NEW.tenant_id;
    
    SELECT pl.max_sources INTO max_allowed
    FROM tenants t
    JOIN plan_limits pl ON pl.plan = t.plan
    WHERE t.id = NEW.tenant_id;
    
    IF current_count >= max_allowed THEN
        RAISE EXCEPTION 'Source limit reached for your plan. Please upgrade.';
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to check plan limits for subscribers
CREATE OR REPLACE FUNCTION check_subscriber_limit()
RETURNS TRIGGER AS $$
DECLARE
    current_count INTEGER;
    max_allowed INTEGER;
BEGIN
    SELECT COUNT(*) INTO current_count
    FROM subscriptions
    WHERE tenant_id = NEW.tenant_id AND is_active = true;
    
    SELECT pl.max_subscribers INTO max_allowed
    FROM tenants t
    JOIN plan_limits pl ON pl.plan = t.plan
    WHERE t.id = NEW.tenant_id;
    
    IF current_count >= max_allowed THEN
        RAISE EXCEPTION 'Subscriber limit reached for your plan. Please upgrade.';
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to compute days remaining
CREATE OR REPLACE FUNCTION compute_days_remaining(closing_date TIMESTAMPTZ)
RETURNS INTEGER AS $$
BEGIN
    IF closing_date IS NULL THEN
        RETURN NULL;
    END IF;
    RETURN EXTRACT(DAY FROM (closing_date - NOW()))::INTEGER;
END;
$$ language 'plpgsql';

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_tenant_id UUID;
BEGIN
    -- Create a new tenant for the user
    INSERT INTO tenants (name, slug)
    VALUES (
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        LOWER(REPLACE(COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)), ' ', '-')) || '-' || substr(NEW.id::text, 1, 8)
    )
    RETURNING id INTO new_tenant_id;
    
    -- Create profile
    INSERT INTO profiles (id, tenant_id, role, full_name)
    VALUES (
        NEW.id,
        new_tenant_id,
        'admin',
        COALESCE(NEW.raw_user_meta_data->>'full_name', '')
    );
    
    -- Create default subscription for the user
    INSERT INTO subscriptions (tenant_id, user_id, email)
    VALUES (new_tenant_id, NEW.id, NEW.email);
    
    RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- =============================================
-- TRIGGERS
-- =============================================

-- Updated_at triggers
CREATE TRIGGER update_tenants_updated_at
    BEFORE UPDATE ON tenants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sources_updated_at
    BEFORE UPDATE ON sources
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenders_updated_at
    BEFORE UPDATE ON tenders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Plan limit triggers
CREATE TRIGGER check_source_limit_trigger
    BEFORE INSERT ON sources
    FOR EACH ROW
    EXECUTE FUNCTION check_source_limit();

CREATE TRIGGER check_subscriber_limit_trigger
    BEFORE INSERT ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION check_subscriber_limit();

-- New user trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

-- Enable RLS on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenders ENABLE ROW LEVEL SECURITY;
ALTER TABLE tender_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE digest_runs ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's tenant_id
CREATE OR REPLACE FUNCTION get_user_tenant_id()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT tenant_id 
        FROM profiles 
        WHERE id = auth.uid()
    );
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        SELECT role = 'admin'
        FROM profiles 
        WHERE id = auth.uid()
    );
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Tenants policies
CREATE POLICY "Users can view their own tenant"
    ON tenants FOR SELECT
    USING (id = get_user_tenant_id());

CREATE POLICY "Admins can update their tenant"
    ON tenants FOR UPDATE
    USING (id = get_user_tenant_id() AND is_admin());

-- Profiles policies
CREATE POLICY "Users can view profiles in their tenant"
    ON profiles FOR SELECT
    USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can update their own profile"
    ON profiles FOR UPDATE
    USING (id = auth.uid());

-- Sources policies
CREATE POLICY "Users can view sources in their tenant"
    ON sources FOR SELECT
    USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Admins can insert sources"
    ON sources FOR INSERT
    WITH CHECK (tenant_id = get_user_tenant_id() AND is_admin());

CREATE POLICY "Admins can update sources"
    ON sources FOR UPDATE
    USING (tenant_id = get_user_tenant_id() AND is_admin());

CREATE POLICY "Admins can delete sources"
    ON sources FOR DELETE
    USING (tenant_id = get_user_tenant_id() AND is_admin());

-- Tenders policies
CREATE POLICY "Users can view tenders in their tenant"
    ON tenders FOR SELECT
    USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Service role can manage tenders"
    ON tenders FOR ALL
    USING (auth.role() = 'service_role');

-- Tender documents policies
CREATE POLICY "Users can view tender documents in their tenant"
    ON tender_documents FOR SELECT
    USING (
        tender_id IN (
            SELECT id FROM tenders WHERE tenant_id = get_user_tenant_id()
        )
    );

-- Subscriptions policies
CREATE POLICY "Users can view subscriptions in their tenant"
    ON subscriptions FOR SELECT
    USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can manage their own subscription"
    ON subscriptions FOR UPDATE
    USING (user_id = auth.uid() OR (tenant_id = get_user_tenant_id() AND is_admin()));

CREATE POLICY "Admins can insert subscriptions"
    ON subscriptions FOR INSERT
    WITH CHECK (tenant_id = get_user_tenant_id() AND is_admin());

CREATE POLICY "Admins can delete subscriptions"
    ON subscriptions FOR DELETE
    USING (tenant_id = get_user_tenant_id() AND is_admin());

-- Digest runs policies
CREATE POLICY "Admins can view digest runs"
    ON digest_runs FOR SELECT
    USING (tenant_id = get_user_tenant_id() AND is_admin());

CREATE POLICY "Service role can manage digest runs"
    ON digest_runs FOR ALL
    USING (auth.role() = 'service_role');

-- =============================================
-- VIEWS
-- =============================================

-- View for active tenders with computed fields
CREATE OR REPLACE VIEW active_tenders AS
SELECT 
    t.*,
    s.name as source_name,
    s.url as source_url,
    compute_days_remaining(t.closing_at) as computed_days_remaining
FROM tenders t
LEFT JOIN sources s ON s.id = t.source_id
WHERE t.expired = false;

-- View for tenant statistics
CREATE OR REPLACE VIEW tenant_stats AS
SELECT 
    t.id as tenant_id,
    t.name as tenant_name,
    t.plan,
    COUNT(DISTINCT s.id) as source_count,
    COUNT(DISTINCT sub.id) as subscriber_count,
    COUNT(DISTINCT tn.id) as tender_count,
    COUNT(DISTINCT CASE WHEN tn.first_seen > NOW() - INTERVAL '24 hours' THEN tn.id END) as new_tenders_24h,
    pl.max_sources,
    pl.max_subscribers
FROM tenants t
LEFT JOIN sources s ON s.tenant_id = t.id AND s.enabled = true
LEFT JOIN subscriptions sub ON sub.tenant_id = t.id AND sub.is_active = true
LEFT JOIN tenders tn ON tn.tenant_id = t.id AND tn.expired = false
LEFT JOIN plan_limits pl ON pl.plan = t.plan
GROUP BY t.id, t.name, t.plan, pl.max_sources, pl.max_subscribers;
