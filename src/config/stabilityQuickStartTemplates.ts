/**
 * P85.2 — RGS Stability Quick-Start™
 *
 * Deterministic registry of starter operating tools that admins can attach
 * to Repair Map items so clients get useful movement in week one.
 *
 * Templates are not guarantees. Admin instructions are admin-only and must
 * never appear on client surfaces or client PDFs.
 */

import type { PriorityLane } from "@/config/repairPriorityMatrix";

export type QuickStartTemplateKey =
  | "lead_tracking_sheet"
  | "daily_cash_count"
  | "follow_up_log"
  | "weekly_scoreboard"
  | "role_clarity_sheet"
  | "customer_inquiry_tracker"
  | "dispatch_priority_playbook"
  | "technician_utilization_tracker"
  | "first_time_fix_callback_log"
  | "truck_inventory_scan_checklist"
  | "menu_margin_tracker"
  | "daily_sales_and_labor_log"
  | "dead_stock_liquidation_plan"
  | "category_margin_review"
  | "utilization_tracker"
  | "scope_change_log"
  | "ar_aging_review"
  | "fulfillment_sla_tracker"
  | "return_reason_log"
  | "repeat_purchase_tracker";

export type QuickStartGearKey =
  | "demand_generation"
  | "revenue_conversion"
  | "operational_efficiency"
  | "financial_visibility"
  | "owner_independence";

export type QuickStartOutputFormat =
  | "inline_table"
  | "spreadsheet"
  | "checklist"
  | "weekly_form";

export interface QuickStartField {
  key: string;
  label: string;
  required: boolean;
  hint?: string;
}

export interface QuickStartTemplate {
  template_key: QuickStartTemplateKey;
  title: string;
  gear_key: QuickStartGearKey;
  failure_pattern: string;
  when_to_use: string;
  first_step: string;
  fields_or_columns: QuickStartField[];
  owner_instructions: string;
  /** Admin-only — never sent to client UI or client PDFs. */
  admin_instructions: string;
  client_safe_description: string;
  scope_boundary: string;
  output_format: QuickStartOutputFormat;
  /** True only when a real implemented export exists in the codebase. */
  can_export: boolean;
  export_supported: boolean;
  recommended_priority_lane: PriorityLane;
  /** Optional industry-key targeting for industry-specific templates. */
  industry_keys?: ReadonlyArray<string>;
}

export const STABILITY_QUICK_START_SCOPE_BOUNDARY =
  "RGS Stability Quick-Start™ templates are starter operating tools. They help organize work and improve visibility, but they do not guarantee revenue, profit, compliance, or business results.";

