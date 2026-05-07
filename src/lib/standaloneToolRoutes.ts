// Maps reportable/standalone tool keys to a real admin route so the
// Standalone Tool Runner can actually open the underlying tool surface.
// `:customerId` is interpolated when a customer is selected. If a tool
// has no customer-scoped admin surface yet, an admin-global fallback is
// returned. Returns null when no surface exists at all (the UI will
// label the action as unavailable instead of rendering a dead button).

export type StandaloneToolRouteResolution =
  | { kind: "customer"; href: string }
  | { kind: "admin"; href: string }
  | { kind: "unavailable"; reason: string };

const CUSTOMER_SCOPED: Record<string, string> = {
  rgs_stability_snapshot: "/admin/customers/:customerId/swot-analysis",
  priority_repair_map: "/admin/customers/:customerId/priority-action-tracker",
  financial_visibility: "/admin/customers/:customerId/financial-visibility",
  implementation_roadmap: "/admin/customers/:customerId/implementation-roadmap",
  sop_training_bible: "/admin/customers/:customerId/sop-training-bible",
  decision_rights_accountability:
    "/admin/customers/:customerId/decision-rights-accountability",
  workflow_process_mapping:
    "/admin/customers/:customerId/workflow-process-mapping",
  tool_assignment_training_tracker:
    "/admin/customers/:customerId/tool-assignment-training-tracker",
  priority_action_tracker:
    "/admin/customers/:customerId/priority-action-tracker",
  owner_decision_dashboard:
    "/admin/customers/:customerId/owner-decision-dashboard",
  scorecard_history: "/admin/customers/:customerId/scorecard-history",
  monthly_system_review: "/admin/customers/:customerId/monthly-system-review",
  advisory_notes: "/admin/customers/:customerId/advisory-notes",
};

const ADMIN_GLOBAL: Record<string, string> = {
  owner_diagnostic_interview: "/admin/diagnostic-interviews",
  business_stability_scorecard: "/admin/scorecard-leads",
};

export function resolveStandaloneToolRoute(
  toolKey: string,
  customerId: string | null,
): StandaloneToolRouteResolution {
  const scoped = CUSTOMER_SCOPED[toolKey];
  if (scoped) {
    if (!customerId) {
      return {
        kind: "unavailable",
        reason: "Select or create a customer to open this tool.",
      };
    }
    return { kind: "customer", href: scoped.replace(":customerId", customerId) };
  }
  const global = ADMIN_GLOBAL[toolKey];
  if (global) return { kind: "admin", href: global };
  return {
    kind: "unavailable",
    reason: "This tool does not have an admin workspace route yet.",
  };
}

export function hasStandaloneToolRoute(toolKey: string): boolean {
  return Boolean(CUSTOMER_SCOPED[toolKey] || ADMIN_GLOBAL[toolKey]);
}