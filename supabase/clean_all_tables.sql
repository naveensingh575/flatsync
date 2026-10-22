-- ==============================================================================
-- GrocerySync: Clean All Tables
-- Run this in your Supabase Project -> SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. Disable triggers temporarily if needed
SET session_replication_role = 'replica';

-- 2. Clean all application transaction tables
TRUNCATE TABLE 
  public.items,
  public.orders,
  public.ordering_sessions,
  public.settlements,
  public.group_members
CASCADE;

-- 3. Clean feedback table if exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'feedback') THEN
    EXECUTE 'TRUNCATE TABLE public.feedback CASCADE;';
  END IF;
END $$;

-- 4. Clean groups / flats table
DO $$
BEGIN
  -- If 'groups' is a base table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'groups' AND table_type = 'BASE TABLE') THEN
    EXECUTE 'TRUNCATE TABLE public.groups CASCADE;';
  END IF;
  
  -- If 'flats' is a base table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'flats' AND table_type = 'BASE TABLE') THEN
    EXECUTE 'TRUNCATE TABLE public.flats CASCADE;';
  END IF;
END $$;

-- 5. Reset group associations on profiles (users keep their accounts, but start fresh)
UPDATE public.profiles SET flat_id = NULL;

-- 6. Re-enable triggers
SET session_replication_role = 'origin';

-- OPTIONAL: If you ALSO want to delete all user accounts and profiles completely:
-- Uncomment the two lines below:
-- TRUNCATE TABLE public.profiles CASCADE;
-- DELETE FROM auth.users;
