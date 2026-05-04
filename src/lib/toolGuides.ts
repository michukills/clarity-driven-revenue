// Written "How to use this tool" guides — used as the premium fallback when
// a video walkthrough has not yet been recorded/approved. These are NOT
// instructions for RGS staff; they are calm, owner-facing summaries that
// answer the same four questions for every tool:
//   - What this tool is for
//   - What to gather before you start
//   - What a good submission looks like
//   - What happens after you submit / who reviews it
//
// Scope-safe: never promise results, never offer legal/tax/HR/compliance
// advice, never imply RGS becomes the operator. Cannabis-aware tools must
// stay in cannabis/dispensary language only — never healthcare/patient-care framing.

export interface ToolGuide {
  toolKey: string;
  toolName: string;
  purpose: string;
  gather: string[];
  goodSubmission: string[];
  afterSubmit: string;
  reviewedBy: "rgs_team" | "owner_only";
  scopeBoundary: string;
}

const REVIEWED_BY_RGS =
  "Your RGS team reviews submissions and updates your repair map and next steps.";
const SCOPE_RGS_ARCHITECT =
  "RGS is the architect, not the operator. We help you see what is slipping and what to repair — we do not run your business.";

export const TOOL_GUIDES: Record<string, ToolGuide> = {
  portal_welcome: {
    toolKey: "portal_welcome",
    toolName: "Welcome to your RGS portal",
    purpose:
      "A short orientation so you know where you are, what RGS is doing next, and what (if anything) is needed from you.",
    gather: [
      "5 quiet minutes to read your current stage and next step",
      "Any questions you want your RGS team to clarify",
    ],
    goodSubmission: [
      "You understand your current stage and the one next step shown above",
      "You know whether anything is required from you right now",
    ],
    afterSubmit:
      "When the next step becomes available, it appears at the top of this dashboard with a clear action.",
    reviewedBy: "rgs_team",
    scopeBoundary: SCOPE_RGS_ARCHITECT,
  },
  owner_diagnostic_interview: {
    toolKey: "owner_diagnostic_interview",
    toolName: "Owner Diagnostic Interview",
    purpose:
      "A structured interview that captures how the business actually runs today, in your words, so the diagnostic findings reflect reality — not assumptions.",
    gather: [
      "A rough sense of monthly revenue and where it comes from",
      "The 1–3 things that most often slow the business down",
      "Who currently makes which decisions (you, a manager, no one)",
    ],
    goodSubmission: [
      "Honest, plain-language answers — no need to polish",
      "Examples instead of generalities where possible",
      "Flag anything you are unsure about so RGS can ask follow-ups",
    ],
    afterSubmit:
      "Your RGS team reviews the interview and uses it to shape your diagnostic findings and repair map.",
    reviewedBy: "rgs_team",
    scopeBoundary:
      "This is a diagnostic interview, not legal, tax, HR, or compliance advice.",
  },
  rgs_stability_scorecard: {
    toolKey: "rgs_stability_scorecard",
    toolName: "RGS Stability Scorecard",
    purpose:
      "A structured snapshot of how stable each part of the business is right now — Demand, Conversion, Operations, Financial, and Independence.",
    gather: [
      "A few minutes of quiet time to answer honestly",
      "Your most recent monthly numbers if you have them on hand (optional)",
    ],
    goodSubmission: [
      "Pick the answer that matches the last 60–90 days, not your best month",
      "If a question does not apply, choose the closest honest answer rather than skipping",
    ],
    afterSubmit:
      "Your scores feed your RGS Stability Snapshot and are reviewed by your RGS team before any client-facing report is published.",
    reviewedBy: "rgs_team",
    scopeBoundary: SCOPE_RGS_ARCHITECT,
  },
  revenue_leak_finder: {
    toolKey: "revenue_leak_finder",
    toolName: "Revenue Leak Finder",
    purpose:
      "Surfaces the places revenue is most likely slipping today — from lead flow, conversion, retention, pricing, and operational drag.",
    gather: [
      "A rough sense of how leads come in and where they typically drop off",
      "Any recent customer complaints or refund patterns",
    ],
    goodSubmission: [
      "Be specific where you can (one example beats five generalities)",
      "It is fine to mark items as 'not sure' — that itself is a finding",
    ],
    afterSubmit:
      "RGS reviews the findings and prioritizes them in your repair map.",
    reviewedBy: "rgs_team",
    scopeBoundary: SCOPE_RGS_ARCHITECT,
  },
  implementation_roadmap: {
    toolKey: "implementation_roadmap",
    toolName: "Implementation Roadmap",
    purpose:
      "Shows the ordered repair plan being installed, the current step, and what comes next.",
    gather: [
      "Awareness of which step you are currently on",
      "Any blockers slowing this step (people, time, information)",
    ],
    goodSubmission: [
      "Confirm what is done, what is in progress, and what is blocked",
      "Flag blockers early so RGS can adjust the plan",
    ],
    afterSubmit:
      "RGS reviews progress and updates the roadmap with the next step.",
    reviewedBy: "rgs_team",
    scopeBoundary: SCOPE_RGS_ARCHITECT,
  },
  monthly_system_review: {
    toolKey: "monthly_system_review",
    toolName: "Monthly System Review",
    purpose:
      "A monthly check on stability — what improved, what slipped, and what to tighten in the next 30 days.",
    gather: [
      "Last month's results in your own words (you do not need exact numbers)",
      "Anything new (a hire, a price change, a new offer, a lost client)",
    ],
    goodSubmission: [
      "Plain-language notes are better than long write-ups",
      "Honest about what is not working — that is what RGS is here for",
    ],
    afterSubmit:
      "RGS reviews the month, updates your scorecard trend, and adjusts the next focus.",
    reviewedBy: "rgs_team",
    scopeBoundary: SCOPE_RGS_ARCHITECT,
  },
  priority_action_tracker: {
    toolKey: "priority_action_tracker",
    toolName: "Priority Action Tracker",
    purpose:
      "Keeps the small number of actions that matter most this week visible in one place.",
    gather: [
      "A clear sense of what is actually due this week",
    ],
    goodSubmission: [
      "Update statuses honestly — done, in progress, or blocked",
      "Add a note when something is blocked so RGS can help unblock",
    ],
    afterSubmit:
      "RGS reviews open and blocked actions in the next operating cadence.",
    reviewedBy: "rgs_team",
    scopeBoundary: SCOPE_RGS_ARCHITECT,
  },
  owner_decision_dashboard: {
    toolKey: "owner_decision_dashboard",
    toolName: "Owner Decision Dashboard",
    purpose:
      "A single view of the decisions an owner needs to stay close to — without becoming the bottleneck.",
    gather: [
      "Awareness of which decisions are stuck waiting on you",
    ],
    goodSubmission: [
      "Move clearly decidable items into a decision",
      "Flag the items that need RGS input before deciding",
    ],
    afterSubmit:
      "RGS reviews flagged items and brings them into the next working session.",
    reviewedBy: "rgs_team",
    scopeBoundary:
      "RGS supports decision visibility — final decisions remain the owner's.",
  },
  financial_visibility: {
    toolKey: "financial_visibility",
    toolName: "Financial Visibility",
    purpose:
      "A calm read of the cash and margin signals coming from your connected sources, so the business is not flying blind.",
    gather: [
      "Confirmation that your accounting/payment connection is still active",
      "Any one-time events worth flagging (a refund, a delayed invoice)",
    ],
    goodSubmission: [
      "Note anything unusual you already know about so RGS does not chase a false signal",
    ],
    afterSubmit:
      "RGS reviews the figures and includes the relevant findings in your next review or report.",
    reviewedBy: "rgs_team",
    scopeBoundary:
      "Visibility only — RGS does not provide bookkeeping, tax, or accounting guidance. Tokens and credentials are never shown in the browser.",
  },
  rgs_control_system: {
    toolKey: "rgs_control_system",
    toolName: "RGS Control System",
    purpose:
      "The ongoing visibility layer that keeps the owner connected to the system without RGS becoming the operator.",
    gather: [
      "A few minutes to read the current signals",
    ],
    goodSubmission: [
      "Acknowledge the signals you understand and flag anything unclear",
    ],
    afterSubmit:
      "RGS reviews the signals and adjusts the operating cadence accordingly.",
    reviewedBy: "rgs_team",
    scopeBoundary: SCOPE_RGS_ARCHITECT,
  },
  scorecard_history: {
    toolKey: "scorecard_history",
    toolName: "Scorecard History",
    purpose:
      "Shows how stability has trended over time across each pillar.",
    gather: ["No prep needed — this is a read view"],
    goodSubmission: [
      "Notice which pillars have moved up and which have not",
    ],
    afterSubmit:
      "Trends are reviewed by RGS during the next operating cadence.",
    reviewedBy: "rgs_team",
    scopeBoundary: SCOPE_RGS_ARCHITECT,
  },
};

/** Best-effort lookup — returns null if the tool key is unknown so the UI
 *  can fall back to a generic "walkthrough not published yet" note. */
export function getToolGuide(toolKey: string): ToolGuide | null {
  return TOOL_GUIDES[toolKey] ?? null;
}

/** All known tool keys with written guides. Used by admin readiness. */
export const KNOWN_TOOL_GUIDE_KEYS: string[] = Object.keys(TOOL_GUIDES);
