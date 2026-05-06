/**
 * P85.5 — Cannabis Documentation Velocity™
 *
 * Operational documentation-readiness signal for cannabis / MMJ /
 * dispensary / regulated cannabis retail businesses. RGS measures how
 * recently the owner has manually verified seed-to-sale / inventory
 * records against physical reality.
 *
 * This is **not** a legal compliance determination, regulatory finding,
 * license-safety guarantee, or enforcement protection. RGS does not
 * provide cannabis compliance certification. METRC / BioTrack are
 * referenced only as manual export / upload sources unless a real live
 * connector is wired.
 */

export const CANNABIS_DOC_VELOCITY_THRESHOLD_DAYS = 7;

/** Industry keys (priority engine + admin slugs) treated as cannabis. */
export const CANNABIS_INDUSTRY_KEYS: ReadonlyArray<string> = [
  "mmj_cannabis",
  "cannabis_mmj_mmc",
  "cannabis",
  "dispensary",
  "regulated_cannabis_retail",
];

export type CannabisDocVelocityStatus =
  | "current"
  | "high_risk"
  | "needs_review"
  | "invalid_date"
  | "not_applicable";

export type CannabisEvidenceSourceType =
  | "metrc_manual_export"
  | "biotrack_manual_export"
  | "pos_inventory_report"
  | "manual_inventory_count_sheet"
  | "vault_count_sheet"
  | "discrepancy_log"
  | "dated_inventory_reconciliation"
  | "dated_audit_checklist"
  | "signed_manager_review"
  | "seed_to_sale_screenshot_or_export"
  | "other_manual_upload";

export interface CannabisEvidenceExample {
  source_type: CannabisEvidenceSourceType;
  label: string;
  /**
   * Connector-truth: is this currently wired as a live, automatic feed?
   * Always false in P85.5 — every accepted source is treated as a
   * manual export / upload.
   */
  live_connector: false;
}

export const CANNABIS_ALLOWED_EVIDENCE_EXAMPLES: ReadonlyArray<CannabisEvidenceExample> = [
  { source_type: "metrc_manual_export", label: "METRC export (manual upload)", live_connector: false },
  { source_type: "biotrack_manual_export", label: "BioTrack export (manual upload)", live_connector: false },
  { source_type: "pos_inventory_report", label: "POS inventory report", live_connector: false },
  { source_type: "manual_inventory_count_sheet", label: "Manual inventory count sheet", live_connector: false },
  { source_type: "vault_count_sheet", label: "Vault count sheet", live_connector: false },
  { source_type: "discrepancy_log", label: "Discrepancy log", live_connector: false },
  { source_type: "dated_inventory_reconciliation", label: "Dated inventory reconciliation", live_connector: false },
  { source_type: "dated_audit_checklist", label: "Dated audit checklist", live_connector: false },
  { source_type: "signed_manager_review", label: "Signed manager review", live_connector: false },
  { source_type: "seed_to_sale_screenshot_or_export", label: "Seed-to-sale screenshot / export", live_connector: false },
];

/**
 * Forbidden client-facing claims. Cannabis Documentation Velocity™ never
 * speaks in legal, regulatory, certification, or enforcement language.
 * Matched case-insensitively as substrings.
 */
export const CANNABIS_DOC_VELOCITY_FORBIDDEN_CLAIMS: ReadonlyArray<string> = [
  "non-compliant",
  "noncompliant",
  "compliant",
  "compliance certified",
  "compliance certification",
  "legal compliance",
  "legal violation",
  "regulatory failure",
  "regulatory assurance",
  "enforcement-proof",
  "enforcement proof",
  "audit ready",
  "audit-ready",
  "safe from penalties",
  "license protection",
  "regulator approval",
  "guaranteed",
];

export const CANNABIS_DOC_VELOCITY_CLIENT_SAFE_EXPLANATION =
  "Cannabis Documentation Velocity™ is an operational documentation-readiness signal, not a legal compliance determination. " +
  "RGS does not certify cannabis compliance, regulatory status, license safety, or enforcement protection.";

export const CANNABIS_DOC_VELOCITY_REPORT_SAFE_LANGUAGE =
  "Cannabis Documentation Velocity™ measures how recently the business manually verified seed-to-sale / inventory records " +
  "against physical reality. It is an operational documentation-readiness signal. It does not determine legal compliance, " +
  "regulatory status, license safety, enforcement risk, or cannabis compliance certification.";

export const CANNABIS_DOC_VELOCITY_ADMIN_INTERPRETATION =
  "Use to confirm whether the owner has a fresh, dated manual audit of seed-to-sale / inventory. " +
  "If older than 7 days or missing, treat as a high-priority operational documentation-readiness alert and request evidence.";

export const CANNABIS_DOC_VELOCITY_CONFIG = {
  metric_key: "cannabis_documentation_velocity",
  label: "Cannabis Documentation Velocity™",
  gear_key: "operational_efficiency" as const,
  industry_keys: CANNABIS_INDUSTRY_KEYS,
  threshold_days: CANNABIS_DOC_VELOCITY_THRESHOLD_DAYS,
  current_status: "current" as const,
  stale_status: "high_risk" as const,
  missing_status: "needs_review" as const,
  invalid_status: "invalid_date" as const,
  not_applicable_status: "not_applicable" as const,
  deterministic_trigger_description:
    "If the last manual seed-to-sale / inventory audit is more than 7 calendar days old, RGS triggers a High Risk Cannabis " +
    "Documentation Velocity™ alert and marks the Operational Efficiency gear as Needs Re-Inspection. Missing or future-dated " +
    "audits return Needs Review and request evidence from the owner.",
  client_safe_explanation: CANNABIS_DOC_VELOCITY_CLIENT_SAFE_EXPLANATION,
  admin_interpretation: CANNABIS_DOC_VELOCITY_ADMIN_INTERPRETATION,
  evidence_needed:
    "A dated, manual seed-to-sale / inventory verification (e.g. METRC or BioTrack manual export, POS inventory report, " +
    "manual count sheet, dated reconciliation, or signed manager review).",
  allowed_evidence_examples: CANNABIS_ALLOWED_EVIDENCE_EXAMPLES,
  forbidden_claims: CANNABIS_DOC_VELOCITY_FORBIDDEN_CLAIMS,
  report_safe_language: CANNABIS_DOC_VELOCITY_REPORT_SAFE_LANGUAGE,
} as const;

export function isCannabisIndustryKey(key: string | null | undefined): boolean {
  if (!key) return false;
  const k = String(key).toLowerCase().trim();
  return CANNABIS_INDUSTRY_KEYS.some((x) => x.toLowerCase() === k);
}

export function findCannabisDocVelocityForbiddenPhrase(
  text: string | null | undefined,
): string | null {
  if (!text) return null;
  const lc = text.toLowerCase();
  for (const phrase of CANNABIS_DOC_VELOCITY_FORBIDDEN_CLAIMS) {
    if (lc.includes(phrase.toLowerCase())) return phrase;
  }
  return null;
}
