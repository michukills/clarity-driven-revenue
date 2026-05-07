/**
 * P78 — Tool walkthrough video registry (static).
 *
 * Honest registry of which tool walkthroughs exist, their production status,
 * and where they may be shown. The runtime/db-backed walkthrough manager
 * (`tool_walkthrough_videos` table + `get_client_tool_walkthrough_videos`
 * RPC) is the source of truth for *approved* videos shown to clients. This
 * static registry exists so the OS can:
 *
 *   - declare which tools are expected to have walkthroughs
 *   - track honest production status per walkthrough
 *   - enforce "no download" / "no social share" on portal walkthroughs
 *   - block fake playable players when no finished video exists
 *
 * Public-page videos, downloads, and social-sharing belong to P81A and are
 * intentionally not implemented here.
 */

export type WalkthroughProductionStatus =
  | "finished"
  | "script_needed"
  | "recording_needed"
  | "editing_needed"
  | "planned"
  | "not_available";

export type WalkthroughAudience = "client" | "admin" | "both";

export interface ToolWalkthroughVideoEntry {
  tool_key: string;
  tool_name: string;
  audience: WalkthroughAudience;
  video_status: WalkthroughProductionStatus;
  title: string;
  description: string;
  video_url: string | null;
  poster_url: string | null;
  transcript_url: string | null;
  captions_url: string | null;
  duration_label: string | null;
  last_updated: string;
  show_in_client_portal: boolean;
  show_in_admin_portal: boolean;
  /** Portal walkthrough videos must never expose a download button. */
  no_download: true;
  /** Portal walkthrough videos must never expose a social share button. */
  no_social_share: true;
}

/**
 * Honest current state of RGS tool walkthroughs. Real, approved videos are
 * served from the `tool_walkthrough_videos` table; this registry keeps the
 * production roadmap visible and prevents fake "finished" claims in code.
 */
