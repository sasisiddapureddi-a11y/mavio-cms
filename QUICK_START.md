# Mavio CMS - Quick Start Deployment

## ⚡ 5-Step Production Deployment

### Step 1: Database Configuration (2 minutes)

1. **Open Supabase Dashboard:**
   - Go to https://app.supabase.com/
   - Select your project
   - Go to **SQL Editor**

2. **Copy and execute the database setup:**
   - Open file: `mavio-functions/supabase/functions-db-setup.sql`
   - Copy entire contents
   - Paste into Supabase SQL Editor
   - Click **Execute** button
   - ✅ Should complete without errors

3. **Verify tables were created:**
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
   ORDER BY table_name;
   ```
   Should show:
   - background_templates
   - categories
   - content_cards
   - festivals
   - languages
   - user_interactions
   - user_interests
   - user_profiles

---

### Step 2: Create Storage Buckets (1 minute)

1. **Go to Storage Section:**
   - Supabase Dashboard → **Storage**

2. **Create 'content-cards' bucket:**
   - Click "Create a new bucket"
   - Name: `content-cards`
   - ✅ Check "Public bucket"
   - Click "Create bucket"

3. **Create 'background-templates' bucket:**
   - Click "Create a new bucket"
   - Name: `background-templates`
   - ✅ Check "Public bucket"
   - Click "Create bucket"

4. **Verify CORS (should be enabled by default):**
   - Supabase Dashboard → **Settings**
   - Click **CORS**
   - Should show enabled

---

### Step 3: Deploy Deno Functions (3 minutes)

**Option A: Using Supabase CLI**

```bash
# Navigate to project directory
cd /Users/siva/apparao/mavio-cms

# Install/update Supabase CLI if needed
brew install supabase/tap/supabase  # macOS
# or
npm install -g supabase  # All platforms

# Login to Supabase
supabase login

# Deploy functions
supabase functions deploy get-feed --project-ref dpdsfhtnrfkaoziccmhj
supabase functions deploy send-otp --project-ref dpdsfhtnrfkaoziccmhj
supabase functions deploy track-interaction --project-ref dpdsfhtnrfkaoziccmhj
```

**Option B: Using Supabase Dashboard (No CLI needed)**

1. Go to **Edge Functions**
2. For each function (get-feed, send-otp, track-interaction):
   - Click **Deploy new function**
   - Copy code from corresponding TypeScript file
   - Paste into editor
   - Click **Deploy**

**Verify Deployment:**
- Go to Supabase → **Edge Functions**
- Should see all 3 functions listed
- Click each one → should see function code and logs
- No error messages should appear

---

### Step 4: Start the CMS (1 minute)

```bash
# Open terminal at project directory
cd /Users/siva/apparao/mavio-cms

# Install dependencies if not done
npm install

# Start development server
npm run dev

# Should output something like:
# ➜  Local:   http://localhost:5173/
```

---

### Step 5: Test Upload Flow (2 minutes)

1. **Open CMS:** http://localhost:5173/

2. **Test Card Upload:**
   - Click **Cards** → **New Card**
   - Choose **Upload Flow**
   - Click **Upload Image**
   - Select a JPG or PNG file (any size for testing)
   - Fill in details:
     - Category: Select any
     - Language: Select any
     - Festival: Optional
     - Occasions: Select one
     - Priority: Move slider
   - Click **Publish Card**
   - ✅ Should see green success toast

3. **Verify Image Loads:**
   - Go to **Dashboard**
   - Should see "Recent Cards" section
   - Click **Cards** tab
   - Should see your uploaded card with thumbnail
   - **Refresh page** (Cmd+R or Ctrl+R)
   - Thumbnail should still load (no 404 error)

4. **Test Backgrounds:**
   - Go to **Backgrounds**
   - Click **Upload New Background**
   - Upload an image
   - Give it a name
   - Click **Upload Background**
   - ✅ Should appear in grid
   - **Refresh page** - should still appear

---

## 🚀 You're Ready to Launch!

### What's Working Now:

✅ Image upload without 404 errors
✅ Database properly configured
✅ Storage buckets public and accessible
✅ Functions deployed and running
✅ Error handling and validation in place
✅ Delete confirmations working
✅ 9:16 aspect ratio maintained
✅ Performance optimized

### What to Do Next:

1. **Prepare Content:**
   - Decide on categories and languages
   - Plan festival dates
   - Create background templates

2. **Bulk Upload Content:**
   - Use CardNew.jsx to upload multiple cards
   - Set categories, languages, and festivals
   - Preview before publishing

3. **Monitor Performance:**
   - Check Supabase function logs
   - Monitor storage usage
   - Verify image load times

4. **Launch Mavio App:**
   - Configure Mavio app to use this Supabase backend
   - Test on production
   - Start serving content to users!

---

## ⚠️ Troubleshooting

### Problem: 404 on image refresh

**Solution 1: Clear cache**
```
Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows/Linux)
```

**Solution 2: Verify bucket is public**
```
Supabase → Storage → click bucket → check "Public" is enabled
```

**Solution 3: Check Supabase logs**
```
Supabase Dashboard → Edge Functions
Click each function → check "Logs" tab for errors
```

### Problem: Upload fails with "Storage bucket not found"

**Solution:**
```
1. Supabase → Storage → Create bucket "content-cards"
2. Make sure ✅ "Public bucket" is checked
3. Repeat for "background-templates"
```

### Problem: Function deployment fails

**Solution 1: Using CLI**
```bash
# Make sure you're logged in
supabase login

# Try deploying with more details
supabase functions deploy get-feed --project-ref dpdsfhtnrfkaoziccmhj -v
```

**Solution 2: Using Dashboard**
```
Supabase → Edge Functions → Deploy new function
Copy-paste the TypeScript code directly
```

### Problem: Network errors during upload

**Check browser console:**
```
Press F12 → Click "Console" tab → Look for error messages
Should show detailed error about what failed
```

---

## 📞 Support Checklist

If something doesn't work:

- [ ] Verify SQL executed without errors
- [ ] Verify both storage buckets created and PUBLIC
- [ ] Verify functions deployed (in Edge Functions tab)
- [ ] Clear browser cache (Cmd+Shift+R)
- [ ] Check Supabase function logs for errors
- [ ] Check browser console (F12) for errors
- [ ] Verify environment variables in `.env` file
- [ ] Try uploading a smaller file
- [ ] Try in a different browser

---

## 📊 Performance Metrics

After deployment, monitor:

- **Function execution time:** Should be < 200ms
- **Upload speed:** Should be < 5 seconds for 2MB image
- **Image load time:** Should be < 1 second
- **Database query time:** Should be < 100ms
- **Storage usage:** Monitor in Supabase dashboard

---

## 🎯 Next Phase: Content Upload

Once everything is working:

1. **Create content calendar** with festival dates
2. **Prepare high-quality images** (9:16 aspect ratio preferred)
3. **Upload backgrounds** for each category/festival
4. **Batch upload cards** for each category
5. **Test on Mavio app** before launching to users
6. **Monitor analytics** and user engagement

---

**You're all set to launch Mavio CMS! 🎉**

Any issues? Check the detailed guide: `PRODUCTION_DEPLOYMENT_GUIDE.md`
