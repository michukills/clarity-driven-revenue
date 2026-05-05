/**
 * E1 — Full Lifecycle Demo Dataset + Multi-Industry Client Coverage.
 *
 * Declarative registry of demo/showcase clients that exercise the RGS
 * OS across every supported industry / tool-depth profile and across
 * the full client lifecycle from access-pending through a 5-year RGS
 * Control System relationship.
 *
 * SAFETY:
 *  - Every spec is synthetic. All emails use `@demo.rgs.local` or
 *    `@showcase.rgs.local`.
 *  - Every spec sets `is_demo_account = true` and is excluded from
 *    global learning + public proof surfaces.
 *  - Cannabis / MMJ profile uses operational visibility / documentation
 *    readiness language only — never healthcare, HIPAA, patient care,
 *    medical billing, or clinical workflow terms.
 *  - No fake testimonials, ROI claims, guaranteed outcomes, or
 *    compliance certifications.
 *  - This module declares specs only — the idempotent seed runner in
 *    `e1LifecycleDemoSeed.ts` is admin-only.
 */

export type E1IndustryKey =
  | "general_small_business"
  | "trades_services"
  | "restaurant_food_service"
  | "retail"
  | "cannabis_mmj_mmc"
  | "professional_services"
  | "ecommerce_online_retail";

/**
 * Lifecycle stages mirror the existing customer/journey vocabulary used
 * across admin and portal surfaces. Mapping to the actual customer
 * `stage` / `lifecycle_state` columns happens in the seed runner.
 */
export type E1LifecycleStage =
  | "access_pending"
  | "interview_in_progress"
  | "diagnostic_tools_in_progress"
  | "ready_for_review"
  | "clarification_needed"
  | "report_ready"
  | "diagnostic_complete"
  | "implementation_offered"
  | "implementation_active"
  | "implementation_complete"
  | "rcc_active"
  | "long_term_five_year";

export interface E1ScorecardSnapshot {
  /** Total deterministic score, 0–1000. */
  total: number;
  /** Five gears, each 0–200. */
  gears: {
    demand_generation: number;
    revenue_conversion: number;
    operational_efficiency: number;
    financial_visibility: number;
    owner_independence: number;
  };
  /** Approximate ISO date or relative-day offset (negative = past). */
  daysAgo: number;
}

export interface E1DemoSpec {
  /** Stable identifier; also used as part of seed dedupe keys. */
  key: string;
  industry: E1IndustryKey;
  lifecycle: E1LifecycleStage;
  /** Demo / showcase suffix — never any other domain. */
  email: string;
  business_name: string;
  full_name: string;
  /** Short, neutral framing of what this profile demonstrates. */
  purpose: string;
  /**
   * Plain-language evidence themes tied to industry/tool-depth
   * registries. Used by the report/repair-map seed surface — never
   * shown publicly.
   */
  evidence_themes: string[];
  /** Scorecard history (most recent first). At least one entry. */
  scorecard_history: E1ScorecardSnapshot[];
  /** Optional admin-only operating notes. */
  admin_notes?: string;
  /** Surfacing flags. */
  has_report_draft?: boolean;
  has_approved_report?: boolean;
  needs_clarification?: boolean;
  rcc_active?: boolean;
  monthly_review_active?: boolean;
}

const DEMO = "@demo.rgs.local";

function gears(
  dg: number,
  rc: number,
  oe: number,
  fv: number,
  oi: number,
): E1ScorecardSnapshot["gears"] {
  return {
    demand_generation: dg,
    revenue_conversion: rc,
    operational_efficiency: oe,
    financial_visibility: fv,
    owner_independence: oi,
  };
}

function snap(daysAgo: number, g: E1ScorecardSnapshot["gears"]): E1ScorecardSnapshot {
  const total =
    g.demand_generation +
    g.revenue_conversion +
    g.operational_efficiency +
    g.financial_visibility +
    g.owner_independence;
  return { daysAgo, gears: g, total };
}

/**
 * Seven required lifecycle demo profiles — one per industry / tool-depth
 * profile. These are intentionally independent of the existing
 * `showcaseSeed` (trades-only scenarios) and `demoSeed` (RCC-only
 * scenarios); together the three seeders give full multi-industry +
 * full lifecycle coverage.
 */
