// P6.2 — Tool Operating Matrix
// Single source of truth for: phase, audience, frequency, overdue rule,
// route, and activity source per tool_key. Static TS config — no schema
// change. tool_key values are stable and MUST match existing values used
// in tool_runs.tool_key, RLS, and routes.

export type ToolPhase = "diagnostic" | "implementation" | "ongoing" | "both";
export type ToolUser = "admin" | "client" | "both";

// How we look up "last activity" for a tool. Each tool maps to exactly one
// source so overdue calculations stay accurate.
export type ActivitySource =
  | { kind: "tool_runs"; tool_key: string }
  | { kind: "weekly_checkins" }
  | { kind: "business_control_reports"; report_type?: string }
  | { kind: "checklist_items"; titlePrefix?: string }
  | { kind: "customer_tasks"; titlePrefix?: string };

export type FrequencyRule =
  | { kind: "weekly"; overdueDays: number }
  | { kind: "monthly"; overdueDays: number }
  | { kind: "quarterly"; overdueDays: number }
  | { kind: "event"; description: string }; // run only when triggered, never overdue on its own

export type ToolMatrixEntry = {
  /** Stable identifier — DB tool_key for engines, synthetic for control systems. */
  key: string;
  /** Branded display name (™ included). NEVER use legacy names. */
  name: string;
  /** Diagnostic Engines™ / Structuring Engines™ / Control Systems */
  group: "Diagnostic Engines™" | "Structuring Engines™" | "Control Systems";
  phase: ToolPhase;
  primaryUser: ToolUser;
  /** Plain-English when-to-use guidance shown in the UI. */
  whenToUse: string;
  /** Plain-English recommended cadence. */
  frequencyLabel: string;
  /** Machine rule used to compute overdue. */
  frequency: FrequencyRule;
  /** What "completion" means for one cycle. */
  completion: string;
  /** Where to launch / manage. Empty if not directly launchable. */
  route?: string;
  /** Whether the client sees this in their portal. */
  clientFacing: boolean;
  /** How to discover last-activity per customer. */
  activity: ActivitySource;
  /** True if this tool requires explicit Revenue Control Center™ access. */
  requiresRccAccess?: boolean;
};

