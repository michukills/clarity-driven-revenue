/**
 * P93C — Admin Tool Decision Guide
 *
 * Central, typed catalog telling admins:
 *   - what each major tool is for
 *   - when to use it
 *   - what NOT to use it for
 *   - which account kinds it is allowed for
 *   - inputs needed and outputs produced
 *   - whether the output is client-visible
 *   - whether admin review is required before client-visible publish
 *   - common mistakes to avoid
 *   - what should happen after the tool is used
 *
 * This file is read-only logic. It does NOT change any tool behavior, RLS,
 * payment gating, ClientToolGuard, or assignment rules. It is consumed by the
 * P93C UI surfaces (AdminToolGuidePanel) and by AdminNextActionPanel so admins
 * never have to guess.
 */

import {
  classifyAccount,
  type AccountInput,
  type AccountKind,
  type AccountClassification,
} from "@/lib/accounts/accountClassification";

export type AdminToolOutputType =
  | "diagnostic_input"
  | "evidence_review"
  | "standalone_deliverable"
  | "gig_deliverable"
  | "report_section"
  | "repair_map"
  | "implementation_plan"
  | "training_asset"
  | "control_system_signal"
  | "admin_note"
  | "client_visible_output";

export interface AdminToolGuideEntry {
  toolId: string;
  toolName: string;
  purpose: string;
  bestUsedWhen: string[];
  notFor: string[];
  allowedAccountKinds: AccountKind[];
  requiredInputs: string[];
  optionalInputs: string[];
  outputType: AdminToolOutputType;
  reportSectionMapping: string[];
  clientVisibleRules: string;
  adminReviewRequired: boolean;
  aiAssistAvailable: boolean;
  evidenceRequired: boolean;
  uploadIntelligenceSupported: boolean;
  commonMistakesToAvoid: string[];
  nextStepAfterUse: string[];
}

const REAL_ONLY: AccountKind[] = ["real_client"];
const REAL_AND_GIG: AccountKind[] = ["real_client", "gig_work"];
const REAL_AND_DEMO: AccountKind[] = ["real_client", "demo_test"];
const REAL_GIG_DEMO: AccountKind[] = ["real_client", "gig_work", "demo_test"];
const ALL_DELIVERABLE: AccountKind[] = [
  "real_client",
  "gig_work",
  "demo_test",
  "prospect_draft",
];

/**
 * Tool guide entries.
 *
 * Only includes tools/surfaces that exist in the OS today. Surfaces deferred
 * to later phases (workflow secretary, premium report rebuild, etc.) are NOT
 * listed.
 */
