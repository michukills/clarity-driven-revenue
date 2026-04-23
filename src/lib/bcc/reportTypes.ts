/* P4 — Business Control Reports
   Snapshot shape for monthly + quarterly reports. Stored in
   business_control_reports.report_data so historical reports never change
   when new weekly data is entered. */

import type { LongTrendSnapshot } from "./longTrend";

export type ReportType = "monthly" | "quarterly";
export type ReportStatus = "draft" | "published" | "archived";

/** Current snapshot schema version. Bump when shape changes in a non-additive way. */
export const REPORT_SCHEMA_VERSION = 1;

export type RecommendedNextStep =
  | "Continue Monitoring"
  | "Diagnostic"
  | "Implementation"
  | "Cash Flow Review"
  | "Revenue Leak Review"
  | "Owner Dependency Review"
  | "Quarterly Stability Review";

export interface ReportSection {
  title: string;
  body: string;
  bullets?: string[];
  /** Optional severity tag for color tone in UI. */
  severity?: "ok" | "watch" | "warn" | "critical";
}

/** P10.0 — STOP / START / SCALE item frozen into a published report. */
export interface StopStartScaleSnapshotItem {
  category: "stop" | "start" | "scale";
  title: string;
  explanation: string | null;
  related_pillar: string | null;
  priority: "high" | "medium" | "low";
  display_order: number;
}

export interface StopStartScaleSnapshot {
  snapshot_at: string;
  items: StopStartScaleSnapshotItem[];
}

/** P10.1a — Stability Score benchmark frozen into a published report. */
export interface StabilitySnapshot {
  score: number;
  benchmark_key: string;
  benchmark_label: string;
  benchmark_meaning: string;
  recommended_focus: string;
  recorded_at: string | null;
  source: string | null;
  client_note: string | null;
  snapshot_at: string;
}

export interface ReportSnapshot {
  /** Snapshot schema version. Missing → legacy v0. */
  schemaVersion?: number;
  reportType: ReportType;
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  customerLabel: string;

  healthScore: number | null;
  condition: string;
  confidence: "high" | "medium" | "low";
  confidenceNote: string;

  recommendedNextStep: RecommendedNextStep;
  recommendationReason: string;

  sections: ReportSection[];

  /** Trailing trend table for the period (for quarterly especially). */
  trendTable?: {
    label: string;
    values: { label: string; value: number; signed?: boolean }[];
  }[];

  /** P10.0 — frozen STOP / START / SCALE guidance at publish time. */
  stop_start_scale_snapshot?: StopStartScaleSnapshot;

  /** P10.1a — frozen Stability Score + benchmark at publish time. */
  stability_snapshot?: StabilitySnapshot;

  meta: {
    weeksCovered: number;
    advancedWeeks: number;
    totalRevenue: number;
    totalExpenses: number;
    netCash: number;
    /** P7.1 — long-horizon trend summary (additive, optional for legacy readers). */
    longTrend?: LongTrendSnapshot;
  };
}

export interface BusinessControlReport {
  id: string;
  customer_id: string;
  report_type: ReportType;
  period_start: string;
  period_end: string;
  status: ReportStatus;
  health_score: number | null;
  recommended_next_step: string | null;
  report_data: ReportSnapshot;
  internal_notes: string | null;
  client_notes: string | null;
  published_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}
