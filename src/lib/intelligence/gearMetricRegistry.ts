/**
 * IB-H3 — Gear Metric Registry (5-Gear Hard-Truth Metrics).
 *
 * Source of truth for the 25 hard-truth metrics organized by the five
 * RGS gears (demand / conversion / operations / financial / independence).
 *
 * Implementation choice: TypeScript constants (no DB migration). The
 * existing scorecard pillar/category system remains the deterministic
 * scoring source of truth (200 pts × 5 gears = 1000). Every metric in
 * this registry is `interpretiveOnly = true` until a future approved
 * pass (IB-H4 / IB-H6) wires it into deterministic scoring or report
 * surfaces. Nothing here mutates `customer_stability_scores`,
 * `src/lib/scoring/*`, or the existing scorecard categories.
 *
 * Answer state semantics (deterministic, used by future admin review):
 *   - "verified"   → owner produced the number/evidence; gear stable on this metric.
 *   - "incomplete" → process exists but is not consistently followed/measured;
 *                    the gear can still slip under pressure.
 *   - "unknown"    → owner does not know / not tracked. Treated as
 *                    diagnostic evidence of visibility weakness, NOT neutral.
 *   - "no"         → no process exists for measuring this; slipping gear/tooth.
 *
 * Cannabis / MMJ scope is dispensary / cannabis retail operations only.
 * No HIPAA, healthcare, patient care, clinical workflow, medical billing,
 * or insurance-claim framing in any metric.
 */

export type GearKey =
  | "demand"
  | "conversion"
  | "operations"
  | "financial"
  | "independence";

export type AnswerState = "verified" | "incomplete" | "unknown" | "no";

export type EvidenceType =
  | "numeric"
  | "ratio"
  | "percentage"
  | "currency"
  | "duration"
  | "narrative"
  | "checklist"
  | "document_reference";

export interface AnswerStateMap {
  verified: string;
  incomplete: string;
  unknown: string;
  no: string;
}

export interface GearMetric {
  metricKey: string;
  gear: GearKey;
  metricName: string;
  metricDescription: string;
  ownerFriendlyQuestion: string;
  evidenceType: EvidenceType;
  evidenceFields: string[];
  /** What each answer state means for this specific metric. */
  answerStates: AnswerStateMap;
  stableCondition: string;
  slippingCondition: string;
  criticalCondition: string;
  unknownCondition: string;
  incompleteCondition: string;
  relatedIndustries: string[];
  relatedFailurePatterns: string[];
  relatedBenchmarkAnchors: string[];
  relatedTools: string[];
  /** Admin-only interpretation notes; never published to clients. */
  adminOnlyNotes: string;
  /** Plain-English explanation that is safe to show to clients. */
  clientSafeExplanation: string;
  /** How later passes should interpret this metric for scoring. */
  deterministicScoringHint: string;
  /** True until explicitly wired into deterministic scoring. */
  interpretiveOnly: boolean;
  /** Industry-specific nuance notes. */
  industryNotes?: Record<string, string>;
  /** Future surfaces that will consume this metric (IB-H4+). */
  futureWiring: {
    adminReview: boolean;
    reportBuilder: boolean;
    stabilitySnapshot: boolean;
    priorityRepairMap: boolean;
    implementationRoadmap: boolean;
    rgsControlSystem: boolean;
    revenueRiskMonitor: boolean;
    clientHealthRenewalRisk: boolean;
  };
}

const ALL_INDUSTRIES = [
  "general_small_business",
  "trades_services",
  "restaurant_food_service",
  "retail",
  "cannabis_mmj_mmc",
] as const;

const FULL_FUTURE_WIRING: GearMetric["futureWiring"] = {
  adminReview: true,
  reportBuilder: true,
  stabilitySnapshot: true,
  priorityRepairMap: true,
  implementationRoadmap: true,
  rgsControlSystem: true,
  revenueRiskMonitor: true,
  clientHealthRenewalRisk: true,
};

function defaultUnknownIncomplete(metricLabel: string) {
  return {
    unknownCondition: `Owner cannot produce ${metricLabel}. Treated as visibility weakness, not neutral.`,
    incompleteCondition: `${metricLabel} is estimated or partially tracked but not consistently reviewed; gear still slips under pressure.`,
  };
}

