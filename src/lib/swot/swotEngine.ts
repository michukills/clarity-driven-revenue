// RGS SWOT Strategic Matrix — deterministic engine.
//
// Mapping from raw SWOT items to:
//   - normalized internal vs external classification
//   - linked RGS gear
//   - leverage/severity inference (from confidence + relevance flags)
//   - client-safe summaries (admin-only notes are preserved separately)
//   - downstream relevance flags (repair map / implementation / campaign /
//     control system monitoring / re-engagement triggers / evidence needed)
//
// AI assist may later refine these, but the structural rules and safety
// boundaries do not depend on AI.

import type {
  SwotItem,
  SwotItemInput,
  SwotCategory,
  SwotInternalExternal,
  SwotLinkedGear,
  SwotSeverityOrLeverage,
  SwotEvidenceConfidence,
} from "./types";

const STRENGTH_OR_WEAKNESS: SwotCategory[] = ["strength", "weakness"];

/** SWOT category → default internal/external classification. */
export function defaultInternalExternal(c: SwotCategory): SwotInternalExternal {
  return STRENGTH_OR_WEAKNESS.includes(c) ? "internal" : "external";
}

const GEAR_KEYWORDS: Array<[RegExp, SwotLinkedGear]> = [
  [/\b(referral|lead|seo|ad|campaign|brand|awareness|traffic|seasonality|event|competitor)\b/i, "demand_generation"],
  [/\b(close|closing|follow[- ]up|quote|proposal|conversion|funnel|sales call|booking)\b/i, "revenue_conversion"],
  [/\b(process|sop|workflow|bottleneck|capacity|operations|fulfillment|delivery|scheduling)\b/i, "operational_efficiency"],
  [/\b(cash|cash flow|margin|profit|bookkeeping|financial|invoice|ar|ap|forecast)\b/i, "financial_visibility"],
  [/\b(owner|founder|approve|approval|decision|delegation|key[- ]person)\b/i, "owner_independence"],
];

/** Best-effort gear inference from title + description. */
export function inferGear(
  title: string,
  description?: string | null,
  fallback: SwotLinkedGear = "multiple",
): SwotLinkedGear {
  const text = `${title}\n${description ?? ""}`;
  const matches = new Set<SwotLinkedGear>();
  for (const [re, gear] of GEAR_KEYWORDS) {
    if (re.test(text)) matches.add(gear);
  }
  if (matches.size === 0) return fallback;
  if (matches.size === 1) return [...matches][0];
  return "multiple";
}

const CONFIDENCE_WEIGHT: Record<SwotEvidenceConfidence, number> = {
  verified: 4,
  partially_supported: 3,
  owner_claim_only: 2,
  assumption: 1,
  missing_evidence: 0,
};

/** Deterministic leverage/severity from confidence + relevance flags. */
export function inferSeverity(item: SwotItemInput): SwotSeverityOrLeverage {
  const conf = CONFIDENCE_WEIGHT[item.evidence_confidence ?? "missing_evidence"];
  const flags =
    Number(!!item.repair_map_relevance) +
    Number(!!item.implementation_relevance) +
    Number(!!item.control_system_monitoring_relevance) +
    Number(!!item.reengagement_trigger_relevance) +
    Number(!!item.campaign_relevance);
  const score = conf + flags;
  if (score >= 7) return "critical";
  if (score >= 5) return "high";
  if (score >= 2) return "moderate";
  return "low";
}

/**
 * Take a raw SWOT item input and return a normalized draft ready for save.
 * - Sets internal/external from category if unset.
 * - Sets linked_gear via keyword inference if unset.
 * - Sets severity_or_leverage deterministically.
 * - Strips admin_only_notes from client_safe_summary; never copies them.
 * - Defaults relevance flags to false (must be explicit).
 */
export function normalizeSwotItem(
  raw: SwotItemInput,
): Omit<SwotItem, "id" | "swot_analysis_id" | "customer_id" | "created_at" | "updated_at"> {
  const category = raw.category;
  const internal_external =
    raw.internal_external ?? defaultInternalExternal(category);
  const linked_gear =
    raw.linked_gear ?? inferGear(raw.title, raw.description ?? null);
  const evidence_confidence = raw.evidence_confidence ?? "missing_evidence";
  const severity_or_leverage =
    raw.severity_or_leverage ?? inferSeverity({ ...raw, evidence_confidence });

  return {
    category,
    title: raw.title.trim(),
    description: raw.description?.trim() || null,
    evidence_summary: raw.evidence_summary?.trim() || null,
    evidence_confidence,
    source_type: raw.source_type ?? "manual",
    linked_gear,
    severity_or_leverage,
    internal_external,
    client_safe_summary: raw.client_safe_summary?.trim() || null,
    admin_only_notes: raw.admin_only_notes?.trim() || null,
    recommended_action: raw.recommended_action?.trim() || null,
    repair_map_relevance: !!raw.repair_map_relevance,
    implementation_relevance: !!raw.implementation_relevance,
    campaign_relevance: !!raw.campaign_relevance,
    control_system_monitoring_relevance: !!raw.control_system_monitoring_relevance,
    reengagement_trigger_relevance: !!raw.reengagement_trigger_relevance,
    client_visible: !!raw.client_visible,
    display_order: raw.display_order ?? 100,
  };
}

/** Returns true if this item should produce an "evidence_needed" signal. */
export function isMissingEvidence(item: SwotItemInput): boolean {
  const c = item.evidence_confidence ?? "missing_evidence";
  return c === "missing_evidence" || c === "assumption";
}