import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CALLBACK_URL = `${SUPABASE_URL}/functions/v1/social-oauth-callback`;

// Use service role to write to social_accounts on behalf of the user
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  // Build a redirect back to the app's profile page
  const appBaseUrl = Deno.env.get("APP_URL") || "https://id-preview--adbe414d-0958-4798-ae31-e1c21fa39612.lovable.app";

  if (error || !code || !stateParam) {
    console.error("OAuth callback error:", error || "Missing code/state");
    return Response.redirect(`${appBaseUrl}/profile?oauth_error=${encodeURIComponent(error || "missing_params")}`, 302);
  }

  try {
    const { user_id, platform } = JSON.parse(atob(decodeURIComponent(stateParam)));

    let accessToken: string;
    let refreshToken: string | null = null;
    let expiresIn: number | null = null;
    let accountName: string | null = null;
    let platformUserId: string | null = null;

    if (platform === "facebook" || platform === "instagram") {
      const META_APP_ID = Deno.env.get("META_APP_ID")!;
      const META_APP_SECRET = Deno.env.get("META_APP_SECRET")!;

      // Exchange code for short-lived token
      const tokenRes = await fetch(
        `https://graph.facebook.com/v21.0/oauth/access_token?` +
        `client_id=${META_APP_ID}` +
        `&redirect_uri=${encodeURIComponent(CALLBACK_URL)}` +
        `&client_secret=${META_APP_SECRET}` +
        `&code=${code}`
      );
      const tokenData = await tokenRes.json();
      if (tokenData.error) throw new Error(tokenData.error.message);

      // Exchange for long-lived token
      const longRes = await fetch(
        `https://graph.facebook.com/v21.0/oauth/access_token?` +
        `grant_type=fb_exchange_token` +
        `&client_id=${META_APP_ID}` +
        `&client_secret=${META_APP_SECRET}` +
        `&fb_exchange_token=${tokenData.access_token}`
      );
      const longData = await longRes.json();
      accessToken = longData.access_token || tokenData.access_token;
      expiresIn = longData.expires_in || tokenData.expires_in || 5184000; // ~60 days

      // Get user info
      const meRes = await fetch(`https://graph.facebook.com/v21.0/me?fields=id,name&access_token=${accessToken}`);
      const meData = await meRes.json();
      platformUserId = meData.id;
      accountName = meData.name;

    } else {
      // LinkedIn
      const LINKEDIN_CLIENT_ID = Deno.env.get("LINKEDIN_CLIENT_ID")!;
      const LINKEDIN_CLIENT_SECRET = Deno.env.get("LINKEDIN_CLIENT_SECRET")!;

      const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: CALLBACK_URL,
          client_id: LINKEDIN_CLIENT_ID,
          client_secret: LINKEDIN_CLIENT_SECRET,
        }),
      });
      const tokenData = await tokenRes.json();
      if (tokenData.error) throw new Error(tokenData.error_description || tokenData.error);

      accessToken = tokenData.access_token;
      refreshToken = tokenData.refresh_token || null;
      expiresIn = tokenData.expires_in || 5184000;

      // Get LinkedIn profile
      const profileRes = await fetch("https://api.linkedin.com/v2/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const profileData = await profileRes.json();
      platformUserId = profileData.sub;
      accountName = profileData.name;
    }

    const tokenExpiry = expiresIn
      ? new Date(Date.now() + expiresIn * 1000).toISOString()
      : null;

    // Upsert social account
    const { error: dbError } = await supabase
      .from("social_accounts")
      .upsert(
        {
          user_id,
          platform,
          access_token: accessToken,
          refresh_token: refreshToken,
          platform_user_id: platformUserId,
          account_name: accountName,
          token_expiry: tokenExpiry,
          status: "connected",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,platform" }
      );

    if (dbError) {
      console.error("DB upsert error:", dbError);
      throw new Error(dbError.message);
    }

    return Response.redirect(`${appBaseUrl}/profile?oauth_success=${platform}`, 302);
  } catch (err) {
    console.error("OAuth callback processing error:", err);
    const msg = err instanceof Error ? err.message : "unknown";
    return Response.redirect(`${appBaseUrl}/profile?oauth_error=${encodeURIComponent(msg)}`, 302);
  }
});
