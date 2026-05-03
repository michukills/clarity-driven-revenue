// P7.4.2 — Tool Assignment Policy
// Single source of truth for *how* each client-facing tool is assigned and
// what lightweight instructions clients should see.
//
// Keyed by the canonical tool_key from src/lib/toolMatrix.ts. tool_key values
// are STABLE — never edit them. This file does not change RCC entitlement,
// payment logic, diagnostic workflows, or report publishing.

import type { ToolPhase } from "@/lib/toolMatrix";

export type AssignmentPolicy =
  /** Safe to auto-assign without admin/video-call setup. */
  | "auto_basic"
  /** Should be introduced during an RGS walkthrough/video call. */
  | "guided_call"
  /** Admin-only — never assigned to clients via the assign modal. */
  | "admin_only";

export type InstructionLevel =
  | "self_explanatory"
  | "needs_intro"
  | "needs_review";

export type ToolFrequency =
  | "one_time"
  | "weekly"
  | "monthly"
  | "quarterly"
  | "as_needed";

export interface ToolInstructions {
  /** What this tool is — short, plain English. */
  whatItDoes: string;
  /** What to do first to get value from it. */
  firstStep: string;
  /** When/how often to use it (display copy). */
  frequency: string;
  /** When the client should ping RGS for help. */
  askRgsIf: string;
}

export interface ToolPolicyEntry {
  /** Matches src/lib/toolMatrix.ts ToolMatrixEntry.key (and tool_runs.tool_key for engine tools). */
  key: string;
  assignmentPolicy: AssignmentPolicy;
  phase: ToolPhase;
  instructionLevel: InstructionLevel;
  frequency: ToolFrequency;
  /** Short reason badge shown next to guided tools. */
  guidedReason?: string;
  instructions: ToolInstructions;
}

/**
 * Policy registry. Keys MUST match TOOL_MATRIX[].key.
 *
 * Auto-basic: assigned silently to the right customers. Currently:
 *   - implementation_foundation_system (Onboarding Worksheet — implementation clients)
 *
 * Guided-call: clearly labeled in the assign modal as "best on call".
 *
 * Admin-only: never appears in the client assign modal.
 */
