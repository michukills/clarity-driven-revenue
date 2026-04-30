// P20.4c — Admin-only demo surface that wires the existing intelligence
// outputs (analyzeLeaks → AdminLeakView / ClientLeakView) into rendered UI.
//
// Uses deterministic seed data per industry so admins can verify the rendered
// output side-by-side. No new business logic. No AI. No network calls.
//
// Lives at /admin/intelligence-demo.

import { useMemo, useState } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { analyzeLeaks } from "@/lib/leakEngine";
import type { IndustryCategory } from "@/lib/priorityEngine/types";
import type { BrainSignal, IndustryDataInput } from "@/lib/intelligence/types";
import { AdminLeakIntelligencePanel } from "@/components/intelligence/AdminLeakIntelligencePanel";
import { ClientLeakIntelligencePanel } from "@/components/intelligence/ClientLeakIntelligencePanel";

type Industry = Exclude<IndustryCategory, "other">;

const INDUSTRY_OPTIONS: { value: Industry; label: string }[] = [
  { value: "trade_field_service", label: "Trades / Field Service" },
  { value: "restaurant", label: "Restaurants" },
  { value: "retail", label: "Retail" },
  { value: "mmj_cannabis", label: "Cannabis / MMC (regulated retail)" },
  { value: "general_service", label: "General / Mixed" },
];

/**
 * Deterministic per-industry seed signals + structured data.
 * IMPORTANT: cannabis seeds describe regulated cannabis retail / inventory /
 * margin only — NOT healthcare, patients, claims, or appointments.
 */
function seedFor(industry: Industry): {
  signals: BrainSignal[];
  data: IndustryDataInput;
} {
  switch (industry) {
    case "trade_field_service":
      return {
        signals: [
          {
            key: "delayed_invoicing",
            observation: "Multiple completed jobs sat uninvoiced past 7 days.",
            estimated_revenue_impact: 8200,
            severity: "high",
          },
        ],
        data: {
          trades: {
            estimatesSent: 24,
            estimatesUnsent: 6,
            jobsCompleted: 18,
            jobsCompletedNotInvoiced: 4,
            grossMarginPct: 31,
            hasJobCosting: false,
          },
          shared: { hasWeeklyReview: false, profitVisible: false },
        },
      };
    case "restaurant":
      return {
        signals: [
          {
            key: "weak_profitability_visibility",
            observation: "Food + labor cost combined is above 70% with no menu margin tracking.",
            estimated_revenue_impact: 5400,
            severity: "medium",
          },
        ],
        data: {
          restaurant: {
            foodCostPct: 36,
            laborCostPct: 38,
            grossMarginPct: 26,
            tracksWaste: false,
            hasDailyReporting: true,
          },
        },
      };
    case "retail":
      return {
        signals: [],
        data: {
          retail: {
            deadStockValue: 12400,
            inventoryTurnover: 2.1,
            stockoutCount: 7,
            returnRatePct: 9,
            hasCategoryMargin: false,
          },
        },
      };
    case "mmj_cannabis":
      return {
        signals: [],
        data: {
          // Regulated cannabis retail signals only — NO healthcare semantics.
          cannabis: {
            grossMarginPct: 28,
            productMarginVisible: false,
            categoryMarginVisible: false,
            deadStockValue: 9300,
            stockoutCount: 5,
            inventoryTurnover: 4.2,
            shrinkagePct: 2.1,
            discountImpactPct: 14,
            promotionImpactPct: 9,
            vendorCostIncreasePct: 6,
            paymentReconciliationGap: true,
            hasDailyOrWeeklyReporting: true,
          },
        },
      };
    case "general_service":
    default:
      return {
        signals: [
          {
            key: "owner_dependent_process",
            observation: "Owner is required for most decisions and approvals.",
            estimated_revenue_impact: 3200,
            severity: "medium",
          },
        ],
        data: {
          shared: {
            ownerIsBottleneck: true,
            usesManualSpreadsheet: true,
            hasAssignedOwners: false,
          },
        },
      };
  }
}

export default function IntelligenceDemo() {
  const [industry, setIndustry] = useState<Industry>("trade_field_service");
  const [confirmed, setConfirmed] = useState(true);

  const analysis = useMemo(() => {
    const seed = seedFor(industry);
    return analyzeLeaks({
      industry,
      industryConfirmed: confirmed,
      estimates: [],
      brainSignals: seed.signals,
      industryData: seed.data,
    });
  }, [industry, confirmed]);

  return (
    <PortalShell variant="admin">
      <Link
        to="/admin"
        className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Admin
      </Link>

      <header className="mt-4 mb-6">
        <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Intelligence Outputs
        </div>
        <h1 className="mt-1 text-2xl text-foreground">Rendered admin + client views</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          This admin-only surface renders the existing intelligence pipeline
          outputs (Top 3, ranked issues, brain split, gap report, tool readiness,
          and the simplified client view). Switch industry to verify each
          vertical's copy and gating.
        </p>
      </header>

      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card/40 p-3">
        <label className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          Industry
        </label>
        <select
          value={industry}
          onChange={(e) => setIndustry(e.target.value as Industry)}
          className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground"
        >
          {INDUSTRY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <label className="ml-3 inline-flex items-center gap-2 text-xs text-foreground">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          />
          Industry confirmed
        </label>
      </div>

      <div className="grid gap-8 xl:grid-cols-2">
        <div>
          <div className="mb-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Admin view
          </div>
          <AdminLeakIntelligencePanel admin={analysis.admin} />
        </div>
        <div>
          <div className="mb-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Client view (preview)
          </div>
          <ClientLeakIntelligencePanel client={analysis.client} />
        </div>
      </div>
    </PortalShell>
  );
}