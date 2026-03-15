-- Introduce tenant memberships as the long-term authorization model.
-- This migration assumes the 'owner' enum value already exists.
-- Keep profiles.tenant_id and profiles.role synchronized for compatibility
-- while the application transitions away from profile-scoped authorization.

CREATE TABLE IF NOT EXISTS public.tenant_memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.user_role NOT NULL DEFAULT 'member',
  is_primary BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT tenant_memberships_user_tenant_key UNIQUE (user_id, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_memberships_tenant_id
  ON public.tenant_memberships(tenant_id);

CREATE INDEX IF NOT EXISTS idx_tenant_memberships_user_id
  ON public.tenant_memberships(user_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_memberships_one_primary_per_user
  ON public.tenant_memberships(user_id)
  WHERE is_primary = true AND is_active = true;

CREATE OR REPLACE FUNCTION public.sync_tenant_membership_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_tenant_membership_updated_at ON public.tenant_memberships;

CREATE TRIGGER sync_tenant_membership_updated_at
  BEFORE UPDATE ON public.tenant_memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_tenant_membership_updated_at();

CREATE OR REPLACE FUNCTION public.sync_profile_from_primary_membership(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  membership_record RECORD;
BEGIN
  SELECT tenant_id, role
  INTO membership_record
  FROM public.tenant_memberships
  WHERE user_id = p_user_id
    AND is_active = true
  ORDER BY is_primary DESC, created_at ASC
  LIMIT 1;

  IF membership_record IS NULL THEN
    UPDATE public.profiles
    SET tenant_id = NULL,
        role = 'member',
        updated_at = NOW()
    WHERE id = p_user_id;
    RETURN;
  END IF;

  UPDATE public.profiles
  SET tenant_id = membership_record.tenant_id,
      role = membership_record.role,
      updated_at = NOW()
  WHERE id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_profile_membership_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.sync_profile_from_primary_membership(COALESCE(NEW.user_id, OLD.user_id));
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS sync_profile_after_membership_change ON public.tenant_memberships;

CREATE TRIGGER sync_profile_after_membership_change
  AFTER INSERT OR UPDATE OR DELETE ON public.tenant_memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.apply_profile_membership_sync();

CREATE OR REPLACE FUNCTION public.prevent_removing_last_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner_count INTEGER;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.role <> 'owner' OR OLD.is_active = false THEN
      RETURN OLD;
    END IF;

    SELECT COUNT(*)
    INTO owner_count
    FROM public.tenant_memberships
    WHERE tenant_id = OLD.tenant_id
      AND is_active = true
      AND role = 'owner'
      AND user_id <> OLD.user_id;

    IF owner_count = 0 THEN
      RAISE EXCEPTION 'Each tenant must retain at least one active owner.';
    END IF;

    RETURN OLD;
  END IF;

  IF OLD.role = 'owner'
     AND OLD.is_active = true
     AND (NEW.role <> 'owner' OR NEW.is_active = false OR NEW.tenant_id <> OLD.tenant_id) THEN
    SELECT COUNT(*)
    INTO owner_count
    FROM public.tenant_memberships
    WHERE tenant_id = OLD.tenant_id
      AND is_active = true
      AND role = 'owner'
      AND user_id <> OLD.user_id;

    IF owner_count = 0 THEN
      RAISE EXCEPTION 'Each tenant must retain at least one active owner.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_removing_last_owner ON public.tenant_memberships;

CREATE TRIGGER prevent_removing_last_owner
  BEFORE UPDATE OR DELETE ON public.tenant_memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_removing_last_owner();

WITH ranked_profiles AS (
  SELECT
    p.id AS user_id,
    p.tenant_id,
    CASE
      WHEN p.role = 'admin'
           AND ROW_NUMBER() OVER (
             PARTITION BY p.tenant_id
             ORDER BY p.created_at ASC, p.id ASC
           ) = 1
        THEN 'owner'::public.user_role
      ELSE p.role
    END AS membership_role,
    COALESCE(p.created_at, NOW()) AS created_at,
    COALESCE(p.updated_at, NOW()) AS updated_at
  FROM public.profiles p
  WHERE p.tenant_id IS NOT NULL
)
INSERT INTO public.tenant_memberships (
  tenant_id,
  user_id,
  role,
  is_primary,
  is_active,
  created_at,
  updated_at
)
SELECT
  tenant_id,
  user_id,
  membership_role,
  true,
  true,
  created_at,
  updated_at
FROM ranked_profiles
ON CONFLICT (user_id, tenant_id) DO UPDATE
SET role = EXCLUDED.role,
    is_primary = EXCLUDED.is_primary,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN COALESCE(
    (
      SELECT tenant_id
      FROM public.tenant_memberships
      WHERE user_id = auth.uid()
        AND is_active = true
      ORDER BY is_primary DESC, created_at ASC
      LIMIT 1
    ),
    (
      SELECT tenant_id
      FROM public.profiles
      WHERE id = auth.uid()
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS public.user_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN COALESCE(
    (
      SELECT role
      FROM public.tenant_memberships
      WHERE user_id = auth.uid()
        AND is_active = true
      ORDER BY is_primary DESC, created_at ASC
      LIMIT 1
    ),
    (
      SELECT role
      FROM public.profiles
      WHERE id = auth.uid()
    ),
    'member'::public.user_role
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.get_user_role() IN ('owner', 'admin');
END;
$$;

CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.get_user_role() = 'owner';
END;
$$;

ALTER TABLE public.tenant_memberships ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'tenant_memberships'
      AND policyname = 'Users can view their own memberships'
  ) THEN
    CREATE POLICY "Users can view their own memberships"
      ON public.tenant_memberships
      FOR SELECT
      USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'tenant_memberships'
      AND policyname = 'Workspace admins can view memberships in their tenant'
  ) THEN
    CREATE POLICY "Workspace admins can view memberships in their tenant"
      ON public.tenant_memberships
      FOR SELECT
      USING (tenant_id = public.get_user_tenant_id() AND public.is_admin());
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_tenant_id UUID;
  invited_tenant_id UUID;
  invite_token TEXT := NULLIF(NEW.raw_user_meta_data->>'invite_token', '');
  assigned_role public.user_role := 'owner';
BEGIN
  IF invite_token IS NOT NULL THEN
    SELECT tenant_id, role
    INTO invited_tenant_id, assigned_role
    FROM public.invites
    WHERE token = invite_token
      AND used = false
      AND (expires_at IS NULL OR expires_at > NOW())
    LIMIT 1;

    IF invited_tenant_id IS NULL THEN
      RAISE EXCEPTION 'Invalid or expired invite token.';
    END IF;

    new_tenant_id := invited_tenant_id;

    UPDATE public.invites
    SET used = true
    WHERE token = invite_token;
  ELSE
    INSERT INTO public.tenants (name, slug, trial_ends_at)
    VALUES (
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
      LOWER(
        REPLACE(
          COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
          ' ',
          '-'
        )
      ) || '-' || substr(NEW.id::text, 1, 8),
      NOW() + INTERVAL '30 days'
    )
    RETURNING id INTO new_tenant_id;
  END IF;

  INSERT INTO public.profiles (id, tenant_id, role, full_name)
  VALUES (
    NEW.id,
    new_tenant_id,
    assigned_role,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO UPDATE
  SET tenant_id = EXCLUDED.tenant_id,
      role = EXCLUDED.role,
      full_name = EXCLUDED.full_name,
      updated_at = NOW();

  INSERT INTO public.tenant_memberships (
    tenant_id,
    user_id,
    role,
    is_primary,
    is_active
  )
  VALUES (
    new_tenant_id,
    NEW.id,
    assigned_role,
    true,
    true
  )
  ON CONFLICT (user_id, tenant_id) DO UPDATE
  SET role = EXCLUDED.role,
      is_primary = true,
      is_active = true,
      updated_at = NOW();

  INSERT INTO public.subscriptions (tenant_id, user_id, email)
  VALUES (new_tenant_id, NEW.id, NEW.email)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

SELECT public.sync_profile_from_primary_membership(user_id)
FROM public.tenant_memberships
GROUP BY user_id;
