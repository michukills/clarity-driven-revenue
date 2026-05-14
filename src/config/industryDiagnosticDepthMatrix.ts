/**
 * P93E-E2E — Industry Diagnostic Depth Matrix.
 *
 * Additive interpretation layer that compiles, per supported industry
 * and per RGS 5-Gear, the 14 dimensions used by:
 *   - the public Scorecard (light industry-aware prompts, classifier hints)
 *   - the paid Diagnostic Interview (deeper open-ended prompts + evidence)
 *   - admin diagnostic review (contradiction + false-green + repair triggers)
 *   - client-safe diagnostic explanation (calm, non-promissory language)
 *
 * This file is INTERPRETATION METADATA ONLY.
 * It does not modify deterministic v3 scoring, does not create live
 * connector behavior, and does not certify legal / tax / accounting /
 * compliance / valuation / lender / investor matters.
 *
 * Cannabis / MMJ rows must always speak operational documentation
 * visibility — never legal compliance certification. Tests in
 * src/lib/__tests__/p93eE2eIndustryDiagnosticDepthMatrix.test.ts
 * enforce this.
 */

import {
  DEPTH_FORBIDDEN_CLAIMS,
  type DepthEvidenceSourceType,
} from "@/config/industryOperationalDepth";
import type { RepairMapTriggerKey } from "@/config/industryDepthExpansion";

/* ---------- Types ---------- */

export type MatrixIndustryKey =
  | "trades_home_services"
  | "restaurant_food_service"
  | "retail"
  | "professional_services"
  | "ecommerce_online_retail"
  | "cannabis_mmj_dispensary"
  | "general_service_other";

export type MatrixGearKey =
  | "demand_generation"
  | "revenue_conversion"
  | "operational_efficiency"
  | "financial_visibility"
  | "owner_independence";

/** Fixed rubric states used by classifier interpretation. Score itself
 *  remains v3-deterministic; this only describes states for admins. */
export type RubricState =
  | "absent_or_unknown"
  | "informal_or_owner_in_head"
  | "documented_but_inconsistent"
  | "tracked_with_review"
  | "tracked_reviewed_and_evidence_supported";

export interface DiagnosticDepthCell {
  /** Plain-English KPI / process being tested. Industry-aware. */
  kpi: string;
  process: string;
  /** Open-ended Scorecard prompt (kept short for 10-15 minute intake). */
  scorecard_question: string;
  /** Deeper paid Diagnostic Interview prompt — must require richer answer. */
  diagnostic_interview_question: string;
  /** Evidence the admin should look for during paid diagnostic. */
  evidence_prompts: ReadonlyArray<string>;
  evidence_source_hints: ReadonlyArray<DepthEvidenceSourceType>;
  /** Five fixed rubric states the classifier maps owner text into. */
  rubric_states: ReadonlyArray<RubricState>;
  /** Contradiction check — claim vs. missing evidence. */
  contradiction_check: string;
  /** Common failure pattern. */
  failure_pattern: string;
  /** "Looks healthy on the surface but…" trap. */
  false_green_trap: string;
  /** Repair-map trigger key (enum from industryDepthExpansion). */
  repair_map_trigger: RepairMapTriggerKey;
  /** Sequencing intent — earlier means more foundational. */
  priority_sequence:
    | "foundational"
    | "stabilize"
    | "tighten"
    | "optimize";
  /** Admin-only review note; never client-visible. */
  admin_review_note: string;
  /** Calm client-safe explanation; never promissory or compliance-laden. */
  client_safe_explanation: string;
}

export type IndustryMatrix = Record<MatrixGearKey, DiagnosticDepthCell>;

/* ---------- Common rubric ---------- */

export const STANDARD_RUBRIC_STATES: ReadonlyArray<RubricState> = [
  "absent_or_unknown",
  "informal_or_owner_in_head",
  "documented_but_inconsistent",
  "tracked_with_review",
  "tracked_reviewed_and_evidence_supported",
];

export const MATRIX_INDUSTRY_KEYS: ReadonlyArray<MatrixIndustryKey> = [
  "trades_home_services",
  "restaurant_food_service",
  "retail",
  "professional_services",
  "ecommerce_online_retail",
  "cannabis_mmj_dispensary",
  "general_service_other",
];

export const MATRIX_GEAR_KEYS: ReadonlyArray<MatrixGearKey> = [
  "demand_generation",
  "revenue_conversion",
  "operational_efficiency",
  "financial_visibility",
  "owner_independence",
];

/* ---------- Helpers used to keep rows compact ---------- */

function cell(c: Omit<DiagnosticDepthCell, "rubric_states"> & {
  rubric_states?: ReadonlyArray<RubricState>;
}): DiagnosticDepthCell {
  return { rubric_states: STANDARD_RUBRIC_STATES, ...c };
}

/* ============================================================
 * Trades / Home Services
 * ============================================================ */

