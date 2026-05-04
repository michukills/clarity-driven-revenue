// P22.1 — Industry guardrails: vertical templates, diagnostic prompts,
// and policy helpers that enforce "no industry cross-over by default."
//
// This module is admin-only material. Templates and prompts must NEVER be
// rendered to clients verbatim. Use them to guide RGS-internal questioning,
// admin notes, and learning event generation.

import type { IndustryKey } from "@/lib/toolCatalog";

/** Industries treated as "active" for vertical seeding. `other` is intentionally excluded. */
export const ACTIVE_INDUSTRIES: ReadonlyArray<Exclude<IndustryKey, "other">> = [
  "trade_field_service",
  "retail",
  "restaurant",
  "mmj_cannabis",
  "general_service",
];

/** Industries that must never auto-feed cross-industry learning. */
export const REGULATED_INDUSTRIES: ReadonlySet<IndustryKey> = new Set([
  "mmj_cannabis",
]);

export interface IndustryProfileTemplate {
  industry: IndustryKey;
  label: string;
  revenue_streams: string[];
  lead_demand_sources: string[];
  conversion_bottlenecks: string[];
  operational_bottlenecks: string[];
  financial_visibility_risks: string[];
  owner_dependence_risks: string[];
  typical_evidence_sources: string[];
  /** Staffing / labor variables. */
  staffing_labor: string[];
  /** Customer experience / handoff variables. */
  customer_experience: string[];
  /** Capacity constraint variables. */
  capacity_constraints: string[];
  /** Margin / profitability drivers. */
  margin_profitability: string[];
  /** Industry-specific failure points. */
  industry_failure_points: string[];
  /** RGS Control System monitoring signals worth watching. */
  monitoring_signals: string[];
  /** Assumptions RGS must NOT make for this vertical. */
  forbidden_assumptions: string[];
}

export const INDUSTRY_PROFILE_TEMPLATES: Record<
  Exclude<IndustryKey, "other">,
  IndustryProfileTemplate
