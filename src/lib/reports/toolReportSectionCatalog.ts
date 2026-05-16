/**
 * P101 — Per-tool section catalog for the Tool Report Artifact framework.
 *
 * Pure data. Defines, for each priority tool, the section keys allowed
 * under each gig tier and under the full RGS report mode. Section bodies
 * are still authored by the calling tool; this catalog only decides
 * **which** sections may appear in a generated artifact.
 *
 * Invariants enforced by tests in
 * `src/lib/__tests__/p101ToolReportSectionCatalog.test.ts`:
 *
 *  • Every priority tool defines four section sets.
 *  • Basic ⊆ Standard ⊆ Premium (no surprise loss of allowed sections
 *    when a customer upgrades).
 *  • full_rgs section set never bleeds full-RGS-only sections into the
 *    Basic/Standard/Premium gig sets.
 *  • No section label contains forbidden guarantee/compliance copy.
 */

import type { GigTier } from "@/lib/gig/gigTier";

export interface ToolReportSection {
  key: string;
  label: string;
}

export interface ToolReportSectionSet {
  basic: ToolReportSection[];
  standard: ToolReportSection[];
  premium: ToolReportSection[];
  full_rgs: ToolReportSection[];
}

/** Sections that must never appear in any gig-tier section set. */
export const FULL_RGS_ONLY_SECTION_KEYS = [
  "diagnostic_link",
  "priority_repair_map_link",
  "implementation_roadmap_link",
  "control_system_link",
  "revenue_risk_monitor_link",
  "ongoing_advisory",
] as const;

function s(key: string, label: string): ToolReportSection {
  return { key, label };
}

const SOP: ToolReportSectionSet = {
  basic: [
    s("executive_summary", "Executive summary"),
    s("process_purpose", "Process purpose"),
    s("step_by_step", "Step-by-step SOP"),
    s("next_actions", "Next actions"),
  ],
  standard: [
    s("executive_summary", "Executive summary"),
    s("process_purpose", "Process purpose"),
    s("process_owner", "Who owns the process"),
    s("step_by_step", "Step-by-step SOP"),
    s("roles_responsibilities", "Roles and responsibilities"),
    s("training_checklist", "Training checklist"),
    s("next_actions", "Next actions"),
  ],
  premium: [
    s("executive_summary", "Executive summary"),
    s("process_purpose", "Process purpose"),
    s("process_owner", "Who owns the process"),
    s("step_by_step", "Step-by-step SOP"),
    s("roles_responsibilities", "Roles and responsibilities"),
    s("training_checklist", "Training checklist"),
    s("quality_checks", "Quality checks"),
    s("failure_points", "Common failure points"),
    s("next_actions", "Next actions"),
  ],
  full_rgs: [
    s("executive_summary", "Executive summary"),
    s("process_purpose", "Process purpose"),
    s("process_owner", "Who owns the process"),
    s("step_by_step", "Step-by-step SOP"),
    s("roles_responsibilities", "Roles and responsibilities"),
    s("training_checklist", "Training checklist"),
    s("quality_checks", "Quality checks"),
    s("failure_points", "Common failure points"),
    s("next_actions", "Next actions"),
    s("implementation_roadmap_link", "Implementation roadmap connection"),
    s("control_system_link", "RGS Control System connection"),
  ],
};

const WORKFLOW: ToolReportSectionSet = {
  basic: [
    s("executive_summary", "Executive summary"),
    s("current_workflow", "Current workflow description"),
    s("next_actions", "Next actions"),
  ],
  standard: [
    s("executive_summary", "Executive summary"),
    s("current_workflow", "Current workflow description"),
    s("bottlenecks", "Bottlenecks and friction points"),
    s("handoff_map", "Handoff map"),
    s("recommended_workflow", "Recommended workflow"),
    s("next_actions", "Next actions"),
  ],
  premium: [
    s("executive_summary", "Executive summary"),
    s("current_workflow", "Current workflow description"),
    s("bottlenecks", "Bottlenecks and friction points"),
    s("handoff_map", "Handoff map"),
    s("failure_points", "Failure points"),
    s("simplification", "Simplification opportunities"),
    s("recommended_workflow", "Recommended workflow"),
    s("next_actions", "Next actions"),
  ],
  full_rgs: [
    s("executive_summary", "Executive summary"),
    s("current_workflow", "Current workflow description"),
    s("bottlenecks", "Bottlenecks and friction points"),
    s("handoff_map", "Handoff map"),
    s("failure_points", "Failure points"),
    s("simplification", "Simplification opportunities"),
    s("recommended_workflow", "Recommended workflow"),
    s("next_actions", "Next actions"),
    s("implementation_roadmap_link", "Implementation roadmap connection"),
    s("control_system_link", "RGS Control System connection"),
  ],
};

