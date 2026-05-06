/**
 * P87 — Diagnostic Timeline (deterministic 10-day cadence).
 *
 * Tied to Evidence Vault work. Reuses the canonical timeline shape from
 * src/lib/welcomeGreeting/index.ts (DIAGNOSTIC_TIMELINE_STEPS) and adds
 * per-customer stage statuses, admin-extension semantics, and reminder
 * type mapping. No automated email is claimed unless P86's
 * EVIDENCE_DECAY_EMAIL_AUTOMATION_WIRED is true AND consent is active
 * for that recipient.
 */

import { DIAGNOSTIC_TIMELINE_STEPS } from "@/lib/welcomeGreeting";

export type DiagnosticStageKey =
  | "systems_interview"        // Day 1
  | "evidence_vault_opens"     // Day 2
  | "evidence_reminder"        // Day 4
  | "evidence_window_closes"   // Day 6
  | "rgs_review"               // Day 8
  | "report_walkthrough";      // Day 10

export type DiagnosticStageStatus =
  | "not_scheduled"
  | "scheduled"
  | "sent"
  | "overdue"
  | "completed"
  | "snoozed"
  | "extended";

export const DIAGNOSTIC_STAGE_STATUSES: ReadonlyArray<DiagnosticStageStatus> = [
  "not_scheduled","scheduled","sent","overdue","completed","snoozed","extended",
];

/** Re-export canonical step list so admin tooling can use a single source. */
export const DIAGNOSTIC_STAGES = DIAGNOSTIC_TIMELINE_STEPS;

export const DIAGNOSTIC_STAGE_KEYS: ReadonlyArray<DiagnosticStageKey> = [
  "systems_interview",
  "evidence_vault_opens",
  "evidence_reminder",
  "evidence_window_closes",
  "rgs_review",
  "report_walkthrough",
];

export const DIAGNOSTIC_STAGE_DAY: Record<DiagnosticStageKey, number> = {
  systems_interview: 1,
  evidence_vault_opens: 2,
  evidence_reminder: 4,
  evidence_window_closes: 6,
  rgs_review: 8,
  report_walkthrough: 10,
};

/**
 * Whether a stage is associated with a reminder that *would* be emailed
 * to a client. Only Day 4 (evidence_reminder) and Day 6
 * (evidence_window_closes) are client-notifying stages in this pass.
 */
export const STAGE_HAS_CLIENT_REMINDER: Record<DiagnosticStageKey, boolean> = {
  systems_interview: false,
  evidence_vault_opens: true, // initial checklist invite
  evidence_reminder: true,
  evidence_window_closes: true,
  rgs_review: false,
  report_walkthrough: false,
};

/** Notification type strings used with email_notification_attempts. */
export const STAGE_NOTIFICATION_TYPE: Record<DiagnosticStageKey, string> = {
  systems_interview: "diagnostic_timeline_systems_interview",
  evidence_vault_opens: "diagnostic_timeline_vault_opens",
  evidence_reminder: "diagnostic_timeline_evidence_reminder",
  evidence_window_closes: "diagnostic_timeline_window_closes",
  rgs_review: "diagnostic_timeline_review_started",
  report_walkthrough: "diagnostic_timeline_report_ready",
};

export interface ComputeStageStatusInput {
  scheduledAt: string | null;
  completedAt: string | null;
  snoozedUntil?: string | null;
  extendedUntil?: string | null;
  now?: Date;
}

export function computeStageStatus(input: ComputeStageStatusInput): DiagnosticStageStatus {
  if (input.completedAt) return "completed";
  const now = input.now ?? new Date();
  if (input.extendedUntil) {
    const ext = new Date(input.extendedUntil);
    if (!Number.isNaN(ext.getTime()) && ext.getTime() > now.getTime()) return "extended";
  }
  if (input.snoozedUntil) {
    const sn = new Date(input.snoozedUntil);
    if (!Number.isNaN(sn.getTime()) && sn.getTime() > now.getTime()) return "snoozed";
  }
  if (!input.scheduledAt) return "not_scheduled";
  const sched = new Date(input.scheduledAt);
  if (Number.isNaN(sched.getTime())) return "not_scheduled";
  if (sched.getTime() > now.getTime()) return "scheduled";
  return "overdue";
}

export const DIAGNOSTIC_TIMELINE_CLIENT_DISCLAIMER =
  "Reminders shown here are tracked by your RGS admin team. Automated email is not enabled for this engagement unless your account explicitly opts in.";

export interface ExtendVaultCloseInput {
  newCloseAt: string;            // ISO
  adminReason: string;           // required; admin-only note
}

export interface ExtendVaultCloseResult {
  ok: boolean;
  reason?: string;
}

export function validateExtendVaultClose(input: ExtendVaultCloseInput): ExtendVaultCloseResult {
  if (!input.adminReason || input.adminReason.trim().length < 4) {
    return { ok: false, reason: "admin_reason_required" };
  }
  const t = new Date(input.newCloseAt);
  if (Number.isNaN(t.getTime())) return { ok: false, reason: "invalid_close_at" };
  if (t.getTime() <= Date.now()) return { ok: false, reason: "close_at_must_be_future" };
  return { ok: true };
}
