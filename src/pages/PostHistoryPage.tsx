import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, Clock, CheckCircle2, AlertTriangle, FileEdit, Image } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";

type Post = Tables<"posts">;
type StatusFilter = "all" | "draft" | "scheduled" | "published" | "failed";

const statusConfig: Record<string, { label: string; icon: typeof Clock; className: string }> = {
  draft: { label: "Draft", icon: FileEdit, className: "bg-muted text-muted-foreground" },
  ready: { label: "Ready", icon: Clock, className: "bg-info/15 text-info" },
  scheduled: { label: "Scheduled", icon: Clock, className: "bg-warning/15 text-warning" },
  published: { label: "Published", icon: CheckCircle2, className: "bg-success/15 text-success" },
  failed: { label: "Failed", icon: AlertTriangle, className: "bg-destructive/15 text-destructive" },
};

function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || statusConfig.draft;
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${config.className}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

function PostCard({ post, onRetry, retrying }: { post: Post; onRetry: (id: string) => void; retrying: boolean }) {
  const platformList = post.platforms?.length ? post.platforms.join(", ") : "No platforms";
  const date = post.published_at || post.scheduled_time || post.created_at;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.15 }}
    >
      <Card className="p-4 space-y-3 shadow-card">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-foreground line-clamp-2">
              {post.content || <span className="text-muted-foreground italic">No content</span>}
            </p>
          </div>
          {post.media_url && (
            <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0">
              <img src={post.media_url} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              <Image className="w-5 h-5 text-muted-foreground" />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={post.status} />
          <span className="text-xs text-muted-foreground">{platformList}</span>
          <span className="text-xs text-muted-foreground ml-auto">
            {format(new Date(date), "MMM d, h:mm a")}
          </span>
        </div>

        {post.status === "failed" && (
          <div className="space-y-2">
            {post.error_message && (
              <p className="text-xs text-destructive bg-destructive/10 rounded-md px-3 py-2">
                {post.error_message}
              </p>
            )}
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs"
              onClick={() => onRetry(post.id)}
              disabled={retrying}
            >
              <RefreshCw className={`w-3 h-3 ${retrying ? "animate-spin" : ""}`} />
              Retry
            </Button>
          </div>
        )}

        {post.hashtags && post.hashtags.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {post.hashtags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[10px] px-2 py-0">
                #{tag}
              </Badge>
            ))}
          </div>
        )}
      </Card>
    </motion.div>
  );
}

export default function PostHistoryPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["posts", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Post[];
    },
    enabled: !!user,
  });

  const filtered = filter === "all" ? posts : posts.filter((p) => p.status === filter);

  const handleRetry = async (postId: string) => {
    setRetryingId(postId);
    try {
      const { error } = await supabase.functions.invoke("publish-post", {
        body: { post_id: postId },
      });
      if (error) throw error;
      toast({ title: "Post re-published successfully! 🎉" });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    } catch (err: any) {
      toast({ title: "Retry failed", description: err.message, variant: "destructive" });
    } finally {
      setRetryingId(null);
    }
  };

  const counts = {
    all: posts.length,
    draft: posts.filter((p) => p.status === "draft").length,
    scheduled: posts.filter((p) => p.status === "scheduled").length,
    published: posts.filter((p) => p.status === "published").length,
    failed: posts.filter((p) => p.status === "failed").length,
  };

  return (
    <div className="px-4 pt-6 pb-4 max-w-lg mx-auto">
      <h1 className="text-2xl font-heading font-bold text-foreground mb-4">Post History</h1>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as StatusFilter)} className="mb-4">
        <TabsList className="w-full grid grid-cols-5 h-9">
          {(["all", "draft", "scheduled", "published", "failed"] as StatusFilter[]).map((s) => (
            <TabsTrigger key={s} value={s} className="text-xs px-1">
              {s === "all" ? "All" : statusConfig[s]?.label || s}
              {counts[s] > 0 && (
                <span className="ml-1 text-[10px] opacity-70">({counts[s]})</span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-sm">No {filter === "all" ? "" : filter} posts yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filtered.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onRetry={handleRetry}
                retrying={retryingId === post.id}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
