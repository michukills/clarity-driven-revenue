/**
 * P70 — Reality Check Flags™ canonical config.
 *
 * Source of truth for flag types, severities, statuses, gear taxonomy,
 * client-safe wording rules, and the deterministic rule registry.
 *
 * Reality Check Flags™ are operational heuristics, NOT legal,
 * compliance, fiduciary, accounting, or valuation determinations.
 * Per P69B Architect's Shield™: "Operational Readiness, Not
 * Regulatory Assurance."
 */

import { RGS_NAMES } from "@/config/rgsNaming";

export const REALITY_CHECK_FLAGS_NAME = RGS_NAMES.realityCheckFlags;

export const REALITY_CHECK_FLAG_TYPES = [
  "owner_claim_unsupported",
  "owner_claim_contradicted",
  "evidence_missing",
  "evidence_stale",
  "metric_contradiction",
  "score_contradiction",
  "regulated_claim_unsupported",
  "financial_visibility_gap",
  "owner_independence_gap",
  "source_of_truth_missing",
  "report_claim_needs_support",
] as const;
export type RealityCheckFlagType = (typeof REALITY_CHECK_FLAG_TYPES)[number];

export const REALITY_CHECK_FLAG_SEVERITIES = [
  "watch",
  "warning",
  "critical",
] as const;
export type RealityCheckFlagSeverity =
  (typeof REALITY_CHECK_FLAG_SEVERITIES)[number];

export const REALITY_CHECK_FLAG_STATUSES = [
  "detected",
  "admin_review",
  "client_visible",
  "dismissed",
  "resolved",
] as const;
export type RealityCheckFlagStatus =
  (typeof REALITY_CHECK_FLAG_STATUSES)[number];

export const REALITY_CHECK_FLAG_GEARS = [
  "demand_generation",
  "revenue_conversion",
  "operational_efficiency",
  "financial_visibility",
  "owner_independence",
  "regulated",
] as const;
export type RealityCheckFlagGear = (typeof REALITY_CHECK_FLAG_GEARS)[number];

/**
 * Phrases that must NEVER appear inside a client-visible Reality
 * Check Flag explanation.
 */
export const REALITY_CHECK_FLAG_FORBIDDEN_CLIENT_PHRASES = [
  "compliance certified",
  "legally compliant",
  "gaap audited",
  "fiduciary approved",
  "safe harbor guaranteed",
  "audit guaranteed",
  "regulatory approved",
  "lender ready",
  "valuation ready",
  "guaranteed compliance",
  "guaranteed revenue",
  "legal determination",
  "compliance determination",
  "certified valuation",
  "guaranteed business value",
  "illegal",
  "fraud",
  "confirmed non-compliance",
  "official compliance finding",
  "non-compliant",
] as const;

/** Returns the offending phrase, or null. Case-insensitive. */
export function findRealityCheckForbiddenPhrase(text: string): string | null {
  if (!text) return null;
  const lower = text.toLowerCase();
  for (const p of REALITY_CHECK_FLAG_FORBIDDEN_CLIENT_PHRASES) {
    if (lower.includes(p)) return p;
  }
  return null;
}

/**
 * Deterministic rule registry. Each rule expresses a real
 * inconsistency check across the five RGS gears + regulated row.
 *
 * These are descriptors used by the admin detection workflow to
 * surface candidate flags. They are NOT autopublished: every flag
 * still requires admin review and approval before a client sees it.
 */
export interface RealityCheckRule {
  id: string;
  gear: RealityCheckFlagGear;
  flagType: RealityCheckFlagType;
  severity: RealityCheckFlagSeverity;
  ownerClaimSummary: string;
  evidenceGapSummary: string;
  clientSafeExplanation: string;
  professionalReviewRecommended?: boolean;
  regulatedIndustrySensitive?: boolean;
}

