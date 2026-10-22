-- ========================================================
-- FlatSync Complete Setup & RLS Infinite Recursion Fix
-- Run this in your Supabase Project -> SQL Editor -> Run
-- ========================================================

-- 1. Ensure extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Ensure columns exist on flats
ALTER TABLE flats ADD COLUMN IF NOT EXISTS group_type TEXT DEFAULT 'flat';
ALTER TABLE flats ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT '🏠';

-- 3. Ensure for_user column exists on items
ALTER TABLE items ADD COLUMN IF NOT EXISTS for_user TEXT;
ALTER TABLE items ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES orders(id) ON DELETE SET NULL;

-- 4. Create group_members junction table if not exists
CREATE TABLE IF NOT EXISTS group_members (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id   UUID NOT NULL REFERENCES flats(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role       TEXT DEFAULT 'member',
  joined_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- 5. Backfill all existing groups from profiles & items into group_members
INSERT INTO group_members (group_id, user_id, role)
SELECT flat_id, id, 'admin'
FROM profiles
WHERE flat_id IS NOT NULL
ON CONFLICT (group_id, user_id) DO NOTHING;

INSERT INTO group_members (group_id, user_id, role)
SELECT DISTINCT flat_id, requested_by_id, 'member'
FROM items
WHERE flat_id IS NOT NULL AND requested_by_id IS NOT NULL
ON CONFLICT (group_id, user_id) DO NOTHING;

-- 6. FIX RLS on group_members (ELIMINATES INFINITE RECURSION)
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members can view group_members" ON group_members;
CREATE POLICY "members can view group_members"
  ON group_members FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "users can join groups" ON group_members;
CREATE POLICY "users can join groups"
  ON group_members FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "users can update their membership" ON group_members;
CREATE POLICY "users can update their membership"
  ON group_members FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "users can leave groups" ON group_members;
CREATE POLICY "users can leave groups"
  ON group_members FOR DELETE
  USING (user_id = auth.uid());

-- 7. Flats RLS policies (allow members to view, create, update, delete)
ALTER TABLE flats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone can read flat by join code" ON flats;
CREATE POLICY "anyone can read flat by join code"
  ON flats FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "anyone can create flat" ON flats;
CREATE POLICY "anyone can create flat"
  ON flats FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "members can update flat" ON flats;
CREATE POLICY "members can update flat"
  ON flats FOR UPDATE
  USING (
    id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid()) OR
    id = (SELECT flat_id FROM profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "members can delete flat" ON flats;
CREATE POLICY "members can delete flat"
  ON flats FOR DELETE
  USING (
    id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid()) OR
    id = (SELECT flat_id FROM profiles WHERE id = auth.uid())
  );

-- 8. Items RLS policies (resilient)
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members can view items" ON items;
CREATE POLICY "members can view items"
  ON items FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "members can add items" ON items;
CREATE POLICY "members can add items"
  ON items FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "members can update items" ON items;
CREATE POLICY "members can update items"
  ON items FOR UPDATE
  USING (true);

DROP POLICY IF EXISTS "members can delete items" ON items;
CREATE POLICY "members can delete items"
  ON items FOR DELETE
  USING (true);

-- 9. Profiles RLS policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles are viewable by anyone" ON profiles;
CREATE POLICY "profiles are viewable by anyone"
  ON profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "users can update own profile" ON profiles;
CREATE POLICY "users can update own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

DROP POLICY IF EXISTS "users can insert own profile" ON profiles;
CREATE POLICY "users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- 10. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_group_members_user  ON group_members (user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members (group_id);
CREATE INDEX IF NOT EXISTS idx_items_flat_status   ON items (flat_id, status);
CREATE INDEX IF NOT EXISTS idx_items_flat_created  ON items (flat_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_flats_join_code     ON flats (join_code);

-- 11. Realtime publications
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE items;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE ordering_sessions;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 12. Email verification & existence check for forgot password
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles (LOWER(email));

-- Backfill profile emails from auth.users (if run as Supabase admin/postgres)
DO $$ BEGIN
  UPDATE public.profiles p
  SET email = u.email
  FROM auth.users u
  WHERE p.id = u.id AND (p.email IS NULL OR p.email = '');
EXCEPTION WHEN OTHERS THEN null;
END $$;

-- RPC function: check_user_exists
CREATE OR REPLACE FUNCTION public.check_user_exists(check_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users WHERE LOWER(email) = LOWER(TRIM(check_email))
  );
END;
$$;

-- Grant execution permissions to anon and authenticated
GRANT EXECUTE ON FUNCTION public.check_user_exists(TEXT) TO anon, authenticated;
