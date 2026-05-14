/**
 * P93E-E2G-P1.5 — Industry Diagnostic Depth Standard.
 *
 * Reusable rules + helpers that every industry bank must satisfy before it
 * can be promoted from `starter_bank` → `full_depth_ready`. This is the
 * enforceable contract behind the RGS 120/100 live-customer readiness goal:
 * no flattening, no generic SaaS, no shallow questionnaires, no fake proof,
 * no unsafe guarantees, and no client-leaking admin-only fields.
 *
 * Consumers:
 *  - tests (industryDiagnosticBanks.test.ts) enforce the rules at build time
 *  - admin UI surfaces honest maturity status using {@link auditBank}
 *  - future report/repair-map builders consume {@link FindingCalibration}
 */
import {
  FULL_DEPTH_GEAR_MINIMUM,
  FULL_DEPTH_TOTAL_MINIMUM,
  GEAR_LABELS,
  INDUSTRY_MATURITY,
  type DiagnosticQuestion,
  type GearKey,
  type IndustryKey,
  type IndustryMaturity,
  type IndustryQuestionBank,
} from "./types";
import { summarizeBank } from "./types";

/** The 5 RGS Gears every full-depth bank must inspect. */
export const REQUIRED_GEARS: GearKey[] = [
  "demand",
  "sales",
  "operations",
  "financial",
  "owner_independence",
];

/**
 * Phrases that must NEVER appear in any industry bank, helper text, or
 * client-safe finding language. RGS does not promise outcomes, certify
 * compliance, or provide legal/tax/accounting/fiduciary guidance.
 */
export const UNSAFE_PHRASES: readonly string[] = [
  "guaranteed",
  "guarantee revenue",
  "guarantee profit",
  "guarantee growth",
  "guarantee leads",
  "guarantee roi",
  "compliance certification",
  "certified compliant",
  "legal advice",
  "tax advice",
  "accounting advice",
  "fiduciary advice",
  "valuation opinion",
  "double your revenue",
  "10x your",
  "guaranteed roi",
  "live-synced" /* unless an integration actually exists */,
];

/**
 * Generic findings the depth standard rejects. Banks should produce
 * industry-specific signals (e.g. "Dispatch leakage", "Prime cost gap"),
 * not platitudes.
 */
export const GENERIC_FINDING_BLOCKLIST: readonly string[] = [
  "improve marketing",
  "track your numbers",
  "document processes",
  "train staff",
  "follow up better",
];

export interface BankAuditIssue {
  severity: "error" | "warn";
  code: string;
  message: string;
}

export interface BankAuditResult {
  industry: IndustryKey;
  declared_maturity: IndustryMaturity;
  meets_full_depth: boolean;
  total_questions: number;
  missing_gear_coverage: GearKey[];
  gear_gaps: { gear: GearKey; have: number; need: number }[];
  unsafe_hits: { question_key: string; phrase: string }[];
  issues: BankAuditIssue[];
}

/**
 * Audit a bank against the depth standard. Pure function — used by tests
 * and the admin UI badge.
 */