export const TOOL_POLICY: ToolPolicyEntry[] = [
  // ─── Diagnostic Engines™ (admin-driven) ───────────────────────────────
  {
    key: "rgs_stability_scorecard",
    assignmentPolicy: "admin_only",
    phase: "both",
    instructionLevel: "needs_review",
    frequency: "quarterly",
    instructions: {
      whatItDoes: "Internal RGS scoring of business stability across the 5 pillars.",
      firstStep: "RGS reviews this when it is part of the active engagement scope.",
      frequency: "Engagement phase: Diagnostic review.",
      askRgsIf: "If this area changes materially, note it for the assigned RGS engagement.",
    },
  },
  {
    key: "revenue_leak_finder",
    assignmentPolicy: "admin_only",
    phase: "both",
    instructionLevel: "needs_review",
    frequency: "as_needed",
    instructions: {
      whatItDoes: "Internal RGS leak detection across pricing, sales, and delivery.",
      firstStep: "RGS reviews this when it is part of the active engagement scope.",
      frequency: "Engagement phase: Diagnostic review.",
      askRgsIf: "If revenue patterns change materially, note it for the assigned RGS engagement.",
    },
  },
  {
    key: "buyer_persona_tool",
    assignmentPolicy: "admin_only",
    phase: "diagnostic",
    instructionLevel: "needs_review",
    frequency: "as_needed",
    instructions: {
      whatItDoes: "Internal RGS buyer-profile tool used during diagnostic.",
      firstStep: "RGS will share the output during diagnostic delivery.",
      frequency: "Engagement phase: Diagnostic review.",
      askRgsIf: "If your offer or ideal buyer changes, note it for the assigned RGS engagement.",
    },
  },
  {
    key: "customer_journey_mapper",
    assignmentPolicy: "admin_only",
    phase: "both",
    instructionLevel: "needs_review",
    frequency: "as_needed",
    instructions: {
      whatItDoes: "Internal RGS map of the buyer/customer journey.",
      firstStep: "RGS uses this to plan your implementation.",
      frequency: "Engagement phase: Diagnostic review.",
      askRgsIf: "If a journey stage starts breaking down, note it for the assigned RGS engagement.",
    },
  },
  {
    key: "process_breakdown_tool",
    assignmentPolicy: "admin_only",
    phase: "both",
    instructionLevel: "needs_review",
    frequency: "as_needed",
    instructions: {
      whatItDoes: "Internal RGS process map used to find bottlenecks.",
      firstStep: "RGS will share findings during implementation planning.",
      frequency: "Engagement phase: Diagnostic review.",
      askRgsIf: "If the same operational bottleneck keeps repeating, note it for the assigned RGS engagement.",
    },
  },

  // ─── Structuring Engines™ ─────────────────────────────────────────────
  {
    // The Onboarding Worksheet — safe self-explanatory client form.
    key: "implementation_foundation_system",
    assignmentPolicy: "auto_basic",
    phase: "implementation",
    instructionLevel: "self_explanatory",
    frequency: "one_time",
    instructions: {
      whatItDoes: "Captures the inputs RGS needs to start implementation cleanly.",
      firstStep: "Upload or complete the requested onboarding details.",
      frequency: "Engagement phase: Implementation support.",
      askRgsIf: "If you are unsure what documents or inputs to provide, ask your assigned RGS contact.",
    },
  },
  {
    key: "implementation_command_tracker",
    assignmentPolicy: "guided_call",
    phase: "implementation",
    instructionLevel: "needs_intro",
    frequency: "weekly",
    guidedReason: "Best assigned during walkthrough",
    instructions: {
      whatItDoes: "Tracks weekly progress, milestones, and blockers during implementation.",
      firstStep: "Review the current milestone and update status after each working session.",
      frequency: "Engagement phase: Implementation support.",
      askRgsIf: "If a milestone is blocked or scope is changing, raise it with your RGS contact.",
    },
  },

  // ─── Control Systems ──────────────────────────────────────────────────
  {
    key: "revenue_control_center",
    assignmentPolicy: "guided_call",
    phase: "ongoing",
    instructionLevel: "needs_intro",
    frequency: "weekly",
    guidedReason: "Subscription / entitlement controlled",
    instructions: {
      whatItDoes: "Weekly operating rhythm for revenue, pipeline, cash, blockers, and trends.",
      firstStep: "Complete the weekly check-in for the most recent week.",
      frequency: "Engagement phase: Active RCS subscription only — weekly while your Revenue Control System subscription is active.",
      askRgsIf: "If you see a cash concern or repeated blocker, raise it through your active subscription support channel.",
    },
  },
  {
    key: "revenue_risk_monitor",
    assignmentPolicy: "guided_call",
    phase: "ongoing",
    instructionLevel: "needs_intro",
    frequency: "monthly",
    guidedReason: "Requires RGS intro",
    instructions: {
      whatItDoes: "Highlights revenue stability and risk signals from current data.",
      firstStep: "Review the latest risk indicators after your weekly data is current.",
      frequency: "Engagement phase: Active RCS subscription only — monthly while your Revenue Control System subscription is active.",
      askRgsIf: "If a risk signal is unclear or worsening, raise it through your active subscription support channel.",
    },
  },
  {
    key: "weekly_alignment_system",
    assignmentPolicy: "guided_call",
    phase: "ongoing",
    instructionLevel: "needs_intro",
    frequency: "weekly",
    guidedReason: "Best assigned during walkthrough",
    instructions: {
      whatItDoes: "Captures the week's wins, blockers, and next steps in one place.",
      firstStep: "Save your first weekly reflection for the current week.",
      frequency: "Engagement phase: Active RCS subscription only — weekly while your Revenue Control System subscription is active.",
      askRgsIf: "If the same blocker keeps showing up week over week, raise it through your active subscription support channel.",
    },
  },
  {
    key: "reports_and_reviews",
    assignmentPolicy: "admin_only",
    phase: "ongoing",
    instructionLevel: "needs_review",
    frequency: "monthly",
    instructions: {
      whatItDoes: "RGS-published business control reports for your engagement.",
      firstStep: "Open the latest published report from your portal.",
      frequency: "Engagement phase: Active RCS subscription only — published by RGS while your subscription is active.",
      askRgsIf: "If a trend in the report needs explanation, raise it through your active subscription support channel.",
    },
  },
];

