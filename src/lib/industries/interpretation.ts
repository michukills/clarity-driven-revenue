/**
 * Industry-adjusted interpretation layer.
 *
 * Pure / deterministic. Does NOT change the 0–1000 base stability score.
 * Returns per-industry emphasis used by reports, repair maps, RGS Control
 * monitoring, and admin review to surface "what matters more here".
 *
 * Cannabis / MMJ / MMC / Rec is dispensary / regulated retail operations
 * only — never healthcare, HIPAA, patient care, insurance claims, medical
 * billing, or clinical workflows.
 */

import type { IndustryCategory } from "@/lib/priorityEngine/types";

export type GearKey =
  | "demand_generation"
  | "revenue_conversion"
  | "operational_efficiency"
  | "financial_visibility"
  | "owner_independence";

export interface IndustryEmphasis {
  industry: IndustryCategory;
  label: string;
  /** Gears that should be reviewed first for this industry. */
  priority_gears: GearKey[];
  /** Industry-specific signals worth weighting higher. */
  priority_signals: string[];
  /** Repair map items that typically rise in priority for this industry. */
  repair_priority_emphasis: string[];
  /** RGS Control System monitoring emphasis. */
  monitoring_emphasis: string[];
  /** Cannabis-only safety notes; empty otherwise. */
  safety_notes: string[];
}

const CANNABIS_SAFETY = [
  "Cannabis / MMJ / MMC / Rec dispensary operations only.",
  "State-specific rules may apply.",
  "Not legal advice. Not a compliance guarantee.",
];

const EMPHASIS: Record<Exclude<IndustryCategory, "other">, IndustryEmphasis> = {
  trade_field_service: {
    industry: "trade_field_service",
    label: "Trades / Field Service",
    priority_gears: ["revenue_conversion", "operational_efficiency", "financial_visibility"],
    priority_signals: [
      "estimate close rate", "job costing accuracy", "dispatch workflow",
      "callback / warranty rate", "technician utilization", "AR aging",
    ],
    repair_priority_emphasis: [
      "estimate follow-up SOP", "job costing routine", "dispatch decision rights",
    ],
    monitoring_emphasis: ["close rate trend", "callback trend", "AR aging trend"],
    safety_notes: [],
  },
  restaurant: {
    industry: "restaurant",
    label: "Restaurant / Food Service",
    priority_gears: ["operational_efficiency", "financial_visibility", "revenue_conversion"],
    priority_signals: [
      "prime cost", "food cost", "labor cost", "waste",
      "ticket time", "menu margin", "service handoffs",
    ],
    repair_priority_emphasis: [
      "prime cost cadence", "prep & line SOPs", "FOH/BOH decision rights",
    ],
    monitoring_emphasis: ["prime cost trend", "labor %", "ticket time trend"],
    safety_notes: [],
  },
  retail: {
    industry: "retail",
    label: "Retail",
    priority_gears: ["operational_efficiency", "financial_visibility", "revenue_conversion"],
    priority_signals: [
      "inventory turnover", "stockouts", "dead stock", "shrink",
      "category margin", "basket size", "returns / refunds",
    ],
    repair_priority_emphasis: [
      "receiving & reconciliation SOPs", "category margin cadence", "shrink visibility routine",
    ],
    monitoring_emphasis: ["turnover trend", "stockout signals", "shrink signals"],
    safety_notes: [],
  },
  mmj_cannabis: {
    industry: "mmj_cannabis",
    label: "Cannabis / MMJ / MMC / Rec dispensary operations",
    priority_gears: ["operational_efficiency", "financial_visibility", "owner_independence"],
    priority_signals: [
      "POS / inventory reconciliation", "cash handling", "ID / check-in process visibility",
      "menu / pricing accuracy", "evidence readiness", "compliance-sensitive checklist gaps",
    ],
    repair_priority_emphasis: [
      "open/close & reconciliation SOPs", "cash handling SOPs", "check-in process visibility",
    ],
    monitoring_emphasis: [
      "reconciliation cadence", "cash handling exceptions", "menu / pricing drift",
    ],
    safety_notes: CANNABIS_SAFETY,
  },
  general_service: {
    industry: "general_service",
    label: "General / Mixed Business",
    priority_gears: ["revenue_conversion", "owner_independence", "financial_visibility"],
    priority_signals: [
      "lead source tracking", "close rate", "revenue by line",
      "margin visibility", "owner-dependent tasks", "SOP coverage", "handoff quality",
    ],
    repair_priority_emphasis: [
      "lead source tracking", "owner decision rights", "core SOP coverage",
    ],
    monitoring_emphasis: ["lead source mix", "owner-dependent task count", "core SOP coverage"],
    safety_notes: [],
  },
};

export function getIndustryEmphasis(
  industry: IndustryCategory | null | undefined,
): IndustryEmphasis {
  if (!industry || industry === "other") return EMPHASIS.general_service;
  return EMPHASIS[industry] ?? EMPHASIS.general_service;
}

export const INDUSTRY_EMPHASIS_KEYS: Array<Exclude<IndustryCategory, "other">> = [
  "trade_field_service",
  "restaurant",
  "retail",
  "mmj_cannabis",
  "general_service",
];