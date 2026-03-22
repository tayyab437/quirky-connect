import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, TrendingUp, Heart, MessageCircle, Share2, Eye } from "lucide-react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface AnalyticsData {
  platform: string;
  likes: number;
  comments: number;
  shares: number;
  reach: number;
  impressions: number;
}

const AnalyticsPage = () => {
  const { user } = useAuth();
  const [data, setData] = useState<AnalyticsData[]>([]);
  const [postCount, setPostCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetchAnalytics = async () => {
      const { count } = await supabase
        .from("posts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);
      setPostCount(count ?? 0);

      // Aggregate analytics by platform
      const { data: analytics } = await supabase
        .from("post_analytics")
        .select("*, posts!inner(user_id)")
        .eq("posts.user_id", user.id);

      if (analytics && analytics.length > 0) {
        const grouped = analytics.reduce((acc: Record<string, AnalyticsData>, row: any) => {
          if (!acc[row.platform]) {
            acc[row.platform] = { platform: row.platform, likes: 0, comments: 0, shares: 0, reach: 0, impressions: 0 };
          }
          acc[row.platform].likes += row.likes ?? 0;
          acc[row.platform].comments += row.comments ?? 0;
          acc[row.platform].shares += row.shares ?? 0;
          acc[row.platform].reach += row.reach ?? 0;
          acc[row.platform].impressions += row.impressions ?? 0;
          return acc;
        }, {});
        setData(Object.values(grouped));
      }
    };
    fetchAnalytics();
  }, [user]);

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
      <h1 className="text-2xl font-heading font-bold text-foreground mb-2">Analytics</h1>
      <p className="text-muted-foreground text-sm mb-6">{postCount} total posts</p>

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
            <p className="text-2xl font-heading font-bold text-foreground">{m.value}</p>
            <p className="text-xs text-muted-foreground">{m.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Chart */}
      {data.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-card rounded-xl p-4 shadow-card"
        >
          <h2 className="text-sm font-medium text-foreground mb-4">Engagement by Platform</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="platform" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip />
              <Bar dataKey="likes" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="comments" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      ) : (
        <div className="bg-card rounded-xl p-8 shadow-card text-center">
          <BarChart3 className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No analytics data yet. Publish posts to see insights.</p>
        </div>
      )}
    </div>
  );
};

export default AnalyticsPage;
