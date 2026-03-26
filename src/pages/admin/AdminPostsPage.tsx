import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2 } from "lucide-react";

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  ready: "bg-primary/10 text-primary",
  scheduled: "bg-accent/10 text-accent-foreground",
  published: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  failed: "bg-destructive/10 text-destructive",
};

export default function AdminPostsPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ content: "", status: "draft" as string, platforms: [] as string[] });
  const { toast } = useToast();

  const load = async () => {
    const { data } = await supabase.from("posts").select("*").order("created_at", { ascending: false });
    if (data) setPosts(data);
  };

  useEffect(() => { load(); }, []);

  const openEdit = (p: any) => {
    setEditing(p);
    setForm({ content: p.content || "", status: p.status, platforms: p.platforms || [] });
  };

  const save = async () => {
    if (!editing) return;
    const { error } = await supabase.from("posts").update({
      content: form.content,
      status: form.status as any,
    }).eq("id", editing.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Post updated" });
    setEditing(null);
    load();
  };

  const deletePost = async (id: string) => {
    const { error } = await supabase.from("posts").delete().eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Post deleted" });
    load();
  };

  return (
    <div>
      <h1 className="text-2xl font-heading font-bold text-foreground mb-6">Posts</h1>
      <div className="rounded-lg border border-border bg-card shadow-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Content</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Platforms</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {posts.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="max-w-[250px] truncate">{p.content || "—"}</TableCell>
                <TableCell>
                  <Badge className={statusColors[p.status] || ""} variant="secondary">{p.status}</Badge>
                </TableCell>
                <TableCell>{(p.platforms || []).join(", ") || "—"}</TableCell>
                <TableCell>{new Date(p.created_at).toLocaleDateString()}</TableCell>
                <TableCell className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="w-4 h-4" /></Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon"><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Post?</AlertDialogTitle>
                        <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deletePost(p.id)}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!editing} onOpenChange={() => setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Post</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Content</Label><Textarea rows={4} value={form.content} onChange={e => setForm({...form, content: e.target.value})} /></div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm({...form, status: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["draft","ready","scheduled","published","failed"].map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={save} className="w-full gradient-primary text-primary-foreground">Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
