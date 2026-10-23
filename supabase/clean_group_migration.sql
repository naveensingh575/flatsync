-- ==============================================================================
-- GrocerySync Clean DB Migration: Permanent 'groups' and 'group_id' Architecture
-- (No legacy views, no dual sync triggers, no backward-compatibility shims)
-- Run this in your Supabase Project -> SQL Editor -> Run
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Migrate table 'flats' to 'groups'
DO $$
BEGIN
  -- If 'flats' is a view, drop it cleanly
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'flats') THEN
    DROP VIEW IF EXISTS public.flats CASCADE;
  END IF;

  -- If 'flats' is a physical table and 'groups' does not exist, rename it
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'flats')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'groups') THEN
    ALTER TABLE public.flats RENAME TO groups;
  END IF;
END $$;

-- If 'groups' table doesn't exist, create it cleanly
CREATE TABLE IF NOT EXISTS public.groups (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  join_code  CHAR(6) UNIQUE NOT NULL,
  group_type TEXT DEFAULT 'flat',
  icon       TEXT DEFAULT '🏠',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure required columns exist on groups
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS group_type TEXT DEFAULT 'flat';
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT '🏠';
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- If 'flats' table still exists alongside 'groups', migrate rows and drop 'flats'
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'flats') THEN
    INSERT INTO public.groups (id, name, join_code, group_type, icon, created_by, created_at)
    SELECT id, name, join_code, COALESCE(group_type, 'flat'), COALESCE(icon, '🏠'), created_by, COALESCE(created_at, NOW())
    FROM public.flats
    ON CONFLICT (id) DO NOTHING;

    DROP TABLE public.flats CASCADE;
  END IF;
END $$;

-- 2. Clean 'group_members' table
CREATE TABLE IF NOT EXISTS public.group_members (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id   UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role       TEXT DEFAULT 'member',
  joined_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- 3. Items table: migrate flat_id -> group_id
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE;
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS last_edited_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS for_user TEXT;
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS store_tag TEXT;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'items' AND column_name = 'flat_id') THEN
    UPDATE public.items SET group_id = flat_id WHERE group_id IS NULL AND flat_id IS NOT NULL;
    ALTER TABLE public.items DROP COLUMN flat_id;
  END IF;
END $$;

-- 4. Orders table: migrate flat_id -> group_id
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'flat_id') THEN
    UPDATE public.orders SET group_id = flat_id WHERE group_id IS NULL AND flat_id IS NOT NULL;
    ALTER TABLE public.orders DROP COLUMN flat_id;
  END IF;
END $$;

-- 5. Ordering_sessions table: migrate flat_id -> group_id
ALTER TABLE public.ordering_sessions ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ordering_sessions' AND column_name = 'flat_id') THEN
    UPDATE public.ordering_sessions SET group_id = flat_id WHERE group_id IS NULL AND flat_id IS NOT NULL;
    ALTER TABLE public.ordering_sessions DROP COLUMN flat_id;
  END IF;
END $$;

-- 6. Profiles table: migrate flat_id -> group_id
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'flat_id') THEN
    UPDATE public.profiles SET group_id = flat_id WHERE group_id IS NULL AND flat_id IS NOT NULL;
    ALTER TABLE public.profiles DROP COLUMN flat_id;
  END IF;
END $$;

-- 7. Push_subscriptions table: migrate flat_id -> group_id
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID,
  group_id   UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  endpoint   TEXT NOT NULL UNIQUE,
  p256dh     TEXT NOT NULL,
  auth       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.push_subscriptions ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'push_subscriptions' AND column_name = 'flat_id') THEN
    UPDATE public.push_subscriptions SET group_id = flat_id WHERE group_id IS NULL AND flat_id IS NOT NULL;
    ALTER TABLE public.push_subscriptions DROP COLUMN flat_id;
  END IF;
END $$;