const TRADES: IndustryMatrix = {
  demand_generation: cell({
    kpi: "Lead source by service line and speed-to-contact",
    process: "Inbound call/web inquiry capture and first-response routing",
    scorecard_question:
      "How do new leads come in by service line, and how fast does someone respond?",
    diagnostic_interview_question:
      "Walk through a brand-new inquiry from ring or form submit to first contact. Where is it logged, who answers when the phone rings, and what is the typical time to first call back?",
    evidence_prompts: [
      "Call log or VoIP report for the last 30 days",
      "CRM/job-board export with lead source field",
      "Web form submission history",
    ],
    evidence_source_hints: ["manual_spreadsheet", "hubspot_manual_export", "owner_interview"],
    contradiction_check:
      "Owner says marketing tracks lead source, but no source field exists on inquiries or the field is mostly blank.",
    failure_pattern:
      "Marketing spend is blamed for slow growth while intake / first-response is the real leak.",
    false_green_trap:
      "High lead volume looks healthy but booked-job rate is low because contact speed and intake quality are weak.",
    repair_map_trigger: "capture_missing_signal",
    priority_sequence: "foundational",
    admin_review_note:
      "Confirm one place where every inquiry is captured before recommending paid acquisition work.",
    client_safe_explanation:
      "This appears to be a visibility gap in how inquiries are captured. RGS would look for a single inquiry log before drawing conclusions about marketing.",
  }),
  revenue_conversion: cell({
    kpi: "Booking rate and quote-to-job conversion",
    process: "Estimate / quote follow-up and scheduling",
    scorecard_question:
      "Of the leads that come in, roughly what share become booked jobs, and how do you know?",
    diagnostic_interview_question:
      "Walk through how a quote becomes a booked job. What is tracked, who follows up on quoted-but-not-booked work, and how often does that happen?",
    evidence_prompts: [
      "Quote / proposal tracker",
      "CRM stage report",
      "Calendar / scheduling export",
    ],
    evidence_source_hints: ["manual_spreadsheet", "hubspot_manual_export", "owner_interview"],
    contradiction_check:
      "Owner reports strong close rate but cannot list quoted-but-not-booked work for the last two weeks.",
    failure_pattern:
      "Quotes go out and are never systematically followed up; conversion depends on memory.",
    false_green_trap:
      "Crews look busy but unbooked quotes pile up and capacity is wasted.",
    repair_map_trigger: "tighten_follow_up",
    priority_sequence: "stabilize",
    admin_review_note:
      "Compare CRM/quote tracker to owner statements. Treat absence of a tracker as a process gap, not a software gap.",
    client_safe_explanation:
      "This may indicate a gap between quoting and booking. RGS would verify with a quote tracker before recommending changes.",
  }),
  operational_efficiency: cell({
    kpi: "Technician utilization, dispatch capacity, and callback / rework rate",
    process: "Dispatch, schedule build, and warranty / callback handling",
    scorecard_question:
      "How is the daily schedule built, and how often do crews go back for callbacks or warranty work?",
    diagnostic_interview_question:
      "Describe how tomorrow's schedule is built today. Where do callbacks and warranty calls go on the board, and roughly what share of capacity do they consume in a normal week?",
    evidence_prompts: [
      "Dispatch board export",
      "Callback / warranty log",
      "Payroll hours vs. billable hours by tech",
    ],
    evidence_source_hints: ["adp_manual_export" as DepthEvidenceSourceType, "manual_spreadsheet", "owner_interview"],
    contradiction_check:
      "Owner says callbacks are rare but no callback log exists and warranty visits are scheduled in the same column as new work.",
    failure_pattern:
      "Callbacks and warranty visits silently consume billable capacity; owner becomes the backup dispatcher.",
    false_green_trap:
      "'Crews are busy' is treated as healthy while billable hours per paid hour drift down.",
    repair_map_trigger: "capacity_review",
    priority_sequence: "stabilize",
    admin_review_note:
      "Look for separation of new work vs. warranty/callback on the schedule before judging capacity. No labor-law determination.",
    client_safe_explanation:
      "This looks like an operational visibility gap around callbacks and capacity. RGS would review the schedule and a callback log together.",
  }),
  financial_visibility: cell({
    kpi: "Job costing and gross margin by service line",
    process: "Per-job cost capture and weekly margin review",
    scorecard_question:
      "Can you tell which service lines or job types make money and which lose money?",
    diagnostic_interview_question:
      "How is the cost of a finished job assembled — labor, materials, truck time, callbacks — and where do you actually see margin by service line?",
    evidence_prompts: [
      "Job costing report",
      "P&L by class / service line",
      "Gross margin by job type",
    ],
    evidence_source_hints: ["quickbooks_manual_export", "manual_spreadsheet", "owner_interview"],
    contradiction_check:
      "Owner reports strong margins but cannot produce a margin number by service line or job type.",
    failure_pattern:
      "Job costing lives in the owner's head; loss-leader service lines are protected because volume looks healthy.",
    false_green_trap:
      "Top-line revenue is up while contribution per job slowly weakens.",
    repair_map_trigger: "pricing_margin_review",
    priority_sequence: "tighten",
    admin_review_note:
      "This is operational margin review only — not an accounting opinion or tax determination.",
    client_safe_explanation:
      "This may be a margin-visibility gap. RGS would look for a job costing report before recommending pricing changes.",
  }),
  owner_independence: cell({
    kpi: "Owner involvement in dispatch, estimating, escalation, and quality control",
    process: "Decision rights and on-call escalation rules",
    scorecard_question:
      "When something goes sideways on a job, who handles it, and how often does it pull you back in?",
    diagnostic_interview_question:
      "If you stepped away for two weeks, what specifically would break first — dispatch, estimating, escalation, quality control? Who is the named backup for each?",
    evidence_prompts: [
      "Decision-rights worksheet",
      "On-call rotation",
      "SOPs for the top recurring exceptions",
    ],
    evidence_source_hints: ["sop_document", "owner_interview", "weekly_review_log"],
    contradiction_check:
      "Owner reports the team is independent but is still the named backup for dispatch, estimating, and escalations.",
    failure_pattern:
      "Owner is the de facto lead dispatcher / senior estimator / escalation point; growth caps at owner attention.",
    false_green_trap:
      "Smooth weeks feel like independence, but every exception still routes to the owner.",
    repair_map_trigger: "training_handoff",
    priority_sequence: "tighten",
    admin_review_note:
      "Decision-rights work, not employment / HR advice.",
    client_safe_explanation:
      "This appears to be an owner-dependence pattern. RGS would document decision rights for the recurring exceptions.",
  }),
};

/* ============================================================
 * Restaurants / Food Service
 * ============================================================ */

