import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const CARD_SELECT = `
  id, image_url, category_id, language_id, festival_id,
  occasions, tags, priority, content_text,
  like_count, share_count, download_count, view_count,
  created_at,
  categories:category_id(id, name, slug, emoji, color_hex),
  languages:language_id(id, name, code),
  festivals:festival_id(id, name, telugu_name)
`

serve(async (req: Request) => {
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

    const token = authHeader.replace("Bearer ", "")
    const { data: { user } } = await supabase.auth.getUser(token)
    const userId: string | null = user?.id ?? null

    const reqUrl = new URL(req.url)
    const page = parseInt(reqUrl.searchParams.get("page") ?? "0")
    const limit = Math.min(parseInt(reqUrl.searchParams.get("limit") ?? "20"), 50)
    const categoryFilter = reqUrl.searchParams.get("category_id")
    const sortMode = reqUrl.searchParams.get("sort")
    const offset = page * limit

    let profile: any = null
    let interestCategoryIds: string[] = []

    if (userId) {
      const { data: profileData } = await supabase
        .from("user_profiles")
        .select("language_id, is_onboarded")
        .eq("id", userId)
        .maybeSingle()
      profile = profileData

      const { data: interests } = await supabase
        .from("user_interests")
        .select("category_id")
        .eq("user_id", userId)
      interestCategoryIds = interests?.map((i: any) => i.category_id) ?? []
    }

    const userLanguageId: string | null = profile?.language_id ?? null

    const today = new Date().toISOString().split("T")[0]
    const { data: todayFestival } = await supabase
      .from("festivals")
      .select("id, name, telugu_name")
      .eq("festival_date", today)
      .eq("is_active", true)
      .maybeSingle()

    // ── Seen cards — capped at 50 to prevent empty feeds ──
    let seenCardIds: string[] = []
    if (userId) {
      const { data: seenRows } = await supabase
        .from("user_interactions")
        .select("card_id")
        .eq("user_id", userId)
        .in("action", ["view", "like", "download"])
        .order("created_at", { ascending: false })
        .limit(50)
      seenCardIds = (seenRows?.map((r: any) => r.card_id) ?? []).slice(0, 50)
    }

    // Helper: add seen-card exclusion to a Supabase query builder
    const excludeSeen = (query: any): any => {
      if (seenCardIds.length === 0) return query
      return query.not("id", "in", `(${seenCardIds.join(",")})`)
    }

    // ── BRANCH 1: Trending tab ──
    if (sortMode === "trending") {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

      const { data: recentData } = await excludeSeen(
        supabase
          .from("content_cards")
          .select(CARD_SELECT)
          .eq("status", "published")
          .gte("created_at", sevenDaysAgo)
      ).range(0, 99)

      let cards: any[] = recentData ?? []

      if (cards.length < 5) {
        const { data } = await supabase
          .from("content_cards")
          .select(CARD_SELECT)
          .eq("status", "published")
          .range(0, 99)
        cards = data ?? []
      }

      cards.sort((a: any, b: any) => {
        const scoreA = (a.share_count ?? 0) * 3 + (a.download_count ?? 0) * 2 + (a.like_count ?? 0)
        const scoreB = (b.share_count ?? 0) * 3 + (b.download_count ?? 0) * 2 + (b.like_count ?? 0)
        return scoreB - scoreA
      })

      return respondOk(cards.slice(offset, offset + limit), page, limit, todayFestival)
    }

    // ── BRANCH 2: Category-specific tab ──
    if (categoryFilter) {
      const baseQ = supabase
        .from("content_cards")
        .select(CARD_SELECT)
        .eq("status", "published")
        .eq("category_id", categoryFilter)
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false })

      let { data } = await excludeSeen(
        userLanguageId ? baseQ.eq("language_id", userLanguageId) : baseQ
      ).range(offset, offset + limit - 1)

      if (!data || data.length < 5) {
        ;({ data } = await baseQ.range(offset, offset + limit - 1))
      }

      return respondOk(data ?? [], page, limit, todayFestival)
    }

    // ── BRANCH 3: For You — 4-layer algorithm ──
    let festivalCards: any[] = []
    let interestCards: any[] = []
    let trendingCards: any[] = []
    let fillCards: any[] = []

    // Layer 1: Festival cards (max 5)
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

    // Layer 2: Interest cards — user's chosen categories (70% of feed)
    if (interestCategoryIds.length > 0) {
      const interestLimit = Math.floor(limit * 0.7)
      const interestBaseQ = supabase
        .from("content_cards")
        .select(CARD_SELECT)
        .eq("status", "published")
        .in("category_id", interestCategoryIds)
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false })

      if (userLanguageId) {
        const { data: langData } = await excludeSeen(interestBaseQ.eq("language_id", userLanguageId))
          .range(offset, offset + interestLimit)
        if (langData && langData.length >= 5) {
          interestCards = langData
        }
      }

      if (interestCards.length < 5) {
        const { data } = await excludeSeen(interestBaseQ).range(offset, offset + interestLimit)
        interestCards = data ?? []
      }
    }

    // Layer 3: Trending from other categories (30% of feed)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const usedIds = [
      ...festivalCards.map((c: any) => c.id),
      ...interestCards.map((c: any) => c.id),
    ]

    let trendQ: any = supabase
      .from("content_cards")
      .select(CARD_SELECT)
      .eq("status", "published")
      .gte("created_at", sevenDaysAgo)
      .order("share_count", { ascending: false })
      .order("download_count", { ascending: false })
      .limit(Math.floor(limit * 0.3))

    if (usedIds.length > 0) {
      trendQ = trendQ.not("id", "in", `(${usedIds.join(",")})`)
    }
    if (interestCategoryIds.length > 0 && interestCards.length >= 5) {
      trendQ = trendQ.not("category_id", "in", `(${interestCategoryIds.join(",")})`)
    }

    const { data: trending } = await trendQ
    trendingCards = trending ?? []

    // Layer 4: Fill remaining slots
    const totalSoFar = festivalCards.length + interestCards.length + trendingCards.length
    if (totalSoFar < limit) {
      const usedAll = [...festivalCards, ...interestCards, ...trendingCards].map((c: any) => c.id)
      let fillQ: any = supabase
        .from("content_cards")
        .select(CARD_SELECT)
        .eq("status", "published")
        .order("priority", { ascending: false })
        .limit(limit - totalSoFar)

      if (usedAll.length > 0) {
        fillQ = fillQ.not("id", "in", `(${usedAll.join(",")})`)
      }

      const { data: fill } = await fillQ
      fillCards = fill ?? []
    }

    let finalFeed = [
      ...festivalCards,
      ...interleave(interestCards, trendingCards),
      ...fillCards,
    ]

    // If fewer than 5 cards after all filters, retry without seen exclusion
    if (finalFeed.length < 5 && seenCardIds.length > 0) {
      const { data: retryData } = await supabase
        .from("content_cards")
        .select(CARD_SELECT)
        .eq("status", "published")
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(limit)
      finalFeed = retryData ?? []
    }

    return respondOk(finalFeed.slice(0, limit), page, limit, todayFestival)

  } catch (error) {
    console.error("Unexpected error:", error)
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})

