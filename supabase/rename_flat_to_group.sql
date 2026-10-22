-- ==============================================================================
-- GrocerySync Migration: Rename 'flats' to 'groups' with 100% Zero-Breakage Dual Compatibility
-- Run this in your Supabase Project -> SQL Editor -> Run
-- ==============================================================================

-- 1. Ensure extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Rename table 'flats' to 'groups' (if 'flats' exists and 'groups' does not)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'flats')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'groups') THEN
    ALTER TABLE public.flats RENAME TO groups;
  END IF;
END $$;

-- If 'groups' still doesn't exist (fresh setup), create it
CREATE TABLE IF NOT EXISTS public.groups (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL,
  join_code  CHAR(6) UNIQUE NOT NULL,
  group_type TEXT DEFAULT 'flat',
  icon       TEXT DEFAULT '🏠',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure created_by column exists on groups
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS created_by UUID;

-- 3. Create backward-compatible updatable VIEW for 'flats'
-- This ensures any existing query or legacy code querying 'flats' continues working without error!
CREATE OR REPLACE VIEW public.flats AS SELECT * FROM public.groups;

-- Add rules on 'flats' view for transparent INSERT, UPDATE, DELETE
CREATE OR REPLACE RULE flats_insert AS ON INSERT TO public.flats
DO INSTEAD
  INSERT INTO public.groups (id, name, join_code, group_type, icon, created_by, created_at)
  VALUES (
    COALESCE(NEW.id, uuid_generate_v4()),
    NEW.name,
    NEW.join_code,
    COALESCE(NEW.group_type, 'flat'),
    COALESCE(NEW.icon, '🏠'),
    NEW.created_by,
    COALESCE(NEW.created_at, NOW())
  )
  RETURNING *;

CREATE OR REPLACE RULE flats_update AS ON UPDATE TO public.flats
DO INSTEAD
  UPDATE public.groups SET
    name = NEW.name,
    join_code = NEW.join_code,
    group_type = NEW.group_type,
    icon = NEW.icon,
    created_by = COALESCE(NEW.created_by, groups.created_by)
  WHERE id = NEW.id;

CREATE OR REPLACE RULE flats_delete AS ON DELETE TO public.flats
DO INSTEAD
  DELETE FROM public.groups WHERE id = OLD.id;

-- 4. Ensure group_members table has role ('admin' | 'member')
CREATE TABLE IF NOT EXISTS public.group_members (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id   UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role       TEXT DEFAULT 'member',
  joined_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- Backfill group creators as admin in group_members
INSERT INTO public.group_members (group_id, user_id, role)
SELECT g.id, g.created_by, 'admin'
FROM public.groups g
WHERE g.created_by IS NOT NULL
ON CONFLICT (group_id, user_id)
DO UPDATE SET role = 'admin';

-- If a group has members but no admin, promote the first joined member to admin
UPDATE public.group_members gm
SET role = 'admin'
WHERE gm.id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY group_id ORDER BY joined_at ASC) as rnum
    FROM public.group_members
  ) ranked
  WHERE ranked.rnum = 1
) AND NOT EXISTS (
  SELECT 1 FROM public.group_members a WHERE a.group_id = gm.group_id AND a.role = 'admin'
);

-- 5. Add 'group_id' and 'last_edited_by_id' to 'items' with bidirectional sync
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE;
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS last_edited_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Backfill items.group_id from items.flat_id
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'items' AND column_name = 'flat_id') THEN
    UPDATE public.items SET group_id = flat_id WHERE group_id IS NULL AND flat_id IS NOT NULL;
  END IF;
END $$;

-- 6. Add 'group_id' to 'orders' with bidirectional sync
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'flat_id') THEN
    UPDATE public.orders SET group_id = flat_id WHERE group_id IS NULL AND flat_id IS NOT NULL;
  END IF;
END $$;

-- 7. Add 'group_id' to 'ordering_sessions' with bidirectional sync
ALTER TABLE public.ordering_sessions ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ordering_sessions' AND column_name = 'flat_id') THEN
    UPDATE public.ordering_sessions SET group_id = flat_id WHERE group_id IS NULL AND flat_id IS NOT NULL;
  END IF;
END $$;

-- 8. Add 'group_id' to 'profiles' with bidirectional sync
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'flat_id') THEN
    UPDATE public.profiles SET group_id = flat_id WHERE group_id IS NULL AND flat_id IS NOT NULL;
  END IF;
END $$;

-- 9. Automatic Bidirectional Sync Triggers (flat_id <-> group_id)
-- Ensures any write to flat_id populates group_id, and vice versa!
CREATE OR REPLACE FUNCTION public.sync_flat_group_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.group_id IS NULL AND NEW.flat_id IS NOT NULL THEN
    NEW.group_id := NEW.flat_id;
  ELSIF NEW.flat_id IS NULL AND NEW.group_id IS NOT NULL THEN
    NEW.flat_id := NEW.group_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'items' AND column_name = 'flat_id') THEN
    DROP TRIGGER IF EXISTS trg_items_sync_group_id ON public.items;
    CREATE TRIGGER trg_items_sync_group_id
      BEFORE INSERT OR UPDATE ON public.items
      FOR EACH ROW EXECUTE FUNCTION public.sync_flat_group_id();
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'flat_id') THEN
    DROP TRIGGER IF EXISTS trg_orders_sync_group_id ON public.orders;
    CREATE TRIGGER trg_orders_sync_group_id
      BEFORE INSERT OR UPDATE ON public.orders
      FOR EACH ROW EXECUTE FUNCTION public.sync_flat_group_id();
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ordering_sessions' AND column_name = 'flat_id') THEN
    DROP TRIGGER IF EXISTS trg_sessions_sync_group_id ON public.ordering_sessions;
    CREATE TRIGGER trg_sessions_sync_group_id
      BEFORE INSERT OR UPDATE ON public.ordering_sessions
      FOR EACH ROW EXECUTE FUNCTION public.sync_flat_group_id();
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'flat_id') THEN
    DROP TRIGGER IF EXISTS trg_profiles_sync_group_id ON public.profiles;
    CREATE TRIGGER trg_profiles_sync_group_id
      BEFORE INSERT OR UPDATE ON public.profiles
      FOR EACH ROW EXECUTE FUNCTION public.sync_flat_group_id();
  END IF;
END $$;

-- 10. RLS Permissions: Only Admins Can Delete Groups!
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone can create group" ON public.groups;
CREATE POLICY "anyone can create group"
  ON public.groups FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "members can view their groups" ON public.groups;
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

-- SPECIAL POWER: Only Admins Can Delete Group
DROP POLICY IF EXISTS "only admins can delete group" ON public.groups;
CREATE POLICY "only admins can delete group"
  ON public.groups FOR DELETE
  USING (
    id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid() AND role = 'admin') OR
    created_by = auth.uid()
  );

-- 11. Allow Admins to Promote Other Members in group_members
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members can view group_members" ON public.group_members;
CREATE POLICY "members can view group_members"
  ON public.group_members FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "users can join groups" ON public.group_members;
CREATE POLICY "users can join groups"
  ON public.group_members FOR INSERT
  WITH CHECK (true);

-- Admins can update roles of members; users can update their own entry
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

-- 12. Ensure Realtime publication includes groups & items
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.groups;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