export const REALITY_CHECK_RULE_REGISTRY: readonly RealityCheckRule[] = [
  // Demand Generation
  {
    id: "dg.lead_flow_decline",
    gear: "demand_generation",
    flagType: "metric_contradiction",
    severity: "warning",
    ownerClaimSummary: "Owner reports lead flow is stable or strong.",
    evidenceGapSummary: "Lead volume has declined beyond threshold.",
    clientSafeExplanation:
      "The owner statement and available lead-volume metrics do not currently align. RGS cannot verify lead-flow stability from current evidence.",
  },
  {
    id: "dg.channel_concentration",
    gear: "demand_generation",
    flagType: "owner_claim_contradicted",
    severity: "watch",
    ownerClaimSummary: "Owner reports marketing is diversified.",
    evidenceGapSummary: "One channel exceeds the concentration threshold.",
    clientSafeExplanation:
      "Marketing diversification appears unsupported by current evidence — one channel may be carrying a disproportionate share.",
  },
  {
    id: "dg.no_marketing_source",
    gear: "demand_generation",
    flagType: "source_of_truth_missing",
    severity: "warning",
    ownerClaimSummary: "Owner reports marketing is working.",
    evidenceGapSummary:
      "No connected analytics or ads source-of-truth is on file.",
    clientSafeExplanation:
      "RGS cannot verify marketing performance from current evidence. Connecting an analytics or ads source would strengthen this read.",
  },
  // Revenue Conversion
  {
    id: "rc.close_rate_low",
    gear: "revenue_conversion",
    flagType: "metric_contradiction",
    severity: "warning",
    ownerClaimSummary: "Owner reports the sales process is strong.",
    evidenceGapSummary: "Close rate evidence is below threshold or declining.",
    clientSafeExplanation:
      "The owner statement and available conversion metrics point in different directions.",
  },
  {
    id: "rc.followup_delay",
    gear: "revenue_conversion",
    flagType: "owner_claim_contradicted",
    severity: "watch",
    ownerClaimSummary: "Owner reports follow-up is consistent.",
    evidenceGapSummary: "Follow-up delay or sales-cycle drag is increasing.",
    clientSafeExplanation:
      "Follow-up consistency appears unsupported by current evidence.",
  },
  // Operational Efficiency
  {
    id: "oe.rework_rising",
    gear: "operational_efficiency",
    flagType: "metric_contradiction",
    severity: "warning",
    ownerClaimSummary: "Owner reports operations are smooth.",
    evidenceGapSummary: "Rework or error rate is elevated or rising.",
    clientSafeExplanation:
      "Operational smoothness appears unsupported by current evidence — rework signals indicate friction.",
  },
  {
    id: "oe.sop_missing",
    gear: "operational_efficiency",
    flagType: "evidence_missing",
    severity: "watch",
    ownerClaimSummary: "Owner reports processes are documented.",
    evidenceGapSummary: "SOP / documentation evidence is missing.",
    clientSafeExplanation:
      "This is a documentation gap. RGS cannot verify SOP coverage from current evidence.",
  },
  // Financial Visibility
  {
    id: "fv.no_pl_or_ar",
    gear: "financial_visibility",
    flagType: "financial_visibility_gap",
    severity: "warning",
    ownerClaimSummary: "Owner reports financials are clear.",
    evidenceGapSummary:
      "No current P&L, AR aging, margin, or cash-runway evidence on file.",
    clientSafeExplanation:
      "Financial clarity appears unsupported by current evidence. This may require professional review by a qualified accountant.",
    professionalReviewRecommended: true,
  },
  {
    id: "fv.cash_pressure",
    gear: "financial_visibility",
    flagType: "metric_contradiction",
    severity: "critical",
    ownerClaimSummary: "Owner reports cash position is stable.",
    evidenceGapSummary: "AR aging or runway evidence indicates pressure.",
    clientSafeExplanation:
      "The owner statement and available cash-position evidence do not currently align.",
    professionalReviewRecommended: true,
  },
  // Owner Independence
  {
    id: "oi.owner_dependence",
    gear: "owner_independence",
    flagType: "owner_independence_gap",
    severity: "warning",
    ownerClaimSummary: "Owner reports the business can run without them.",
    evidenceGapSummary:
      "Owner-dependency evidence (single-point-of-failure tasks) exists.",
    clientSafeExplanation:
      "Owner independence appears unsupported by current evidence — owner-only tasks remain on file.",
  },
  {
    id: "oi.no_decision_rights",
    gear: "owner_independence",
    flagType: "evidence_missing",
    severity: "watch",
    ownerClaimSummary: "Owner reports the team has decision clarity.",
    evidenceGapSummary: "No decision-rights or training evidence on file.",
    clientSafeExplanation:
      "RGS cannot verify decision-rights clarity from current evidence.",
  },
  // Regulated / high-heat
  {
    id: "reg.no_license_evidence",
    gear: "regulated",
    flagType: "regulated_claim_unsupported",
    severity: "critical",
    ownerClaimSummary: "Owner claims regulatory standing is in good order.",
    evidenceGapSummary:
      "Current license / permit evidence is missing or stale.",
    clientSafeExplanation:
      "RGS cannot verify regulatory standing from current evidence. This may require qualified professional review.",
    professionalReviewRecommended: true,
    regulatedIndustrySensitive: true,
  },
  {
    id: "reg.cannabis_inventory_logs",
    gear: "regulated",
    flagType: "evidence_stale",
    severity: "critical",
    ownerClaimSummary:
      "Owner reports inventory and seed-to-sale controls are stable.",
    evidenceGapSummary:
      "Manifest logs, reconciliation, discrepancy logs, or waste logs are missing or stale.",
    clientSafeExplanation:
      "Inventory-control posture appears unsupported by current evidence. This may require qualified professional review.",
    professionalReviewRecommended: true,
    regulatedIndustrySensitive: true,
  },
] as const;

/** Operational tone reminder used in admin UI tooltips. */
export const REALITY_CHECK_FLAGS_TONE_REMINDER =
  "Reality Check Flags™ surface operational inconsistencies and evidence gaps. " +
  "They are not legal, compliance, accounting, fiduciary, or valuation conclusions.";
