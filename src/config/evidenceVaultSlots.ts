/**
 * P87 — Evidence Vault Labeled Slots + Deterministic Verification Rules.
 *
 * Single source of truth for the labeled Evidence Vault slot catalog,
 * slot statuses, deterministic verification rules (Recency,
 * Specificity, Alignment, Totality), and per-industry label/help
 * adaptations.
 *
 * No AI scoring. No legal/tax/lender/valuation/compliance claims.
 * Cannabis/MMJ language is dispensary/cannabis-retail only. Live sync
 * for trades/POS connectors is NOT claimed unless an actual connector
 * already exists; this pass is manual upload/export only.
 */

import type { EvidenceDecayCategory } from "./evidenceDecay";

export type EvidenceSlotKey =
  | "financial_reality"
  | "sales_proof"
  | "operational_dna"
  | "pricing_strategy"
  | "time_audit";

export type EvidenceSlotStatus =
  | "missing"
  | "pending_review"
  | "verified"
  | "partial"
  | "rejected"
  | "expired"
  | "expiring_soon"
  | "not_applicable";

export const EVIDENCE_SLOT_STATUSES: ReadonlyArray<EvidenceSlotStatus> = [
  "missing",
  "pending_review",
  "verified",
  "partial",
  "rejected",
  "expired",
  "expiring_soon",
  "not_applicable",
];

export const EVIDENCE_SLOT_STATUS_CLIENT_LABEL: Record<EvidenceSlotStatus, string> = {
  missing: "Missing",
  pending_review: "Pending review",
  verified: "Verified",
  partial: "More info requested",
  rejected: "Not accepted — please re-upload",
  expired: "Expired — please refresh",
  expiring_soon: "Expiring soon",
  not_applicable: "Not applicable",
};

export interface EvidenceSlotDefinition {
  key: EvidenceSlotKey;
  clientLabel: string;
  uploadInstruction: string;
  acceptedExamples: ReadonlyArray<string>;
  gears: ReadonlyArray<string>;
  verificationCategory: EvidenceDecayCategory;
  alternateVerificationCategory?: EvidenceDecayCategory;
  defaultTtlDays: number | null;
  ifMissingExplanation: string;
  clientSafeWording: string;
}

