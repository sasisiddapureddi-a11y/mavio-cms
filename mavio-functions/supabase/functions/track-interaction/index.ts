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

    const token = authHeader.replace("Bearer ", "")
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const { card_id, action } = await req.json()

    const validActions = ["like", "unlike", "share", "download", "view"]
    if (!card_id || !action || !validActions.includes(action)) {
      return new Response(
        JSON.stringify({ error: "Invalid card_id or action" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // ── Unlike: remove the like row + decrement counter, nothing else ──
    if (action === "unlike") {
      await supabase
        .from("user_interactions")
        .delete()
        .eq("user_id", user.id)
        .eq("card_id", card_id)
        .eq("action", "like")

      await supabase.rpc("decrement_card_counter", {
        card_id_input: card_id,
        counter_name: "like_count",
      })

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // ── All other actions: insert interaction row ──
    const { error: insertError } = await supabase
      .from("user_interactions")
      .insert({ user_id: user.id, card_id, action })

    if (insertError) {
      // Ignore duplicate interactions (e.g. double-like)
      if (insertError.code !== "23505") {
        console.error("Insert error:", insertError)
        return new Response(
          JSON.stringify({ error: "Failed to track interaction" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }
    }

    // Increment counter for countable actions
    const counterMap: Record<string, string> = {
      like: "like_count",
      share: "share_count",
      download: "download_count",
      view: "view_count",
    }

    if (counterMap[action]) {
      await supabase.rpc("increment_card_counter", {
        card_id_input: card_id,
        counter_name: counterMap[action],
      })
    }

    return new Response(
      JSON.stringify({ success: true }),
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
