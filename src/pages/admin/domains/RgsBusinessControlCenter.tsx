import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PortalShell } from "@/components/portal/PortalShell";
import { DomainShell } from "@/components/domains/DomainShell";
import { BusinessControlCenterView } from "@/components/bcc/BusinessControlCenterView";
import { useBccData } from "@/lib/bcc/useBccData";
import { supabase } from "@/integrations/supabase/client";

const RGS_INTERNAL_EMAIL = "internal@rgs.local";

export default function RgsBusinessControlCenter() {
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [resolving, setResolving] = useState(true);
  const { module } = useParams();
  const navigate = useNavigate();
  const tab = moduleToTab(module);

  useEffect(() => {
    (async () => {
      // Find the internal RGS operating record.
      let { data } = await supabase
        .from("customers")
        .select("id")
        .eq("email", RGS_INTERNAL_EMAIL)
        .maybeSingle();

      // Self-heal: create on first admin visit if missing.
      if (!data) {
        const inserted = await supabase
          .from("customers")
          .insert({
            full_name: "RGS Internal Operations",
            business_name: "Revenue & Growth Systems LLC",
            email: RGS_INTERNAL_EMAIL,
            stage: "lead" as any,
            status: "internal",
            track: "shared",
            payment_status: "unpaid",
            portal_unlocked: false,
            account_kind: "internal_admin",
            account_kind_notes: "Revenue & Growth Systems internal/admin operating account.",
            is_demo_account: false,
            learning_enabled: false,
            contributes_to_global_learning: false,
            learning_exclusion_reason: "Internal RGS admin account",
            next_action: "Internal RGS operating ledger — admin only",
          })
          .select("id")
          .maybeSingle();
        data = inserted.data;
      }
      setCustomerId(data?.id ?? null);
      setResolving(false);
    })();
  }, []);

  const { data, isSample, isDemoAccount, loading, reload } = useBccData(customerId);

  return (
    <PortalShell variant="admin">
      <DomainShell
        eyebrow="RGS Internal — Admin Only"
        title="RGS Business Control Center"
        description="Internal operating view for Revenue & Growth Systems LLC. Tracks RGS revenue, expenses, payroll/labor, cash movement, goals, and business health. Not visible to clients."
      >
        {resolving || loading ? (
          <div className="text-sm text-muted-foreground py-12 text-center">Loading RGS internal ledger…</div>
        ) : !customerId ? (
          <div className="text-sm text-muted-foreground py-12 text-center">
            RGS internal record could not be initialized. Contact engineering.
          </div>
        ) : (
          <BusinessControlCenterView
            data={data}
            customerId={customerId}
            isSample={isSample}
            isDemoAccount={isDemoAccount}
            audience="admin"
            onChange={reload}
            defaultTab={tab}
            onTabChange={(v) => {
              const slug = tabToModule(v);
              navigate(
                slug ? `/admin/rgs-business-control-center/${slug}` : `/admin/rgs-business-control-center`,
                { replace: true },
              );
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
  "payroll-labor": "payroll",
  invoices: "invoices",
  "cash-flow": "cash",
  report: "report",
};
const TAB_TO_MODULE: Record<string, string> = {
  revenue: "revenue-tracker",
  expenses: "expense-tracker",
  payroll: "payroll-labor",
  invoices: "invoices",
  cash: "cash-flow",
  report: "report",
};
function moduleToTab(slug?: string) {
  if (!slug) return "overview";
  return MODULE_TO_TAB[slug] || "overview";
}
function tabToModule(tab: string) {
  return TAB_TO_MODULE[tab] || "";
}
