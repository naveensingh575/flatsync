-- ========================================================
-- Web Push Subscriptions Table Migration
-- Run this in your Supabase SQL Editor if you want to store
-- persistent push subscriptions across server restarts.
-- ========================================================

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  flat_id UUID,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow insert/upsert
DROP POLICY IF EXISTS "Anyone can insert push subscriptions" ON push_subscriptions;
CREATE POLICY "Anyone can insert push subscriptions"
  ON push_subscriptions FOR INSERT
  WITH CHECK (true);

-- Allow select
DROP POLICY IF EXISTS "Anyone can select push subscriptions" ON push_subscriptions;
CREATE POLICY "Anyone can select push subscriptions"
  ON push_subscriptions FOR SELECT
  USING (true);

-- Allow update
DROP POLICY IF EXISTS "Anyone can update push subscriptions" ON push_subscriptions;
CREATE POLICY "Anyone can update push subscriptions"
  ON push_subscriptions FOR UPDATE
  USING (true);

-- Allow delete
DROP POLICY IF EXISTS "Anyone can delete push subscriptions" ON push_subscriptions;
CREATE POLICY "Anyone can delete push subscriptions"
  ON push_subscriptions FOR DELETE
  USING (true);
