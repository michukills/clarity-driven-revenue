/**
 * P93E-E2G-P2.7 — Shared CustomerWorkState helper.
 *
 * Single source of truth that answers, for any customer record:
 *   - what stage/lane are they in?
 *   - what is the current work?
 *   - what is the primary next action and where does it route?
 *   - which tools belong near the top of the customer workspace right now?
 *   - what is blocked, and why?
 *   - is this a demo/test/standalone/full client?
 *
 * This is intentionally pure logic. It does not fetch anything. Pages compose
 * it with whatever workflow context they already load (interview state,
 * evidence state, report state) — but it works correctly with no context too,
 * so customer cards and dashboards can reuse it cheaply.
 *
 * The OS already has `getAdminNextActions` (deterministic next-action engine)
 * and `pickNextBestAction` (client portal). This helper does NOT replace
 * either — it sits above them and assembles the lane-aware tool launcher set
 * the workspace top panel needs.
 */
import { getCustomerAccountKind, type CustomerAccountKind } from "@/lib/customers/accountKind";
import { lifecycleLabel } from "@/lib/customers/packages";

export type CustomerLane =
  | "lead"
  | "diagnostic"
  | "implementation"
  | "control_system"
  | "standalone"
  | "completed"
  | "re_engagement"
  | "inactive"
  | "unknown";

export interface ToolLauncher {
  /** Stable id for tests. */
  id: string;
  label: string;
  /** Plain-English purpose, surfaced as helper text. */
  description: string;
  /** Route, may be null when the tool is not yet routable for this customer. */
  route: string | null;
  /** Why the launcher is disabled, when route is null. */
  blockedReason?: string;
  /** Visual emphasis. */
  emphasis: "primary" | "secondary";
}

export interface CustomerWorkState {
  /** Resolved canonical lane. */
  lane: CustomerLane;
  /** Human label for the lane. */
  laneLabel: string;
  /** Plain-English label for the lifecycle the row actually carries. */
  lifecycleLabel: string;
  /** Account kind: client/demo/test/internal_admin. */
  accountKind: CustomerAccountKind;
  isDemoOrTest: boolean;
  isArchived: boolean;
  /** One-sentence summary of the current work. */
  currentWork: string;
  /** Optional one-line "what should the admin do next?" */
  nextStep: string;
  /** Lane-appropriate tool launchers, ordered for top-to-bottom reading. */
  toolLaunchers: ToolLauncher[];
  /** Lane-appropriate primary CTA — typically duplicates toolLaunchers[0]. */
  primaryCta: ToolLauncher | null;
  /** Optional reason the workspace is blocked. */
  blockedReason?: string;
}

/**
 * Conservative, optional knowledge of the customer's actual diagnostic
 * progress. Pages may omit this entirely; helpers must never invent
 * completion when the field is undefined.
 */
export interface DiagnosticWorkContext {
  /** A diagnostic interview session row exists (admin-led). */
  hasInterviewSession?: boolean;
  /** Latest interview status: in_progress, paused, completed, etc. */
  interviewStatus?: "in_progress" | "paused" | "completed" | string | null;
  /** Resume route for the latest in-progress interview. */
  interviewResumeRoute?: string | null;
  /** Industry has been chosen (interview cannot start without one). */
  industrySelected?: boolean;
  /** Client has submitted any evidence at all. */
  evidenceSubmitted?: boolean;
  /** Admin has reviewed submitted evidence. */
  evidenceReviewed?: boolean;
  /** A draft report exists for this customer. */
  reportDraftExists?: boolean;
  /** A published, client-visible report exists. */
  reportPublished?: boolean;
  /** A repair-map / priority-action plan exists. */
  repairMapExists?: boolean;
}

export interface CustomerWorkContext {
  diagnostic?: DiagnosticWorkContext;
  implementationToolsAssigned?: boolean;
  controlSystemActive?: boolean;
  standaloneRunCompleted?: boolean;
}

