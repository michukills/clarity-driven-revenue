/**
 * P93E-E2G-P2.5 — Trades / Home Services FindingCalibration seeds.
 *
 * Industry-specific finding shapes the future report builder will hydrate
 * from `industry_diagnostic_responses` for trades/home-services accounts.
 * They are NOT client-facing yet — this pass establishes the calibrated
 * contract so RGS never ships generic "improve operations" findings for
 * trades businesses.
 *
 * Each calibration is intentionally evidence-aware: when the supporting
 * evidence is missing, the report layer must downgrade the finding to a
 * structured interview claim or owner estimate rather than overstating
 * certainty.
 */
import type { FindingCalibration } from "../depthStandard";

export const TRADES_FINDING_CALIBRATIONS: FindingCalibration[] = [
  {
    key: "trades.dispatch_dependency_risk",
    industry: "trades_home_services",
    gear: "owner_independence",
    finding_title: "Dispatch depends on the owner",
    why_it_matters:
      "When dispatch lives in the owner's head, every day off, sick day, or vacation day caps revenue and creates a single point of failure for the whole crew.",
    evidence_supports: [
      "Dispatch board / scheduling tool screenshot",
      "One day of dispatch decisions with who made them",
      "Coverage plan when owner is unavailable",
    ],
    evidence_missing_means:
      "If no documented dispatch process exists, the finding rests on owner statement and admin observation only — report it as a structured interview claim, not verified.",
    confidence_floor: "low",
    business_risk: "owner_dependency",
    owner_independence_lift: "high",
    cash_control_impact: "high",
    repair_map_trigger: "dispatch_runbook_install",
    client_safe_explanation:
      "Day-to-day dispatch decisions are not yet handled by a documented process or a non-owner role, which limits the team's ability to run a normal day without the owner.",
    admin_only_interpretation:
      "If the owner can't name the second person who could dispatch tomorrow without help, treat owner-independence answers as owner-estimated regardless of confidence.",
  },
  {
    key: "trades.shadow_labor_leak",
    industry: "trades_home_services",
    gear: "financial",
    finding_title: "Labor hours billed do not reconcile to labor hours paid",
    why_it_matters:
      "If billed labor and paid labor aren't compared, money leaks through unbilled travel time, unbilled rework, and clock drift before it ever shows up at month-end.",
    evidence_supports: [
      "One pay period of timesheets",
      "Invoiced labor hours for the same period",
      "Time-tracking app or punch records",
    ],
    evidence_missing_means:
      "Without paired timesheet and invoice data, any leakage estimate is owner intuition only.",
    confidence_floor: "low",
    business_risk: "cash",
    owner_independence_lift: "low",
    cash_control_impact: "high",
    repair_map_trigger: "labor_billed_vs_paid_review",
    client_safe_explanation:
      "Billed labor and paid labor are not yet reconciled on a regular cadence, which limits early detection of unbilled or under-billed time.",
  },
  {
    key: "trades.first_time_fix_drag",
    industry: "trades_home_services",
    gear: "operations",
    finding_title: "First-time fix rate is not visible",
    why_it_matters:
      "Every callback or return trip burns a billable slot, fuel, and trust. Without a measured first-time-fix rate, this drag stays invisible.",
    evidence_supports: [
      "Service software report on completed vs. return visits",
      "Sample of last 20 jobs with completion notes",
    ],
    evidence_missing_means:
      "Without a system-level report, first-time-fix is an owner estimate, not a measured KPI.",
    confidence_floor: "low",
    business_risk: "growth_drag",
    owner_independence_lift: "low",
    cash_control_impact: "medium",
    repair_map_trigger: "first_time_fix_baseline",
    client_safe_explanation:
      "There is not yet a measured first-time-fix rate, which limits visibility into how often jobs need a return trip.",
  },
  {
    key: "trades.estimate_follow_up_gap",
    industry: "trades_home_services",
    gear: "sales",
    finding_title: "Estimates are not followed up on a defined cadence",
    why_it_matters:
      "Most trades shops sit on quoted work that would close with one or two structured follow-ups. Without a defined cadence, that revenue silently expires.",
    evidence_supports: [
      "List of open estimates older than 7 days",
      "Documented follow-up cadence (call/text/email schedule)",
    ],
    evidence_missing_means:
      "Without an open-estimates list, close-rate and follow-up claims are interview-only.",
    confidence_floor: "low",
    business_risk: "cash",
    owner_independence_lift: "medium",
    cash_control_impact: "high",
    repair_map_trigger: "estimate_followup_cadence_install",
    client_safe_explanation:
      "There is not yet a defined cadence for following up on open estimates, which limits how much quoted revenue is recovered.",
  },
  {
    key: "trades.job_costing_visibility_gap",
    industry: "trades_home_services",
    gear: "financial",
    finding_title: "Per-job profit is not visible after the job closes",
    why_it_matters:
      "Without per-job profit, pricing is set by feel and the shop can't tell which job types, crews, or customer segments are actually paying.",
    evidence_supports: [
      "One closed job with materials, labor, and revenue compared",
      "Job-costing report from the field/accounting system",
    ],
    evidence_missing_means:
      "If no closed job has been costed, treat margin and pricing answers as owner estimates.",
    confidence_floor: "low",
    business_risk: "cash",
    owner_independence_lift: "low",
    cash_control_impact: "high",
    repair_map_trigger: "job_costing_baseline",
    client_safe_explanation:
      "Per-job profit is not yet visible after jobs close, which limits decisions about pricing and job mix.",
  },
  {
    key: "trades.truck_inventory_accountability_gap",
    industry: "trades_home_services",
    gear: "operations",
    finding_title: "Truck stock is not counted or assigned to a person",
    why_it_matters:
      "Untracked truck stock turns into shrinkage, missed billables, and emergency supply runs that shrink the day's billable hours.",
    evidence_supports: [
      "Truck stock list per vehicle",
      "Last truck-stock reconciliation date",
    ],
    evidence_missing_means:
      "Without a stock list, shrinkage and refill-cost statements are owner estimates only.",
    confidence_floor: "low",
    business_risk: "control",
    owner_independence_lift: "medium",
    cash_control_impact: "medium",
    repair_map_trigger: "truck_stock_accountability_install",
    client_safe_explanation:
      "Truck stock is not yet counted on a cadence or owned by a named person, which limits visibility into materials leakage.",
  },
  {
    key: "trades.owner_scheduling_bottleneck",
    industry: "trades_home_services",
    gear: "owner_independence",
    finding_title: "Owner is the booking and scheduling bottleneck",
    why_it_matters:
      "When the owner takes the calls, builds the schedule, and answers the texts, growth is capped by the owner's calendar, not the market.",
    evidence_supports: [
      "Phone log or call routing diagram",
      "Who books jobs by day",
    ],
    evidence_missing_means:
      "Without a call/booking log, this is admin-observed behavior plus owner statement only.",
    confidence_floor: "low",
    business_risk: "owner_dependency",
    owner_independence_lift: "high",
    cash_control_impact: "medium",
    repair_map_trigger: "booking_role_handoff",
    client_safe_explanation:
      "Booking and scheduling are not yet handed off to a defined role or system, which limits scaling beyond the owner's available hours.",
  },
  {
    key: "trades.technician_utilization_blind_spot",
    industry: "trades_home_services",
    gear: "operations",
    finding_title: "Billable utilization per technician is not measured",
    why_it_matters:
      "Utilization is the leading indicator of crew profitability. Without it, under-utilized techs and over-loaded techs are both invisible.",
    evidence_supports: [
      "Hours dispatched vs. hours billed per technician",
      "Two weeks of timecards with job assignments",
    ],
    evidence_missing_means:
      "Without paired dispatch + timecard data, utilization claims are owner estimates only.",
    confidence_floor: "low",
    business_risk: "growth_drag",
    owner_independence_lift: "low",
    cash_control_impact: "high",
    repair_map_trigger: "technician_utilization_baseline",
    client_safe_explanation:
      "Billable utilization per technician is not yet measured, which limits visibility into crew profitability.",
  },
  {
    key: "trades.callback_rework_visibility_gap",
    industry: "trades_home_services",
    gear: "operations",
    finding_title: "Callbacks and rework are not tracked",
    why_it_matters:
      "Callbacks are unbilled labor, lost trust, and a quality signal. Without tracking, the same root causes repeat across crews.",
    evidence_supports: [
      "Callback log",
      "Sample of the last 10 callbacks with reason codes",
    ],
    evidence_missing_means:
      "Without a callback log, callback-rate and root-cause statements are owner intuition only.",
    confidence_floor: "low",
    business_risk: "control",
    owner_independence_lift: "low",
    cash_control_impact: "medium",
    repair_map_trigger: "callback_log_install",
    client_safe_explanation:
      "Callbacks and rework are not yet tracked, which limits root-cause work and quality improvement.",
  },
  {
    key: "trades.service_agreement_tracking_gap",
    industry: "trades_home_services",
    gear: "sales",
    finding_title: "Service agreements are not tracked or renewed on cadence",
    why_it_matters:
      "Service agreements are the most stable revenue a trades shop can build. Without a tracked book and a renewal cadence, that base quietly shrinks.",
    evidence_supports: [
      "Active service agreement list",
      "Renewal cadence and owner of the renewal step",
    ],
    evidence_missing_means:
      "Without a documented agreement list, agreement-revenue claims are interview-only.",
    confidence_floor: "low",
    business_risk: "growth_drag",
    owner_independence_lift: "medium",
    cash_control_impact: "high",
    repair_map_trigger: "service_agreement_book_install",
    client_safe_explanation:
      "Service agreements are not yet tracked as a renewable book of business, which limits stable recurring revenue.",
  },
  {
    key: "trades.labor_materials_leakage_risk",
    industry: "trades_home_services",
    gear: "financial",
    finding_title: "Materials used on jobs do not reconcile to materials billed",
    why_it_matters:
      "Unbilled materials and unaccounted-for stock are one of the most common silent profit leaks in trades shops.",
    evidence_supports: [
      "Supplier statement vs. invoiced materials for one month",
      "Job-level material entries in the field system",
    ],
    evidence_missing_means:
      "Without supplier-vs-invoice reconciliation, materials leakage is an owner estimate only.",
    confidence_floor: "low",
    business_risk: "cash",
    owner_independence_lift: "low",
    cash_control_impact: "high",
    repair_map_trigger: "materials_reconciliation_install",
    client_safe_explanation:
      "Materials used on jobs are not yet reconciled to materials billed, which limits visibility into materials leakage.",
  },
  {
    key: "trades.review_request_gap",
    industry: "trades_home_services",
    gear: "demand",
    finding_title: "Review requests are not built into the job-close workflow",
    why_it_matters:
      "For local trades, recent reviews drive map-pack visibility and call volume more than almost anything else. Without a workflow step, review flow is sporadic.",
    evidence_supports: [
      "Review request automation (text/email)",
      "Last 30 days of new reviews",
    ],
    evidence_missing_means:
      "Without a system trigger, review-request statements are owner intent, not process.",
    confidence_floor: "low",
    business_risk: "growth_drag",
    owner_independence_lift: "medium",
    cash_control_impact: "medium",
    repair_map_trigger: "review_request_workflow_install",
    client_safe_explanation:
      "Review requests are not yet built into the job-close workflow, which limits steady review flow and local visibility.",
  },
];
