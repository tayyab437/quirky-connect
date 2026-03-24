import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { BarChart3, TrendingUp, Heart, MessageCircle, Share2, Eye, RefreshCw, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Button } from "@/components/ui/button";

interface PlatformAnalytics {
  platform: string;
  account_name?: string;
  likes: number;
  comments: number;
  shares: number;
  reach: number;
  impressions: number;
  error?: string;
}

const platformEmoji: Record<string, string> = {
  facebook: "📘",
  instagram: "📸",
  linkedin: "💼",
};

const AnalyticsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState<PlatformAnalytics[]>([]);
  const [postCount, setPostCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const fetchPostCount = useCallback(async () => {
    if (!user) return;
    const { count } = await supabase
      .from("posts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);
    setPostCount(count ?? 0);
  }, [user]);

  const fetchLiveAnalytics = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("fetch-analytics");
      if (error) throw error;
      if (result?.analytics) {
        setData(result.analytics);
        setLastFetched(new Date());
        // Show errors from individual platforms
        const errors = result.analytics.filter((a: PlatformAnalytics) => a.error);
        if (errors.length > 0) {
          toast({
            title: "Some platforms had issues",
            description: errors.map((e: PlatformAnalytics) => `${e.platform}: ${e.error}`).join("; "),
            variant: "destructive",
          });
        }
      }
    } catch (err: any) {
      toast({ title: "Failed to fetch analytics", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchPostCount();
    fetchLiveAnalytics();
  }, [fetchPostCount, fetchLiveAnalytics]);

  const totalLikes = data.reduce((s, d) => s + d.likes, 0);
  const totalComments = data.reduce((s, d) => s + d.comments, 0);
  const totalShares = data.reduce((s, d) => s + d.shares, 0);
  const totalReach = data.reduce((s, d) => s + d.reach, 0);

  const metrics = [
    { label: "Likes", value: totalLikes, icon: Heart, color: "text-destructive" },
    { label: "Comments", value: totalComments, icon: MessageCircle, color: "text-info" },
    { label: "Shares", value: totalShares, icon: Share2, color: "text-success" },
    { label: "Reach", value: totalReach, icon: Eye, color: "text-warning" },
  ];

  return (
    <div className="px-4 pt-6 pb-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-heading font-bold text-foreground">Analytics</h1>
        <Button
          variant="ghost"
          size="icon"
          onClick={fetchLiveAnalytics}
          disabled={loading}
          className="h-9 w-9"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          ) : (
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
          )}
        </Button>
      </div>
      <p className="text-muted-foreground text-sm mb-1">{postCount} total posts</p>
      {lastFetched && (
        <p className="text-muted-foreground text-xs mb-6">
          Last updated: {lastFetched.toLocaleTimeString()}
        </p>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {metrics.map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-card rounded-xl p-4 shadow-card"
          >
            <m.icon className={`w-5 h-5 ${m.color} mb-2`} />
            <p className="text-2xl font-heading font-bold text-foreground">
              {loading ? "—" : m.value.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">{m.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Platform Breakdown */}
      {data.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-2 mb-6"
        >
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> Platform Breakdown
          </h2>
          {data.map((platform) => (
            <div key={platform.platform} className="bg-card rounded-xl p-4 shadow-card">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">{platformEmoji[platform.platform] ?? "🌐"}</span>
                <div className="flex-1">
                  <p className="font-medium text-foreground text-sm capitalize">{platform.platform}</p>
                  <p className="text-xs text-muted-foreground">{platform.account_name ?? "Connected"}</p>
                </div>
                {platform.error && (
                  <span className="text-xs text-destructive">Limited data</span>
                )}
              </div>
              <div className="grid grid-cols-4 gap-2 text-center">
                {[
                  { label: "Likes", value: platform.likes },
                  { label: "Comments", value: platform.comments },
                  { label: "Shares", value: platform.shares },
                  { label: "Reach", value: platform.reach },
                ].map((stat) => (
                  <div key={stat.label}>
                    <p className="text-lg font-heading font-bold text-foreground">{stat.value.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {/* Chart */}
      {data.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-card rounded-xl p-4 shadow-card"
        >
          <h2 className="text-sm font-medium text-foreground mb-4">Engagement by Platform</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="platform" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="likes" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Likes" />
              <Bar dataKey="comments" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} name="Comments" />
              <Bar dataKey="shares" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} name="Shares" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      ) : !loading ? (
        <div className="bg-card rounded-xl p-8 shadow-card text-center">
          <BarChart3 className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No analytics data yet.</p>
          <p className="text-xs text-muted-foreground mt-1">Connect accounts and publish posts to see insights.</p>
        </div>
      ) : null}
    </div>
  );
};

export default AnalyticsPage;
