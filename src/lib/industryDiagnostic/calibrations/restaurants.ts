/**
 * P93E-E2G-P2 — Restaurants / Food Service FindingCalibration seeds.
 *
 * These are the premium, restaurant-specific finding shapes the future report
 * builder will hydrate from `industry_diagnostic_responses`. They are NOT
 * client-facing yet — this pass establishes the calibrated contract so we
 * never ship generic AI restaurant findings.
 */
import type { FindingCalibration } from "../depthStandard";

export const RESTAURANTS_FINDING_CALIBRATIONS: FindingCalibration[] = [
  {
    key: "restaurants.prime_cost_visibility_gap",
    industry: "restaurants_food_service",
    gear: "financial",
    finding_title: "Prime cost is not visible week-to-week",
    why_it_matters:
      "Prime cost (food + labor) is the single fastest indicator of restaurant health. Without a weekly view, food and labor leaks compound silently before they show up at month-end.",
    evidence_supports: [
      "POS sales report by week",
      "Labor report by week",
      "Recent inventory count for COGS calculation",
    ],
    evidence_missing_means:
      "If no weekly prime cost is tracked, the finding rests on owner statement only and should be reported as structured interview claim, not verified.",
    confidence_floor: "low",
    business_risk: "cash",
    owner_independence_lift: "medium",
    cash_control_impact: "high",
    repair_map_trigger: "prime_cost_weekly_review_install",
    client_safe_explanation:
      "The business does not yet have a reliable weekly view of prime cost, which limits early detection of food and labor cost drift.",
    admin_only_interpretation:
      "If owner can't quote last week's prime cost, treat both food cost % and labor % as owner-estimated regardless of how confidently they answer.",
  },
  {
    key: "restaurants.menu_profitability_gap",
    industry: "restaurants_food_service",
    gear: "financial",
    finding_title: "Menu profitability is not engineered",
    why_it_matters:
      "Without sales-mix and recipe-cost visibility, the menu can't be steered toward the items that actually pay the bills.",
    evidence_supports: [
      "POS menu item sales mix",
      "Recipe / spec sheets with food cost",
    ],
    evidence_missing_means:
      "Without sales-mix and costed recipes, any margin-by-item statement is owner intuition only.",
    confidence_floor: "low",
    business_risk: "growth_drag",
    owner_independence_lift: "low",
    cash_control_impact: "high",
    repair_map_trigger: "menu_engineering_pass",
    client_safe_explanation:
      "Menu-level profitability is not yet visible, which limits decisions about pricing, placement, and item promotion.",
  },
  {
    key: "restaurants.shift_dependency_risk",
    industry: "restaurants_food_service",
    gear: "owner_independence",
    finding_title: "Operations depend on owner-covered shifts",
    why_it_matters:
      "When the owner is on the schedule to make the schedule work, the business cannot absorb illness, vacation, or growth.",
    evidence_supports: [
      "Schedule for the past four weeks",
      "Manager logbook showing owner-on-shift entries",
    ],
    evidence_missing_means:
      "Without a posted schedule and manager log, shift dependency is reported as structured interview claim.",
    confidence_floor: "medium",
    business_risk: "owner_dependency",
    owner_independence_lift: "high",
    cash_control_impact: "medium",
    repair_map_trigger: "shift_coverage_bench_build",
    client_safe_explanation:
      "Several shifts each week rely on the owner being present, which limits the operation's ability to run without them.",
  },
  {
    key: "restaurants.waste_inventory_leakage",
    industry: "restaurants_food_service",
    gear: "operations",
    finding_title: "Waste and inventory leakage are not measured",
    why_it_matters:
      "Untracked waste and informal counts hide a meaningful share of food cost variance and make root-cause repair impossible.",
    evidence_supports: [
      "Waste log",
      "Inventory count sheets",
      "Vendor invoices reconciled to receiving",
    ],
    evidence_missing_means:
      "Without a waste log and consistent counts, food-cost variance cannot be attributed to a cause and the finding stays a structured interview claim.",
    confidence_floor: "low",
    business_risk: "cash",
    owner_independence_lift: "low",
    cash_control_impact: "high",
    repair_map_trigger: "waste_and_count_program_install",
    client_safe_explanation:
      "Waste and inventory variance are not consistently captured, which limits the ability to identify and reduce food-cost leaks.",
  },
  {
    key: "restaurants.labor_control_gap",
    industry: "restaurants_food_service",
    gear: "financial",
    finding_title: "Labor cost is reviewed too late to act",
    why_it_matters:
      "Labor that is only reviewed at month-end cannot be corrected in the week it overran. Daily and weekly visibility is required to keep labor on target.",
    evidence_supports: [
      "Labor report by day",
      "Schedule with sales forecast",
    ],
    evidence_missing_means:
      "Without daily labor and a forecast-tied schedule, labor variance is only visible after the fact.",
    confidence_floor: "medium",
    business_risk: "cash",
    owner_independence_lift: "medium",
    cash_control_impact: "high",
    repair_map_trigger: "labor_daily_review_install",
    client_safe_explanation:
      "Labor cost is not reviewed frequently enough to adjust schedules within the week, which allows weekly overruns to compound.",
  },
  {
    key: "restaurants.line_execution_bottleneck",
    industry: "restaurants_food_service",
    gear: "operations",
    finding_title: "Line execution is not measured",
    why_it_matters:
      "Without ticket-time visibility, the kitchen cannot identify the station that backs up first or the time of night when service breaks.",
    evidence_supports: [
      "POS ticket time report",
      "Manager log entries on busy services",
    ],
    evidence_missing_means:
      "If ticket times aren't tracked, line bottleneck reports are owner intuition only.",
    confidence_floor: "low",
    business_risk: "growth_drag",
    owner_independence_lift: "medium",
    cash_control_impact: "medium",
    repair_map_trigger: "ticket_time_visibility_install",
    client_safe_explanation:
      "Ticket times are not tracked, which limits the ability to find and repair the line bottleneck during busy services.",
  },
  {
    key: "restaurants.delivery_platform_margin_risk",
    industry: "restaurants_food_service",
    gear: "financial",
    finding_title: "Delivery platform margin is not quantified",
    why_it_matters:
      "Third-party delivery can quietly turn high-volume revenue into a loss after fees, packaging, and remakes.",
    evidence_supports: [
      "DoorDash / Uber Eats / Grubhub financial reports",
      "Packaging and remake cost estimate",
    ],
    evidence_missing_means:
      "Without platform reports, net delivery margin is an owner estimate.",
    confidence_floor: "low",
    business_risk: "cash",
    owner_independence_lift: "low",
    cash_control_impact: "high",
    repair_map_trigger: "delivery_net_margin_review",
    client_safe_explanation:
      "Net margin on third-party delivery is not yet visible, which limits decisions about platform mix, pricing, and packaging.",
  },
  {
    key: "restaurants.comp_void_discount_leakage",
    industry: "restaurants_food_service",
    gear: "sales",
    finding_title: "Comps, voids, and discounts are not reviewed by employee",
    why_it_matters:
      "Comp/void/discount activity by employee is one of the clearest patterns to find both honest service-recovery overuse and dishonest manipulation.",
    evidence_supports: [
      "POS comp/void/discount report by employee",
      "Manager logbook entries on guest recovery",
    ],
    evidence_missing_means:
      "Without an employee-level report, leakage cannot be attributed and the finding is a structured interview claim.",
    confidence_floor: "medium",
    business_risk: "control",
    owner_independence_lift: "low",
    cash_control_impact: "medium",
    repair_map_trigger: "comp_void_discount_weekly_review",
    client_safe_explanation:
      "Comps, voids, and discounts are not yet reviewed by employee on a regular cadence, which limits accountability and pattern detection.",
  },
  {
    key: "restaurants.manager_accountability_gap",
    industry: "restaurants_food_service",
    gear: "operations",
    finding_title: "There is no operating record between shifts",
    why_it_matters:
      "Without a manager log, issues from one shift quietly disappear instead of being addressed by the next team.",
    evidence_supports: [
      "Manager logbook or shift-notes app",
      "Shift handoff template",
    ],
    evidence_missing_means:
      "Without a logbook, accountability is dependent on memory and personality.",
    confidence_floor: "medium",
    business_risk: "control",
    owner_independence_lift: "high",
    cash_control_impact: "low",
    repair_map_trigger: "manager_logbook_install",
    client_safe_explanation:
      "There is no consistent shift-to-shift operating record, which limits accountability and follow-through on issues raised during service.",
  },
  {
    key: "restaurants.owner_ordering_dependency",
    industry: "restaurants_food_service",
    gear: "owner_independence",
    finding_title: "Vendor ordering depends on the owner",
    why_it_matters:
      "When only the owner can order, supply continuity and food cost negotiation both stop the moment the owner is unavailable.",
    evidence_supports: [
      "Order sheet templates by station",
      "Vendor portal access list",
    ],
    evidence_missing_means:
      "Without written order sheets or vendor access redundancy, ordering dependency is a structured interview claim.",
    confidence_floor: "medium",
    business_risk: "owner_dependency",
    owner_independence_lift: "high",
    cash_control_impact: "medium",
    repair_map_trigger: "ordering_redundancy_install",
    client_safe_explanation:
      "Vendor ordering currently depends on the owner, which limits operational continuity if the owner is unavailable.",
  },
  {
    key: "restaurants.guest_experience_recovery_gap",
    industry: "restaurants_food_service",
    gear: "demand",
    finding_title: "Guest experience recovery is informal",
    why_it_matters:
      "Without a defined recovery process and review-response cadence, unhappy guests quietly become public reviews that cost future demand.",
    evidence_supports: [
      "Review response timestamps from Google / Yelp",
      "Documented guest recovery playbook",
    ],
    evidence_missing_means:
      "Without review-platform data and a written playbook, recovery is reported as a structured interview claim.",
    confidence_floor: "medium",
    business_risk: "growth_drag",
    owner_independence_lift: "medium",
    cash_control_impact: "low",
    repair_map_trigger: "guest_recovery_playbook_install",
    client_safe_explanation:
      "Guest experience recovery is handled informally, which limits consistency and reputation protection.",
  },
  {
    key: "restaurants.catering_event_profitability_gap",
    industry: "restaurants_food_service",
    gear: "sales",
    finding_title: "Catering and events are sold without confirmed margin",
    why_it_matters:
      "Catering jobs often look like wins on revenue but lose money once labor, packaging, and dedicated prep are counted. Without per-event costing, growth in catering can hurt the business.",
    evidence_supports: [
      "Catering quote template with food and labor cost",
      "Catering invoices reconciled to actual cost",
    ],
    evidence_missing_means:
      "Without per-event costing, catering profitability is owner intuition only.",
    confidence_floor: "low",
    business_risk: "cash",
    owner_independence_lift: "low",
    cash_control_impact: "high",
    repair_map_trigger: "catering_costing_install",
    client_safe_explanation:
      "Catering and event jobs are not yet costed before quoting, which limits confidence that incremental catering revenue is profitable.",
  },
  // P102 — additional restaurant failure-pattern calibrations.
  {
    key: "restaurants.cash_closeout_leak",
    industry: "restaurants_food_service",
    gear: "financial",
    finding_title: "Daily cash closeout is informal",
    why_it_matters:
      "Without a same-day closeout that reconciles POS, cash drawer, tips, comps, and deposits, small variances compound and shrink prime cost visibility.",
    evidence_supports: [
      "Daily cash closeout sheet for the last 14 days",
      "POS daily summary",
      "Bank deposit slips for the same period",
    ],
    evidence_missing_means:
      "Without a posted closeout sheet, cash discipline is a structured interview claim, not verified.",
    confidence_floor: "low",
    business_risk: "cash",
    owner_independence_lift: "medium",
    cash_control_impact: "high",
    repair_map_trigger: "daily_cash_closeout_install",
    client_safe_explanation:
      "Daily cash closeout is not yet a documented routine, which limits early detection of cash, tip, and deposit drift.",
  },
  {
    key: "restaurants.review_flow_stall",
    industry: "restaurants_food_service",
    gear: "demand",
    finding_title: "Review generation is not part of the shift",
    why_it_matters:
      "Local search visibility and repeat-guest demand depend on a steady, recent review flow. Without a server- or host-driven request routine, rating velocity stalls and rank slips.",
    evidence_supports: [
      "Google Business Profile review timeline",
      "Posted review-request prompt for staff",
      "Manager log of review activity by week",
    ],
    evidence_missing_means:
      "Without a posted request routine, review pace is owner observation only.",
    confidence_floor: "low",
    business_risk: "growth_drag",
    owner_independence_lift: "low",
    cash_control_impact: "low",
    repair_map_trigger: "review_request_routine_install",
    client_safe_explanation:
      "Review requests are not yet built into the shift, which limits local search visibility and repeat-guest momentum.",
  },
  {
    key: "restaurants.recipe_drift",
    industry: "restaurants_food_service",
    gear: "operations",
    finding_title: "Recipe and spec adherence is not measured",
    why_it_matters:
      "When recipes and portion specs drift, food cost moves before anyone sees it on a P&L and guest experience becomes shift-dependent.",
    evidence_supports: [
      "Costed recipe / spec sheets posted on the line",
      "Portion checks logged by manager",
      "Food cost variance vs. costed recipe",
    ],
    evidence_missing_means:
      "Without posted specs and portion checks, recipe adherence is owner intuition only.",
    confidence_floor: "low",
    business_risk: "cash",
    owner_independence_lift: "medium",
    cash_control_impact: "high",
    repair_map_trigger: "recipe_spec_standardization",
    client_safe_explanation:
      "Recipe and portion specs are not yet measured against actual line execution, which limits food cost control and guest consistency.",
  },
  {
    key: "restaurants.catering_followup_drop",
    industry: "restaurants_food_service",
    gear: "sales",
    finding_title: "Catering and private-event inquiries are not tracked to outcome",
    why_it_matters:
      "Catering and private-event leads convert on follow-up speed. Without an inquiry log, lost deals are invisible and the business cannot tell whether the gap is demand or response time.",
    evidence_supports: [
      "Catering / private-event inquiry log with response time and outcome",
      "Email or form submissions for the last 30 days",
      "Phone log of inquiries with disposition",
    ],
    evidence_missing_means:
      "Without an inquiry log, catering conversion is structured interview claim only.",
    confidence_floor: "low",
    business_risk: "growth_drag",
    owner_independence_lift: "medium",
    cash_control_impact: "medium",
    repair_map_trigger: "catering_inquiry_tracker_install",
    client_safe_explanation:
      "Catering and private-event inquiries are not yet tracked from request to outcome, which limits the ability to see where deals are lost.",
  },
];
