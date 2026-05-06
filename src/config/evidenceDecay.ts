/**
 * P86 — Evidence Decay & Pulse Rules.
 *
 * Deterministic TTL + state machine for verified evidence items. No AI.
 * No live email claims. No legal/tax/accounting/compliance/valuation
 * language. Cannabis seed-to-sale velocity rule (P85.5) is preserved
 * separately and shorter than the generic 30-day default.
 */

export type EvidenceDecayState =
  | "current"
  | "expiring_soon"
  | "expired"
  | "missing"
  | "pending_review"
  | "partial"
  | "rejected"
  | "not_applicable";

export type EvidenceDecayCategory =
  | "financial_snapshot"
  | "lead_log"
  | "crm_export"
  | "sales_pipeline_export"
  | "payroll_export"
  | "field_ops_export"
  | "pos_export"
  | "inventory_reconciliation"
  | "cannabis_seed_to_sale"
  | "sop_or_handbook"
  | "role_clarity_or_decision_rights"
  | "scope_or_engagement_doc"
  | "owner_interview_claim";

export const EVIDENCE_DECAY_TTL_DAYS: Record<EvidenceDecayCategory, number | null> = {
  financial_snapshot: 30,
  lead_log: 30,
  crm_export: 30,
  sales_pipeline_export: 30,
  payroll_export: 30,
  field_ops_export: 30,
  pos_export: 30,
  inventory_reconciliation: 30,
  cannabis_seed_to_sale: 7, // preserves P85.5 velocity rule
  sop_or_handbook: 180,
  role_clarity_or_decision_rights: 180,
  scope_or_engagement_doc: 180,
  owner_interview_claim: null, // no verified TTL without stronger evidence
};

/** Days before expiry that flips state to expiring_soon. */
export const EVIDENCE_EXPIRING_SOON_WINDOW_DAYS = 5;

/**
 * Forbidden phrases for evidence-decay client copy. Same posture as
 * other RGS panels: no legal/tax/audit/compliance language.
 */
export const EVIDENCE_DECAY_FORBIDDEN_CLAIMS: ReadonlyArray<string> = [
  "legal compliance",
  "tax compliance",
  "audit-ready",
  "audit readiness",
  "lender-ready",
  "investor-ready",
  "compliance certification",
  "regulatory assurance",
  "guaranteed",
  "fiduciary",
];

export function findEvidenceDecayForbiddenPhrase(
  text: string | null | undefined,
): string | null {
  if (!text) return null;
  const lc = text.toLowerCase();
  for (const p of EVIDENCE_DECAY_FORBIDDEN_CLAIMS) {
    if (lc.includes(p)) return p;
  }
  return null;
}

/**
 * Email automation truth flag. Flip ONLY when a real email-sending
 * edge function path is wired and being called from the decay job.
 * As of P86 there is no such wiring, so the system creates admin-tracked
 * reminders only and never claims "sent automatically".
 */
export const EVIDENCE_DECAY_EMAIL_AUTOMATION_WIRED = false;

export const EVIDENCE_DECAY_REMINDER_MODE_LABEL =
  EVIDENCE_DECAY_EMAIL_AUTOMATION_WIRED
    ? "Automated email + admin-tracked reminder"
    : "Admin-tracked reminder (not automated email)";

export const EVIDENCE_DECAY_CLIENT_SAFE_EXPLANATION =
  "RGS keeps your evidence current by tracking when each item should be refreshed. Items shown as expiring soon or expired are operational-readiness signals, not legal, tax, accounting, or compliance determinations.";

export interface EvidenceDecayInput {
  verifiedAt: string | null; // ISO date/time
  ttlDays: number | null;
  hasEvidence: boolean;
  reviewState?: "pending_review" | "partial" | "rejected" | "approved" | "not_applicable" | null;
  now?: Date;
}

export interface EvidenceDecayResult {
  state: EvidenceDecayState;
  expires_at: string | null;
  days_until_expiry: number | null;
  reason: string;
}

export function computeEvidenceDecayState(
  input: EvidenceDecayInput,
): EvidenceDecayResult {
  const now = input.now ?? new Date();
  if (input.reviewState === "not_applicable") {
    return { state: "not_applicable", expires_at: null, days_until_expiry: null, reason: "not_applicable" };
  }
  if (input.reviewState === "rejected") {
    return { state: "rejected", expires_at: null, days_until_expiry: null, reason: "rejected" };
  }
  if (!input.hasEvidence) {
    return { state: "missing", expires_at: null, days_until_expiry: null, reason: "missing" };
  }
  if (input.reviewState === "pending_review") {
    return { state: "pending_review", expires_at: null, days_until_expiry: null, reason: "pending_review" };
  }
  if (input.reviewState === "partial") {
    return { state: "partial", expires_at: null, days_until_expiry: null, reason: "partial" };
  }
  if (!input.verifiedAt || input.ttlDays == null) {
    // approved but no TTL (e.g. owner_interview_claim) → current but not durable
    return { state: "current", expires_at: null, days_until_expiry: null, reason: "no_ttl_assigned" };
  }
  const verified = new Date(input.verifiedAt);
  const expires = new Date(verified.getTime() + input.ttlDays * 86400000);
  const msPerDay = 86400000;
  const days = Math.floor((expires.getTime() - now.getTime()) / msPerDay);
  if (days < 0) {
    return { state: "expired", expires_at: expires.toISOString(), days_until_expiry: days, reason: "past_ttl" };
  }
  if (days <= EVIDENCE_EXPIRING_SOON_WINDOW_DAYS) {
    return { state: "expiring_soon", expires_at: expires.toISOString(), days_until_expiry: days, reason: "within_window" };
  }
  return { state: "current", expires_at: expires.toISOString(), days_until_expiry: days, reason: "within_ttl" };
}

export function ttlForCategory(cat: EvidenceDecayCategory): number | null {
  return EVIDENCE_DECAY_TTL_DAYS[cat];
}

/** Safe (non-claim) email body used only IF automation is wired. */
export const EVIDENCE_DECAY_SAFE_EMAIL_BODY =
  "Your Financial Visibility verification expires in 5 days. Please upload the latest P&L to keep this item current in your RGS Stability Score.";