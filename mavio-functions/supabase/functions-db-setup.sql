-- ══════════════════════════════════════════════════════════
-- Run this in Supabase SQL Editor before deploying functions
-- ══════════════════════════════════════════════════════════

-- 1. Add counter columns to content_cards (used by get-feed + track-interaction)
ALTER TABLE content_cards
  ADD COLUMN IF NOT EXISTS like_count     int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS share_count    int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS download_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS view_count     int NOT NULL DEFAULT 0;

-- 2. user_interactions table (track-interaction + get-feed)
CREATE TABLE IF NOT EXISTS user_interactions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id    uuid NOT NULL REFERENCES content_cards(id) ON DELETE CASCADE,
  action     text NOT NULL CHECK (action IN ('like','share','download','view')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, card_id, action)   -- prevents duplicate likes/downloads
);

ALTER TABLE user_interactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "interactions_own" ON user_interactions;
CREATE POLICY "interactions_own" ON user_interactions
  FOR ALL TO authenticated USING (auth.uid() = user_id);

-- 3. user_profiles table (get-feed)
CREATE TABLE IF NOT EXISTS user_profiles (
  id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  language_id  uuid REFERENCES languages(id) ON DELETE SET NULL,
  is_onboarded boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_own" ON user_profiles;
CREATE POLICY "profiles_own" ON user_profiles
  FOR ALL TO authenticated USING (auth.uid() = id);

-- 4. user_interests table (get-feed)
CREATE TABLE IF NOT EXISTS user_interests (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  UNIQUE (user_id, category_id)
);

ALTER TABLE user_interests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "interests_own" ON user_interests;
CREATE POLICY "interests_own" ON user_interests
  FOR ALL TO authenticated USING (auth.uid() = user_id);

-- 5. increment_card_counter RPC (track-interaction)
CREATE OR REPLACE FUNCTION increment_card_counter(
  card_id_input uuid,
  counter_name  text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF counter_name NOT IN ('like_count','share_count','download_count','view_count') THEN
    RAISE EXCEPTION 'Invalid counter name: %', counter_name;
  END IF;

  EXECUTE format(
    'UPDATE content_cards SET %I = %I + 1 WHERE id = $1',
    counter_name, counter_name
  ) USING card_id_input;
END;
$$;

-- 6. decrement_card_counter RPC (track-interaction)
CREATE OR REPLACE FUNCTION decrement_card_counter(
  card_id_input uuid,
  counter_name  text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF counter_name NOT IN ('like_count','share_count','download_count','view_count') THEN
    RAISE EXCEPTION 'Invalid counter name: %', counter_name;
  END IF;

  EXECUTE format(
    'UPDATE content_cards SET %I = GREATEST(%I - 1, 0) WHERE id = $1',
    counter_name, counter_name
  ) USING card_id_input;
END;
$$;