export const TOOL_WALKTHROUGH_VIDEO_REGISTRY: ToolWalkthroughVideoEntry[] = [
  finishedWalkthrough({
    tool_key: "portal_welcome",
    tool_name: "Welcome to Your RGS Portal",
    audience: "client",
    title: "Welcome to your RGS portal",
    description:
      "Screen-recorded guided tour of the client dashboard using demo data, with owner-facing boundaries and next-step orientation.",
    file_slug: "revenue-growth-systems-welcome-to-your-rgs-portal-walkthrough",
    duration_label: "0:44",
  }),
  finishedWalkthrough({
    tool_key: "owner_diagnostic_interview",
    tool_name: "Owner Diagnostic Interview",
    audience: "client",
    title: "How the Owner Diagnostic Interview works",
    description:
      "Screen-recorded walkthrough of the structured interview, including Interview Assist and Admin Assist boundaries.",
    file_slug: "revenue-growth-systems-owner-diagnostic-interview-walkthrough",
    duration_label: "0:50",
  }),
  finishedWalkthrough({
    tool_key: "rgs_stability_scorecard",
    tool_name: "0–1000 Business Stability Scorecard",
    audience: "client",
    title: "Using the 0–1000 Business Stability Scorecard",
    description:
      "Screen-recorded walkthrough of the scorecard flow, deterministic scoring boundary, and what the owner should review before submitting.",
    file_slug: "revenue-growth-systems-0-1000-business-stability-scorecard-walkthrough",
    duration_label: "0:42",
  }),
  finishedWalkthrough({
    tool_key: "revenue_leak_finder",
    tool_name: "Revenue Leak Detection Engine",
    audience: "client",
    title: "Using the Revenue Leak Detection Engine",
    description:
      "Screen-recorded walkthrough of how the tool organizes leak signals without promising automatic fixes or outcomes.",
    file_slug: "revenue-growth-systems-revenue-leak-detection-engine-walkthrough",
    duration_label: "0:40",
  }),
  finishedWalkthrough({
    tool_key: "implementation_roadmap",
    tool_name: "Implementation Roadmap",
    audience: "client",
    title: "Reading your Implementation Roadmap",
    description:
      "Screen-recorded walkthrough of priorities, sequence, and owner review points inside the implementation lane.",
    file_slug: "revenue-growth-systems-implementation-roadmap-walkthrough",
    duration_label: "0:40",
  }),
  finishedWalkthrough({
    tool_key: "priority_action_tracker",
    tool_name: "Priority Action Tracker",
    audience: "client",
    title: "Using the Priority Action Tracker",
    description:
      "Screen-recorded walkthrough of owner-visible priorities and status without turning the tool into project management.",
    file_slug: "revenue-growth-systems-priority-action-tracker-walkthrough",
    duration_label: "0:39",
  }),
  finishedWalkthrough({
    tool_key: "owner_decision_dashboard",
    tool_name: "Owner Decision Dashboard",
    audience: "client",
    title: "Using the Owner Decision Dashboard",
    description:
      "Screen-recorded walkthrough of owner-level decisions, review timing, and RGS Control System context.",
    file_slug: "revenue-growth-systems-owner-decision-dashboard-walkthrough",
    duration_label: "0:40",
  }),
  finishedWalkthrough({
    tool_key: "monthly_system_review",
    tool_name: "Monthly System Review",
    audience: "client",
    title: "Reading the Monthly System Review",
    description:
      "Screen-recorded walkthrough of monthly owner review signals and bounded decision-support language.",
    file_slug: "revenue-growth-systems-monthly-system-review-walkthrough",
    duration_label: "0:38",
  }),
  finishedWalkthrough({
    tool_key: "scorecard_history_tracker",
    tool_name: "Scorecard History / Stability Trend Tracker",
    audience: "client",
    title: "Reading your Scorecard History",
    description:
      "Screen-recorded walkthrough of stability trend review and what changed since the last scorecard.",
    file_slug: "revenue-growth-systems-scorecard-history-walkthrough",
    duration_label: "0:37",
  }),
  finishedWalkthrough({
    tool_key: "connector_financial_visibility",
    tool_name: "Financial Visibility",
    audience: "client",
    title: "Using Financial Visibility",
    description:
      "Screen-recorded walkthrough of manual source-of-truth visibility and connector boundaries.",
    file_slug: "revenue-growth-systems-financial-visibility-walkthrough",
    duration_label: "0:41",
  }),
  finishedWalkthrough({
    tool_key: "rgs_control_system",
    tool_name: "RGS Control System™",
    audience: "client",
    title: "Using the RGS Control System™",
    description:
      "Screen-recorded walkthrough of the RGS Control System umbrella and how owner visibility stays bounded.",
    file_slug: "revenue-growth-systems-rgs-control-system-walkthrough",
    duration_label: "0:41",
  }),
  entry({
    tool_key: "evidence_vault",
    tool_name: "RGS Evidence Vault\u2122",
    audience: "both",
    video_status: "script_needed",
    title: "Uploading and reviewing Evidence Vault items",
    description:
      "Shows what evidence is useful, how RGS reviews it, and what 'pending review' versus 'accepted' actually means.",
  }),
  entry({
    tool_key: "rgs_repair_map",
    tool_name: "RGS Repair Map\u2122",
    audience: "client",
    video_status: "planned",
    title: "Reading your RGS Repair Map\u2122",
    description:
      "Explains how to read the repair map, what each item means, and how the owner decides what to fix next.",
  }),
  entry({
    tool_key: "sop_training_bible",
    tool_name: "SOP / Training Bible Creator",
    audience: "both",
    video_status: "script_needed",
    title: "Drafting an SOP with the Training Bible Creator",
    description:
      "Shows the safe drafting workflow, AI assist limits, and how SOPs become approved owner-controlled documents.",
  }),
  entry({
    tool_key: "cost_of_friction_calculator",
    tool_name: "Cost of Friction Calculator\u2122",
    audience: "client",
    video_status: "planned",
    title: "Using the Cost of Friction Calculator\u2122",
    description:
      "Walks through entering inputs and reading the deterministic monthly/annual friction estimates.",
  }),
  entry({
    tool_key: "stability_to_value_lens",
    tool_name: "Stability-to-Value Lens\u2122",
    audience: "client",
    video_status: "planned",
    title: "Reading the Stability-to-Value Lens\u2122",
    description:
      "Explains the deterministic structure score, perceived operational risk levels, and the professional-review boundary.",
  }),
  entry({
    tool_key: "revenue_risk_monitor",
    tool_name: "Revenue & Risk Monitor\u2122",
    audience: "client",
    video_status: "planned",
    title: "Working with the Revenue & Risk Monitor\u2122",
    description:
      "Shows how the monitor surfaces revenue and risk signals and what to do when a flag appears.",
  }),
  entry({
    tool_key: "worn_tooth_signals",
    tool_name: "Worn Tooth Signals\u2122",
    audience: "both",
    video_status: "planned",
    title: "Interpreting Worn Tooth Signals\u2122",
    description:
      "Explains what a worn tooth signal is, how RGS confirms it, and what owners typically do next.",
  }),
  entry({
    tool_key: "reality_check_flags",
    tool_name: "Reality Check Flags\u2122",
    audience: "both",
    video_status: "planned",
    title: "Responding to Reality Check Flags\u2122",
    description:
      "Walks through how clarification requests work and how RGS uses the responses.",
  }),
  entry({
    tool_key: "tool_specific_reports",
    tool_name: "Tool-Specific Reports",
    audience: "both",
    video_status: "script_needed",
    title: "Reading a tool-specific report",
    description:
      "Explains what is in a tool-specific report, the scope boundary, and the professional-review disclaimer.",
  }),
  entry({
    tool_key: "standalone_tool_runner",
    tool_name: "Standalone Tool Runner",
    audience: "admin",
    video_status: "planned",
    title: "Running a standalone gig deliverable",
    description:
      "Admin walkthrough of selecting a tool, drafting a gig deliverable, and routing it through the report queue.",
  }),
  entry({
    tool_key: "admin_report_review",
    tool_name: "Admin Report Review",
    audience: "admin",
    video_status: "script_needed",
    title: "Reviewing report drafts before publishing",
    description:
      "Admin walkthrough of report draft review, AI-assist controls, and client-visibility gating.",
  }),
  entry({
    tool_key: "admin_evidence_review",
    tool_name: "Admin Evidence Review",
    audience: "admin",
    video_status: "planned",
    title: "Reviewing client evidence safely",
    description:
      "Admin walkthrough of accepting, rejecting, or requesting clarification on uploaded evidence.",
  }),
];

