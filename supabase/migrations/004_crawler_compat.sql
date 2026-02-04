-- =============================================
-- CRAWLER COMPATIBILITY MIGRATION
-- Add missing columns needed by the Python crawler
-- =============================================

-- Add digest_time and is_active to tenants
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true NOT NULL,
ADD COLUMN IF NOT EXISTS digest_time TIME DEFAULT '08:00:00'::time NOT NULL;

-- Add crawl_success_rate and tenders_found to sources (for crawler stats)
ALTER TABLE sources 
ADD COLUMN IF NOT EXISTS crawl_success_rate NUMERIC(5,2) DEFAULT 100.00,
ADD COLUMN IF NOT EXISTS tenders_found INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS categories TEXT[] DEFAULT '{}';

-- Add reference_number, description, issuer, and other fields to tenders
ALTER TABLE tenders
ADD COLUMN IF NOT EXISTS reference_number TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS issuer TEXT,
ADD COLUMN IF NOT EXISTS source_url TEXT,
ADD COLUMN IF NOT EXISTS published_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS estimated_value NUMERIC,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS contact_email TEXT,
ADD COLUMN IF NOT EXISTS contact_phone TEXT;

-- Create unique index on reference number for deduplication
CREATE INDEX IF NOT EXISTS idx_tenders_reference_number 
ON tenders(tenant_id, reference_number) 
WHERE reference_number IS NOT NULL;

-- Update existing sources to have default categories
UPDATE sources SET categories = tags WHERE categories IS NULL OR categories = '{}';

-- Create a view for tenant stats that the crawler can use
CREATE OR REPLACE VIEW tenant_crawl_stats AS
SELECT 
    t.id as tenant_id,
    t.name as tenant_name,
    t.plan,
    COUNT(DISTINCT s.id) as source_count,
    COUNT(DISTINCT sub.id) as subscriber_count,
    COUNT(DISTINCT td.id) as tender_count
FROM tenants t
LEFT JOIN sources s ON s.tenant_id = t.id
LEFT JOIN subscriptions sub ON sub.tenant_id = t.id
LEFT JOIN tenders td ON td.tenant_id = t.id
WHERE t.is_active = true
GROUP BY t.id, t.name, t.plan;