// ---------------------------------------------------------------------
// Gear 1 — Demand Generation / Intake Valve
// ---------------------------------------------------------------------
const GEAR_1: GearMetric[] = [
  {
    metricKey: "demand.cpql",
    gear: "demand",
    metricName: "Cost Per Qualified Lead (CPQL)",
    metricDescription:
      "Total marketing spend divided by the number of qualified leads produced in the same period.",
    ownerFriendlyQuestion:
      "Do you know what it costs you, on average, to generate one qualified lead?",
    evidenceType: "currency",
    evidenceFields: [
      "total_marketing_spend_period",
      "qualified_leads_count_period",
      "qualified_lead_definition",
      "tracking_source",
    ],
    answerStates: {
      verified: "Owner produced spend and qualified-lead counts and the math holds.",
      incomplete: "Spend or lead counts exist but are not reconciled to the same period.",
      unknown: "Owner does not know CPQL or qualified-lead count.",
      no: "No process exists for tracking spend or qualified leads.",
    },
    stableCondition: "CPQL is tracked monthly and within industry benchmark range.",
    slippingCondition: "CPQL is rising, unstable, or above industry benchmark.",
    criticalCondition: "Owner cannot calculate CPQL; spend is not connected to qualified leads.",
    ...defaultUnknownIncomplete("CPQL"),
    relatedIndustries: [...ALL_INDUSTRIES],
    relatedFailurePatterns: ["unknown_cost_per_lead", "marketing_blind_spend"],
    relatedBenchmarkAnchors: ["cpql"],
    relatedTools: ["owner_diagnostic_interview", "demand_diagnostic", "scorecard_demand"],
    adminOnlyNotes:
      "Compare to IB-H2 benchmark anchor for industry. If unknown, this is a visibility gap, not absence of cost.",
    clientSafeExplanation:
      "Knowing what one qualified lead costs you is the first step to spending marketing dollars with intent.",
    deterministicScoringHint:
      "Future: contributes to Gear 1 (demand) interpretation; not auto-scored in IB-H3.",
    interpretiveOnly: true,
    futureWiring: FULL_FUTURE_WIRING,
  },
  {
    metricKey: "demand.channel_concentration",
    gear: "demand",
    metricName: "Channel Concentration",
    metricDescription:
      "Share of leads or revenue coming from each acquisition channel; high concentration is fragility.",
    ownerFriendlyQuestion:
      "If your top lead source disappeared tomorrow, what percentage of your revenue would be at risk?",
    evidenceType: "percentage",
    evidenceFields: [
      "top_channels_list",
      "percent_leads_per_channel",
      "percent_revenue_per_channel",
      "tracking_source",
    ],
    answerStates: {
      verified: "Owner can name top channels with concrete percentages.",
      incomplete: "Owner can name channels but estimates percentages.",
      unknown: "Owner does not know channel mix.",
      no: "No tracking of which channel produced which lead.",
    },
    stableCondition: "No single channel exceeds ~50% of qualified leads or revenue.",
    slippingCondition: "One channel produces >60% of leads or revenue.",
    criticalCondition: "One channel produces >80%, or owner cannot identify channels at all.",
    ...defaultUnknownIncomplete("channel concentration"),
    relatedIndustries: [...ALL_INDUSTRIES],
    relatedFailurePatterns: ["single_channel_dependency", "referral_only_pipeline"],
    relatedBenchmarkAnchors: ["channel_mix"],
    relatedTools: ["owner_diagnostic_interview", "demand_diagnostic"],
    adminOnlyNotes:
      "Concentration risk often pairs with unknown CPQL. Probe for hidden referral dependence.",
    clientSafeExplanation:
      "When most of your business comes from one place, losing that place can stall the whole engine.",
    deterministicScoringHint:
      "Future: contributes to Gear 1 fragility interpretation; not auto-scored in IB-H3.",
    interpretiveOnly: true,
    futureWiring: FULL_FUTURE_WIRING,
  },
  {
    metricKey: "demand.inquiry_to_lead_ratio",
    gear: "demand",
    metricName: "Inquiry-to-Lead Ratio",
    metricDescription:
      "Of all inbound inquiries, the percentage that become qualified leads.",
    ownerFriendlyQuestion:
      "Of every 10 people who reach out, how many turn into real, qualified leads?",
    evidenceType: "ratio",
    evidenceFields: [
      "inquiries_count_period",
      "qualified_leads_count_period",
      "qualified_lead_definition",
      "tracking_source",
    ],
    answerStates: {
      verified: "Owner can produce both inquiry and qualified-lead counts.",
      incomplete: "One number is tracked, the other is estimated.",
      unknown: "Owner does not know inquiry volume or qualification rate.",
      no: "No process for capturing inquiries.",
    },
    stableCondition: "Ratio is tracked and stable period over period.",
    slippingCondition: "Ratio is volatile or trending down without explanation.",
    criticalCondition: "Owner cannot define what counts as a qualified lead.",
    ...defaultUnknownIncomplete("inquiry-to-lead ratio"),
    relatedIndustries: [...ALL_INDUSTRIES],
    relatedFailurePatterns: ["unqualified_lead_overload", "missing_qualification_step"],
    relatedBenchmarkAnchors: ["inquiry_to_lead_ratio"],
    relatedTools: ["owner_diagnostic_interview", "demand_diagnostic"],
    adminOnlyNotes:
      "Low ratio often indicates targeting or messaging mismatch, not sales weakness.",
    clientSafeExplanation:
      "If most inquiries are not real buyers, the engine is burning fuel on the wrong people.",
    deterministicScoringHint:
      "Future: Gear 1 quality interpretation; not auto-scored in IB-H3.",
    interpretiveOnly: true,
    futureWiring: FULL_FUTURE_WIRING,
  },
  {
    metricKey: "demand.mer",
    gear: "demand",
    metricName: "Marketing Efficiency Ratio (MER)",
    metricDescription:
      "Revenue from marketing-driven leads divided by total marketing spend in the same period.",
    ownerFriendlyQuestion:
      "For every dollar you spend on marketing, do you know how many dollars come back?",
    evidenceType: "ratio",
    evidenceFields: [
      "marketing_driven_revenue_period",
      "total_marketing_spend_period",
      "attribution_method",
      "tracking_source",
    ],
    answerStates: {
      verified: "Revenue and spend are reconciled to the same period with a documented attribution method.",
      incomplete: "Spend known, revenue attribution is rough.",
      unknown: "Owner does not know MER.",
      no: "No attribution of revenue to marketing.",
    },
    stableCondition: "MER is tracked monthly and meets or exceeds industry baseline.",
    slippingCondition: "MER is declining or unstable.",
    criticalCondition: "Spend is significant but attribution does not exist.",
    ...defaultUnknownIncomplete("MER"),
    relatedIndustries: [...ALL_INDUSTRIES],
    relatedFailurePatterns: ["marketing_without_attribution"],
    relatedBenchmarkAnchors: ["mer"],
    relatedTools: ["owner_diagnostic_interview", "demand_diagnostic"],
    adminOnlyNotes:
      "If MER is unknown but spend is high, flag for visibility repair before recommending spend changes.",
    clientSafeExplanation:
      "Marketing spend is only useful if you can see what comes back. MER makes that visible.",
    deterministicScoringHint:
      "Future: Gear 1 efficiency interpretation; not auto-scored in IB-H3.",
    interpretiveOnly: true,
    futureWiring: FULL_FUTURE_WIRING,
  },
  {
    metricKey: "demand.lead_quality_buyer_fit",
    gear: "demand",
    metricName: "Lead Quality / Buyer Fit Evidence",
    metricDescription:
      "Documented profile of the ideal buyer and evidence that incoming leads match it.",
    ownerFriendlyQuestion:
      "Can you describe your ideal buyer in one sentence, and do most of your leads match it?",
    evidenceType: "narrative",
    evidenceFields: [
      "ideal_buyer_profile",
      "lost_low_quality_lead_patterns",
      "qualification_criteria",
      "tracking_source",
    ],
    answerStates: {
      verified: "Buyer profile is documented and used to qualify leads.",
      incomplete: "Owner has a sense of the buyer but no documented criteria.",
      unknown: "Owner cannot describe the ideal buyer.",
      no: "No qualification criteria; all inquiries treated equally.",
    },
    stableCondition: "Buyer profile is documented, shared with the team, and applied consistently.",
    slippingCondition: "Profile exists in owner's head only; team applies inconsistently.",
    criticalCondition: "No buyer profile; lead quality is treated as luck.",
    ...defaultUnknownIncomplete("buyer-fit evidence"),
    relatedIndustries: [...ALL_INDUSTRIES],
    relatedFailurePatterns: ["no_ideal_buyer_definition", "everyone_is_a_customer"],
    relatedBenchmarkAnchors: [],
    relatedTools: ["owner_diagnostic_interview", "demand_diagnostic"],
    adminOnlyNotes:
      "If buyer profile is missing, downstream conversion metrics are likely to read as sales problems but are upstream demand problems.",
    clientSafeExplanation:
      "Knowing exactly who you serve best is what turns marketing spend into the right leads, not just more leads.",
    deterministicScoringHint:
      "Future: Gear 1 quality interpretation; not auto-scored in IB-H3.",
    interpretiveOnly: true,
    futureWiring: FULL_FUTURE_WIRING,
  },
];

