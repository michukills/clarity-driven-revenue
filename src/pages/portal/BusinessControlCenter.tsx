import { useParams, useNavigate } from "react-router-dom";
import { PortalShell } from "@/components/portal/PortalShell";
import { DomainShell } from "@/components/domains/DomainShell";
import { BusinessControlCenterView } from "@/components/bcc/BusinessControlCenterView";
import { useBccData } from "@/lib/bcc/useBccData";
import { usePortalCustomerId } from "@/hooks/usePortalCustomerId";
import { useToolUsageSession } from "@/lib/usage/toolUsageSession";

export default function PortalBusinessControlCenter() {
  const { customerId } = usePortalCustomerId();
  useToolUsageSession({ toolTitle: "Revenue Control Center™", toolKey: "revenue_control_center" });
  const { module } = useParams();
  const navigate = useNavigate();
  const tab = moduleToTab(module);

  const { data, isSample, isDemoAccount, loading, reload } = useBccData(customerId);

  return (
    <PortalShell variant="customer">
      <DomainShell
        eyebrow="Control Systems"
        title="Revenue Control Center™"
        description="The Revenue Control System™ keeps important signals visible after the work is done. It does not make decisions for the owner — it helps you see what decision needs attention next across revenue, expenses, payroll, cash flow, and pipeline. This is a visibility and decision-support layer, not accounting software, and it does not replace legal, tax, or accounting professionals."
      >
        {loading ? (
          <div className="text-sm text-muted-foreground py-12 text-center">Loading…</div>
        ) : (
          <BusinessControlCenterView
            data={data}
            customerId={customerId}
            isSample={isSample}
            isDemoAccount={isDemoAccount}
            audience="client"
            onChange={reload}
            defaultTab={tab}
            onTabChange={(v) => {
              const slug = tabToModule(v);
              navigate(slug ? `/portal/business-control-center/${slug}` : `/portal/business-control-center`, { replace: true });
            }}
          />
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