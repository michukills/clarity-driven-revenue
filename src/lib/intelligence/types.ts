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
  };
  restaurant?: {
    foodCostPct?: number | null;
    laborCostPct?: number | null;
    grossMarginPct?: number | null;
    tracksWaste?: boolean;
    hasDailyReporting?: boolean;
  };
  retail?: {
    deadStockValue?: number | null;
    inventoryTurnover?: number | null;
    stockoutCount?: number | null;
    returnRatePct?: number | null;
    hasCategoryMargin?: boolean;
  };
  medical?: {
    unbilledServiceCount?: number | null;
    avgBillingDelayDays?: number | null;
    avgReimbursementDelayDays?: number | null;
    followUpBacklog?: number | null;
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