const RESTAURANT: IndustryMatrix = {
  demand_generation: cell({
    kpi: "Repeat-guest movement and daypart traffic",
    process: "Repeat / loyalty signal review and daypart promotion cadence",
    scorecard_question:
      "How do you know whether guests are coming back, and which dayparts are growing or shrinking?",
    diagnostic_interview_question:
      "What signal tells you a guest came back this month vs. last month, and how do you decide where to put marketing or staffing attention by daypart?",
    evidence_prompts: [
      "POS sales by daypart",
      "Repeat / loyalty report",
      "Marketing calendar",
    ],
    evidence_source_hints: ["pos_manual_export", "manual_spreadsheet", "owner_interview"],
    contradiction_check:
      "Owner says repeat guests are growing but no loyalty signal or POS-based repeat metric is reviewed.",
    failure_pattern:
      "Marketing buys attention without learning what brings guests back.",
    false_green_trap:
      "Sales are up but driven by discounts; repeat behavior is unknown.",
    repair_map_trigger: "customer_experience_review",
    priority_sequence: "tighten",
    admin_review_note:
      "Loyalty platform vs. POS conflict should route to source-of-truth review.",
    client_safe_explanation:
      "This may be a demand-visibility gap around repeat guests. RGS would compare POS and loyalty signals.",
  }),
  revenue_conversion: cell({
    kpi: "Average ticket, table turns, and ticket times",
    process: "Service flow during peak and menu-driven check-build",
    scorecard_question:
      "How do you know whether your peak service is converting well — table turns, average ticket, ticket times?",
    diagnostic_interview_question:
      "Walk through a Friday dinner from door to check. Where does service slow down most often, and what number tells you that is happening?",
    evidence_prompts: [
      "POS ticket time report",
      "Average ticket by daypart",
      "Table-turn notes",
    ],
    evidence_source_hints: ["pos_manual_export", "daily_sales_log"],
    contradiction_check:
      "Owner says peak is smooth but ticket-time and table-turn data are not reviewed.",
    failure_pattern:
      "Ticket times hurt the guest experience but are never measured; check averages drift down quietly.",
    false_green_trap:
      "Full house feels like success; turns and average ticket are not measured.",
    repair_map_trigger: "capacity_review",
    priority_sequence: "tighten",
    admin_review_note:
      "Operating visibility — not staffing-law or wage review.",
    client_safe_explanation:
      "This appears to be a service-flow visibility gap. RGS would look at ticket-time and turns together.",
  }),
  operational_efficiency: cell({
    kpi: "Prime cost, prep variance, and labor by daypart",
    process: "Schedule build, prep planning, and waste tracking",
    scorecard_question:
      "How are labor and prep planned each week, and where does waste actually show up?",
    diagnostic_interview_question:
      "Walk through how next week's schedule and prep are planned. Where does waste get logged, and who reviews comps and voids?",
    evidence_prompts: [
      "Labor schedule and payroll",
      "Waste / prep variance log",
      "Comp / void report",
    ],
    evidence_source_hints: ["pos_manual_export", "manual_spreadsheet", "daily_sales_log"],
    contradiction_check:
      "Owner says prime cost is in line but no prep variance, waste, or comp/void log exists.",
    failure_pattern:
      "Prep is planned by instinct, comps and voids are accepted as normal, prime cost drifts.",
    false_green_trap:
      "'Sales are up' hides prime-cost drift and uncontrolled comps.",
    repair_map_trigger: "pricing_margin_review",
    priority_sequence: "stabilize",
    admin_review_note:
      "Operational margin review only — no food-safety or regulatory determination.",
    client_safe_explanation:
      "This may be a prime-cost visibility gap. RGS would review labor, waste, and comps together.",
  }),
  financial_visibility: cell({
    kpi: "Item-level menu margin and food cost by category",
    process: "Menu engineering and vendor cost-line review",
    scorecard_question:
      "Do you know which menu items actually make money, or just which ones sell the most?",
    diagnostic_interview_question:
      "Pick your top three sellers. What is the contribution per plate after current vendor pricing, and when was that last refreshed?",
    evidence_prompts: [
      "Menu engineering / costing sheet",
      "Item-level POS sales report",
      "Vendor invoices for the last 30 days",
    ],
    evidence_source_hints: ["menu_engineering_sheet", "pos_manual_export", "manual_spreadsheet"],
    contradiction_check:
      "Owner reports strong margin but item-level margin sheet is missing or stale.",
    failure_pattern:
      "Best sellers are assumed to be most profitable; vendor price changes outpace menu updates.",
    false_green_trap:
      "POS popularity report looks healthy while item margin quietly weakens.",
    repair_map_trigger: "pricing_margin_review",
    priority_sequence: "tighten",
    admin_review_note:
      "Operational margin review — not an accounting opinion.",
    client_safe_explanation:
      "This appears to be an item-margin visibility gap. RGS would refresh menu costing before pricing decisions.",
  }),
  owner_independence: cell({
    kpi: "Manager coverage during peak and closing-routine consistency",
    process: "Manager-on-duty rules and opening / closing checklists",
    scorecard_question:
      "When you are not on the floor, how confident are you that peak service runs the same way?",
    diagnostic_interview_question:
      "Who runs Friday dinner if you are out, and what specifically would they do differently than you? Where is that written down?",
    evidence_prompts: [
      "Manager-on-duty rotation",
      "Opening / closing checklist",
      "Cash drop and reconciliation log",
    ],
    evidence_source_hints: ["sop_document", "owner_interview", "weekly_review_log"],
    contradiction_check:
      "Owner says managers run the floor but is still the named backup for cash, exceptions, and labor calls.",
    failure_pattern:
      "Owner covers manager gaps; closing routine and cash control vary by shift.",
    false_green_trap:
      "Smooth shifts when owner is present mask weak coverage when owner is away.",
    repair_map_trigger: "training_handoff",
    priority_sequence: "stabilize",
    admin_review_note:
      "Decision-rights and routine work — not employment / wage advice.",
    client_safe_explanation:
      "This may be an owner-coverage gap. RGS would look at MOD rules and the closing checklist.",
  }),
};

/* ============================================================
 * Retail
 * ============================================================ */