> = {
  trade_field_service: {
    industry: "trade_field_service",
    label: "Trades / Field Service",
    revenue_streams: ["service jobs", "recurring maintenance", "emergency calls", "warranty/callbacks"],
    lead_demand_sources: ["referrals", "Google Search Console / Local", "service-area ads", "past customers"],
    conversion_bottlenecks: [
      "slow quote follow-up",
      "owner-only approvals",
      "missing scope clarity",
      "scheduling friction",
    ],
    operational_bottlenecks: [
      "crew utilization",
      "dispatch conflicts",
      "job capacity vs demand",
      "SOP gaps",
    ],
    financial_visibility_risks: [
      "unbilled work",
      "AR aging",
      "job profitability not tracked per job",
    ],
    owner_dependence_risks: ["owner does final estimates", "owner approves every dispatch"],
    typical_evidence_sources: ["Jobber", "Housecall Pro", "ServiceTitan", "QuickBooks", "spreadsheets"],
    forbidden_assumptions: [
      "do not assume retail-style foot traffic",
      "do not apply restaurant table-turn logic",
      "do not apply regulated/cannabis compliance assumptions",
    ],
  },
  retail: {
    industry: "retail",
    label: "Retail",
    revenue_streams: ["in-store sales", "online sales", "promotions", "loyalty/repeat"],
    lead_demand_sources: [
      "foot traffic",
      "online traffic",
      "Meta Ads",
      "Google Analytics",
      "email/SMS campaigns",
    ],
    conversion_bottlenecks: [
      "low average order value",
      "weak repeat purchase rate",
      "promotion dependence",
      "abandoned carts",
    ],
    operational_bottlenecks: [
      "inventory turns",
      "sell-through",
      "shrink/loss",
      "staffing coverage at peak",
    ],
    financial_visibility_risks: [
      "margin visibility per SKU/category",
      "promotion ROI",
      "stockout vs overstock cost",
    ],
    owner_dependence_risks: ["owner runs all merchandising", "owner approves every promotion"],
    typical_evidence_sources: [
      "Square",
      "Stripe",
      "Shopify (if connected)",
      "QuickBooks",
      "Google Analytics",
    ],
    forbidden_assumptions: [
      "do not apply trade/field-service crew logic",
      "do not apply restaurant labor/food cost ratios",
      "do not apply regulated/cannabis compliance assumptions",
    ],
  },
  restaurant: {
    industry: "restaurant",
    label: "Restaurant",
    revenue_streams: ["dine-in", "takeout", "delivery", "catering"],
    lead_demand_sources: [
      "reservation channels",
      "delivery marketplaces",
      "Google Search / Maps",
      "Meta Ads",
      "repeat guests",
    ],
    conversion_bottlenecks: [
      "average ticket",
      "table turns",
      "service speed",
      "channel mix imbalance",
    ],
    operational_bottlenecks: [
      "labor cost %",
      "food cost %",
      "waste",
      "prep capacity",
      "front-of-house staffing",
    ],
    financial_visibility_risks: [
      "cash/settlement timing per channel",
      "menu item profitability",
      "vendor pricing drift",
    ],
    owner_dependence_risks: ["owner expedites every shift", "owner closes the books alone"],
    typical_evidence_sources: ["Square", "Stripe", "QuickBooks", "delivery dashboards"],
    forbidden_assumptions: [
      "do not apply retail SKU turn logic",
      "do not apply trade dispatch logic",
      "do not apply regulated/cannabis compliance assumptions",
    ],
  },
  mmj_cannabis: {
    industry: "mmj_cannabis",
    label: "Cannabis / MMJ / Rec",
    revenue_streams: ["in-store sales by category", "loyalty", "pre-orders / pickup"],
    lead_demand_sources: [
      "owned channels (compliance-bound)",
      "in-store traffic",
      "menu listings",
      "loyalty engagement",
    ],
    conversion_bottlenecks: [
      "basket size",
      "category mix",
      "regulated marketing limits",
      "menu/inventory accuracy",
    ],
    operational_bottlenecks: [
      "inventory traceability",
      "compliance-sensitive workflows",
      "cash/payment constraints",
      "staffing certifications",
    ],
    financial_visibility_risks: [
      "tax/regulatory pressure",
      "cash handling reconciliation",
      "vendor cost shifts",
    ],
    owner_dependence_risks: ["owner is the compliance officer", "owner reconciles cash alone"],
    typical_evidence_sources: ["POS exports", "compliance reports", "QuickBooks", "internal logs"],
    forbidden_assumptions: [
      "do not assume general retail ad channels are available",
      "do not assume restaurant-style table dynamics",
      "do not apply non-regulated payment assumptions",
      "RGS must NOT make legal or compliance claims",
      "do not export this vertical's specifics into cross-industry learning unless generalized and admin-approved",
    ],
  },
  general_service: {
    industry: "general_service",
    label: "General / Mixed business",
    revenue_streams: ["service engagements", "recurring contracts", "project work"],
    lead_demand_sources: ["referrals", "owned content", "search", "partner network"],
    conversion_bottlenecks: [
      "follow-up gaps",
      "scope ambiguity",
      "long sales cycle",
      "owner-only closing",
    ],
    operational_bottlenecks: ["capacity planning", "delivery consistency", "SOP gaps"],
    financial_visibility_risks: ["AR aging", "project profitability", "irregular cash"],
    owner_dependence_risks: ["owner sells, delivers, and bills"],
    typical_evidence_sources: ["QuickBooks", "HubSpot", "Salesforce", "Pipedrive", "spreadsheets"],
    forbidden_assumptions: [
      "do not apply retail/restaurant ratios",
      "do not apply regulated/cannabis assumptions",
    ],
  },
};

export interface IndustryDiagnosticPrompts {
  industry: IndustryKey;
  label: string;
  /** Things admins should consider when building diagnostic questions for this industry. */
  considerations: string[];
  /** Hard guardrails for this industry. */
  guardrails: string[];
}

