-- ========================================================
-- FlatSync -> GroupSync Migration
-- Run this in your Supabase SQL Editor to enable:
-- 1. Multiple groups per user (Flat, Family, Friends, Colleagues, Trips)
-- 2. Group type & icons
-- 3. 'for_user' column on items
-- ========================================================

-- 1. Add group_type and icon to flats table
ALTER TABLE flats ADD COLUMN IF NOT EXISTS group_type TEXT DEFAULT 'flat';
ALTER TABLE flats ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT '🏠';

-- 2. Add for_user column to items table
ALTER TABLE items ADD COLUMN IF NOT EXISTS for_user TEXT;

-- 3. Create group_members junction table
CREATE TABLE IF NOT EXISTS group_members (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id   UUID NOT NULL REFERENCES flats(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role       TEXT DEFAULT 'member',
  joined_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- 4. Backfill existing members from profiles table into group_members
INSERT INTO group_members (group_id, user_id, role)
SELECT flat_id, id, 'admin'
FROM profiles
WHERE flat_id IS NOT NULL
ON CONFLICT (group_id, user_id) DO NOTHING;

-- 5. Enable RLS on group_members
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members can view group_members" ON group_members;
CREATE POLICY "members can view group_members"
  ON group_members FOR SELECT
  USING (
    user_id = auth.uid() OR
    group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
  );

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

-- 6. Update Items RLS to support group_members
DROP POLICY IF EXISTS "group members can view items" ON items;
CREATE POLICY "group members can view items"
  ON items FOR SELECT
  USING (
    flat_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid()) OR
    flat_id = (SELECT flat_id FROM profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "group members can add items" ON items;
CREATE POLICY "group members can add items"
  ON items FOR INSERT
  WITH CHECK (
    flat_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid()) OR
    flat_id = (SELECT flat_id FROM profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "group members can update items" ON items;
CREATE POLICY "group members can update items"
  ON items FOR UPDATE
  USING (
    flat_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid()) OR
    flat_id = (SELECT flat_id FROM profiles WHERE id = auth.uid())
  );

-- 7. Performance indexes
CREATE INDEX IF NOT EXISTS idx_group_members_user  ON group_members (user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members (group_id);
