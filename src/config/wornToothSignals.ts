/**
 * P71 — Worn Tooth Signals™ canonical config (Revenue & Risk Monitor™).
 *
 * Worn Tooth Signals™ are early-warning operational signals that one part
 * of the RGS gear system may be slipping. They are NOT guarantees, legal,
 * compliance, fiduciary, valuation, or accounting determinations.
 * Per ORNRA: "Operational Readiness, Not Regulatory Assurance."
 *
 * The registry below is the source of truth for deterministic detection.
 * AI may help draft client-safe language but MUST NOT decide whether a
 * signal exists, override severity, or auto-publish to clients.
 */

import { RGS_NAMES } from "@/config/rgsNaming";

export const WORN_TOOTH_SIGNALS_NAME = "Worn Tooth Signals™";
export const REVENUE_RISK_MONITOR_NAME = RGS_NAMES.revenueRiskMonitor ?? "Revenue & Risk Monitor™";

export const WORN_TOOTH_SIGNAL_GEARS = [
  "demand_generation",
  "revenue_conversion",
  "operational_efficiency",
  "financial_visibility",
  "owner_independence",
  "regulated",
] as const;
export type WornToothSignalGear = (typeof WORN_TOOTH_SIGNAL_GEARS)[number];

export const WORN_TOOTH_SIGNAL_SEVERITIES = [
  "low",
  "medium",
  "high",
  "critical",
] as const;
export type WornToothSignalSeverity =
  (typeof WORN_TOOTH_SIGNAL_SEVERITIES)[number];

export const WORN_TOOTH_SIGNAL_STATUSES = [
  "detected",
  "admin_review",
  "approved",
  "client_visible",
  "dismissed",
  "resolved",
] as const;
export type WornToothSignalStatus =
  (typeof WORN_TOOTH_SIGNAL_STATUSES)[number];

export const WORN_TOOTH_SIGNAL_TRENDS = [
  "improving",
  "stable",
  "worsening",
  "unknown",
] as const;
export type WornToothSignalTrend =
  (typeof WORN_TOOTH_SIGNAL_TRENDS)[number];

/**
 * Phrases that must NEVER appear inside a client-facing Worn Tooth
 * Signal explanation/summary/recommended action.
 */
export const WORN_TOOTH_SIGNAL_FORBIDDEN_CLIENT_PHRASES = [
  "legally compliant",
  "non-compliant",
  "compliance certified",
  "audit-ready",
  "audit ready",
  "fiduciary",
  "valuation opinion",
  "appraisal",
  "investment-ready",
  "investment ready",
  "lender-ready",
  "lender ready",
  "guaranteed revenue",
  "guaranteed roi",
  "guaranteed results",
  "safe harbor",
  "enforcement-proof",
  "enforcement proof",
  "cpa verified",
  "legal determination",
  "tax advice",
  "medical advice",
  "hipaa compliant",
  "regulatory assurance",
  "guaranteed compliance",
  "compliance determination",
  "certified valuation",
] as const;

/** Returns the offending phrase, or null. Case-insensitive. */
export function findWornToothSignalForbiddenPhrase(
  text: string | null | undefined,
): string | null {
  if (!text) return null;
  const lower = text.toLowerCase();
  for (const p of WORN_TOOTH_SIGNAL_FORBIDDEN_CLIENT_PHRASES) {
    if (lower.includes(p)) return p;
  }
  return null;
}

/**
 * Deterministic Worn Tooth Signal rule registry.
 * Each rule is a candidate detection that admin must still review and
 * approve before any client visibility. AI never auto-decides these.
 */
export interface WornToothSignalRule {
  key: string;
  gear: WornToothSignalGear;
  signalCategory: string;
  signalTitle: string;
  defaultSeverity: WornToothSignalSeverity;
  ownerClaimContext: string;
  triggerSummary: string;
  clientSafeSummary: string;
  clientSafeExplanation: string;
  recommendedOwnerAction: string;
  professionalReviewRecommended?: boolean;
  regulatedIndustrySensitive?: boolean;
}