export const EVIDENCE_VAULT_SLOTS: ReadonlyArray<EvidenceSlotDefinition> = [
  {
    key: "financial_reality",
    clientLabel: "Financial Reality",
    uploadInstruction:
      "Upload your most recent Profit and Loss Statement, also called a P&L. This shows revenue, costs, expenses, and profit over a specific period.",
    acceptedExamples: [
      "QuickBooks P&L export",
      "Xero P&L export",
      "FreshBooks report",
      "Accountant-provided P&L",
      "Spreadsheet export",
    ],
    gears: ["Financial Visibility"],
    verificationCategory: "financial_snapshot",
    defaultTtlDays: 30,
    ifMissingExplanation:
      "Financial Visibility evidence remains Missing where scoring depends on proof.",
    clientSafeWording:
      "RGS uses this to understand financial visibility and operating reality. This is not tax, accounting, lending, valuation, or audit advice.",
  },
  {
    key: "sales_proof",
    clientLabel: "Sales Proof",
    uploadInstruction:
      "Upload a lead log, CRM export, pipeline screenshot, inquiry tracker, or recent sales activity report.",
    acceptedExamples: [
      "HubSpot export",
      "Salesforce export",
      "Pipedrive export",
      "Jobber leads/jobs export",
      "Manual lead spreadsheet",
      "POS or customer inquiry report",
    ],
    gears: ["Demand Generation", "Revenue Conversion"],
    verificationCategory: "lead_log",
    alternateVerificationCategory: "crm_export",
    defaultTtlDays: 30,
    ifMissingExplanation:
      "Demand and Conversion evidence remains Missing where scoring depends on proof.",
    clientSafeWording:
      "RGS uses this to compare lead flow, follow-up, and conversion visibility. It does not guarantee sales results.",
  },
  {
    key: "operational_dna",
    clientLabel: "Operational DNA",
    uploadInstruction:
      "Upload SOPs, checklists, employee handbook pages, training documents, opening/closing procedures, dispatch process notes, or any documented operating standards.",
    acceptedExamples: [
      "SOP documents",
      "Training manuals",
      "Checklists",
      "Employee handbook",
      "Role guides",
      "Process docs",
    ],
    gears: ["Operational Efficiency", "Owner Independence"],
    verificationCategory: "sop_or_handbook",
    defaultTtlDays: 180,
    ifMissingExplanation:
      "Documentation and owner independence fields remain Missing where applicable.",
    clientSafeWording:
      "RGS reviews whether work can be repeated without the owner carrying every detail. This is not HR, legal, OSHA, payroll, or employment advice.",
  },
  {
    key: "pricing_strategy",
    clientLabel: "Pricing Strategy",
    uploadInstruction:
      "Upload a sample quote, proposal, menu/pricing sheet, estimate, package sheet, or pricing calculator.",
    acceptedExamples: [
      "Contractor quote",
      "Restaurant menu",
      "Retail price sheet",
      "Professional services proposal",
      "E-commerce pricing export",
      "Cannabis or MMJ menu / pricing sheet",
    ],
    gears: ["Revenue Conversion", "Financial Visibility"],
    verificationCategory: "scope_or_engagement_doc",
    defaultTtlDays: 180,
    ifMissingExplanation:
      "Pricing and margin visibility remain Missing where scoring depends on proof.",
    clientSafeWording:
      "RGS reviews pricing structure as an operating signal. This is not valuation, tax, lending, legal, or profit-outcome advice.",
  },
  {
    key: "time_audit",
    clientLabel: "Time Audit",
    uploadInstruction:
      "Upload a screenshot or export showing where the owner's time goes, such as a calendar screenshot, weekly schedule, dispatch involvement, project/task list, or time log.",
    acceptedExamples: [
      "Google Calendar screenshot",
      "Weekly schedule",
      "Owner time log",
      "Dispatch / task list",
      "Project management screenshot",
      "Manual time-audit worksheet",
    ],
    gears: ["Owner Independence", "Operational Efficiency"],
    verificationCategory: "owner_interview_claim",
    alternateVerificationCategory: "role_clarity_or_decision_rights",
    defaultTtlDays: null,
    ifMissingExplanation:
      "Owner Independence proof remains Missing or client-claim-only.",
    clientSafeWording:
      "RGS uses this to understand owner dependency and operating pressure. This is not legal, HR, payroll, or employment advice.",
  },
];

export function getSlotDefinition(key: EvidenceSlotKey): EvidenceSlotDefinition | null {
  return EVIDENCE_VAULT_SLOTS.find((s) => s.key === key) ?? null;
}

// Deterministic verification rules

export const RULE_OF_RECENCY_MAX_DAYS = 365;

export const RULE_OF_RECENCY_CATEGORIES: ReadonlyArray<EvidenceDecayCategory> = [
  "financial_snapshot",
  "lead_log",
  "crm_export",
  "sales_pipeline_export",
  "payroll_export",
  "field_ops_export",
  "pos_export",
  "inventory_reconciliation",
];

export interface RecencyInput {
  category: EvidenceDecayCategory;
  evidenceDate: string | null;
  now?: Date;
}
export interface RecencyResult { in_window: boolean; reason: string; }

export function evaluateRuleOfRecency(input: RecencyInput): RecencyResult {
  if (!RULE_OF_RECENCY_CATEGORIES.includes(input.category)) {
    return { in_window: true, reason: "category_not_subject_to_recency_rule" };
  }
  if (!input.evidenceDate) return { in_window: false, reason: "missing_evidence_date" };
  const now = input.now ?? new Date();
  const ev = new Date(input.evidenceDate);
  if (Number.isNaN(ev.getTime())) return { in_window: false, reason: "invalid_evidence_date" };
  const ageDays = Math.floor((now.getTime() - ev.getTime()) / (24 * 60 * 60 * 1000));
  if (ageDays > RULE_OF_RECENCY_MAX_DAYS) {
    return { in_window: false, reason: "evidence_older_than_12_months" };
  }
  return { in_window: true, reason: "within_12_month_window" };
}

