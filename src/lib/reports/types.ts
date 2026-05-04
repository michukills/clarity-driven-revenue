// P13.Reports.AI.1 — Evidence-grounded report drafts: shared types.

export type ReportDraftType =
  | "diagnostic"
  | "scorecard"
  | "rcc_summary"
  | "implementation_update"
  // P65 — Report Generator Tiering
  | "full_rgs_diagnostic"
  | "fiverr_basic_diagnostic"
  | "fiverr_standard_diagnostic"
  | "fiverr_premium_diagnostic"
  | "implementation_report"
  // P69 — Tool-Specific Report Generator (separate from main reports)
  | "tool_specific";

export type ReportDraftStatus = "draft" | "needs_review" | "approved" | "archived";
export type ReportGenerationMode = "deterministic" | "ai_assisted";
export type ReportAiStatus = "not_run" | "queued" | "complete" | "failed" | "disabled";
export type ReportConfidence = "low" | "medium" | "high";

export interface EvidenceItem {
  source: string;            // e.g. "customer_profile", "scorecard_runs"
  module: string;            // human label, e.g. "Conversational Scorecard"
  title: string;             // short label
  value?: unknown;           // primitive or small object
  detail?: string;           // longer human description
  occurred_at?: string;      // ISO date if relevant
  confidence?: ReportConfidence;
  client_safe: boolean;      // false = admin-only
  is_demo?: boolean;
  is_legacy?: boolean;
  is_admin_entered?: boolean;
  is_imported?: boolean;
  is_synced?: boolean;
}

export interface EvidenceSnapshot {
  collected_at: string;
  customer_id: string | null;
  scorecard_run_id?: string | null;
  customer_label: string;
  is_demo_account: boolean;
  items: EvidenceItem[];
  counts: Record<string, number>;
  notes: string[]; // collector notes (e.g. "QuickBooks not connected")
}

export interface DraftSection {
  key: string;
  label: string;
  body: string;          // markdown-friendly text
  client_safe: boolean;  // admin-only by default
}

export interface DraftRecommendation {
  id: string;
  title: string;
  detail: string;
  evidence_refs: string[]; // sources from EvidenceSnapshot.items
  inference: boolean;       // true = inferred, false = directly evidenced
  priority: "low" | "medium" | "high";
  client_safe: boolean;
}

export interface DraftRisk {
  id: string;
  title: string;
  detail: string;
  evidence_refs: string[];
  severity: "low" | "medium" | "high";
  client_safe: boolean;
}

export interface MissingInfoItem {
  area: string;
  what_is_missing: string;
  why_it_matters: string;
}

export interface DraftPayload {
  sections: DraftSection[];
  recommendations: DraftRecommendation[];
  risks: DraftRisk[];
  missing_information: MissingInfoItem[];
  confidence: ReportConfidence;
  rubric_version: string;
  /** P20.18 — RGS Stability Snapshot (SWOT-style diagnostic layer). Admin-reviewable. */
  stability_snapshot?: import("./stabilitySnapshot").StabilitySnapshot;
}

export interface ReportDraftRow {
  id: string;
  customer_id: string | null;
  scorecard_run_id: string | null;
  report_type: ReportDraftType;
  title: string | null;
  status: ReportDraftStatus;
  generation_mode: ReportGenerationMode;
  ai_status: ReportAiStatus;
  ai_model: string | null;
  ai_version: string | null;
  rubric_version: string;
  evidence_snapshot: EvidenceSnapshot | null;
  /**
   * P20.19 — `draft_sections` JSON now optionally carries the structured
   * RGS Stability Snapshot alongside the rendered sections, so admins
   * can edit the SWOT-style snapshot in a dedicated review surface
   * without a schema migration.
   */
  draft_sections:
    | {
        sections: DraftSection[];
        stability_snapshot?: import("./stabilitySnapshot").StabilitySnapshot;
      }
    | null;
  recommendations: DraftRecommendation[];
  risks: DraftRisk[];
  missing_information: MissingInfoItem[];
  confidence: ReportConfidence;
  client_safe: boolean;
  admin_notes: string | null;
  approved_at: string | null;
  approved_by: string | null;
  generated_by: string | null;
  created_at: string;
  updated_at: string;
}