const RETAIL: IndustryMatrix = {
  demand_generation: cell({
    kpi: "Foot-traffic / inquiry source and channel mix",
    process: "How customers find the store and what brings them back",
    scorecard_question:
      "How do customers find you today, and which channels actually drive return visits?",
    diagnostic_interview_question:
      "What evidence tells you which channel a customer came from, and how do you decide where to focus next month's attention?",
    evidence_prompts: [
      "POS customer / loyalty export",
      "Marketing channel report",
      "Manual inquiry log",
    ],
    evidence_source_hints: ["pos_manual_export", "manual_spreadsheet", "google_analytics_manual_export"],
    contradiction_check:
      "Owner names channels but no source field on transactions or inquiries.",
    failure_pattern:
      "Marketing decisions are made on which channel feels active, not what drives revenue.",
    false_green_trap:
      "Total foot traffic is up while repeat-customer share quietly falls.",
    repair_map_trigger: "channel_concentration_review",
    priority_sequence: "tighten",
    admin_review_note:
      "Operating concentration visibility — not marketing attribution certainty.",
    client_safe_explanation:
      "This appears to be a channel-visibility gap. RGS would look for source data on transactions.",
  }),
  revenue_conversion: cell({
    kpi: "Conversion rate and average transaction value",
    process: "In-store conversion and add-on attachment",
    scorecard_question:
      "How do you know whether visitors actually buy, and what your average transaction looks like?",
    diagnostic_interview_question:
      "Walk through a normal hour on the floor. What changes the share of visitors who buy and the size of their basket?",
    evidence_prompts: [
      "POS transaction-count vs. traffic-count",
      "Average ticket trend",
      "Add-on / attachment report",
    ],
    evidence_source_hints: ["pos_manual_export", "manual_spreadsheet"],
    contradiction_check:
      "Owner reports strong conversion but no traffic count exists to compare to transactions.",
    failure_pattern:
      "Conversion is assumed; promo decisions are made without conversion or ATV signal.",
    false_green_trap:
      "Busy days feel healthy; conversion and ATV are not measured.",
    repair_map_trigger: "capture_missing_signal",
    priority_sequence: "stabilize",
    admin_review_note:
      "Manual traffic counters and POS exports are evidence inputs only.",
    client_safe_explanation:
      "This may be a conversion-visibility gap. RGS would compare traffic to transactions.",
  }),
  operational_efficiency: cell({
    kpi: "Sell-through, stockouts, and shrink",
    process: "Reorder cadence, inventory counts, and shrink categorization",
    scorecard_question:
      "How are reorders decided, and how do you separate shrink from damage and miscounts?",
    diagnostic_interview_question:
      "Walk through how a low-stock SKU is detected, reordered, and reconciled. Where is shrink logged separately from damage and miscount?",
    evidence_prompts: [
      "Inventory aging / sell-through report",
      "Stockout log",
      "Shrink / damage log",
    ],
    evidence_source_hints: ["inventory_count_sheet", "pos_manual_export", "manual_spreadsheet"],
    contradiction_check:
      "Owner says shrink is low but it is not separated from damage and miscount in any record.",
    failure_pattern:
      "Reorders live in the owner's head; stockouts treated as normal; shrink unmeasured.",
    false_green_trap:
      "Top movers look healthy while dead stock ties up cash on the shelf.",
    repair_map_trigger: "inventory_control",
    priority_sequence: "stabilize",
    admin_review_note:
      "Operational inventory only — no valuation, tax, or regulated-inventory claims.",
    client_safe_explanation:
      "This appears to be an inventory-visibility gap. RGS would look for sell-through and a shrink log.",
  }),
  financial_visibility: cell({
    kpi: "Gross margin by category and markdown discipline",
    process: "Category-level margin review and planned markdowns",
    scorecard_question:
      "Can you see margin by category, or only total store margin?",
    diagnostic_interview_question:
      "Pick a category. What is its gross margin after markdowns, and how is the next markdown decided — by plan or by feel?",
    evidence_prompts: [
      "Category margin report",
      "Markdown / discount report",
      "Vendor invoices",
    ],
    evidence_source_hints: ["category_margin_report", "pos_manual_export", "manual_spreadsheet"],
    contradiction_check:
      "Owner reports healthy margin but markdowns and category margin are not reviewed.",
    failure_pattern:
      "Markdowns are reactive; category margin is unknown; pricing depends on memory.",
    false_green_trap:
      "Top sellers move well but contribute the least margin.",
    repair_map_trigger: "pricing_margin_review",
    priority_sequence: "tighten",
    admin_review_note:
      "Operational margin review — no accounting opinion.",
    client_safe_explanation:
      "This may be a category-margin visibility gap. RGS would review category margin and markdowns together.",
  }),
  owner_independence: cell({
    kpi: "Owner dependence on buying and merchandising",
    process: "Buying decisions, merchandising cadence, and exception handling",
    scorecard_question:
      "When buying or merchandising decisions need to be made, how often do they wait for you?",
    diagnostic_interview_question:
      "Who decides what to buy next, who builds the next merchandising change, and what happens when you are out for a week?",
    evidence_prompts: [
      "Buying / reorder process notes",
      "Merchandising calendar",
      "Decision-rights worksheet",
    ],
    evidence_source_hints: ["sop_document", "owner_interview", "weekly_review_log"],
    contradiction_check:
      "Owner says staff handles buying and merchandising but is the named approver for both.",
    failure_pattern:
      "Owner is the only buyer/merchandiser; growth caps at owner attention.",
    false_green_trap:
      "Calm weeks mask the fact that every buying decision still routes to the owner.",
    repair_map_trigger: "training_handoff",
    priority_sequence: "tighten",
    admin_review_note:
      "Decision-rights work; not employment advice.",
    client_safe_explanation:
      "This appears to be an owner-dependence pattern around buying and merchandising.",
  }),
};

/* ============================================================
 * Professional Services
 * ============================================================ */

