// P20.3 — RGS Intelligence types.
//
// Two-layer brain architecture:
//   1. General RGS Brain — universal small-business instability patterns.
//   2. Industry Brains  — vertical-specific signals, metrics, leaks, tools.
//
// All pure / deterministic. No AI. No network. Outputs reuse the canonical
// Leak object so the priority engine and existing surfaces consume them
// without any UI redesign.

import type { TargetGear } from "@/lib/gears/targetGear";
import type { IndustryCategory } from "@/lib/priorityEngine/types";
import type { Leak, LeakConfidence, LeakSeverity } from "@/lib/leakEngine/leakObject";

/** Universal instability pattern keys (General RGS Brain). */
export type UniversalIssueKey =
  | "unclear_revenue_source"
  | "poor_follow_up"
  | "delayed_invoicing"
  | "weak_profitability_visibility"
  | "owner_dependent_process"
  | "inconsistent_review_rhythm"
  | "manual_workaround_dependency"
  | "no_clear_task_ownership"
  | "missing_source_attribution"
  | "incomplete_or_unverified_data";

/** A normalized signal observation passed to the brain layer. */
export interface BrainSignal {
  key: string;
  observation: string;
  estimated_revenue_impact?: number;
  severity?: LeakSeverity;
  confidence?: LeakConfidence;
  gear?: TargetGear;
  source_ref?: string | null;
  client_or_job?: string | null;
}

/** Optional structured industry data the brains can consume. */
export interface IndustryDataInput {
  trades?: {
    estimatesSent?: number;
    estimatesUnsent?: number;
    jobsCompleted?: number;
    jobsCompletedNotInvoiced?: number;
    grossMarginPct?: number | null;
    hasJobCosting?: boolean;
    /** P20.9 — total dollars in unpaid invoices currently outstanding. */
    unpaidInvoiceAmount?: number | null;
    /** P20.9 — true if the business can see revenue/margin per service line. */
    serviceLineVisibility?: boolean;
  };
  restaurant?: {
    foodCostPct?: number | null;
    laborCostPct?: number | null;
    grossMarginPct?: number | null;
    tracksWaste?: boolean;
    hasDailyReporting?: boolean;
    /** P20.9 — true if menu-item / category margin is regularly tracked. */
    menuMarginVisible?: boolean;
    /** P20.9 — vendor cost change as decimal (0.06 = +6%). Can be negative. */
    vendorCostChangePct?: number | null;
    /** P20.9 — context: average daily sales in dollars. */
    dailySales?: number | null;
    /** P20.9 — context: average ticket in dollars. */
    averageTicket?: number | null;
  };
  retail?: {
    deadStockValue?: number | null;
    inventoryTurnover?: number | null;
    stockoutCount?: number | null;
    returnRatePct?: number | null;
    hasCategoryMargin?: boolean;
    /** P20.9 — count of high-sales but low-margin SKUs. */
    highSalesLowMarginCount?: number | null;
    /** P20.9 — total inventory value in dollars (used for dead-stock ratio). */
    inventoryValue?: number | null;
    /** P20.9 — context: average order value in dollars. */
    averageOrderValue?: number | null;
  };
  /**
   * Cannabis / MMC (Medical + Recreational Marijuana / dispensary retail).
   * This is a regulated retail / inventory / margin business — NOT a
   * healthcare practice. Do not add patient/claim/reimbursement fields here.
   */
  cannabis?: {
    grossMarginPct?: number | null;
    productMarginVisible?: boolean;
    categoryMarginVisible?: boolean;
    deadStockValue?: number | null;
    stockoutCount?: number | null;
    inventoryTurnover?: number | null;
    shrinkagePct?: number | null;
    discountImpactPct?: number | null;
    promotionImpactPct?: number | null;
    vendorCostIncreasePct?: number | null;
    highSalesLowMarginCount?: number | null;
    cashTiedUpInSlowStock?: number | null;
    paymentReconciliationGap?: boolean;
    hasDailyOrWeeklyReporting?: boolean;
    usesManualPosWorkaround?: boolean;
    /** P20.9 — total cannabis inventory value in dollars (dead-stock ratio). */
    inventoryValue?: number | null;
  };
  shared?: {
    hasWeeklyReview?: boolean;
    ownerIsBottleneck?: boolean;
    usesManualSpreadsheet?: boolean;
    hasAssignedOwners?: boolean;
    hasSourceAttribution?: boolean;
    profitVisible?: boolean;
  };
}

export interface BrainInput {
  industry: IndustryCategory;
  industryConfirmed: boolean;
  signals?: BrainSignal[];
  existingLeaks?: Leak[];
  industryData?: IndustryDataInput;
  now?: Date;
}

export interface BrainResult {
  brain: "general" | IndustryCategory;
  leaks: Leak[];
}

export interface RequiredDataField {
  field: string;
  required: boolean;
  sources: Array<
    | "manual_entry"
    | "csv_upload"
    | "file_upload"
    | "quickbooks"
    | "admin_assumption"
    | "client_input"
  >;
  confidence: LeakConfidence;
  notes?: string;
}

export interface ToolCoverageEntry {
  tool_key: string;
  industry: IndustryCategory;
  gear: TargetGear;
  packages: Array<"diagnostic" | "implementation" | "revenue_control">;
  required_data: string[];
  output_type: "report" | "dashboard" | "checklist" | "score" | "alert";
  visibility: "client_visible" | "admin_only";
}
