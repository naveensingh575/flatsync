-- FlatSync — Supabase PostgreSQL Schema
-- Run this in the Supabase SQL Editor

-- ─────────────────────────────────────────
-- EXTENSION
-- ─────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────
CREATE TYPE item_category AS ENUM (
  'dairy', 'veggies', 'fruits', 'snacks',
  'beverages', 'essentials', 'personal_care', 'other'
);

CREATE TYPE item_status AS ENUM (
  'pending',
  'in_cart',
  'purchased'
);

CREATE TYPE platform AS ENUM (
  'blinkit', 'zepto', 'instamart', 'other'
);

-- ─────────────────────────────────────────
-- TABLE: flats
-- ─────────────────────────────────────────
CREATE TABLE flats (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL,
  join_code  CHAR(6) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- TABLE: profiles (extends auth.users)
-- ─────────────────────────────────────────
CREATE TABLE profiles (
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
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', 'Flatmate'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─────────────────────────────────────────
-- TABLE: items
-- ─────────────────────────────────────────
CREATE TABLE items (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  flat_id          UUID NOT NULL REFERENCES flats(id) ON DELETE CASCADE,
  requested_by_id  UUID NOT NULL REFERENCES profiles(id),
  item_name        TEXT NOT NULL,
  category         item_category DEFAULT 'other',
  is_urgent        BOOLEAN DEFAULT FALSE,
  quantity         TEXT,
  note             TEXT,
  status           item_status DEFAULT 'pending',
  ordered_by_id    UUID REFERENCES profiles(id),
  order_id         UUID,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- TABLE: ordering_sessions
-- ─────────────────────────────────────────
CREATE TABLE ordering_sessions (
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
CREATE TABLE orders (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  flat_id        UUID NOT NULL REFERENCES flats(id) ON DELETE CASCADE,
  buyer_id       UUID NOT NULL REFERENCES profiles(id),
  session_id     UUID REFERENCES ordering_sessions(id),
  platform       platform NOT NULL,
  total_amount   NUMERIC(10, 2),
  screenshot_url TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Back-fill items FK
ALTER TABLE items ADD CONSTRAINT fk_order
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL;

-- ─────────────────────────────────────────
-- TABLE: settlements
-- ─────────────────────────────────────────
CREATE TABLE settlements (
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
ALTER TABLE items             ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordering_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders            ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlements       ENABLE ROW LEVEL SECURITY;

-- Flats: readable if you're a member
CREATE POLICY "flat members can read their flat"
  ON flats FOR SELECT
  USING (id = (SELECT flat_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "anyone can read flat by join code"
  ON flats FOR SELECT
  USING (true);

-- Profiles
CREATE POLICY "profiles are viewable by flat members"
  ON profiles FOR SELECT
  USING (flat_id = (SELECT flat_id FROM profiles WHERE id = auth.uid()) OR id = auth.uid());

CREATE POLICY "users can update own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- Items
CREATE POLICY "flat members can view items"
  ON items FOR SELECT
  USING (flat_id = (SELECT flat_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "flat members can add items"
  ON items FOR INSERT
  WITH CHECK (flat_id = (SELECT flat_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "flat members can update items"
  ON items FOR UPDATE
  USING (flat_id = (SELECT flat_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "flat members can delete items"
  ON items FOR DELETE
  USING (flat_id = (SELECT flat_id FROM profiles WHERE id = auth.uid()));

-- Ordering sessions
CREATE POLICY "flat members can view sessions"
  ON ordering_sessions FOR SELECT
  USING (flat_id = (SELECT flat_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "flat members can create sessions"
  ON ordering_sessions FOR INSERT
  WITH CHECK (buyer_id = auth.uid());

CREATE POLICY "buyer can update their session"
  ON ordering_sessions FOR UPDATE
  USING (buyer_id = auth.uid());

-- Orders
CREATE POLICY "flat members can view orders"
  ON orders FOR SELECT
  USING (flat_id = (SELECT flat_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "flat members can create orders"
  ON orders FOR INSERT
  WITH CHECK (buyer_id = auth.uid());

-- Settlements
CREATE POLICY "flat members can view settlements"
  ON settlements FOR SELECT
  USING (flat_id = (SELECT flat_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "buyer can create settlements"
  ON settlements FOR INSERT
  WITH CHECK (owed_to_id = auth.uid());

CREATE POLICY "ower can update settlement"
  ON settlements FOR UPDATE
  USING (ower_id = auth.uid());

-- ─────────────────────────────────────────
-- REALTIME
-- ─────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE items;
ALTER PUBLICATION supabase_realtime ADD TABLE ordering_sessions;

-- ─────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────
CREATE INDEX idx_items_flat_status   ON items (flat_id, status);
CREATE INDEX idx_items_flat_created  ON items (flat_id, created_at DESC);
CREATE INDEX idx_sessions_flat       ON ordering_sessions (flat_id, is_active);
CREATE INDEX idx_orders_flat         ON orders (flat_id, created_at DESC);
CREATE INDEX idx_profiles_flat       ON profiles (flat_id);