// ---------------------------------------------------------------------
// Gear 2 — Revenue Conversion / Combustion Chamber
// ---------------------------------------------------------------------
const GEAR_2: GearMetric[] = [
  {
    metricKey: "conversion.sales_cycle_length",
    gear: "conversion",
    metricName: "Sales Cycle Length",
    metricDescription:
      "Average time from first contact to paid job/order/transaction.",
    ownerFriendlyQuestion:
      "Do you know your average time from first contact to paid job or order?",
    evidenceType: "duration",
    evidenceFields: [
      "first_contact_timestamp_source",
      "paid_timestamp_source",
      "average_days",
      "tracking_source",
    ],
    answerStates: {
      verified: "Number is produced from CRM/POS/invoice system and reviewed regularly.",
      incomplete: "Owner estimates the number manually but does not review consistently.",
      unknown: "Owner does not know cycle length.",
      no: "No system captures first-contact and paid timestamps.",
    },
    stableCondition: "Cycle length is tracked, stable, and aligned with industry norms.",
    slippingCondition: "Cycle length is lengthening or volatile.",
    criticalCondition: "Cycle length cannot be measured.",
    ...defaultUnknownIncomplete("sales cycle length"),
    relatedIndustries: [...ALL_INDUSTRIES],
    relatedFailurePatterns: ["slow_quote_lag", "stalled_pipeline"],
    relatedBenchmarkAnchors: ["sales_cycle_length"],
    relatedTools: ["owner_diagnostic_interview", "conversion_diagnostic", "scorecard_conversion"],
    adminOnlyNotes:
      "Cycle length lengthening + AOV flat often indicates pricing or proposal friction, not lead quality.",
    clientSafeExplanation:
      "How long it takes to turn a lead into paid revenue is one of the clearest signals of conversion health.",
    deterministicScoringHint:
      "Future: Gear 2 cadence interpretation; not auto-scored in IB-H3.",
    interpretiveOnly: true,
    industryNotes: {
      trades_services: "Measured first call → completed/paid job.",
      restaurant_food_service: "Cycle measured at order → ticket time / table turn.",
      retail: "Cycle measured at receiving → sell-through.",
      cannabis_mmj_mmc: "Cycle measured at intake/check-in → completed transaction.",
    },
    futureWiring: FULL_FUTURE_WIRING,
  },
  {
    metricKey: "conversion.lead_to_close_rate",
    gear: "conversion",
    metricName: "Lead-to-Close Rate",
    metricDescription:
      "Percentage of qualified leads that become paying customers.",
    ownerFriendlyQuestion:
      "Of every 10 qualified leads, how many become paying customers?",
    evidenceType: "percentage",
    evidenceFields: [
      "qualified_leads_count_period",
      "closed_won_count_period",
      "tracking_source",
    ],
    answerStates: {
      verified: "Both counts produced from the same period with a defined qualified-lead rule.",
      incomplete: "Counts exist but qualified-lead rule is fuzzy.",
      unknown: "Owner does not know close rate.",
      no: "No tracking of leads or closes.",
    },
    stableCondition: "Close rate tracked, stable, near or above industry norm.",
    slippingCondition: "Close rate declining or volatile.",
    criticalCondition: "Close rate cannot be measured.",
    ...defaultUnknownIncomplete("lead-to-close rate"),
    relatedIndustries: [...ALL_INDUSTRIES],
    relatedFailurePatterns: ["no_close_rate_visibility", "owner_only_sales"],
    relatedBenchmarkAnchors: ["lead_to_close_rate"],
    relatedTools: ["owner_diagnostic_interview", "conversion_diagnostic"],
    adminOnlyNotes:
      "Pair with channel concentration: low close rate from a noisy channel is a demand problem, not a sales one.",
    clientSafeExplanation:
      "Close rate is the clearest read on whether your sales process is doing its job.",
    deterministicScoringHint:
      "Future: Gear 2 throughput interpretation; not auto-scored in IB-H3.",
    interpretiveOnly: true,
    futureWiring: FULL_FUTURE_WIRING,
  },
  {
    metricKey: "conversion.average_order_value",
    gear: "conversion",
    metricName: "Average Order Value / Average Contract Value",
    metricDescription:
      "Average dollar size of a customer transaction or contract.",
    ownerFriendlyQuestion:
      "Do you know your average order or contract size, and is your pricing consistent?",
    evidenceType: "currency",
    evidenceFields: [
      "total_revenue_period",
      "transactions_count_period",
      "pricing_consistency_notes",
      "tracking_source",
    ],
    answerStates: {
      verified: "AOV/ACV is tracked and pricing rules are documented.",
      incomplete: "AOV/ACV is rough; pricing varies by who quotes.",
      unknown: "Owner does not know AOV/ACV.",
      no: "Pricing has no consistent rules.",
    },
    stableCondition: "AOV/ACV stable or rising with documented pricing rules.",
    slippingCondition: "AOV/ACV trending down or highly variable.",
    criticalCondition: "Pricing is improvised per deal with no rules.",
    ...defaultUnknownIncomplete("AOV/ACV"),
    relatedIndustries: [...ALL_INDUSTRIES],
    relatedFailurePatterns: ["pricing_inconsistency", "discount_creep"],
    relatedBenchmarkAnchors: ["average_order_value"],
    relatedTools: ["owner_diagnostic_interview", "conversion_diagnostic"],
    adminOnlyNotes:
      "Pricing inconsistency frequently masquerades as conversion weakness.",
    clientSafeExplanation:
      "Knowing your average order size keeps pricing intentional rather than improvised.",
    deterministicScoringHint:
      "Future: Gear 2 value interpretation; not auto-scored in IB-H3.",
    interpretiveOnly: true,
    futureWiring: FULL_FUTURE_WIRING,
  },
  {
    metricKey: "conversion.no_show_cancellation_rate",
    gear: "conversion",
    metricName: "No-Show / Cancellation Rate",
    metricDescription:
      "Percentage of scheduled appointments, jobs, or reservations that no-show or cancel.",
    ownerFriendlyQuestion:
      "Do you know your no-show or cancellation rate, and is anyone responsible for reducing it?",
    evidenceType: "percentage",
    evidenceFields: [
      "scheduled_count_period",
      "no_show_count_period",
      "cancellation_count_period",
      "tracking_source",
    ],
    answerStates: {
      verified: "Tracked with an owner of the metric.",
      incomplete: "Tracked sporadically; nobody owns the number.",
      unknown: "Owner does not know.",
      no: "No process for capturing no-shows or cancellations.",
    },
    stableCondition: "Rate tracked, owned, and within industry norm.",
    slippingCondition: "Rate rising or unowned.",
    criticalCondition: "Cannot be measured.",
    ...defaultUnknownIncomplete("no-show / cancellation rate"),
    relatedIndustries: [...ALL_INDUSTRIES],
    relatedFailurePatterns: ["high_no_show_rate", "no_confirmation_process"],
    relatedBenchmarkAnchors: ["no_show_rate"],
    relatedTools: ["owner_diagnostic_interview", "conversion_diagnostic"],
    adminOnlyNotes:
      "Often a quick-win repair; a confirmation cadence usually moves this within 30 days.",
    clientSafeExplanation:
      "Each no-show is paid-for capacity that walked away. Visibility here is high-leverage.",
    deterministicScoringHint:
      "Future: Gear 2 retention interpretation; not auto-scored in IB-H3.",
    interpretiveOnly: true,
    futureWiring: FULL_FUTURE_WIRING,
  },
  {
    metricKey: "conversion.followup_completion_rate",
    gear: "conversion",
    metricName: "Follow-Up Completion Rate",
    metricDescription:
      "Percentage of qualified leads that receive the documented follow-up sequence.",
    ownerFriendlyQuestion:
      "When a qualified lead does not buy on first contact, do they reliably get the follow-up they should?",
    evidenceType: "percentage",
    evidenceFields: [
      "documented_followup_sequence",
      "leads_with_completed_followup_count",
      "leads_total_count",
      "tracking_source",
    ],
    answerStates: {
      verified: "Sequence is documented and completed for the majority of qualified leads.",
      incomplete: "Sequence exists but is followed only when the owner remembers.",
      unknown: "Owner does not know completion rate.",
      no: "No follow-up sequence exists.",
    },
    stableCondition: "Documented sequence, completion rate tracked.",
    slippingCondition: "Sequence exists but inconsistently executed.",
    criticalCondition: "No follow-up at all.",
    ...defaultUnknownIncomplete("follow-up completion rate"),
    relatedIndustries: [...ALL_INDUSTRIES],
    relatedFailurePatterns: ["no_followup_process", "owner_dependent_followup"],
    relatedBenchmarkAnchors: [],
    relatedTools: ["owner_diagnostic_interview", "conversion_diagnostic"],
    adminOnlyNotes:
      "Missing follow-up consistently shows up as a conversion problem when it is really an operations problem.",
    clientSafeExplanation:
      "Most lost revenue lives in leads that never got a second touch.",
    deterministicScoringHint:
      "Future: Gear 2 process interpretation; not auto-scored in IB-H3.",
    interpretiveOnly: true,
    futureWiring: FULL_FUTURE_WIRING,
  },
];

