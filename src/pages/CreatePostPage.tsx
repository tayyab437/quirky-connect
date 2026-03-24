import { useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ImagePlus, Sparkles, Hash, Send, X, Calendar } from "lucide-react";
import { motion } from "framer-motion";

const platforms = [
  { id: "facebook", label: "Facebook", color: "bg-info" },
  { id: "instagram", label: "Instagram", color: "gradient-warm" },
  { id: "linkedin", label: "LinkedIn", color: "bg-info" },
];

const CreatePostPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [content, setContent] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [scheduledTime, setScheduledTime] = useState("");
  const [saving, setSaving] = useState(false);

  const togglePlatform = (id: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMediaFile(file);
      setMediaPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async (status: "draft" | "ready" | "scheduled" | "publish") => {
    if (!user) return;
    setSaving(true);

    try {
      let mediaUrl = null;
      if (mediaFile) {
        const path = `${user.id}/${Date.now()}-${mediaFile.name}`;
        const { error: uploadError } = await supabase.storage.from("media").upload(path, mediaFile);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("media").getPublicUrl(path);
        mediaUrl = urlData.publicUrl;
      }

      const hashtagArray = hashtags
        .split(/[,\s]+/)
        .map((h) => h.replace(/^#/, "").trim())
        .filter(Boolean);

      const insertStatus = status === "publish" ? "ready" : status;

      const { data: newPost, error } = await supabase.from("posts").insert({
        user_id: user.id,
        content,
        media_url: mediaUrl,
        platforms: selectedPlatforms,
        hashtags: hashtagArray,
        status: insertStatus,
        scheduled_time: status === "scheduled" && scheduledTime ? scheduledTime : null,
      }).select().single();

      if (error) throw error;

      // If publishing now, call the publish edge function
      if (status === "publish" && newPost) {
        toast({ title: "Publishing to platforms..." });
        const { data: pubResult, error: pubError } = await supabase.functions.invoke("publish-post", {
          body: { post_id: newPost.id },
        });
        if (pubError) throw pubError;

        const failedPlatforms = pubResult?.results?.filter((r: any) => !r.success) ?? [];
        if (failedPlatforms.length > 0) {
          toast({
            title: "Some platforms failed",
            description: failedPlatforms.map((f: any) => `${f.platform}: ${f.error}`).join("; "),
            variant: "destructive",
          });
        } else {
          toast({ title: "Published successfully! 🎉" });
        }
      } else {
        toast({ title: status === "draft" ? "Draft saved!" : status === "scheduled" ? "Post scheduled!" : "Post ready!" });
      }

      setContent("");
      setHashtags("");
      setSelectedPlatforms([]);
      setMediaFile(null);
      setMediaPreview(null);
      setScheduledTime("");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="px-4 pt-6 pb-4 max-w-lg mx-auto">
      <h1 className="text-2xl font-heading font-bold text-foreground mb-6">Create Post</h1>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        {/* Media Upload */}
        <div>
          {mediaPreview ? (
            <div className="relative rounded-xl overflow-hidden">
              <img src={mediaPreview} alt="Preview" className="w-full h-48 object-cover" />
              <button
                onClick={() => { setMediaFile(null); setMediaPreview(null); }}
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-card/80 flex items-center justify-center"
              >
                <X className="w-4 h-4 text-foreground" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full h-36 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary transition-colors"
            >
              <ImagePlus className="w-8 h-8" />
              <span className="text-sm">Add photo or video</span>
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleMediaSelect} />
        </div>

        {/* Caption */}
        <Textarea
          placeholder="Write your caption..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          className="resize-none"
        />

        {/* AI Generate Button */}
        <Button variant="outline" className="w-full gap-2" onClick={() => toast({ title: "Coming soon", description: "AI generation will be available via the Agents tab" })}>
          <Sparkles className="w-4 h-4" />
          Generate with AI
        </Button>

        {/* Hashtags */}
        <div className="relative">
          <Hash className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Add hashtags (comma separated)"
            value={hashtags}
            onChange={(e) => setHashtags(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Platform Selection */}
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-2">Platforms</p>
          <div className="flex gap-2">
            {platforms.map((p) => (
              <button
                key={p.id}
                onClick={() => togglePlatform(p.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedPlatforms.includes(p.id)
                    ? "gradient-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Schedule */}
        <div className="relative">
          <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            type="datetime-local"
            value={scheduledTime}
            onChange={(e) => setScheduledTime(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="flex-1" onClick={() => handleSave("draft")} disabled={saving}>
            Save Draft
          </Button>
          <Button
            className="flex-1 gradient-primary text-primary-foreground gap-2"
            onClick={() => handleSave(scheduledTime ? "scheduled" : "ready")}
            disabled={saving || !content}
          >
            <Send className="w-4 h-4" />
            {scheduledTime ? "Schedule" : "Post"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default CreatePostPage;