export const INDUSTRY_DIAGNOSTIC_PROMPTS: Record<
  Exclude<IndustryKey, "other">,
  IndustryDiagnosticPrompts
> = {
  retail: {
    industry: "retail",
    label: "Retail",
    considerations: [
      "foot traffic / online traffic",
      "inventory turns",
      "average order value",
      "repeat purchase rate",
      "sell-through",
      "shrink / loss",
      "promotion dependence",
      "staffing coverage",
      "margin visibility",
    ],
    guardrails: [
      "do not import restaurant labor/food ratios",
      "do not import trade dispatch language",
      "do not import cannabis compliance language",
    ],
  },
  restaurant: {
    industry: "restaurant",
    label: "Restaurant",
    considerations: [
      "table turns / order volume",
      "average ticket",
      "labor cost",
      "food cost",
      "waste",
      "reservation / order channel mix",
      "service speed",
      "repeat guests",
      "cash / settlement timing",
    ],
    guardrails: [
      "do not import retail SKU turn metrics directly",
      "do not import trade crew utilization language",
      "do not import cannabis compliance language",
    ],
  },
  mmj_cannabis: {
    industry: "mmj_cannabis",
    label: "Cannabis / MMJ / Rec",
    considerations: [
      "compliance-sensitive workflows",
      "inventory traceability",
      "regulated marketing limits",
      "cash / payment constraints",
      "product mix",
      "customer retention",
      "basket size",
      "sell-through",
      "tax / regulatory pressure",
    ],
    guardrails: [
      "RGS must not make legal or compliance claims",
      "do not reuse cannabis-specific patterns in other industries",
      "do not import general retail ad-channel assumptions",
    ],
  },
  trade_field_service: {
    industry: "trade_field_service",
    label: "Trades / Field Service",
    considerations: [
      "leads",
      "quote follow-up",
      "close rate",
      "job capacity",
      "crew utilization",
      "AR",
      "owner approvals",
      "SOPs",
      "scheduling / dispatch",
      "job profitability",
    ],
    guardrails: [
      "do not import retail SKU/turn assumptions",
      "do not import restaurant labor/food cost ratios",
      "do not import cannabis compliance language",
    ],
  },
  general_service: {
    industry: "general_service",
    label: "General / Mixed business",
    considerations: [
      "lead source clarity",
      "follow-up cadence",
      "close rate",
      "delivery capacity",
      "AR",
      "owner approvals",
      "SOPs",
      "project / engagement profitability",
    ],
    guardrails: [
      "do not import retail/restaurant/cannabis-specific assumptions",
    ],
  },
};

/** Result of a guardrail policy decision. */
export interface GuardrailDecision {
  allowed: boolean;
  reason: string;
  warning?: string;
}

/**
 * Should industry-specific behavior (tools, learning, prompts, resources) be
 * applied for this customer? Restricted defaults when industry is missing /
 * unconfirmed / `other`.
 */
export function industryAccessDecision(input: {
  industry: IndustryKey | string | null | undefined;
  industryConfirmed: boolean;
}): GuardrailDecision {
  const ind = input.industry;
  if (!ind) return { allowed: false, reason: "industry_missing" };
  if (ind === "other") return { allowed: false, reason: "industry_other_restricted" };
  if (!input.industryConfirmed) {
    return {
      allowed: false,
      reason: "industry_unconfirmed",
      warning:
        "Industry-specific tools and learning are restricted until industry is confirmed.",
    };
  }
  if (ind === "mmj_cannabis") {
    return {
      allowed: true,
      reason: "industry_confirmed_regulated",
      warning:
        "Regulated industry: avoid cross-industry reuse unless generalized and admin-approved.",
    };
  }
  return { allowed: true, reason: "industry_confirmed" };
}

/**
 * Should an industry learning event be created for this outcome?
 * Same-industry learning requires a confirmed, real industry.
 */
export function sameIndustryLearningDecision(input: {
  industry: IndustryKey | string | null | undefined;
  industryConfirmed: boolean;
}): GuardrailDecision {
  const d = industryAccessDecision(input);
  if (!d.allowed) return d;
  return { allowed: true, reason: d.reason, warning: d.warning };
}

