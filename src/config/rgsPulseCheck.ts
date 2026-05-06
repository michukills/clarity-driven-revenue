/**
 * P86 Part 4 — RGS Pulse Check (Friday 15) admin ritual.
 *
 * Recurring weekly admin ritual. No calendar/email automation is wired,
 * so this is admin-tracked only. Every checklist item maps to an
 * existing P85.x / P86.x signal source.
 */

export const RGS_PULSE_CHECK_NAME = "RGS Pulse Check";
export const RGS_PULSE_CHECK_SCHEDULE_DOW = 5; // Friday (0=Sun)
export const RGS_PULSE_CHECK_SCHEDULE_HOUR_24 = 14; // 2:00 PM local
export const RGS_PULSE_CHECK_AUTOMATION_WIRED = false;
export const RGS_PULSE_CHECK_MODE_LABEL =
  RGS_PULSE_CHECK_AUTOMATION_WIRED
    ? "Automated calendar reminder + admin-tracked"
    : "Admin-tracked weekly ritual (no calendar automation)";

export type PulseCheckChecklistKey =
  | "evidence_expiring_7d"
  | "evidence_expired"
  | "owner_interventions"
  | "source_of_truth_conflicts"
  | "forward_stability_flags_reinspection"
  | "cannabis_documentation_velocity_high_risk"
  | "trades_operational_leakage_flags"
  | "slipping_scores_or_verification_gaps"
  | "reminders_due_or_overdue";

export interface PulseCheckChecklistItem {
  key: PulseCheckChecklistKey;
  label: string;
  description: string;
}

export const RGS_PULSE_CHECK_CHECKLIST: ReadonlyArray<PulseCheckChecklistItem> = [
  {
    key: "evidence_expiring_7d",
    label: "Evidence expiring in the next 7 days",
    description: "Review the Evidence Decay queue and reach out to clients whose verifications are about to lapse.",
  },
  {
    key: "evidence_expired",
    label: "Expired evidence",
    description: "Surface and triage any evidence that has already passed its TTL.",
  },
  {
    key: "owner_interventions",
    label: "Owner interventions / overrides",
    description: "Review the Owner Intervention Log for repeated patterns that should escalate Owner Independence risk.",
  },
  {
    key: "source_of_truth_conflicts",
    label: "Unresolved source-of-truth conflicts",
    description: "Resolve outstanding Amber Evidence Conflict™ rows.",
  },
  {
    key: "forward_stability_flags_reinspection",
    label: "Forward Stability Flags™ needing re-inspection",
    description: "Confirm or close flags that were marked needs_reinspection.",
  },
  {
    key: "cannabis_documentation_velocity_high_risk",
    label: "Cannabis Documentation Velocity™ high-risk rows",
    description: "Review any cannabis customers whose documentation velocity has slipped.",
  },
  {
    key: "trades_operational_leakage_flags",
    label: "Trades / Home Services operational leakage flags",
    description: "Review labor leak, first-time fix drag, truck inventory, and dispatch continuity flags.",
  },
  {
    key: "slipping_scores_or_verification_gaps",
    label: "Slipping scores / verification gaps",
    description: "Identify customers whose RGS Stability Score moved down without corresponding verified evidence.",
  },
  {
    key: "reminders_due_or_overdue",
    label: "Reminders due or overdue",
    description: "Clear or snooze rgs_timeline_reminders that are now due.",
  },
];

/**
 * Returns the next Friday-2pm timestamp at or after the given moment,
 * in the caller's local timezone (used purely for admin display).
 */
export function nextPulseCheckAt(now: Date = new Date()): Date {
  const d = new Date(now);
  d.setHours(RGS_PULSE_CHECK_SCHEDULE_HOUR_24, 0, 0, 0);
  const day = d.getDay();
  let delta = (RGS_PULSE_CHECK_SCHEDULE_DOW - day + 7) % 7;
  if (delta === 0 && d.getTime() <= now.getTime()) delta = 7;
  d.setDate(d.getDate() + delta);
  return d;
}