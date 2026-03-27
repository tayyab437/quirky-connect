import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Eye, Pencil, Trash2, RefreshCw } from "lucide-react";

const TABLES = ["profiles", "posts", "social_accounts", "post_analytics", "ai_chats", "ai_messages", "admin_settings", "user_roles", "blogs"] as const;
type TableName = typeof TABLES[number];

export default function AdminDatabasePage() {
  const [activeTable, setActiveTable] = useState<TableName>("profiles");
  const [rows, setRows] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [editRow, setEditRow] = useState<any>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const load = async (table: TableName) => {
    setLoading(true);
    const { data, error } = await (supabase.from as any)(table).select("*").order("created_at", { ascending: false }).limit(100);
    if (error) {
      // fallback without order
      const { data: d2 } = await (supabase.from as any)(table).select("*").limit(100);
      if (d2 && d2.length > 0) {
        setColumns(Object.keys(d2[0]));
        setRows(d2);
      } else {
        setRows([]);
        setColumns([]);
      }
    } else if (data && data.length > 0) {
      setColumns(Object.keys(data[0]));
      setRows(data);
    } else {
      setRows([]);
      setColumns([]);
    }
    setLoading(false);
  };

  useEffect(() => { load(activeTable); }, [activeTable]);

  const openEdit = (row: any) => {
    setEditRow(row);
    const form: Record<string, string> = {};
    Object.entries(row).forEach(([k, v]) => {
      form[k] = v === null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
    });
    setEditForm(form);
  };

  const saveEdit = async () => {
    if (!editRow) return;
    const updates: Record<string, any> = {};
    Object.entries(editForm).forEach(([k, v]) => {
      if (k === "id") return;
      const original = editRow[k];
      if (String(original ?? "") !== v) {
        updates[k] = v === "" ? null : v;
      }
    });

    if (Object.keys(updates).length === 0) {
      setEditRow(null);
      return;
    }

    const { error } = await (supabase.from as any)(activeTable).update(updates).eq("id", editRow.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Row updated" });
    setEditRow(null);
    load(activeTable);
  };

  const deleteRow = async (id: string) => {
    const { error } = await (supabase.from as any)(activeTable).delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Row deleted" });
    load(activeTable);
  };

  const truncateValue = (val: any) => {
    if (val === null || val === undefined) return "—";
    const str = typeof val === "object" ? JSON.stringify(val) : String(val);
    return str.length > 40 ? str.slice(0, 40) + "…" : str;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 flex-wrap">
        <Tabs value={activeTable} onValueChange={(v) => setActiveTable(v as TableName)}>
          <TabsList className="flex-wrap h-auto gap-1">
            {TABLES.map(t => (
              <TabsTrigger key={t} value={t} className="text-xs capitalize">{t.replace(/_/g, " ")}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Button variant="outline" size="sm" onClick={() => load(activeTable)} className="gap-1">
          <RefreshCw className="w-3 h-3" /> Refresh
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-card shadow-card overflow-x-auto">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">No data in this table</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map(c => (
                  <TableHead key={c} className="text-xs whitespace-nowrap">{c}</TableHead>
                ))}
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, idx) => (
                <TableRow key={row.id || idx}>
                  {columns.map(c => (
                    <TableCell key={c} className="text-xs max-w-[150px] truncate">{truncateValue(row[c])}</TableCell>
                  ))}
                  <TableCell className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(row)}>
                      <Pencil className="w-3 h-3" />
                    </Button>
                    {row.id && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <Trash2 className="w-3 h-3 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Row?</AlertDialogTitle>
                            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteRow(row.id)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <p className="text-xs text-muted-foreground">Showing up to 100 rows • {rows.length} row{rows.length !== 1 ? "s" : ""}</p>

      <Dialog open={!!editRow} onOpenChange={() => setEditRow(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Row</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {Object.entries(editForm).map(([key, value]) => (
              <div key={key}>
                <Label className="text-xs text-muted-foreground">{key}</Label>
                <Input
                  value={value}
                  onChange={e => setEditForm({ ...editForm, [key]: e.target.value })}
                  disabled={key === "id"}
                  className="text-sm"
                />
              </div>
            ))}
            <Button onClick={saveEdit} className="w-full gradient-primary text-primary-foreground">Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
