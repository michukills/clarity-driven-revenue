import type { ComplexityTierKey } from "@/config/rgsComplexityScale";

export const RGS_APPROVED_POSITIONING_SENTENCE =
  "RGS builds the operating structure owners use to see what is slipping, decide what to fix, and run the business with more control.";

export type PricingVisibility =
  | "public_facing"
  | "internal_only"
  | "founding_client_only"
  | "inactive";

export type RgsOfferLane =
  | "diagnostic"
  | "implementation"
  | "rgs_control_system"
  | "standalone_deliverable";

export type PricingCadence = "one_time" | "project" | "monthly";

export interface PricingGuidance {
  display: string;
  cadence: PricingCadence;
  qualifier: string;
  min_cents: number;
  max_cents: number | null;
}

export interface RgsPricingTier {
  tier_key: ComplexityTierKey;
  tier_name: string;
  complexity_range: string;
  best_for: string;
  public_facing: boolean;
  pricing: {
    diagnostic: PricingGuidance;
    implementation: PricingGuidance;
    rgs_control_system: PricingGuidance;
  };
  price_factors: string[];
  scope_notes: string[];
  safety_disclaimers: string[];
  admin_only_note: string;
  visibility: PricingVisibility;
}

export interface FoundingClientPricing {
  label: string;
  visibility: PricingVisibility;
  eligible_for: string;
  diagnostic: PricingGuidance;
  implementation: PricingGuidance;
  rgs_control_system: PricingGuidance;
  defined_term: string;
  client_requirements: string[];
  exclusions: string[];
  admin_only_note: string;
}

export interface ExactCheckoutFlow {
  offer_slug: string;
  label: string;
  route: string;
  lane: RgsOfferLane;
  payment_lane: "public_non_client" | "existing_client";
  exact_price_display: string;
  checkout_status: "wired" | "admin_link_only";
  public_copy: string;
  honesty_note: string;
}

export interface OfferBoundaryCopy {
  lane: RgsOfferLane;
  public_summary: string;
  includes: string[];
  excludes: string[];
  transition_copy?: string;
}

export interface StandaloneDeliverablePricing {
  key: string;
  title: string;
  price: PricingGuidance;
  applicable_tools: string[];
  client_safe_description: string;
  scope_boundary: string;
  report_workflow: "p90_report_workflow" | "admin_review_only";
  admin_only_note: string;
}

