import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useTheme, AppTheme } from "@/hooks/useTheme";
import { Check, Save } from "lucide-react";
import { cn } from "@/lib/utils";

const AGENT_TYPES = [
  { key: "content", label: "Content Agent" },
  { key: "hashtag", label: "Hashtag Agent" },
  { key: "strategy", label: "Strategy Agent" },
];

const THEMES: { id: AppTheme; label: string; color: string }[] = [
  { id: "default", label: "Purple", color: "bg-purple-500" },
  { id: "ocean", label: "Ocean", color: "bg-cyan-500" },
  { id: "sunset", label: "Sunset", color: "bg-orange-500" },
];

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { theme, setTheme, mode, toggleMode } = useTheme();

  useEffect(() => {
    (supabase.from as any)("admin_settings")
      .select("*")
      .then(({ data }: any) => {
        if (data) {
          const map: Record<string, string> = {};
          data.forEach((d: any) => { map[d.key] = d.value || ""; });
          setSettings(map);
        }
      });
  }, []);

  const updateSetting = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const saveAll = async () => {
    setSaving(true);
    const entries = Object.entries(settings);
    for (const [key, value] of entries) {
      await (supabase.from as any)("admin_settings").upsert(
        { key, value, updated_at: new Date().toISOString() },
        { onConflict: "key" }
      );
    }
    toast({ title: "Settings saved" });
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-heading font-bold text-foreground">Settings</h1>
        <Button onClick={saveAll} disabled={saving} className="gradient-primary text-primary-foreground">
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Saving..." : "Save All"}
        </Button>
      </div>

      {/* Agent Configuration */}
      {AGENT_TYPES.map(agent => (
        <Card key={agent.key} className="shadow-card">
          <CardHeader><CardTitle className="text-lg">{agent.label}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>API Key</Label>
                <Input
                  type="password"
                  placeholder="sk-..."
                  value={settings[`${agent.key}_api_key`] || ""}
                  onChange={e => updateSetting(`${agent.key}_api_key`, e.target.value)}
                />
              </div>
              <div>
                <Label>Model</Label>
                <Input
                  placeholder="gpt-4o-mini"
                  value={settings[`${agent.key}_model`] || ""}
                  onChange={e => updateSetting(`${agent.key}_model`, e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label>Webhook URL</Label>
              <Input
                placeholder="https://..."
                value={settings[`${agent.key}_webhook_url`] || ""}
                onChange={e => updateSetting(`${agent.key}_webhook_url`, e.target.value)}
              />
            </div>
            <div>
              <Label>System Prompt Override</Label>
              <Input
                placeholder="Custom system prompt for this agent..."
                value={settings[`${agent.key}_system_prompt`] || ""}
                onChange={e => updateSetting(`${agent.key}_system_prompt`, e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Appearance */}
      <Card className="shadow-card">
        <CardHeader><CardTitle className="text-lg">Appearance</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label className="mb-3 block">Theme</Label>
            <div className="flex gap-3">
              {THEMES.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-colors",
                    theme === t.id ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground"
                  )}
                >
                  <div className={cn("w-5 h-5 rounded-full", t.color)} />
                  <span className="text-sm font-medium text-foreground">{t.label}</span>
                  {theme === t.id && <Check className="w-4 h-4 text-primary" />}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Dark Mode</Label>
              <p className="text-sm text-muted-foreground">Toggle between light and dark appearance</p>
            </div>
            <Button variant="outline" onClick={toggleMode}>
              {mode === "dark" ? "Switch to Light" : "Switch to Dark"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
