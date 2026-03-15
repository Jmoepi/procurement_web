-- Make self-serve signups tenant admins by default.
-- Invited signups still inherit the role from the invite.

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
  assigned_role TEXT := 'admin';
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
    assigned_role::user_role,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );

  INSERT INTO public.subscriptions (tenant_id, user_id, email)
  VALUES (new_tenant_id, NEW.id, NEW.email);

  RETURN NEW;
END;
$$;
