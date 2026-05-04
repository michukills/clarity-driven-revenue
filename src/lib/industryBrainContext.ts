/**
 * Industry Brain Launch Integration — single source-of-truth bridge from a
 * customer's stored industry (`customers.industry`, an `IndustryCategory`)
 * to the dense `INDUSTRY_BRAIN_CATALOG` so launch-relevant admin/report/
 * repair-map/implementation/RGS Control surfaces consume the same
 * Industry Brain context.
 *
 * Pure / deterministic. No network. No AI. No client exposure — every
 * consumer of this module is admin-gated. The context returned here is
 * **admin review support**: it never overrides deterministic scorecard
 * scoring, never auto-publishes anything client-visible, and never relaxes
 * ClientToolGuard / payment / invite / role / RLS gates.
 *
 * Cannabis / MMJ / MMC / Rec context is dispensary / retail / regulated
 * cannabis operations only — never healthcare, patient care, HIPAA,
 * insurance claims, medical billing, or clinical workflows. The word
 * "medical" in this file ONLY refers to medical marijuana.
 */

import {
  INDUSTRY_BRAIN_CATALOG,
  type IndustryCatalog,
} from "@/lib/industryBrainCatalog";
import {
  INDUSTRY_LABEL as BRAIN_INDUSTRY_LABEL,
  type IndustryKey as BrainIndustryKey,
} from "@/lib/industryBrain";
import type { IndustryCategory } from "@/lib/priorityEngine/types";

/**
 * Map the customer-facing `IndustryCategory` (stored on `customers.industry`)
 * to the Industry Brain catalog key. Unknown / "other" / null falls back to
 * General Small Business so launch surfaces always have safe context.
 */
export function brainKeyForCustomerIndustry(
  industry: IndustryCategory | string | null | undefined,
): BrainIndustryKey {
  switch (industry) {
    case "trade_field_service":
      return "trades_services";
    case "restaurant":
      return "restaurant_food_service";
    case "retail":
      return "retail";
    case "mmj_cannabis":
      return "cannabis_mmj_mmc";
    case "general_service":
    case "other":
    case null:
    case undefined:
    default:
      return "general_small_business";
  }
}

export interface IndustryBrainContext {
  /** Customer industry as stored (or null if unknown). */
  customerIndustry: IndustryCategory | null;
  /** Resolved Industry Brain key actually used. */
  brainKey: BrainIndustryKey;
  /** Human-readable industry label. */
  industryLabel: string;
  /** True if customer industry is missing/other and we fell back to General. */
  fellBackToGeneral: boolean;
  /** Full catalog for the resolved industry. */
  catalog: IndustryCatalog;
  /** Top variables the admin should review when building a diagnostic / report. */
  industrySpecificFailurePoints: string[];
  /** Repair-map implications the admin can pull into roadmap recommendations. */
  repairMapImplications: string[];
  /** Monitoring signals for RGS Control System / Revenue & Risk Monitor. */
  controlSystemSignals: string[];
  /** Software / evidence sources to ask the client to provide. */
  softwareEvidenceSources: string[];
  /** Report-language cues (failure points + implications) admins can quote in drafts. */
  reportLanguageCues: string[];
  /** Implementation / tool mapping cues. */
  toolReportMappings: string[];
  /** Owner-dependence risks for repair-map sequencing. */
  ownerDependenceRisks: string[];
  /**
   * Cannabis-only safety reminders. Empty array for non-cannabis industries.
   * These are admin notes — not client-facing copy.
   */
  cannabisSafetyNotes: string[];
}

const CANNABIS_SAFETY_NOTES: string[] = [
  "Cannabis / MMJ / MMC / Rec is dispensary and regulated retail operations only — not healthcare, patient care, HIPAA, insurance claims, medical billing, or clinical workflows.",
  "Compliance-sensitive: state-specific rules may apply.",
  "Supports documentation readiness; does not certify compliance.",
  "Professional review (legal, tax, accounting, HR, regulated cannabis counsel) may still be required.",
  "Not legal advice. Not a compliance guarantee.",
];

/**
 * Build the deterministic Industry Brain context for a customer.
 *
 * This is the single function that admin diagnostic review, report builder,
 * repair map, implementation roadmap, RGS Control System, and the
 * (admin-reviewed) AI assist edge function all consume. It is intentionally
 * a pure read of the catalog so behavior is testable and stable.
 */
export function getIndustryBrainContextForCustomer(
  industry: IndustryCategory | string | null | undefined,
): IndustryBrainContext {
  const fellBackToGeneral =
    industry === null ||
    industry === undefined ||
    industry === "other" ||
    industry === "general_service" ||
    industry === "";
  const brainKey = brainKeyForCustomerIndustry(industry);
  const catalog = INDUSTRY_BRAIN_CATALOG[brainKey];
  const failurePoints = catalog.industry_specific_failure_points ?? [];
  const repairImplications = catalog.repair_map_implications ?? [];
  const isCannabis = brainKey === "cannabis_mmj_mmc";

  const customerIndustry: IndustryCategory | null =
    industry == null || industry === "" ? null : (industry as IndustryCategory);

  return {
    customerIndustry,
    brainKey,
    industryLabel: BRAIN_INDUSTRY_LABEL[brainKey],
    fellBackToGeneral,
    catalog,
    industrySpecificFailurePoints: failurePoints,
    repairMapImplications: repairImplications,
    controlSystemSignals: catalog.rgs_control_system_signals ?? [],
    softwareEvidenceSources: catalog.software_evidence_sources ?? [],
    reportLanguageCues: [...failurePoints, ...repairImplications].slice(0, 24),
    toolReportMappings: catalog.tool_report_mappings ?? [],
    ownerDependenceRisks: catalog.owner_dependence_risks ?? [],
    cannabisSafetyNotes: isCannabis ? CANNABIS_SAFETY_NOTES : [],
  };
}

/**
 * Compact, prompt-safe payload of Industry Brain context. Used by the
 * backend-only `report-ai-assist` edge function. Admin-reviewed AI output
 * remains admin-only (client_safe defaults to false) — Industry Brain is
 * provided as **context**, never as final authority, and never overrides
 * the deterministic 0–1000 scorecard scoring.
 */
export function buildIndustryBrainPromptContext(
  industry: IndustryCategory | string | null | undefined,
): {
  industry_label: string;
  brain_key: BrainIndustryKey;
  fell_back_to_general: boolean;
  failure_points: string[];
  repair_map_implications: string[];
  monitoring_signals: string[];
  software_evidence_sources: string[];
  cannabis_safety_notes: string[];
} {
  const ctx = getIndustryBrainContextForCustomer(industry);
  return {
    industry_label: ctx.industryLabel,
    brain_key: ctx.brainKey,
    fell_back_to_general: ctx.fellBackToGeneral,
    failure_points: ctx.industrySpecificFailurePoints.slice(0, 16),
    repair_map_implications: ctx.repairMapImplications.slice(0, 16),
    monitoring_signals: ctx.controlSystemSignals.slice(0, 16),
    software_evidence_sources: ctx.softwareEvidenceSources.slice(0, 16),
    cannabis_safety_notes: ctx.cannabisSafetyNotes,
  };
}