const DECISION_RIGHTS: ToolReportSectionSet = {
  basic: [
    s("executive_summary", "Executive summary"),
    s("decision_areas", "Decision areas"),
    s("next_actions", "Next actions"),
  ],
  standard: [
    s("executive_summary", "Executive summary"),
    s("decision_areas", "Decision areas"),
    s("owner_vs_team", "Owner vs team responsibilities"),
    s("approval_requirements", "Approval requirements"),
    s("next_actions", "Next actions"),
  ],
  premium: [
    s("executive_summary", "Executive summary"),
    s("decision_areas", "Decision areas"),
    s("owner_vs_team", "Owner vs team responsibilities"),
    s("approval_requirements", "Approval requirements"),
    s("escalation_rules", "Escalation rules"),
    s("accountability_map", "Accountability map"),
    s("ownership_risks", "Risks from unclear ownership"),
    s("next_actions", "Next actions"),
  ],
  full_rgs: [
    s("executive_summary", "Executive summary"),
    s("decision_areas", "Decision areas"),
    s("owner_vs_team", "Owner vs team responsibilities"),
    s("approval_requirements", "Approval requirements"),
    s("escalation_rules", "Escalation rules"),
    s("accountability_map", "Accountability map"),
    s("ownership_risks", "Risks from unclear ownership"),
    s("next_actions", "Next actions"),
    s("control_system_link", "RGS Control System connection"),
  ],
};

const ICP: ToolReportSectionSet = {
  basic: [
    s("executive_summary", "Executive summary"),
    s("best_fit_profile", "Best-fit customer profile"),
    s("next_actions", "Next actions"),
  ],
  standard: [
    s("executive_summary", "Executive summary"),
    s("best_fit_profile", "Best-fit customer profile"),
    s("pain_points", "Pain points"),
    s("buying_triggers", "Buying triggers"),
    s("objections", "Objections"),
    s("message_angle", "Message angle"),
    s("next_actions", "Next actions"),
  ],
  premium: [
    s("executive_summary", "Executive summary"),
    s("best_fit_profile", "Best-fit customer profile"),
    s("pain_points", "Pain points"),
    s("buying_triggers", "Buying triggers"),
    s("objections", "Objections"),
    s("decision_criteria", "Decision criteria"),
    s("message_angle", "Message angle"),
    s("channel_implications", "Channel implications"),
    s("next_actions", "Next actions"),
  ],
  full_rgs: [
    s("executive_summary", "Executive summary"),
    s("best_fit_profile", "Best-fit customer profile"),
    s("pain_points", "Pain points"),
    s("buying_triggers", "Buying triggers"),
    s("objections", "Objections"),
    s("decision_criteria", "Decision criteria"),
    s("message_angle", "Message angle"),
    s("channel_implications", "Channel implications"),
    s("next_actions", "Next actions"),
    s("diagnostic_link", "Diagnostic and Demand Generation connection"),
  ],
};

const SWOT: ToolReportSectionSet = {
  basic: [
    s("executive_summary", "Executive summary"),
    s("strengths", "Strengths"),
    s("weaknesses", "Weaknesses"),
    s("next_actions", "Next actions"),
  ],
  standard: [
    s("executive_summary", "Executive summary"),
    s("strengths", "Strengths"),
    s("weaknesses", "Weaknesses"),
    s("opportunities", "Opportunities"),
    s("threats", "Threats"),
    s("priority_actions", "Priority actions"),
    s("next_actions", "Next actions"),
  ],
  premium: [
    s("executive_summary", "Executive summary"),
    s("strengths", "Strengths"),
    s("weaknesses", "Weaknesses"),
    s("opportunities", "Opportunities"),
    s("threats", "Threats"),
    s("strategic_implications", "Strategic implications"),
    s("priority_actions", "Priority actions"),
    s("risk_notes", "Risk notes"),
    s("next_actions", "Next actions"),
  ],
  full_rgs: [
    s("executive_summary", "Executive summary"),
    s("strengths", "Strengths"),
    s("weaknesses", "Weaknesses"),
    s("opportunities", "Opportunities"),
    s("threats", "Threats"),
    s("strategic_implications", "Strategic implications"),
    s("priority_actions", "Priority actions"),
    s("risk_notes", "Risk notes"),
    s("next_actions", "Next actions"),
    s("priority_repair_map_link", "Priority Repair Map connection"),
    s("implementation_roadmap_link", "Implementation roadmap connection"),
  ],
};

