// P32.1 — Admin-only dashboard alert: customers with an assigned industry
// but a missing/unverified business snapshot. Industry-specific tools stay
// restricted until each one is verified.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ShieldAlert, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { INDUSTRY_LABEL, type IndustryKey } from "@/lib/toolCatalog";

interface QueueRow {
  id: string;
  business_name: string | null;
  full_name: string | null;
  industry: IndustryKey;
}

function customerLabel(r: QueueRow): string {
  return r.business_name?.trim() || r.full_name?.trim() || "Unknown customer";
}

export function IndustryVerificationAlert() {
  const [rows, setRows] = useState<QueueRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Customers with industry assigned but not yet admin-confirmed,
        // OR with no verified snapshot. Filter snapshot in JS so this works
        // when the snapshot row is absent.
        const { data: cust } = await supabase
          .from("customers")
          .select("id, business_name, full_name, industry, industry_confirmed_by_admin, archived_at")
          .not("industry", "is", null)
          .neq("industry", "other")
          .is("archived_at", null)
          .limit(50);
        if (!cust || cust.length === 0) {
          if (!cancelled) setRows([]);
          return;
        }
        const ids = cust.map((c: any) => c.id);
        const { data: snaps } = await supabase
          .from("client_business_snapshots")
          .select("customer_id, snapshot_status, industry_verified")
          .in("customer_id", ids);
        const verifiedSet = new Set(
          (snaps ?? [])
            .filter((s: any) => s.snapshot_status === "admin_verified" && s.industry_verified)
            .map((s: any) => s.customer_id),
        );
        const queue: QueueRow[] = (cust as any[])
          .filter((c) => !c.industry_confirmed_by_admin || !verifiedSet.has(c.id))
          .slice(0, 6)
          .map((c) => ({
            id: c.id,
            business_name: c.business_name,
            full_name: c.full_name,
            industry: c.industry,
          }));
        if (!cancelled) setRows(queue);
      } catch {
        // RLS / non-admin — silent
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground flex items-center gap-2">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking client industry verification…
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card/60 p-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-300/80" />
          <div className="text-sm text-foreground/80">All assigned industries are verified.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
      <div className="flex items-start gap-3">
        <ShieldAlert className="h-5 w-5 text-amber-300 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-foreground">
              Client industries pending verification
            </span>
            <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-200 border border-amber-500/30">
              {rows.length}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-amber-200/80">
            Industry-specific tools stay restricted until the snapshot is admin-verified.
          </p>
          <ul className="mt-2 space-y-1">
            {rows.map((r) => (
              <li key={r.id} className="text-xs text-foreground/85 flex items-center gap-2">
                <Link
                  to={`/admin/customers/${r.id}`}
                  className="truncate hover:text-foreground hover:underline underline-offset-2"
                >
                  {customerLabel(r)}
                </Link>
                <span className="text-muted-foreground truncate">· {INDUSTRY_LABEL[r.industry]}</span>
              </li>
            ))}
          </ul>
          <Link
            to="/admin/customers"
            className="mt-3 inline-flex items-center gap-1 text-xs text-foreground hover:text-amber-200"
          >
            Open customers <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default IndustryVerificationAlert;