function respondOk(cards: any[], page: number, limit: number, todayFestival: any): Response {
  return new Response(
    JSON.stringify({
      success: true,
      data: cards.map((c) => formatCard(c, todayFestival)),
      meta: {
        page,
        limit,
        count: cards.length,
        has_more: cards.length === limit,
        today_festival: todayFestival ?? null,
      },
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  )
}

function formatCard(card: any, todayFestival: any) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
  const imgPath = card.image_url
  return {
    id: card.id,
    image_url: imgPath?.startsWith("http")
      ? imgPath
      : `${supabaseUrl}/storage/v1/render/image/public/content-cards/${imgPath}?width=1080&height=1920&quality=85`,
    thumb_url: imgPath?.startsWith("http")
      ? imgPath
      : `${supabaseUrl}/storage/v1/render/image/public/content-cards/${imgPath}?width=405&height=720&quality=70`,
    category: card.categories,
    language: card.languages,
    festival: card.festivals,
    occasions: card.occasions ?? [],
    tags: card.tags ?? [],
    priority: card.priority,
    content_text: card.content_text ?? null,
    stats: {
      likes: card.like_count ?? 0,
      shares: card.share_count ?? 0,
      downloads: card.download_count ?? 0,
      views: card.view_count ?? 0,
    },
    is_festival: !!todayFestival && card.festival_id === todayFestival?.id,
    created_at: card.created_at,
  }
}

function interleave(a: any[], b: any[]): any[] {
  const result: any[] = []
  const maxLen = Math.max(a.length, b.length)
  for (let i = 0; i < maxLen; i++) {
    if (i < a.length) result.push(a[i])
    if (i < b.length) result.push(b[i])
  }
  return result
}