type CustomerLike = Record<string, unknown> & {
  id?: string;
  lifecycle_state?: string | null;
  stage?: string | null;
  status?: string | null;
  package_diagnostic?: boolean | null;
  package_implementation?: boolean | null;
  package_revenue_tracker?: boolean | null;
  package_ongoing_support?: boolean | null;
  package_addons?: boolean | null;
  package_full_bundle?: boolean | null;
  account_kind?: string | null;
  is_demo_account?: boolean | null;
  email?: string | null;
  full_name?: string | null;
  business_name?: string | null;
};

function rt(path: string, id: string | undefined): string | null {
  if (!id) return null;
  return path.replace(":id", id).replace(":customerId", id);
}

/** Derive the canonical lane from lifecycle + packages + status. */
function deriveLane(c: CustomerLike): CustomerLane {
  const lc = (c.lifecycle_state ?? "").toLowerCase();
  const stage = (c.stage ?? "").toLowerCase();
  const status = (c.status ?? "").toLowerCase();

  if (status === "archived" || lc === "archived") return "inactive";
  if (lc === "inactive") return "inactive";
  if (lc === "completed") return "completed";
  if (lc === "re_engagement") return "re_engagement";

  if (lc.startsWith("standalone_tool") || stage.startsWith("standalone_tool")) {
    return "standalone";
  }
  if (lc.startsWith("control_system") || lc === "ongoing_support") {
    return "control_system";
  }
  if (lc.startsWith("implementation")) return "implementation";
  if (
    lc === "diagnostic" ||
    lc.startsWith("diagnostic_") ||
    lc.startsWith("evidence_") ||
    lc.startsWith("report_") ||
    lc === "review_scheduled" ||
    lc === "repair_map_delivered"
  ) {
    return "diagnostic";
  }

  // Fall back to packages when lifecycle is "lead" or unset.
  if (c.package_implementation && !c.package_diagnostic) return "implementation";
  if (c.package_ongoing_support) return "control_system";
  if (c.package_diagnostic) return "diagnostic";
  if (c.package_addons || c.package_revenue_tracker) return "standalone";

  if (lc === "lead" || lc === "") return "lead";
  return "unknown";
}

const LANE_LABELS: Record<CustomerLane, string> = {
  lead: "Lead",
  diagnostic: "Diagnostic",
  implementation: "Implementation",
  control_system: "RGS Control System",
  standalone: "Standalone / Gig",
  completed: "Completed",
  re_engagement: "Re-engagement",
  inactive: "Inactive / Archived",
  unknown: "Unclassified",
};

function diagnosticLaunchers(id?: string): ToolLauncher[] {
  return [
    {
      id: "industry_diagnostic_interview",
      label: "Open Industry Diagnostic Interview",
      description:
        "Live admin-led, plain-English script for a 1.5–2 hour discovery call. Captures evidence, confidence, and risk signals.",
      route: "/admin/industry-interviews",
      emphasis: "primary",
    },
    {
      id: "owner_diagnostic_interview",
      label: "Owner Diagnostic Interview (legacy)",
      description: "Admin-only structured intake interview.",
      route: "/admin/diagnostic-interviews",
      emphasis: "secondary",
    },
    {
      id: "evidence_vault",
      label: "Open Evidence Vault",
      description: "Review what the client has provided and request what is missing.",
      route: rt("/admin/customers/:id", id),
      emphasis: "secondary",
    },
    {
      id: "report_drafts",
      label: "Open Report Drafts",
      description: "Continue or start a draft diagnostic report for this customer.",
      route: "/admin/report-drafts",
      emphasis: "secondary",
    },
    {
      id: "priority_action_tracker",
      label: "Open Repair Map / Priority Actions",
      description: "Sequence the repairs the owner should address next.",
      route: rt("/admin/customers/:customerId/priority-action-tracker", id),
      emphasis: "secondary",
    },
  ];
}

