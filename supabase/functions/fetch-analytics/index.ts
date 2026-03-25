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

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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
        if (account.platform === "facebook") {
          const analytics = await fetchFacebookAnalytics(account.access_token, account.platform_user_id);
          results.push({ platform: "facebook", ...analytics, account_name: account.account_name });
        } else if (account.platform === "instagram") {
          const analytics = await fetchInstagramAnalytics(account.access_token, account.platform_user_id);
          results.push({ platform: "instagram", ...analytics, account_name: account.account_name });
        } else if (account.platform === "linkedin") {
          const analytics = await fetchLinkedInAnalytics(account.access_token, account.platform_user_id);
          results.push({ platform: "linkedin", ...analytics, account_name: account.account_name });
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

// ─── Facebook ───────────────────────────────────────────────────────────
// Try Page-level insights first (requires pages_read_engagement),
// then fall back to user feed posts with engagement summaries.
async function fetchFacebookAnalytics(accessToken: string, platformUserId: string | null) {
  const stats = { likes: 0, comments: 0, shares: 0, reach: 0, impressions: 0 };
  if (!accessToken || !platformUserId) return stats;

  // 1) Try to get Pages managed by the user
  try {
    const pagesRes = await fetch(
      `https://graph.facebook.com/v21.0/${platformUserId}/accounts?fields=id,name,access_token&access_token=${accessToken}`
    );
    const pagesData = await pagesRes.json();
    console.log("FB pages response:", JSON.stringify(pagesData).slice(0, 500));

    if (pagesData.data && pagesData.data.length > 0) {
      // Use the first page
      const page = pagesData.data[0];
      const pageToken = page.access_token;
      const pageId = page.id;

      // Page-level insights (last 28 days)
      const insightsRes = await fetch(
        `https://graph.facebook.com/v21.0/${pageId}/insights?metric=page_impressions,page_engaged_users,page_post_engagements&period=days_28&access_token=${pageToken}`
      );
      const insightsData = await insightsRes.json();
      console.log("FB page insights:", JSON.stringify(insightsData).slice(0, 500));

      if (insightsData.data) {
        for (const metric of insightsData.data) {
          const value = metric.values?.[metric.values.length - 1]?.value ?? 0;
          if (metric.name === "page_impressions") stats.impressions = value;
          if (metric.name === "page_engaged_users") stats.reach = value;
          if (metric.name === "page_post_engagements") stats.likes = value;
        }
      }

      // Page posts with engagement
      const postsRes = await fetch(
        `https://graph.facebook.com/v21.0/${pageId}/posts?fields=likes.summary(true),comments.summary(true),shares&limit=25&access_token=${pageToken}`
      );
      const postsData = await postsRes.json();
      console.log("FB page posts count:", postsData.data?.length ?? 0);

      if (postsData.data) {
        let totalLikes = 0, totalComments = 0, totalShares = 0;
        for (const post of postsData.data) {
          totalLikes += post.likes?.summary?.total_count ?? 0;
          totalComments += post.comments?.summary?.total_count ?? 0;
          totalShares += post.shares?.count ?? 0;
        }
        stats.likes = totalLikes;
        stats.comments = totalComments;
        stats.shares = totalShares;
      }

      return stats;
    }
  } catch (err) {
    console.error("FB pages fetch error:", err);
  }

  // 2) Fallback: try user feed (requires user_posts permission)
  try {
    const feedRes = await fetch(
      `https://graph.facebook.com/v21.0/${platformUserId}/feed?fields=likes.summary(true),comments.summary(true),shares&limit=25&access_token=${accessToken}`
    );
    const feedData = await feedRes.json();
    console.log("FB feed response:", JSON.stringify(feedData).slice(0, 500));

    if (feedData.data) {
      for (const post of feedData.data) {
        stats.likes += post.likes?.summary?.total_count ?? 0;
        stats.comments += post.comments?.summary?.total_count ?? 0;
        stats.shares += post.shares?.count ?? 0;
      }
      stats.reach = feedData.data.length;
      stats.impressions = stats.likes + stats.comments + stats.shares;
    }

    if (feedData.error) {
      console.error("FB feed API error:", feedData.error.message);
      throw new Error(feedData.error.message);
    }
  } catch (err) {
    console.error("FB feed fetch error:", err);
  }

  return stats;
}

// ─── Instagram ──────────────────────────────────────────────────────────
// Tries Instagram Business/Creator account via Facebook Pages.
// Requires instagram_basic + pages_show_list permissions.
async function fetchInstagramAnalytics(accessToken: string, platformUserId: string | null) {
  const stats = { likes: 0, comments: 0, shares: 0, reach: 0, impressions: 0 };
  if (!accessToken || !platformUserId) return stats;

  try {
    // 1) Get pages and find connected IG account
    const pagesRes = await fetch(
      `https://graph.facebook.com/v21.0/${platformUserId}/accounts?fields=id,instagram_business_account{id,username,followers_count,media_count}&access_token=${accessToken}`
    );
    const pagesData = await pagesRes.json();
    console.log("IG pages response:", JSON.stringify(pagesData).slice(0, 500));

    let igAccountId: string | null = null;

    if (pagesData.data) {
      for (const page of pagesData.data) {
        if (page.instagram_business_account?.id) {
          igAccountId = page.instagram_business_account.id;
          break;
        }
      }
    }

    if (igAccountId) {
      // 2) Fetch recent media with engagement
      const mediaRes = await fetch(
        `https://graph.facebook.com/v21.0/${igAccountId}/media?fields=like_count,comments_count,timestamp&limit=25&access_token=${accessToken}`
      );
      const mediaData = await mediaRes.json();
      console.log("IG media count:", mediaData.data?.length ?? 0);

      if (mediaData.data) {
        for (const m of mediaData.data) {
          stats.likes += m.like_count ?? 0;
          stats.comments += m.comments_count ?? 0;
        }
        stats.reach = mediaData.data.length;
        stats.impressions = stats.likes + stats.comments;
      }

      // 3) Try insights (requires instagram_manage_insights)
      try {
        const insightsRes = await fetch(
          `https://graph.facebook.com/v21.0/${igAccountId}/insights?metric=impressions,reach&period=day&since=${Math.floor(Date.now() / 1000) - 86400 * 28}&until=${Math.floor(Date.now() / 1000)}&access_token=${accessToken}`
        );
        const insightsData = await insightsRes.json();
        console.log("IG insights:", JSON.stringify(insightsData).slice(0, 300));

        if (insightsData.data) {
          for (const metric of insightsData.data) {
            const total = (metric.values || []).reduce((sum: number, v: any) => sum + (v.value ?? 0), 0);
            if (metric.name === "impressions") stats.impressions = total;
            if (metric.name === "reach") stats.reach = total;
          }
        }
      } catch (insErr) {
        console.log("IG insights not available (may need instagram_manage_insights):", insErr);
      }

      return stats;
    }

    // No IG Business account found — log it
    console.log("No Instagram Business account found via Pages API. User may need to link IG to a Facebook Page.");
  } catch (err) {
    console.error("IG fetch error:", err);
  }

  return stats;
}

// ─── LinkedIn ───────────────────────────────────────────────────────────
// Uses Community Management API (new) or falls back to legacy UGC Posts.
async function fetchLinkedInAnalytics(accessToken: string, platformUserId: string | null) {
  const stats = { likes: 0, comments: 0, shares: 0, reach: 0, impressions: 0 };
  if (!accessToken || !platformUserId) return stats;

  const headers = { Authorization: `Bearer ${accessToken}` };

  // 1) Try Community Management API (posts endpoint)
  try {
    const postsRes = await fetch(
      `https://api.linkedin.com/rest/posts?q=author&author=urn%3Ali%3Aperson%3A${platformUserId}&count=25`,
      {
        headers: {
          ...headers,
          "LinkedIn-Version": "202401",
          "X-Restli-Protocol-Version": "2.0.0",
        },
      }
    );
    const postsData = await postsRes.json();
    console.log("LI posts response status:", postsRes.status, "elements:", postsData.elements?.length ?? 0);

    if (postsData.elements && postsData.elements.length > 0) {
      stats.reach = postsData.elements.length;

      // Fetch social actions (likes/comments) for each post
      for (const post of postsData.elements) {
        const postUrn = post.id || post.urn;
        if (!postUrn) continue;

        try {
          // Get likes count
          const likesRes = await fetch(
            `https://api.linkedin.com/rest/socialActions/${encodeURIComponent(postUrn)}/likes?count=0`,
            {
              headers: {
                ...headers,
                "LinkedIn-Version": "202401",
                "X-Restli-Protocol-Version": "2.0.0",
              },
            }
          );
          const likesData = await likesRes.json();

          // Get comments count
          const commentsRes = await fetch(
            `https://api.linkedin.com/rest/socialActions/${encodeURIComponent(postUrn)}/comments?count=0`,
            {
              headers: {
                ...headers,
                "LinkedIn-Version": "202401",
                "X-Restli-Protocol-Version": "2.0.0",
              },
            }
          );
          const commentsData = await commentsRes.json();

          stats.likes += likesData.paging?.total ?? 0;
          stats.comments += commentsData.paging?.total ?? 0;
        } catch (actionErr) {
          console.log("LI social actions error for post:", postUrn, actionErr);
        }
      }

      stats.impressions = stats.likes + stats.comments + stats.shares;
      return stats;
    }
  } catch (err) {
    console.error("LI Community API error:", err);
  }

  // 2) Fallback: legacy ugcPosts
  try {
    const ugcRes = await fetch(
      `https://api.linkedin.com/v2/ugcPosts?q=authors&authors=List(urn%3Ali%3Aperson%3A${platformUserId})&count=25`,
      { headers }
    );
    const ugcData = await ugcRes.json();
    console.log("LI ugcPosts status:", ugcRes.status, "elements:", ugcData.elements?.length ?? 0);

    if (ugcData.elements) {
      stats.reach = ugcData.elements.length;

      for (const post of ugcData.elements) {
        const activity = post.id;
        if (!activity) continue;

        try {
          const socialRes = await fetch(
            `https://api.linkedin.com/v2/socialActions/${encodeURIComponent(activity)}`,
            { headers }
          );
          const socialData = await socialRes.json();
          console.log("LI socialActions for", activity, ":", JSON.stringify(socialData).slice(0, 200));

          stats.likes += socialData.likesSummary?.totalLikes ?? 0;
          stats.comments += socialData.commentsSummary?.totalFirstLevelComments ?? 0;
        } catch (socialErr) {
          console.log("LI socialActions error:", socialErr);
        }
      }

      stats.impressions = stats.likes + stats.comments;
    }
  } catch (err) {
    console.error("LI ugcPosts error:", err);
  }

  return stats;
}
