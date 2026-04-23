# Mavio CMS - Production Deployment Guide

## Overview
This guide walks you through deploying the Mavio CMS backend (Supabase) and verifying the CMS works in production (including image uploads and Edge Functions).

---

## Inputs you must know before starting

- **Supabase project ref**: `<YOUR_PROJECT_REF>` (looks like `abcxyzdefghijklmnop`)
- **Supabase project URL**: `https://<YOUR_PROJECT_REF>.supabase.co`
- **Supabase keys**
  - **Anon key** (for the web app): `VITE_SUPABASE_ANON_KEY`
  - **Service role key** (for Edge Functions only): `SUPABASE_SERVICE_ROLE_KEY`

---

## Phase 1: Database Setup (CRITICAL)

### Step 1: Run Database SQL
1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Navigate to your project
3. Open **SQL Editor**
4. Copy and paste the entire contents of `mavio-functions/supabase/functions-db-setup.sql`
5. Execute the SQL script
6. **Verify:** Check that no errors appear

### Step 2: Verify Tables and Functions
Run these queries in SQL Editor to confirm everything is set up:

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- Check functions exist
SELECT routines.routine_name FROM information_schema.routines WHERE routine_schema = 'public';

-- Check RLS is enabled
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true;
```

---

## Phase 2: Storage Bucket Configuration (CRITICAL FOR 404 FIXES)

### Step 3: Create and Configure Storage Buckets

1. **Create 'content-cards' Bucket:**
   - Go to Supabase Dashboard → Storage
   - Click "Create a new bucket"
   - Name: `content-cards`
   - ✅ Check "Public bucket"
   - Click "Create bucket"

2. **Create 'background-templates' Bucket:**
   - Repeat the above with name: `background-templates`
   - ✅ Check "Public bucket"

3. **Verify CORS is Enabled:**
   - Go to Supabase Dashboard → Project Settings → CORS
   - Ensure CORS is enabled (should have default configuration)

### Step 4: Verify Bucket URLs

Test that your bucket URLs work (replace `<YOUR_PROJECT_REF>`):

- `https://<YOUR_PROJECT_REF>.supabase.co/storage/v1/object/public/content-cards/test.jpg` should return 404 (expected - file doesn't exist yet)
- `https://<YOUR_PROJECT_REF>.supabase.co/storage/v1/render/image/public/content-cards/test.jpg?width=1080&height=1920&quality=85` should also return 404 (expected)

**Important:** The `/storage/v1/render/image/...` endpoint requires Supabase Image Transformation to be available on your plan. If it’s not available, you can still use `/storage/v1/object/public/...` URLs, but you won’t get resize/crop/quality transforms.

---

## Phase 3: Deploy Deno Functions

### Step 5: Configure Edge Function Secrets (REQUIRED)

These functions use the **service role key** at runtime:
- `get-feed`
- `track-interaction`
- `send-otp`

In Supabase Dashboard:
1. Go to **Edge Functions** → **Secrets**
2. Set:
   - `SUPABASE_URL` = `https://<YOUR_PROJECT_REF>.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY` = `<YOUR_SERVICE_ROLE_KEY>`

Do **not** put the service role key in any frontend `.env` file.

### Step 6: Deploy Functions to Supabase

```bash
# Navigate to the functions directory
cd mavio-functions/supabase

# Deploy all functions
supabase functions deploy get-feed --project-ref <YOUR_PROJECT_REF>
supabase functions deploy send-otp --project-ref <YOUR_PROJECT_REF>
supabase functions deploy track-interaction --project-ref <YOUR_PROJECT_REF>
```

### Step 7: Verify Function Deployment

1. Go to Supabase Dashboard → Edge Functions
2. Verify all three functions are listed:
   - `get-feed`
   - `send-otp`
   - `track-interaction`
3. Click each function and verify no errors in logs

---

## Phase 4: Test Image Upload and Fix 404 Errors

### Step 8: Test Upload Flow

1. **Open Mavio CMS:** `http://localhost:5173`
2. **Go to "Cards" → "New Card"**
3. **Upload a test image** (JPG or PNG)
4. **Fill in metadata** (category, language, festival, etc.)
5. **Publish the card**
6. **Wait for success toast message**

### Step 9: Verify Image URLs

After uploading, check that the image is accessible:

1. **Copy the image URL** from the card (right-click → Inspect Element)
2. **Open it in a new tab** - should display without 404
3. **Example URL format:**
   ```
   https://<YOUR_PROJECT_REF>.supabase.co/storage/v1/render/image/public/content-cards/1234567890-abc123.jpg?width=1080&height=1920&quality=85
   ```

### Step 10: Test Dashboard and Image Refresh

1. **Go to Dashboard**
2. **Verify recent cards display thumbnails** (not 404)
3. **Refresh the page** (Cmd+R or Ctrl+R)
4. **Images should still load** (no 404 errors)

---

## Phase 5: Content Upload and Management

