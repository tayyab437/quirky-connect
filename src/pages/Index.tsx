import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Plus, Bot, BarChart3, Calendar, Zap, ArrowRight, Clock, BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Blog {
  id: string;
  title: string;
  excerpt: string | null;
  cover_image: string | null;
  created_at: string;
}

interface ScheduledPost {
  id: string;
  content: string | null;
  platforms: string[] | null;
  scheduled_time: string;
}

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ accounts: 0, posts: 0, drafts: 0 });
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);

  useEffect(() => {
    // Load published blogs (public)
    (supabase.from as any)("blogs")
      .select("id, title, excerpt, cover_image, created_at")
      .eq("published", true)
      .order("created_at", { ascending: false })
      .limit(4)
      .then(({ data }: any) => {
        if (data) setBlogs(data);
      });
  }, []);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      const [accounts, posts, drafts, scheduled] = await Promise.all([
        supabase.from("social_accounts").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "connected"),
        supabase.from("posts").select("id", { count: "exact", head: true }).eq("user_id", user.id).in("status", ["published", "scheduled"]),
        supabase.from("posts").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "draft"),
        supabase.from("posts").select("id, content, platforms, scheduled_time").eq("user_id", user.id).eq("status", "scheduled").order("scheduled_time", { ascending: true }).limit(5),
      ]);
      setStats({
        accounts: accounts.count ?? 0,
        posts: posts.count ?? 0,
        drafts: drafts.count ?? 0,
      });
      if (scheduled.data) setScheduledPosts(scheduled.data as ScheduledPost[]);
    };
    fetchData();
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
    <div className="px-4 pt-6 pb-4 max-w-lg mx-auto space-y-6">
      {/* Header */}
      <div>
        <p className="text-muted-foreground text-sm">Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"},</p>
        <h1 className="text-2xl font-heading font-bold text-foreground">{firstName} 👋</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
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
      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">Quick Actions</h2>
        <div className="space-y-3">
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
      </div>

      {/* Scheduled Posts */}
      {scheduledPosts.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide flex items-center gap-2">
            <Clock className="w-4 h-4" /> Upcoming Posts
          </h2>
          <div className="space-y-2">
            {scheduledPosts.map((post) => (
              <Card key={post.id} className="p-3 shadow-card">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-warning/15 flex items-center justify-center shrink-0">
                    <Calendar className="w-4 h-4 text-warning" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground line-clamp-1">{post.content || "No content"}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(post.scheduled_time), "MMM d, h:mm a")}
                      </span>
                      {post.platforms?.map(p => (
                        <Badge key={p} variant="secondary" className="text-[10px] px-1.5 py-0 capitalize">{p}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Blog Section */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide flex items-center gap-2">
          <BookOpen className="w-4 h-4" /> Latest Updates
        </h2>
        {blogs.length > 0 ? (
          <div className="space-y-3">
            {blogs.map((blog, i) => (
              <motion.div
                key={blog.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * i }}
              >
                <Card className="overflow-hidden shadow-card hover:shadow-elevated transition-shadow">
                  {blog.cover_image && (
                    <img src={blog.cover_image} alt={blog.title} className="w-full h-32 object-cover" />
                  )}
                  <div className="p-4">
                    <h3 className="font-heading font-semibold text-foreground text-sm mb-1">{blog.title}</h3>
                    {blog.excerpt && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{blog.excerpt}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-2">
                      {format(new Date(blog.created_at), "MMM d, yyyy")}
                    </p>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="bg-card rounded-xl p-6 shadow-card text-center">
            <BookOpen className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No updates yet</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