export const TOOL_MATRIX: ToolMatrixEntry[] = [
  // ─── Diagnostic Engines™ ────────────────────────────────────────────────
  {
    key: "rgs_stability_scorecard",
    name: "Business Stability Index™",
    group: "Diagnostic Engines™",
    phase: "both",
    primaryUser: "admin",
    whenToUse: "At diagnostic start, after implementation, and quarterly.",
    frequencyLabel: "Diagnostic start, post-implementation, then quarterly",
    frequency: { kind: "quarterly", overdueDays: 100 },
    completion: "Saved Stability Index run with all 5 pillars scored.",
    route: "/admin/tools/stability-scorecard",
    clientFacing: false,
    activity: { kind: "tool_runs", tool_key: "rgs_stability_scorecard" },
  },
  {
    key: "revenue_leak_finder",
    name: "Revenue Leak Detection Engine™",
    group: "Diagnostic Engines™",
    phase: "both",
    primaryUser: "admin",
    whenToUse: "Diagnostic start, after major pricing/sales changes, quarterly.",
    frequencyLabel: "Diagnostic start, after major changes, then quarterly",
    frequency: { kind: "quarterly", overdueDays: 100 },
    completion: "Saved Leak Detection run with leak categories scored.",
    route: "/admin/tools/revenue-leak-finder",
    clientFacing: false,
    activity: { kind: "tool_runs", tool_key: "revenue_leak_finder" },
  },
  {
    key: "buyer_persona_tool",
    name: "Buyer Intelligence Engine™",
    group: "Diagnostic Engines™",
    phase: "diagnostic",
    primaryUser: "admin",
    whenToUse: "Diagnostic start; revisit when offer or market changes.",
    frequencyLabel: "At diagnostic; revisit on offer/market change",
    frequency: { kind: "event", description: "Run when offer or target market shifts." },
    completion: "Saved persona run capturing buyer profile.",
    route: "/admin/tools/persona-builder",
    clientFacing: false,
    activity: { kind: "tool_runs", tool_key: "buyer_persona_tool" },
  },
  {
    key: "customer_journey_mapper",
    name: "Customer Journey Mapping System™",
    group: "Diagnostic Engines™",
    phase: "both",
    primaryUser: "admin",
    whenToUse: "Diagnostic start, implementation planning, and quarterly review.",
    frequencyLabel: "Diagnostic start, implementation planning, quarterly",
    frequency: { kind: "quarterly", overdueDays: 100 },
    completion: "Saved journey map run with stages defined.",
    route: "/admin/tools/journey-mapper",
    clientFacing: false,
    activity: { kind: "tool_runs", tool_key: "customer_journey_mapper" },
  },
  {
    key: "process_breakdown_tool",
    name: "Process Clarity Engine™",
    group: "Diagnostic Engines™",
    phase: "both",
    primaryUser: "admin",
    whenToUse: "Diagnostic start, implementation planning, when a process bottleneck repeats.",
    frequencyLabel: "Diagnostic + implementation planning; rerun on repeated bottleneck",
    frequency: { kind: "quarterly", overdueDays: 100 },
    completion: "Saved process map with steps, owners, and bottlenecks.",
    route: "/admin/tools/process-breakdown",
    clientFacing: false,
    activity: { kind: "tool_runs", tool_key: "process_breakdown_tool" },
  },

  // ─── Structuring Engines™ ───────────────────────────────────────────────
  {
    key: "implementation_foundation_system",
    name: "Implementation Foundation System™",
    group: "Structuring Engines™",
    phase: "implementation",
    primaryUser: "client",
    whenToUse: "Implementation onboarding; update when scope changes.",
    frequencyLabel: "At onboarding; update on scope change",
    frequency: { kind: "event", description: "Set up at onboarding; update on scope change." },
    completion: "Onboarding worksheet completed by client.",
    route: "/portal/tools/self-assessment",
    clientFacing: true,
    activity: { kind: "tool_runs", tool_key: "implementation_foundation_system" },
  },
  {
    key: "implementation_command_tracker",
    name: "Implementation Command Tracker™",
    group: "Structuring Engines™",
    phase: "implementation",
    primaryUser: "both",
    whenToUse: "Weekly while implementation is active.",
    frequencyLabel: "Weekly during implementation",
    frequency: { kind: "weekly", overdueDays: 10 },
    completion: "Weekly tracker update saved or implementation milestone marked.",
    route: "/portal/tools/implementation-tracker",
    clientFacing: true,
    activity: { kind: "tool_runs", tool_key: "implementation_command_tracker" },
  },

  // ─── Control Systems ────────────────────────────────────────────────────
  {
    key: "revenue_control_center",
    name: "Revenue Control Center™",
    group: "Control Systems",
    phase: "ongoing",
    primaryUser: "client",
    whenToUse: "Weekly while RCC is active for the client.",
    frequencyLabel: "Weekly (when RCC is active)",
    frequency: { kind: "weekly", overdueDays: 10 },
    completion: "Weekly check-in saved for the latest period.",
    route: "/portal/business-control-center",
    clientFacing: true,
    activity: { kind: "weekly_checkins" },
    requiresRccAccess: true,
  },
  {
    key: "revenue_risk_monitor",
    name: "Revenue & Risk Monitor™",
    group: "Control Systems",
    phase: "ongoing",
    primaryUser: "client",
    whenToUse: "Monthly, or after benchmark/report update.",
    frequencyLabel: "Monthly, or after report update",
    frequency: { kind: "monthly", overdueDays: 35 },
    completion: "Risk monitor reviewed for the latest period.",
    route: "/portal/tools/revenue-risk-monitor",
    clientFacing: true,
    activity: { kind: "tool_runs", tool_key: "revenue_risk_monitor" },
  },
  {
    key: "weekly_alignment_system",
    name: "Weekly Alignment System™",
    group: "Control Systems",
    phase: "ongoing",
    primaryUser: "client",
    whenToUse: "Weekly to capture wins, blockers, and next steps.",
    frequencyLabel: "Weekly",
    frequency: { kind: "weekly", overdueDays: 10 },
    completion: "Weekly reflection saved for the current week.",
    route: "/portal/tools/weekly-reflection",
    clientFacing: true,
    activity: { kind: "tool_runs", tool_key: "weekly_alignment_system" },
  },
  {
    key: "reports_and_reviews",
    name: "Reports & Reviews™",
    group: "Control Systems",
    phase: "ongoing",
    primaryUser: "both",
    whenToUse: "Published by RGS on the cadence of your active subscription tier.",
    frequencyLabel: "Per active subscription tier",
    frequency: { kind: "monthly", overdueDays: 35 },
    completion: "Most recent report published for the customer.",
    route: "/admin/reports",
    clientFacing: true,
    activity: { kind: "business_control_reports" },
  },
];

