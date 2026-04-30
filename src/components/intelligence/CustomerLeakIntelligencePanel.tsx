// P20.6 — Admin-only wrapper that mounts AdminLeakIntelligencePanel into
// real customer admin surfaces with live customer context.
//
// P20.7 — Now also feeds the latest scorecard run + business snapshot into
// the existing analyzeLeaks() pipeline so customers without estimate
// friction can still produce a meaningful Top 3 from General-Brain signals.
//
// Responsibilities (no new business logic — orchestration only):
//   * Resolve the customer's industry from the admin-confirmed field.
//   * Pull the customer's estimates + invoice→estimate links so estimate
//     friction leaks can render alongside brain leaks.
//   * Pull the customer's latest scorecard run (matched by email) and
//     business snapshot, then deterministically map them to BrainSignal[]
//     and IndustryDataInput via `@/lib/intelligence/customerContext`.
//     No AI, no new scoring, no fabricated numeric metrics.
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
import { supabase } from "@/integrations/supabase/client";
import {
  brainSignalsFromScorecard,
  industryDataFromScorecard,
  industryDataFromSnapshot,
  industryDataFromMetrics,
  mergeBrainSignals,
  mergeIndustryData,
  type BusinessSnapshotLike,
  type ScorecardRunLike,
} from "@/lib/intelligence/customerContext";
import type { BrainSignal, IndustryDataInput } from "@/lib/intelligence/types";
import { getLatestCustomerMetrics } from "@/lib/customerMetrics/service";
import type { CustomerBusinessMetrics } from "@/lib/customerMetrics/types";

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
  const [scorecardRun, setScorecardRun] = useState<ScorecardRunLike | null>(null);
  const [snapshot, setSnapshot] = useState<BusinessSnapshotLike | null>(null);
  const [metrics, setMetrics] = useState<CustomerBusinessMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    if (!isClientFlow || !customer.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    (async () => {
      try {
        const [es, links, scRes, snapRes, metricsRow] = await Promise.all([
          listEstimates(customer.id).catch(() => [] as Estimate[]),
          listInvoiceEstimateLinks(customer.id).catch(
            () => [] as { source_estimate_id: string | null }[],
          ),
          // Latest scorecard run for this customer's email, if any.
          // RLS limits clients to their own; admins see all. Match by email
          // because scorecard_runs is captured pre-conversion (no FK).
          customer.email
            ? supabase
                .from("scorecard_runs")
                .select("id, created_at, pillar_results, overall_confidence")
                .ilike("email", customer.email)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle()
            : Promise.resolve({ data: null }),
          supabase
            .from("client_business_snapshots")
            .select(
              "snapshot_status, industry_verified, what_business_does, products_services, revenue_model, operating_model",
            )
            .eq("customer_id", customer.id)
            .maybeSingle(),
          getLatestCustomerMetrics(customer.id).catch(() => null),
        ]);
        if (!cancelled) {
          setEstimates(es);
          setInvoiceLinks(links);
          setScorecardRun(((scRes as any)?.data ?? null) as ScorecardRunLike | null);
          setSnapshot(((snapRes as any)?.data ?? null) as BusinessSnapshotLike | null);
          setMetrics(metricsRow);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [customer.id, customer.email, isClientFlow, reloadTick]);

  const industry = resolveIndustry(customer.industry);
  const industryConfirmed = !!customer.industry_confirmed_by_admin;

  const brainSignals: BrainSignal[] = useMemo(
    () => mergeBrainSignals(brainSignalsFromScorecard(scorecardRun)),
    [scorecardRun],
  );
  const industryData: IndustryDataInput | undefined = useMemo(
    () =>
      mergeIndustryData(
        mergeIndustryData(
          industryDataFromScorecard(scorecardRun),
          industryDataFromSnapshot(snapshot, industry),
        ),
        // Structured metrics override weaker free-text signals when set.
        industryDataFromMetrics(metrics, industry),
      ),
    [scorecardRun, snapshot, metrics, industry],
  );

  const analysis: LeakAnalysis = useMemo(
    () =>
      analyzeLeaks({
        industry,
        industryConfirmed,
        estimates,
        invoiceEstimateLinks: invoiceLinks,
        brainSignals,
        industryData,
      }),
    [industry, industryConfirmed, estimates, invoiceLinks, brainSignals, industryData],
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