const PROFESSIONAL_SERVICES: IndustryMatrix = {
  demand_generation: cell({
    kpi: "Lead-to-consult conversion and consult qualification",
    process: "Inbound qualification and consult booking",
    scorecard_question:
      "How are inbound inquiries qualified before a consult, and how often does that filter actually run?",
    diagnostic_interview_question:
      "Walk through how an inquiry becomes a booked consult. What disqualifies a lead today, and how often does the owner end up consulting unqualified prospects?",
    evidence_prompts: [
      "CRM / pipeline export",
      "Consult booking log",
      "Qualification checklist or intake form",
    ],
    evidence_source_hints: ["hubspot_manual_export", "salesforce_manual_export", "manual_spreadsheet"],
    contradiction_check:
      "Owner reports qualified pipeline but no qualification step exists before consults.",
    failure_pattern:
      "Owner spends meaningful time on consults that were never going to convert.",
    false_green_trap:
      "Pipeline looks full while consult-to-client conversion drops.",
    repair_map_trigger: "tighten_follow_up",
    priority_sequence: "stabilize",
    admin_review_note:
      "Compare CRM export and owner interview for source-of-truth conflict before approving.",
    client_safe_explanation:
      "This may be a qualification gap. RGS would look at the intake step before recommending demand work.",
  }),
  revenue_conversion: cell({
    kpi: "Proposal cycle time and proposal-to-client conversion",
    process: "Proposal build, scope definition, and follow-up",
    scorecard_question:
      "How long does a proposal take to go out, and how often is it followed up on?",
    diagnostic_interview_question:
      "Walk through your last three proposals. How was scope set, how long did each take to send, and what was the follow-up cadence after?",
    evidence_prompts: [
      "Proposal tracker",
      "Pipeline stage report",
      "Follow-up log",
    ],
    evidence_source_hints: ["manual_spreadsheet", "pipedrive_manual_export", "owner_interview"],
    contradiction_check:
      "Owner reports fast turnaround but proposals are rebuilt from scratch each time and follow-up is ad hoc.",
    failure_pattern:
      "Proposals are bespoke and slow; follow-up depends on memory.",
    false_green_trap:
      "A few signed engagements feel like strong conversion while many proposals quietly age out.",
    repair_map_trigger: "tighten_follow_up",
    priority_sequence: "stabilize",
    admin_review_note:
      "Operating visibility — not legal or contract advice on engagement letters.",
    client_safe_explanation:
      "This appears to be a proposal-conversion gap. RGS would look at a proposal tracker.",
  }),
  operational_efficiency: cell({
    kpi: "Utilization, scope creep, and delivery capacity by role",
    process: "Time tracking, scope-change handling, and project staffing",
    scorecard_question:
      "How is delivery capacity tracked, and what happens when scope expands during a project?",
    diagnostic_interview_question:
      "Pick the last project that ran long. What changed in scope, who absorbed it, and how was utilization recorded for the team that delivered it?",
    evidence_prompts: [
      "Time tracking / utilization log",
      "Scope-change log",
      "Project profitability report",
    ],
    evidence_source_hints: ["utilization_log", "scope_change_log", "manual_spreadsheet"],
    contradiction_check:
      "Owner reports controlled scope but no scope-change log exists; absorbed scope shows up as overtime, not pricing.",
    failure_pattern:
      "Scope creep is absorbed without pricing; senior expert becomes the bottleneck.",
    false_green_trap:
      "Revenue holds while utilization quietly worsens.",
    repair_map_trigger: "capacity_review",
    priority_sequence: "tighten",
    admin_review_note:
      "Operational utilization only — no labor or wage determination.",
    client_safe_explanation:
      "This may be a scope and utilization visibility gap.",
  }),
  financial_visibility: cell({
    kpi: "Project profitability and AR aging",
    process: "Per-project margin and collections cadence",
    scorecard_question:
      "Do you know which projects are actually profitable after meetings, revisions, and admin time?",
    diagnostic_interview_question:
      "Pick a recent project. What was its real margin after all delivery time, and what does AR aging look like for invoiced work?",
    evidence_prompts: [
      "Project profitability report",
      "AR aging report",
      "Time tracking export",
    ],
    evidence_source_hints: ["ar_aging_report", "quickbooks_manual_export", "utilization_log"],
    contradiction_check:
      "Owner says margin is healthy but no per-project profitability is reviewed and AR is stale.",
    failure_pattern:
      "Revenue hides poor utilization and AR drag.",
    false_green_trap:
      "Top-line revenue feels strong while project margin and cash cycle weaken.",
    repair_map_trigger: "tighten_cash_visibility",
    priority_sequence: "stabilize",
    admin_review_note:
      "Operational margin and cash visibility — not an accounting opinion.",
    client_safe_explanation:
      "This appears to be a project-profitability and AR visibility gap.",
  }),
  owner_independence: cell({
    kpi: "Knowledge concentration in owner / senior expert",
    process: "Delivery handoff, QA, and client onboarding",
    scorecard_question:
      "If you were unavailable for a month, what specifically would the team be unable to deliver at the same quality?",
    diagnostic_interview_question:
      "List the three things only you can currently do well. What would have to be documented or trained to remove that single point of failure?",
    evidence_prompts: [
      "Delivery SOPs",
      "Onboarding checklist",
      "QA review notes",
    ],
    evidence_source_hints: ["sop_document", "owner_interview", "weekly_review_log"],
    contradiction_check:
      "Owner says the team is independent but is still the named reviewer / approver for delivery quality.",
    failure_pattern:
      "Senior expert is the bottleneck; quality depends on one person.",
    false_green_trap:
      "Team capacity feels strong because the owner is quietly absorbing exceptions.",
    repair_map_trigger: "training_handoff",
    priority_sequence: "tighten",
    admin_review_note:
      "Decision-rights and delivery handoff — not HR advice.",
    client_safe_explanation:
      "This may be a knowledge-concentration risk. RGS would look at delivery SOPs and QA notes.",
  }),
};

/* ============================================================
 * E-commerce / Online Retail
 * ============================================================ */

