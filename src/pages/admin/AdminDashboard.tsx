import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, Share2, BarChart3, MessageSquare } from "lucide-react";

export default function AdminDashboard() {
  const [stats, setStats] = useState({ users: 0, posts: 0, accounts: 0, chats: 0, analytics: 0 });

  useEffect(() => {
    async function load() {
      const [profiles, posts, accounts, chats, analytics] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("posts").select("id", { count: "exact", head: true }),
        supabase.from("social_accounts").select("id", { count: "exact", head: true }),
        supabase.from("ai_chats").select("id", { count: "exact", head: true }),
        supabase.from("post_analytics").select("id", { count: "exact", head: true }),
      ]);
      setStats({
        users: profiles.count || 0,
        posts: posts.count || 0,
        accounts: accounts.count || 0,
        chats: chats.count || 0,
        analytics: analytics.count || 0,
      });
    }
    load();
  }, []);

  const cards = [
    { label: "Total Users", value: stats.users, icon: Users },
    { label: "Total Posts", value: stats.posts, icon: FileText },
    { label: "Social Accounts", value: stats.accounts, icon: Share2 },
    { label: "AI Chats", value: stats.chats, icon: MessageSquare },
    { label: "Analytics Records", value: stats.analytics, icon: BarChart3 },
  ];

  return (
    <div>
      <h1 className="text-2xl font-heading font-bold text-foreground mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => (
          <Card key={c.label} className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
              <c.icon className="w-5 h-5 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold font-heading text-foreground">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
