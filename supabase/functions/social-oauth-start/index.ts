import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const CALLBACK_URL = `${SUPABASE_URL}/functions/v1/social-oauth-callback`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { platform } = await req.json();
    if (!["facebook", "instagram", "linkedin"].includes(platform)) {
      return new Response(JSON.stringify({ error: "Invalid platform" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Encode state with user_id and platform
    const state = btoa(JSON.stringify({ user_id: user.id, platform }));

    let authUrl: string;

    if (platform === "facebook" || platform === "instagram") {
      const META_APP_ID = Deno.env.get("META_APP_ID");
      if (!META_APP_ID) throw new Error("META_APP_ID not configured");

      const scopes = "email,public_profile";

      authUrl =
        `https://www.facebook.com/v21.0/dialog/oauth?` +
        `client_id=${META_APP_ID}` +
        `&redirect_uri=${encodeURIComponent(CALLBACK_URL)}` +
        `&state=${encodeURIComponent(state)}` +
        `&scope=${encodeURIComponent(scopes)}` +
        `&response_type=code`;
    } else {
      // LinkedIn
      const LINKEDIN_CLIENT_ID = Deno.env.get("LINKEDIN_CLIENT_ID");
      if (!LINKEDIN_CLIENT_ID) throw new Error("LINKEDIN_CLIENT_ID not configured");

      const scopes = "openid profile email w_member_social";

      authUrl =
        `https://www.linkedin.com/oauth/v2/authorization?` +
        `response_type=code` +
        `&client_id=${LINKEDIN_CLIENT_ID}` +
        `&redirect_uri=${encodeURIComponent(CALLBACK_URL)}` +
        `&state=${encodeURIComponent(state)}` +
        `&scope=${encodeURIComponent(scopes)}`;
    }

    return new Response(JSON.stringify({ url: authUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("OAuth start error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