export interface SpecificityInput {
  has_specific_steps: boolean;
  has_role_assignments: boolean;
  has_checklist_items: boolean;
  has_decision_rules: boolean;
  has_handoff_points: boolean;
  has_review_cadence: boolean;
}
export interface SpecificityResult {
  meets_rule: boolean;
  positive_signals: number;
  reason: string;
}
export function evaluateRuleOfSpecificity(input: SpecificityInput): SpecificityResult {
  const positive = [
    input.has_specific_steps, input.has_role_assignments, input.has_checklist_items,
    input.has_decision_rules, input.has_handoff_points, input.has_review_cadence,
  ].filter(Boolean).length;
  if (positive === 0) return { meets_rule: false, positive_signals: 0, reason: "no_specific_operating_signals" };
  return { meets_rule: true, positive_signals: positive, reason: "has_specific_operating_signals" };
}

export interface AlignmentInput {
  client_claim_value: number | null;
  evidence_value: number | null;
  conservative_direction: "lower" | "higher";
  material_difference_threshold?: number;
}
export interface AlignmentResult {
  conservative_value: number | null;
  conflict_flag_required: boolean;
  reason: string;
}
export function evaluateRuleOfAlignment(input: AlignmentInput): AlignmentResult {
  const claim = input.client_claim_value;
  const evidence = input.evidence_value;
  const threshold = input.material_difference_threshold ?? 0.1;
  if (claim === null && evidence === null) {
    return { conservative_value: null, conflict_flag_required: false, reason: "no_values_to_compare" };
  }
  if (claim === null) return { conservative_value: evidence, conflict_flag_required: false, reason: "evidence_only" };
  if (evidence === null) return { conservative_value: claim, conflict_flag_required: false, reason: "claim_only_no_evidence" };
  const diff = Math.abs(claim - evidence);
  const base = Math.max(Math.abs(claim), Math.abs(evidence), 1);
  const material = (diff / base) >= threshold;
  const conservative = input.conservative_direction === "lower"
    ? Math.min(claim, evidence) : Math.max(claim, evidence);
  return {
    conservative_value: conservative,
    conflict_flag_required: material,
    reason: material ? "material_disagreement" : "values_aligned",
  };
}

export type ScoringMode = "binary" | "supports_partial_credit" | "unscored";

export interface TotalityInput { status: EvidenceSlotStatus; scoring_mode: ScoringMode; }
export interface TotalityResult { full_credit: boolean; partial_credit: boolean; reason: string; }

export function evaluateRuleOfTotality(input: TotalityInput): TotalityResult {
  const { status, scoring_mode } = input;
  if (status === "verified") return { full_credit: true, partial_credit: false, reason: "verified_full" };
  if (status === "partial") {
    if (scoring_mode === "supports_partial_credit") {
      return { full_credit: false, partial_credit: true, reason: "partial_with_supported_partial_scoring" };
    }
    return { full_credit: false, partial_credit: false, reason: "partial_blocked_binary_scoring" };
  }
  if (status === "missing" || status === "rejected" || status === "expired") {
    return { full_credit: false, partial_credit: false, reason: status };
  }
  if (status === "expiring_soon") {
    return { full_credit: true, partial_credit: false, reason: "expiring_soon_warning_only" };
  }
  return { full_credit: false, partial_credit: false, reason: status };
}

// Industry-specific slot label/help adaptations

export type IndustryKey =
  | "trades_home_services"
  | "restaurant_food_service"
  | "retail"
  | "professional_services"
  | "ecommerce_online_retail"
  | "cannabis_mmj_dispensary"
  | "general_small_business";

export type IndustrySlotHints = Partial<Record<EvidenceSlotKey, { label?: string; helpText?: string }>>;