function implementationLaunchers(id?: string): ToolLauncher[] {
  return [
    {
      id: "implementation_roadmap",
      label: "Open Implementation Roadmap",
      description: "Track the rollout and current implementation focus.",
      route: rt("/admin/customers/:customerId/implementation-roadmap", id),
      emphasis: "primary",
    },
    {
      id: "priority_action_tracker",
      label: "Open Repair Map",
      description: "Sequenced repairs from the diagnostic.",
      route: rt("/admin/customers/:customerId/priority-action-tracker", id),
      emphasis: "secondary",
    },
    {
      id: "sop_training_bible",
      label: "Open SOP / Training Bible",
      description: "Standard operating procedures and training material.",
      route: rt("/admin/customers/:customerId/sop-training-bible", id),
      emphasis: "secondary",
    },
    {
      id: "evidence_vault",
      label: "Open Evidence Vault",
      description: "Update or verify supporting evidence.",
      route: rt("/admin/customers/:id", id),
      emphasis: "secondary",
    },
  ];
}

function controlSystemLaunchers(id?: string): ToolLauncher[] {
  return [
    {
      id: "rgs_control_system",
      label: "Open RGS Control System",
      description: "Ongoing visibility, monitoring, and bounded review.",
      route: rt("/admin/customers/:customerId/rgs-control-system", id),
      emphasis: "primary",
    },
    {
      id: "priority_action_tracker",
      label: "Open Priority Actions",
      description: "Active priorities for this customer.",
      route: rt("/admin/customers/:customerId/priority-action-tracker", id),
      emphasis: "secondary",
    },
    {
      id: "evidence_vault",
      label: "Open Evidence Vault",
      description: "Re-validate evidence on cadence.",
      route: rt("/admin/customers/:id", id),
      emphasis: "secondary",
    },
  ];
}

function standaloneLaunchers(): ToolLauncher[] {
  return [
    {
      id: "standalone_tool_runner",
      label: "Open Standalone Tool Runner",
      description: "Run the scoped standalone or gig deliverable for this customer.",
      route: "/admin/standalone-tool-runner",
      emphasis: "primary",
    },
  ];
}

function leadLaunchers(id?: string): ToolLauncher[] {
  return [
    {
      id: "advisory_notes",
      label: "Draft Advisory Notes",
      description: "Capture admin-only context. No client-visible work yet.",
      route: rt("/admin/customers/:customerId/advisory-notes", id),
      emphasis: "primary",
    },
  ];
}