// ---------------------------------------------------------------------
// Gear 3 — Operational Efficiency / Drive Train
// ---------------------------------------------------------------------
const GEAR_3: GearMetric[] = [
  {
    metricKey: "operations.capacity_utilization",
    gear: "operations",
    metricName: "Capacity Utilization",
    metricDescription:
      "Current workload as a percentage of the capacity the business can deliver without quality loss.",
    ownerFriendlyQuestion:
      "How many jobs, orders, or covers can you handle in a week without quality loss, and how full is that capacity right now?",
    evidenceType: "percentage",
    evidenceFields: [
      "weekly_capacity",
      "current_weekly_load",
      "quality_threshold_notes",
      "tracking_source",
    ],
    answerStates: {
      verified: "Capacity defined; current utilization measured.",
      incomplete: "Capacity is felt but not defined.",
      unknown: "Owner does not know capacity.",
      no: "No definition of capacity exists.",
    },
    stableCondition: "Utilization tracked, capacity defined, headroom protected.",
    slippingCondition: "Frequently above safe utilization without reviewing capacity.",
    criticalCondition: "Capacity is undefined; quality is suffering.",
    ...defaultUnknownIncomplete("capacity utilization"),
    relatedIndustries: [...ALL_INDUSTRIES],
    relatedFailurePatterns: ["overcommitted_capacity", "quality_drop_under_load"],
    relatedBenchmarkAnchors: ["capacity_utilization"],
    relatedTools: ["owner_diagnostic_interview", "operations_diagnostic", "scorecard_operations"],
    adminOnlyNotes:
      "Owners often over-promise capacity; verify against rework and cycle time.",
    clientSafeExplanation:
      "Knowing your real capacity protects quality and keeps the team out of permanent overload.",
    deterministicScoringHint:
      "Future: Gear 3 throughput interpretation; not auto-scored in IB-H3.",
    interpretiveOnly: true,
    futureWiring: FULL_FUTURE_WIRING,
  },
  {
    metricKey: "operations.rework_error_rate",
    gear: "operations",
    metricName: "Rework / Error Rate",
    metricDescription:
      "Percentage of jobs, orders, or transactions that require rework, callbacks, or correction.",
    ownerFriendlyQuestion:
      "How often do jobs, orders, or transactions have to be redone, fixed, or called back?",
    evidenceType: "percentage",
    evidenceFields: [
      "total_jobs_period",
      "rework_jobs_period",
      "rework_root_cause_notes",
      "tracking_source",
    ],
    answerStates: {
      verified: "Rework is logged and reviewed.",
      incomplete: "Rework happens but is not logged.",
      unknown: "Owner does not know rework rate.",
      no: "No rework tracking exists.",
    },
    stableCondition: "Rework logged, root causes reviewed, trending down.",
    slippingCondition: "Rework happens regularly but is not measured.",
    criticalCondition: "Rework is normalized as part of the workflow.",
    ...defaultUnknownIncomplete("rework / error rate"),
    relatedIndustries: [...ALL_INDUSTRIES],
    relatedFailurePatterns: ["unlogged_rework", "callback_normalization"],
    relatedBenchmarkAnchors: ["rework_rate"],
    relatedTools: ["owner_diagnostic_interview", "operations_diagnostic"],
    adminOnlyNotes:
      "Hidden rework distorts margin; flag for financial cross-check.",
    clientSafeExplanation:
      "Every redo is paid-for time you cannot bill twice. Visibility is the start of recovery.",
    deterministicScoringHint:
      "Future: Gear 3 quality interpretation; not auto-scored in IB-H3.",
    interpretiveOnly: true,
    futureWiring: FULL_FUTURE_WIRING,
  },
  {
    metricKey: "operations.cycle_time",
    gear: "operations",
    metricName: "Cycle Time",
    metricDescription:
      "Time from work-start to delivery for the core unit of work in the business.",
    ownerFriendlyQuestion:
      "From the moment work starts on a job, order, or ticket, how long does delivery take on average?",
    evidenceType: "duration",
    evidenceFields: [
      "start_timestamp_source",
      "delivery_timestamp_source",
      "average_duration",
      "tracking_source",
    ],
    answerStates: {
      verified: "Cycle time is measured and reviewed.",
      incomplete: "Cycle time is felt, not measured.",
      unknown: "Owner does not know cycle time.",
      no: "No timestamp data exists.",
    },
    stableCondition: "Cycle time tracked and stable.",
    slippingCondition: "Cycle time lengthening or volatile.",
    criticalCondition: "Cannot be measured.",
    ...defaultUnknownIncomplete("cycle time"),
    relatedIndustries: [...ALL_INDUSTRIES],
    relatedFailurePatterns: ["delivery_lag", "stuck_step"],
    relatedBenchmarkAnchors: ["cycle_time"],
    relatedTools: ["owner_diagnostic_interview", "operations_diagnostic"],
    adminOnlyNotes:
      "Identify the step where work most often stalls; that step usually owns the cycle.",
    clientSafeExplanation:
      "Cycle time is how fast value moves through the business. Where it stalls is where money sits.",
    deterministicScoringHint:
      "Future: Gear 3 flow interpretation; not auto-scored in IB-H3.",
    interpretiveOnly: true,
    industryNotes: {
      trades_services: "First call → completed job.",
      restaurant_food_service: "Order → table / ticket time.",
      retail: "Receiving → sell-through / restock.",
      cannabis_mmj_mmc: "Intake/check-in → completed transaction; reconciliation cadence.",
    },
    futureWiring: FULL_FUTURE_WIRING,
  },
  {
    metricKey: "operations.owner_bottleneck",
    gear: "operations",
    metricName: "Owner Bottleneck / Owner Step Dependency",
    metricDescription:
      "Number of delivery steps that require the owner before work can move forward.",
    ownerFriendlyQuestion:
      "Which delivery steps absolutely require you before work can move forward?",
    evidenceType: "checklist",
    evidenceFields: [
      "documented_process_steps",
      "owner_required_steps",
      "stuck_step_notes",
      "tracking_source",
    ],
    answerStates: {
      verified: "Steps documented; owner-required steps identified and being reduced.",
      incomplete: "Steps documented; owner-required steps not yet reviewed.",
      unknown: "Owner has not mapped delivery steps.",
      no: "No documented process exists.",
    },
    stableCondition: "Documented process; few owner-required steps; reduction plan in place.",
    slippingCondition: "Many owner-required steps; delivery routinely waits on owner.",
    criticalCondition: "Owner is required for nearly every step; nothing moves without owner.",
    ...defaultUnknownIncomplete("owner-step dependency"),
    relatedIndustries: [...ALL_INDUSTRIES],
    relatedFailurePatterns: ["owner_in_every_step", "no_documented_process"],
    relatedBenchmarkAnchors: [],
    relatedTools: ["owner_diagnostic_interview", "operations_diagnostic", "independence_diagnostic"],
    adminOnlyNotes:
      "Cross-reference with Gear 5 vacation test; ops-side bottleneck usually predicts independence weakness.",
    clientSafeExplanation:
      "When delivery cannot move without the owner, the business runs at the owner's pace, not its own.",
    deterministicScoringHint:
      "Future: Gear 3 + Gear 5 cross-interpretation; not auto-scored in IB-H3.",
    interpretiveOnly: true,
    futureWiring: FULL_FUTURE_WIRING,
  },
  {
    metricKey: "operations.delivery_consistency",
    gear: "operations",
    metricName: "Delivery Process Consistency",
    metricDescription:
      "Whether delivery follows the same documented steps regardless of who is performing the work.",
    ownerFriendlyQuestion:
      "If two different people on your team handle the same job or order, would the customer get the same experience?",
    evidenceType: "narrative",
    evidenceFields: [
      "documented_process_steps",
      "training_artifacts",
      "variance_examples",
      "tracking_source",
    ],
    answerStates: {
      verified: "Documented steps; trained team; consistent delivery.",
      incomplete: "Documented steps but delivery still varies by person.",
      unknown: "Owner does not know how consistent delivery is.",
      no: "No documented delivery process.",
    },
    stableCondition: "Consistent delivery across team members.",
    slippingCondition: "Same job produces different experience by who does it.",
    criticalCondition: "Delivery is improvised every time.",
    ...defaultUnknownIncomplete("delivery consistency"),
    relatedIndustries: [...ALL_INDUSTRIES],
    relatedFailurePatterns: ["delivery_varies_by_person", "no_training_artifacts"],
    relatedBenchmarkAnchors: [],
    relatedTools: ["owner_diagnostic_interview", "operations_diagnostic"],
    adminOnlyNotes:
      "Inconsistency often shows up first as customer complaints; pull complaint data if available.",
    clientSafeExplanation:
      "Consistent delivery is what makes a brand trustworthy and a business scalable.",
    deterministicScoringHint:
      "Future: Gear 3 quality interpretation; not auto-scored in IB-H3.",
    interpretiveOnly: true,
    futureWiring: FULL_FUTURE_WIRING,
  },
];