const ECOMMERCE: IndustryMatrix = {
  demand_generation: cell({
    kpi: "Traffic-source concentration and CAC / ROAS context",
    process: "Paid + organic traffic mix and source-level revenue review",
    scorecard_question:
      "Where does most of your traffic come from, and roughly what does it cost to acquire a customer?",
    diagnostic_interview_question:
      "Walk through how revenue is attributed to a traffic source today. How much of revenue is concentrated in one platform or one ad account?",
    evidence_prompts: [
      "Store analytics export",
      "Ad platform reports",
      "Channel revenue summary",
    ],
    evidence_source_hints: ["shopify_manual_export", "google_analytics_manual_export", "meta_ads_manual_export"],
    contradiction_check:
      "Owner reports diversified channels but one platform drives a clear majority of revenue.",
    failure_pattern:
      "ROAS is judged without true gross margin; one platform creates hidden risk.",
    false_green_trap:
      "ROAS looks good while shipping, returns, fees, and discounts erase contribution.",
    repair_map_trigger: "channel_concentration_review",
    priority_sequence: "stabilize",
    admin_review_note:
      "Operating concentration visibility — not marketing attribution certainty.",
    client_safe_explanation:
      "This may be a channel-concentration risk. RGS would look at revenue mix by platform.",
  }),
  revenue_conversion: cell({
    kpi: "Conversion rate, cart abandonment, and follow-up cadence",
    process: "On-site conversion and post-cart follow-up",
    scorecard_question:
      "What share of visitors buy, and what happens to abandoned carts today?",
    diagnostic_interview_question:
      "Walk through what happens after a cart is abandoned — email, SMS, retargeting, or nothing — and how that performance is reviewed.",
    evidence_prompts: [
      "Conversion-rate trend",
      "Cart abandonment report",
      "Email / SMS performance report",
    ],
    evidence_source_hints: ["shopify_manual_export", "google_analytics_manual_export", "manual_spreadsheet"],
    contradiction_check:
      "Owner says recovery flows are working but no email/SMS performance is reviewed.",
    failure_pattern:
      "Conversion is assumed; abandoned carts are not recovered.",
    false_green_trap:
      "Sessions are up while conversion and basket size drift down.",
    repair_map_trigger: "tighten_follow_up",
    priority_sequence: "tighten",
    admin_review_note:
      "Operating visibility — no email-marketing legal review.",
    client_safe_explanation:
      "This appears to be a conversion and follow-up gap.",
  }),
  operational_efficiency: cell({
    kpi: "Fulfillment accuracy, returns, and inventory sell-through",
    process: "Pick / pack / ship discipline and returns triage",
    scorecard_question:
      "How are fulfillment errors and returns logged, and how often are they reviewed?",
    diagnostic_interview_question:
      "Walk through what happens when an order ships wrong or a return arrives. Where is that logged, and how is it tied back to product or supplier?",
    evidence_prompts: [
      "Fulfillment error log",
      "Return / refund report",
      "Inventory sell-through report",
    ],
    evidence_source_hints: ["fulfillment_log", "return_log", "shopify_manual_export"],
    contradiction_check:
      "Owner says fulfillment is reliable but no error log exists; returns are treated as customer-service tickets only.",
    failure_pattern:
      "Fulfillment errors treated as customer-service noise instead of an operations leak.",
    false_green_trap:
      "Order volume looks healthy while error and return rate quietly grow.",
    repair_map_trigger: "customer_experience_review",
    priority_sequence: "stabilize",
    admin_review_note:
      "Operational quality review — not consumer-protection or warranty-law advice.",
    client_safe_explanation:
      "This may be a fulfillment and returns visibility gap.",
  }),
  financial_visibility: cell({
    kpi: "Margin after shipping, returns, fees, discounts, and ad cost",
    process: "True landed-cost margin review",
    scorecard_question:
      "Do you know real margin per product after shipping, fees, returns, and ad spend?",
    diagnostic_interview_question:
      "Pick a top SKU. What is its true contribution after shipping, payment fees, returns, discounts, and the ad cost it took to acquire that buyer?",
    evidence_prompts: [
      "Product margin report",
      "Payment processor fee report",
      "Shipping cost breakdown",
    ],
    evidence_source_hints: ["shopify_manual_export", "shipping_carrier_export", "manual_spreadsheet"],
    contradiction_check:
      "Owner reports healthy contribution but only gross margin is reviewed; shipping, fees, and ad cost are not netted.",
    failure_pattern:
      "ROAS is treated as profitability; high-volume SKUs have weak true margin.",
    false_green_trap:
      "Revenue and ROAS look healthy while contribution per order is thin or negative.",
    repair_map_trigger: "pricing_margin_review",
    priority_sequence: "tighten",
    admin_review_note:
      "Operational landed-cost margin — not a tax or accounting determination.",
    client_safe_explanation:
      "This appears to be a true-margin visibility gap.",
  }),
  owner_independence: cell({
    kpi: "Owner dependence on platform / supplier / agency exceptions",
    process: "Decision rights for ads, suppliers, and platform changes",
    scorecard_question:
      "When ads break, a supplier slips, or a platform pushes a change — who handles it without you?",
    diagnostic_interview_question:
      "If you stepped away for two weeks, what would happen to ad spend decisions, supplier issues, and platform incidents? Who is the named backup for each?",
    evidence_prompts: [
      "Decision-rights worksheet",
      "Supplier / platform escalation list",
      "Owner time audit",
    ],
    evidence_source_hints: ["sop_document", "owner_interview", "weekly_review_log"],
    contradiction_check:
      "Owner reports independence but is still the named contact for ads, suppliers, and platform issues.",
    failure_pattern:
      "Owner is the sole point of contact for every external system.",
    false_green_trap:
      "Calm operations mask single-point-of-failure on external relationships.",
    repair_map_trigger: "training_handoff",
    priority_sequence: "tighten",
    admin_review_note:
      "Decision-rights and escalation; not vendor-contract advice.",
    client_safe_explanation:
      "This may be an owner-dependence pattern around external systems.",
  }),
};

/* ============================================================
 * Cannabis / MMJ / Dispensary
 * Operational documentation visibility ONLY.
 * ============================================================ */

