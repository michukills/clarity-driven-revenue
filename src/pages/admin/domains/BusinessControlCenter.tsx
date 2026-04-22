import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PortalShell } from "@/components/portal/PortalShell";
import { DomainShell } from "@/components/domains/DomainShell";
import { BusinessControlCenterView } from "@/components/bcc/BusinessControlCenterView";
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

  const { data, isSample, loading, reload } = useBccData(selected);
  const current = useMemo(() => customers.find((c) => c.id === selected), [customers, selected]);

  return (
    <PortalShell variant="admin">
      <DomainShell
        eyebrow="RGS OS Expansion Domain"
        title="Business Control Center"
        description="Owner-operator financial command center for each client. Tracks revenue, expenses, payroll, labor, invoices, and cash flow — and turns that data into business health, leak signals, and a recommended RGS next step."
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
        ) : (
          <>
            <div className="mb-4 text-xs text-muted-foreground">
              Viewing: <span className="text-foreground">{current?.business_name || current?.full_name}</span>
            </div>
            <BusinessControlCenterView
              data={data}
              customerId={selected}
              isSample={isSample}
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