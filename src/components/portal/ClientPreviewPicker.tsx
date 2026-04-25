import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Eye, Search, Sparkles } from "lucide-react";

type CustomerRow = {
  id: string;
  full_name: string | null;
  business_name: string | null;
  email: string | null;
  is_demo_account: boolean;
  lifecycle_state: string | null;
};

export function ClientPreviewPicker({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const navigate = useNavigate();
  const { setPreviewCustomer } = useAuth();
  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    supabase
      .from("customers")
      .select("id, full_name, business_name, email, is_demo_account, lifecycle_state")
      .is("archived_at", null)
      .order("is_demo_account", { ascending: false })
      .order("last_activity_at", { ascending: false })
      .limit(100)
      .then(({ data }) => {
        setRows((data as CustomerRow[]) ?? []);
        setLoading(false);
      });
  }, [open]);

  const filtered = rows.filter((r) => {
    if (!q.trim()) return true;
    const needle = q.trim().toLowerCase();
    return (
      (r.full_name ?? "").toLowerCase().includes(needle) ||
      (r.business_name ?? "").toLowerCase().includes(needle) ||
      (r.email ?? "").toLowerCase().includes(needle)
    );
  });

  const choose = (id: string) => {
    setPreviewCustomer(id);
    onOpenChange(false);
    navigate("/portal");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-primary" /> Preview client portal
          </DialogTitle>
          <DialogDescription>
            Choose a client (or demo account) to see the portal exactly as they would. You can exit preview anytime from the portal topbar.
          </DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, business, or email…"
            className="pl-9"
            autoFocus
          />
        </div>
        <div className="max-h-[420px] overflow-auto -mx-6 px-6 divide-y divide-border">
          {loading && (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading clients…</div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No clients match "{q}".
            </div>
          )}
          {!loading &&
            filtered.map((r) => {
              const label = r.business_name?.trim() || r.full_name?.trim() || r.email || "Untitled";
              const sub = [r.full_name, r.email].filter(Boolean).join(" · ");
              return (
                <button
                  key={r.id}
                  onClick={() => choose(r.id)}
                  className="w-full text-left py-3 flex items-center gap-3 hover:bg-muted/40 transition-colors px-2 rounded-md"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground flex items-center gap-2">
                      <span className="truncate">{label}</span>
                      {r.is_demo_account && (
                        <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          <Sparkles className="h-2.5 w-2.5" /> Demo
                        </span>
                      )}
                    </div>
                    {sub && (
                      <div className="text-[11px] text-muted-foreground truncate">{sub}</div>
                    )}
                  </div>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground border border-border rounded px-1.5 py-0.5">
                    {r.lifecycle_state ?? "lead"}
                  </span>
                </button>
              );
            })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ClientPreviewPicker;