export const RGS_PRICING_TIERS: RgsPricingTier[] = [
  {
    tier_key: "tier_1_solo_micro",
    tier_name: "Tier 1 — Solo / Micro",
    complexity_range: "Simple owner-led operation, usually 1-3 people, one main location or revenue path.",
    best_for:
      "Very small owner-led businesses that need a clear first system read without adding corporate layers.",
    public_facing: true,
    pricing: {
      diagnostic: {
        display: "Diagnostic usually starts around $2,500",
        cadence: "one_time",
        qualifier:
          "Final pricing depends on complexity, evidence depth, and review requirements.",
        min_cents: 250000,
        max_cents: 250000,
      },
      implementation: {
        display: "Implementation typically ranges from $7,500-$15,000",
        cadence: "project",
        qualifier:
          "Scoped to the first repair-map items and the systems/tools being installed.",
        min_cents: 750000,
        max_cents: 1500000,
      },
      rgs_control_system: {
        display: "RGS Control System usually starts around $1,500/month",
        cadence: "monthly",
        qualifier:
          "Monitoring and review depth stay bounded to the agreed operating rhythm.",
        min_cents: 150000,
        max_cents: 150000,
      },
    },
    price_factors: [
      "headcount and owner dependence",
      "number of locations or revenue paths",
      "evidence available for review",
      "number of systems/tools involved",
      "reporting depth and clarification needs",
    ],
    scope_notes: [
      "Best for one primary business line or operating unit.",
      "Implementation focuses on the first repair-map items, not a full operating rebuild.",
    ],
    safety_disclaimers: [
      "RGS does not operate the business.",
      "Licensed legal, tax, accounting, HR, payroll, insurance, and compliance review remain outside RGS scope.",
      "Business outcomes remain the owner's responsibility.",
    ],
    admin_only_note:
      "Use this tier only when the business is truly simple. If evidence depth or location count expands, quote into Growth.",
    visibility: "public_facing",
  },
  {
    tier_key: "tier_2_growth",
    tier_name: "Tier 2 — Growth",
    complexity_range:
      "Established small business with staff, active sales motion, operational complexity, and owner bottlenecks.",
    best_for:
      "Businesses with enough moving parts that role clarity, documentation, follow-up, and reporting depth matter.",
    public_facing: true,
    pricing: {
      diagnostic: {
        display: "Diagnostic is often around $5,000",
        cadence: "one_time",
        qualifier:
          "Final pricing depends on complexity, evidence depth, and review requirements.",
        min_cents: 500000,
        max_cents: 500000,
      },
      implementation: {
        display: "Implementation typically ranges from $15,000-$40,000",
        cadence: "project",
        qualifier:
          "Depends on implementation depth, workflow count, training handoff, and HITL review level.",
        min_cents: 1500000,
        max_cents: 4000000,
      },
      rgs_control_system: {
        display: "RGS Control System is often around $3,000/month",
        cadence: "monthly",
        qualifier:
          "Depends on monitoring needs, score history, dashboard depth, and review rhythm.",
        min_cents: 300000,
        max_cents: 300000,
      },
    },
    price_factors: [
      "staff and role count",
      "sales activity and follow-up complexity",
      "operational handoff depth",
      "evidence review depth",
      "HITL verification level",
      "dashboard and monitoring needs",
    ],
    scope_notes: [
      "Diagnostic reviews more evidence and stronger cross-gear dependencies.",
      "Implementation requires a defined scope, timeline, and deliverables.",
    ],
    safety_disclaimers: [
      "RGS provides visibility, structure, and system installation support.",
      "RGS does not act as an operator inside the business.",
      "No outcome is promised from purchasing the tier.",
    ],
    admin_only_note:
      "Default quote lane for established small businesses. Confirm evidence requirements before sending payment links.",
    visibility: "public_facing",
  },
  {
    tier_key: "tier_3_scaled_multi_role",
    tier_name: "Tier 3 — Scaled / Multi-Role",
    complexity_range:
      "Multi-role, multi-location, regulated, higher-volume, or otherwise complex business.",
    best_for:
      "Businesses where decision rights, escalation, source-of-truth conflicts, and review cadence have real cost.",
    public_facing: true,
    pricing: {
      diagnostic: {
        display: "Diagnostic starts at $10,000+",
        cadence: "one_time",
        qualifier:
          "Quoted after scope review because evidence depth, location count, and industry risk can change the work.",
        min_cents: 1000000,
        max_cents: null,
      },
      implementation: {
        display: "Implementation typically ranges from $50,000-$100,000+",
        cadence: "project",
        qualifier:
          "Quoted by system count, team handoff needs, reporting depth, and implementation depth.",
        min_cents: 5000000,
        max_cents: null,
      },
      rgs_control_system: {
        display: "RGS Control System starts at $5,000+/month",
        cadence: "monthly",
        qualifier:
          "Quoted by monitoring needs, dashboards, score history, review cadence, and advisory interpretation depth.",
        min_cents: 500000,
        max_cents: null,
      },
    },
    price_factors: [
      "location count and operating units",
      "industry risk or compliance-sensitive workflows",
      "number of truth sources and reporting systems",
      "repair-map depth and implementation phases",
      "HITL verification and review cadence",
      "dashboard, score history, and monitoring needs",
    ],
    scope_notes: [
      "Requires scope review before quoting.",
      "Best handled as phased work when the business has multiple locations, brands, or revenue models.",
    ],
    safety_disclaimers: [
      "RGS is not a full-time executive hire and does not operate the business.",
      "RGS does not replace qualified professional review where required.",
      "Pricing reflects complexity; it does not promise a business outcome.",
    ],
    admin_only_note:
      "Quote carefully. This tier should not be sold through instant public checkout.",
    visibility: "public_facing",
  },
];

export const FOUNDING_CLIENT_PRICING: FoundingClientPricing = {
  label: "Founding Client / Beta Partner Pricing",
  visibility: "founding_client_only",
  eligible_for:
    "First limited client group while RGS is collecting feedback, improving UX, and building approved proof.",
  diagnostic: {
    display: "Founding Client Diagnostic / RGS Business Stress Test: $1,500-$2,500",
    cadence: "one_time",
    qualifier:
      "Limited-scope first-client pricing; scope, evidence depth, and review terms must be clear.",
    min_cents: 150000,
    max_cents: 250000,
  },
  implementation: {
    display: "Founding Client Implementation / RGS System Installation: $7,500-$10,000",
    cadence: "project",
    qualifier:
      "Clearly scoped first repair-map items only. Additional work is quoted separately.",
    min_cents: 750000,
    max_cents: 1000000,
  },
  rgs_control_system: {
    display: "Founding Client RGS Control System: $1,000-$1,500/month",
    cadence: "monthly",
    qualifier:
      "Defined term only. Renewal pricing and scope should be reviewed before term end.",
    min_cents: 100000,
    max_cents: 150000,
  },
  defined_term:
    "Use a defined term and written scope. Do not imply permanent pricing.",
  client_requirements: [
    "candid feedback on usefulness and friction",
    "UX feedback during the delivery process",
    "permissioned and anonymized case-study material only where approved",
    "testimonial rights only if ethically and contractually approved",
    "confidentiality or NDA option where appropriate",
  ],
  exclusions: [
    "no promised testimonial or case study",
    "no promised outcome",
    "no open-ended consulting",
    "no legal, tax, accounting, HR, payroll, investment-duty, valuation, or compliance decision",
  ],
  admin_only_note:
    "Use sparingly for early proof-building. Keep scope tight and document what feedback or permission is being requested.",
};

