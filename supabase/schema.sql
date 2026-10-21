-- FlatSync / GroupSync — Supabase PostgreSQL Schema
-- Run this in the Supabase SQL Editor

-- ─────────────────────────────────────────
-- EXTENSION
-- ─────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE item_category AS ENUM (
    'dairy', 'veggies', 'fruits', 'snacks',
    'beverages', 'essentials', 'personal_care', 'other'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE item_status AS ENUM (
    'pending',
    'in_cart',
    'purchased'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE platform AS ENUM (
    'blinkit', 'zepto', 'instamart', 'other'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ─────────────────────────────────────────
-- TABLE: flats (Groups)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS flats (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL,
  join_code  CHAR(6) UNIQUE NOT NULL,
  group_type TEXT DEFAULT 'flat',
  icon       TEXT DEFAULT '🏠',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- TABLE: profiles (extends auth.users)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  avatar_url TEXT,
  flat_id    UUID REFERENCES flats(id) ON DELETE SET NULL,
  joined_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', 'Member'))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─────────────────────────────────────────
-- TABLE: group_members (Multi-group support)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS group_members (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id   UUID NOT NULL REFERENCES flats(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role       TEXT DEFAULT 'member',
  joined_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- ─────────────────────────────────────────
-- TABLE: ordering_sessions
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ordering_sessions (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  flat_id    UUID NOT NULL REFERENCES flats(id) ON DELETE CASCADE,
  buyer_id   UUID NOT NULL REFERENCES profiles(id),
  platform   platform NOT NULL,
  is_active  BOOLEAN DEFAULT TRUE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at   TIMESTAMPTZ
);

-- ─────────────────────────────────────────
-- TABLE: orders
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  flat_id        UUID NOT NULL REFERENCES flats(id) ON DELETE CASCADE,
  buyer_id       UUID NOT NULL REFERENCES profiles(id),
  session_id     UUID REFERENCES ordering_sessions(id),
  platform       platform NOT NULL,
  total_amount   NUMERIC(10, 2),
  screenshot_url TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- TABLE: items
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS items (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  flat_id          UUID NOT NULL REFERENCES flats(id) ON DELETE CASCADE,
  requested_by_id  UUID NOT NULL REFERENCES profiles(id),
  for_user         TEXT,
  item_name        TEXT NOT NULL,
  category         item_category DEFAULT 'other',
  is_urgent        BOOLEAN DEFAULT FALSE,
  quantity         TEXT,
  note             TEXT,
  status           item_status DEFAULT 'pending',
  ordered_by_id    UUID REFERENCES profiles(id),
  order_id         UUID REFERENCES orders(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- TABLE: settlements
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settlements (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  flat_id     UUID NOT NULL REFERENCES flats(id),
  ower_id     UUID NOT NULL REFERENCES profiles(id),
  owed_to_id  UUID NOT NULL REFERENCES profiles(id),
  amount      NUMERIC(10, 2) NOT NULL,
  is_settled  BOOLEAN DEFAULT FALSE,
  settled_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────
ALTER TABLE flats             ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members     ENABLE ROW LEVEL SECURITY;
ALTER TABLE items             ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordering_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders            ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlements       ENABLE ROW LEVEL SECURITY;

-- Flats
DROP POLICY IF EXISTS "anyone can read flat by join code" ON flats;
CREATE POLICY "anyone can read flat by join code" ON flats FOR SELECT USING (true);

DROP POLICY IF EXISTS "anyone can create flat" ON flats;
CREATE POLICY "anyone can create flat" ON flats FOR INSERT WITH CHECK (true);

-- Profiles
DROP POLICY IF EXISTS "profiles are viewable by anyone" ON profiles;
CREATE POLICY "profiles are viewable by anyone" ON profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "users can update own profile" ON profiles;
CREATE POLICY "users can update own profile" ON profiles FOR UPDATE USING (id = auth.uid());

DROP POLICY IF EXISTS "users can insert own profile" ON profiles;
CREATE POLICY "users can insert own profile" ON profiles FOR INSERT WITH CHECK (id = auth.uid());

-- Group Members
DROP POLICY IF EXISTS "members can view group_members" ON group_members;
CREATE POLICY "members can view group_members" ON group_members FOR SELECT
  USING (
    user_id = auth.uid() OR
    group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "users can join groups" ON group_members;
CREATE POLICY "users can join groups" ON group_members FOR INSERT WITH CHECK (user_id = auth.uid());

-- Items
DROP POLICY IF EXISTS "members can view items" ON items;
CREATE POLICY "members can view items" ON items FOR SELECT
  USING (
    flat_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid()) OR
    flat_id = (SELECT flat_id FROM profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "members can add items" ON items;
CREATE POLICY "members can add items" ON items FOR INSERT
  WITH CHECK (
    flat_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid()) OR
    flat_id = (SELECT flat_id FROM profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "members can update items" ON items;
CREATE POLICY "members can update items" ON items FOR UPDATE
  USING (
    flat_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid()) OR
    flat_id = (SELECT flat_id FROM profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "members can delete items" ON items;
CREATE POLICY "members can delete items" ON items FOR DELETE
  USING (
    flat_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid()) OR
    flat_id = (SELECT flat_id FROM profiles WHERE id = auth.uid())
  );

-- Ordering Sessions
DROP POLICY IF EXISTS "group members can view sessions" ON ordering_sessions;
CREATE POLICY "group members can view sessions" ON ordering_sessions FOR SELECT
  USING (
    flat_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid()) OR
    flat_id = (SELECT flat_id FROM profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "group members can create sessions" ON ordering_sessions;
CREATE POLICY "group members can create sessions" ON ordering_sessions FOR INSERT
  WITH CHECK (buyer_id = auth.uid());

DROP POLICY IF EXISTS "buyer can update their session" ON ordering_sessions;
CREATE POLICY "buyer can update their session" ON ordering_sessions FOR UPDATE
  USING (buyer_id = auth.uid());

-- Orders
DROP POLICY IF EXISTS "group members can view orders" ON orders;
CREATE POLICY "group members can view orders" ON orders FOR SELECT
  USING (
    flat_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid()) OR
    flat_id = (SELECT flat_id FROM profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "group members can create orders" ON orders;
CREATE POLICY "group members can create orders" ON orders FOR INSERT
  WITH CHECK (buyer_id = auth.uid());

-- Settlements
DROP POLICY IF EXISTS "group members can view settlements" ON settlements;
CREATE POLICY "group members can view settlements" ON settlements FOR SELECT
  USING (
    flat_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid()) OR
    flat_id = (SELECT flat_id FROM profiles WHERE id = auth.uid())
  );

-- ─────────────────────────────────────────
-- REALTIME
-- ─────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE items;
ALTER PUBLICATION supabase_realtime ADD TABLE ordering_sessions;

-- ─────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_group_members_user  ON group_members (user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members (group_id);
CREATE INDEX IF NOT EXISTS idx_items_flat_status   ON items (flat_id, status);
CREATE INDEX IF NOT EXISTS idx_items_flat_created  ON items (flat_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_flat       ON ordering_sessions (flat_id, is_active);
CREATE INDEX IF NOT EXISTS idx_orders_flat         ON orders (flat_id, created_at DESC);
