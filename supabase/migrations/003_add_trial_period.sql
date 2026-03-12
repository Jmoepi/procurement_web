-- =============================================
-- ADD FREE TRIAL SUPPORT
-- Version: 1.0.1
-- =============================================

-- Add trial_ends_at column to tenants table
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

-- Update existing tenants to have a trial period (30 days from now for existing users)
UPDATE tenants 
SET trial_ends_at = NOW() + INTERVAL '30 days'
WHERE trial_ends_at IS NULL;

-- Make trial_ends_at NOT NULL for future inserts
ALTER TABLE tenants 
ALTER COLUMN trial_ends_at SET DEFAULT (NOW() + INTERVAL '30 days');

-- Update the handle_new_user function to set trial period
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_tenant_id UUID;
    invited_tenant_id UUID;
    invite_token TEXT := NULLIF(NEW.raw_user_meta_data->>'invite_token', '');
    assigned_role TEXT := 'admin';
BEGIN
    IF invite_token IS NOT NULL THEN
        SELECT tenant_id, role
        INTO invited_tenant_id, assigned_role
        FROM invites
        WHERE token = invite_token
          AND used = false
          AND (expires_at IS NULL OR expires_at > NOW())
        LIMIT 1;

        IF invited_tenant_id IS NULL THEN
            RAISE EXCEPTION 'Invalid or expired invite token.';
        END IF;

        new_tenant_id := invited_tenant_id;

        UPDATE invites
        SET used = true
        WHERE token = invite_token;
    ELSE
        -- Create a new tenant for self-serve signups with a 30-day free trial
        INSERT INTO tenants (name, slug, trial_ends_at)
        VALUES (
            COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
            LOWER(REPLACE(COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)), ' ', '-')) || '-' || substr(NEW.id::text, 1, 8),
            NOW() + INTERVAL '30 days'
        )
        RETURNING id INTO new_tenant_id;
    END IF;
    
    -- Create profile
    INSERT INTO profiles (id, tenant_id, role, full_name)
    VALUES (
        NEW.id,
        new_tenant_id,
        assigned_role::user_role,
        COALESCE(NEW.raw_user_meta_data->>'full_name', '')
    );
    
    -- Create default subscription for the user
    INSERT INTO subscriptions (tenant_id, user_id, email)
    VALUES (new_tenant_id, NEW.id, NEW.email);
    
    RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Helper function to check if tenant is in trial period
CREATE OR REPLACE FUNCTION is_trial_active()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        SELECT trial_ends_at > NOW()
        FROM tenants 
        WHERE id = get_user_tenant_id()
    );
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Helper function to get days remaining in trial
CREATE OR REPLACE FUNCTION get_trial_days_remaining()
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT GREATEST(0, EXTRACT(DAY FROM (trial_ends_at - NOW()))::INTEGER)
        FROM tenants 
        WHERE id = get_user_tenant_id()
    );
END;
$$ language 'plpgsql' SECURITY DEFINER;