function finishedWalkthrough(partial: Pick<
  ToolWalkthroughVideoEntry,
  "tool_key" | "tool_name" | "audience" | "title" | "description" | "duration_label"
> & { file_slug: string }): ToolWalkthroughVideoEntry {
  const { file_slug, ...entryFields } = partial;
  return entry({
    ...entryFields,
    video_status: "finished",
    video_url: `/videos/walkthroughs/${file_slug}.mp4`,
    poster_url: `/videos/walkthroughs/posters/${file_slug}-poster.png`,
    captions_url: `/videos/walkthroughs/${file_slug}.vtt`,
    transcript_url: `/videos/walkthroughs/${file_slug}-transcript.md`,
    last_updated: "2026-05-07",
  });
}

function entry(
  partial: Pick<
    ToolWalkthroughVideoEntry,
    "tool_key" | "tool_name" | "audience" | "video_status" | "title" | "description"
  > & Partial<ToolWalkthroughVideoEntry>,
): ToolWalkthroughVideoEntry {
  const showInClient = partial.audience === "client" || partial.audience === "both";
  const showInAdmin = partial.audience === "admin" || partial.audience === "both";
  return {
    video_url: null,
    poster_url: null,
    transcript_url: null,
    captions_url: null,
    duration_label: null,
    last_updated: "2026-05-05",
    show_in_client_portal: showInClient,
    show_in_admin_portal: showInAdmin,
    no_download: true,
    no_social_share: true,
    ...partial,
  };
}

/**
 * Returns true only when the entry represents a real, finished, playable
 * walkthrough. Anything else MUST render as an honest "coming soon" / guide
 * fallback — never as an empty player.
 */
export function isPlayableWalkthrough(entry: ToolWalkthroughVideoEntry): boolean {
  return entry.video_status === "finished" && !!entry.video_url;
}

export function getWalkthroughEntry(toolKey: string): ToolWalkthroughVideoEntry | null {
  return TOOL_WALKTHROUGH_VIDEO_REGISTRY.find((e) => e.tool_key === toolKey) ?? null;
}

/** Sanity: portal walkthroughs may never opt out of the no-download rule. */
export function assertPortalWalkthroughSafety(entry: ToolWalkthroughVideoEntry): void {
  if (entry.show_in_client_portal && (entry as any).no_download !== true) {
    throw new Error(`Walkthrough ${entry.tool_key} must not allow download in client portal`);
  }
  if (entry.show_in_client_portal && (entry as any).no_social_share !== true) {
    throw new Error(`Walkthrough ${entry.tool_key} must not allow social share in client portal`);
  }
}
