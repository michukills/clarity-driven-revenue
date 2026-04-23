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
      firstStep: "RGS will run this for you during diagnostic.",
      frequency: "Diagnostic, post-implementation, then quarterly.",
      askRgsIf: "You want a fresh stability read before a major decision.",
    },
  },
  {
    key: "revenue_leak_finder",
    assignmentPolicy: "admin_only",
    phase: "both",
    instructionLevel: "needs_review",
    frequency: "quarterly",
    instructions: {
      whatItDoes: "Internal RGS leak detection across pricing, sales, and delivery.",
      firstStep: "RGS will run this for you during diagnostic.",
      frequency: "At diagnostic, after major changes, then quarterly.",
      askRgsIf: "Revenue patterns shift unexpectedly between reviews.",
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
      frequency: "Run when offer or target market shifts.",
      askRgsIf: "Your offer or ideal buyer changes meaningfully.",
    },
  },
  {
    key: "customer_journey_mapper",
    assignmentPolicy: "admin_only",
    phase: "both",
    instructionLevel: "needs_review",
    frequency: "quarterly",
    instructions: {
      whatItDoes: "Internal RGS map of the buyer/customer journey.",
      firstStep: "RGS uses this to plan your implementation.",
      frequency: "Diagnostic, implementation planning, quarterly.",
      askRgsIf: "A journey stage starts breaking down.",
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
      frequency: "Diagnostic + implementation planning; rerun on repeated bottleneck.",
      askRgsIf: "The same operational bottleneck keeps repeating.",
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
      frequency: "One-time at implementation start; update if major details change.",
      askRgsIf: "You're unsure what documents or inputs to provide.",
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
      frequency: "Weekly during implementation.",
      askRgsIf: "A milestone is blocked or scope is changing.",
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
      frequency: "Weekly.",
      askRgsIf: "You see a cash concern, repeated blocker, or want RGS review.",
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
      frequency: "Monthly or after a report/update.",
      askRgsIf: "A risk signal is unclear or worsening.",
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
      frequency: "Weekly.",
      askRgsIf: "The same blocker keeps showing up week over week.",
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
      frequency: "Monthly or quarterly per monitoring tier.",
      askRgsIf: "A trend in the report needs explanation.",
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