export const toolByKey = (key: string): ToolMatrixEntry | undefined =>
  TOOL_MATRIX.find((t) => t.key === key);

export const PHASE_LABEL: Record<ToolPhase, string> = {
  diagnostic: "Diagnostic",
  implementation: "Implementation",
  ongoing: "Ongoing",
  both: "Diagnostic + Ongoing",
};

export const USER_LABEL: Record<ToolUser, string> = {
  admin: "RGS Admin",
  client: "Client",
  both: "Both",
};

export const GROUP_ORDER: ToolMatrixEntry["group"][] = [
  "Diagnostic Engines™",
  "Structuring Engines™",
  "Control Systems",
];

// Stage-driven required-tool sets, used to flag "missing required tool" alerts.
const DIAGNOSTIC_STAGES = new Set([
  "diagnostic_paid",
  "diagnostic_in_progress",
  "diagnostic_delivered",
  "decision_pending",
  "diagnostic_complete",
]);
const IMPLEMENTATION_STAGES = new Set([
  "implementation_added",
  "implementation_onboarding",
  "tools_assigned",
  "client_training_setup",
  "implementation_active",
  "waiting_on_client",
  "review_revision_window",
  "implementation",
  "work_in_progress",
]);

export function requiredToolKeysForStage(stage?: string | null): string[] {
  if (!stage) return [];
  if (DIAGNOSTIC_STAGES.has(stage)) {
    // At minimum a Diagnostic Engine™ run should exist by diagnostic_delivered.
    return ["rgs_stability_scorecard", "revenue_leak_finder"];
  }
  if (IMPLEMENTATION_STAGES.has(stage)) {
    return ["implementation_command_tracker"];
  }
  return [];
}

export type OverdueState = "ok" | "due_soon" | "overdue" | "not_started" | "n/a";

export function computeOverdueState(
  rule: FrequencyRule,
  lastActivityIso: string | null | undefined,
): OverdueState {
  if (rule.kind === "event") {
    return lastActivityIso ? "ok" : "n/a";
  }
  if (!lastActivityIso) return "not_started";
  const ageDays = (Date.now() - new Date(lastActivityIso).getTime()) / 86_400_000;
  if (ageDays >= rule.overdueDays) return "overdue";
  if (ageDays >= rule.overdueDays * 0.8) return "due_soon";
  return "ok";
}

export const overdueLabel: Record<OverdueState, string> = {
  ok: "On track",
  due_soon: "Due soon",
  overdue: "Overdue",
  not_started: "Not started",
  "n/a": "Run as needed",
};

export const overdueTone: Record<OverdueState, "ok" | "warn" | "critical" | "muted"> = {
  ok: "ok",
  due_soon: "warn",
  overdue: "critical",
  not_started: "muted",
  "n/a": "muted",
};