// ---------------------------------------------------------------------
// Gear 4 — Financial Visibility / Dashboard
// ---------------------------------------------------------------------
const GEAR_4: GearMetric[] = [
  {
    metricKey: "financial.break_even_point",
    gear: "financial",
    metricName: "Break-Even Point",
    metricDescription:
      "Revenue level required each period to cover all fixed and variable costs.",
    ownerFriendlyQuestion:
      "Do you know exactly how much revenue you need each month just to break even?",
    evidenceType: "currency",
    evidenceFields: [
      "monthly_fixed_costs",
      "variable_cost_structure",
      "break_even_revenue",
      "tracking_source",
    ],
    answerStates: {
      verified: "Break-even is calculated and reviewed regularly.",
      incomplete: "Costs are known but break-even is not formally calculated.",
      unknown: "Owner does not know break-even.",
      no: "Cost structure is not documented.",
    },
    stableCondition: "Break-even known and reviewed monthly.",
    slippingCondition: "Break-even is estimated, not calculated.",
    criticalCondition: "Owner cannot identify fixed vs variable costs.",
    ...defaultUnknownIncomplete("break-even point"),
    relatedIndustries: [...ALL_INDUSTRIES],
    relatedFailurePatterns: ["unknown_break_even", "no_cost_segmentation"],
    relatedBenchmarkAnchors: ["break_even"],
    relatedTools: ["owner_diagnostic_interview", "financial_diagnostic", "scorecard_financial"],
    adminOnlyNotes:
      "If unknown, this is the highest-leverage financial repair; almost everything else compounds from it.",
    clientSafeExplanation:
      "Knowing your break-even point tells you what is survival revenue versus growth revenue.",
    deterministicScoringHint:
      "Future: Gear 4 visibility interpretation; not auto-scored in IB-H3.",
    interpretiveOnly: true,
    futureWiring: FULL_FUTURE_WIRING,
  },
  {
    metricKey: "financial.cash_runway",
    gear: "financial",
    metricName: "Cash Runway",
    metricDescription:
      "How many weeks or months of operating expenses the business could cover with current cash on hand.",
    ownerFriendlyQuestion:
      "If revenue stopped tomorrow, how many weeks could you operate on the cash you have right now?",
    evidenceType: "duration",
    evidenceFields: [
      "cash_on_hand",
      "monthly_burn",
      "runway_weeks",
      "tracking_source",
    ],
    answerStates: {
      verified: "Cash and burn known; runway calculated.",
      incomplete: "Cash known; burn rate is rough.",
      unknown: "Owner does not know runway.",
      no: "No cash position visibility.",
    },
    stableCondition: "Runway known and reviewed monthly.",
    slippingCondition: "Runway shrinking without explanation.",
    criticalCondition: "Owner cannot state cash on hand or burn.",
    ...defaultUnknownIncomplete("cash runway"),
    relatedIndustries: [...ALL_INDUSTRIES],
    relatedFailurePatterns: ["no_cash_visibility", "runway_blindness"],
    relatedBenchmarkAnchors: ["cash_runway"],
    relatedTools: ["owner_diagnostic_interview", "financial_diagnostic"],
    adminOnlyNotes:
      "Runway weakness pairs with AR aging weakness; check both before recommending growth spend.",
    clientSafeExplanation:
      "Cash runway is the simplest read on how much pressure the business is actually under.",
    deterministicScoringHint:
      "Future: Gear 4 stability interpretation; not auto-scored in IB-H3.",
    interpretiveOnly: true,
    futureWiring: FULL_FUTURE_WIRING,
  },
  {
    metricKey: "financial.gross_margin",
    gear: "financial",
    metricName: "Gross Margin",
    metricDescription:
      "Revenue minus direct cost of goods/services, expressed as a percentage of revenue.",
    ownerFriendlyQuestion:
      "Do you know your gross margin, and is it stable across jobs or products?",
    evidenceType: "percentage",
    evidenceFields: [
      "revenue_period",
      "cogs_period",
      "gross_margin_percent",
      "tracking_source",
    ],
    answerStates: {
      verified: "Gross margin tracked and reviewed.",
      incomplete: "Margin known at the high level but varies by job/product without explanation.",
      unknown: "Owner does not know gross margin.",
      no: "No COGS tracking.",
    },
    stableCondition: "Margin tracked, stable, near or above industry baseline.",
    slippingCondition: "Margin trending down or highly variable.",
    criticalCondition: "COGS not tracked.",
    ...defaultUnknownIncomplete("gross margin"),
    relatedIndustries: [...ALL_INDUSTRIES],
    relatedFailurePatterns: ["margin_erosion", "untracked_cogs"],
    relatedBenchmarkAnchors: ["gross_margin"],
    relatedTools: ["owner_diagnostic_interview", "financial_diagnostic"],
    adminOnlyNotes:
      "Margin variability without explanation usually points to pricing inconsistency or rework.",
    clientSafeExplanation:
      "Gross margin shows how much of every revenue dollar is left to run the business.",
    deterministicScoringHint:
      "Future: Gear 4 health interpretation; not auto-scored in IB-H3.",
    interpretiveOnly: true,
    futureWiring: FULL_FUTURE_WIRING,
  },
  {
    metricKey: "financial.net_margin",
    gear: "financial",
    metricName: "Net Margin",
    metricDescription:
      "Net profit as a percentage of revenue, after all operating costs and owner pay.",
    ownerFriendlyQuestion:
      "After all bills and your own pay, what percentage of revenue is left?",
    evidenceType: "percentage",
    evidenceFields: [
      "revenue_period",
      "operating_costs_period",
      "owner_pay_period",
      "net_margin_percent",
      "tracking_source",
    ],
    answerStates: {
      verified: "Net margin tracked with owner pay accounted for.",
      incomplete: "Net margin tracked but owner pay is not consistently included.",
      unknown: "Owner does not know net margin.",
      no: "No P&L produced regularly.",
    },
    stableCondition: "Net margin tracked monthly with owner pay properly accounted.",
    slippingCondition: "Net margin tracked but owner pay distorts the number.",
    criticalCondition: "No P&L visibility.",
    ...defaultUnknownIncomplete("net margin"),
    relatedIndustries: [...ALL_INDUSTRIES],
    relatedFailurePatterns: ["owner_pay_distorts_margin", "no_monthly_pl"],
    relatedBenchmarkAnchors: ["net_margin"],
    relatedTools: ["owner_diagnostic_interview", "financial_diagnostic"],
    adminOnlyNotes:
      "If owner is unpaid or underpaid, net margin reads artificially healthy.",
    clientSafeExplanation:
      "Net margin is the truest read on whether the business is paying for itself and you.",
    deterministicScoringHint:
      "Future: Gear 4 truth interpretation; not auto-scored in IB-H3.",
    interpretiveOnly: true,
    futureWiring: FULL_FUTURE_WIRING,
  },
  {
    metricKey: "financial.ar_aging",
    gear: "financial",
    metricName: "AR Aging / Receivables Risk",
    metricDescription:
      "Outstanding receivables broken out by age, with attention to past-due invoices.",
    ownerFriendlyQuestion:
      "Do you know how much money customers currently owe you, and how much of it is past due?",
    evidenceType: "currency",
    evidenceFields: [
      "total_ar",
      "ar_past_due_amount",
      "aging_buckets",
      "tracking_source",
    ],
    answerStates: {
      verified: "AR aging produced and reviewed regularly.",
      incomplete: "AR known but aging not tracked.",
      unknown: "Owner does not know outstanding AR.",
      no: "No invoicing or AR system.",
    },
    stableCondition: "AR aging reviewed; past-due actively collected.",
    slippingCondition: "AR known but past-due is not actively worked.",
    criticalCondition: "AR is unknown; cash-collection is reactive.",
    ...defaultUnknownIncomplete("AR aging"),
    relatedIndustries: [...ALL_INDUSTRIES],
    relatedFailurePatterns: ["uncollected_ar", "no_collections_process"],
    relatedBenchmarkAnchors: ["ar_aging"],
    relatedTools: ["owner_diagnostic_interview", "financial_diagnostic"],
    adminOnlyNotes:
      "Past-due AR is often the cheapest cash to recover before recommending growth investment.",
    clientSafeExplanation:
      "Money already earned but uncollected is the easiest cash to bring home.",
    deterministicScoringHint:
      "Future: Gear 4 cash interpretation; not auto-scored in IB-H3.",
    interpretiveOnly: true,
    futureWiring: FULL_FUTURE_WIRING,
  },
];

