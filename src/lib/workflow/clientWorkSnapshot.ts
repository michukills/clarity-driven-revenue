/**
 * P93E-E2G-P2.7B — Client-safe workflow snapshot.
 *
 * Returns plain-English status text the client portal can show near the top
 * of the dashboard. Never exposes admin-only language, never claims a
 * completion that is not safely known.
 */

export type ClientStageKey =
  | "lead"
  | "diagnostic"
  | "implementation"
  | "control_system"
  | "completed"
  | "re_engagement"
  | "inactive"
  | "unknown";

export interface ClientWorkSnapshot {
  stageKey: ClientStageKey;
  stageLabel: string;
  /** What is happening right now, in client-safe language. */
  currentWork: string;
  /** Who the next move belongs to. */
  waitingOn: "you" | "rgs" | "no_one";
  /** Plain-English instruction. Empty when waitingOn is "no_one". */
  yourNextStep: string;
  /** Optional locked-tool message. */
  blockedReason?: string;
}

const STAGE_LABELS: Record<ClientStageKey, string> = {
  lead: "Getting started",
  diagnostic: "Diagnostic in progress",
  implementation: "Implementation in progress",
  control_system: "RGS Control System — ongoing",
  completed: "Engagement complete",
  re_engagement: "Re-engagement",
  inactive: "Account inactive",
  unknown: "Account status pending",
};

export function getClientWorkSnapshot(customer: {
  lifecycle_state?: string | null;
  status?: string | null;
  package_implementation?: boolean | null;
  package_diagnostic?: boolean | null;
  package_ongoing_support?: boolean | null;
}): ClientWorkSnapshot {
  const lc = (customer.lifecycle_state ?? "").toLowerCase();
  const status = (customer.status ?? "").toLowerCase();

  if (status === "archived" || lc === "archived" || lc === "inactive") {
    return {
      stageKey: "inactive",
      stageLabel: STAGE_LABELS.inactive,
      currentWork: "Your account is currently inactive.",
      waitingOn: "no_one",
      yourNextStep: "",
      blockedReason: "Reach out to RGS to reactivate your account.",
    };
  }
  if (lc === "completed") {
    return {
      stageKey: "completed",
      stageLabel: STAGE_LABELS.completed,
      currentWork: "Your engagement is complete.",
      waitingOn: "no_one",
      yourNextStep: "",
    };
  }
  if (lc === "re_engagement") {
    return {
      stageKey: "re_engagement",
      stageLabel: STAGE_LABELS.re_engagement,
      currentWork: "RGS is scoping a re-engagement with you.",
      waitingOn: "rgs",
      yourNextStep: "No action needed right now. RGS will reach out with next steps.",
    };
  }
  if (lc.startsWith("implementation") || customer.package_implementation) {
    return {
      stageKey: "implementation",
      stageLabel: STAGE_LABELS.implementation,
      currentWork: "Your implementation is underway.",
      waitingOn: "you",
      yourNextStep: "Open Priority Tasks to see your current implementation steps.",
    };
  }
  if (lc === "ongoing_support" || customer.package_ongoing_support) {
    return {
      stageKey: "control_system",
      stageLabel: STAGE_LABELS.control_system,
      currentWork: "RGS is monitoring your business with the Control System.",
      waitingOn: "no_one",
      yourNextStep: "Check in on your dashboards or open the Business Control Center.",
    };
  }
  if (
    lc === "diagnostic" ||
    lc.startsWith("diagnostic_") ||
    lc.startsWith("evidence_") ||
    lc.startsWith("report_") ||
    customer.package_diagnostic
  ) {
    if (lc.startsWith("evidence_")) {
      return {
        stageKey: "diagnostic",
        stageLabel: STAGE_LABELS.diagnostic,
        currentWork: "RGS needs supporting evidence to verify the diagnostic.",
        waitingOn: "you",
        yourNextStep: "Upload the requested evidence so RGS can finish reviewing your diagnostic.",
      };
    }
    if (lc.startsWith("report_")) {
      return {
        stageKey: "diagnostic",
        stageLabel: STAGE_LABELS.diagnostic,
        currentWork: "RGS is preparing your diagnostic report.",
        waitingOn: "rgs",
        yourNextStep: "No action needed right now. RGS will share your report when it is ready.",
      };
    }
    return {
      stageKey: "diagnostic",
      stageLabel: STAGE_LABELS.diagnostic,
      currentWork: "RGS is running your diagnostic discovery.",
      waitingOn: "rgs",
      yourNextStep: "RGS will reach out for any information needed.",
    };
  }
  if (lc === "lead" || lc === "") {
    return {
      stageKey: "lead",
      stageLabel: STAGE_LABELS.lead,
      currentWork: "Your account is being set up.",
      waitingOn: "rgs",
      yourNextStep: "RGS will reach out as your engagement begins.",
    };
  }
  return {
    stageKey: "unknown",
    stageLabel: STAGE_LABELS.unknown,
    currentWork: "Your account status is being confirmed.",
    waitingOn: "rgs",
    yourNextStep: "No action needed right now. RGS is reviewing your account.",
  };
}