export const ADMIN_TOOL_GUIDE: AdminToolGuideEntry[] = [
  {
    toolId: "owner_diagnostic_interview",
    toolName: "Owner Diagnostic Interview",
    purpose:
      "Capture the owner's first-person account of how the business actually runs.",
    bestUsedWhen: [
      "Diagnostic is paid and the client is ready to start",
      "Client has not yet completed intake",
    ],
    notFor: [
      "Gig/standalone deliverables",
      "Demo accounts pretending to be real clients",
      "Pre-sale prospects without an active diagnostic",
    ],
    allowedAccountKinds: REAL_ONLY,
    requiredInputs: ["Active diagnostic engagement", "Owner availability"],
    optionalInputs: ["Prior advisory notes", "Industry profile"],
    outputType: "diagnostic_input",
    reportSectionMapping: ["Owner Voice", "Business Operating Picture"],
    clientVisibleRules:
      "Raw interview is admin-only. Selected quotes may appear in client report only after admin review.",
    adminReviewRequired: true,
    aiAssistAvailable: true,
    evidenceRequired: false,
    uploadIntelligenceSupported: false,
    commonMistakesToAvoid: [
      "Publishing raw owner quotes without review",
      "Treating the interview as a finished diagnostic",
    ],
    nextStepAfterUse: [
      "Request supporting evidence",
      "Open Evidence Vault Review",
    ],
  },
  {
    toolId: "evidence_vault_review",
    toolName: "Evidence Vault Review",
    purpose:
      "Review and accept/reject evidence the client provided before it is treated as trusted.",
    bestUsedWhen: [
      "Client has uploaded or connected supporting data",
      "Evidence status shows pending review",
    ],
    notFor: [
      "Demo accounts with seeded sample data only",
      "Prospects with no real client data",
    ],
    allowedAccountKinds: REAL_AND_GIG,
    requiredInputs: ["Submitted evidence items"],
    optionalInputs: ["Industry-specific evidence requirements"],
    outputType: "evidence_review",
    reportSectionMapping: ["Evidence Trail"],
    clientVisibleRules:
      "Acceptance status is admin-only. Verified evidence may surface in the client report after review.",
    adminReviewRequired: true,
    aiAssistAvailable: false,
    evidenceRequired: true,
    uploadIntelligenceSupported: true,
    commonMistakesToAvoid: [
      "Accepting evidence without verifying source",
      "Marking demo data as verified evidence",
    ],
    nextStepAfterUse: ["Lock Diagnostic Score", "Draft Stability Snapshot"],
  },
  {
    toolId: "rgs_stability_snapshot",
    toolName: "RGS Stability Snapshot",
    purpose:
      "Produce the structured read on where the business is stable and where it is slipping.",
    bestUsedWhen: [
      "Diagnostic score is locked",
      "Evidence has been reviewed",
    ],
    notFor: [
      "Demo accounts (seeded snapshots only)",
      "Prospects without a paid diagnostic",
    ],
    allowedAccountKinds: REAL_AND_GIG,
    requiredInputs: ["Reviewed evidence", "Locked diagnostic score"],
    optionalInputs: ["Industry profile", "Owner interview"],
    outputType: "report_section",
    reportSectionMapping: ["Stability Snapshot"],
    clientVisibleRules:
      "Client-visible after admin review. Admin notes inside the snapshot are not published.",
    adminReviewRequired: true,
    aiAssistAvailable: true,
    evidenceRequired: true,
    uploadIntelligenceSupported: false,
    commonMistakesToAvoid: [
      "Publishing before evidence acceptance",
      "Editing client-visible language without review",
    ],
    nextStepAfterUse: ["Create Priority Repair Map"],
  },
  {
    toolId: "priority_repair_map",
    toolName: "Priority Repair Map",
    purpose:
      "Sequence the highest-priority repairs the owner should address next.",
    bestUsedWhen: [
      "Stability Snapshot is drafted",
      "Owner is ready to act on priorities",
    ],
    notFor: ["Demo data showcases", "Pre-sale prospects"],
    allowedAccountKinds: REAL_AND_GIG,
    requiredInputs: ["Stability Snapshot", "Reviewed evidence"],
    optionalInputs: ["Owner intervention log"],
    outputType: "repair_map",
    reportSectionMapping: ["Priority Repair Map"],
    clientVisibleRules: "Client-visible after admin review.",
    adminReviewRequired: true,
    aiAssistAvailable: true,
    evidenceRequired: false,
    uploadIntelligenceSupported: false,
    commonMistakesToAvoid: [
      "Adding repairs that lack supporting evidence",
      "Implying guaranteed outcomes",
    ],
    nextStepAfterUse: ["Build Implementation Roadmap", "Assign Implementation Tools"],
  },
  {
    toolId: "implementation_roadmap",
    toolName: "Implementation Roadmap",
    purpose: "Lay out the rollout plan that turns repairs into installed structure.",
    bestUsedWhen: [
      "Implementation engagement is active",
      "Repair Map is approved",
    ],
    notFor: [
      "Gig deliverables (unless explicitly upgraded)",
      "Demo or prospect accounts",
    ],
    allowedAccountKinds: REAL_ONLY,
    requiredInputs: ["Repair Map", "Implementation scope"],
    optionalInputs: ["Tool assignments"],
    outputType: "implementation_plan",
    reportSectionMapping: ["Implementation Plan"],
    clientVisibleRules: "Client-visible after admin review.",
    adminReviewRequired: true,
    aiAssistAvailable: false,
    evidenceRequired: false,
    uploadIntelligenceSupported: false,
    commonMistakesToAvoid: [
      "Sequencing rollout without owner capacity confirmed",
      "Assigning tools before training is scheduled",
    ],
    nextStepAfterUse: ["Assign Implementation Tools", "Create SOP / Training Bible"],
  },
  {
    toolId: "sop_training_bible",
    toolName: "SOP / Training Bible",
    purpose: "Document the standard operating procedures the team will follow.",
    bestUsedWhen: [
      "Implementation roadmap is in flight",
      "Repeat tasks need a single source of truth",
    ],
    notFor: ["Demo accounts", "Prospects without implementation scope"],
    allowedAccountKinds: REAL_ONLY,
    requiredInputs: ["Workflow scope"],
    optionalInputs: ["Existing SOP drafts"],
    outputType: "training_asset",
    reportSectionMapping: ["SOP Library"],
    clientVisibleRules: "Client-visible once published; draft state remains admin-only.",
    adminReviewRequired: true,
    aiAssistAvailable: true,
    evidenceRequired: false,
    uploadIntelligenceSupported: true,
    commonMistakesToAvoid: [
      "Publishing draft SOPs to clients",
      "Mixing admin commentary into client-visible procedure text",
    ],
    nextStepAfterUse: ["Assign in Tool Assignment + Training Tracker"],
  },
  {
    toolId: "workflow_process_mapping",
    toolName: "Workflow / Process Mapping",
    purpose: "Map how work actually moves through the business today.",
    bestUsedWhen: ["Implementation is scoping a workflow"],
    notFor: ["Demo / prospect accounts"],
    allowedAccountKinds: REAL_ONLY,
    requiredInputs: ["Scope of the workflow being mapped"],
    optionalInputs: ["Owner interview notes"],
    outputType: "implementation_plan",
    reportSectionMapping: ["Workflow Map"],
    clientVisibleRules: "Client-visible after admin review.",
    adminReviewRequired: true,
    aiAssistAvailable: false,
    evidenceRequired: false,
    uploadIntelligenceSupported: false,
    commonMistakesToAvoid: ["Mapping aspirational state instead of current state"],
    nextStepAfterUse: ["Update SOP / Training Bible"],
  },
  {
    toolId: "decision_rights_accountability",
    toolName: "Decision Rights / Accountability",
    purpose: "Make explicit who decides, who owns, and who is informed.",
    bestUsedWhen: ["Roles are unclear or owner is the sole decision maker"],
    notFor: ["Demo / prospect accounts"],
    allowedAccountKinds: REAL_ONLY,
    requiredInputs: ["Team / role list"],
    optionalInputs: ["Workflow map"],
    outputType: "implementation_plan",
    reportSectionMapping: ["Accountability Map"],
    clientVisibleRules: "Client-visible after admin review.",
    adminReviewRequired: true,
    aiAssistAvailable: false,
    evidenceRequired: false,
    uploadIntelligenceSupported: false,
    commonMistakesToAvoid: ["Assigning decision rights without owner agreement"],
    nextStepAfterUse: ["Update SOP / Training Bible"],
  },
  {
    toolId: "tool_assignment_training_tracker",
    toolName: "Tool Assignment + Training Tracker",
    purpose: "Assign tools to clients and track training completion.",
    bestUsedWhen: ["Implementation is active and tools are scoped"],
    notFor: [
      "Demo accounts (assignments are demo-only)",
      "Pending or needs-review accounts",
    ],
    allowedAccountKinds: REAL_ONLY,
    requiredInputs: ["Selected tools", "Assigned client user"],
    optionalInputs: ["Training schedule"],
    outputType: "implementation_plan",
    reportSectionMapping: [],
    clientVisibleRules:
      "Assignments are surfaced in the client portal subject to ClientToolGuard and stage gating.",
    adminReviewRequired: false,
    aiAssistAvailable: false,
    evidenceRequired: false,
    uploadIntelligenceSupported: false,
    commonMistakesToAvoid: [
      "Assigning tools to a suspended account",
      "Assigning tools outside the client's paid scope",
    ],
    nextStepAfterUse: ["Confirm client received the assignment"],
  },
  {
    toolId: "standalone_tool_runner",
    toolName: "Standalone Tool Runner",
    purpose:
      "Run a single scoped tool for a standalone or gig deliverable without opening a full diagnostic.",
    bestUsedWhen: [
      "Gig deliverable scope is confirmed",
      "Real client purchased a single standalone tool",
    ],
    notFor: [
      "Replacing a paid diagnostic",
      "Demo accounts pretending to deliver real outputs",
    ],
    allowedAccountKinds: REAL_AND_GIG,
    requiredInputs: ["Tool selection", "Customer scope"],
    optionalInputs: ["Uploaded scoped materials"],
    outputType: "standalone_deliverable",
    reportSectionMapping: ["Standalone Deliverable"],
    clientVisibleRules:
      "Output is client-visible only after admin review and within the purchased scope.",
    adminReviewRequired: true,
    aiAssistAvailable: true,
    evidenceRequired: false,
    uploadIntelligenceSupported: true,
    commonMistakesToAvoid: [
      "Bundling extra deliverables outside the paid gig scope",
      "Implying full diagnostic coverage",
    ],
    nextStepAfterUse: ["Generate Standalone / Gig Deliverable Report"],
  },
  {
    toolId: "gig_deliverable_report",
    toolName: "Gig Deliverable Report",
    purpose: "Package the gig output into the deliverable the client receives.",
    bestUsedWhen: ["Standalone tool output is reviewed", "Scope is confirmed"],
    notFor: [
      "Full client diagnostics",
      "Demo accounts (use demo report mode)",
    ],
    allowedAccountKinds: ["gig_work"],
    requiredInputs: ["Standalone tool output", "Confirmed gig scope"],
    optionalInputs: ["Client-provided context"],
    outputType: "gig_deliverable",
    reportSectionMapping: ["Gig Deliverable"],
    clientVisibleRules:
      "Client-visible after admin review. Must stay inside the purchased gig scope.",
    adminReviewRequired: true,
    aiAssistAvailable: true,
    evidenceRequired: false,
    uploadIntelligenceSupported: false,
    commonMistakesToAvoid: [
      "Implying ongoing support",
      "Adding diagnostic-style findings outside the gig scope",
    ],
    nextStepAfterUse: ["Deliver to client", "Offer scoped upsell only if appropriate"],
  },
  {
    toolId: "rgs_control_system",
    toolName: "RGS Control System",
    purpose:
      "Operate the installed structure: cadence, reviews, and ongoing system signals.",
    bestUsedWhen: ["Implementation has handed off and Control System is active"],
    notFor: [
      "Gig accounts without a Control System upgrade",
      "Demo accounts as a real control surface",
      "Prospects",
    ],
    allowedAccountKinds: REAL_ONLY,
    requiredInputs: ["Active Control System engagement"],
    optionalInputs: ["Recent system signals"],
    outputType: "control_system_signal",
    reportSectionMapping: ["Control System Signals"],
    clientVisibleRules:
      "Client-visible portions are restricted to approved Control System views.",
    adminReviewRequired: true,
    aiAssistAvailable: false,
    evidenceRequired: false,
    uploadIntelligenceSupported: false,
    commonMistakesToAvoid: [
      "Treating Control System as unlimited support",
      "Publishing raw signals without review",
    ],
    nextStepAfterUse: ["Schedule Monthly System Review"],
  },
  {
    toolId: "revenue_risk_monitor",
    toolName: "Revenue & Risk Monitor",
    purpose: "Track revenue movement and surface early risk signals.",
    bestUsedWhen: ["Real client has live revenue tracking enabled"],
    notFor: [
      "Demo accounts as a real monitor",
      "Gig accounts without explicit upgrade",
    ],
    allowedAccountKinds: REAL_ONLY,
    requiredInputs: ["Recent revenue data"],
    optionalInputs: ["Industry benchmark context"],
    outputType: "control_system_signal",
    reportSectionMapping: ["Revenue Risk"],
    clientVisibleRules: "Client-visible after admin review.",
    adminReviewRequired: true,
    aiAssistAvailable: false,
    evidenceRequired: true,
    uploadIntelligenceSupported: false,
    commonMistakesToAvoid: ["Publishing forecasts as guarantees"],
    nextStepAfterUse: ["Update Owner Decision Dashboard"],
  },
  {
    toolId: "owner_decision_dashboard",
    toolName: "Owner Decision Dashboard",
    purpose: "Surface the next decisions the owner should make.",
    bestUsedWhen: ["Real client has active engagement signals"],
    notFor: ["Demo / prospect / gig accounts"],
    allowedAccountKinds: REAL_ONLY,
    requiredInputs: ["Active client engagement"],
    optionalInputs: ["Recent advisory notes"],
    outputType: "control_system_signal",
    reportSectionMapping: ["Owner Decisions"],
    clientVisibleRules: "Client-visible after admin review.",
    adminReviewRequired: true,
    aiAssistAvailable: false,
    evidenceRequired: false,
    uploadIntelligenceSupported: false,
    commonMistakesToAvoid: ["Listing decisions without supporting context"],
    nextStepAfterUse: ["Discuss in Monthly System Review"],
  },
  {
    toolId: "advisory_notes",
    toolName: "Advisory Notes / Clarification Log",
    purpose: "Record admin clarifications and advisory context.",
    bestUsedWhen: ["Anytime admin needs to capture an internal note"],
    notFor: ["Anything client-visible without explicit publish"],
    allowedAccountKinds: ALL_DELIVERABLE,
    requiredInputs: ["Note body"],
    optionalInputs: ["Linked record"],
    outputType: "admin_note",
    reportSectionMapping: [],
    clientVisibleRules: "Admin-only. Never auto-published to clients.",
    adminReviewRequired: false,
    aiAssistAvailable: false,
    evidenceRequired: false,
    uploadIntelligenceSupported: false,
    commonMistakesToAvoid: ["Pasting client-sensitive text into a published surface"],
    nextStepAfterUse: ["Continue current workflow"],
  },
  {
    toolId: "scorecard_history",
    toolName: "Scorecard History",
    purpose: "Review the trend of stability scores over time.",
    bestUsedWhen: ["Reviewing change between cycles"],
    notFor: ["Demo accounts as authoritative trend"],
    allowedAccountKinds: REAL_AND_DEMO,
    requiredInputs: ["At least one scored snapshot"],
    optionalInputs: [],
    outputType: "report_section",
    reportSectionMapping: ["Stability Trend"],
    clientVisibleRules: "Client-visible after admin review.",
    adminReviewRequired: true,
    aiAssistAvailable: false,
    evidenceRequired: false,
    uploadIntelligenceSupported: false,
    commonMistakesToAvoid: ["Comparing demo runs to real client trends"],
    nextStepAfterUse: ["Update Owner Decision Dashboard"],
  },
  {
    toolId: "monthly_system_review",
    toolName: "Monthly System Review",
    purpose: "Run the monthly cadence review for an active client.",
    bestUsedWhen: ["Control System or ongoing engagement is active"],
    notFor: ["Demo / prospect / gig accounts without ongoing scope"],
    allowedAccountKinds: REAL_ONLY,
    requiredInputs: ["Active engagement", "Recent signals"],
    optionalInputs: [],
    outputType: "control_system_signal",
    reportSectionMapping: ["Monthly Review"],
    clientVisibleRules: "Client-visible after admin review.",
    adminReviewRequired: true,
    aiAssistAvailable: false,
    evidenceRequired: false,
    uploadIntelligenceSupported: false,
    commonMistakesToAvoid: ["Skipping owner sign-off"],
    nextStepAfterUse: ["Update Repair Map priorities"],
  },
];