export const STABILITY_QUICK_START_TEMPLATES: QuickStartTemplate[] = [
  {
    template_key: "lead_tracking_sheet",
    title: "Lead Tracking Sheet",
    gear_key: "demand_generation",
    failure_pattern:
      "Leads are not consistently captured, followed up, or attributed to a source.",
    when_to_use:
      "When inquiries arrive across calls, texts, walk-ins, or forms and nothing tracks them in one place.",
    first_step:
      "Open the sheet today and log every new inquiry that comes in for the rest of the week.",
    fields_or_columns: [
      { key: "lead_date", label: "Lead date", required: true },
      { key: "source", label: "Source", required: true, hint: "Referral, web, walk-in, ad, repeat" },
      { key: "name_contact", label: "Name / contact", required: true },
      { key: "inquiry_type", label: "Inquiry type", required: true },
      { key: "status", label: "Status", required: true, hint: "New, contacted, quoted, won, lost" },
      { key: "next_follow_up", label: "Next follow-up date", required: true },
      { key: "owner", label: "Owner", required: true },
      { key: "outcome", label: "Outcome", required: false },
      { key: "notes", label: "Notes", required: false },
    ],
    owner_instructions:
      "Review at the end of each day. Confirm every new lead has a name, source, status, and next follow-up date.",
    admin_instructions:
      "Pair with Demand Generation findings. If the client lacks a CRM, use this sheet for at least 30 days before recommending software.",
    client_safe_description:
      "A simple sheet to capture every new lead, the source, who owns the next step, and when to follow up.",
    scope_boundary: STABILITY_QUICK_START_SCOPE_BOUNDARY,
    output_format: "spreadsheet",
    can_export: false,
    export_supported: false,
    recommended_priority_lane: "quick_wins",
  },
  {
    template_key: "daily_cash_count",
    title: "Daily Cash Count",
    gear_key: "financial_visibility",
    failure_pattern:
      "Cash movement is unclear, end-of-day close is inconsistent, or cash variance is unexplained.",
    when_to_use:
      "When the business handles cash daily and the owner cannot quickly answer what was collected and what was paid out.",
    first_step:
      "Print or open the form tonight at close and record every line before the drawer is reset.",
    fields_or_columns: [
      { key: "date", label: "Date", required: true },
      { key: "starting_cash", label: "Starting cash", required: true },
      { key: "cash_sales", label: "Cash sales", required: true },
      { key: "payouts", label: "Payouts", required: true },
      { key: "drops", label: "Drops to safe / deposit", required: true },
      { key: "expected_cash", label: "Expected cash", required: true },
      { key: "actual_cash", label: "Actual cash", required: true },
      { key: "variance", label: "Variance", required: true },
      { key: "reviewer", label: "Reviewer", required: true },
      { key: "notes", label: "Notes", required: false },
    ],
    owner_instructions:
      "Compare expected vs actual nightly. Investigate any variance over a small tolerance you set in writing.",
    admin_instructions:
      "This is operational visibility, not an audit. Do not describe outputs as accounting reconciliation or compliance evidence.",
    client_safe_description:
      "A nightly form that confirms what came in, what went out, and whether the drawer matches.",
    scope_boundary: STABILITY_QUICK_START_SCOPE_BOUNDARY,
    output_format: "weekly_form",
    can_export: false,
    export_supported: false,
    recommended_priority_lane: "quick_wins",
  },
  {
    template_key: "follow_up_log",
    title: "Follow-Up Log",
    gear_key: "revenue_conversion",
    failure_pattern:
      "Quotes and inquiries go stale because no one tracks systematic follow-up.",
    when_to_use:
      "When quotes or proposals are sent but the team cannot say who has been re-contacted and when.",
    first_step:
      "List every open quote or proposal from the last 30 days and assign a follow-up owner today.",
    fields_or_columns: [
      { key: "customer", label: "Customer", required: true },
      { key: "inquiry_date", label: "Inquiry / quote date", required: true },
      { key: "follow_up_attempt", label: "Follow-up attempt #", required: true },
      { key: "method", label: "Method", required: true, hint: "Call, text, email" },
      { key: "response", label: "Response", required: false },
      { key: "next_step", label: "Next step", required: true },
      { key: "owner", label: "Owner", required: true },
      { key: "outcome", label: "Outcome", required: false },
    ],
    owner_instructions:
      "Walk the log every Monday. Anything older than 14 days without a next step gets re-assigned or closed.",
    admin_instructions:
      "Check whether the client already has CRM follow-up tracking before recommending this sheet long-term.",
    client_safe_description:
      "A log that keeps every open quote moving so opportunities do not quietly die.",
    scope_boundary: STABILITY_QUICK_START_SCOPE_BOUNDARY,
    output_format: "spreadsheet",
    can_export: false,
    export_supported: false,
    recommended_priority_lane: "quick_wins",
  },
  {
    template_key: "weekly_scoreboard",
    title: "Weekly Scoreboard",
    gear_key: "financial_visibility",
    failure_pattern:
      "The owner lacks a weekly operating view and decisions are made from feel, not visibility.",
    when_to_use:
      "When the owner cannot answer leads, sales, cash, and bottleneck for the prior week in under five minutes.",
    first_step:
      "Schedule a recurring 30-minute Monday block and fill in last week's numbers from existing records.",
    fields_or_columns: [
      { key: "week", label: "Week", required: true },
      { key: "leads", label: "Leads", required: true },
      { key: "booked", label: "Booked jobs / orders", required: true },
      { key: "sales", label: "Sales", required: true },
      { key: "margin_proxy", label: "Margin proxy", required: false },
      { key: "cash_balance", label: "Cash balance", required: true },
      { key: "ar_issue", label: "AR issue", required: false },
      { key: "top_bottleneck", label: "Top bottleneck", required: true },
      { key: "owner_decision_needed", label: "Owner decision needed", required: true },
    ],
    owner_instructions:
      "Fill it in personally or with one trusted reviewer. The point is the owner sees the week, not just sales totals.",
    admin_instructions:
      "Use to seed the Weekly Reflection tool once the client is consistent. Do not present as a financial statement.",
    client_safe_description:
      "A one-page weekly view of leads, sales, cash, and the most important decision for the coming week.",
    scope_boundary: STABILITY_QUICK_START_SCOPE_BOUNDARY,
    output_format: "weekly_form",
    can_export: false,
    export_supported: false,
    recommended_priority_lane: "big_rocks",
  },
  {
    template_key: "role_clarity_sheet",
    title: "Role Clarity Sheet",
    gear_key: "owner_independence",
    failure_pattern:
      "Decisions route back to the owner because roles, escalation, and backups are unclear.",
    when_to_use:
      "When the team interrupts the owner for routine decisions, or when a single absence stalls the business.",
    first_step:
      "List the five most common decisions interrupting the owner this week and assign a clear owner for each.",
    fields_or_columns: [
      { key: "role", label: "Role", required: true },
      { key: "decision_owned", label: "Decision owned", required: true },
      { key: "escalation_rule", label: "Escalation rule", required: true },
      { key: "backup_person", label: "Backup person", required: true },
      { key: "sop_link", label: "SOP link", required: false },
      { key: "success_standard", label: "Success standard", required: true },
    ],
    owner_instructions:
      "Share the sheet with the team. Anything not listed escalates to the owner; anything listed does not.",
    admin_instructions:
      "This is a stabilization aid, not an org chart. Pair with Decision Rights Accountability for deeper work.",
    client_safe_description:
      "A short sheet that says who owns each routine decision, who backs them up, and when to escalate.",
    scope_boundary: STABILITY_QUICK_START_SCOPE_BOUNDARY,
    output_format: "checklist",
    can_export: false,
    export_supported: false,
    recommended_priority_lane: "big_rocks",
  },
  {
    template_key: "customer_inquiry_tracker",
    title: "Customer Inquiry Tracker",
    gear_key: "demand_generation",
    failure_pattern:
      "Customer inquiries are scattered across calls, texts, social, and email with no shared view.",
    when_to_use:
      "When more than one channel is in use and inquiries fall through the cracks.",
    first_step:
      "Designate one person to consolidate today's inquiries from every channel into the tracker by end of day.",
    fields_or_columns: [
      { key: "inquiry_date", label: "Inquiry date", required: true },
      { key: "channel", label: "Channel", required: true, hint: "Call, text, social, email, web" },
      { key: "customer", label: "Customer", required: true },
      { key: "request", label: "Request", required: true },
      { key: "urgency", label: "Urgency", required: true },
      { key: "assigned_owner", label: "Assigned owner", required: true },
      { key: "response_sent", label: "Response sent", required: true },
      { key: "status", label: "Status", required: true },
      { key: "follow_up_date", label: "Follow-up date", required: false },
    ],
    owner_instructions:
      "Audit at end of day. Anything without an assigned owner gets one before close.",
    admin_instructions:
      "Use to surface channel coverage gaps before recommending shared inbox or CRM tooling.",
    client_safe_description:
      "A single tracker for every inquiry across channels so nothing sits without an owner.",
    scope_boundary: STABILITY_QUICK_START_SCOPE_BOUNDARY,
    output_format: "spreadsheet",
    can_export: false,
    export_supported: false,
    recommended_priority_lane: "quick_wins",
  },
  // ---------- P85.6 — Trades / Home Services templates ----------
  {
    template_key: "dispatch_priority_playbook",
    title: "Dispatch Priority Playbook™",
    gear_key: "owner_independence",
    failure_pattern:
      "Dispatch priority lives in one person's head, so the business cannot run without them.",
    when_to_use:
      "When the current dispatcher could be unavailable for 48 hours and no one else could take over with confidence.",
    first_step:
      "List the five most common job types this week and write the priority rule, escalation, and backup dispatcher for each.",
    fields_or_columns: [
      { key: "job_type", label: "Job type", required: true },
      { key: "urgency_level", label: "Urgency level", required: true },
      { key: "revenue_impact", label: "Revenue impact", required: true },
      { key: "safety_customer_note", label: "Safety / customer-impact note", required: true },
      { key: "technician_skill", label: "Technician skill needed", required: true },
      { key: "travel_constraint", label: "Travel / routing constraint", required: false },
      { key: "escalation_rule", label: "Escalation rule", required: true },
      { key: "backup_dispatcher", label: "Backup dispatcher", required: true },
      { key: "decision_owner", label: "Decision owner", required: true },
      { key: "after_hours_rule", label: "After-hours rule", required: true },
    ],
    owner_instructions:
      "Walk a non-dispatcher through the playbook this week. If they cannot run dispatch for 48 hours from it, the playbook is incomplete.",
    admin_instructions:
      "Pair with Shadow Dispatcher Risk™ findings. Do not present software presence as a substitute for a written playbook.",
    client_safe_description:
      "A short written guide that lets someone other than the current dispatcher run dispatch for 48 hours.",
    scope_boundary: STABILITY_QUICK_START_SCOPE_BOUNDARY,
    output_format: "checklist",
    can_export: false,
    export_supported: false,
    recommended_priority_lane: "big_rocks",
    industry_keys: [
      "trades_services",
      "trades",
      "home_services",
      "hvac",
      "plumbing",
      "electrical",
      "roofing",
      "landscaping",
      "pest_control",
      "cleaning_services",
      "restoration",
      "appliance_repair",
      "service_contractors",
      "field_service",
    ],
  },
  {
    template_key: "technician_utilization_tracker",
    title: "Technician Utilization Tracker™",
    gear_key: "financial_visibility",
    failure_pattern:
      "Paid labor hours are not visibly converting into billable hours and the gap is invisible.",
    when_to_use:
      "When the team looks busy but margin is thin or unclear and paid-vs-billable hours are not tracked weekly.",
    first_step:
      "Pick one week and log every technician's paid hours and billable hours daily, with a non-billable reason for the gap.",
    fields_or_columns: [
      { key: "date", label: "Date", required: true },
      { key: "technician", label: "Technician", required: true },
      { key: "paid_hours", label: "Paid hours", required: true },
      { key: "billable_hours", label: "Billable hours", required: true },
      { key: "non_billable_reason", label: "Non-billable reason", required: true },
      { key: "work_orders_completed", label: "Work orders completed", required: true },
      { key: "supply_house_time", label: "Supply house time", required: false },
      { key: "shop_truck_time", label: "Shop / truck time", required: false },
      { key: "notes", label: "Notes", required: false },
      { key: "utilization_rate", label: "Utilization rate", required: true },
    ],
    owner_instructions:
      "Review weekly. If the gap between paid and billable hours is more than 20%, treat it as a Shadow Labor Leak™ to investigate.",
    admin_instructions:
      "Pair with Shadow Labor Leak™. This is operational visibility, not a payroll, labor-law, or wage determination.",
    client_safe_description:
      "A weekly tracker that shows how much paid labor is actually converting into billable work.",
    scope_boundary: STABILITY_QUICK_START_SCOPE_BOUNDARY,
    output_format: "spreadsheet",
    can_export: false,
    export_supported: false,
    recommended_priority_lane: "quick_wins",
    industry_keys: [
      "trades_services",
      "trades",
      "home_services",
      "hvac",
      "plumbing",
      "electrical",
      "roofing",
      "landscaping",
      "pest_control",
      "cleaning_services",
      "restoration",
      "appliance_repair",
      "service_contractors",
      "field_service",
    ],
  },
  {
    template_key: "first_time_fix_callback_log",
    title: "First-Time Fix / Callback Log™",
    gear_key: "operational_efficiency",
    failure_pattern:
      "Completed jobs quietly create return visits and the callback rate is not tracked.",
    when_to_use:
      "When the schedule is full but rework, warranty returns, or customer complaints feel like a growing share of the week.",
    first_step:
      "Log every callback this week against the original job ID with the technician and a one-line root cause.",
    fields_or_columns: [
      { key: "job_id", label: "Job ID", required: true },
      { key: "customer", label: "Customer", required: true },
      { key: "technician", label: "Technician", required: true },
      { key: "completion_date", label: "Completion date", required: true },
      { key: "callback_date", label: "Callback date", required: true },
      { key: "callback_reason", label: "Callback reason", required: true },
      { key: "part_equipment_issue", label: "Part / equipment issue", required: false },
      { key: "process_issue", label: "Process issue", required: false },
      { key: "labor_hours_lost", label: "Labor hours lost", required: true },
      { key: "resolution", label: "Resolution", required: true },
      { key: "prevention_note", label: "Prevention note", required: true },
    ],
    owner_instructions:
      "Review weekly. If callback rate is more than 5% of completed jobs, treat it as First-Time Fix Drag™ and group root causes.",
    admin_instructions:
      "Use to seed callback root-cause review. Avoid blame language about technicians; focus on process and parts.",
    client_safe_description:
      "A weekly log that captures every callback so the business can see how full the schedule really is.",
    scope_boundary: STABILITY_QUICK_START_SCOPE_BOUNDARY,
    output_format: "spreadsheet",
    can_export: false,
    export_supported: false,
    recommended_priority_lane: "quick_wins",
    industry_keys: [
      "trades_services",
      "trades",
      "home_services",
      "hvac",
      "plumbing",
      "electrical",
      "roofing",
      "landscaping",
      "pest_control",
      "cleaning_services",
      "restoration",
      "appliance_repair",
      "service_contractors",
      "field_service",
    ],
  },
  {
    template_key: "truck_inventory_scan_checklist",
    title: "Truck Inventory Scan Checklist™",
    gear_key: "operational_efficiency",
    failure_pattern:
      "Trucks carry parts but no one can verify what moved from truck or warehouse to job.",
    when_to_use:
      "When the business carries truck inventory and parts cost cannot reliably be tied back to specific jobs.",
    first_step:
      "Pick one truck and one technician this week and log starting quantity, used quantity, and job ID for every SKU touched.",
    fields_or_columns: [
      { key: "truck_id", label: "Truck ID", required: true },
      { key: "technician", label: "Technician", required: true },
      { key: "part_sku", label: "Part / SKU", required: true },
      { key: "starting_quantity", label: "Starting quantity", required: true },
      { key: "used_quantity", label: "Used quantity", required: true },
      { key: "job_id", label: "Job ID", required: true },
      { key: "replenishment_needed", label: "Replenishment needed", required: true },
      { key: "scan_log_confirmed", label: "Scan / log confirmed", required: true },
      { key: "discrepancy", label: "Discrepancy", required: false },
      { key: "reviewer", label: "Reviewer", required: true },
    ],
    owner_instructions:
      "Review weekly with the dispatcher. Discrepancies are operational signals to investigate, not accusations.",
    admin_instructions:
      "Pair with Truck Inventory Accountability Loop™. Do not frame discrepancies as theft, fraud, or criminal issues.",
    client_safe_description:
      "A weekly checklist that ties parts moving from truck or warehouse to specific jobs.",
    scope_boundary: STABILITY_QUICK_START_SCOPE_BOUNDARY,
    output_format: "checklist",
    can_export: false,
    export_supported: false,
    recommended_priority_lane: "quick_wins",
    industry_keys: [
      "trades_services",
      "trades",
      "home_services",
      "hvac",
      "plumbing",
      "electrical",
      "roofing",
      "landscaping",
      "pest_control",
      "cleaning_services",
      "restoration",
      "appliance_repair",
      "service_contractors",
      "field_service",
    ],
  },
];

const BY_KEY = new Map<QuickStartTemplateKey, QuickStartTemplate>(
  STABILITY_QUICK_START_TEMPLATES.map((t) => [t.template_key, t]),
);

export function getQuickStartTemplate(
  key: QuickStartTemplateKey,
): QuickStartTemplate {
  const t = BY_KEY.get(key);
  if (!t) throw new Error(`Unknown Quick-Start template: ${key}`);
  return t;
}

/** Strips admin-only fields. Use before sending a template to a client surface. */
export function toClientSafeQuickStartTemplate(t: QuickStartTemplate) {
  const {
    admin_instructions: _admin,
    ...rest
  } = t;
  return rest;
}

export const STABILITY_QUICK_START_VERSION = "1.0.0" as const;