/** Pure helper. Safe to call in render. */
export function getCustomerWorkState(
  c: CustomerLike,
  ctx: CustomerWorkContext = {},
): CustomerWorkState {
  const accountKind = getCustomerAccountKind(c);
  const isDemoOrTest = accountKind === "demo" || accountKind === "test";
  const status = (c.status ?? "").toLowerCase();
  const lifecycle = c.lifecycle_state ?? null;
  const isArchived = status === "archived" || lifecycle === "archived";
  const lane = deriveLane(c);

  let toolLaunchers: ToolLauncher[];
  let currentWork: string;
  let nextStep: string;

  switch (lane) {
    case "diagnostic":
      toolLaunchers = diagnosticLaunchers(c.id, ctx.diagnostic);
      ({ currentWork, nextStep } = describeDiagnostic(ctx.diagnostic));
      break;
    case "implementation":
      toolLaunchers = implementationLaunchers(c.id);
      currentWork = "Implementation rollout in progress.";
      nextStep = "Open the Implementation Roadmap to continue the rollout.";
      break;
    case "control_system":
      toolLaunchers = controlSystemLaunchers(c.id);
      currentWork = "RGS Control System — ongoing monitoring and bounded review.";
      nextStep = "Open the Control System dashboard to triage current signals.";
      break;
    case "standalone":
      toolLaunchers = standaloneLaunchers();
      currentWork = "Standalone / gig deliverable.";
      nextStep = "Open the Standalone Tool Runner to continue the scoped deliverable.";
      break;
    case "completed":
      toolLaunchers = [];
      currentWork = "Engagement marked complete.";
      nextStep = "No active work. Re-open via re-engagement when needed.";
      break;
    case "re_engagement":
      toolLaunchers = leadLaunchers(c.id);
      currentWork = "Re-engagement scoping.";
      nextStep = "Capture re-engagement scope before any client-visible work.";
      break;
    case "inactive":
      toolLaunchers = [];
      currentWork = "Customer is archived or inactive.";
      nextStep = "No active workflow. Restore the account before continuing.";
      break;
    case "lead":
      toolLaunchers = leadLaunchers(c.id);
      currentWork = "Lead — pre-engagement.";
      nextStep = "Capture scope and qualify before any client-visible work.";
      break;
    case "unknown":
    default:
      toolLaunchers = leadLaunchers(c.id);
      currentWork = "Lane not yet classified.";
      nextStep = "Confirm the customer's package and lifecycle state before assigning work.";
      break;
  }

  const primaryCta =
    toolLaunchers.find((t) => t.emphasis === "primary" && t.route) ?? null;

  let blockedReason: string | undefined;
  if (isArchived) {
    blockedReason = "This customer is archived. Restore before starting work.";
  } else if (accountKind === "internal_admin") {
    blockedReason = "Internal admin account — workflow tools are not available.";
  }

  return {
    lane,
    laneLabel: LANE_LABELS[lane],
    lifecycleLabel: lifecycleLabel(lifecycle),
    accountKind,
    isDemoOrTest,
    isArchived,
    currentWork,
    nextStep,
    toolLaunchers,
    primaryCta,
    blockedReason,
  };
}

function describeDiagnostic(d?: DiagnosticWorkContext): { currentWork: string; nextStep: string } {
  if (!d) {
    return {
      currentWork: "Diagnostic discovery and evidence collection.",
      nextStep: "Open the Industry Diagnostic Interview to begin or continue the live admin-led discovery.",
    };
  }
  if (d.industrySelected === false) {
    return {
      currentWork: "Diagnostic — industry not yet chosen.",
      nextStep: "Choose the customer's industry before starting the diagnostic interview.",
    };
  }
  if (!d.hasInterviewSession) {
    return {
      currentWork: "Diagnostic — no interview started yet.",
      nextStep: "Start the Industry Diagnostic Interview to begin live admin-led discovery.",
    };
  }
  if (d.interviewStatus === "completed" && !d.evidenceSubmitted) {
    return {
      currentWork: "Diagnostic interview complete — evidence pending.",
      nextStep: "Request and review supporting evidence before drafting findings.",
    };
  }
  if (d.evidenceSubmitted && !d.evidenceReviewed) {
    return {
      currentWork: "Evidence submitted — admin review needed.",
      nextStep: "Open the Evidence Vault to accept, reject, or request follow-up.",
    };
  }
  if (d.evidenceReviewed && !d.reportDraftExists) {
    return {
      currentWork: "Evidence reviewed — report draft pending.",
      nextStep: "Open Report Drafts to start the diagnostic report.",
    };
  }
  if (d.reportDraftExists && !d.reportPublished) {
    return {
      currentWork: "Report draft in progress.",
      nextStep: "Continue the report draft and approve before publishing to the client.",
    };
  }
  if (d.reportPublished && !d.repairMapExists) {
    return {
      currentWork: "Report published — repair map pending.",
      nextStep: "Sequence the highest-priority repairs in the Priority Action Tracker.",
    };
  }
  // In progress / paused / unknown intermediate.
  return {
    currentWork: "Diagnostic interview in progress.",
    nextStep: "Resume the Industry Diagnostic Interview to continue live admin-led discovery.",
  };
}
