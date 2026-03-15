-- Add the owner role before any later migration references it.
-- PostgreSQL requires the enum change to commit before the new value is used.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typnamespace = 'public'::regnamespace
      AND t.typname = 'user_role'
      AND e.enumlabel = 'owner'
  ) THEN
    ALTER TYPE public.user_role ADD VALUE 'owner';
  END IF;
END $$;
