/* ============================================================================
 * DEPRECATED ROUTE WRAPPER
 * ----------------------------------------------------------------------------
 * Canonical route is `/admin/rgs-business-control-center` (see
 * `src/pages/admin/domains/RgsBusinessControlCenter.tsx`).
 *
 * The legacy routes `/admin/business-control-center` and
 * `/admin/business-control-center/:module` now redirect to the canonical RGS
 * BCC route in `App.tsx`. This file is retained only because external links
 * may still import it; it should NOT receive new feature logic.
 *
 * For per-client BCC review use `/admin/clients/:id/business-control`
 * (`src/pages/admin/ClientBusinessControl.tsx`). For client-facing BCC use
 * `/portal/business-control-center` (`src/pages/portal/BusinessControlCenter.tsx`).
 * ============================================================================
 */
import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import { PortalShell } from "@/components/portal/PortalShell";
import { DomainShell } from "@/components/domains/DomainShell";
import { BusinessControlCenterView } from "@/components/bcc/BusinessControlCenterView";
import { RevenueTrackerModule } from "@/components/bcc/RevenueTrackerModule";
import { useBccData } from "@/lib/bcc/useBccData";
import { supabase } from "@/integrations/supabase/client";

export default function AdminBusinessControlCenter() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const { module } = useParams();
  const navigate = useNavigate();
  const tab = moduleToTab(module);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("customers")
        .select("id, full_name, business_name, stage")
        .order("business_name", { ascending: true });
      const list = data || [];
      setCustomers(list);
      if (list.length && !selected) setSelected(list[0].id);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data, isSample, isDemoAccount, loading, reload } = useBccData(selected);
  const current = useMemo(() => customers.find((c) => c.id === selected), [customers, selected]);
  const isRevenueTracker = module === "revenue-tracker";

  // Architectural rule: the admin-side Revenue Tracker is RGS internal
  // (Revenue & Growth Systems LLC's own books). Per-client revenue is
  // reviewed inside Client Management, not here. Redirect so admins never
  // see a client selector on the admin Revenue Tracker route.
  if (isRevenueTracker) {
    return <Navigate to="/admin/rgs-business-control-center/revenue-tracker" replace />;
  }

  return (
    <PortalShell variant="admin">
      <DomainShell
        eyebrow={isRevenueTracker ? "Business Control Center · Admin" : "RGS OS Expansion Domain"}
        title={isRevenueTracker ? "Revenue Control Center™" : "Business Control Center"}
        description={
          isRevenueTracker
            ? "Manage revenue entries on behalf of the selected client. Feeds the Business Control Report, Revenue Leak Detection Engine™, and Financial Visibility Diagnostic."
            : "Owner-operator financial command center for each client. Tracks revenue, expenses, payroll, labor, invoices, and cash flow — and turns that data into business health, leak signals, and a recommended RGS next step."
        }
        actions={
          customers.length > 0 && (
            <select
              value={selected || ""}
              onChange={(e) => setSelected(e.target.value)}
              className="h-9 rounded-md bg-background border border-input text-sm px-3"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.business_name || c.full_name}
                </option>
              ))}
            </select>
          )
        }
      >
        {customers.length === 0 ? (
          <div className="text-sm text-muted-foreground py-12 text-center">No clients yet. Add a client in CRM / Pipeline to start tracking their Business Control Center.</div>
        ) : loading ? (
          <div className="text-sm text-muted-foreground py-12 text-center">Loading…</div>
        ) : isRevenueTracker ? (
          <>
            <div className="mb-4 text-xs text-muted-foreground">
              Viewing: <span className="text-foreground">{current?.business_name || current?.full_name}</span>
            </div>
            <RevenueTrackerModule
              data={data}
              customerId={selected}
              isSample={isSample}
              audience="admin"
              onChange={reload}
            />
          </>
        ) : (
          <>
            <div className="mb-4 text-xs text-muted-foreground">
              Viewing: <span className="text-foreground">{current?.business_name || current?.full_name}</span>
            </div>
            <BusinessControlCenterView
              data={data}
              customerId={selected}
              isSample={isSample}
              isDemoAccount={isDemoAccount}
              audience="admin"
              onChange={reload}
              defaultTab={tab}
              onTabChange={(v) => {
                const slug = tabToModule(v);
                navigate(slug ? `/admin/business-control-center/${slug}` : `/admin/business-control-center`, { replace: true });
              }}
            />
          </>
        )}
      </DomainShell>
    </PortalShell>
  );
}

const MODULE_TO_TAB: Record<string, string> = {
  "revenue-tracker": "revenue",
  "expense-tracker": "expenses",
  "payroll-tracker": "payroll",
  invoices: "invoices",
  "cash-flow": "cash",
  report: "report",
};
const TAB_TO_MODULE: Record<string, string> = Object.fromEntries(
  Object.entries(MODULE_TO_TAB).map(([k, v]) => [v, k]),
);
function moduleToTab(slug?: string) {
  if (!slug) return "overview";
  return MODULE_TO_TAB[slug] || "overview";
}
function tabToModule(tab: string) {
  return TAB_TO_MODULE[tab] || "";
}