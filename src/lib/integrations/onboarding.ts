/**
 * P12.2.H — Connector onboarding checklist + internal readiness model.
 *
 * Onboarding is *internal preparation* for a connector. It defines the
 * gates that must be true before we let any client turn the connector
 * on. This is product structure — not free text — so the planning layer
 * stays operationally actionable.
 *
 * Readiness is the internal lifecycle of the *plan itself*:
 *   planned → design_ready → implementation_ready → enabled_for_rollout
 * with `deferred` as a side-state. It is NOT the live connection state
 * for any individual customer.
 */

import type { ConnectorId } from "./planning";

export type ConnectorReadiness =
  | "planned"
  | "design_ready"
  | "implementation_ready"
  | "enabled_for_rollout"
  | "deferred";

export const READINESS_LABEL: Record<ConnectorReadiness, string> = {
  planned: "Planned",
  design_ready: "Design ready",
  implementation_ready: "Implementation ready",
  enabled_for_rollout: "Enabled for rollout",
  deferred: "Deferred",
};

export const READINESS_RANK: Record<ConnectorReadiness, number> = {
  planned: 0,
  design_ready: 1,
  implementation_ready: 2,
  enabled_for_rollout: 3,
  deferred: -1,
};

export type OnboardingGateId =
  | "credentials_auth"
  | "owned_truth_scope"
  | "field_mapping_reviewed"
  | "verification_policy_approved"
  | "noise_exclusions_confirmed"
  | "sync_strategy_confirmed"
  | "visibility_implications_reviewed"
  | "provenance_behavior_confirmed";

export const GATE_LABEL: Record<OnboardingGateId, string> = {
  credentials_auth: "Credentials / auth available",
  owned_truth_scope: "Owned-truth scope confirmed",
  field_mapping_reviewed: "Field mapping reviewed",
  verification_policy_approved: "Verification policy approved",
  noise_exclusions_confirmed: "Noise exclusions confirmed",
  sync_strategy_confirmed: "Sync strategy confirmed",
  visibility_implications_reviewed: "Client/admin visibility reviewed",
  provenance_behavior_confirmed: "Provenance behavior confirmed",
};

export interface OnboardingChecklist {
  connector: ConnectorId;
  readiness: ConnectorReadiness;
  cleared: OnboardingGateId[];
  blocker?: string;
}

export const ONBOARDING_CHECKLISTS: OnboardingChecklist[] = [
  {
    connector: "quickbooks",
    readiness: "implementation_ready",
    cleared: [
      "owned_truth_scope",
      "field_mapping_reviewed",
      "verification_policy_approved",
      "noise_exclusions_confirmed",
      "sync_strategy_confirmed",
      "provenance_behavior_confirmed",
    ],
    blocker: "OAuth app credentials must be provisioned before rollout.",
  },
  {
    connector: "stripe",
    readiness: "implementation_ready",
    cleared: [
      "owned_truth_scope",
      "field_mapping_reviewed",
      "verification_policy_approved",
      "noise_exclusions_confirmed",
      "sync_strategy_confirmed",
      "provenance_behavior_confirmed",
    ],
    blocker: "Pending decision on per-client restricted-key vs Connect.",
  },
  {
    connector: "hubspot",
    readiness: "design_ready",
    cleared: [
      "owned_truth_scope",
      "field_mapping_reviewed",
      "verification_policy_approved",
      "noise_exclusions_confirmed",
      "sync_strategy_confirmed",
    ],
    blocker:
      "Visibility implications for client pipeline overrides need final review.",
  },
  {
    connector: "ga4",
    readiness: "planned",
    cleared: ["owned_truth_scope", "noise_exclusions_confirmed"],
    blocker:
      "Conversion-event taxonomy varies per client — needs review template.",
  },
  {
    connector: "paycom",
    readiness: "planned",
    cleared: ["owned_truth_scope", "noise_exclusions_confirmed"],
    blocker: "API access path depends on customer's Paycom contract tier.",
  },
  {
    connector: "jobber",
    readiness: "design_ready",
    cleared: [
      "owned_truth_scope",
      "field_mapping_reviewed",
      "noise_exclusions_confirmed",
      "sync_strategy_confirmed",
    ],
    blocker:
      "Verification policy for non-QuickBooks clients still needs admin approval.",
  },
  {
    connector: "housecall_pro",
    readiness: "planned",
    cleared: ["owned_truth_scope", "noise_exclusions_confirmed"],
    blocker: "Mirrors Jobber plan — finalize once Jobber design is locked.",
  },
];

export const ALL_GATES: OnboardingGateId[] = [
  "credentials_auth",
  "owned_truth_scope",
  "field_mapping_reviewed",
  "verification_policy_approved",
  "noise_exclusions_confirmed",
  "sync_strategy_confirmed",
  "visibility_implications_reviewed",
  "provenance_behavior_confirmed",
];

export function checklistFor(id: ConnectorId): OnboardingChecklist {
  return (
    ONBOARDING_CHECKLISTS.find((c) => c.connector === id) ?? {
      connector: id,
      readiness: "planned",
      cleared: [],
    }
  );
}

export function gateProgress(c: OnboardingChecklist): {
  cleared: number;
  total: number;
  pct: number;
} {
  const total = ALL_GATES.length;
  const cleared = c.cleared.length;
  return { cleared, total, pct: Math.round((cleared / total) * 100) };
}

export function readinessVariant(
  r: ConnectorReadiness
): "default" | "secondary" | "outline" | "destructive" {
  switch (r) {
    case "enabled_for_rollout":
      return "default";
    case "implementation_ready":
      return "secondary";
    case "design_ready":
    case "planned":
      return "outline";
    case "deferred":
      return "destructive";
  }
}
