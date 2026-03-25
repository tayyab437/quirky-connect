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
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Find all scheduled posts whose scheduled_time has passed
    const now = new Date().toISOString();
    const { data: posts, error: fetchError } = await adminClient
      .from("posts")
      .select("id, user_id")
      .eq("status", "scheduled")
      .lte("scheduled_time", now);

    if (fetchError) throw fetchError;

    if (!posts || posts.length === 0) {
      return new Response(JSON.stringify({ message: "No scheduled posts due", processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Found ${posts.length} scheduled post(s) to publish`);

    const results: any[] = [];

    for (const post of posts) {
      try {
        // Get connected accounts for the post's platforms
        const { data: postData } = await adminClient
          .from("posts")
          .select("*")
          .eq("id", post.id)
          .single();

        if (!postData || !postData.platforms || postData.platforms.length === 0) {
          results.push({ post_id: post.id, success: false, error: "No platforms selected" });
          continue;
        }

        const { data: accounts } = await adminClient
          .from("social_accounts")
          .select("*")
          .eq("user_id", post.user_id)
          .eq("status", "connected")
          .in("platform", postData.platforms);

        if (!accounts || accounts.length === 0) {
          await adminClient.from("posts").update({
            status: "failed",
            error_message: "No connected accounts for selected platforms",
            updated_at: new Date().toISOString(),
          }).eq("id", post.id);
          results.push({ post_id: post.id, success: false, error: "No connected accounts" });
          continue;
        }

        const content = buildPostContent(postData.content, postData.hashtags);
        const publishResults: any[] = [];

        for (const account of accounts) {
          try {
            let result;
            if (account.platform === "facebook") {
              result = await publishToFacebook(account, content, postData.media_url);
            } else if (account.platform === "instagram") {
              result = await publishToInstagram(account, content, postData.media_url);
            } else if (account.platform === "linkedin") {
              result = await publishToLinkedIn(account, content, postData.media_url);
            }
            publishResults.push({ platform: account.platform, success: true, ...result });
          } catch (err) {
            console.error(`Failed to publish post ${post.id} to ${account.platform}:`, err);
            publishResults.push({
              platform: account.platform,
              success: false,
              error: err instanceof Error ? err.message : "Unknown error",
            });
          }
        }

        const anySuccess = publishResults.some((r) => r.success);
        const allSuccess = publishResults.every((r) => r.success);
        const errorMessages = publishResults
          .filter((r) => !r.success)
          .map((r) => `${r.platform}: ${r.error}`)
          .join("; ");

        await adminClient.from("posts").update({
          status: allSuccess ? "published" : anySuccess ? "published" : "failed",
          published_at: anySuccess ? new Date().toISOString() : null,
          error_message: errorMessages || null,
          updated_at: new Date().toISOString(),
        }).eq("id", post.id);

        results.push({ post_id: post.id, success: anySuccess, details: publishResults });
      } catch (err) {
        console.error(`Error processing post ${post.id}:`, err);
        await adminClient.from("posts").update({
          status: "failed",
          error_message: err instanceof Error ? err.message : "Unknown error",
          updated_at: new Date().toISOString(),
        }).eq("id", post.id);
        results.push({ post_id: post.id, success: false, error: err instanceof Error ? err.message : "Unknown error" });
      }
    }

    return new Response(JSON.stringify({ processed: posts.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Scheduled publish error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function buildPostContent(content: string | null, hashtags: string[] | null): string {
  let text = content || "";
  if (hashtags && hashtags.length > 0) {
    const tags = hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ");
    text = text ? `${text}\n\n${tags}` : tags;
  }
  return text;
}

async function publishToFacebook(account: any, message: string, mediaUrl: string | null) {
  const userId = account.platform_user_id;
  const token = account.access_token;

  if (mediaUrl) {
    const res = await fetch(`https://graph.facebook.com/v21.0/${userId}/photos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: mediaUrl, message, access_token: token }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return { post_id: data.id || data.post_id };
  } else {
    const res = await fetch(`https://graph.facebook.com/v21.0/${userId}/feed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, access_token: token }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return { post_id: data.id };
  }
}

async function publishToInstagram(account: any, caption: string, mediaUrl: string | null) {
  const userId = account.platform_user_id;
  const token = account.access_token;

  if (!mediaUrl) throw new Error("Instagram requires an image or video to publish");

  const containerRes = await fetch(`https://graph.facebook.com/v21.0/${userId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image_url: mediaUrl, caption, access_token: token }),
  });
  const containerData = await containerRes.json();
  if (containerData.error) throw new Error(containerData.error.message);

  const publishRes = await fetch(`https://graph.facebook.com/v21.0/${userId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: containerData.id, access_token: token }),
  });
  const publishData = await publishRes.json();
  if (publishData.error) throw new Error(publishData.error.message);

  return { post_id: publishData.id };
}

async function publishToLinkedIn(account: any, text: string, mediaUrl: string | null) {
  const personUrn = `urn:li:person:${account.platform_user_id}`;
  const token = account.access_token;

  const postBody: any = {
    author: personUrn,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: { text },
        shareMediaCategory: mediaUrl ? "IMAGE" : "NONE",
      },
    },
    visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
  };

  if (mediaUrl) {
    const registerRes = await fetch("https://api.linkedin.com/v2/assets?action=registerUpload", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        registerUploadRequest: {
          recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
          owner: personUrn,
          serviceRelationships: [{ relationshipType: "OWNER", identifier: "urn:li:userGeneratedContent" }],
        },
      }),
    });
    const registerData = await registerRes.json();
    if (registerData.serviceErrorCode) throw new Error(registerData.message || "LinkedIn upload registration failed");

    const uploadUrl = registerData.value?.uploadMechanism?.["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"]?.uploadUrl;
    const asset = registerData.value?.asset;

    if (uploadUrl && asset) {
      const imageRes = await fetch(mediaUrl);
      const imageBlob = await imageRes.blob();
      await fetch(uploadUrl, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/octet-stream" },
        body: imageBlob,
      });
      postBody.specificContent["com.linkedin.ugc.ShareContent"].media = [{ status: "READY", media: asset }];
    }
  }

  const res = await fetch("https://api.linkedin.com/v2/ugcPosts", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "X-Restli-Protocol-Version": "2.0.0" },
    body: JSON.stringify(postBody),
  });

  const responseText = await res.text();
  if (!res.ok) {
    let errorMsg = responseText;
    try { const errorData = JSON.parse(responseText); errorMsg = errorData.message || errorData.error || responseText; } catch {}
    throw new Error(errorMsg);
  }

  return { post_id: res.headers.get("x-restli-id") || "published" };
}