const BY_ID = new Map(ADMIN_TOOL_GUIDE.map((e) => [e.toolId, e] as const));

export function listToolGuideEntries(): AdminToolGuideEntry[] {
  return [...ADMIN_TOOL_GUIDE];
}

export function getToolGuideEntry(toolId: string): AdminToolGuideEntry | null {
  return BY_ID.get(toolId) ?? null;
}

export interface WorkflowContext {
  inviteSent?: boolean;
  diagnosticInterviewStarted?: boolean;
  diagnosticInterviewComplete?: boolean;
  evidenceSubmitted?: boolean;
  evidenceReviewed?: boolean;
  diagnosticScoreLocked?: boolean;
  stabilitySnapshotDrafted?: boolean;
  repairMapDrafted?: boolean;
  reportPublished?: boolean;
  implementationToolsAssigned?: boolean;
  controlSystemSignalsPending?: boolean;
  standaloneToolRunCompleted?: boolean;
  gigScopeConfirmed?: boolean;
}

function isAllowed(
  entry: AdminToolGuideEntry,
  classification: AccountClassification,
): boolean {
  if (classification.accountKind === "needs_review") return false;
  if (classification.accountKind === "pending_request") return false;
  return entry.allowedAccountKinds.includes(classification.accountKind);
}

export function isToolAllowedForAccount(
  toolId: string,
  input: AccountInput,
): boolean {
  const entry = BY_ID.get(toolId);
  if (!entry) return false;
  return isAllowed(entry, classifyAccount(input));
}

