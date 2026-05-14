export type RgsToolStage =
  | "public_funnel"
  | "diagnostic"
  | "strategic_analysis"
  | "repair_planning"
  | "implementation"
  | "control_system"
  | "campaign_control"
  | "reporting"
  | "admin_support";

export type RgsSignalKey =
  | "scorecard_run"
  | "deterministic_score"
  | "gear_scores"
  | "diagnostic_finding"
  | "owner_interview_answer"
  | "swot_signal"
  | "buyer_persona_signal"
  | "evidence_record"
  | "repair_map_item"
  | "implementation_step"
  | "sop_record"
  | "workflow_map"
  | "decision_rights_map"
  | "training_assignment"
  | "control_system_signal"
  | "campaign_profile"
  | "campaign_brief"
  | "campaign_asset"
  | "campaign_performance"
  | "report_artifact"
  | "guide_bot_draft"
  | "risk_monitor_signal"
  | "owner_decision_signal"
  | "priority_action";

export type MissingInputBehavior =
  | "block"
  | "lower_confidence"
  | "show_empty_state"
  | "admin_review_required"
  | "manual_fallback";

export interface RgsToolInterlockContract {
  toolKey: string;
  displayName: string;
  stage: RgsToolStage;
  customerScopeRequired: boolean;
  requiredInputs: RgsSignalKey[];
  optionalInputs: RgsSignalKey[];
  producesSignals: RgsSignalKey[];
  consumesSignals: RgsSignalKey[];
  downstreamTools: string[];
  upstreamTools: string[];
  reportOutputs: string[];
  clientVisibleFields: string[];
  adminOnlyFields: string[];
  approvalRequired: boolean;
  evidenceRequired: boolean;
  reengagementTriggers: string[];
  controlSystemMonitoringHooks: string[];
  standaloneEligible: boolean;
  gigBundleEligible: boolean;
  safetyBoundaries: string[];
  scopeBoundaries: string[];
  missingInputBehavior: MissingInputBehavior;
}

export interface InterlockValidationResult {
  ok: boolean;
  issues: string[];
}