export const EXACT_CHECKOUT_FLOWS: ExactCheckoutFlow[] = [
  {
    offer_slug: "rgs_diagnostic_3000",
    label: "RGS Business Stability Diagnostic fixed-scope checkout",
    route: "/diagnostic-apply",
    lane: "diagnostic",
    payment_lane: "public_non_client",
    exact_price_display: "$3,000",
    checkout_status: "wired",
    public_copy:
      "The current public checkout is a wired one-time fixed-scope Diagnostic path.",
    honesty_note:
      "More complex scopes, multi-location work, implementation, and ongoing RGS Control System access must be quoted separately.",
  },
  {
    offer_slug: "rgs_implementation_10000",
    label: "Implementation admin payment link",
    route: "/admin/offers",
    lane: "implementation",
    payment_lane: "existing_client",
    exact_price_display: "$10,000",
    checkout_status: "admin_link_only",
    public_copy:
      "Implementation payment links are admin-created after diagnostic review and scope confirmation.",
    honesty_note:
      "Do not sell implementation as instant public checkout. Use defined scope, timeline, and deliverables.",
  },
  {
    offer_slug: "rgs_revenue_control_1000_monthly",
    label: "RGS Control System admin subscription link",
    route: "/admin/offers",
    lane: "rgs_control_system",
    payment_lane: "existing_client",
    exact_price_display: "$1,000/month",
    checkout_status: "admin_link_only",
    public_copy:
      "Existing subscription record is preserved for current/admin-created links; P91 pricing guidance is complexity-based.",
    honesty_note:
      "Do not present this as the whole current pricing model for every client. Complexity and monitoring depth can require higher scope.",
  },
];

export const OFFER_BOUNDARY_COPY: Record<RgsOfferLane, OfferBoundaryCopy> = {
  diagnostic: {
    lane: "diagnostic",
    public_summary:
      "A one-time business system inspection that identifies slipping gears, uses the 0-1000 Business Stability Scorecard where applicable, and produces a Stability Snapshot and Priority Repair Map.",
    includes: [
      "Owner Diagnostic Interview and evidence review where available",
      "0-1000 Business Stability Scorecard where applicable",
      "diagnostic report, Stability Snapshot, Priority Repair Map, and walkthrough or clarification when included",
    ],
    excludes: [
      "implementation",
      "custom builds",
      "execution",
      "open-ended consulting",
      "continuous monitoring",
      "RGS operating the business",
    ],
    transition_copy:
      "The Diagnostic shows where the system is slipping. If you want help installing the repair map, that becomes an Implementation project with a defined scope, timeline, and deliverables.",
  },
  implementation: {
    lane: "implementation",
    public_summary:
      "Project-based system installation support using diagnostic findings and the repair map.",
    includes: [
      "SOPs, workflows, playbooks, operating standards, training guidance, and decision rights",
      "roadmap-based installation of agreed repair-map items",
      "defined project scope, timeline, and deliverables",
    ],
    excludes: [
      "indefinite advisory access",
      "open-ended consulting",
      "emergency response",
      "RGS acting as operator",
    ],
  },
  rgs_control_system: {
    lane: "rgs_control_system",
    public_summary:
      "The ongoing visibility and guided-independence umbrella. Revenue Control System lives inside the broader RGS Control System.",
    includes: [
      "dashboards, score history, evidence freshness, priority tracking, and owner decision support",
      "bounded advisory interpretation tied to the agreed review rhythm",
      "monitoring of selected signals and source-of-truth visibility",
    ],
    excludes: [
      "implementation work outside the subscription scope",
      "emergency support",
      "execution inside the business",
      "professional legal, tax, accounting, HR, payroll, insurance, or compliance review",
    ],
  },
  standalone_deliverable: {
    lane: "standalone_deliverable",
    public_summary:
      "A limited-scope output created from an eligible individual tool and the information provided.",
    includes: [
      "one bounded deliverable tied to a selected tool",
      "admin-reviewed output where the P90 report workflow is used",
      "plain scope notes explaining what the output can and cannot support",
    ],
    excludes: [
      "Full Diagnostic access unless purchased separately",
      "Implementation unless purchased separately",
      "RGS Control System access unless purchased separately",
      "ongoing advisory or operating support",
    ],
  },
};