const CAMPAIGN_BRIEF: ToolReportSectionSet = {
  basic: [
    s("campaign_summary", "Campaign summary"),
    s("goal", "Goal"),
    s("offer_message", "Offer and message"),
    s("manual_publish_plan", "Manual publishing plan"),
    s("next_best_actions", "Next best actions"),
  ],
  standard: [
    s("campaign_summary", "Campaign summary"),
    s("goal", "Goal"),
    s("audience_alignment", "Audience and persona alignment"),
    s("offer_message", "Offer and message"),
    s("channel_strategy", "Channel strategy"),
    s("cta_flow", "CTA flow"),
    s("manual_publish_plan", "Manual publishing plan"),
    s("risks_exclusions", "Risks and exclusions"),
    s("next_best_actions", "Next best actions"),
  ],
  premium: [
    s("campaign_summary", "Campaign summary"),
    s("goal", "Goal"),
    s("audience_alignment", "Audience and persona alignment"),
    s("offer_message", "Offer and message"),
    s("channel_strategy", "Channel strategy"),
    s("hook_planning", "Hook, caption and ad-copy planning"),
    s("cta_flow", "CTA flow"),
    s("manual_publish_plan", "Manual publishing plan"),
    s("risks_exclusions", "Risks and exclusions"),
    s("next_best_actions", "Next best actions"),
  ],
  full_rgs: [
    s("campaign_summary", "Campaign summary"),
    s("goal", "Goal"),
    s("audience_alignment", "Audience and persona alignment"),
    s("offer_message", "Offer and message"),
    s("channel_strategy", "Channel strategy"),
    s("hook_planning", "Hook, caption and ad-copy planning"),
    s("cta_flow", "CTA flow"),
    s("manual_publish_plan", "Manual publishing plan"),
    s("risks_exclusions", "Risks and exclusions"),
    s("next_best_actions", "Next best actions"),
    s("control_system_link", "RGS Control System connection"),
  ],
};

const CAMPAIGN_VIDEO_PLAN: ToolReportSectionSet = {
  basic: [
    s("video_summary", "Campaign video summary"),
    s("objective", "Video objective"),
    s("target_audience", "Target audience"),
    s("hook", "Hook"),
    s("scene_plan", "Scene plan"),
    s("cta_scene", "CTA scene"),
    s("manual_publish_clarification", "Manual publish-ready clarification"),
  ],
  standard: [
    s("video_summary", "Campaign video summary"),
    s("objective", "Video objective"),
    s("target_audience", "Target audience"),
    s("hook", "Hook"),
    s("scene_plan", "Scene plan"),
    s("on_screen_copy", "On-screen copy"),
    s("voiceover_script", "Voiceover script"),
    s("asset_needs", "Asset needs"),
    s("cta_scene", "CTA scene"),
    s("review_checklist", "Review checklist"),
    s("render_status", "Render status"),
    s("manual_publish_clarification", "Manual publish-ready clarification"),
  ],
  premium: [
    s("video_summary", "Campaign video summary"),
    s("objective", "Video objective"),
    s("target_audience", "Target audience"),
    s("hook", "Hook"),
    s("scene_plan", "Scene plan"),
    s("on_screen_copy", "On-screen copy"),
    s("voiceover_script", "Voiceover script"),
    s("asset_needs", "Asset needs"),
    s("cta_scene", "CTA scene"),
    s("review_checklist", "Review checklist"),
    s("render_status", "Render status"),
    s("manual_publish_clarification", "Manual publish-ready clarification"),
  ],
  full_rgs: [
    s("video_summary", "Campaign video summary"),
    s("objective", "Video objective"),
    s("target_audience", "Target audience"),
    s("hook", "Hook"),
    s("scene_plan", "Scene plan"),
    s("on_screen_copy", "On-screen copy"),
    s("voiceover_script", "Voiceover script"),
    s("asset_needs", "Asset needs"),
    s("cta_scene", "CTA scene"),
    s("review_checklist", "Review checklist"),
    s("render_status", "Render status"),
    s("manual_publish_clarification", "Manual publish-ready clarification"),
    s("control_system_link", "RGS Control System connection"),
  ],
};

/** Tools wired by P101. Keys align with `GIG_TOOL_REGISTRY` where applicable. */
export const TOOL_REPORT_SECTION_CATALOG: Record<string, ToolReportSectionSet> = {
  sop_training_bible: SOP,
  workflow_process_map: WORKFLOW,
  workflow_process_mapping: WORKFLOW,
  decision_rights_accountability: DECISION_RIGHTS,
  buyer_persona_icp: ICP,
  buyer_persona_tool: ICP,
  swot_strategic_matrix: SWOT,
  rgs_stability_snapshot: SWOT,
  campaign_brief: CAMPAIGN_BRIEF,
  campaign_strategy: CAMPAIGN_BRIEF,
  campaign_video_plan: CAMPAIGN_VIDEO_PLAN,
};

export const PRIORITY_TOOL_KEYS = [
  "sop_training_bible",
  "workflow_process_map",
  "decision_rights_accountability",
  "buyer_persona_icp",
  "swot_strategic_matrix",
  "campaign_brief",
  "campaign_video_plan",
] as const;

export function getToolReportSectionSet(
  toolKey: string,
): ToolReportSectionSet | null {
  return TOOL_REPORT_SECTION_CATALOG[toolKey] ?? null;
}

export function getAllowedSectionsForTier(
  toolKey: string,
  tier: GigTier | null | undefined,
): ToolReportSection[] {
  const set = getToolReportSectionSet(toolKey);
  if (!set) return [];
  if (!tier) return set.basic;
  return set[tier];
}

export function getFullRgsSectionsForTool(
  toolKey: string,
): ToolReportSection[] {
  const set = getToolReportSectionSet(toolKey);
  return set ? set.full_rgs : [];
}