### Step 11: Upload Content

Now that the CMS is production-ready, you can:

1. **Create cards in bulk:**
   - Use the "New Card" flow
   - Create in "Upload" mode (direct image) or "Build" mode (with background)
   - Set category, language, festival, occasions, tags, priority

2. **Manage backgrounds:**
   - Go to "Backgrounds"
   - Upload custom background templates
   - Use AI generation (if configured with Anthropic API key)

3. **Manage festivals:**
   - Go to "Festivals"
   - Create upcoming festivals
   - Set festival dates and auto-publish triggers

---

## Phase 6: Environment Configuration

### Step 12: Verify Environment Variables (Frontend)

Check `.env` file:
```
VITE_SUPABASE_URL="https://<YOUR_PROJECT_REF>.supabase.co"
VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
VITE_ANTHROPIC_API_KEY="sk-ant-api03-..." (optional, for AI background generation)
```

---

**Do not** add `SUPABASE_SERVICE_ROLE_KEY` to the frontend `.env`.

---

## Phase 7: Auth (OTP) Requirements

### Step 13: Ensure SMS OTP is configured in Supabase

The `send-otp` Edge Function triggers an SMS OTP flow; for this to work in production:
- Configure an **SMS provider** in Supabase Auth settings (e.g. Twilio / other supported provider)
- Ensure your Auth settings allow the flow you want (signups/logins via phone)

If SMS provider isn’t configured, the function will return a 500 (“Failed to send OTP…”), and logs will show the underlying provider/config error.

---

## Phase 8: Troubleshooting 404 Errors

### If images still show 404:

#### 1. **Check Bucket is Public**
```sql
-- In Supabase SQL Editor
SELECT bucket_id, is_public FROM storage.buckets WHERE name IN ('content-cards', 'background-templates');
```
Result should show `is_public = true` for both.

#### 2. **Check RLS Policies**
```sql
-- Verify public read policies exist
SELECT schemaname, tablename, policyname FROM pg_policies 
WHERE tablename IN ('objects') AND schemaname = 'storage';
```

#### 3. **Check Image Path**
The image path stored in database should be just the filename, e.g.:
- ✅ Correct: `1234567890-abc123.jpg`
- ❌ Wrong: `/content-cards/1234567890-abc123.jpg`

**Fix if needed:**
```sql
-- In Supabase SQL Editor
UPDATE content_cards 
SET image_url = SUBSTRING(image_url FROM POSITION('/' IN image_url) + 1) 
WHERE image_url LIKE '/%';
```

#### 4. **Check Supabase URL**
Verify your `VITE_SUPABASE_URL` matches your Supabase URL:
```javascript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
// Should be: https://<YOUR_PROJECT_REF>.supabase.co
```

#### 5. **Clear Browser Cache**
- Hard refresh: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows/Linux)
- Or open DevTools → Application → Clear Site Data

---

## Phase 9: Pre-Launch Checklist

### ✅ Final Verification

- [ ] All three Deno functions deployed and no errors
- [ ] Edge Function secrets configured (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`)
- [ ] Both storage buckets created and set to public
- [ ] CORS enabled in Supabase
- [ ] Database SQL script executed without errors
- [ ] Test card uploaded successfully
- [ ] Image displays without 404 error
- [ ] Dashboard shows recent cards with thumbnails
- [ ] Page refresh doesn't cause 404 errors
- [ ] Environment variables configured correctly
- [ ] No console errors in browser DevTools

---

## Phase 10: Launch Preparation

### Before going live:

1. **Test on different devices:**
   - Desktop (Chrome, Safari, Firefox)
   - Mobile (iOS Safari, Android Chrome)

2. **Test all flows:**
   - Login/OTP
   - Card creation
   - Card editing
   - Card publishing
   - Image uploads
   - Background management
   - Festival management
   - Feed + interactions (like/share/download/view) in the client app (if connected)

3. **Monitor Supabase logs:**
   - Check Edge Function logs for errors
   - Check Database query logs for slow queries
   - Check Storage access logs

4. **Set up backups:**
   - Enable Supabase automated backups
   - Configure backup retention

---

## Quick Reference URLs

- **Supabase Dashboard:** `https://app.supabase.com/`
- **Storage Buckets:** `https://<YOUR_PROJECT_REF>.supabase.co/storage/v1/object/public/[bucket]/`
- **Render (Transform) Endpoint:** `https://<YOUR_PROJECT_REF>.supabase.co/storage/v1/render/image/public/[bucket]/[path]?width=1080&height=1920&quality=85`
- **Edge Function base URL:** `https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/[function-name]`

---

## Support

If you encounter issues:

1. Check Supabase logs (Edge Functions section)
2. Check browser console (F12 → Console)
3. Verify all checklist items in Phase 9
4. Re-run the database SQL script (idempotent - safe to run multiple times)

---

**You’re now ready to deploy Mavio CMS to production.**
