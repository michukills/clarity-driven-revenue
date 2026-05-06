/**
 * P88 — Deterministic Next Best Action engine for the client portal.
 *
 * Pure logic, no network, no AI. Given a snapshot of the customer's
 * current portal state, returns exactly one next best action with a
 * priority key, label, body, and an internal route.
 *
 * Priority order (highest first):
 *  1. missing_email_consent      — when reminders/notifications are relevant
 *  2. evidence_slot_attention    — partial / rejected / missing while vault open
 *  3. evidence_expiring          — expiring_soon / expired
 *  4. timeline_overdue           — diagnostic timeline stage overdue (client-relevant)
 *  5. clarification_request      — RGS asked the client a question
 *  6. report_ready               — published report not yet acknowledged
 *  7. tool_incomplete            — assigned tool overdue / incomplete
 *  8. wait_for_admin             — admin review in progress
 *  9. none                       — nothing to do right now
 */

export type NextBestActionKey =
  | "missing_email_consent"
  | "evidence_slot_attention"
  | "evidence_expiring"
  | "timeline_overdue"
  | "clarification_request"
  | "report_ready"
  | "tool_incomplete"
  | "wait_for_admin"
  | "none";

export interface NextBestAction {
  key: NextBestActionKey;
  title: string;
  body: string;
  /** Internal route, MUST start with "/" if present. */
  href: string | null;
  /** Honest priority rank (1 = highest). */
  priority: number;
}

export interface EvidenceSlotSnapshot {
  slot_key: string;
  status: string; // EvidenceSlotStatus
}

export interface TimelineStageSnapshot {
  stage_key: string;
  status: string; // DiagnosticStageStatus
  client_relevant?: boolean;
}

export interface ToolSnapshot {
  key: string;
  overdue?: boolean;
  incomplete?: boolean;
}

export interface NextBestActionInput {
  consentActive: boolean;
  /** True if the diagnostic / vault is in an active intake or review window. */
  vaultOpen: boolean;
  evidenceSlots?: EvidenceSlotSnapshot[];
  timelineStages?: TimelineStageSnapshot[];
  /** Number of unread/unanswered admin → client clarification requests. */
  clarificationRequests?: number;
  /** True iff a published report exists that the client has not yet opened. */
  reportReady?: boolean;
  tools?: ToolSnapshot[];
  /** True iff admin review is the current active phase. */
  awaitingAdminReview?: boolean;
}

const ATTENTION_STATUSES = new Set(["missing", "partial", "rejected"]);
const EXPIRING_STATUSES = new Set(["expiring_soon", "expired"]);

/**
 * Deterministic engine. Returns exactly one action.
 */
export function pickNextBestAction(input: NextBestActionInput): NextBestAction {
  // 1 — Email consent gate. Only matters when reminders/notifications are
  // operationally relevant: vault open, timeline active, or a report exists.
  const remindersRelevant =
    input.vaultOpen ||
    (input.timelineStages?.length ?? 0) > 0 ||
    !!input.reportReady;
  if (remindersRelevant && !input.consentActive) {
    return {
      key: "missing_email_consent",
      title: "Grant email consent for operational reminders",
      body: "RGS only sends operational notices when you have opted in. Granting consent unlocks evidence-expiration reminders, report-ready notices, and timeline check-ins. You can revoke any time.",
      href: "/portal/account",
      priority: 1,
    };
  }

  // 2 — Evidence vault attention items, but only while the vault is open.
  if (input.vaultOpen) {
    const attention = (input.evidenceSlots ?? []).filter((s) =>
      ATTENTION_STATUSES.has(s.status),
    );
    if (attention.length > 0) {
      return {
        key: "evidence_slot_attention",
        title:
          attention.length === 1
            ? "Upload one missing Evidence Vault item"
            : `Upload ${attention.length} missing Evidence Vault items`,
        body: "Your Evidence Vault has slots that need attention. Uploads are reviewed by an RGS admin before they count as verified.",
        href: "/portal/uploads",
        priority: 2,
      };
    }
  }

  // 3 — Expiring/expired evidence (always relevant after vault closes).
  const expiring = (input.evidenceSlots ?? []).filter((s) =>
    EXPIRING_STATUSES.has(s.status),
  );
  if (expiring.length > 0) {
    return {
      key: "evidence_expiring",
      title:
        expiring.length === 1
          ? "Refresh one expiring evidence item"
          : `Refresh ${expiring.length} expiring evidence items`,
      body: "Some of your verified evidence is approaching or past its operational freshness window. Refreshing keeps your Repair Map grounded in current reality.",
      href: "/portal/uploads",
      priority: 3,
    };
  }

  // 4 — Diagnostic timeline overdue (client-relevant stages only).
  const overdueStage = (input.timelineStages ?? []).find(
    (s) => s.status === "overdue" && s.client_relevant !== false,
  );
  if (overdueStage) {
    return {
      key: "timeline_overdue",
      title: "Your diagnostic timeline has an overdue step",
      body: "A timeline step is past its target date. Your RGS team is tracking it — open the timeline to see what is needed from you.",
      href: "/portal",
      priority: 4,
    };
  }

  // 5 — Clarification request from RGS admin.
  if ((input.clarificationRequests ?? 0) > 0) {
    return {
      key: "clarification_request",
      title: "Review a clarification request from your RGS team",
      body: "Your RGS team asked for more information. Answering it keeps your diagnostic accurate.",
      href: "/portal",
      priority: 5,
    };
  }

  // 6 — Report ready.
  if (input.reportReady) {
    return {
      key: "report_ready",
      title: "Open your latest RGS report",
      body: "A published report is ready for you to review. It includes your Repair Map and recommended next steps.",
      href: "/portal/reports",
      priority: 6,
    };
  }

  // 7 — Assigned tool incomplete/overdue.
  const tool = (input.tools ?? []).find((t) => t.overdue || t.incomplete);
  if (tool) {
    return {
      key: "tool_incomplete",
      title: "Continue an assigned tool",
      body: "An RGS tool assigned to you is still open. Completing it keeps your operating picture current.",
      href: "/portal",
      priority: 7,
    };
  }

  // 8 — Awaiting admin review.
  if (input.awaitingAdminReview) {
    return {
      key: "wait_for_admin",
      title: "Wait for RGS admin review",
      body: "Your evidence is in the RGS review queue. We will reach out when the next step is ready.",
      href: null,
      priority: 8,
    };
  }

  return {
    key: "none",
    title: "No action needed right now",
    body: "You are caught up. RGS will surface the next step here when it appears.",
    href: null,
    priority: 9,
  };
}

/** Stable display label for a NextBestActionKey (for tests + analytics). */
export const NEXT_BEST_ACTION_LABEL: Record<NextBestActionKey, string> = {
  missing_email_consent: "Email consent required",
  evidence_slot_attention: "Evidence Vault attention",
  evidence_expiring: "Evidence refresh",
  timeline_overdue: "Timeline overdue",
  clarification_request: "Clarification request",
  report_ready: "Report ready",
  tool_incomplete: "Tool incomplete",
  wait_for_admin: "Awaiting admin review",
  none: "No action needed",
};