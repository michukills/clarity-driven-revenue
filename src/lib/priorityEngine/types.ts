// P16.1 — Priority Engine shared types.

export type IndustryCategory =
  | "trade_field_service"
  | "retail"
  | "restaurant"
  | "mmj_cannabis"
  | "general_service"
  | "other";

export type PriorityBand = "critical" | "high" | "medium" | "low";

export interface PriorityFactors {
  /** money / control / stability / revenue affected (1–5) */
  impact: number;
  /** how strongly the client feels or sees the pain (1–5) */
  visibility: number;
  /** how realistic / quick the fix is (1–5; higher = easier) */
  ease_of_fix: number;
  /** does fixing this unlock another system / bottleneck (1–5) */
  dependency: number;
}

export interface ScoredIssue extends PriorityFactors {
  issue_key: string;
  issue_title: string;
  source_recommendation_id: string | null;
  priority_score: number;
  priority_band: PriorityBand;
  rank: number;
  rationale: string;
}

export interface SuggestionSeed {
  label: string;
  detail?: string;
  source: "report" | "same_industry" | "cross_industry" | "admin_default" | "admin_custom";
  source_ref?: string;
  client_visible?: boolean;
}

export interface ClientTaskSeed {
  rank: number;
  issue_title: string;
  why_it_matters: string;
  evidence_summary: string;
  priority_band: PriorityBand;
  expected_outcome: string;
  next_step: string;
  suggestions: SuggestionSeed[];
}