export function auditBank(bank: IndustryQuestionBank): BankAuditResult {
  const declared = INDUSTRY_MATURITY[bank.industry];
  const summary = summarizeBank(bank);
  const issues: BankAuditIssue[] = [];

  // Gear coverage
  const missing_gear_coverage: GearKey[] = [];
  const gear_gaps: { gear: GearKey; have: number; need: number }[] = [];
  for (const gear of REQUIRED_GEARS) {
    const have = summary.by_gear[gear] ?? 0;
    if (have === 0) missing_gear_coverage.push(gear);
    const need = FULL_DEPTH_GEAR_MINIMUM[gear];
    if (have < need) gear_gaps.push({ gear, have, need });
  }

  // Unsafe phrase scan
  const unsafe_hits: { question_key: string; phrase: string }[] = [];
  for (const q of bank.questions) {
    const blob = [
      q.plain_language_question,
      q.helper_text ?? "",
      q.business_term ?? "",
      q.source_of_truth_guidance ?? "",
      q.evidence_prompt ?? "",
      // admin_only_notes are intentionally excluded — they're internal and may
      // legitimately reference what a phrase "must not" claim.
    ]
      .join(" ")
      .toLowerCase();
    for (const phrase of UNSAFE_PHRASES) {
      if (blob.includes(phrase)) {
        unsafe_hits.push({ question_key: q.key, phrase });
      }
    }
  }

  for (const hit of unsafe_hits) {
    issues.push({
      severity: "error",
      code: "unsafe_language",
      message: `Question ${hit.question_key} contains unsafe phrase: "${hit.phrase}"`,
    });
  }

  const meets_full_depth =
    summary.total >= FULL_DEPTH_TOTAL_MINIMUM &&
    gear_gaps.length === 0 &&
    unsafe_hits.length === 0;

  // Maturity honesty: never declare > starter_bank without meeting the bar.
  const promoted = declared !== "starter_bank";
  if (promoted && !meets_full_depth) {
    issues.push({
      severity: "error",
      code: "maturity_overclaim",
      message: `Bank ${bank.industry} declared "${declared}" but does not meet full-depth thresholds (` +
        `total=${summary.total}/${FULL_DEPTH_TOTAL_MINIMUM}, gaps=${gear_gaps
          .map((g) => `${GEAR_LABELS[g.gear]} ${g.have}/${g.need}`)
          .join(", ") || "none"}).`,
    });
  }

  // Cannabis must always carry the safety disclaimer.
  if (bank.industry === "cannabis_mmj_dispensary" && !bank.disclaimer) {
    issues.push({
      severity: "error",
      code: "missing_cannabis_disclaimer",
      message: "Cannabis bank must always carry the safety disclaimer.",
    });
  }

  return {
    industry: bank.industry,
    declared_maturity: declared,
    meets_full_depth,
    total_questions: summary.total,
    missing_gear_coverage,
    gear_gaps,
    unsafe_hits,
    issues,
  };
}

/**
 * Strip admin-only fields from a question for any future client-safe helper
 * output. Use this whenever a question (or finding) might leave the admin
 * boundary. Today the admin runner is server-gated by RLS, but this helper
 * is the contract that future report/Repair-Map builders must call.
 */
export function toClientSafeQuestion(q: DiagnosticQuestion): Omit<DiagnosticQuestion, "admin_only_notes"> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { admin_only_notes, ...safe } = q;
  return safe;
}

/**
 * Calibration shape downstream report/Repair-Map builders will consume.
 * This is the structure each industry bank must eventually hydrate so reports
 * feel like premium business inspection findings, not generic AI advice.
 *
 * NOTE: This pass establishes the contract. Banks are NOT required to ship
 * findings yet — that comes in each industry's full-depth pass.
 */
export interface FindingCalibration {
  /** Stable key — namespaced like `trades.dispatch_leakage`. */
  key: string;
  industry: IndustryKey;
  gear: GearKey;
  /** Premium, industry-specific finding title (no platitudes). */
  finding_title: string;
  /** Plain-English explanation of why this matters to the owner. */
  why_it_matters: string;
  /** Evidence that supports the finding when present. */
  evidence_supports: string[];
  /** Evidence that, when missing, lowers confidence. */
  evidence_missing_means: string;
  /** Confidence anchor when evidence is owner-estimated only. */
  confidence_floor: "low" | "medium";
  /** Business risk category — feeds Repair Map severity. */
  business_risk: "cash" | "control" | "owner_dependency" | "growth_drag" | "compliance_visibility";
  /** Owner-independence lift if repaired. */
  owner_independence_lift: "none" | "low" | "medium" | "high";
  /** Cash/control impact band. */
  cash_control_impact: "low" | "medium" | "high";
  /** Suggested Repair-Map trigger key. */
  repair_map_trigger?: string;
  /** Client-safe explanation surfaced in reports. */
  client_safe_explanation: string;
  /** Admin-only interpretation note — never leaves the admin boundary. */
  admin_only_interpretation?: string;
}

/** Validate calibrations don't carry unsafe language. */
export function auditCalibration(c: FindingCalibration): BankAuditIssue[] {
  const issues: BankAuditIssue[] = [];
  const blob = [c.finding_title, c.why_it_matters, c.client_safe_explanation, c.evidence_missing_means]
    .join(" ")
    .toLowerCase();
  for (const phrase of UNSAFE_PHRASES) {
    if (blob.includes(phrase)) {
      issues.push({
        severity: "error",
        code: "unsafe_language",
        message: `Calibration ${c.key} contains unsafe phrase: "${phrase}"`,
      });
    }
  }
  for (const generic of GENERIC_FINDING_BLOCKLIST) {
    if (c.finding_title.toLowerCase().includes(generic)) {
      issues.push({
        severity: "error",
        code: "generic_finding",
        message: `Calibration ${c.key} uses blocklisted generic finding "${generic}".`,
      });
    }
  }
  return issues;
}