// ---------------------------------------------------------------------
// Gear 5 — Owner Independence / Remote Control
// ---------------------------------------------------------------------
const GEAR_5: GearMetric[] = [
  {
    metricKey: "independence.vacation_test",
    gear: "independence",
    metricName: "Vacation Test Score",
    metricDescription:
      "Whether the owner can leave the business for 14 consecutive days without revenue or quality loss.",
    ownerFriendlyQuestion:
      "Could you leave the business for 14 days, fully unplugged, without revenue or quality loss?",
    evidenceType: "narrative",
    evidenceFields: [
      "last_unplugged_period_days",
      "what_breaks_when_owner_is_away",
      "coverage_plan",
      "tracking_source",
    ],
    answerStates: {
      verified: "Owner has actually done it within the last 12 months.",
      incomplete: "Owner has tried but had to intervene.",
      unknown: "Owner has never tried.",
      no: "Business cannot operate without owner for more than a day or two.",
    },
    stableCondition: "Owner has unplugged for 14 days without loss.",
    slippingCondition: "Owner has unplugged briefly but had to intervene.",
    criticalCondition: "Owner cannot leave at all.",
    ...defaultUnknownIncomplete("vacation test"),
    relatedIndustries: [...ALL_INDUSTRIES],
    relatedFailurePatterns: ["owner_cannot_unplug", "no_coverage_plan"],
    relatedBenchmarkAnchors: [],
    relatedTools: ["owner_diagnostic_interview", "independence_diagnostic", "scorecard_independence"],
    adminOnlyNotes:
      "Vacation-test failure correlates strongly with owner-bottleneck operations metric.",
    clientSafeExplanation:
      "If the business cannot run without you for two weeks, you do not own a business yet — you own a job.",
    deterministicScoringHint:
      "Future: Gear 5 independence interpretation; not auto-scored in IB-H3.",
    interpretiveOnly: true,
    futureWiring: FULL_FUTURE_WIRING,
  },
  {
    metricKey: "independence.decision_frequency",
    gear: "independence",
    metricName: "Decision Frequency",
    metricDescription:
      "Number of daily questions or decisions that require the owner to keep work moving.",
    ownerFriendlyQuestion:
      "On a normal day, how many decisions does the team bring to you that they could not make on their own?",
    evidenceType: "numeric",
    evidenceFields: [
      "daily_owner_decisions",
      "decision_examples",
      "decision_authority_notes",
      "tracking_source",
    ],
    answerStates: {
      verified: "Decision count is known and being reduced through clear authority.",
      incomplete: "Decision count is felt but unmeasured.",
      unknown: "Owner cannot estimate.",
      no: "No decision authority is documented for the team.",
    },
    stableCondition: "Low and trending down with documented authority rules.",
    slippingCondition: "High and unmeasured.",
    criticalCondition: "Every decision routes through the owner.",
    ...defaultUnknownIncomplete("decision frequency"),
    relatedIndustries: [...ALL_INDUSTRIES],
    relatedFailurePatterns: ["all_decisions_to_owner", "no_decision_authority"],
    relatedBenchmarkAnchors: [],
    relatedTools: ["owner_diagnostic_interview", "independence_diagnostic"],
    adminOnlyNotes:
      "High decision frequency is a leading indicator of burnout; flag for support cadence.",
    clientSafeExplanation:
      "Every decision that has to come to you is a decision the team cannot make without you.",
    deterministicScoringHint:
      "Future: Gear 5 load interpretation; not auto-scored in IB-H3.",
    interpretiveOnly: true,
    futureWiring: FULL_FUTURE_WIRING,
  },
  {
    metricKey: "independence.documentation_coverage",
    gear: "independence",
    metricName: "Documentation Coverage",
    metricDescription:
      "Percentage of core operating tasks that have a documented SOP the team can follow.",
    ownerFriendlyQuestion:
      "Of the core tasks that keep the business running, what percent have a written SOP your team can follow?",
    evidenceType: "percentage",
    evidenceFields: [
      "core_task_list",
      "tasks_with_sop_count",
      "sop_storage_location",
      "tracking_source",
    ],
    answerStates: {
      verified: "Core task list exists; SOPs cover most tasks; team uses them.",
      incomplete: "Some SOPs exist but coverage is inconsistent.",
      unknown: "Owner does not know what is documented.",
      no: "No SOPs exist.",
    },
    stableCondition: "Most core tasks have SOPs in active use.",
    slippingCondition: "Partial SOPs; team improvises in the gaps.",
    criticalCondition: "Knowledge lives only in the owner's head.",
    ...defaultUnknownIncomplete("documentation coverage"),
    relatedIndustries: [...ALL_INDUSTRIES],
    relatedFailurePatterns: ["no_sops", "knowledge_in_owners_head"],
    relatedBenchmarkAnchors: [],
    relatedTools: ["owner_diagnostic_interview", "independence_diagnostic"],
    adminOnlyNotes:
      "Pair with single-point-of-failure metric; gaps usually overlap.",
    clientSafeExplanation:
      "Documented SOPs are how the business keeps running when memory and improvisation fail.",
    deterministicScoringHint:
      "Future: Gear 5 durability interpretation; not auto-scored in IB-H3.",
    interpretiveOnly: true,
    futureWiring: FULL_FUTURE_WIRING,
  },
  {
    metricKey: "independence.single_point_of_failure",
    gear: "independence",
    metricName: "Single Point of Failure",
    metricDescription:
      "Accounts, passwords, vendor relationships, and decisions that only the owner controls.",
    ownerFriendlyQuestion:
      "What passwords, accounts, or vendor relationships only you can access today?",
    evidenceType: "checklist",
    evidenceFields: [
      "owner_only_passwords",
      "owner_only_accounts",
      "owner_only_vendor_relationships",
      "tracking_source",
    ],
    answerStates: {
      verified: "Inventory exists; access is shared appropriately.",
      incomplete: "Inventory exists but sharing has not been completed.",
      unknown: "Owner has not inventoried access.",
      no: "Owner controls everything; nothing is shared.",
    },
    stableCondition: "Access is shared with documented backups.",
    slippingCondition: "Some access shared; key items still owner-only.",
    criticalCondition: "Everything routes through the owner alone.",
    ...defaultUnknownIncomplete("single point of failure"),
    relatedIndustries: [...ALL_INDUSTRIES],
    relatedFailurePatterns: ["owner_only_access", "no_continuity_plan"],
    relatedBenchmarkAnchors: [],
    relatedTools: ["owner_diagnostic_interview", "independence_diagnostic"],
    adminOnlyNotes:
      "This is a continuity risk. Recommend a basic access inventory in repair map.",
    clientSafeExplanation:
      "If only one person can access something critical, that person becomes the business's biggest risk.",
    deterministicScoringHint:
      "Future: Gear 5 continuity interpretation; not auto-scored in IB-H3.",
    interpretiveOnly: true,
    futureWiring: FULL_FUTURE_WIRING,
  },
  {
    metricKey: "independence.delegation_clarity",
    gear: "independence",
    metricName: "Delegation / Accountability Clarity",
    metricDescription:
      "Whether each core area of the business has a clear owner with the authority to act.",
    ownerFriendlyQuestion:
      "For each core area of the business, can you name one person — other than you — who owns it?",
    evidenceType: "checklist",
    evidenceFields: [
      "core_areas_list",
      "area_owner_assignments",
      "escalation_rules",
      "tracking_source",
    ],
    answerStates: {
      verified: "Every core area has an accountable owner with documented authority.",
      incomplete: "Owners exist but authority and escalation rules are fuzzy.",
      unknown: "Owner has not mapped accountabilities.",
      no: "Owner is the only accountable person.",
    },
    stableCondition: "Accountability assigned and documented; escalation rules clear.",
    slippingCondition: "Accountabilities exist informally only.",
    criticalCondition: "Owner is accountable for everything.",
    ...defaultUnknownIncomplete("delegation / accountability clarity"),
    relatedIndustries: [...ALL_INDUSTRIES],
    relatedFailurePatterns: ["no_accountable_owners", "owner_owns_everything"],
    relatedBenchmarkAnchors: [],
    relatedTools: ["owner_diagnostic_interview", "independence_diagnostic"],
    adminOnlyNotes:
      "Pair with decision-frequency metric; weakness here usually drives that one.",
    clientSafeExplanation:
      "Clear accountability is what allows the team to act without waiting for you.",
    deterministicScoringHint:
      "Future: Gear 5 leadership interpretation; not auto-scored in IB-H3.",
    interpretiveOnly: true,
    futureWiring: FULL_FUTURE_WIRING,
  },
];

