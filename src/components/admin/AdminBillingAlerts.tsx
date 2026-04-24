// P7.2.6 — Admin Billing Alerts
// Surfaces engagement-billing gaps based on the new structured fields
// on customers (diagnostic / implementation / addon payment status).
// Does not change RCC entitlement or trigger any locking.
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { isRccResource } from "@/lib/access/rccResource";
import { Receipt, ArrowRight, AlertTriangle } from "lucide-react";

const DX_STAGES = new Set([
  "diagnostic_paid",
  "diagnostic_in_progress",
  "diagnostic_delivered",
]);
const IMP_STAGES = new Set([
  "implementation_added",
  "implementation_onboarding",
  "tools_assigned",
  "client_training_setup",
  "implementation_active",
  "waiting_on_client",
  "review_revision_window",
]);

type Row = {
  id: string;
  full_name: string;
  business_name: string | null;
  stage: string;
  diagnostic_payment_status: string | null;
  implementation_payment_status: string | null;
  addon_payment_status: string | null;
  is_demo_account?: boolean | null;
};

type Alert = {
  id: string;
  customerId: string;
  customerLabel: string;
  reason: string;
};

export function AdminBillingAlerts() {
  const [rows, setRows] = useState<Row[]>([]);
  const [addonByCustomer, setAddonByCustomer] = useState<Map<string, boolean>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [custRes, assignRes] = await Promise.all([
        supabase
          .from("customers")
          .select(
            "id, full_name, business_name, stage, diagnostic_payment_status, implementation_payment_status, addon_payment_status, is_demo_account",
          )
          .is("archived_at", null)
          .or("is_demo_account.is.null,is_demo_account.eq.false"),
        supabase
          .from("resource_assignments")
          .select("customer_id, resources(title, url, tool_category, tool_audience)"),
      ]);
      const map = new Map<string, boolean>();
      for (const r of (assignRes.data as any[]) || []) {
        const cid = r.customer_id as string | null;
        const res = r.resources;
        if (!cid || !res) continue;
        // True add-on tools, excluding the RCC resource (RCC is tracked separately).
        if (res.tool_category === "addon" && !isRccResource(res)) {
          map.set(cid, true);
        }
      }
      setAddonByCustomer(map);
      setRows(((custRes.data as Row[]) || []));
      setLoading(false);
    })();
  }, []);

  const items = useMemo<Alert[]>(() => {
    const out: Alert[] = [];
    const label = (r: Row) => r.business_name?.trim() || r.full_name || "Client";
    for (const r of rows) {
      const dxNeedsPayment =
        DX_STAGES.has(r.stage) &&
        (r.diagnostic_payment_status === "unpaid" || r.diagnostic_payment_status === "partial");
      if (dxNeedsPayment) {
        out.push({
          id: `dx-${r.id}`,
          customerId: r.id,
          customerLabel: label(r),
          reason:
            r.diagnostic_payment_status === "partial"
              ? "Diagnostic payment is partial during diagnostic stage"
              : "Diagnostic unpaid during diagnostic stage",
        });
      }
      const impNeedsPayment =
        IMP_STAGES.has(r.stage) &&
        (r.implementation_payment_status === "unpaid" ||
          r.implementation_payment_status === "partial");
      if (impNeedsPayment) {
        out.push({
          id: `imp-${r.id}`,
          customerId: r.id,
          customerLabel: label(r),
          reason:
            r.implementation_payment_status === "partial"
              ? "Implementation payment is partial during active implementation"
              : "Implementation unpaid during active implementation",
        });
      }
      const hasAddon = addonByCustomer.get(r.id) === true;
      const addonNeedsPayment =
        hasAddon &&
        (r.addon_payment_status === "unpaid" || r.addon_payment_status === "partial");
      if (addonNeedsPayment) {
        out.push({
          id: `addon-${r.id}`,
          customerId: r.id,
          customerLabel: label(r),
          reason:
            r.addon_payment_status === "partial"
              ? "Add-on tools assigned, payment is partial"
              : "Add-on tools assigned, payment unpaid",
        });
      }
    }
    return out.slice(0, 12);
  }, [rows, addonByCustomer]);

  return (
    <section className="rounded-2xl border border-border bg-card/40 p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Engagement billing
          </div>
          <h3 className="text-base font-light text-foreground inline-flex items-center gap-2">
            <Receipt className="h-4 w-4 text-primary/70" /> Unpaid engagement signals
          </h3>
        </div>
      </div>
      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : items.length === 0 ? (
        <div className="text-sm text-muted-foreground">
          All active engagements are marked paid, waived, or not required.
        </div>
      ) : (
        <ul className="space-y-1.5">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                to={`/admin/customers/${item.customerId}`}
                className="flex items-start gap-2 rounded-lg border border-border bg-card/30 p-2.5 hover:border-primary/40 transition-colors"
              >
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 text-amber-400" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-foreground truncate">{item.customerLabel}</div>
                  <div className="text-xs text-muted-foreground">{item.reason}</div>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}