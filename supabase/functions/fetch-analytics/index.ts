import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role to read tokens and write analytics
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get connected social accounts
    const { data: accounts, error: accError } = await adminClient
      .from("social_accounts")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "connected");

    if (accError) throw accError;
    if (!accounts || accounts.length === 0) {
      return new Response(JSON.stringify({ message: "No connected accounts", analytics: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: any[] = [];

    for (const account of accounts) {
      try {
        if (account.platform === "facebook" || account.platform === "instagram") {
          const fbAnalytics = await fetchFacebookAnalytics(account.access_token, account.platform_user_id);
          results.push({ platform: account.platform, ...fbAnalytics, account_name: account.account_name });
        } else if (account.platform === "linkedin") {
          const liAnalytics = await fetchLinkedInAnalytics(account.access_token, account.platform_user_id);
          results.push({ platform: "linkedin", ...liAnalytics, account_name: account.account_name });
        }
      } catch (platformErr) {
        console.error(`Error fetching ${account.platform} analytics:`, platformErr);
        results.push({
          platform: account.platform,
          account_name: account.account_name,
          likes: 0, comments: 0, shares: 0, reach: 0, impressions: 0,
          error: platformErr instanceof Error ? platformErr.message : "Unknown error",
        });
      }
    }

    return new Response(JSON.stringify({ analytics: results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Fetch analytics error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function fetchFacebookAnalytics(accessToken: string, platformUserId: string | null) {
  const stats = { likes: 0, comments: 0, shares: 0, reach: 0, impressions: 0 };

  if (!accessToken || !platformUserId) return stats;

  try {
    // Fetch user's recent posts with engagement metrics
    const postsRes = await fetch(
      `https://graph.facebook.com/v21.0/${platformUserId}/posts?fields=id,message,created_time,likes.summary(true),comments.summary(true),shares&limit=25&access_token=${accessToken}`
    );
    const postsData = await postsRes.json();

    if (postsData.error) {
      console.error("Facebook API error:", postsData.error);
      // Return profile-level data if posts fail (limited permissions)
      return stats;
    }

    if (postsData.data) {
      for (const post of postsData.data) {
        stats.likes += post.likes?.summary?.total_count ?? 0;
        stats.comments += post.comments?.summary?.total_count ?? 0;
        stats.shares += post.shares?.count ?? 0;
      }
      stats.reach = postsData.data.length; // Approximate with post count
      stats.impressions = stats.likes + stats.comments + stats.shares; // Engagement-based estimate
    }
  } catch (err) {
    console.error("Facebook fetch error:", err);
  }

  return stats;
}

async function fetchLinkedInAnalytics(accessToken: string, platformUserId: string | null) {
  const stats = { likes: 0, comments: 0, shares: 0, reach: 0, impressions: 0 };

  if (!accessToken || !platformUserId) return stats;

  try {
    // Fetch user's LinkedIn profile info for basic stats
    const profileRes = await fetch(
      "https://api.linkedin.com/v2/userinfo",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const profileData = await profileRes.json();

    if (profileData.error) {
      console.error("LinkedIn API error:", profileData.error);
      return stats;
    }

    // Try to fetch posts/shares from LinkedIn
    // LinkedIn's API is more restrictive - use what's available with current permissions
    try {
      const postsRes = await fetch(
        `https://api.linkedin.com/v2/ugcPosts?q=authors&authors=List(urn%3Ali%3Aperson%3A${platformUserId})&count=25`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const postsData = await postsRes.json();

      if (postsData.elements) {
        stats.reach = postsData.elements.length;
        // LinkedIn doesn't easily expose engagement on UGC posts without additional permissions
        // So we provide the post count as a baseline
      }
    } catch (postsErr) {
      console.error("LinkedIn posts fetch error:", postsErr);
    }
  } catch (err) {
    console.error("LinkedIn fetch error:", err);
  }

  return stats;
}