export const GEAR_METRIC_REGISTRY: GearMetric[] = [
  ...GEAR_1,
  ...GEAR_2,
  ...GEAR_3,
  ...GEAR_4,
  ...GEAR_5,
];

export function getMetricsByGear(gear: GearKey): GearMetric[] {
  return GEAR_METRIC_REGISTRY.filter((m) => m.gear === gear);
}

export function getMetricByKey(metricKey: string): GearMetric | undefined {
  return GEAR_METRIC_REGISTRY.find((m) => m.metricKey === metricKey);
}

/**
 * Answer-state helper for admin review surfaces (IB-H4 will consume).
 * Treats "unknown" as a visibility weakness, not a neutral state, and
 * "incomplete" as a system-exists-but-slips signal, not a pass.
 */
export function interpretAnswerState(state: AnswerState): {
  isStable: boolean;
  isVisibilityWeakness: boolean;
  isSlipping: boolean;
} {
  switch (state) {
    case "verified":
      return { isStable: true, isVisibilityWeakness: false, isSlipping: false };
    case "incomplete":
      return { isStable: false, isVisibilityWeakness: false, isSlipping: true };
    case "unknown":
      return { isStable: false, isVisibilityWeakness: true, isSlipping: true };
    case "no":
      return { isStable: false, isVisibilityWeakness: false, isSlipping: true };
  }
}

