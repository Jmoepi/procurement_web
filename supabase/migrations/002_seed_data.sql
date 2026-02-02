-- =============================================
-- SEED DATA FOR PROCUREMENT RADAR SA
-- =============================================

-- Note: This file should be run after the initial schema migration
-- and after a tenant has been created (e.g., via user signup)

-- For demo purposes, we'll create a demo tenant and sources
-- In production, tenants are created automatically on user signup

-- Insert demo tenant (only for testing - in prod, use auth signup)
-- INSERT INTO tenants (id, name, slug, plan) VALUES
--     ('00000000-0000-0000-0000-000000000001', 'Demo Organization', 'demo-org', 'pro');

-- Function to seed sources for a tenant
CREATE OR REPLACE FUNCTION seed_demo_sources(p_tenant_id UUID)
RETURNS void AS $$
BEGIN
    INSERT INTO sources (tenant_id, name, url, type, enabled, tags) VALUES
    -- Government Portals
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
    
    -- Municipalities - Major Cities
    (p_tenant_id, 'City of Johannesburg', 'https://www.joburg.org.za/work_/tenders', 'portal', true, ARRAY['municipality', 'johannesburg']),
    (p_tenant_id, 'City of Cape Town', 'https://www.capetown.gov.za/Work%20and%20business/Tenders-and-supplier-management', 'portal', true, ARRAY['municipality', 'cape-town']),
    (p_tenant_id, 'eThekwini Municipality (Durban)', 'https://www.durban.gov.za/pages/services/tenders', 'portal', true, ARRAY['municipality', 'durban']),
    (p_tenant_id, 'City of Tshwane (Pretoria)', 'https://www.tshwane.gov.za/sites/business/tenders', 'portal', true, ARRAY['municipality', 'pretoria']),
    (p_tenant_id, 'Nelson Mandela Bay', 'https://www.nelsonmandelabay.gov.za/tenders', 'portal', true, ARRAY['municipality', 'port-elizabeth']),
    (p_tenant_id, 'Ekurhuleni Metropolitan', 'https://www.ekurhuleni.gov.za/tenders', 'portal', true, ARRAY['municipality', 'ekurhuleni']),
    (p_tenant_id, 'Buffalo City Metro', 'https://www.buffalocity.gov.za/tenders', 'portal', true, ARRAY['municipality', 'east-london']),
    (p_tenant_id, 'Mangaung Metropolitan', 'https://www.mangaung.co.za/tenders', 'portal', true, ARRAY['municipality', 'bloemfontein']),
    
    -- State Owned Enterprises
    (p_tenant_id, 'Transnet', 'https://www.transnet.net/BusinessWithUs/TenderBulletin', 'company', true, ARRAY['soe', 'logistics']),
    (p_tenant_id, 'Eskom', 'https://www.eskom.co.za/suppliers/tenders', 'company', true, ARRAY['soe', 'energy']),
    (p_tenant_id, 'PRASA', 'https://www.prasa.com/Tenders.html', 'company', true, ARRAY['soe', 'transport']),
    (p_tenant_id, 'SANRAL', 'https://www.sanral.co.za/tenders', 'company', true, ARRAY['soe', 'roads']),
    (p_tenant_id, 'South African Post Office', 'https://www.postoffice.co.za/tenders', 'company', true, ARRAY['soe', 'courier', 'postal']),
    (p_tenant_id, 'ACSA (Airports Company)', 'https://www.airports.co.za/suppliers/tenders', 'company', true, ARRAY['soe', 'airports']),
    (p_tenant_id, 'Rand Water', 'https://www.randwater.co.za/tenders', 'company', true, ARRAY['soe', 'water']),
    (p_tenant_id, 'Umgeni Water', 'https://www.umgeni.co.za/tenders', 'company', true, ARRAY['soe', 'water']),
    
    -- Universities
    (p_tenant_id, 'University of Cape Town', 'https://www.uct.ac.za/main/explore-uct/procurement/tenders', 'company', true, ARRAY['university', 'education']),
    (p_tenant_id, 'University of Pretoria', 'https://www.up.ac.za/procurement/tenders', 'company', true, ARRAY['university', 'education']),
    (p_tenant_id, 'Wits University', 'https://www.wits.ac.za/finance/procurement/tenders', 'company', true, ARRAY['university', 'education']),
    (p_tenant_id, 'Stellenbosch University', 'https://www.sun.ac.za/english/finance/procurement/tenders', 'company', true, ARRAY['university', 'education']),
    (p_tenant_id, 'University of KwaZulu-Natal', 'https://scm.ukzn.ac.za/tenders', 'company', true, ARRAY['university', 'education']),
    (p_tenant_id, 'University of Johannesburg', 'https://www.uj.ac.za/about/procurement/tenders', 'company', true, ARRAY['university', 'education']),
    
    -- Tender Aggregators
    (p_tenant_id, 'TenderInfo SA', 'https://www.tenderinfo.co.za', 'portal', true, ARRAY['aggregator']),
    (p_tenant_id, 'SA Tenders', 'https://www.satenders.co.za', 'portal', true, ARRAY['aggregator']),
    (p_tenant_id, 'Government Tenders', 'https://www.govtenders.co.za', 'portal', true, ARRAY['aggregator'])
    
    ON CONFLICT (tenant_id, url) DO UPDATE SET
        name = EXCLUDED.name,
        enabled = EXCLUDED.enabled,
        tags = EXCLUDED.tags,
        updated_at = NOW();
END;
$$ language 'plpgsql';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION seed_demo_sources(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION seed_demo_sources(UUID) TO service_role;