const POLICY_BY_KEY: Record<string, ToolPolicyEntry> = Object.fromEntries(
  TOOL_POLICY.map((p) => [p.key, p]),
);

export function policyByKey(key: string | null | undefined): ToolPolicyEntry | undefined {
  if (!key) return undefined;
  return POLICY_BY_KEY[key];
}

/** Convenience: list of canonical keys we want auto-assigned to qualifying customers. */
export function autoBasicToolKeys(): string[] {
  return TOOL_POLICY.filter((p) => p.assignmentPolicy === "auto_basic").map((p) => p.key);
}

export const POLICY_LABEL: Record<AssignmentPolicy, string> = {
  auto_basic: "Auto basic",
  guided_call: "Guided · best on call",
  admin_only: "Admin only",
};

export const POLICY_TONE: Record<AssignmentPolicy, "ok" | "warn" | "muted"> = {
  auto_basic: "ok",
  guided_call: "warn",
  admin_only: "muted",
};

export const FREQUENCY_LABEL: Record<ToolFrequency, string> = {
  one_time: "One-time",
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  as_needed: "As needed",
};

/**
 * Resolve a resource row to its canonical tool_key (matches TOOL_MATRIX/TOOL_POLICY).
 * Falls back to null when no canonical mapping exists. This must NOT introduce new
 * keys — only reuse existing ones from the matrix.
 */
export function policyForResource(r: {
  title?: string | null;
  url?: string | null;
}): ToolPolicyEntry | undefined {
  if (!r) return undefined;
  // Lazy import to avoid pulling DB types into this pure-config file.
  const title = (r.title || "").trim().toLowerCase();
  const url = (r.url || "").trim().toLowerCase();

  // Title-based mapping. Keep this list aligned with INTERNAL_TOOL_PLACEHOLDERS aliases
  // and existing resources.title values present in the DB.
  const titleToKey: Array<[RegExp, string]> = [
    [/onboarding worksheet|stability self-?assessment|implementation foundation system/i, "implementation_foundation_system"],
    [/implementation (command )?tracker/i, "implementation_command_tracker"],
    [/weekly (alignment|reflection)/i, "weekly_alignment_system"],
    [/revenue\s*&?\s*risk monitor/i, "revenue_risk_monitor"],
    [/revenue control center|revenue tracker(\s*\(client\))?|^rcc/i, "revenue_control_center"],
    [/revenue leak (detection|finder)/i, "revenue_leak_finder"],
    [/stability (index|scorecard)/i, "rgs_stability_scorecard"],
    [/buyer (persona|intelligence)/i, "buyer_persona_tool"],
    [/customer journey/i, "customer_journey_mapper"],
    [/process (breakdown|clarity)/i, "process_breakdown_tool"],
    [/reports? (&|and) reviews?/i, "reports_and_reviews"],
  ];
  for (const [re, key] of titleToKey) {
    if (re.test(title)) return POLICY_BY_KEY[key];
  }
  // URL fallback for the canonical RCC client resource.
  if (url.startsWith("/portal/business-control-center")) return POLICY_BY_KEY["revenue_control_center"];
  return undefined;
}