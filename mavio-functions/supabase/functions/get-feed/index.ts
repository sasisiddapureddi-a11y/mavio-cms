import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Authenticate user
    const token = authHeader.replace("Bearer ", "")
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Parse query params
    const url = new URL(req.url)
    const page = parseInt(url.searchParams.get("page") ?? "0")
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "20"), 50)
    const categoryFilter = url.searchParams.get("category")
    const offset = page * limit

    // ── Step 1: Get user profile + interests ──
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("language_id, is_onboarded")
      .eq("id", user.id)
      .maybeSingle()

    const { data: interests } = await supabase
      .from("user_interests")
      .select("category_id")
      .eq("user_id", user.id)

    const interestCategoryIds = interests?.map((i: any) => i.category_id) ?? []

    // ── Step 2: Get today's festival if any ──
    // Use maybeSingle() — returns null instead of 406 when no festival today
    const today = new Date().toISOString().split("T")[0]
    const { data: todayFestival } = await supabase
      .from("festivals")
      .select("id, name, telugu_name")
      .eq("festival_date", today)
      .eq("is_active", true)
      .maybeSingle()

    // ── Step 3: Get cards user already interacted with (to avoid repeats) ──
    const { data: seenInteractions } = await supabase
      .from("user_interactions")
      .select("card_id")
      .eq("user_id", user.id)
      .in("action", ["view", "like", "download"])
      .order("created_at", { ascending: false })
      .limit(200)

    const seenCardIds: string[] = seenInteractions?.map((i: any) => i.card_id) ?? []

    const CARD_SELECT = `
      id, image_url, category_id, language_id, festival_id,
      occasions, tags, priority,
      like_count, share_count, download_count, view_count,
      created_at,
      categories:category_id(id, name, slug, emoji, color_hex),
      languages:language_id(id, name, code),
      festivals:festival_id(id, name, telugu_name)
    `

    // ── Step 4: Build the feed in layers ──
    let festivalCards: any[] = []
    let interestCards: any[] = []
    let trendingCards: any[] = []
    let fillCards: any[] = []

    // Layer 1: Festival cards (today's festival) — highest priority
    if (todayFestival) {
      const { data } = await supabase
        .from("content_cards")
        .select(CARD_SELECT)
        .eq("status", "published")
        .eq("festival_id", todayFestival.id)
        .order("priority", { ascending: false })
        .limit(5)

      festivalCards = data ?? []
    }

    // Layer 2: Cards matching user interests — core feed (70%)
    if (interestCategoryIds.length > 0) {
      let query = supabase
        .from("content_cards")
        .select(CARD_SELECT)
        .eq("status", "published")
        .in("category_id", interestCategoryIds)
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false })

      if (profile?.language_id) {
        query = query.eq("language_id", profile.language_id)
      }

      if (categoryFilter && categoryFilter !== "for-you") {
        query = query.eq("category_id", categoryFilter)
      }

      // Exclude already-seen cards (must have at least one ID or PostgREST errors)
      if (seenCardIds.length > 0) {
        query = query.not("id", "in", `(${seenCardIds.map((id) => `"${id}"`).join(",")})`)
      }

      const { data } = await query.range(offset, offset + Math.floor(limit * 0.7))
      interestCards = data ?? []
    }

    // Layer 3: Trending cards (30%) — highest shares/downloads in last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const excludeFromTrending = [
      ...festivalCards.map((c: any) => c.id),
      ...interestCards.map((c: any) => c.id),
    ]

    let trendingQuery = supabase
      .from("content_cards")
      .select(CARD_SELECT)
      .eq("status", "published")
      .gte("created_at", sevenDaysAgo)
      .order("share_count", { ascending: false })
      .order("download_count", { ascending: false })
      .limit(Math.floor(limit * 0.3))

    if (excludeFromTrending.length > 0) {
      trendingQuery = trendingQuery.not(
        "id", "in",
        `(${excludeFromTrending.map((id) => `"${id}"`).join(",")})`
      )
    }

    const { data: trending } = await trendingQuery
    trendingCards = trending ?? []

    // Layer 4: Fill remaining slots
    const totalSoFar = festivalCards.length + interestCards.length + trendingCards.length
    if (totalSoFar < limit) {
      const allCurrentIds = [
        ...festivalCards, ...interestCards, ...trendingCards,
      ].map((c: any) => c.id)

      let fillQuery = supabase
        .from("content_cards")
        .select(CARD_SELECT)
        .eq("status", "published")
        .order("priority", { ascending: false })
        .limit(limit - totalSoFar)

      if (allCurrentIds.length > 0) {
        fillQuery = fillQuery.not(
          "id", "in",
          `(${allCurrentIds.map((id) => `"${id}"`).join(",")})`
        )
      }

      const { data: fill } = await fillQuery
      fillCards = fill ?? []
    }

    // ── Step 5: Merge — festival first, then interleave interest + trending, then fill ──
    const mainFeed = interleave(interestCards, trendingCards)
    const finalFeed = [...festivalCards, ...mainFeed, ...fillCards]

    // ── Step 6: Check which cards user has liked ──
    const feedCardIds = finalFeed.map((c: any) => c.id)
    let likedCardIds: string[] = []

    if (feedCardIds.length > 0) {
      const { data: likes } = await supabase
        .from("user_interactions")
        .select("card_id")
        .eq("user_id", user.id)
        .eq("action", "like")
        .in("card_id", feedCardIds)

      likedCardIds = likes?.map((l: any) => l.card_id) ?? []
    }

    // ── Step 7: Format response ──
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
    const formattedFeed = finalFeed.map((card: any) => ({
      id: card.id,
      image_url: `${supabaseUrl}/storage/v1/render/image/public/content-cards/${card.image_url}?width=1080&height=1080&quality=80`,
      thumb_url: `${supabaseUrl}/storage/v1/render/image/public/content-cards/${card.image_url}?width=400&height=400&quality=70`,
      category: card.categories,
      language: card.languages,
      festival: card.festivals,
      occasions: card.occasions ?? [],
      tags: card.tags ?? [],
      priority: card.priority,
      stats: {
        likes: card.like_count ?? 0,
        shares: card.share_count ?? 0,
        downloads: card.download_count ?? 0,
        views: card.view_count ?? 0,
      },
      is_liked: likedCardIds.includes(card.id),
      is_festival: !!todayFestival && card.festival_id === todayFestival?.id,
      created_at: card.created_at,
    }))

    return new Response(
      JSON.stringify({
        success: true,
        data: formattedFeed,
        meta: {
          page,
          limit,
          count: formattedFeed.length,
          has_more: formattedFeed.length === limit,
          today_festival: todayFestival ?? null,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )

  } catch (error) {
    console.error("Unexpected error:", error)
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})

function interleave(a: any[], b: any[]): any[] {
  const result: any[] = []
  const max = Math.max(a.length, b.length)
  for (let i = 0; i < max; i++) {
    if (i < a.length) result.push(a[i])
    if (i < b.length) result.push(b[i])
  }
  return result
}
