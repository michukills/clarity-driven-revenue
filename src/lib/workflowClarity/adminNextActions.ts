/**
 * P93C — Admin Next Safe Action Engine
 *
 * Deterministic resolver for "what should the admin do next on this account?"
 * Consumes `classifyAccount()` from P93A and returns an ordered list of safe
 * actions plus blocked-action explanations.
 *
 * Pure logic. No DB reads. No side effects. No fake automation.
 */

import {
  classifyAccount,
  type AccountInput,
  type AccountClassification,
} from "@/lib/accounts/accountClassification";

export type AdminNextActionType =
  | "navigate"
  | "review"
  | "create"
  | "assign"
  | "request"
  | "resolve"
  | "draft"
  | "approve"
  | "blocked";

export interface AdminNextAction {
  id: string;
  label: string;
  description: string;
  priority: "primary" | "secondary" | "warning" | "blocked";
  actionType: AdminNextActionType;
  targetRoute?: string;
  targetToolId?: string;
  isEnabled: boolean;
  disabledReason?: string;
  clientVisibleRisk?: "none" | "low" | "medium" | "high";
  requiresAdminReview: boolean;
}

export interface AdminWorkflowContext {
  customerId?: string | null;
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
  controlSystemActive?: boolean;
  gigScopeConfirmed?: boolean;
  standaloneToolRunCompleted?: boolean;
  signupRequestId?: string | null;
}

function withCustomer(route: string, customerId?: string | null): string | undefined {
  if (!customerId) return undefined;
  return route.replace(":customerId", customerId).replace(":id", customerId);
}

function blocked(
  id: string,
  label: string,
  reason: string,
): AdminNextAction {
  return {
    id,
    label,
    description: reason,
    priority: "blocked",
    actionType: "blocked",
    isEnabled: false,
    disabledReason: reason,
    clientVisibleRisk: "high",
    requiresAdminReview: true,
  };
}

