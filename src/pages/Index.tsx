import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Plus, Bot, BarChart3, Calendar, Zap, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ accounts: 0, posts: 0, drafts: 0 });

  useEffect(() => {
    if (!user) return;
    const fetchStats = async () => {
      const [accounts, posts, drafts] = await Promise.all([
        supabase.from("social_accounts").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "connected"),
        supabase.from("posts").select("id", { count: "exact", head: true }).eq("user_id", user.id).in("status", ["published", "scheduled"]),
        supabase.from("posts").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "draft"),
      ]);
      setStats({
        accounts: accounts.count ?? 0,
        posts: posts.count ?? 0,
        drafts: drafts.count ?? 0,
      });
    };
    fetchStats();
  }, [user]);

  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || "there";

  const quickActions = [
    { icon: Plus, label: "Create Post", path: "/create", gradient: "gradient-primary" },
    { icon: Bot, label: "AI Agent", path: "/agents", gradient: "gradient-accent" },
    { icon: BarChart3, label: "Analytics", path: "/analytics", gradient: "gradient-warm" },
  ];

  const statCards = [
    { label: "Connected", value: stats.accounts, icon: Zap },
    { label: "Posts", value: stats.posts, icon: Calendar },
    { label: "Drafts", value: stats.drafts, icon: Sparkles },
  ];

  return (
    <div className="px-4 pt-6 pb-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="mb-6">
        <p className="text-muted-foreground text-sm">Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"},</p>
        <h1 className="text-2xl font-heading font-bold text-foreground">{firstName} 👋</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {statCards.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-card rounded-xl p-3 shadow-card text-center"
          >
            <s.icon className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-xl font-heading font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <h2 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">Quick Actions</h2>
      <div className="space-y-3 mb-6">
        {quickActions.map((action, i) => (
          <motion.button
            key={action.label}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + i * 0.1 }}
            onClick={() => navigate(action.path)}
            className="w-full flex items-center gap-4 bg-card rounded-xl p-4 shadow-card hover:shadow-elevated transition-shadow"
          >
            <div className={`w-10 h-10 rounded-lg ${action.gradient} flex items-center justify-center`}>
              <action.icon className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="flex-1 text-left font-medium text-foreground">{action.label}</span>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
          </motion.button>
        ))}
      </div>

      {/* Recent Activity Placeholder */}
      <h2 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">Recent Activity</h2>
      <div className="bg-card rounded-xl p-6 shadow-card text-center">
        <Sparkles className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Create your first post to see activity here</p>
      </div>
    </div>
  );
};

export default Index;