export const WORN_TOOTH_SIGNAL_REGISTRY: readonly WornToothSignalRule[] = [
  // ── Demand Generation ────────────────────────────────────────────
  {
    key: "dg.lead_volume_declining",
    gear: "demand_generation",
    signalCategory: "lead_flow",
    signalTitle: "Lead volume trending down",
    defaultSeverity: "medium",
    ownerClaimContext: "Owner reports lead flow is steady or growing.",
    triggerSummary: "Lead volume across the last 2–3 periods is declining.",
    clientSafeSummary:
      "Recent lead volume looks softer than prior periods.",
    clientSafeExplanation:
      "Early warning: one part of the demand-generation gear may be slipping. This is an operational observation, not a guarantee about future results.",
    recommendedOwnerAction:
      "Review the top 1–2 lead sources for the last 60 days and confirm whether the dip is seasonal or structural.",
  },
  {
    key: "dg.channel_concentration",
    gear: "demand_generation",
    signalCategory: "channel_risk",
    signalTitle: "Channel concentration risk",
    defaultSeverity: "medium",
    ownerClaimContext: "Owner reports demand is diversified.",
    triggerSummary: "One channel exceeds the diversification threshold.",
    clientSafeSummary:
      "Most demand currently appears to come from a single channel.",
    clientSafeExplanation:
      "If that channel weakens, the rest of the demand system may have to carry pressure it was not designed to carry.",
    recommendedOwnerAction:
      "Identify a credible secondary channel to begin testing in the next 30 days.",
  },
  {
    key: "dg.no_demand_source_of_truth",
    gear: "demand_generation",
    signalCategory: "data_visibility",
    signalTitle: "No demand source of truth on file",
    defaultSeverity: "low",
    ownerClaimContext: "Owner reports marketing is working.",
    triggerSummary: "No connected analytics or ads source of truth.",
    clientSafeSummary:
      "There is no shared source of truth for demand performance yet.",
    clientSafeExplanation:
      "Without a shared source of truth, the demand gear can drift before anyone can see it.",
    recommendedOwnerAction:
      "Decide a single source of truth for demand (ads platform, analytics, or CRM) and protect it.",
  },
  // ── Revenue Conversion ──────────────────────────────────────────
  {
    key: "rc.close_rate_declining",
    gear: "revenue_conversion",
    signalCategory: "close_rate",
    signalTitle: "Close rate trending down",
    defaultSeverity: "high",
    ownerClaimContext: "Owner reports the sales process is strong.",
    triggerSummary: "Close rate is below threshold or declining over periods.",
    clientSafeSummary:
      "The percentage of opportunities that turn into revenue looks softer.",
    clientSafeExplanation:
      "Pipeline activity can hide a closing problem. Catching this early protects the revenue gear.",
    recommendedOwnerAction:
      "Review the last 10 lost opportunities and confirm the real reason they did not close.",
  },
  {
    key: "rc.followup_delay",
    gear: "revenue_conversion",
    signalCategory: "followup",
    signalTitle: "Follow-up delay or missing follow-up",
    defaultSeverity: "medium",
    ownerClaimContext: "Owner reports follow-up is consistent.",
    triggerSummary: "Average time-to-first-followup is increasing.",
    clientSafeSummary:
      "Some opportunities appear to wait too long before a follow-up.",
    clientSafeExplanation:
      "Follow-up timing is one of the cheapest revenue-conversion gears to protect.",
    recommendedOwnerAction:
      "Confirm who is responsible for first follow-up within 24 hours of inquiry.",
  },
  {
    key: "rc.estimate_close_gap",
    gear: "revenue_conversion",
    signalCategory: "estimates",
    signalTitle: "Estimate-to-close ratio weakening",
    defaultSeverity: "medium",
    ownerClaimContext: "Owner reports estimates convert well.",
    triggerSummary: "Estimate-to-close ratio is below threshold.",
    clientSafeSummary:
      "Fewer estimates appear to be converting into signed work.",
    clientSafeExplanation:
      "Estimate leakage typically means scope, price, or follow-through needs review.",
    recommendedOwnerAction:
      "Audit the last 10 estimates and tag each as price, scope, or timing loss.",
  },
  // ── Operational Efficiency ──────────────────────────────────────
  {
    key: "oe.rework_rising",
    gear: "operational_efficiency",
    signalCategory: "rework",
    signalTitle: "Rework or error rate rising",
    defaultSeverity: "medium",
    ownerClaimContext: "Owner reports operations are smooth.",
    triggerSummary: "Rework or error rate is elevated or rising.",
    clientSafeSummary:
      "Recent work appears to require more rework than usual.",
    clientSafeExplanation:
      "Rework is a worn-tooth signal — the operations gear is carrying friction it was not designed to carry.",
    recommendedOwnerAction:
      "Pick the single most common rework cause and assign an owner this week.",
  },
  {
    key: "oe.sop_coverage_missing",
    gear: "operational_efficiency",
    signalCategory: "documentation",
    signalTitle: "SOP coverage missing for a key process",
    defaultSeverity: "low",
    ownerClaimContext: "Owner reports processes are documented.",
    triggerSummary: "No SOP/documentation evidence on file for a key process.",
    clientSafeSummary:
      "A key process appears to lack documented SOP coverage.",
    clientSafeExplanation:
      "Documentation gaps often surface as bottlenecks once volume increases.",
    recommendedOwnerAction:
      "Choose one process (intake, fulfillment, or close-out) and capture a one-page SOP.",
  },
  {
    key: "oe.owner_bottleneck",
    gear: "operational_efficiency",
    signalCategory: "bottleneck",
    signalTitle: "Owner bottleneck increasing",
    defaultSeverity: "high",
    ownerClaimContext: "Owner reports the team can carry the work.",
    triggerSummary: "Owner is required for too many handoffs or approvals.",
    clientSafeSummary:
      "Owner-only handoffs appear to be growing rather than shrinking.",
    clientSafeExplanation:
      "When the owner is the bottleneck, the rest of the operations gear cannot run at full speed.",
    recommendedOwnerAction:
      "List 3 approvals only the owner does today and assign one to a delegated owner.",
  },
  // ── Financial Visibility ────────────────────────────────────────
  {
    key: "fv.cash_runway_shrinking",
    gear: "financial_visibility",
    signalCategory: "cash",
    signalTitle: "Cash runway shrinking",
    defaultSeverity: "critical",
    ownerClaimContext: "Owner reports cash is stable.",
    triggerSummary: "Cash runway evidence is below safe threshold.",
    clientSafeSummary:
      "Available cash runway looks shorter than a healthy buffer.",
    clientSafeExplanation:
      "This is a financial-visibility early warning. Qualified accounting review is recommended for any decision that depends on cash position.",
    recommendedOwnerAction:
      "Confirm current cash, fixed monthly obligations, and payroll coverage before new commitments.",
    professionalReviewRecommended: true,
  },
  {
    key: "fv.ar_aging_increasing",
    gear: "financial_visibility",
    signalCategory: "receivables",
    signalTitle: "AR aging increasing",
    defaultSeverity: "high",
    ownerClaimContext: "Owner reports collections are healthy.",
    triggerSummary: "Overdue AR has grown across recent periods.",
    clientSafeSummary:
      "Overdue receivables appear to be growing.",
    clientSafeExplanation:
      "Receivables drift quietly and quickly become a working-capital issue.",
    recommendedOwnerAction:
      "Pick the 3 oldest overdue invoices and confirm next collection step today.",
    professionalReviewRecommended: true,
  },
  {
    key: "fv.no_breakeven_visibility",
    gear: "financial_visibility",
    signalCategory: "breakeven",
    signalTitle: "Break-even visibility missing",
    defaultSeverity: "medium",
    ownerClaimContext: "Owner reports financials are clear.",
    triggerSummary:
      "No P&L, margin, or break-even evidence on file for the period.",
    clientSafeSummary:
      "There is no current view of monthly break-even on file.",
    clientSafeExplanation:
      "Without a clear break-even read, pricing and capacity decisions can drift. Qualified accounting review is recommended.",
    recommendedOwnerAction:
      "Confirm fixed monthly costs and average gross margin so monthly break-even is known.",
    professionalReviewRecommended: true,
  },
  // ── Owner Independence ──────────────────────────────────────────
  {
    key: "oi.vacation_test_fails",
    gear: "owner_independence",
    signalCategory: "single_point_of_failure",
    signalTitle: "Vacation test would fail",
    defaultSeverity: "high",
    ownerClaimContext: "Owner reports the business can run without them.",
    triggerSummary:
      "Critical functions still require the owner for daily decisions.",
    clientSafeSummary:
      "Several daily functions still appear to require the owner.",
    clientSafeExplanation:
      "If the owner cannot step away for 1–2 weeks without the system slipping, the owner-independence gear is at risk.",
    recommendedOwnerAction:
      "Pick the next 7 days. List every owner-only decision. Delegate one this week.",
  },
  {
    key: "oi.relationships_owner_only",
    gear: "owner_independence",
    signalCategory: "relationships",
    signalTitle: "Key relationships owner-only",
    defaultSeverity: "medium",
    ownerClaimContext:
      "Owner reports the team holds the key client/vendor relationships.",
    triggerSummary:
      "Most strategic relationships are still owner-held.",
    clientSafeSummary:
      "Most key client or vendor relationships still appear to be owner-held.",
    clientSafeExplanation:
      "Relationships held only by the owner are a single-point-of-failure risk for the business system.",
    recommendedOwnerAction:
      "Identify 3 key relationships and introduce a second internal point of contact.",
  },
  // ── Regulated / high-heat ───────────────────────────────────────
  {
    key: "reg.cannabis_inventory_logs_stale",
    gear: "regulated",
    signalCategory: "cannabis_inventory",
    signalTitle: "Cannabis inventory / seed-to-sale logs stale",
    defaultSeverity: "critical",
    ownerClaimContext:
      "Owner reports inventory and seed-to-sale controls are stable.",
    triggerSummary:
      "Manifest, reconciliation, discrepancy, or waste log evidence is missing or stale.",
    clientSafeSummary:
      "Inventory-control evidence appears incomplete or out of date.",
    clientSafeExplanation:
      "This is an operational-readiness early warning. Qualified professional review is recommended before relying on this for any regulated decision.",
    recommendedOwnerAction:
      "Confirm the most recent reconciliation date and assign a refresh cadence.",
    professionalReviewRecommended: true,
    regulatedIndustrySensitive: true,
  },
  {
    key: "reg.license_evidence_missing",
    gear: "regulated",
    signalCategory: "licensing",
    signalTitle: "License or permit evidence missing/stale",
    defaultSeverity: "critical",
    ownerClaimContext: "Owner reports regulatory standing is in good order.",
    triggerSummary:
      "Current license/permit evidence is missing, expired, or unreviewed.",
    clientSafeSummary:
      "Current license or permit evidence does not appear on file.",
    clientSafeExplanation:
      "RGS cannot verify regulatory standing from current evidence. Qualified professional review is recommended.",
    recommendedOwnerAction:
      "Locate current license/permit documents and add them to the Evidence Vault for review.",
    professionalReviewRecommended: true,
    regulatedIndustrySensitive: true,
  },
  {
    key: "reg.pii_phi_redaction_missing",
    gear: "regulated",
    signalCategory: "data_handling",
    signalTitle: "PII/PHI redaction not confirmed on uploads",
    defaultSeverity: "high",
    ownerClaimContext: "Owner reports sensitive data is handled safely.",
    triggerSummary:
      "Uploaded evidence may contain unredacted PII/PHI without confirmation.",
    clientSafeSummary:
      "Some uploads have not yet been confirmed as redacted of sensitive data.",
    clientSafeExplanation:
      "Confirming redaction protects clients and end-users. Qualified professional review may be appropriate.",
    recommendedOwnerAction:
      "Re-review recent uploads and confirm sensitive data is redacted before sharing.",
    professionalReviewRecommended: true,
    regulatedIndustrySensitive: true,
  },
] as const;

export const WORN_TOOTH_SIGNALS_TONE_REMINDER =
  "Worn Tooth Signals™ surface early operational warnings. They are not " +
  "guarantees, predictions, or legal/compliance/accounting/fiduciary/" +
  "valuation conclusions.";

export function buildSignalDraftFromRule(
  rule: WornToothSignalRule,
  customerId: string,
) {
  return {
    customerId,
    signalKey: rule.key,
    signalTitle: rule.signalTitle,
    signalCategory: rule.signalCategory,
    gear: rule.gear,
    severity: rule.defaultSeverity,
    deterministicTriggerKey: rule.key,
    detectedSource: "deterministic_rule",
    clientSafeSummary: rule.clientSafeSummary,
    clientSafeExplanation: rule.clientSafeExplanation,
    recommendedOwnerAction: rule.recommendedOwnerAction,
    professionalReviewRecommended:
      rule.professionalReviewRecommended ?? false,
    regulatedIndustrySensitive:
      rule.regulatedIndustrySensitive ?? false,
  };
}