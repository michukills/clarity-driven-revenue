import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, Search, UserCheck, Sparkles } from "lucide-react";

type AuthUserOption = {
  user_id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  linked_customer_id: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  customer: { id: string; full_name: string; email: string; business_name: string | null; user_id: string | null };
  onLinked: () => void;
};

export function AssignUserDialog({ open, onOpenChange, customer, onLinked }: Props) {
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState<AuthUserOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSearch(customer.email || "");
  }, [open, customer.email]);

  useEffect(() => {
    if (!open) return;
    let cancel = false;
    const t = setTimeout(async () => {
      setLoading(true);
      const { data, error } = await (supabase.rpc as any)("list_auth_users_for_link", { _search: search || null });
      if (!cancel) {
        if (error) toast.error(error.message);
        setOptions((data as AuthUserOption[]) || []);
        setLoading(false);
      }
    }, 200);
    return () => { cancel = true; clearTimeout(t); };
  }, [open, search]);

  const recommended = useMemo(
    () => options.find((o) => o.email.toLowerCase() === (customer.email || "").toLowerCase()),
    [options, customer.email],
  );

  const link = async (u: AuthUserOption, force = false) => {
    if (u.linked_customer_id && u.linked_customer_id !== customer.id && !force) {
      if (!window.confirm(`This user is already linked to another customer. Move them to ${customer.business_name || customer.full_name}?`)) return;
      force = true;
    }
    setBusy(u.user_id);
    const { error } = await (supabase.rpc as any)("set_customer_user_link", {
      _customer_id: customer.id,
      _user_id: u.user_id,
      _force: force,
    });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success(`Linked ${u.email}`);
    onLinked();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-primary" /> Assign user to {customer.business_name || customer.full_name}
          </DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search auth users by email or name…"
            className="pl-9 bg-muted/40 border-border"
          />
        </div>

        {recommended && recommended.user_id !== customer.user_id && (
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3 flex items-start gap-3">
            <Sparkles className="h-4 w-4 text-primary mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase tracking-wider text-primary">Recommended match</div>
              <div className="text-sm text-foreground truncate">{recommended.email}</div>
              {recommended.full_name && (
                <div className="text-[11px] text-muted-foreground truncate">{recommended.full_name}</div>
              )}
            </div>
            <Button size="sm" onClick={() => link(recommended)} disabled={busy === recommended.user_id} className="bg-primary hover:bg-secondary">
              Link
            </Button>
          </div>
        )}

        <div className="max-h-[360px] overflow-y-auto space-y-1">
          {loading ? (
            <div className="text-xs text-muted-foreground py-6 text-center">Searching…</div>
          ) : options.length === 0 ? (
            <div className="text-xs text-muted-foreground py-6 text-center">
              No auth users match. Ask the client to sign up at the auth page, then link them here.
            </div>
          ) : (
            options.map((u) => {
              const linkedHere = u.linked_customer_id === customer.id;
              const linkedElsewhere = !!u.linked_customer_id && !linkedHere;
              return (
                <div
                  key={u.user_id}
                  className="flex items-center gap-3 p-3 rounded-md border border-border bg-muted/20 hover:bg-muted/40"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-foreground truncate flex items-center gap-2">
                      {u.email}
                      {linkedHere && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" /> Linked here
                        </span>
                      )}
                      {linkedElsewhere && (
                        <span className="text-[10px] text-amber-400">Linked elsewhere</span>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {u.full_name || "—"} · joined {new Date(u.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  {!linkedHere && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-border"
                      disabled={busy === u.user_id}
                      onClick={() => link(u)}
                    >
                      Link
                    </Button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}