/**
 * Should a cross-industry learning event be created for this outcome?
 *
 * Rules:
 * - Industry must be confirmed and not `other`.
 * - The outcome must have been explicitly admin-approved as cross-industry-eligible
 *   (`contributesCrossIndustry === true`).
 * - MMJ/cannabis content must NEVER auto-feed cross-industry learning. It can
 *   only do so when an admin separately confirms it is generalized
 *   (`generalizedApproval === true`).
 */
export function crossIndustryLearningDecision(input: {
  industry: IndustryKey | string | null | undefined;
  industryConfirmed: boolean;
  contributesCrossIndustry: boolean;
  generalizedApproval?: boolean;
}): GuardrailDecision {
  if (!input.contributesCrossIndustry) {
    return { allowed: false, reason: "not_admin_approved_cross_industry" };
  }
  const base = industryAccessDecision(input);
  if (!base.allowed) return base;
  if (input.industry === "mmj_cannabis" && !input.generalizedApproval) {
    return {
      allowed: false,
      reason: "regulated_industry_requires_generalization",
      warning:
        "MMJ/cannabis outcomes must be generalized and explicitly approved before contributing to cross-industry learning.",
    };
  }
  return { allowed: true, reason: "cross_industry_admin_approved" };
}

/**
 * Should an industry-specific tool be exposed to a customer in industry X?
 * Used as an in-app belt-and-suspenders check on top of the SQL access RPC.
 */
export function industrySpecificToolAllowed(input: {
  toolIndustry: IndustryKey;
  customerIndustry: IndustryKey | string | null | undefined;
  industryConfirmed: boolean;
  hasClientGrantOverride?: boolean;
}): GuardrailDecision {
  if (input.hasClientGrantOverride) {
    return { allowed: true, reason: "override_granted" };
  }
  const base = industryAccessDecision({
    industry: input.customerIndustry,
    industryConfirmed: input.industryConfirmed,
  });
  if (!base.allowed) return base;
  if (input.toolIndustry !== input.customerIndustry) {
    return { allowed: false, reason: "industry_mismatch" };
  }
  return { allowed: true, reason: "industry_match" };
}

/** Anonymize/strip text before promoting to cross-industry learning. */
export function anonymizeForCrossIndustry(text: string | null | undefined): string {
  if (!text) return "";
  // Remove obvious customer-name patterns: "<Name>'s", emails, phone-like numbers.
  return text
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[redacted-email]")
    .replace(/\b\+?\d[\d\s().-]{6,}\d\b/g, "[redacted-phone]")
    .replace(/\b([A-Z][a-z]+)('s|s')\b/g, "[customer]")
    .trim();
}

/** Map of industry → default safe set of tool_keys to enable. */
export const DEFAULT_INDUSTRY_TOOL_ACCESS: Record<
  Exclude<IndustryKey, "other">,
  string[]
> = (() => {
  const CORE_SAFE = [
    "scorecard",
    "rgs_stability_scorecard",
    "priority_tasks",
    "client_service_requests",
    "reports_and_reviews",
    "evidence_uploads",
    "weekly_alignment_system",
    "implementation_foundation_system",
    "implementation_command_tracker",
  ];
  // Tracking tools enabled where commonly relevant; MMJ excludes RCC by default
  // (cannabis cash-handling makes generic RCC math risky without admin review).
  const TRACKING = [
    "revenue_tracker",
    "revenue_control_center",
    "revenue_risk_monitor",
    "quickbooks_sync_health",
  ];
  return {
    trade_field_service: [...CORE_SAFE, ...TRACKING],
    retail: [...CORE_SAFE, ...TRACKING],
    restaurant: [...CORE_SAFE, ...TRACKING],
    general_service: [...CORE_SAFE, ...TRACKING],
    mmj_cannabis: [...CORE_SAFE, "quickbooks_sync_health"],
  };
})();
