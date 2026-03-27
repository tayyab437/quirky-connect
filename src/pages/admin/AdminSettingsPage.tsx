import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useTheme, AppTheme } from "@/hooks/useTheme";
import { useLayoutStyle, LayoutStyle } from "@/hooks/useLayoutStyle";
import { Check, Save, Layout, Palette, Moon, Sun } from "lucide-react";
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

const LAYOUTS: { id: LayoutStyle; label: string; description: string }[] = [
  { id: "classic", label: "Classic", description: "Top header with pill-style bottom tabs. Clean & familiar." },
  { id: "modern", label: "Modern", description: "Floating header & nav with glass morphism. Trendy & bold." },
  { id: "minimal", label: "Minimal", description: "Ultra-clean lines with icon-only navigation. Focus on content." },
];

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { theme, setTheme, mode, toggleMode } = useTheme();
  const { layout, setLayout, appName, setAppName } = useLayoutStyle();

  useEffect(() => {
    (supabase.from as any)("admin_settings")
      .select("*")
      .then(({ data }: any) => {
        if (data) {
          const map: Record<string, string> = {};
          data.forEach((d: any) => { map[d.key] = d.value || ""; });
          setSettings(map);
          if (map["app_name"]) setAppName(map["app_name"]);
        }
      });
  }, []);

  const updateSetting = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const saveAll = async () => {
    setSaving(true);

    // Include layout + app name in settings
    const allSettings = {
      ...settings,
      app_layout: layout,
      app_name: appName,
    };

    const entries = Object.entries(allSettings);
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
        <div />
        <Button onClick={saveAll} disabled={saving} className="gradient-primary text-primary-foreground">
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Saving..." : "Save All"}
        </Button>
      </div>

      {/* App Branding */}
      <Card className="shadow-card">
        <CardHeader><CardTitle className="text-lg">App Branding</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>App Name</Label>
            <Input
              value={appName}
              onChange={e => setAppName(e.target.value)}
              placeholder="Your App Name"
            />
            <p className="text-xs text-muted-foreground mt-1">Displayed in the header across the app</p>
          </div>
        </CardContent>
      </Card>

      {/* Layout Style */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><Layout className="w-5 h-5" /> Layout Style</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {LAYOUTS.map(l => (
              <button
                key={l.id}
                onClick={() => setLayout(l.id)}
                className={cn(
                  "text-left p-4 rounded-xl border-2 transition-all",
                  layout === l.id
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border hover:border-muted-foreground"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-heading font-semibold text-foreground">{l.label}</span>
                  {layout === l.id && <Check className="w-4 h-4 text-primary" />}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{l.description}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Color Theme */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><Palette className="w-5 h-5" /> Color Theme</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
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

          <div className="flex items-center justify-between">
            <div>
              <Label>Dark Mode</Label>
              <p className="text-sm text-muted-foreground">Toggle between light and dark appearance</p>
            </div>
            <Button variant="outline" onClick={toggleMode} className="gap-2">
              {mode === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              {mode === "dark" ? "Light" : "Dark"}
            </Button>
          </div>
        </CardContent>
      </Card>

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
    </div>
  );
}