export const INDUSTRY_SLOT_HINTS: Record<IndustryKey, IndustrySlotHints> = {
  trades_home_services: {
    sales_proof: { helpText: "Examples: Jobber, ServiceTitan, or Housecall Pro lead/job export, manual lead log, or pipeline screenshot. Manual upload only — live sync not enabled in this pass." },
    time_audit: { helpText: "Show owner involvement in dispatch, the job schedule, or field work. A weekly schedule or dispatch screenshot works." },
    financial_reality: { helpText: "Upload your QuickBooks P&L or job-costing report. Manual export only." },
  },
  restaurant_food_service: {
    financial_reality: { helpText: "Upload a P&L plus a recent POS sales report and a food/labor cost report if available." },
    pricing_strategy: { helpText: "Upload a current menu or pricing sheet." },
    operational_dna: { helpText: "Upload an opening/closing checklist and prep procedure if available." },
  },
  retail: {
    sales_proof: { helpText: "Upload a POS or customer sales report." },
    pricing_strategy: { helpText: "Upload a category price sheet." },
    operational_dna: { helpText: "Upload inventory procedures." },
  },
  professional_services: {
    pricing_strategy: { helpText: "Upload a proposal, engagement letter, or scope document." },
    time_audit: { helpText: "Upload a calendar or utilization report." },
    sales_proof: { helpText: "Upload a CRM export or pipeline export." },
  },
  ecommerce_online_retail: {
    sales_proof: { helpText: "Upload a Shopify, WooCommerce, or Amazon Seller export." },
    operational_dna: { helpText: "Upload your fulfillment SOP." },
    pricing_strategy: { helpText: "Upload a SKU and pricing export." },
  },
  cannabis_mmj_dispensary: {
    sales_proof: { helpText: "Examples include a manual METRC or BioTrack export, POS inventory report, dated reconciliation, or vault count sheet. RGS reviews documentation readiness for a dispensary or cannabis-retail operation. RGS does not provide regulated-industry certification, license-related protections, regulator-side assurance, or enforcement-side protection." },
    operational_dna: { helpText: "Upload SOPs and checklists for a dispensary or cannabis-retail operation. Documentation-readiness only — not regulatory compliance." },
    pricing_strategy: { helpText: "Upload a current menu or pricing sheet for the dispensary or cannabis-retail operation." },
  },
  general_small_business: {},
};

export function resolveSlotForIndustry(
  slotKey: EvidenceSlotKey,
  industryKey: IndustryKey | null | undefined,
): { definition: EvidenceSlotDefinition; industryLabel: string; industryHelpText: string } | null {
  const def = getSlotDefinition(slotKey);
  if (!def) return null;
  const industry = industryKey ?? "general_small_business";
  const hints = INDUSTRY_SLOT_HINTS[industry] ?? {};
  const slotHint = hints[slotKey] ?? {};
  return {
    definition: def,
    industryLabel: slotHint.label ?? def.clientLabel,
    industryHelpText: slotHint.helpText ?? def.uploadInstruction,
  };
}

export const EVIDENCE_SLOT_FORBIDDEN_CLIENT_PHRASES: ReadonlyArray<string> = [
  "compliance certified",
  "legally compliant",
  "license protection",
  "license-protected",
  "regulatory assurance",
  "regulatory approved",
  "audit guaranteed",
  "audit-ready",
  "lender ready",
  "lender-ready",
  "investor ready",
  "investor-ready",
  "valuation ready",
  "tax compliance",
  "guaranteed",
  "fiduciary",
  "safe from penalties",
  "enforcement protection",
];

export function findForbiddenSlotPhrase(text: string | null | undefined): string | null {
  if (!text) return null;
  const lc = text.toLowerCase();
  for (const p of EVIDENCE_SLOT_FORBIDDEN_CLIENT_PHRASES) {
    if (lc.includes(p)) return p;
  }
  return null;
}

export function nextStatusOnClientUpload(current: EvidenceSlotStatus): EvidenceSlotStatus {
  if (current === "not_applicable") return "not_applicable";
  return "pending_review";
}

export const ADMIN_STATUS_TRANSITIONS: ReadonlyArray<EvidenceSlotStatus> = [
  "verified", "partial", "rejected", "not_applicable", "pending_review", "missing",
];

export function isAdminTransitionAllowed(target: EvidenceSlotStatus): boolean {
  return ADMIN_STATUS_TRANSITIONS.includes(target);
}