const CANNABIS: IndustryMatrix = {
  demand_generation: cell({
    kpi: "Source of new patient / customer visits",
    process: "Inquiry / first-visit capture and channel review",
    scorecard_question:
      "How do new customers find the dispensary, and where is that recorded?",
    diagnostic_interview_question:
      "Walk through how a new customer's source is captured at intake and how that information is reviewed weekly.",
    evidence_prompts: [
      "POS new-customer report",
      "Source field on intake records",
      "Marketing channel notes",
    ],
    evidence_source_hints: ["pos_manual_export", "manual_spreadsheet", "owner_interview"],
    contradiction_check:
      "Owner names channels but no source field exists on customer records.",
    failure_pattern:
      "Acquisition channels are guessed; review depends on memory.",
    false_green_trap:
      "Total visits look healthy while channel mix and repeat behavior are unknown.",
    repair_map_trigger: "capture_missing_signal",
    priority_sequence: "tighten",
    admin_review_note:
      "Operational visibility only. No regulated-marketing legal determination.",
    client_safe_explanation:
      "This may be a customer-source visibility gap. RGS would look for source data on intake records.",
  }),
  revenue_conversion: cell({
    kpi: "Average ticket and basket consistency by daypart",
    process: "Budtender consistency and recommendation discipline",
    scorecard_question:
      "How consistent is the average basket and recommendation flow across shifts and dayparts?",
    diagnostic_interview_question:
      "Walk through how recommendations are made today. How does the average ticket vary by shift or budtender, and how is that reviewed?",
    evidence_prompts: [
      "POS average-ticket by shift",
      "Recommendation / training notes",
      "Daily sales log",
    ],
    evidence_source_hints: ["pos_manual_export", "daily_sales_log", "manual_spreadsheet"],
    contradiction_check:
      "Owner reports consistent service but average ticket varies significantly by shift and is not reviewed.",
    failure_pattern:
      "Recommendation quality varies by budtender; conversion depends on individuals.",
    false_green_trap:
      "Daily totals look healthy while shift-level consistency drifts.",
    repair_map_trigger: "standardize_operating_rhythm",
    priority_sequence: "tighten",
    admin_review_note:
      "Operational consistency only — no medical claims about products.",
    client_safe_explanation:
      "This appears to be a service-consistency visibility gap.",
  }),
  operational_efficiency: cell({
    kpi: "Seed-to-sale reconciliation cadence and inventory variance",
    process: "Daily / weekly reconciliation and override / void / discount review",
    scorecard_question:
      "How often is seed-to-sale reconciled against physical inventory, and how are overrides, voids, and discounts reviewed?",
    diagnostic_interview_question:
      "Walk through your most recent reconciliation. Who performed it, when, and what variance was found? How are overrides, voids, and discounts reviewed each week?",
    evidence_prompts: [
      "Most recent dated seed-to-sale reconciliation",
      "Inventory variance report",
      "Override / discount / void log",
    ],
    evidence_source_hints: ["pos_manual_export", "manual_spreadsheet", "owner_interview"],
    contradiction_check:
      "Owner reports the dispensary is in good shape but cannot produce a recent dated reconciliation or variance log.",
    failure_pattern:
      "Reconciliation is intermittent; overrides and voids accumulate without review.",
    false_green_trap:
      "'We are compliant' is asserted while fresh evidence cannot be produced quickly.",
    repair_map_trigger: "standardize_operating_rhythm",
    priority_sequence: "foundational",
    admin_review_note:
      "Operational documentation visibility only. RGS does not certify legal or regulatory compliance.",
    client_safe_explanation:
      "This may be an operational documentation visibility gap. RGS would look for fresh dated reconciliation evidence.",
  }),
  financial_visibility: cell({
    kpi: "Cash drawer / safe controls and vendor invoice matching",
    process: "Cash handling discipline and three-way invoice matching",
    scorecard_question:
      "How are cash handling and vendor invoices controlled today, and where is that documented?",
    diagnostic_interview_question:
      "Walk through cash from drawer to safe to deposit, and how vendor invoices are matched against received inventory and POS.",
    evidence_prompts: [
      "Cash drawer / safe log",
      "Vendor invoice matching log",
      "Daily cash count",
    ],
    evidence_source_hints: ["manual_spreadsheet", "pos_manual_export", "owner_interview"],
    contradiction_check:
      "Owner reports tight cash control but no daily cash count or vendor invoice matching log exists.",
    failure_pattern:
      "Cash control depends on trusted individuals rather than process.",
    false_green_trap:
      "Quiet weeks feel controlled while controls live in a few people's heads.",
    repair_map_trigger: "tighten_cash_visibility",
    priority_sequence: "stabilize",
    admin_review_note:
      "Operational cash visibility only. Not a legal, tax, or accounting determination.",
    client_safe_explanation:
      "This appears to be a cash and vendor-controls visibility gap.",
  }),
  owner_independence: cell({
    kpi: "Manager / owner dependence for documentation and exceptions",
    process: "Manager-on-duty rules and documentation ownership",
    scorecard_question:
      "When the owner is unavailable, who keeps documentation current and who handles exceptions?",
    diagnostic_interview_question:
      "If the owner is out for two weeks, who specifically owns documentation, reconciliation, and exception handling — and where is that written down?",
    evidence_prompts: [
      "MOD rotation",
      "Documentation owner roster",
      "Exception handling SOPs",
    ],
    evidence_source_hints: ["sop_document", "owner_interview", "weekly_review_log"],
    contradiction_check:
      "Owner says managers handle documentation but is still the named approver for reconciliation and exceptions.",
    failure_pattern:
      "Documentation responsibility is assumed but not assigned.",
    false_green_trap:
      "Calm operations hide that documentation depends on the owner being present.",
    repair_map_trigger: "training_handoff",
    priority_sequence: "tighten",
    admin_review_note:
      "Operational decision-rights only. No legal or regulatory determination.",
    client_safe_explanation:
      "This may be an owner-dependence pattern around documentation and exceptions.",
  }),
};

/* ============================================================
 * General Service / Other (fallback)
 * ============================================================ */

