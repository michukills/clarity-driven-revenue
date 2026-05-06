/**
 * P86 Part 6 — External Risk Diagnostic Triggers.
 *
 * Manual admin entry only. No live news / regulatory monitoring is
 * wired. Marks related gear as needs_reinspection. Preserves P85.3
 * Forward Stability Flags™ as the underlying surface.
 */

export type ExternalRiskTriggerType =
  | "new_competitor_nearby"
  | "platform_or_ad_rule_change"
  | "vendor_disruption"
  | "supplier_disruption"
  | "license_or_documentation_deadline"
  | "major_contract_expiration"
  | "tax_or_cash_event"
  | "market_demand_shock"
  | "weather_or_seasonality_disruption"
  | "cannabis_documentation_deadline"
  | "other";

export type ExternalRiskSeverity = "low" | "medium" | "high" | "severe" | "critical";

export const EXTERNAL_RISK_TRIGGER_TYPES: ReadonlyArray<ExternalRiskTriggerType> = [
  "new_competitor_nearby",
  "platform_or_ad_rule_change",
  "vendor_disruption",
  "supplier_disruption",
  "license_or_documentation_deadline",
  "major_contract_expiration",
  "tax_or_cash_event",
  "market_demand_shock",
  "weather_or_seasonality_disruption",
  "cannabis_documentation_deadline",
  "other",
];

export const EXTERNAL_RISK_AUTOMATION_WIRED = false;
export const EXTERNAL_RISK_MODE_LABEL =
  EXTERNAL_RISK_AUTOMATION_WIRED
    ? "Automated monitoring + admin entry"
    : "Manual admin entry only (no live monitoring)";

export const EXTERNAL_RISK_FORBIDDEN_CLAIMS: ReadonlyArray<string> = [
  "legal compliance",
  "tax compliance",
  "regulatory assurance",
  "audit-ready",
  "lender-ready",
  "investor-ready",
  "compliance certification",
  "guaranteed",
  "fiduciary",
  "license violation",
];

export function findExternalRiskForbiddenPhrase(text: string | null | undefined): string | null {
  if (!text) return null;
  const lc = text.toLowerCase();
  for (const p of EXTERNAL_RISK_FORBIDDEN_CLAIMS) {
    if (lc.includes(p)) return p;
  }
  return null;
}

export interface ExternalRiskTriggerInput {
  triggerType: ExternalRiskTriggerType;
  sourceNote: string | null | undefined;
  affectedGear: string;
}

export interface ExternalRiskTriggerResult {
  valid: boolean;
  marks_needs_reinspection: boolean;
  reason: string;
}

export function evaluateExternalRiskTrigger(
  input: ExternalRiskTriggerInput,
): ExternalRiskTriggerResult {
  if (!input.sourceNote || input.sourceNote.trim().length < 4) {
    return { valid: false, marks_needs_reinspection: false, reason: "missing_source_note" };
  }
  if (!input.affectedGear || input.affectedGear.trim().length === 0) {
    return { valid: false, marks_needs_reinspection: false, reason: "missing_gear" };
  }
  if (findExternalRiskForbiddenPhrase(input.sourceNote)) {
    return { valid: false, marks_needs_reinspection: false, reason: "forbidden_language" };
  }
  return { valid: true, marks_needs_reinspection: true, reason: "ok" };
}