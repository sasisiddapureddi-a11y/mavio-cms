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
    const { phone } = await req.json()

    if (!phone) {
      return new Response(
        JSON.stringify({ error: "Phone number is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Validate Indian phone number format
    const phoneRegex = /^(\+91|91)?[6-9]\d{9}$/
    const cleanPhone = phone.replace(/\s/g, "")
    if (!phoneRegex.test(cleanPhone)) {
      return new Response(
        JSON.stringify({ error: "Invalid Indian phone number" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Format to E.164
    let formattedPhone = cleanPhone
    if (!formattedPhone.startsWith("+")) {
      formattedPhone = "+91" + formattedPhone.replace(/^91/, "")
    }

    // Use service role key — phone OTP requires admin privileges
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { error: otpError } = await supabase.auth.admin.generateLink({
      type: "sms",
      phone: formattedPhone,
    })

    if (otpError) {
      console.error("OTP error:", otpError)
      return new Response(
        JSON.stringify({ error: "Failed to send OTP. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "OTP sent successfully",
        phone: formattedPhone,
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