export const SAFE_REPLACEMENT_COST_POSITIONING =
  "RGS is not a COO and does not operate the business. It gives the owner structured visibility, repair priorities, and system installation support that many small businesses do not have internally.";

export const CONTROL_SYSTEM_RETENTION_COPY =
  "The RGS Control System keeps evidence freshness, score changes, priority tracking, source-of-truth visibility, and owner decision support in view so the owner is less surprised by what is slipping.";

export const PUBLIC_PRICING_SUMMARY = {
  diagnostic:
    "Diagnostic pricing is scope-based. Simple reviews usually start around $2,500, Growth reviews are often around $5,000, and Scaled / Multi-Role reviews start at $10,000+.",
  implementation:
    "Implementation is project-based. Depending on complexity and depth, projects typically range from $7,500-$100,000+.",
  rgs_control_system:
    "RGS Control System pricing depends on monitoring and review depth. Subscriptions usually start around $1,500/month and can scale to $5,000+/month for complex businesses.",
  founding:
    "Founding Client / Beta Partner pricing may be offered for a limited early client group with clear scope, candid feedback, and no promised outcome.",
};

export const STANDALONE_DELIVERABLE_PRICING: StandaloneDeliverablePricing[] = [
  {
    key: "sop_training_bible_draft",
    title: "SOP / Training Bible Draft",
    price: {
      display: "$250-$750 depending on workflow complexity",
      cadence: "one_time",
      qualifier: "One workflow or bounded training area unless scope is expanded.",
      min_cents: 25000,
      max_cents: 75000,
    },
    applicable_tools: ["sop_training_bible", "workflow_process_mapping"],
    client_safe_description:
      "A bounded SOP or training draft based on the information provided.",
    scope_boundary:
      "Does not include HR, OSHA, legal, compliance, or full implementation work.",
    report_workflow: "p90_report_workflow",
    admin_only_note:
      "Use when the deliverable is truly one workflow. Larger training systems belong in Implementation.",
  },
  {
    key: "owner_time_audit",
    title: "Owner Time Audit",
    price: {
      display: "$250-$500",
      cadence: "one_time",
      qualifier: "Based on a bounded time audit worksheet or interview input.",
      min_cents: 25000,
      max_cents: 50000,
    },
    applicable_tools: ["owner_decision_dashboard", "priority_action_tracker"],
    client_safe_description:
      "A limited owner-time visibility review that shows where decisions or work may be bottlenecked.",
    scope_boundary:
      "Does not replace staffing, HR, payroll, or professional management review.",
    report_workflow: "admin_review_only",
    admin_only_note:
      "Keep this as visibility and prioritization, not a labor or HR recommendation.",
  },
  {
    key: "lead_tracking_revenue_leak_review",
    title: "Lead Tracking / Revenue Leak Review",
    price: {
      display: "$300-$750",
      cadence: "one_time",
      qualifier: "Depends on lead-source count and evidence quality.",
      min_cents: 30000,
      max_cents: 75000,
    },
    applicable_tools: ["revenue_leak_engine", "priority_action_tracker"],
    client_safe_description:
      "A bounded look at visible lead-tracking and revenue-leak signals.",
    scope_boundary:
      "Does not promise revenue recovery, clean data, or marketing performance.",
    report_workflow: "p90_report_workflow",
    admin_only_note:
      "Use manual-export language when connectors are not live.",
  },
  {
    key: "operational_leakage_snapshot",
    title: "Operational Leakage Snapshot",
    price: {
      display: "$500-$1,500",
      cadence: "one_time",
      qualifier: "Depends on workflow count, evidence depth, and industry complexity.",
      min_cents: 50000,
      max_cents: 150000,
    },
    applicable_tools: ["workflow_process_mapping", "priority_action_tracker"],
    client_safe_description:
      "A limited snapshot of where operations appear to be leaking time, margin, or clarity.",
    scope_boundary:
      "Does not include implementation or ongoing monitoring unless purchased separately.",
    report_workflow: "p90_report_workflow",
    admin_only_note:
      "Keep repair recommendations bounded to review steps unless Implementation is purchased.",
  },
  {
    key: "cannabis_operational_documentation_readiness_snapshot",
    title: "Cannabis / MMJ Operational Documentation Readiness Snapshot",
    price: {
      display: "$750-$2,500",
      cadence: "one_time",
      qualifier:
        "Depends on inventory, vendor, payment handoff, sales-floor, and documentation depth.",
      min_cents: 75000,
      max_cents: 250000,
    },
    applicable_tools: ["financial_visibility", "workflow_process_mapping", "sop_training_bible"],
    client_safe_description:
      "A cannabis/dispensary operations snapshot focused on documentation readiness and handoff clarity.",
    scope_boundary:
      "Compliance-sensitive only. Review with qualified counsel/compliance support where required.",
    report_workflow: "p90_report_workflow",
    admin_only_note:
      "Cannabis/MMJ/MMC means dispensary and cannabis-retail operations only.",
  },
  {
    key: "trades_dispatch_labor_leakage_snapshot",
    title: "Trades / Home Services Dispatch & Labor Leakage Snapshot",
    price: {
      display: "$500-$1,500",
      cadence: "one_time",
      qualifier: "Depends on dispatch, labor, job flow, and invoice evidence depth.",
      min_cents: 50000,
      max_cents: 150000,
    },
    applicable_tools: ["workflow_process_mapping", "priority_action_tracker", "financial_visibility"],
    client_safe_description:
      "A bounded review of dispatch, labor, job-flow, and handoff signals.",
    scope_boundary:
      "Does not include payroll, employment, insurance, or legal review.",
    report_workflow: "p90_report_workflow",
    admin_only_note:
      "Tie findings to evidence and avoid broad crew-management claims.",
  },
];