-- 8. Drop legacy triggers and sync functions (no backward compatibility needed)
DROP TRIGGER IF EXISTS trg_items_sync_group_id ON public.items;
DROP TRIGGER IF EXISTS trg_orders_sync_group_id ON public.orders;
DROP TRIGGER IF EXISTS trg_sessions_sync_group_id ON public.ordering_sessions;
DROP TRIGGER IF EXISTS trg_profiles_sync_group_id ON public.profiles;
DROP FUNCTION IF EXISTS public.sync_flat_group_id();

-- 9. Backfill group creators as admin in group_members
INSERT INTO public.group_members (group_id, user_id, role)
SELECT g.id, g.created_by, 'admin'
FROM public.groups g
WHERE g.created_by IS NOT NULL
ON CONFLICT (group_id, user_id)
DO UPDATE SET role = 'admin';

-- 10. Clean RLS Policies on Groups
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone can create group" ON public.groups;
CREATE POLICY "anyone can create group"
  ON public.groups FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "members can view their groups" ON public.groups;
DROP POLICY IF EXISTS "anyone can view groups" ON public.groups;
CREATE POLICY "members can view their groups"
  ON public.groups FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "members can update their groups" ON public.groups;
CREATE POLICY "members can update their groups"
  ON public.groups FOR UPDATE
  USING (
    id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid()) OR
    created_by = auth.uid()
  );

DROP POLICY IF EXISTS "only admins can delete group" ON public.groups;
CREATE POLICY "only admins can delete group"
  ON public.groups FOR DELETE
  USING (
    id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid() AND role = 'admin') OR
    created_by = auth.uid()
  );

-- 11. Clean RLS Policies on Group Members
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members can view group_members" ON public.group_members;
CREATE POLICY "members can view group_members"
  ON public.group_members FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "users can join groups" ON public.group_members;
CREATE POLICY "users can join groups"
  ON public.group_members FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "admins can update group_members" ON public.group_members;
CREATE POLICY "admins can update group_members"
  ON public.group_members FOR UPDATE
  USING (
    user_id = auth.uid() OR
    group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "users can leave groups" ON public.group_members;
CREATE POLICY "users can leave groups"
  ON public.group_members FOR DELETE
  USING (
    user_id = auth.uid() OR
    group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid() AND role = 'admin')
  );

-- 12. Clean RLS on Items
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members can view items" ON public.items;
CREATE POLICY "members can view items"
  ON public.items FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "members can add items" ON public.items;
CREATE POLICY "members can add items"
  ON public.items FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "members can update items" ON public.items;
CREATE POLICY "members can update items"
  ON public.items FOR UPDATE
  USING (true);

DROP POLICY IF EXISTS "members can delete items" ON public.items;
CREATE POLICY "members can delete items"
  ON public.items FOR DELETE
  USING (true);

-- 13. Clean RLS on Ordering Sessions
ALTER TABLE public.ordering_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members can view ordering_sessions" ON public.ordering_sessions;
CREATE POLICY "members can view ordering_sessions"
  ON public.ordering_sessions FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "members can create ordering_sessions" ON public.ordering_sessions;
CREATE POLICY "members can create ordering_sessions"
  ON public.ordering_sessions FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "members can update ordering_sessions" ON public.ordering_sessions;
CREATE POLICY "members can update ordering_sessions"
  ON public.ordering_sessions FOR UPDATE
  USING (true);

-- 14. Clean RLS on Push Subscriptions
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Anyone can insert push subscriptions"
  ON public.push_subscriptions FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can select push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Anyone can select push subscriptions"
  ON public.push_subscriptions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can update push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Anyone can update push subscriptions"
  ON public.push_subscriptions FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Anyone can delete push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Anyone can delete push subscriptions"
  ON public.push_subscriptions FOR DELETE USING (true);

-- 15. Ensure Realtime Publication includes groups, items, and ordering_sessions
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.groups;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.items;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.ordering_sessions;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

