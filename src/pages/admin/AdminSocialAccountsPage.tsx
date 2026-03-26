import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Trash2 } from "lucide-react";

export default function AdminSocialAccountsPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const { toast } = useToast();

  const load = async () => {
    const { data } = await supabase.from("social_accounts").select("*").order("created_at", { ascending: false });
    if (data) setAccounts(data);
  };

  useEffect(() => { load(); }, []);

  const remove = async (id: string) => {
    const { error } = await supabase.from("social_accounts").delete().eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Account removed" });
    load();
  };

  return (
    <div>
      <h1 className="text-2xl font-heading font-bold text-foreground mb-6">Social Accounts</h1>
      <div className="rounded-lg border border-border bg-card shadow-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Platform</TableHead>
              <TableHead>Account</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Token Expiry</TableHead>
              <TableHead>Connected</TableHead>
              <TableHead className="w-16">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-medium capitalize">{a.platform}</TableCell>
                <TableCell>{a.account_name || "—"}</TableCell>
                <TableCell>
                  <Badge variant={a.status === "connected" ? "default" : "secondary"}>
                    {a.status}
                  </Badge>
                </TableCell>
                <TableCell>{a.token_expiry ? new Date(a.token_expiry).toLocaleString() : "—"}</TableCell>
                <TableCell>{new Date(a.created_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon"><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove Account?</AlertDialogTitle>
                        <AlertDialogDescription>This will disconnect the social account.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => remove(a.id)}>Remove</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
