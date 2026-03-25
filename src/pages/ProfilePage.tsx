import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogOut, User, Link2, CheckCircle, AlertCircle, XCircle, Plus, Trash2, Bot, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { useSearchParams, useNavigate } from "react-router-dom";

interface Profile {
  full_name: string | null;
  brand_name: string | null;
  bio: string | null;
}

interface SocialAccount {
  id: string;
  platform: string;
  account_name: string | null;
  status: string;
}

const platformIcons: Record<string, string> = {
  facebook: "📘",
  instagram: "📸",
  linkedin: "💼",
};

const statusIcons: Record<string, typeof CheckCircle> = {
  connected: CheckCircle,
  expired: AlertCircle,
  error: XCircle,
};

const statusColors: Record<string, string> = {
  connected: "text-success",
  expired: "text-warning",
  error: "text-destructive",
};

const availablePlatforms = [
  { id: "facebook", label: "Facebook", icon: "📘" },
  { id: "instagram", label: "Instagram", icon: "📸" },
  { id: "linkedin", label: "LinkedIn", icon: "💼" },
];

const ProfilePage = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [profile, setProfile] = useState<Profile>({ full_name: "", brand_name: "", bio: "" });
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);

  // Handle OAuth redirect results
  useEffect(() => {
    const success = searchParams.get("oauth_success");
    const error = searchParams.get("oauth_error");
    if (success) {
      toast({ title: `${success} connected successfully!` });
      setSearchParams({}, { replace: true });
      loadAccounts();
    }
    if (error) {
      toast({ title: "Connection failed", description: decodeURIComponent(error), variant: "destructive" });
      setSearchParams({}, { replace: true });
    }
  }, [searchParams]);

  const loadAccounts = () => {
    if (!user) return;
    supabase.from("social_accounts").select("*").eq("user_id", user.id).then(({ data }) => {
      setAccounts(data ?? []);
    });
  };

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).single().then(({ data }) => {
      if (data) setProfile({ full_name: data.full_name, brand_name: data.brand_name, bio: data.bio });
    });
    loadAccounts();
  }, [user]);

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update(profile).eq("id", user.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Profile updated!" });
    setSaving(false);
  };

  const connectPlatform = async (platform: string) => {
    setConnecting(platform);
    try {
      const { data, error } = await supabase.functions.invoke("social-oauth-start", {
        body: { platform },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      toast({ title: "Connection failed", description: err.message, variant: "destructive" });
      setConnecting(null);
    }
  };

  const disconnectPlatform = async (accountId: string, platform: string) => {
    const { error } = await supabase.from("social_accounts").delete().eq("id", accountId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `${platform} disconnected` });
      loadAccounts();
    }
  };

  const connectedPlatforms = accounts.map((a) => a.platform);
  const unconnectedPlatforms = availablePlatforms.filter((p) => !connectedPlatforms.includes(p.id));

  return (
    <div className="px-4 pt-6 pb-4 max-w-lg mx-auto">
      <h1 className="text-2xl font-heading font-bold text-foreground mb-6">Profile</h1>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        {/* Avatar & Email */}
        <div className="flex items-center gap-4 bg-card rounded-xl p-4 shadow-card">
          <div className="w-14 h-14 rounded-full gradient-primary flex items-center justify-center">
            <User className="w-7 h-7 text-primary-foreground" />
          </div>
          <div>
            <p className="font-medium text-foreground">{profile.full_name || "User"}</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </div>

        {/* Profile Form */}
        <div className="bg-card rounded-xl p-4 shadow-card space-y-4">
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input value={profile.full_name ?? ""} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Brand Name</Label>
            <Input value={profile.brand_name ?? ""} onChange={(e) => setProfile({ ...profile, brand_name: e.target.value })} placeholder="Your brand or company" />
          </div>
          <div className="space-y-2">
            <Label>Bio</Label>
            <Input value={profile.bio ?? ""} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} placeholder="Tell us about you" />
          </div>
          <Button className="w-full gradient-primary text-primary-foreground" onClick={saveProfile} disabled={saving}>
            Save Changes
          </Button>
        </div>

        {/* Connected Accounts */}
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide flex items-center gap-2">
            <Link2 className="w-4 h-4" /> Connected Accounts
          </h2>

          {/* Existing connections */}
          {accounts.length > 0 && (
            <div className="space-y-2 mb-3">
              {accounts.map((acc) => {
                const StatusIcon = statusIcons[acc.status] ?? AlertCircle;
                return (
                  <div key={acc.id} className="bg-card rounded-xl p-4 shadow-card flex items-center gap-3">
                    <span className="text-2xl">{platformIcons[acc.platform] ?? "🌐"}</span>
                    <div className="flex-1">
                      <p className="font-medium text-foreground text-sm capitalize">{acc.platform}</p>
                      <p className="text-xs text-muted-foreground">{acc.account_name ?? "Unknown"}</p>
                    </div>
                    <StatusIcon className={`w-5 h-5 ${statusColors[acc.status] ?? "text-muted-foreground"}`} />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => disconnectPlatform(acc.id, acc.platform)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Connect new platforms */}
          {unconnectedPlatforms.length > 0 && (
            <div className="space-y-2">
              {unconnectedPlatforms.map((p) => (
                <Button
                  key={p.id}
                  variant="outline"
                  className="w-full justify-start gap-3 h-12"
                  onClick={() => connectPlatform(p.id)}
                  disabled={connecting === p.id}
                >
                  <span className="text-xl">{p.icon}</span>
                  <span className="flex-1 text-left">
                    {connecting === p.id ? "Redirecting..." : `Connect ${p.label}`}
                  </span>
                  <Plus className="w-4 h-4 text-muted-foreground" />
                </Button>
              ))}
            </div>
          )}

          {accounts.length === 0 && unconnectedPlatforms.length === 0 && (
            <div className="bg-card rounded-xl p-6 shadow-card text-center">
              <p className="text-sm text-muted-foreground">All platforms connected!</p>
            </div>
          )}
        </div>

        {/* AI Agents */}
        <Button
          variant="outline"
          className="w-full justify-start gap-3 h-12"
          onClick={() => navigate("/agents")}
        >
          <Bot className="w-5 h-5 text-primary" />
          <span className="flex-1 text-left font-medium">AI Agents</span>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </Button>

        {/* Sign Out */}
        <Button variant="outline" className="w-full gap-2 text-destructive" onClick={signOut}>
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
      </motion.div>
    </div>
  );
};

export default ProfilePage;
