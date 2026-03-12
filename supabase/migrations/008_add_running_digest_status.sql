DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'digest_status') THEN
    ALTER TYPE digest_status ADD VALUE IF NOT EXISTS 'running';
  END IF;
END $$;