// ---------------------------------------------------------------------
// Tool / question mapping (IB-H3 minimum). Each metric is mapped into
// the Owner Diagnostic Interview by default, plus its gear-specific
// diagnostic tool. IB-H3B will harden industry-specific tool depth.
// ---------------------------------------------------------------------

export interface GearMetricQuestionMap {
  metricKey: string;
  toolKey: string;
  questionKey: string;
  questionText: string;
  evidencePrompt: string;
  clientSafeHelpText: string;
  adminOnlyNotes: string;
  displayOrder: number;
  requiredStage: "intake" | "diagnostic" | "implementation";
  clientVisible: boolean;
  interpretiveOnly: boolean;
}

export const GEAR_METRIC_QUESTION_MAP: GearMetricQuestionMap[] =
  GEAR_METRIC_REGISTRY.flatMap((m, idx) => {
    const gearToolKey = `${m.gear}_diagnostic`;
    const evidencePrompt =
      `Share where this is tracked today (CRM, POS, invoice system, spreadsheet, ` +
      `job board, or describe in plain English). "Not tracked" is a valid answer ` +
      `and is treated as visibility evidence.`;
    return [
      {
        metricKey: m.metricKey,
        toolKey: "owner_diagnostic_interview",
        questionKey: `odi.${m.metricKey}`,
        questionText: m.ownerFriendlyQuestion,
        evidencePrompt,
        clientSafeHelpText: m.clientSafeExplanation,
        adminOnlyNotes: m.adminOnlyNotes,
        displayOrder: idx + 1,
        requiredStage: "diagnostic" as const,
        clientVisible: true,
        interpretiveOnly: m.interpretiveOnly,
      },
      {
        metricKey: m.metricKey,
        toolKey: gearToolKey,
        questionKey: `${gearToolKey}.${m.metricKey}`,
        questionText: m.ownerFriendlyQuestion,
        evidencePrompt,
        clientSafeHelpText: m.clientSafeExplanation,
        adminOnlyNotes: m.adminOnlyNotes,
        displayOrder: idx + 1,
        requiredStage: "diagnostic" as const,
        clientVisible: true,
        interpretiveOnly: m.interpretiveOnly,
      },
    ];
  });