export function getPricingTier(tierKey: ComplexityTierKey): RgsPricingTier {
  return RGS_PRICING_TIERS.find((tier) => tier.tier_key === tierKey)!;
}

export function getAdminPricingReference() {
  return {
    positioning: RGS_APPROVED_POSITIONING_SENTENCE,
    tiers: RGS_PRICING_TIERS,
    founding: FOUNDING_CLIENT_PRICING,
    exact_checkout_flows: EXACT_CHECKOUT_FLOWS,
    offer_boundaries: OFFER_BOUNDARY_COPY,
    standalone_deliverables: STANDALONE_DELIVERABLE_PRICING,
    replacement_cost_positioning: SAFE_REPLACEMENT_COST_POSITIONING,
    retention_copy: CONTROL_SYSTEM_RETENTION_COPY,
  };
}

export function getClientSafePricingReference() {
  return {
    positioning: RGS_APPROVED_POSITIONING_SENTENCE,
    tiers: RGS_PRICING_TIERS.filter((tier) => tier.public_facing).map(
      ({ admin_only_note: _admin, ...tier }) => tier,
    ),
    founding: {
      label: FOUNDING_CLIENT_PRICING.label,
      eligible_for: FOUNDING_CLIENT_PRICING.eligible_for,
      diagnostic: FOUNDING_CLIENT_PRICING.diagnostic,
      implementation: FOUNDING_CLIENT_PRICING.implementation,
      rgs_control_system: FOUNDING_CLIENT_PRICING.rgs_control_system,
      defined_term: FOUNDING_CLIENT_PRICING.defined_term,
      client_requirements: FOUNDING_CLIENT_PRICING.client_requirements,
      exclusions: FOUNDING_CLIENT_PRICING.exclusions,
    },
    offer_boundaries: OFFER_BOUNDARY_COPY,
    standalone_deliverables: STANDALONE_DELIVERABLE_PRICING.map(
      ({ admin_only_note: _admin, ...deliverable }) => deliverable,
    ),
    public_pricing_summary: PUBLIC_PRICING_SUMMARY,
    replacement_cost_positioning: SAFE_REPLACEMENT_COST_POSITIONING,
    retention_copy: CONTROL_SYSTEM_RETENTION_COPY,
  };
}

export function findStandaloneDeliverablePricing(
  key: string,
): StandaloneDeliverablePricing | undefined {
  return STANDALONE_DELIVERABLE_PRICING.find((item) => item.key === key);
}

export function listStandalonePricingForTool(toolKey: string): StandaloneDeliverablePricing[] {
  return STANDALONE_DELIVERABLE_PRICING.filter((item) =>
    item.applicable_tools.includes(toolKey),
  );
}
