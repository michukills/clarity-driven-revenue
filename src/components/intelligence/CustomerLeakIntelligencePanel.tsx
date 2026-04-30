// P20.6 — Admin-only wrapper that mounts AdminLeakIntelligencePanel into
// real customer admin surfaces with live customer context.
//
// Responsibilities (no new business logic — orchestration only):
//   * Resolve the customer's industry from the admin-confirmed field.
//   * Pull the customer's estimates + invoice→estimate links so estimate
//     friction leaks can render alongside brain leaks.
//   * Run the existing `analyzeLeaks()` pipeline. Industry brain falls back
//     to General/Mixed when industry is not admin-confirmed (existing
//     behavior).
//   * Refuse to mount on the RGS internal/admin operating account. Internal
//     owner work flows through `InternalOwnerTaskPanel`, not this client
//     intelligence panel.
//   * Pass `customerId` so `AdminLeakIntelligencePanel`'s default
//     "Promote to task" handler creates draft/admin-review `client_tasks`
//     rows (`client_visible: false`). Release stays the existing
//     `releaseClientTask()` flow.

import { useEffect, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { analyzeLeaks } from "@/lib/leakEngine";
import type { LeakAnalysis } from "@/lib/leakEngine";
import type { IndustryCategory } from "@/lib/priorityEngine/types";
import { AdminLeakIntelligencePanel } from "@/components/intelligence/AdminLeakIntelligencePanel";
import { isCustomerFlowAccount, getCustomerAccountKind } from "@/lib/customers/accountKind";
import { listEstimates, listInvoiceEstimateLinks } from "@/lib/estimates/service";
import type { Estimate } from "@/lib/estimates/types";

type CustomerLike = {
  id: string;
  industry?: string | null;
  industry_confirmed_by_admin?: boolean | null;
  account_kind?: string | null;
  email?: string | null;
  full_name?: string | null;
  business_name?: string | null;
  status?: string | null;
};

const KNOWN_INDUSTRIES: ReadonlyArray<IndustryCategory> = [
  "trade_field_service",
  "retail",
  "restaurant",
  "mmj_cannabis",
  "general_service",
  "other",
];

function resolveIndustry(value: string | null | undefined): IndustryCategory {
  const v = (value ?? "").trim() as IndustryCategory;
  return KNOWN_INDUSTRIES.includes(v) ? v : "general_service";
}

export interface CustomerLeakIntelligencePanelProps {
  customer: CustomerLike;
}

export function CustomerLeakIntelligencePanel({ customer }: CustomerLeakIntelligencePanelProps) {
  const accountKind = getCustomerAccountKind(customer);
  const isClientFlow = isCustomerFlowAccount(customer);

  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [invoiceLinks, setInvoiceLinks] = useState<{ source_estimate_id: string | null }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!isClientFlow || !customer.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    (async () => {
      try {
        const [es, links] = await Promise.all([
          listEstimates(customer.id).catch(() => [] as Estimate[]),
          listInvoiceEstimateLinks(customer.id).catch(
            () => [] as { source_estimate_id: string | null }[],
          ),
        ]);
        if (!cancelled) {
          setEstimates(es);
          setInvoiceLinks(links);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [customer.id, isClientFlow]);

  const industry = resolveIndustry(customer.industry);
  const industryConfirmed = !!customer.industry_confirmed_by_admin;

  const analysis: LeakAnalysis = useMemo(
    () =>
      analyzeLeaks({
        industry,
        industryConfirmed,
        estimates,
        invoiceEstimateLinks: invoiceLinks,
      }),
    [industry, industryConfirmed, estimates, invoiceLinks],
  );

  // PHASE 3 — Internal/admin account safety. The RGS operating record must
  // never receive client_tasks via this surface. InternalOwnerTaskPanel is
  // the correct path for internal owner work.
  if (!isClientFlow) {
    return (
      <section
        data-testid="customer-leak-intelligence-internal-empty"
        className="rounded-xl border border-border bg-card/40 p-5"
      >
        <div className="flex items-center gap-2 text-foreground">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-medium">Revenue intelligence</h3>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          This is the {accountKind === "internal_admin" ? "RGS internal/admin" : accountKind} operating
          account. Client-facing intelligence and Promote-to-task are intentionally
          disabled here. Internal owner work is handled in the Internal Owner Tasks
          panel.
        </p>
      </section>
    );
  }

  return (
    <section data-testid="customer-leak-intelligence" className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-foreground">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-medium">Revenue intelligence</h3>
        </div>
        <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          Admin only · promotes to admin-review
        </span>
      </div>
      {loading ? (
        <div
          data-testid="customer-leak-intelligence-loading"
          className="rounded-xl border border-border bg-card/40 p-4 text-xs text-muted-foreground"
        >
          Loading customer signals…
        </div>
      ) : (
        <AdminLeakIntelligencePanel
          admin={analysis.admin}
          customerId={customer.id}
          industry={industry}
        />
      )}
    </section>
  );
}

export default CustomerLeakIntelligencePanel;