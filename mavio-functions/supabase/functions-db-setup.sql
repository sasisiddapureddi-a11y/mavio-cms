-- ══════════════════════════════════════════════════════════
-- Run this in Supabase SQL Editor before deploying functions
-- Production-ready Mavio CMS database setup
-- ══════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. Add columns to content_cards (used by get-feed + track-interaction)
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE content_cards
  ADD COLUMN IF NOT EXISTS like_count     int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS share_count    int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS download_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS view_count     int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS content_text   text,
  ADD COLUMN IF NOT EXISTS content_text_language varchar(2);

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. user_interactions table (track-interaction + get-feed)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS user_interactions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id    uuid NOT NULL REFERENCES content_cards(id) ON DELETE CASCADE,
  action     text NOT NULL CHECK (action IN ('like','unlike','share','download','view')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, card_id, action)   -- prevents duplicate likes/downloads
);

ALTER TABLE user_interactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "interactions_own" ON user_interactions;
CREATE POLICY "interactions_own" ON user_interactions
  FOR ALL TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "interactions_public_read" ON user_interactions;
CREATE POLICY "interactions_public_read" ON user_interactions
  FOR SELECT TO anon USING (true);

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. user_profiles table (get-feed)
-- ═══════════════════════════════════════════════════════════════════════════
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

DROP POLICY IF EXISTS "profiles_public_read" ON user_profiles;
CREATE POLICY "profiles_public_read" ON user_profiles
  FOR SELECT TO anon USING (true);

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. user_interests table (get-feed)
-- ═══════════════════════════════════════════════════════════════════════════
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

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. increment_card_counter RPC (track-interaction)
-- ═══════════════════════════════════════════════════════════════════════════
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

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. decrement_card_counter RPC (track-interaction)
-- ═══════════════════════════════════════════════════════════════════════════
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

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. RLS Policies for storage buckets
-- ═══════════════════════════════════════════════════════════════════════════

-- Enable public read access for content-cards bucket
DROP POLICY IF EXISTS "public_read_content_cards" ON storage.objects;
CREATE POLICY "public_read_content_cards" ON storage.objects
  FOR SELECT USING (bucket_id = 'content-cards');

-- Allow authenticated users to upload to content-cards
DROP POLICY IF EXISTS "authenticated_upload_content_cards" ON storage.objects;
CREATE POLICY "authenticated_upload_content_cards" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'content-cards');

-- Allow users to delete their own uploads
DROP POLICY IF EXISTS "delete_own_content_cards" ON storage.objects;
CREATE POLICY "delete_own_content_cards" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'content-cards' AND
    (storage.foldername(name))[1] IS NOT NULL  -- Ensure proper folder structure
  );

-- Enable public read access for background-templates bucket
DROP POLICY IF EXISTS "public_read_background_templates" ON storage.objects;
CREATE POLICY "public_read_background_templates" ON storage.objects
  FOR SELECT USING (bucket_id = 'background-templates');

-- Allow authenticated users to upload to background-templates
DROP POLICY IF EXISTS "authenticated_upload_background_templates" ON storage.objects;
CREATE POLICY "authenticated_upload_background_templates" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'background-templates');

-- Allow users to delete their own background uploads
DROP POLICY IF EXISTS "delete_own_background_templates" ON storage.objects;
CREATE POLICY "delete_own_background_templates" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'background-templates');

-- ═══════════════════════════════════════════════════════════════════════════
-- 8. Enable RLS on content_cards for proper security
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE content_cards ENABLE ROW LEVEL SECURITY;

-- Public can read published cards
DROP POLICY IF EXISTS "public_read_cards" ON content_cards;
CREATE POLICY "public_read_cards" ON content_cards
  FOR SELECT USING (status = 'published');

-- Authenticated CMS users can read all cards and create new ones
DROP POLICY IF EXISTS "cms_read_cards" ON content_cards;
CREATE POLICY "cms_read_cards" ON content_cards
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "cms_create_cards" ON content_cards;
CREATE POLICY "cms_create_cards" ON content_cards
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "cms_update_cards" ON content_cards;
CREATE POLICY "cms_update_cards" ON content_cards
  FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "cms_delete_cards" ON content_cards;
CREATE POLICY "cms_delete_cards" ON content_cards
  FOR DELETE TO authenticated USING (true);

-- ═══════════════════════════════════════════════════════════════════════════
-- 9. Indexes for better performance
-- ═══════════════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_content_cards_status ON content_cards(status);
CREATE INDEX IF NOT EXISTS idx_content_cards_festival_id ON content_cards(festival_id);
CREATE INDEX IF NOT EXISTS idx_content_cards_category_id ON content_cards(category_id);
CREATE INDEX IF NOT EXISTS idx_content_cards_created_at ON content_cards(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_cards_priority ON content_cards(priority DESC);

CREATE INDEX IF NOT EXISTS idx_user_interactions_user_id ON user_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_card_id ON user_interactions(card_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_action ON user_interactions(action);
CREATE INDEX IF NOT EXISTS idx_user_interests_user_id ON user_interests(user_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- FINAL CHECKLIST BEFORE DEPLOYMENT
-- ═══════════════════════════════════════════════════════════════════════════
-- 1. ✅ Create 'content-cards' and 'background-templates' storage buckets (must be PUBLIC)
-- 2. ✅ Run all SQL above in Supabase SQL Editor
-- 3. ✅ Verify CORS is enabled in Supabase Storage settings
-- 4. ✅ Deploy Deno functions: get-feed, send-otp, track-interaction
-- 5. ✅ Test image uploads from CMS
-- 6. ✅ Test image rendering with 9:16 aspect ratio
-- 7. ✅ Test 404 errors are resolved
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- SAFE DATA FIX (OPTIONAL): normalize leading slash paths only
-- ═══════════════════════════════════════════════════════════════════════════
-- Some older rows may accidentally store "/content-cards/xyz.jpg" or "/xyz.jpg".
-- This safely normalizes ONLY rows starting with "/" and won't touch full "https://..." URLs.
--
-- Before running updates in production, take a small backup snapshot:
--   CREATE TABLE IF NOT EXISTS content_cards_image_url_backup AS
--   SELECT id, image_url, now() AS backed_up_at FROM content_cards;
--
-- Fix leading slash (generic):
--   UPDATE content_cards
--   SET image_url = ltrim(image_url, '/')
--   WHERE image_url LIKE '/%';
--
-- Fix leading "/content-cards/" specifically:
--   UPDATE content_cards
--   SET image_url = regexp_replace(image_url, '^/content-cards/', '')
--   WHERE image_url LIKE '/content-cards/%';
