/**
 * P100A — Resolve any standalone-tool toolKey alias used elsewhere in the
 * codebase to the canonical key registered in `GIG_TOOL_REGISTRY` (or to a
 * FULL_CLIENT_ONLY_TOOLS entry). This lets the existing
 * `StandaloneToolRunner` and individual tool screens hand whatever key they
 * already use into `checkGigToolAccess` without rewiring their internal
 * registries.
 *
 * Pure / no DB. Tested in `gigToolKeyMap.test.ts`.
 */

import {
  FULL_CLIENT_ONLY_TOOLS,
  GIG_TOOL_REGISTRY,
  type GigToolKey,
  type FullClientOnlyTool,
} from "./gigTier";

/** Aliases used by older registries (StandaloneToolRunner, tool routes, etc.). */
const ALIAS_TO_GIG: Record<string, GigToolKey> = {
  // SOP
  sop_training_bible: "sop_training_bible",
  // ICP / Buyer Persona
  buyer_persona_tool: "buyer_persona_icp",
  buyer_persona_icp: "buyer_persona_icp",
  persona_builder: "buyer_persona_icp",
  // SWOT
  swot: "swot_strategic_matrix",
  swot_analysis: "swot_strategic_matrix",
  swot_strategic_matrix: "swot_strategic_matrix",
  // Goals / KPI
  goals_kpi: "goals_kpi_plan",
  goals_kpi_plan: "goals_kpi_plan",
  // Workflow / Process
  workflow_process_mapping: "workflow_process_map",
  workflow_process_map: "workflow_process_map",
  process_breakdown: "workflow_process_map",
  journey_mapper: "workflow_process_map",
  // Campaign
  campaign_brief: "campaign_brief",
  campaign_strategy: "campaign_strategy",
  campaign_control: "campaign_strategy",
  // Friction / Snapshot
  business_friction_snapshot: "business_friction_snapshot",
  cost_of_friction_calculator: "business_friction_snapshot",
  scan_snapshot: "business_friction_snapshot",
};

/** Aliases for tools that are full-RGS-client only and must never be exposed
 *  to a gig customer. */
const ALIAS_TO_FULL_CLIENT_ONLY: Record<string, FullClientOnlyTool> = {
  diagnostic_scorecard: "diagnostic_scorecard",
  scorecard: "diagnostic_scorecard",
  stability_scorecard: "diagnostic_scorecard",
  owner_interview: "owner_interview",
  owner_diagnostic_interview: "owner_interview",
  evidence_vault: "evidence_vault",
  diagnostic_report: "diagnostic_report",
  priority_repair_map: "priority_repair_map",
  implementation_roadmap: "implementation_roadmap",
  control_system: "control_system",
  rgs_control_system: "control_system",
  revenue_risk_monitor: "revenue_risk_monitor",
  revenue_review_sync: "revenue_risk_monitor",
};

export type ResolvedGigKey =
  | { kind: "gig"; key: GigToolKey }
  | { kind: "full_client_only"; key: FullClientOnlyTool }
  | { kind: "unknown" };

export function resolveGigToolKey(raw: string | null | undefined): ResolvedGigKey {
  if (!raw) return { kind: "unknown" };
  const k = raw.trim();
  if (ALIAS_TO_GIG[k]) return { kind: "gig", key: ALIAS_TO_GIG[k] };
  if (ALIAS_TO_FULL_CLIENT_ONLY[k])
    return { kind: "full_client_only", key: ALIAS_TO_FULL_CLIENT_ONLY[k] };
  // Direct registry membership without an alias entry.
  if ((Object.keys(GIG_TOOL_REGISTRY) as string[]).includes(k))
    return { kind: "gig", key: k as GigToolKey };
  if ((FULL_CLIENT_ONLY_TOOLS as readonly string[]).includes(k))
    return { kind: "full_client_only", key: k as FullClientOnlyTool };
  return { kind: "unknown" };
}
