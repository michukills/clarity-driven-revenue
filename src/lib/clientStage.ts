// Guided landing — stage → readable client copy.
// Translates the existing customer stage/status into calm, plain-language
// "Where you are / What RGS is doing / Your next step" copy. Does not
// change the underlying lifecycle system; it only produces display strings.

import { stageLabel, isImplementationStage } from "@/lib/portal";

export type ClientStageGuidance = {
  stageKey: string;
  stageDisplay: string;
  rgsIsDoing: string;
  nextStep: string;
  nextStepHref?: string;
  notRequiredYet?: string;
  afterNextStep?: string;
};

export function buildClientStageGuidance(customer: {
  stage?: string | null;
  next_action?: string | null;
  portal_unlocked?: boolean | null;
} | null): ClientStageGuidance {
  const stage = (customer?.stage || "lead") as string;
  const display = stageLabel(stage);
  const fallbackNext =
    customer?.next_action?.trim() ||
    "Your RGS team will let you know the next action shortly.";

  switch (stage) {
    case "lead":
    case "discovery_scheduled":
    case "discovery_completed":
    case "proposal_sent":
      return {
        stageKey: stage,
        stageDisplay: display,
        rgsIsDoing: "RGS is preparing your engagement details.",
        nextStep: fallbackNext,
        notRequiredYet:
          "Nothing is required from you inside the portal yet. Your RGS team will reach out before any next step.",
        afterNextStep:
          "Once your engagement is confirmed, your portal will activate with a clear first step.",
      };
    case "diagnostic_paid":
      return {
        stageKey: stage,
        stageDisplay: display,
        rgsIsDoing: "RGS is preparing your diagnostic workspace.",
        nextStep: "Complete the Owner Diagnostic Interview when it appears.",
        nextStepHref: "/portal/tools/owner-diagnostic-interview",
        notRequiredYet:
          "You do not need to upload financials or run any tools yet — the interview comes first.",
        afterNextStep:
          "After the interview, RGS reviews your answers and assigns the right diagnostic tools.",
      };
    case "diagnostic_in_progress":
      return {
        stageKey: stage,
        stageDisplay: display,
        rgsIsDoing: "RGS is reviewing your submitted diagnostic information.",
        nextStep: "Continue your diagnostic tools.",
        nextStepHref: "/portal/diagnostics",
        afterNextStep:
          "Once diagnostic tools are complete, RGS prepares your findings and repair map.",
      };
    case "diagnostic_delivered":
    case "decision_pending":
      return {
        stageKey: stage,
        stageDisplay: display,
        rgsIsDoing: "RGS has prepared your diagnostic findings for review.",
        nextStep: "Review your diagnostic report and repair map.",
        nextStepHref: "/portal/reports",
        afterNextStep:
          "After you review, RGS will discuss the next decision with you — no implementation work has begun.",
      };
    case "diagnostic_complete":
    case "follow_up_nurture":
      return {
        stageKey: stage,
        stageDisplay: display,
        rgsIsDoing: "RGS is keeping your diagnostic findings on file.",
        nextStep: "Review the repair map when you are ready for the next step.",
        nextStepHref: "/portal/reports",
        notRequiredYet:
          "Nothing is required from you right now. Your diagnostic findings remain available when you are ready.",
      };
    case "implementation_added":
    case "implementation_onboarding":
      return {
        stageKey: stage,
        stageDisplay: display,
        rgsIsDoing: "RGS is organizing your implementation roadmap.",
        nextStep: "Open your implementation roadmap to see the next step.",
        nextStepHref: "/portal/tools/implementation-roadmap",
        afterNextStep:
          "Once the roadmap is reviewed together, the first repair steps are installed.",
      };
    case "tools_assigned":
    case "client_training_setup":
      return {
        stageKey: stage,
        stageDisplay: display,
        rgsIsDoing: "RGS is preparing the assigned tools and training materials.",
        nextStep: "Open your assigned tools.",
        nextStepHref: "/portal/tools",
        afterNextStep:
          "As you use the tools, RGS reviews activity and adjusts your next steps.",
      };
    case "implementation_active":
    case "implementation":
    case "work_in_progress":
      return {
        stageKey: stage,
        stageDisplay: display,
        rgsIsDoing: "RGS is supporting installation of the repair plan.",
        nextStep: "Review your priority tasks.",
        nextStepHref: "/portal/priority-tasks",
      };
    case "waiting_on_client":
      return {
        stageKey: stage,
        stageDisplay: display,
        rgsIsDoing: "RGS is waiting on your input to continue.",
        nextStep: fallbackNext,
      };
    case "review_revision_window":
      return {
        stageKey: stage,
        stageDisplay: display,
        rgsIsDoing: "RGS is in the review and revision window.",
        nextStep: "Open the Monthly System Review.",
        nextStepHref: "/portal/tools/monthly-system-review",
      };
    case "implementation_complete":
    case "work_completed":
    case "closed":
      return {
        stageKey: stage,
        stageDisplay: display,
        rgsIsDoing:
          "RGS is keeping the visibility layer current through the RGS Control System.",
        nextStep: "Review your dashboard and priority actions.",
        nextStepHref: "/portal",
      };
    default:
      return {
        stageKey: stage,
        stageDisplay: display,
        rgsIsDoing: isImplementationStage(stage)
          ? "RGS is supporting your implementation work."
          : "RGS is preparing the next part of your engagement.",
        nextStep: fallbackNext,
      };
  }
}

// The canonical product sentence preserved across the OS.
export const RGS_CANONICAL_PRODUCT_SENTENCE =
  "The Diagnostic finds the slipping gears. Implementation installs the repair plan. The RGS Control System\u2122 keeps the owner connected to the system without turning RGS into an operator inside the business.";