export const E1_LIFECYCLE_DEMO_SPECS: E1DemoSpec[] = [
  {
    key: "general_five_year",
    industry: "general_small_business",
    lifecycle: "long_term_five_year",
    email: `general.fiveyear${DEMO}`,
    business_name: "Demo General — Five Year Stability Client",
    full_name: "Pat Avery (demo)",
    purpose:
      "Long-term mature client used to test scorecard history, monthly review rhythm, and RGS Control System visibility over a 5-year relationship.",
    evidence_themes: [
      "stable revenue mix across recurring + project work",
      "owner moved out of daily approvals",
      "monthly review rhythm sustained",
      "renewal risk: low",
    ],
    scorecard_history: [
      snap(-30, gears(160, 165, 170, 165, 160)),
      snap(-365, gears(150, 155, 160, 155, 150)),
      snap(-365 * 2, gears(140, 145, 150, 140, 135)),
      snap(-365 * 3, gears(125, 130, 135, 120, 110)),
      snap(-365 * 4, gears(110, 115, 120, 100, 95)),
      snap(-365 * 5, gears(95, 100, 105, 85, 75)),
    ],
    admin_notes:
      "Five-year demo client — used for long-term lifecycle scenarios. Synthetic only.",
    has_approved_report: true,
    rcc_active: true,
    monthly_review_active: true,
  },
  {
    key: "trades_diagnostic",
    industry: "trades_services",
    lifecycle: "diagnostic_tools_in_progress",
    email: `trades.diagnostic${DEMO}`,
    business_name: "Demo Trades — Intake to Diagnostic Client",
    full_name: "Sam Rivera (demo)",
    purpose:
      "Early-stage trades client used to test access approval, Owner Diagnostic Interview, and personalized diagnostic tool sequence.",
    evidence_themes: [
      "missed call recovery weak",
      "quote turnaround inconsistent",
      "job costing partial",
      "callback / rework not tracked",
      "AR aging unknown",
      "owner is the scheduler",
    ],
    scorecard_history: [snap(-7, gears(110, 95, 130, 80, 70))],
    admin_notes:
      "Trades demo — exercises early lifecycle. Owner Interview submitted; tools in progress.",
  },
  {
    key: "restaurant_clarification",
    industry: "restaurant_food_service",
    lifecycle: "clarification_needed",
    email: `restaurant.clarification${DEMO}`,
    business_name: "Demo Restaurant — Clarification Needed Client",
    full_name: "Jordan Park (demo)",
    purpose:
      "Restaurant demo used to test admin clarification request workflow and client-visible clarification state.",
    evidence_themes: [
      "prime cost unknown",
      "food cost partially tracked",
      "labor scheduled by habit",
      "waste / spoilage not logged",
      "daily break-even unknown",
      "manager independence partial",
    ],
    scorecard_history: [snap(-3, gears(115, 105, 110, 70, 75))],
    admin_notes:
      "Restaurant demo — admin requested clarification on prime cost evidence.",
    needs_clarification: true,
  },
  {
    key: "retail_report_ready",
    industry: "retail",
    lifecycle: "report_ready",
    email: `retail.reportready${DEMO}`,
    business_name: "Demo Retail — Report Ready Client",
    full_name: "Avery Chen (demo)",
    purpose:
      "Retail demo used to test approved-report visibility, Stability Snapshot, Priority Repair Map, and signed-URL PDF path.",
    evidence_themes: [
      "inventory turnover unknown",
      "slow-moving SKUs not flagged",
      "discount dependency",
      "category margin gaps",
      "shrinkage not tracked",
      "owner buying by instinct",
    ],
    scorecard_history: [snap(-1, gears(120, 110, 115, 90, 95))],
    admin_notes:
      "Retail demo — approved client-visible report; PDF artifact stored privately if seeded.",
    has_report_draft: true,
    has_approved_report: true,
  },
  {
    key: "cannabis_visibility",
    industry: "cannabis_mmj_mmc",
    lifecycle: "ready_for_review",
    email: `cannabis.visibility${DEMO}`,
    business_name: "Demo Cannabis — Operational Visibility Client",
    full_name: "Casey Morgan (demo)",
    purpose:
      "Cannabis / dispensary demo used to test operational visibility and documentation readiness language. State-specific rules may apply; qualified legal/compliance/CPA review may be required. Not legal advice. Not compliance certification. Not healthcare.",
    evidence_themes: [
      "inventory variance not reconciled daily",
      "cash handling documentation incomplete",
      "evidence vault / document readiness gaps",
      "ID / check-in process visibility partial",
      "license / renewal tracking by memory",
      "discount dependency",
      "budtender consistency varies",
    ],
    scorecard_history: [snap(-2, gears(125, 110, 115, 85, 80))],
    admin_notes:
      "Cannabis dispensary operations only. Operational visibility / documentation readiness — not legal, compliance, or healthcare certification.",
    has_report_draft: true,
  },
  {
    key: "pro_services_scope",
    industry: "professional_services",
    lifecycle: "implementation_offered",
    email: `pro.scope${DEMO}`,
    business_name: "Demo Professional Services — Scope Control Client",
    full_name: "Riley Quinn (demo)",
    purpose:
      "Internal tool-depth profile demo for professional services. Tests scope creep, delivery margin, and owner-as-bottleneck signals — not a public first-class industry yet.",
    evidence_themes: [
      "ICP unclear",
      "referral concentration high",
      "proposals slow",
      "scope boundaries weak",
      "work started before signed agreement / payment terms",
      "service-line profitability unknown",
      "owner is the delivery bottleneck",
    ],
    scorecard_history: [snap(-5, gears(115, 120, 110, 95, 70))],
    admin_notes:
      "Professional services tool-depth profile — internal coverage. Diagnostic complete, implementation offered.",
    has_approved_report: true,
  },
  {
    key: "ecommerce_control",
    industry: "ecommerce_online_retail",
    lifecycle: "rcc_active",
    email: `ecommerce.control${DEMO}`,
    business_name: "Demo Ecomm — Control Monitoring Client",
    full_name: "Drew Patel (demo)",
    purpose:
      "E-commerce tool-depth profile demo. Tests RGS Control System ongoing monitoring with e-commerce metrics — internal profile, not a public first-class industry yet.",
    evidence_themes: [
      "CAC tracked",
      "MER tracked",
      "platform / channel concentration risk",
      "abandoned cart recovery partial",
      "AOV trend visibility",
      "order-to-ship time inconsistent",
      "returns by product / reason not analyzed",
      "true gross margin after shipping / fees / returns unclear",
      "ad payback period unknown",
      "fulfillment owner-dependent",
    ],
    scorecard_history: [
      snap(-30, gears(140, 145, 130, 120, 110)),
      snap(-180, gears(125, 130, 115, 100, 90)),
      snap(-365, gears(110, 115, 100, 85, 75)),
    ],
    admin_notes:
      "E-commerce tool-depth profile — RGS Control System active; monthly review rhythm running.",
    has_approved_report: true,
    rcc_active: true,
    monthly_review_active: true,
  },
];

