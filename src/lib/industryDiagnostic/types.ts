/**
 * P93E-E2G — Industry-Specific Admin Diagnostic Interview System.
 *
 * Shared types for the admin-driven, ad-lib live interview question banks.
 * This is distinct from the public `diagnostic_interview_runs` self-submit
 * flow: here an admin reads a plain-English script during a paid RGS
 * Diagnostic call and captures the owner's answers live with structured
 * value, confidence, and evidence state.
 */

export type IndustryKey =
  | "trades_home_services"
  | "restaurants_food_service"
  | "retail_brick_mortar"
  | "professional_services"
  | "ecommerce_online_retail"
  | "cannabis_mmj_dispensary";

export const INDUSTRY_KEYS: IndustryKey[] = [
  "trades_home_services",
  "restaurants_food_service",
  "retail_brick_mortar",
  "professional_services",
  "ecommerce_online_retail",
  "cannabis_mmj_dispensary",
];

export const INDUSTRY_LABELS: Record<IndustryKey, string> = {
  trades_home_services: "Trades / Home Services",
  restaurants_food_service: "Restaurants / Food Service",
  retail_brick_mortar: "Retail / Brick-and-Mortar",
  professional_services: "Professional Services",
  ecommerce_online_retail: "E-commerce / Online Retail",
  cannabis_mmj_dispensary: "Cannabis / MMJ Dispensary Operations",
};

/** Maps to the deterministic RGS gear/section model for downstream signals. */
export type GearKey =
  | "business_profile"
  | "demand"
  | "sales"
  | "operations"
  | "financial"
  | "owner_independence"
  | "evidence";

export const GEAR_LABELS: Record<GearKey, string> = {
  business_profile: "Business Profile",
  demand: "Demand Generation",
  sales: "Revenue Conversion",
  operations: "Operational Efficiency",
  financial: "Financial Visibility",
  owner_independence: "Owner Independence",
  evidence: "Evidence & Documentation Readiness",
};

export type AnswerType =
  | "narrative"
  | "numeric"
  | "currency"
  | "percent"
  | "range"
  | "seasonal_range"
  | "categorical";

export type ConfidenceLevel =
  | "verified"
  | "owner_estimated"
  | "evidence_pending"
  | "unavailable"
  | "unknown"
  | "rejected";

export const CONFIDENCE_LABELS: Record<ConfidenceLevel, string> = {
  verified: "Verified",
  owner_estimated: "Owner Estimated",
  evidence_pending: "Evidence Pending",
  unavailable: "Unavailable",
  unknown: "Unknown",
  rejected: "Rejected / Insufficient Evidence",
};

export type EvidenceState =
  | "not_requested"
  | "requested"
  | "uploaded"
  | "pending_review"
  | "verified"
  | "partial"
  | "rejected"
  | "missing";

export const EVIDENCE_LABELS: Record<EvidenceState, string> = {
  not_requested: "Not Requested",
  requested: "Requested",
  uploaded: "Uploaded",
  pending_review: "Pending Review",
  verified: "Verified",
  partial: "Partial",
  rejected: "Rejected",
  missing: "Missing",
};

export type ResponseStatus =
  | "answered"
  | "skipped"
  | "needs_followup"
  | "unknown"
  | "not_tracked"
  | "not_applicable";

export const STATUS_LABELS: Record<ResponseStatus, string> = {
  answered: "Answered",
  skipped: "Skipped",
  needs_followup: "Needs follow-up",
  unknown: "I don't know",
  not_tracked: "Not tracked",
  not_applicable: "Not applicable",
};

export interface CaptureFields {
  notes?: boolean;
  exact_value?: boolean;
  estimated_value?: boolean;
  range?: boolean;
  seasonal?: boolean;
}

export interface DiagnosticQuestion {
  /** Stable key — used as primary key in industry_diagnostic_responses. */
  key: string;
  industry: IndustryKey;
  gear: GearKey;
  /** Section label inside the gear (e.g. "Crew structure"). */
  section: string;
  /** Plain-English owner question — what the admin actually says aloud. */
  plain_language_question: string;
  /** Business term shown beside or below the plain question. */
  business_term?: string;
  /** Optional helper text the admin can read. */
  helper_text?: string;
  /** Where the truth lives if validated later. */
  source_of_truth_guidance?: string;
  /** Prompt for evidence the admin should request. */
  evidence_prompt?: string;
  evidence_required?: boolean;
  answer_type: AnswerType;
  capture: CaptureFields;
  /** Diagnostic signal label this question feeds. */
  diagnostic_signal?: string;
  /** Repair-map signal flag this question can trigger. */
  repair_map_signal?: string;
  /** Hint to admin only — never shown to clients. */
  admin_only_notes?: string;
}

export interface IndustryQuestionBank {
  industry: IndustryKey;
  label: string;
  /** Required disclaimer block (e.g. for Cannabis/MMJ). */
  disclaimer?: string;
  questions: DiagnosticQuestion[];
}

/**
 * Honest maturity status for an industry bank. Never label a bank "complete"
 * unless it has full-depth questions, repair-map signals, and verified workflow
 * support. Reports must NOT consume `starter_bank` industries as if they were
 * full-depth.
 */
export type IndustryMaturity =
  | "starter_bank"
  | "depth_in_progress"
  | "full_depth_ready"
  | "report_ready"
  | "live_verified";

export const MATURITY_LABELS: Record<IndustryMaturity, string> = {
  starter_bank: "Starter bank — needs industry depth pass",
  depth_in_progress: "Depth pass in progress",
  full_depth_ready: "Full-depth ready",
  report_ready: "Report wiring ready",
  live_verified: "Live-verified",
};

export const MATURITY_TONE: Record<IndustryMaturity, "warn" | "info" | "ok"> = {
  starter_bank: "warn",
  depth_in_progress: "warn",
  full_depth_ready: "info",
  report_ready: "info",
  live_verified: "ok",
};

/**
 * Honest maturity registry. Update only when an industry bank has actually been
 * deepened and audited — not when prompts are merely added.
 */
export const INDUSTRY_MATURITY: Record<IndustryKey, IndustryMaturity> = {
  trades_home_services: "full_depth_ready",
  restaurants_food_service: "starter_bank",
  retail_brick_mortar: "starter_bank",
  professional_services: "starter_bank",
  ecommerce_online_retail: "starter_bank",
  cannabis_mmj_dispensary: "starter_bank",
};

/** Minimum gear coverage required to be considered full-depth ready. */
export const FULL_DEPTH_GEAR_MINIMUM: Record<GearKey, number> = {
  business_profile: 8,
  demand: 10,
  sales: 10,
  operations: 15,
  financial: 12,
  owner_independence: 10,
  evidence: 8,
};

/** Minimum total prompts to be considered full-depth ready. */
export const FULL_DEPTH_TOTAL_MINIMUM = 70;

export const CANNABIS_DISCLAIMER =
  "This is an operational visibility and documentation-readiness tool, not legal advice, " +
  "compliance certification, tax advice, or a guarantee of regulatory compliance. " +
  "Always confirm requirements with qualified counsel and your state regulator.";

export interface QuestionBankSummary {
  total: number;
  by_gear: Record<GearKey, number>;
}

export function summarizeBank(bank: IndustryQuestionBank): QuestionBankSummary {
  const by_gear: Record<GearKey, number> = {
    business_profile: 0,
    demand: 0,
    sales: 0,
    operations: 0,
    financial: 0,
    owner_independence: 0,
    evidence: 0,
  };
  for (const q of bank.questions) by_gear[q.gear] += 1;
  return { total: bank.questions.length, by_gear };
}
