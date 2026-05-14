// RGS SWOT Strategic Matrix — TypeScript contracts
// Mirrors the swot_analyses / swot_items / swot_signals schema.

export type SwotCategory = "strength" | "weakness" | "opportunity" | "threat";

export type SwotAnalysisStatus =
  | "draft" | "needs_inputs" | "ready_for_review"
  | "reviewed" | "approved" | "archived";

export type SwotAnalysisMode =
  | "full_rgs_client" | "diagnostic_support" | "implementation_support"
  | "control_system_support" | "standalone_gig" | "demo";

export type SwotEvidenceConfidence =
  | "verified" | "partially_supported" | "owner_claim_only"
  | "assumption" | "missing_evidence";

export type SwotItemSourceType =
  | "scorecard" | "diagnostic" | "owner_interview" | "evidence_upload"
  | "admin_observation" | "industry_brain" | "implementation"
  | "control_system" | "manual" | "demo";

export type SwotLinkedGear =
  | "demand_generation" | "revenue_conversion" | "operational_efficiency"
  | "financial_visibility" | "owner_independence" | "multiple";

export type SwotSeverityOrLeverage = "low" | "moderate" | "high" | "critical";

export type SwotInternalExternal = "internal" | "external";

export type SwotSignalType =
  | "repair_priority" | "campaign_input" | "buyer_persona_input"
  | "implementation_input" | "control_system_watch_item"
  | "reengagement_trigger" | "evidence_needed"
  | "owner_independence_risk" | "conversion_risk" | "demand_opportunity"
  | "financial_visibility_risk" | "operational_bottleneck";

export interface SwotAnalysis {
  id: string;
  customer_id: string;
  title: string;
  status: SwotAnalysisStatus;
  analysis_mode: SwotAnalysisMode;
  industry: string | null;
  business_stage: string | null;
  notes: string | null;
  created_by: string | null;
  reviewed_by: string | null;
  approved_by: string | null;
  reviewed_at: string | null;
  approved_at: string | null;
  client_visible: boolean;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface SwotItem {
  id: string;
  swot_analysis_id: string;
  customer_id: string;
  category: SwotCategory;
  title: string;
  description: string | null;
  evidence_summary: string | null;
  evidence_confidence: SwotEvidenceConfidence;
  source_type: SwotItemSourceType;
  linked_gear: SwotLinkedGear;
  severity_or_leverage: SwotSeverityOrLeverage;
  internal_external: SwotInternalExternal;
  client_safe_summary: string | null;
  admin_only_notes: string | null;
  recommended_action: string | null;
  repair_map_relevance: boolean;
  implementation_relevance: boolean;
  campaign_relevance: boolean;
  control_system_monitoring_relevance: boolean;
  reengagement_trigger_relevance: boolean;
  client_visible: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface SwotSignal {
  id: string;
  customer_id: string;
  swot_analysis_id: string;
  swot_item_id: string | null;
  signal_type: SwotSignalType;
  gear: SwotLinkedGear | null;
  summary: string;
  confidence: SwotEvidenceConfidence;
  client_safe: boolean;
  admin_only: boolean;
  consumed_by: string[];
  created_at: string;
  updated_at: string;
}

/** Item shape accepted by the deterministic engine before persistence. */
export type SwotItemInput = Pick<
  SwotItem,
  | "category" | "title"
> & Partial<Omit<SwotItem,
  "id" | "swot_analysis_id" | "customer_id" | "created_at" | "updated_at"
>>;

/** Signal shape produced by the engine before persistence. */
export type SwotSignalDraft = Omit<
  SwotSignal,
  "id" | "created_at" | "updated_at"
>;