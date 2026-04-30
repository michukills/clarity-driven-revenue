// P32.1 — Admin-only dashboard alert: customers with an assigned industry
// but a missing/unverified business snapshot. Industry-specific tools stay
// restricted until each one is verified.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ShieldAlert, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { INDUSTRY_LABEL, type IndustryKey } from "@/lib/toolCatalog";
import { isCustomerFlowAccount } from "@/lib/customers/accountKind";

interface QueueRow {
  id: string;
  business_name: string | null;
  full_name: string | null;
  industry: IndustryKey | null;
  reason: "missing" | "needs_review" | "unconfirmed" | "snapshot_unverified";
  actionLabel: string;
  anchor: "industry-assignment" | "business-snapshot";
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
        // Customers with no industry, review-needed industry, unconfirmed
        // industry, OR no verified snapshot. Filter snapshot in JS so this
        // works when the snapshot row is absent.
        const { data: cust } = await supabase
          .from("customers")
          .select(
            "id, business_name, full_name, email, account_kind, status, is_demo_account, industry, industry_confirmed_by_admin, needs_industry_review, archived_at",
          )
          .is("archived_at", null)
          .limit(100);
        // Internal RGS / admin accounts must never appear in the client
        // industry-verification queue. They are not part of the client flow.
        const flowCust = ((cust as any[]) ?? []).filter(isCustomerFlowAccount);
        if (flowCust.length === 0) {
          if (!cancelled) setRows([]);
          return;
        }
        const ids = flowCust.map((c: any) => c.id);
        const { data: snaps } = await supabase
          .from("client_business_snapshots")
          .select("customer_id, snapshot_status, industry_verified")
          .in("customer_id", ids);
        const verifiedSet = new Set(
          (snaps ?? [])
            .filter((s: any) => s.snapshot_status === "admin_verified" && s.industry_verified)
            .map((s: any) => s.customer_id),
        );
        const queue = ((flowCust as any[])
          .map((c): QueueRow | null => {
            const industry = (c.industry as IndustryKey | null) ?? null;
            if (!industry) {
              return {
                id: c.id,
                business_name: c.business_name,
                full_name: c.full_name,
                industry,
                reason: "missing" as const,
                actionLabel: "Assign industry",
                anchor: "industry-assignment" as const,
              };
            }
            if (industry === "other" || c.needs_industry_review) {
              return {
                id: c.id,
                business_name: c.business_name,
                full_name: c.full_name,
                industry,
                reason: "needs_review" as const,
                actionLabel: "Review industry",
                anchor: "industry-assignment" as const,
              };
            }
            if (!c.industry_confirmed_by_admin) {
              return {
                id: c.id,
                business_name: c.business_name,
                full_name: c.full_name,
                industry,
                reason: "unconfirmed" as const,
                actionLabel: "Confirm industry",
                anchor: "industry-assignment" as const,
              };
            }
            if (!verifiedSet.has(c.id)) {
              return {
                id: c.id,
                business_name: c.business_name,
                full_name: c.full_name,
                industry,
                reason: "snapshot_unverified" as const,
                actionLabel: "Verify snapshot",
                anchor: "business-snapshot" as const,
              };
            }
            return null;
          })
          .filter(Boolean)
          .slice(0, 6)) as QueueRow[];
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
          <div className="text-sm text-foreground/80">No client industries are waiting for review.</div>
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
            Industry-specific tools stay restricted until industry assignment and the business snapshot are admin-verified.
          </p>
          <ul className="mt-2 space-y-1">
            {rows.map((r) => (
              <li key={r.id} className="text-xs text-foreground/85 flex items-center gap-2">
                <Link
                  to={`/admin/customers/${r.id}#${r.anchor}`}
                  className="truncate hover:text-foreground hover:underline underline-offset-2"
                >
                  {customerLabel(r)}
                </Link>
                <span className="text-muted-foreground truncate">
                  · {r.industry ? INDUSTRY_LABEL[r.industry] : "No industry"} · {r.actionLabel}
                </span>
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
