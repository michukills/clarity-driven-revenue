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
    revenue_streams: [
      "scheduled service jobs",
      "emergency / after-hours calls",
      "recurring maintenance plans",
      "warranty / callback work",
      "installation / replacement projects",
      "service add-ons and upsells",
      "diagnostic / trip fees",
      "parts and materials markup",
      "membership / service agreements",
      "seasonal demand spikes",
      "commercial vs residential mix",
      "referral partner work",
    ],
    lead_demand_sources: [
      "organic search",
      "Google Business Profile",
      "Google Search Console / Local",
      "map pack visibility",
      "service-area ads",
      "paid search",
      "call tracking inbound",
      "website quote requests",
      "referrals",
      "repeat / past customers",
      "review platforms",
      "Nextdoor / local community",
      "vendor / supplier referrals",
      "direct traffic",
      "signage and vehicle wraps",
    ],
    conversion_bottlenecks: [
      "slow lead response time",
      "quote follow-up gaps",
      "estimate-to-close rate",
      "owner-only approvals",
      "missing scope clarity",
      "phone answer rate",
      "appointment booking friction",
      "pricing objections",
      "proposal/estimate clarity",
      "scheduling friction",
      "missed call recovery",
    ],
    operational_bottlenecks: [
      "dispatch conflicts",
      "crew / technician utilization",
      "job capacity vs demand",
      "parts / material availability",
      "rework and callbacks",
      "SOP coverage gaps",
      "field handoff quality",
      "duplicate manual entry",
      "emergency work disrupting scheduled work",
      "vehicle / truck readiness",
      "status update consistency",
      "exception handling",
    ],
    financial_visibility_risks: [
      "unbilled work",
      "AR aging",
      "job profitability not tracked per job",
      "labor cost per job",
      "material cost variance",
      "service-area profitability blind spots",
      "discount leakage",
      "warranty / callback cost",
      "cash flow timing",
      "reconciliation cadence",
      "budget vs actual",
    ],
    owner_dependence_risks: [
      "owner does final estimates",
      "owner approves every dispatch",
      "owner handles every escalation",
      "owner controls pricing",
      "owner is the only closer",
      "owner-only software access",
      "owner manages vendor ordering",
      "owner is the only trainer",
      "owner performs manual reporting",
      "owner holds undocumented process knowledge",
    ],
    typical_evidence_sources: [
      "Jobber",
      "Housecall Pro",
      "ServiceTitan",
      "QuickBooks",
      "Xero",
      "call tracking",
      "Google Business Profile",
      "Google Search Console",
      "Google Analytics",
      "spreadsheets",
      "bank statements",
    ],
    staffing_labor: [
      "technician utilization",
      "role clarity",
      "training completion",
      "certifications / licensing",
      "overtime",
      "labor percentage",
      "cross-training coverage",
      "turnover",
      "onboarding time",
      "manager readiness",
    ],
    customer_experience: [
      "lead inquiry response",
      "estimate clarity",
      "appointment reminders",
      "on-the-way / status updates",
      "post-job follow-up",
      "review request process",
      "complaint handling",
      "callback / rework handling",
      "expectation setting",
    ],
    capacity_constraints: [
      "max jobs per day",
      "peak season demand spikes",
      "technician capacity",
      "owner capacity",
      "vehicle capacity",
      "service-area drive time",
      "appointment availability",
      "vendor lead times",
    ],
    margin_profitability: [
      "job-level gross margin",
      "service line margin",
      "callback / rework cost",
      "labor cost",
      "material / parts cost",
      "discount leakage",
      "price increase readiness",
      "service-area profitability",
    ],
    industry_failure_points: [
      "quote follow-up slipping",
      "dispatch conflicts",
      "callback / rework rate",
      "parts unavailable on-site",
      "unbilled work",
      "job costing gaps",
      "owner-only estimating",
      "service-area profitability blind spots",
      "emergency work disrupting scheduled work",
    ],
    monitoring_signals: [
      "estimate close rate",
      "booked vs completed jobs",
      "callback / rework rate",
      "job profitability",
      "technician utilization",
      "AR aging",
      "unbilled work",
      "service-area profitability",
      "lead response time",
      "review velocity",
    ],
    forbidden_assumptions: [
      "do not assume retail-style foot traffic",
      "do not apply restaurant table-turn logic",
      "do not apply regulated/cannabis compliance assumptions",
    ],
  },
  retail: {
    industry: "retail",
    label: "Retail",
    revenue_streams: [
      "in-store sales by category",
      "online / ecommerce sales",
      "promotional / discount sales",
      "loyalty / repeat purchases",
      "gift cards",
      "buy-online-pickup-in-store",
      "wholesale / B2B orders",
      "marketplace sales",
      "seasonal / holiday spikes",
      "high-margin add-ons",
      "bundles and kits",
      "subscription / replenishment where relevant",
    ],
    lead_demand_sources: [
      "foot traffic",
      "organic search",
      "Google Business Profile",
      "Google Search Console",
      "Google Analytics ecommerce traffic",
      "paid search",
      "Meta Ads",
      "social media",
      "email list",
      "SMS list",
      "loyalty program",
      "review platforms",
      "marketplace visibility",
      "local partnerships and events",
      "signage and window displays",
    ],
    conversion_bottlenecks: [
      "low average order value",
      "weak repeat purchase rate",
      "promotion dependence",
      "abandoned carts",
      "checkout / register friction",
      "out-of-stock at point of sale",
      "missing upsell / cross-sell",
      "wait time at checkout",
      "weak online product detail",
      "review / social proof gaps",
    ],
    operational_bottlenecks: [
      "inventory turns",
      "sell-through",
      "shrink / loss",
      "staffing coverage at peak",
      "receiving / restock workflow",
      "merchandising consistency",
      "ecommerce / POS sync",
      "return / refund workflow",
      "vendor ordering cadence (retail)",
      "pricing accuracy",
      "retail exception handling",
    ],
    financial_visibility_risks: [
      "margin visibility per SKU / category",
      "promotion ROI",
      "stockout vs overstock cost",
      "shrink",
      "discount leakage",
      "vendor cost drift",
      "payment processing fees",
      "ecommerce platform fees",
      "cash handling variance",
      "AR (B2B)",
      "reconciliation cadence",
    ],
    owner_dependence_risks: [
      "owner runs all merchandising",
      "owner approves every promotion",
      "owner manages vendor ordering",
      "owner controls all pricing",
      "owner-only POS access",
      "owner does all reconciliation",
      "owner is the only trainer",
      "owner manages all returns",
    ],
    typical_evidence_sources: [
      "Square",
      "Stripe",
      "PayPal",
      "Shopify (if connected)",
      "QuickBooks",
      "Xero",
      "Google Analytics",
      "Google Search Console",
      "Google Business Profile",
      "Meta Ads",
      "inventory system",
      "spreadsheets",
    ],
    staffing_labor: [
      "shift coverage at peak",
      "labor percentage",
      "role clarity",
      "training completion",
      "cross-training",
      "turnover",
      "onboarding time",
      "manager readiness",
      "task ownership",
      "tool / SOP adoption",
    ],
    customer_experience: [
      "greet / acknowledgement consistency",
      "wait time at checkout",
      "stock availability",
      "return / refund handling",
      "loyalty / repeat touchpoints",
      "post-purchase follow-up",
      "review request process",
      "complaint handling",
      "ecommerce delivery handoff",
    ],
    capacity_constraints: [
      "peak-hour register capacity",
      "staff capacity",
      "inventory storage capacity",
      "vendor lead times",
      "ecommerce fulfillment capacity",
      "manager capacity",
      "seasonal demand spikes",
      "receiving / restock capacity",
    ],
    margin_profitability: [
      "gross margin by category",
      "promo / discount leakage",
      "shrink",
      "vendor pricing",
      "payment processing fees",
      "return / refund cost",
      "high-volume low-margin traps",
      "low-volume high-margin opportunities",
      "price increase readiness",
    ],
    industry_failure_points: [
      "stockouts on best sellers",
      "dead stock",
      "inventory turnover gaps",
      "shrink",
      "merchandising gaps",
      "basket size too low",
      "return patterns",
      "promo leakage",
      "POS / category reporting gaps",
      "ecommerce / POS mismatch",
    ],
    monitoring_signals: [
      "sales by SKU / category",
      "inventory turnover",
      "stockouts",
      "dead stock",
      "gross margin by category",
      "returns / refunds",
      "shrink / loss",
      "basket size",
      "promo / discount leakage",
      "repeat customer rate",
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
    revenue_streams: [
      "dine-in",
      "takeout",
      "delivery (in-house)",
      "delivery (third-party platform)",
      "catering / events",
      "online ordering",
      "loyalty / repeat",
      "alcohol / beverage sales",
      "merchandise / retail",
      "gift cards",
      "private dining / buyouts",
      "seasonal / holiday spikes",
    ],
    lead_demand_sources: [
      "walk-ins",
      "reservation channels",
      "delivery marketplaces",
      "online ordering",
      "organic search",
      "Google Business Profile",
      "Google Maps",
      "social media",
      "Meta Ads",
      "email list",
      "SMS list",
      "review platforms",
      "loyalty program",
      "repeat guests",
      "local events / partnerships",
    ],
    conversion_bottlenecks: [
      "average ticket",
      "table turns",
      "service speed",
      "channel mix imbalance",
      "online ordering completion",
      "menu clarity",
      "upsell consistency",
      "wait time friction",
      "review / social proof",
      "out-of-stock items",
    ],
    operational_bottlenecks: [
      "labor cost %",
      "food cost %",
      "waste / spoilage",
      "prep capacity",
      "front-of-house staffing",
      "ticket time",
      "kitchen throughput",
      "expediter handoff",
      "vendor ordering cadence",
      "remakes / refunds",
      "peak-hour breakdown",
      "exception handling",
    ],
    financial_visibility_risks: [
      "prime cost not monitored",
      "cash / settlement timing per channel",
      "menu item profitability",
      "vendor pricing drift",
      "delivery platform fees",
      "tip / payroll handling",
      "cash handling variance",
      "discount / comp leakage",
      "reconciliation cadence",
      "budget vs actual",
    ],
    owner_dependence_risks: [
      "owner expedites every shift",
      "owner closes the books alone",
      "owner places every vendor order",
      "owner builds every schedule",
      "owner controls all menu pricing",
      "owner is the only trainer",
      "owner handles every comp / refund",
    ],
    typical_evidence_sources: [
      "Square",
      "Stripe",
      "QuickBooks",
      "Xero",
      "delivery dashboards",
      "POS exports",
      "labor / scheduling system",
      "inventory / food cost system",
      "Google Business Profile",
      "Google Search Console",
      "review platforms",
      "spreadsheets",
    ],
    staffing_labor: [
      "shift coverage",
      "labor cost %",
      "role clarity",
      "training completion",
      "cross-training",
      "turnover",
      "onboarding time",
      "manager readiness",
      "tip handling",
      "scheduling vs demand",
    ],
    customer_experience: [
      "greet / seating time",
      "menu clarity",
      "ticket time",
      "table check-back",
      "online order accuracy",
      "delivery handoff",
      "review request process",
      "complaint handling",
      "comp / refund handling",
      "loyalty touchpoints",
    ],
    capacity_constraints: [
      "kitchen prep capacity",
      "table / seat capacity",
      "peak-hour throughput",
      "staff capacity",
      "delivery driver capacity",
      "vendor lead times",
      "storage / cooler capacity",
      "private event capacity",
    ],
    margin_profitability: [
      "prime cost",
      "food cost %",
      "labor cost %",
      "menu / item margin",
      "delivery platform fees",
      "comp / discount leakage",
      "waste / spoilage cost",
      "vendor pricing",
      "beverage margin",
      "price increase readiness",
    ],
    industry_failure_points: [
      "prime cost not monitored",
      "food waste",
      "prep inconsistency",
      "ticket time bottlenecks",
      "labor scheduling mismatch",
      "menu margin blind spots",
      "delivery platform fees",
      "remakes / refunds",
      "vendor ordering gaps",
      "peak-hour service breakdown",
    ],
    monitoring_signals: [
      "prime cost",
      "food cost",
      "labor cost",
      "menu margin",
      "waste / spoilage",
      "ticket time",
      "remakes / refunds",
      "vendor ordering issues",
      "peak-hour bottlenecks",
      "repeat guest rate",
    ],
    forbidden_assumptions: [
      "do not apply retail SKU turn logic",
      "do not apply trade dispatch logic",
      "do not apply regulated/cannabis compliance assumptions",
    ],
  },
  mmj_cannabis: {
    industry: "mmj_cannabis",
    label: "Cannabis / MMJ / Rec",
    revenue_streams: [
      "in-store sales by category (flower, edibles, concentrates, vape, topicals, accessories)",
      "pre-orders / pickup",
      "loyalty / repeat purchases",
      "promotional / daily deal sales",
      "delivery where licensed and permitted",
      "high-margin accessories",
      "house brand vs vendor brand mix",
      "seasonal / holiday spikes (cannabis-specific)",
    ],
    lead_demand_sources: [
      "dispensary walk-ins",
      "local organic search",
      "Google Business Profile where allowed",
      "menu listing platforms (Weedmaps, Leafly) where permitted",
      "loyalty program engagement",
      "SMS list within regulated limits",
      "email list within regulated limits",
      "review platforms",
      "in-store signage",
      "local community presence",
      "owned channels (compliance-bound)",
    ],
    conversion_bottlenecks: [
      "basket size",
      "category mix",
      "regulated marketing limits",
      "menu / inventory accuracy",
      "ID / age verification flow",
      "purchase limit checks",
      "budtender upsell consistency",
      "wait time at check-in",
      "out-of-stock at counter",
      "cash-only friction",
    ],
    operational_bottlenecks: [
      "POS / inventory reconciliation",
      "menu / pricing accuracy",
      "ID / check-in workflow",
      "purchase limit process visibility",
      "compliance-sensitive checklist execution",
      "cash handling workflow",
      "vendor / license documentation",
      "inventory traceability",
      "staffing certifications and badging",
      "queue / wait management",
      "exception handling",
    ],
    financial_visibility_risks: [
      "tax / regulatory pressure (e.g. 280E in US contexts)",
      "cash handling reconciliation",
      "vendor cost shifts",
      "category margin pressure",
      "POS / accounting reconciliation",
      "discount / promo leakage",
      "shrink / variance",
      "delivery / service fee handling where applicable",
      "reconciliation cadence",
    ],
    owner_dependence_risks: [
      "owner is the compliance officer",
      "owner reconciles cash alone",
      "owner manages every vendor relationship",
      "owner-only POS / inventory access",
      "owner is the only trainer",
      "owner controls all pricing and menu",
      "owner handles every refund / void",
    ],
    typical_evidence_sources: [
      "POS exports",
      "state traceability / cannabis inventory system exports (Metrc-style where applicable)",
      "menu listing platform exports where applicable",
      "compliance / SOP logs (operations-focused)",
      "QuickBooks",
      "Xero",
      "internal cash logs",
      "vendor and license documents",
      "spreadsheets",
    ],
    staffing_labor: [
      "budtender role clarity",
      "training completion",
      "certifications / badging",
      "shift coverage",
      "labor percentage",
      "cross-training",
      "turnover",
      "onboarding time",
      "manager readiness",
      "tool / SOP adoption",
    ],
    customer_experience: [
      "greet / check-in time",
      "ID verification clarity",
      "menu clarity",
      "budtender consultation consistency",
      "wait time",
      "loyalty touchpoints",
      "review request process",
      "complaint handling",
      "refund / void handling",
      "education on regulated limits",
    ],
    capacity_constraints: [
      "check-in / queue capacity",
      "budtender capacity",
      "POS station capacity",
      "vault / inventory storage capacity",
      "vendor lead times",
      "delivery driver capacity where applicable",
      "peak-hour capacity",
    ],
    margin_profitability: [
      "category margin (flower, edibles, concentrates, vape, accessories)",
      "house brand vs vendor brand margin",
      "promo / discount leakage",
      "vendor pricing",
      "shrink / variance cost",
      "delivery / service fees where applicable",
      "high-volume low-margin traps",
      "low-volume high-margin opportunities",
    ],
    industry_failure_points: [
      "POS / inventory reconciliation gaps",
      "menu / pricing inconsistency",
      "cash handling variance",
      "ID / check-in process gaps",
      "purchase limit process visibility",
      "budtender upsell inconsistency",
      "compliance-sensitive checklist gaps",
      "evidence / document readiness gaps",
      "state-specific rules may apply",
      "inventory aging / expiration risk where relevant",
      "vendor / license documentation gaps",
    ],
    monitoring_signals: [
      "POS / inventory reconciliation",
      "category margin",
      "inventory variance",
      "cash handling variance",
      "menu / pricing consistency",
      "ID / check-in process visibility",
      "compliance-sensitive checklist gaps",
      "evidence / document readiness",
      "product aging / expiration risk where relevant",
      "state-specific rule changes (admin-tracked)",
    ],
    forbidden_assumptions: [
      "do not assume general retail ad channels are available",
      "do not assume restaurant-style table dynamics",
      "do not apply non-regulated payment assumptions",
      "RGS must NOT make legal or compliance claims",
      "RGS does NOT model healthcare, HIPAA, patient care, insurance claims, medical billing, or clinical workflows — cannabis/MMJ here means dispensary/retail operations only",
      "do not export this vertical's specifics into cross-industry learning unless generalized and admin-approved",
    ],
  },
  general_service: {
    industry: "general_service",
    label: "General / Mixed business",
    revenue_streams: [
      "one-time service engagements",
      "recurring contracts / retainers",
      "project work",
      "subscription revenue",
      "product / digital sales",
      "high-margin add-ons",
      "referral / partner revenue",
      "wholesale / B2B work",
      "seasonal demand spikes",
      "upsell / cross-sell revenue",
    ],
    lead_demand_sources: [
      "organic search",
      "Google Business Profile",
      "Google Search Console",
      "Google Analytics",
      "direct traffic",
      "referrals",
      "repeat customers",
      "owned content / blog / SEO hub",
      "email list",
      "SMS list",
      "paid search",
      "paid social",
      "partner network",
      "review platforms",
      "events / community",
    ],
    conversion_bottlenecks: [
      "follow-up gaps",
      "scope ambiguity",
      "long sales cycle",
      "owner-only closing",
      "lead response time",
      "proposal clarity",
      "pricing objections",
      "missing nurture sequence",
      "handoff friction",
      "weak social proof",
    ],
    operational_bottlenecks: [
      "capacity planning",
      "delivery consistency",
      "SOP gaps",
      "task ownership",
      "client onboarding handoff",
      "duplicate manual work",
      "exception handling",
      "status tracking",
      "rework",
      "tool fragmentation",
    ],
    financial_visibility_risks: [
      "AR aging",
      "project profitability",
      "irregular cash",
      "revenue by line",
      "gross vs net margin",
      "discount leakage",
      "owner draw visibility",
      "fixed vs variable cost",
      "reconciliation cadence",
      "budget vs actual",
    ],
    owner_dependence_risks: [
      "owner sells, delivers, and bills",
      "owner approves every decision",
      "owner controls all pricing",
      "owner-only software access",
      "owner is the only trainer",
      "owner performs manual reporting",
      "owner handles every escalation",
      "owner holds undocumented process knowledge",
    ],
    typical_evidence_sources: [
      "QuickBooks",
      "Xero",
      "FreshBooks",
      "HubSpot",
      "Salesforce",
      "Pipedrive",
      "Stripe",
      "Square",
      "PayPal",
      "Google Analytics",
      "Google Search Console",
      "Google Business Profile",
      "spreadsheets",
      "bank statements",
    ],
    staffing_labor: [
      "role clarity",
      "training completion",
      "coverage gaps",
      "labor cost",
      "task ownership",
      "cross-training",
      "turnover",
      "onboarding time",
      "manager readiness",
      "accountability gaps",
    ],
    customer_experience: [
      "inquiry response",
      "intake flow",
      "proposal clarity",
      "onboarding instructions",
      "status updates",
      "delivery handoff",
      "post-sale follow-up",
      "review request process",
      "complaint handling",
      "renewal / repeat path",
    ],
    capacity_constraints: [
      "delivery capacity",
      "owner capacity",
      "staff capacity",
      "lead volume vs fulfillment capacity",
      "vendor / partner lead times",
      "cash constraints",
      "training capacity",
    ],
    margin_profitability: [
      "gross margin",
      "net margin",
      "project / engagement margin",
      "discount leakage",
      "labor cost",
      "tooling / software cost",
      "vendor cost",
      "price increase readiness",
      "high-volume low-margin traps",
      "low-volume high-margin opportunities",
    ],
    industry_failure_points: [
      "unclear lead source tracking",
      "no revenue by service / product line",
      "weak follow-up",
      "owner bottlenecks",
      "missing SOPs",
      "financial dashboard gaps",
      "handoff inconsistency",
      "unclear accountability",
      "no monthly review cadence",
    ],
    monitoring_signals: [
      "lead source quality",
      "close rate",
      "revenue by line",
      "margin visibility",
      "recurring vs one-time revenue",
      "owner-dependent task count",
      "overdue priority actions",
      "scorecard movement",
      "client health / renewal risk",
      "AR aging",
    ],
    forbidden_assumptions: [
      "do not apply retail/restaurant ratios",
      "do not apply regulated/cannabis assumptions",
      "do not assume a healthcare / clinical / HIPAA / patient-care vertical exists in RGS today",
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