const GENERAL_FALLBACK: IndustryMatrix = {
  demand_generation: cell({
    kpi: "Lead source visibility",
    process: "Where new inquiries are captured and reviewed",
    scorecard_question:
      "Where do new leads or customers come from, and how is that tracked today?",
    diagnostic_interview_question:
      "Walk through how a new inquiry is captured today. Where is it logged, and what is the typical response cadence?",
    evidence_prompts: ["Inquiry log", "CRM export", "Owner interview"],
    evidence_source_hints: ["manual_spreadsheet", "owner_interview", "hubspot_manual_export"],
    contradiction_check:
      "Owner names channels but no source field exists on inquiries.",
    failure_pattern:
      "Lead source decisions are made without an inquiry log.",
    false_green_trap:
      "Activity feels healthy while sources are guessed.",
    repair_map_trigger: "capture_missing_signal",
    priority_sequence: "foundational",
    admin_review_note:
      "Industry-specific confidence is lower. Recommend selecting a more specific industry when admin assigns the case.",
    client_safe_explanation:
      "This appears to be a lead-source visibility gap. RGS would look for an inquiry log first.",
  }),
  revenue_conversion: cell({
    kpi: "Sales process visibility",
    process: "Quote / proposal / booking step",
    scorecard_question:
      "How does an inquiry become a customer today, and where do you see that pipeline?",
    diagnostic_interview_question:
      "Walk through the sales process for a recent customer. Where is each stage tracked, and how is follow-up handled?",
    evidence_prompts: ["Pipeline export", "Proposal tracker", "Follow-up log"],
    evidence_source_hints: ["manual_spreadsheet", "hubspot_manual_export", "owner_interview"],
    contradiction_check:
      "Owner reports a clear sales process but cannot list active opportunities by stage.",
    failure_pattern:
      "Pipeline lives in memory; follow-up is ad hoc.",
    false_green_trap:
      "A few wins make the process look healthy while many opportunities quietly stall.",
    repair_map_trigger: "tighten_follow_up",
    priority_sequence: "stabilize",
    admin_review_note:
      "Treat as fallback; pursue industry-specific module after admin assigns the case.",
    client_safe_explanation:
      "This may be a sales-process visibility gap.",
  }),
  operational_efficiency: cell({
    kpi: "Delivery workflow and capacity visibility",
    process: "How work gets done and where capacity breaks",
    scorecard_question:
      "How is delivery managed today, and what breaks first when volume goes up?",
    diagnostic_interview_question:
      "Walk through delivery for a recent customer. Where does work bottleneck, and what is the first sign that capacity is at the limit?",
    evidence_prompts: ["Delivery SOP", "Schedule export", "Capacity notes"],
    evidence_source_hints: ["sop_document", "manual_spreadsheet", "owner_interview"],
    contradiction_check:
      "Owner reports stable delivery but cannot point to a capacity signal.",
    failure_pattern:
      "Capacity is unknown until something breaks.",
    false_green_trap:
      "Smooth weeks hide brittle delivery.",
    repair_map_trigger: "capacity_review",
    priority_sequence: "stabilize",
    admin_review_note:
      "Lower industry-specific confidence; tighten after industry is selected.",
    client_safe_explanation:
      "This appears to be a capacity-visibility gap.",
  }),
  financial_visibility: cell({
    kpi: "Profit and cash visibility",
    process: "Monthly profit and weekly cash review",
    scorecard_question:
      "When did you last review profit and cash, and how often does that happen?",
    diagnostic_interview_question:
      "Walk through how profit and cash are reviewed today — what is looked at, by whom, and how often?",
    evidence_prompts: ["Most recent P&L", "Weekly cash summary", "Bank balance trend"],
    evidence_source_hints: ["quickbooks_manual_export", "manual_spreadsheet", "owner_interview"],
    contradiction_check:
      "Owner reports profit visibility but no monthly P&L review or weekly cash check exists.",
    failure_pattern:
      "Decisions are made without profit or cash context.",
    false_green_trap:
      "Bank balance feels stable while margin or cash cycle weakens.",
    repair_map_trigger: "tighten_cash_visibility",
    priority_sequence: "foundational",
    admin_review_note:
      "Operational visibility only — no accounting opinion.",
    client_safe_explanation:
      "This may be a profit- and cash-visibility gap.",
  }),
  owner_independence: cell({
    kpi: "Owner decision bottleneck",
    process: "Decision rights and recurring escalations",
    scorecard_question:
      "When you are unavailable, what specifically would break or wait for you?",
    diagnostic_interview_question:
      "List the recurring decisions only you make today. What would have to be documented or trained to remove that single point of failure?",
    evidence_prompts: ["Decision-rights worksheet", "Owner time audit", "SOPs for top exceptions"],
    evidence_source_hints: ["sop_document", "owner_interview", "weekly_review_log"],
    contradiction_check:
      "Owner reports the team is independent but is the named backup for routine decisions.",
    failure_pattern:
      "Owner is the de facto operations lead.",
    false_green_trap:
      "Calm weeks mask owner-dependence on exceptions.",
    repair_map_trigger: "training_handoff",
    priority_sequence: "stabilize",
    admin_review_note:
      "Decision-rights work — not employment advice.",
    client_safe_explanation:
      "This appears to be an owner-dependence pattern.",
  }),
};

/* ---------- Public matrix ---------- */

export const INDUSTRY_DIAGNOSTIC_DEPTH_MATRIX: Readonly<
  Record<MatrixIndustryKey, IndustryMatrix>
> = {
  trades_home_services: TRADES,
  restaurant_food_service: RESTAURANT,
  retail: RETAIL,
  professional_services: PROFESSIONAL_SERVICES,
  ecommerce_online_retail: ECOMMERCE,
  cannabis_mmj_dispensary: CANNABIS,
  general_service_other: GENERAL_FALLBACK,
};

/* ---------- Forbidden client-facing claims (re-exported for tests) ---------- */

export { DEPTH_FORBIDDEN_CLAIMS };

/**
 * Cannabis-specific forbidden phrases. Cannabis rows must never speak in
 * legal compliance / safe-harbor / regulatory-determination language.
 */
export const CANNABIS_FORBIDDEN_CLAIMS: ReadonlyArray<string> = [
  "legal compliance",
  "legally compliant",
  "compliance certified",
  "compliance certification",
  "regulatory safe",
  "safe harbor",
  "guaranteed compliant",
  "legally verified",
  "legal determination",
  "enforcement protection",
];

/* ---------- Helper ---------- */

export function getIndustryMatrix(
  key: MatrixIndustryKey,
): IndustryMatrix {
  return INDUSTRY_DIAGNOSTIC_DEPTH_MATRIX[key];
}

export function getDiagnosticDepthCell(
  industry: MatrixIndustryKey,
  gear: MatrixGearKey,
): DiagnosticDepthCell {
  return INDUSTRY_DIAGNOSTIC_DEPTH_MATRIX[industry][gear];
}