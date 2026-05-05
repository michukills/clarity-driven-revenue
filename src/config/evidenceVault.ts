/**
 * P67.EvidenceVault.1 — RGS Evidence Vault™ scope-safe registry.
 *
 * Single source of truth for Evidence Vault™ / Compliance Evidence Vault™
 * metadata vocabularies, sufficiency/review statuses, regulated-industry
 * tags, and the "Operational Readiness, Not Regulatory Assurance"
 * (ORNRA) disclaimer language.
 *
 * This file ONLY exports static config. It does NOT:
 *   - duplicate the existing `customer_uploads` table or
 *     `client-uploads` storage bucket
 *   - touch deterministic scoring (`src/lib/scoring/*`,
 *     `src/lib/scorecard/*`)
 *   - perform AI calls, fetches, or Supabase access
 *   - expose admin-only language to clients
 *
 * Storage/RLS hardening of `customer_uploads` is already in place
 * (admin manage / customer view+insert own). P67 keeps that intact and
 * layers UX + scope-safe vocabulary on top.
 */
import { RGS_NAMES } from "./rgsNaming";

/** Suggested evidence_use_context values (P67 §3). */
export const EVIDENCE_USE_CONTEXTS = [
  "diagnostic",
  "scorecard",
  "structural_health_report",
  "repair_map",
  "compliance_visibility",
  "financial_visibility",
  "implementation",
  "monthly_review",
  "system_ledger",
  "control_system",
] as const;
export type EvidenceUseContext = (typeof EVIDENCE_USE_CONTEXTS)[number];

/** Sufficiency statuses (P67 §3). */
export const EVIDENCE_SUFFICIENCY_STATUSES = [
  "not_provided",
  "provided",
  "needs_review",
  "accepted",
  "insufficient",
  "client_clarification_needed",
  "redaction_needed",
  "professional_review_recommended",
] as const;
export type EvidenceSufficiencyStatus =
  (typeof EVIDENCE_SUFFICIENCY_STATUSES)[number];

/** Client-safe display labels for sufficiency statuses. */
export const EVIDENCE_SUFFICIENCY_CLIENT_LABEL: Record<
  EvidenceSufficiencyStatus,
  string
> = {
  not_provided: "Not provided",
  provided: "Uploaded — under RGS review",
  needs_review: "Under RGS review",
  accepted: "Accepted",
  insufficient: "More detail needed",
  client_clarification_needed: "Clarification requested by RGS",
  redaction_needed: "Redaction required before re-upload",
  professional_review_recommended:
    "Recommend review by your qualified professional",
};

/**
 * Admin-only regulated-industry tags (P67 §10).
 * MUST NEVER render in client-facing surfaces.
 */
export const ADMIN_ONLY_REGULATED_TAGS = [
  "regulatory_audit_ready",
  "needs_professional_review",
  "not_sufficient_for_compliance_review",
  "operationally_useful_not_compliance_certified",
  "redaction_needed_admin",
  "possible_sensitive_data",
  "third_party_professional_review_recommended",
] as const;
export type AdminOnlyRegulatedTag = (typeof ADMIN_ONLY_REGULATED_TAGS)[number];

/**
 * Phrases that MUST NEVER appear in any client-facing Evidence Vault
 * surface, report, or self-certification UI (P67 §13/§16).
 */
export const CLIENT_FORBIDDEN_EVIDENCE_PHRASES = [
  "compliance certified",
  "legally compliant",
  "GAAP audited",
  "fiduciary approved",
  "safe harbor guaranteed",
  "audit guaranteed",
  "regulatory approved",
  "lender ready",
  "valuation ready",
] as const;

/**
 * "Operational Readiness, Not Regulatory Assurance" — the canonical
 * client-facing principle for regulated / high-heat Evidence Vault
 * workflows (cannabis/MMJ, finance, healthcare-PHI, licensing, lending,
 * tax, fiduciary, valuation).
 *
 * Supersedes the prior "Mirror, Not the Map" framing for any surface
 * that may reach a client. Internal back-references should use this
 * constant going forward.
 */
