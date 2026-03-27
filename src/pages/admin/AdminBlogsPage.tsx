import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";

interface Blog {
  id: string;
  title: string;
  content: string | null;
  excerpt: string | null;
  cover_image: string | null;
  published: boolean;
  author_id: string;
  created_at: string;
}

export default function AdminBlogsPage() {
  const { user } = useAuth();
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [editing, setEditing] = useState<Blog | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", excerpt: "", cover_image: "", published: false });
  const { toast } = useToast();

  const load = async () => {
    const { data } = await (supabase.from as any)("blogs").select("*").order("created_at", { ascending: false });
    if (data) setBlogs(data);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setCreating(true);
    setEditing(null);
    setForm({ title: "", content: "", excerpt: "", cover_image: "", published: false });
  };

  const openEdit = (b: Blog) => {
    setEditing(b);
    setCreating(false);
    setForm({
      title: b.title,
      content: b.content || "",
      excerpt: b.excerpt || "",
      cover_image: b.cover_image || "",
      published: b.published,
    });
  };

  const save = async () => {
    if (!form.title.trim()) {
      toast({ title: "Title required", variant: "destructive" });
      return;
    }

    if (editing) {
      const { error } = await (supabase.from as any)("blogs").update({
        title: form.title,
        content: form.content,
        excerpt: form.excerpt,
        cover_image: form.cover_image || null,
        published: form.published,
        updated_at: new Date().toISOString(),
      }).eq("id", editing.id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Blog updated" });
    } else {
      const { error } = await (supabase.from as any)("blogs").insert({
        title: form.title,
        content: form.content,
        excerpt: form.excerpt,
        cover_image: form.cover_image || null,
        published: form.published,
        author_id: user?.id,
      });
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Blog created" });
    }

    setEditing(null);
    setCreating(false);
    load();
  };

  const deleteBlog = async (id: string) => {
    const { error } = await (supabase.from as any)("blogs").delete().eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Blog deleted" });
    load();
  };

  const dialogOpen = !!editing || creating;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-heading font-bold text-foreground">Blogs</h1>
        <Button onClick={openCreate} className="gradient-primary text-primary-foreground gap-2">
          <Plus className="w-4 h-4" /> New Blog
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-card shadow-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Excerpt</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {blogs.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">No blogs yet</TableCell>
              </TableRow>
            )}
            {blogs.map((b) => (
              <TableRow key={b.id}>
                <TableCell className="font-medium max-w-[200px] truncate">{b.title}</TableCell>
                <TableCell className="max-w-[200px] truncate text-muted-foreground">{b.excerpt || "—"}</TableCell>
                <TableCell>
                  <Badge variant={b.published ? "default" : "secondary"}>
                    {b.published ? "Published" : "Draft"}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{new Date(b.created_at).toLocaleDateString()}</TableCell>
                <TableCell className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(b)}><Pencil className="w-4 h-4" /></Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon"><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Blog?</AlertDialogTitle>
                        <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteBlog(b.id)}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={() => { setEditing(null); setCreating(false); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Blog" : "New Blog"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Blog title" />
            </div>
            <div>
              <Label>Excerpt</Label>
              <Input value={form.excerpt} onChange={e => setForm({ ...form, excerpt: e.target.value })} placeholder="Short description" />
            </div>
            <div>
              <Label>Cover Image URL</Label>
              <Input value={form.cover_image} onChange={e => setForm({ ...form, cover_image: e.target.value })} placeholder="https://..." />
            </div>
            <div>
              <Label>Content</Label>
              <Textarea rows={10} value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} placeholder="Write your blog content..." />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.published} onCheckedChange={v => setForm({ ...form, published: v })} />
              <Label>Publish immediately</Label>
            </div>
            <Button onClick={save} className="w-full gradient-primary text-primary-foreground">
              {editing ? "Update Blog" : "Create Blog"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
