import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Find accounts expiring within the next 7 days or already expired
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: accounts, error: fetchError } = await supabase
      .from("social_accounts")
      .select("*")
      .eq("status", "connected")
      .not("token_expiry", "is", null)
      .lte("token_expiry", sevenDaysFromNow);

    if (fetchError) throw fetchError;

    if (!accounts || accounts.length === 0) {
      return new Response(JSON.stringify({ message: "No tokens need refreshing", refreshed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: any[] = [];

    for (const account of accounts) {
      try {
        if (account.platform === "facebook" || account.platform === "instagram") {
          const refreshed = await refreshMetaToken(account);
          results.push(refreshed);
        } else if (account.platform === "linkedin") {
          const refreshed = await refreshLinkedInToken(account);
          results.push(refreshed);
        }
      } catch (err) {
        console.error(`Failed to refresh ${account.platform} for user ${account.user_id}:`, err);
        const isExpired = new Date(account.token_expiry) < new Date();
        if (isExpired) {
          await supabase
            .from("social_accounts")
            .update({ status: "expired", updated_at: new Date().toISOString() })
            .eq("id", account.id);
        }
        results.push({
          id: account.id,
          platform: account.platform,
          success: false,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    return new Response(JSON.stringify({ refreshed: results.filter((r) => r.success).length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Token refresh error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function refreshMetaToken(account: any) {
  const META_APP_ID = Deno.env.get("META_APP_ID")!;
  const META_APP_SECRET = Deno.env.get("META_APP_SECRET")!;

  // Exchange existing long-lived token for a new long-lived token
  const res = await fetch(
    `https://graph.facebook.com/v21.0/oauth/access_token?` +
    `grant_type=fb_exchange_token` +
    `&client_id=${META_APP_ID}` +
    `&client_secret=${META_APP_SECRET}` +
    `&fb_exchange_token=${account.access_token}`
  );
  const data = await res.json();

  if (data.error) {
    throw new Error(data.error.message);
  }

  const newExpiry = new Date(Date.now() + (data.expires_in || 5184000) * 1000).toISOString();

  const { error: updateError } = await supabase
    .from("social_accounts")
    .update({
      access_token: data.access_token,
      token_expiry: newExpiry,
      status: "connected",
      updated_at: new Date().toISOString(),
    })
    .eq("id", account.id);

  if (updateError) throw updateError;

  return { id: account.id, platform: account.platform, success: true, new_expiry: newExpiry };
}

async function refreshLinkedInToken(account: any) {
  const LINKEDIN_CLIENT_ID = Deno.env.get("LINKEDIN_CLIENT_ID")!;
  const LINKEDIN_CLIENT_SECRET = Deno.env.get("LINKEDIN_CLIENT_SECRET")!;

  if (!account.refresh_token) {
    // LinkedIn tokens without refresh_token can't be refreshed — mark expired if past expiry
    if (new Date(account.token_expiry) < new Date()) {
      await supabase
        .from("social_accounts")
        .update({ status: "expired", updated_at: new Date().toISOString() })
        .eq("id", account.id);
      return { id: account.id, platform: "linkedin", success: false, error: "No refresh token available" };
    }
    return { id: account.id, platform: "linkedin", success: true, note: "Token still valid, no refresh needed" };
  }

  const res = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: account.refresh_token,
      client_id: LINKEDIN_CLIENT_ID,
      client_secret: LINKEDIN_CLIENT_SECRET,
    }),
  });
  const data = await res.json();

  if (data.error) {
    throw new Error(data.error_description || data.error);
  }

  const newExpiry = new Date(Date.now() + (data.expires_in || 5184000) * 1000).toISOString();

  const { error: updateError } = await supabase
    .from("social_accounts")
    .update({
      access_token: data.access_token,
      refresh_token: data.refresh_token || account.refresh_token,
      token_expiry: newExpiry,
      status: "connected",
      updated_at: new Date().toISOString(),
    })
    .eq("id", account.id);

  if (updateError) throw updateError;

  return { id: account.id, platform: "linkedin", success: true, new_expiry: newExpiry };
}