export const OPERATIONAL_READINESS_PRINCIPLE =
  `${RGS_NAMES.parentShort} helps assess and organize operational ` +
  "readiness, documentation quality, evidence gaps, system maturity, " +
  "and business stability. RGS does not provide legal, tax, accounting, " +
  "fiduciary, valuation, healthcare privacy, cannabis compliance, or " +
  "regulatory assurance. RGS findings are business-operations " +
  "observations and should be reviewed by qualified professionals " +
  "before being used for regulated, legal, financial, tax, compliance, " +
  "lending, investment, valuation, or third-party reliance decisions.";

/**
 * Vault-as-temporary-repository disclaimer (P67 §9 cannabis/MMJ chain
 * of custody nuance — applies to any regulated-industry use).
 */
export const VAULT_NOT_OFFICIAL_RECORD_DISCLAIMER =
  `The ${RGS_NAMES.evidenceVault} is a temporary repository for RGS audit, ` +
  "diagnostic, review, and operational visibility purposes. RGS is not the " +
  "client's official compliance record keeper, state-law record custodian, " +
  "seed-to-sale record authority, legal compliance officer, or regulatory " +
  "reporting system. The client remains responsible for maintaining all " +
  "legally required records in the systems and formats required by their " +
  "applicable regulators.";

/** Data-portability reminder (P67 §9). */
export const VAULT_DATA_PORTABILITY_NOTE =
  "Maintain independent copies of all required business, tax, licensing, " +
  "compliance, inventory, employee, financial, and regulatory records " +
  `outside the ${RGS_NAMES.evidenceVault}. RGS may support organization ` +
  "and review, but it does not replace your official recordkeeping " +
  "obligations.";

/** Financial / non-fiduciary disclaimer (P67 §9). */
export const VAULT_NON_FIDUCIARY_DISCLAIMER =
  "RGS does not perform audits under GAAP, does not prepare certified " +
  "financial statements, does not provide investment advice, does not act " +
  "as a fiduciary, and does not provide lending, tax, accounting, " +
  `securities, or valuation opinions. The ${RGS_NAMES.systemLedger} is an ` +
  "operational visibility tool, not a financial statement for lending, " +
  "investment, tax, or third-party reliance purposes.";

/**
 * Mandatory PII/PHI redaction warning shown above every client upload
 * surface (P67 §9). Client cannot self-certify regulated readiness.
 */
export const VAULT_REDACTION_WARNING =
  "Do not upload unredacted PII, PHI, SSNs, full customer lists, patient " +
  "records, private health data, tax IDs, bank account numbers, payment " +
  "card numbers, employee sensitive records, or legally restricted data. " +
  "Redact names, SSNs, account numbers, private health information, and " +
  "other sensitive identifiers before submission.";

/** Owner confirmation copy required before upload completes (P67 §9). */
export const VAULT_REDACTION_CONFIRMATION_LABEL =
  "I confirm that I have reviewed this document and redacted sensitive " +
  "PII, PHI, SSNs, account numbers, private health data, and other " +
  "sensitive identifiers unless RGS has specifically requested otherwise " +
  "in writing.";

/**
 * Cannabis / MMJ note — dispensary/cannabis-retail operations only.
 * Must NOT drift into general healthcare / HIPAA / patient-care logic.
 */
export const VAULT_CANNABIS_MMJ_NOTE =
  `In RGS, "MMJ/MMC/cannabis" refers to dispensary and cannabis-retail ` +
  "operations. The Compliance Evidence Vault organizes operational and " +
  "documentation readiness signals — it is not legal, regulatory, " +
  "compliance, tax, or healthcare-privacy advice.";

export const EVIDENCE_VAULT_NAME = RGS_NAMES.evidenceVault;
export const COMPLIANCE_EVIDENCE_VAULT_NAME = RGS_NAMES.complianceEvidenceVault;