export function getEligibleToolsForAccount(
  input: AccountInput,
): AdminToolGuideEntry[] {
  const c = classifyAccount(input);
  return ADMIN_TOOL_GUIDE.filter((e) => isAllowed(e, c));
}

export function getToolBlockedReason(
  toolId: string,
  input: AccountInput,
): string | null {
  const entry = BY_ID.get(toolId);
  if (!entry) return "This tool is not registered in the admin tool guide.";
  const c = classifyAccount(input);
  if (c.accountKind === "needs_review") {
    return "Blocked — account needs review. Resolve the conflict before using this tool.";
  }
  if (c.accountKind === "pending_request") {
    return "Blocked — signup request is pending admin review.";
  }
  if (!entry.allowedAccountKinds.includes(c.accountKind)) {
    return `Locked — outside current account scope (${c.displayLabel}).`;
  }
  return null;
}

/**
 * Recommend a small ordered list of next-best tools for the given account
 * and (optional) workflow state. Returned entries are guaranteed to be
 * allowed for the account kind.
 */
export function getRecommendedToolsForAccount(
  input: AccountInput,
  ctx: WorkflowContext = {},
): AdminToolGuideEntry[] {
  const c = classifyAccount(input);
  if (c.accountKind === "needs_review" || c.accountKind === "pending_request") {
    return [];
  }
  const eligible = ADMIN_TOOL_GUIDE.filter((e) => isAllowed(e, c));
  const order: string[] = [];

  if (c.accountKind === "demo_test") {
    order.push("standalone_tool_runner", "scorecard_history", "advisory_notes");
  } else if (c.accountKind === "prospect_draft") {
    order.push("advisory_notes");
  } else if (c.accountKind === "gig_work") {
    order.push(
      "standalone_tool_runner",
      "evidence_vault_review",
      "gig_deliverable_report",
      "advisory_notes",
    );
  } else if (c.accountKind === "real_client") {
    if (!ctx.diagnosticInterviewComplete) order.push("owner_diagnostic_interview");
    if (ctx.evidenceSubmitted && !ctx.evidenceReviewed)
      order.push("evidence_vault_review");
    if (ctx.evidenceReviewed && !ctx.stabilitySnapshotDrafted)
      order.push("rgs_stability_snapshot");
    if (ctx.stabilitySnapshotDrafted && !ctx.repairMapDrafted)
      order.push("priority_repair_map");
    if (ctx.repairMapDrafted) order.push("implementation_roadmap");
    if (ctx.implementationToolsAssigned) order.push("monthly_system_review");
    if (ctx.controlSystemSignalsPending) order.push("rgs_control_system");
    order.push("advisory_notes");
  }

  const seen = new Set<string>();
  const ordered: AdminToolGuideEntry[] = [];
  for (const id of order) {
    if (seen.has(id)) continue;
    const found = eligible.find((e) => e.toolId === id);
    if (found) {
      ordered.push(found);
      seen.add(id);
    }
  }
  // Append remaining eligible entries deterministically (capped) so the
  // panel always has something to show even when context is empty.
  for (const e of eligible) {
    if (!seen.has(e.toolId)) {
      ordered.push(e);
      seen.add(e.toolId);
    }
    if (ordered.length >= 6) break;
  }
  return ordered;
}

export function getToolNextSteps(toolId: string): string[] {
  const entry = BY_ID.get(toolId);
  return entry ? [...entry.nextStepAfterUse] : [];
}