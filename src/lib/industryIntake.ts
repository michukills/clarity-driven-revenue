// P32.2 — Intake industry identification + mismatch detection.
//
// Conservative on purpose:
//   * mapIntakeToIndustry returns { industry, confident } — only confident
//     when the intake answers cleanly point to ONE supported industry.
//   * If unclear, returns confident=false so callers leave the customer
//     unconfirmed / needs_industry_review.
//   * Business name is NEVER an input; we never infer from it.
//   * The mapping is deterministic and side-effect free.

import type { IndustryCategory } from "@/lib/priorityEngine/types";

export type IntakeBusinessModel =
  | "appointments_jobs"
  | "in_store_orders"
  | "restaurant_orders"
  | "regulated_retail_mmj"
  | "general_services"
  | "online_only"
  | "other_unsure";

export interface IntakeAnswers {
  business_model?: IntakeBusinessModel | null;
  is_regulated_mmj?: boolean | null;
  describe_what_you_sell?: string | null; // free text — used only as a soft signal
}

export interface IntakeIndustryResult {
  industry: IndustryCategory | null;
  confident: boolean;
  needs_review: boolean;
  reason: string;
}

/**
 * Map intake answers to an industry. Conservative — returns
 * needs_review=true unless the answers clearly indicate one supported lane.
 */
export function mapIntakeToIndustry(a: IntakeAnswers): IntakeIndustryResult {
  // MMJ/cannabis trumps everything — it's regulated and must never be
  // silently buried under another industry.
  if (a.is_regulated_mmj === true || a.business_model === "regulated_retail_mmj") {
    return {
      industry: "mmj_cannabis",
      confident: true,
      needs_review: true, // regulated industries always require admin verification
      reason: "Intake reported regulated MMJ/cannabis. Admin must verify before tools unlock.",
    };
  }

  switch (a.business_model) {
    case "appointments_jobs":
      return {
        industry: "trade_field_service",
        confident: true,
        needs_review: false,
        reason: "Intake indicates appointment/job-based delivery.",
      };
    case "in_store_orders":
      return {
        industry: "retail",
        confident: true,
        needs_review: false,
        reason: "Intake indicates in-store retail orders.",
      };
    case "restaurant_orders":
      return {
        industry: "restaurant",
        confident: true,
        needs_review: false,
        reason: "Intake indicates restaurant orders.",
      };
    case "general_services":
      return {
        industry: "general_service",
        confident: true,
        needs_review: false,
        reason: "Intake indicates general services delivered to clients.",
      };
    case "online_only":
      // Online-only could be retail, services, or other — leave for review.
      return {
        industry: "other",
        confident: false,
        needs_review: true,
        reason: "Intake indicates online-only business — admin must classify.",
      };
    case "other_unsure":
    default:
      return {
        industry: "other",
        confident: false,
        needs_review: true,
        reason: "Intake answers do not clearly identify an industry.",
      };
  }
}

// ---------------------------------------------------------------------------
// Snapshot-vs-industry mismatch detection
// ---------------------------------------------------------------------------

export interface MismatchInputs {
  industry: IndustryCategory | null | undefined;
  what_business_does?: string | null;
  products_services?: string | null;
  revenue_model?: string | null;
  operating_model?: string | null;
}

export interface MismatchResult {
  mismatch: boolean;
  message: string | null;
  suggested_industries: IndustryCategory[];
}

const RESTAURANT_HINTS = ["menu", "kitchen", "dine", "diner", "café", "cafe", "restaurant", "bar &"];
const RETAIL_HINTS = ["inventory", "sku", "shelf", "pos system", "point of sale", "boutique", "store front", "storefront"];
const TRADE_HINTS = ["dispatch", "crew", "job site", "field tech", "service truck", "hvac", "plumb", "electric", "roofing"];
const LEGAL_PROF_HINTS = ["law firm", "attorney", "legal services", "consult", "accountant", "cpa firm", "agency"];
const MMJ_HINTS = ["cannabis", "marijuana", "dispensary", "mmj", "thc", "cbd"];

function containsAny(haystack: string, needles: string[]): boolean {
  const h = haystack.toLowerCase();
  return needles.some((n) => h.includes(n));
}

/**
 * Detect a possible mismatch between the assigned industry and recorded
 * snapshot evidence. Conservative: returns mismatch=true only when the
 * recorded language CLEARLY points elsewhere. Never auto-changes anything.
 */
export function detectIndustryMismatch(input: MismatchInputs): MismatchResult {
  const text = [
    input.what_business_does ?? "",
    input.products_services ?? "",
    input.revenue_model ?? "",
    input.operating_model ?? "",
  ]
    .filter(Boolean)
    .join(" \n ");
  if (!text.trim()) {
    return { mismatch: false, message: null, suggested_industries: [] };
  }

  const ind = input.industry ?? null;
  const hits: IndustryCategory[] = [];
  if (containsAny(text, MMJ_HINTS)) hits.push("mmj_cannabis");
  if (containsAny(text, RESTAURANT_HINTS)) hits.push("restaurant");
  if (containsAny(text, RETAIL_HINTS)) hits.push("retail");
  if (containsAny(text, TRADE_HINTS)) hits.push("trade_field_service");
  if (containsAny(text, LEGAL_PROF_HINTS)) hits.push("general_service");

  // MMJ wording with non-MMJ industry → always flag.
  if (hits.includes("mmj_cannabis") && ind !== "mmj_cannabis") {
    return {
      mismatch: true,
      message:
        "Recorded data mentions MMJ/cannabis but the assigned industry is not MMJ/Cannabis. Possible industry mismatch — verify before enabling industry-specific tools or learning.",
      suggested_industries: ["mmj_cannabis"],
    };
  }

  if (!ind || ind === "other") {
    return { mismatch: false, message: null, suggested_industries: [] };
  }

  // If recorded data clearly points to a different supported industry, flag.
  const conflicting = hits.filter((h) => h !== ind && h !== "mmj_cannabis");
  if (conflicting.length > 0 && !hits.includes(ind)) {
    return {
      mismatch: true,
      message:
        "Possible industry mismatch. Verify before enabling industry-specific tools or learning.",
      suggested_industries: Array.from(new Set(conflicting)),
    };
  }
  return { mismatch: false, message: null, suggested_industries: [] };
}