/** All emails seeded by E1. Used by the reset helper for scoped deletes. */
export const E1_DEMO_EMAILS: string[] = E1_LIFECYCLE_DEMO_SPECS.map((s) => s.email);

/** Required industry coverage. */
export const E1_REQUIRED_INDUSTRIES: E1IndustryKey[] = [
  "general_small_business",
  "trades_services",
  "restaurant_food_service",
  "retail",
  "cannabis_mmj_mmc",
  "professional_services",
  "ecommerce_online_retail",
];

/** Required lifecycle states. */
export const E1_REQUIRED_LIFECYCLE_STATES: E1LifecycleStage[] = [
  "access_pending",
  "interview_in_progress",
  "diagnostic_tools_in_progress",
  "ready_for_review",
  "clarification_needed",
  "report_ready",
  "diagnostic_complete",
  "implementation_offered",
  "implementation_active",
  "implementation_complete",
  "rcc_active",
  "long_term_five_year",
];

/**
 * Helper: validates a spec's scorecard history is in 0–1000 / 0–200
 * range. Used by tests.
 */
export function validateScorecardHistory(spec: E1DemoSpec): string[] {
  const errors: string[] = [];
  for (const s of spec.scorecard_history) {
    if (s.total < 0 || s.total > 1000) errors.push(`${spec.key}: total ${s.total} out of 0–1000`);
    for (const [k, v] of Object.entries(s.gears)) {
      if (v < 0 || v > 200) errors.push(`${spec.key}: gear ${k}=${v} out of 0–200`);
    }
    const sum =
      s.gears.demand_generation +
      s.gears.revenue_conversion +
      s.gears.operational_efficiency +
      s.gears.financial_visibility +
      s.gears.owner_independence;
    if (sum !== s.total) errors.push(`${spec.key}: gear sum ${sum} != total ${s.total}`);
  }
  return errors;
}