export function getAdminNextActions(
  input: AccountInput,
  ctx: AdminWorkflowContext = {},
): AdminNextAction[] {
  const c: AccountClassification = classifyAccount(input);
  const cid = ctx.customerId ?? null;

  // 1) Needs Review — only one safe action: resolve the conflict.
  if (c.accountKind === "needs_review") {
    return [
      {
        id: "resolve_account_conflict",
        label: "Resolve Account Type Conflict",
        description:
          c.conflictReasons[0] ??
          "Account fields disagree. Resolve before any client-visible or payment action.",
        priority: "primary",
        actionType: "resolve",
        targetRoute: withCustomer("/admin/customers/:customerId", cid),
        isEnabled: true,
        clientVisibleRisk: "none",
        requiresAdminReview: true,
      },
      blocked(
        "blocked_invite",
        "Send Invite",
        "Blocked — account needs review before inviting the client.",
      ),
      blocked(
        "blocked_assign",
        "Assign Tools",
        "Blocked — account needs review before assigning tools.",
      ),
      blocked(
        "blocked_payment",
        "Use Payment Flows",
        "Blocked — account needs review before any payment action.",
      ),
      blocked(
        "blocked_publish",
        "Publish Client-Visible Output",
        "Blocked — account needs review before publishing anything client-visible.",
      ),
    ];
  }

  // 2) Pending Request — primary is admin review/approve/deny.
  if (c.accountKind === "pending_request") {
    return [
      {
        id: "review_access_request",
        label: "Review Access Request",
        description:
          "Approve, deny, or request clarification before any tools or portal access.",
        priority: "primary",
        actionType: "approve",
        targetRoute: "/admin/pending-accounts",
        isEnabled: true,
        clientVisibleRisk: "none",
        requiresAdminReview: true,
      },
      blocked(
        "blocked_tools",
        "Assign Tools",
        "Blocked — signup request must be reviewed first.",
      ),
      blocked(
        "blocked_report",
        "Create Report",
        "Blocked — signup request must be reviewed first.",
      ),
      blocked(
        "blocked_payment_pending",
        "Use Payment Flows",
        "Blocked — signup request must be reviewed first.",
      ),
    ];
  }

  // 3) Demo / Test
  if (c.accountKind === "demo_test") {
    return [
      {
        id: "open_demo_walkthrough",
        label: "Open Demo Walkthrough",
        description: "Use seeded demo data to show how the OS behaves.",
        priority: "primary",
        actionType: "navigate",
        targetRoute: withCustomer("/admin/customers/:customerId", cid) ?? "/admin/customers",
        isEnabled: true,
        clientVisibleRisk: "none",
        requiresAdminReview: false,
      },
      {
        id: "assign_demo_safe_tools",
        label: "Assign Demo-Safe Tools",
        description: "Only demo data flows through. Real client outputs are not produced.",
        priority: "secondary",
        actionType: "assign",
        targetRoute: withCustomer("/admin/customers/:customerId/tool-assignment-training-tracker", cid),
        isEnabled: Boolean(cid),
        clientVisibleRisk: "none",
        requiresAdminReview: false,
      },
      blocked(
        "blocked_real_payment_demo",
        "Use Real Payment Flows",
        "Blocked — demo accounts cannot run real payment flows.",
      ),
      blocked(
        "blocked_real_publish_demo",
        "Publish Real Client Report",
        "Blocked — demo accounts cannot publish client-visible real outputs.",
      ),
    ];
  }

  // 4) Prospect / Draft
  if (c.accountKind === "prospect_draft") {
    return [
      {
        id: "continue_scoping",
        label: "Continue Scoping",
        description: "Capture scope notes before any client-visible work begins.",
        priority: "primary",
        actionType: "draft",
        targetRoute: withCustomer("/admin/customers/:customerId/advisory-notes", cid),
        isEnabled: Boolean(cid),
        clientVisibleRisk: "none",
        requiresAdminReview: false,
      },
      {
        id: "draft_internal_notes",
        label: "Draft Internal Notes",
        description: "Admin-only. Not surfaced to the client.",
        priority: "secondary",
        actionType: "draft",
        targetRoute: withCustomer("/admin/customers/:customerId/advisory-notes", cid),
        isEnabled: Boolean(cid),
        clientVisibleRisk: "none",
        requiresAdminReview: false,
      },
      blocked(
        "blocked_publish_prospect",
        "Publish Client-Visible Output",
        "Blocked — prospect/draft accounts require explicit conversion before client-visible publishing.",
      ),
      blocked(
        "blocked_full_tools_prospect",
        "Assign Full Client Tools",
        "Blocked — prospect/draft accounts cannot receive full client tool assignments.",
      ),
    ];
  }

  // 5) Gig Work
  if (c.accountKind === "gig_work") {
    const upgradedDx = input.upgraded_to_diagnostic === true;
    const upgradedImpl = input.upgraded_to_implementation === true;
    const upgradedCs = input.upgraded_to_control_system === true;
    const list: AdminNextAction[] = [
      {
        id: "open_standalone_tool_runner",
        label: "Open Standalone Tool Runner",
        description: "Run the scoped standalone or gig tool for this account.",
        priority: "primary",
        actionType: "navigate",
        targetRoute: "/admin/standalone-tool-runner",
        targetToolId: "standalone_tool_runner",
        isEnabled: true,
        clientVisibleRisk: "low",
        requiresAdminReview: true,
      },
      {
        id: "confirm_gig_scope",
        label: "Confirm Gig Scope",
        description: "Document what was purchased so deliverables stay inside scope.",
        priority: "secondary",
        actionType: "review",
        targetRoute: withCustomer("/admin/customers/:customerId/advisory-notes", cid),
        isEnabled: Boolean(cid),
        clientVisibleRisk: "none",
        requiresAdminReview: false,
      },
      {
        id: "create_gig_deliverable_report",
        label: "Create Gig Deliverable Report",
        description: "Package the standalone output into the deliverable the client receives.",
        priority: ctx.standaloneToolRunCompleted ? "primary" : "secondary",
        actionType: "create",
        targetRoute: withCustomer("/admin/customers/:customerId/reports", cid),
        targetToolId: "gig_deliverable_report",
        isEnabled: Boolean(cid),
        clientVisibleRisk: "medium",
        requiresAdminReview: true,
      },
    ];
    if (!upgradedDx)
      list.push(
        blocked(
          "blocked_full_diagnostic_gig",
          "Open Full Diagnostic",
          "Locked — outside current account scope. Gig accounts require an explicit Diagnostic upgrade.",
        ),
      );
    if (!upgradedImpl)
      list.push(
        blocked(
          "blocked_implementation_gig",
          "Open Implementation",
          "Locked — outside current account scope. Gig accounts require an explicit Implementation upgrade.",
        ),
      );
    if (!upgradedCs)
      list.push(
        blocked(
          "blocked_control_system_gig",
          "Open RGS Control System",
          "Locked — outside current account scope. Gig accounts require an explicit Control System upgrade.",
        ),
      );
    return list;
  }

  // 6) Real Client — adapt to workflow state.
  const list: AdminNextAction[] = [];

  if (!ctx.inviteSent) {
    list.push({
      id: "send_invite",
      label: "Send Invite",
      description: "Mint a portal invite so the client can complete intake.",
      priority: "primary",
      actionType: "request",
      targetRoute: withCustomer("/admin/customers/:customerId", cid),
      isEnabled: c.allowedActions.canInvite && Boolean(cid),
      disabledReason: c.allowedActions.canInvite
        ? undefined
        : "Account is suspended or otherwise blocked from inviting.",
      clientVisibleRisk: "low",
      requiresAdminReview: false,
    });
  }

  if (
    c.allowedActions.canAccessFullDiagnostic &&
    !ctx.diagnosticInterviewStarted
  ) {
    list.push({
      id: "start_diagnostic_interview",
      label: "Start Diagnostic Interview",
      description: "Begin the Owner Diagnostic Interview now that the diagnostic is active.",
      priority: "primary",
      actionType: "create",
      targetRoute: "/admin/diagnostic-interviews",
      targetToolId: "owner_diagnostic_interview",
      isEnabled: true,
      clientVisibleRisk: "low",
      requiresAdminReview: true,
    });
  }

  if (
    c.allowedActions.canAccessFullDiagnostic &&
    ctx.diagnosticInterviewStarted &&
    !ctx.evidenceSubmitted
  ) {
    list.push({
      id: "request_evidence_upload",
      label: "Request Evidence Upload",
      description: "Ask the client to provide supporting evidence for the diagnostic.",
      priority: "primary",
      actionType: "request",
      targetRoute: withCustomer("/admin/customers/:customerId", cid),
      isEnabled: Boolean(cid),
      clientVisibleRisk: "low",
      requiresAdminReview: false,
    });
  }

  if (ctx.evidenceSubmitted && !ctx.evidenceReviewed) {
    list.push({
      id: "review_evidence",
      label: "Review Evidence",
      description: "Accept or reject submitted evidence before treating it as trusted.",
      priority: "primary",
      actionType: "review",
      targetRoute: withCustomer("/admin/customers/:customerId", cid),
      targetToolId: "evidence_vault_review",
      isEnabled: Boolean(cid),
      clientVisibleRisk: "medium",
      requiresAdminReview: true,
    });
  }

  if (ctx.evidenceReviewed && !ctx.diagnosticScoreLocked) {
    list.push({
      id: "lock_diagnostic_score",
      label: "Lock Diagnostic Score",
      description: "Lock the score so the snapshot can be drafted from a stable baseline.",
      priority: "primary",
      actionType: "review",
      targetRoute: withCustomer("/admin/customers/:customerId", cid),
      isEnabled: Boolean(cid),
      clientVisibleRisk: "medium",
      requiresAdminReview: true,
    });
  }

  if (ctx.diagnosticScoreLocked && !ctx.stabilitySnapshotDrafted) {
    list.push({
      id: "draft_stability_snapshot",
      label: "Draft Stability Snapshot",
      description: "Create the structured read on what is stable and what is slipping.",
      priority: "primary",
      actionType: "draft",
      targetRoute: withCustomer("/admin/customers/:customerId/swot-analysis", cid),
      targetToolId: "rgs_stability_snapshot",
      isEnabled: Boolean(cid),
      clientVisibleRisk: "medium",
      requiresAdminReview: true,
    });
  }

  if (ctx.stabilitySnapshotDrafted && !ctx.repairMapDrafted) {
    list.push({
      id: "create_priority_repair_map",
      label: "Create Priority Repair Map",
      description: "Sequence the highest-priority repairs the owner should address next.",
      priority: "primary",
      actionType: "create",
      targetRoute: withCustomer("/admin/customers/:customerId/priority-action-tracker", cid),
      targetToolId: "priority_repair_map",
      isEnabled: Boolean(cid),
      clientVisibleRisk: "medium",
      requiresAdminReview: true,
    });
  }

  if (
    ctx.repairMapDrafted &&
    c.allowedActions.canAccessImplementation &&
    !ctx.implementationToolsAssigned
  ) {
    list.push({
      id: "assign_implementation_tools",
      label: "Assign Implementation Tools",
      description: "Assign the implementation tools the client will use.",
      priority: "primary",
      actionType: "assign",
      targetRoute: withCustomer("/admin/customers/:customerId/tool-assignment-training-tracker", cid),
      targetToolId: "tool_assignment_training_tracker",
      isEnabled: Boolean(cid),
      clientVisibleRisk: "low",
      requiresAdminReview: false,
    });
  }

  if (
    c.allowedActions.canAccessControlSystem &&
    ctx.controlSystemActive
  ) {
    list.push({
      id: "review_control_system_signals",
      label: "Review Control System Signals",
      description: "Triage the latest signals from the active Control System.",
      priority: "secondary",
      actionType: "review",
      targetRoute: withCustomer("/admin/customers/:customerId/rgs-control-system", cid),
      targetToolId: "rgs_control_system",
      isEnabled: Boolean(cid),
      clientVisibleRisk: "low",
      requiresAdminReview: true,
    });
  }

  // Always offer admin notes as a safe fallback.
  list.push({
    id: "draft_advisory_notes",
    label: "Draft Advisory Notes",
    description: "Capture admin-only context for this account.",
    priority: list.length === 0 ? "primary" : "secondary",
    actionType: "draft",
    targetRoute: withCustomer("/admin/customers/:customerId/advisory-notes", cid),
    targetToolId: "advisory_notes",
    isEnabled: Boolean(cid),
    clientVisibleRisk: "none",
    requiresAdminReview: false,
  });

  // Real-client blocked actions for clarity.
  if (!c.allowedActions.canAccessImplementation) {
    list.push(
      blocked(
        "blocked_implementation_real",
        "Open Implementation",
        "Locked — outside current account scope. Implementation requires an active or upgraded engagement.",
      ),
    );
  }
  if (!c.allowedActions.canAccessControlSystem) {
    list.push(
      blocked(
        "blocked_control_system_real",
        "Open RGS Control System",
        "Locked — outside current account scope. Control System requires an active or upgraded engagement.",
      ),
    );
  }

  return list;
}

export function getPrimaryAdminNextAction(
  input: AccountInput,
  ctx: AdminWorkflowContext = {},
): AdminNextAction | null {
  const all = getAdminNextActions(input, ctx);
  return all.find((a) => a.priority === "primary" && a.isEnabled) ?? null;
}

export function getBlockedActionReasons(
  input: AccountInput,
  ctx: AdminWorkflowContext = {},
): string[] {
  return getAdminNextActions(input, ctx)
    .filter((a) => a.priority === "blocked")
    .map((a) => a.disabledReason ?? a.description);
}

export function shouldShowAction(
  action: AdminNextAction,
  _input: AccountInput,
  _ctx: AdminWorkflowContext = {},
): boolean {
  // Hide nothing today; AdminNextActionPanel renders all returned actions.
  // Reserved for future visibility filters without leaking action ids.
  return Boolean(action.label);
}