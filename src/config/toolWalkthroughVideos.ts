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
  entry({
    tool_key: "owner_diagnostic_interview",
    tool_name: "Owner Diagnostic Interview",
    audience: "client",
    video_status: "script_needed",
    title: "How the Owner Diagnostic Interview works",
    description:
      "Walks the owner through the structured interview, what each section is for, and how RGS uses the answers.",
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