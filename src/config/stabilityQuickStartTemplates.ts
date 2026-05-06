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
  | "repeat_purchase_tracker"
  | "opening_closing_checklist"
  | "inventory_count_sheet"
  | "client_onboarding_checklist"
  | "customer_support_response_tracker"
  | "stockout_backorder_log"
  | "owner_time_audit_worksheet"
  | "proposal_pipeline_tracker"
  | "channel_concentration_review";

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
  {
    template_key: "menu_margin_tracker",
    title: "Menu Margin Tracker",
    gear_key: "financial_visibility",
    failure_pattern:
      "Menu items are priced without knowing actual food cost or contribution margin per item.",
    when_to_use:
      "When food cost trends above target and the team cannot say which menu items are dragging margin.",
    first_step:
      "List the top 20 selling menu items today and capture estimated food cost and price for each.",
    fields_or_columns: [
      { key: "menu_item", label: "Menu item", required: true },
      { key: "category", label: "Category", required: true },
      { key: "price", label: "Price", required: true },
      { key: "estimated_food_cost", label: "Estimated food cost", required: true },
      { key: "gross_margin_pct", label: "Gross margin %", required: true },
      { key: "sales_volume", label: "Sales volume (period)", required: true },
      { key: "review_action", label: "Review action", required: true, hint: "Re-price, redesign, retire, promote" },
    ],
    owner_instructions:
      "Review monthly. Items below target margin need a price, recipe, or sourcing change.",
    admin_instructions:
      "Operational visibility only. Do not describe outputs as accounting margin analysis or tax-grade reporting.",
    client_safe_description:
      "A simple menu sheet that shows price, estimated food cost, and gross margin per item so weak items get attention.",
    scope_boundary: STABILITY_QUICK_START_SCOPE_BOUNDARY,
    output_format: "spreadsheet",
    can_export: false,
    export_supported: false,
    recommended_priority_lane: "big_rocks",
    industry_keys: ["restaurant_food_service", "restaurant", "food_service", "cafe"],
  },
  {
    template_key: "daily_sales_and_labor_log",
    title: "Daily Sales & Labor Log",
    gear_key: "operational_efficiency",
    failure_pattern:
      "Labor cost % drifts because daily sales and labor hours are not compared in the same place.",
    when_to_use:
      "When labor cost % is unclear day-to-day and managers cannot adjust schedules in real time.",
    first_step:
      "Record today's sales, labor hours, and a single manager observation before close tonight.",
    fields_or_columns: [
      { key: "date", label: "Date", required: true },
      { key: "sales", label: "Sales", required: true },
      { key: "labor_hours", label: "Labor hours", required: true },
      { key: "labor_cost_pct", label: "Labor cost %", required: true },
      { key: "daypart", label: "Daypart", required: true, hint: "AM, lunch, PM, late" },
      { key: "manager_note", label: "Manager note", required: false },
    ],
    owner_instructions:
      "Review weekly. Look for dayparts where labor % consistently exceeds your target and adjust scheduling.",
    admin_instructions:
      "Operational visibility only. Do not frame as payroll compliance, wage law, or labor-law determination.",
    client_safe_description:
      "A daily log that ties sales and labor hours together so labor cost % stays visible.",
    scope_boundary: STABILITY_QUICK_START_SCOPE_BOUNDARY,
    output_format: "spreadsheet",
    can_export: false,
    export_supported: false,
    recommended_priority_lane: "big_rocks",
    industry_keys: ["restaurant_food_service", "restaurant", "food_service", "cafe"],
  },
  {
    template_key: "dead_stock_liquidation_plan",
    title: "Dead Stock Liquidation Plan",
    gear_key: "financial_visibility",
    failure_pattern:
      "Stagnant inventory ties up cash and shelf space without a clear plan to move it.",
    when_to_use:
      "When inventory turnover is below target or specific SKUs/categories have been stagnant for 90+ days.",
    first_step:
      "List every SKU or category sitting longer than 90 days with its tied-up value today.",
    fields_or_columns: [
      { key: "sku_or_category", label: "SKU / category", required: true },
      { key: "days_stagnant", label: "Days stagnant", required: true },
      { key: "value_tied_up", label: "Value tied up", required: true },
      { key: "markdown_action", label: "Markdown action", required: true, hint: "Discount %, bundle, return, donate" },
      { key: "owner", label: "Owner", required: true },
      { key: "target_date", label: "Target clear-by date", required: true },
    ],
    owner_instructions:
      "Review monthly. Confirm the markdown action and the target clear-by date for each line.",
    admin_instructions:
      "Operational visibility only. Not an inventory valuation, accounting write-down, or tax-deductibility opinion.",
    client_safe_description:
      "A working list of stagnant inventory with markdown actions, owners, and clear-by dates.",
    scope_boundary: STABILITY_QUICK_START_SCOPE_BOUNDARY,
    output_format: "spreadsheet",
    can_export: false,
    export_supported: false,
    recommended_priority_lane: "quick_wins",
    industry_keys: ["retail", "brick_and_mortar_retail"],
  },
  {
    template_key: "category_margin_review",
    title: "Category Margin Review",
    gear_key: "financial_visibility",
    failure_pattern:
      "Reorder decisions are made without visibility into category-level margin or return rate.",
    when_to_use:
      "When the team cannot say which retail categories drive margin vs. drag it.",
    first_step:
      "Pull last quarter's revenue and COGS by category and capture them in the sheet.",
    fields_or_columns: [
      { key: "category", label: "Category", required: true },
      { key: "revenue", label: "Revenue", required: true },
      { key: "cogs", label: "COGS", required: true },
      { key: "gross_margin_pct", label: "Gross margin %", required: true },
      { key: "return_rate_pct", label: "Return rate %", required: true },
      { key: "reorder_decision", label: "Reorder decision", required: true, hint: "Expand, hold, reduce, retire" },
    ],
    owner_instructions:
      "Review quarterly before reordering. Categories below target margin or above return-rate target need a written decision.",
    admin_instructions:
      "Operational visibility only. Not an accounting margin opinion or buyer-grade financial analysis.",
    client_safe_description:
      "A category-level view of revenue, COGS, gross margin, and returns to guide reorder decisions.",
    scope_boundary: STABILITY_QUICK_START_SCOPE_BOUNDARY,
    output_format: "spreadsheet",
    can_export: false,
    export_supported: false,
    recommended_priority_lane: "big_rocks",
    industry_keys: ["retail", "brick_and_mortar_retail"],
  },
  {
    template_key: "utilization_tracker",
    title: "Billable Utilization Tracker",
    gear_key: "operational_efficiency",
    failure_pattern:
      "Billable utilization drifts low because available vs. billable hours are not tracked per person.",
    when_to_use:
      "When the team cannot say which people are over- or under-utilized week to week.",
    first_step:
      "Capture available hours and billable hours per team member for last week today.",
    fields_or_columns: [
      { key: "team_member", label: "Team member", required: true },
      { key: "available_hours", label: "Available hours", required: true },
      { key: "billable_hours", label: "Billable hours", required: true },
      { key: "utilization_pct", label: "Utilization %", required: true },
      { key: "project", label: "Primary project", required: true },
      { key: "review_note", label: "Review note", required: false },
    ],
    owner_instructions:
      "Review weekly. Investigate sustained dips below target utilization with the team member, not at them.",
    admin_instructions:
      "Operational visibility only. Not a labor-law, payroll, or HR compliance determination.",
    client_safe_description:
      "A weekly view of available vs. billable hours per team member so utilization stays visible.",
    scope_boundary: STABILITY_QUICK_START_SCOPE_BOUNDARY,
    output_format: "spreadsheet",
    can_export: false,
    export_supported: false,
    recommended_priority_lane: "big_rocks",
    industry_keys: ["professional_services", "consulting", "agency"],
  },
  {
    template_key: "scope_change_log",
    title: "Scope Change Log",
    gear_key: "revenue_conversion",
    failure_pattern:
      "Scope changes happen verbally and are never quoted, signed, or invoiced.",
    when_to_use:
      "When projects regularly grow beyond the original engagement without signed change orders.",
    first_step:
      "List every active project and capture each requested change since kickoff today.",
    fields_or_columns: [
      { key: "client_or_project", label: "Client / project", required: true },
      { key: "requested_change", label: "Requested change", required: true },
      { key: "date", label: "Date", required: true },
      { key: "approved_by", label: "Approved by", required: true },
      { key: "quoted_amount", label: "Quoted amount", required: true },
      { key: "status", label: "Status", required: true, hint: "Open, signed, declined, invoiced" },
    ],
    owner_instructions:
      "Review weekly. Any change without a signed approval and a quoted amount needs follow-up before more work happens.",
    admin_instructions:
      "Operational visibility only. Not a legal contract, MSA modification, or enforceability opinion.",
    client_safe_description:
      "A simple log of requested scope changes with the quoted amount, who approved it, and status.",
    scope_boundary: STABILITY_QUICK_START_SCOPE_BOUNDARY,
    output_format: "spreadsheet",
    can_export: false,
    export_supported: false,
    recommended_priority_lane: "quick_wins",
    industry_keys: ["professional_services", "consulting", "agency"],
  },
  {
    template_key: "ar_aging_review",
    title: "A/R Aging Review",
    gear_key: "financial_visibility",
    failure_pattern:
      "Outstanding invoices age past terms without an owner or a next action.",
    when_to_use:
      "When average A/R days exceeds target and the team cannot say who is following up on which invoices.",
    first_step:
      "Pull every invoice older than terms today and assign a follow-up owner per line.",
    fields_or_columns: [
      { key: "client", label: "Client", required: true },
      { key: "invoice_date", label: "Invoice date", required: true },
      { key: "amount", label: "Amount", required: true },
      { key: "days_outstanding", label: "Days outstanding", required: true },
      { key: "follow_up_owner", label: "Follow-up owner", required: true },
      { key: "next_action", label: "Next action", required: true },
    ],
    owner_instructions:
      "Review weekly. Every line older than terms must have an owner and a next action with a date.",
    admin_instructions:
      "Operational visibility only. Not a collections-law opinion, debt-recovery procedure, or bad-debt write-off determination.",
    client_safe_description:
      "A weekly working list of outstanding invoices with owners and next actions.",
    scope_boundary: STABILITY_QUICK_START_SCOPE_BOUNDARY,
    output_format: "spreadsheet",
    can_export: false,
    export_supported: false,
    recommended_priority_lane: "big_rocks",
    industry_keys: ["professional_services", "consulting", "agency"],
  },
  {
    template_key: "fulfillment_sla_tracker",
    title: "Fulfillment SLA Tracker",
    gear_key: "operational_efficiency",
    failure_pattern:
      "Orders ship slower than promised because order-to-ship time is not measured per order.",
    when_to_use:
      "When average ship time creeps above the customer-facing SLA and complaints rise.",
    first_step:
      "Capture order date and ship date for last week's orders today and compute hours-to-ship.",
    fields_or_columns: [
      { key: "order_date", label: "Order date", required: true },
      { key: "ship_date", label: "Ship date", required: true },
      { key: "hours_to_ship", label: "Hours to ship", required: true },
      { key: "carrier", label: "Carrier", required: true },
      { key: "delay_reason", label: "Delay reason", required: false },
      { key: "owner", label: "Owner", required: true },
    ],
    owner_instructions:
      "Review weekly. Investigate any order whose ship time exceeded the SLA and capture the delay reason.",
    admin_instructions:
      "Operational visibility only. Not a carrier-contract, customs, or shipping-law determination.",
    client_safe_description:
      "An order-by-order view of ship time vs. SLA so delays are visible early.",
    scope_boundary: STABILITY_QUICK_START_SCOPE_BOUNDARY,
    output_format: "spreadsheet",
    can_export: false,
    export_supported: false,
    recommended_priority_lane: "big_rocks",
    industry_keys: ["ecommerce_online_retail", "ecommerce", "e_commerce", "online_retail"],
  },
  {
    template_key: "return_reason_log",
    title: "Return Reason Log",
    gear_key: "operational_efficiency",
    failure_pattern:
      "Returns are processed without capturing why, so the same defects repeat.",
    when_to_use:
      "When return rate trends above target and root causes are unknown.",
    first_step:
      "Capture every return from the last 30 days with the order, SKU, reason, and refund amount today.",
    fields_or_columns: [
      { key: "order_or_sku", label: "Order / SKU", required: true },
      { key: "return_reason", label: "Return reason", required: true },
      { key: "refund_amount", label: "Refund amount", required: true },
      { key: "root_cause", label: "Root cause", required: true },
      { key: "prevention_action", label: "Prevention action", required: true },
    ],
    owner_instructions:
      "Review monthly. Group recurring reasons and assign at least one prevention action per top reason.",
    admin_instructions:
      "Operational visibility only. Not a product-liability, warranty-law, or consumer-protection opinion.",
    client_safe_description:
      "A log of returns with reason, root cause, and a prevention action for each recurring issue.",
    scope_boundary: STABILITY_QUICK_START_SCOPE_BOUNDARY,
    output_format: "spreadsheet",
    can_export: false,
    export_supported: false,
    recommended_priority_lane: "quick_wins",
    industry_keys: ["ecommerce_online_retail", "ecommerce", "e_commerce", "online_retail"],
  },
  {
    template_key: "repeat_purchase_tracker",
    title: "Repeat Purchase Tracker",
    gear_key: "demand_generation",
    failure_pattern:
      "Repeat-purchase rate is unknown because first vs. repeat purchases are not tagged or tracked.",
    when_to_use:
      "When the team cannot say which customer segments come back and which do not.",
    first_step:
      "Tag last quarter's customers as first-time or repeat in the sheet today.",
    fields_or_columns: [
      { key: "customer_segment", label: "Customer segment", required: true },
      { key: "first_purchase_date", label: "First purchase date", required: true },
      { key: "repeat_purchase_date", label: "Repeat purchase date", required: false },
      { key: "offer_or_source", label: "Offer / source", required: true },
      { key: "next_campaign", label: "Next campaign", required: true },
    ],
    owner_instructions:
      "Review monthly. Plan one targeted campaign per segment that under-indexes on repeat purchase.",
    admin_instructions:
      "Operational visibility only. Not a marketing-law, privacy, or consent-management opinion.",
    client_safe_description:
      "A simple view of first vs. repeat purchases per segment to guide the next campaign.",
    scope_boundary: STABILITY_QUICK_START_SCOPE_BOUNDARY,
    output_format: "spreadsheet",
    can_export: false,
    export_supported: false,
    recommended_priority_lane: "big_rocks",
    industry_keys: ["ecommerce_online_retail", "ecommerce", "e_commerce", "online_retail"],
  },
  // ---------- P89 — General Industry Depth Hardening templates ----------
  {
    template_key: "opening_closing_checklist",
    title: "Opening / Closing Checklist",
    gear_key: "operational_efficiency",
    failure_pattern:
      "Opening and closing routines vary by who is on shift, so quality and cash control drift.",
    when_to_use:
      "When the business depends on consistent open/close steps and shifts vary in execution.",
    first_step:
      "Walk one open and one close in person and write down every step exactly as it happens today.",
    fields_or_columns: [
      { key: "shift", label: "Shift (open/close)", required: true },
      { key: "step", label: "Step", required: true },
      { key: "owner_role", label: "Owner role", required: true },
      { key: "time_target", label: "Time target", required: false },
      { key: "verified_by", label: "Verified by", required: true },
      { key: "issue_noted", label: "Issue noted", required: false },
    ],
    owner_instructions:
      "Post the checklist at the open/close station. Review exceptions weekly with the manager on duty.",
    admin_instructions:
      "Operational consistency only. Do not describe as a labor-law, food-safety, OSHA, or licensing artifact.",
    client_safe_description:
      "A repeatable open/close checklist so every shift starts and ends the same way.",
    scope_boundary: STABILITY_QUICK_START_SCOPE_BOUNDARY,
    output_format: "checklist",
    can_export: false,
    export_supported: false,
    recommended_priority_lane: "quick_wins",
    industry_keys: ["restaurant_food_service", "retail", "general_small_business"],
  },
  {
    template_key: "inventory_count_sheet",
    title: "Inventory Count Sheet",
    gear_key: "operational_efficiency",
    failure_pattern:
      "Inventory levels are guessed, counts are inconsistent, or shrink and stockouts go unexplained.",
    when_to_use:
      "When the business carries physical inventory and counts are sporadic or undocumented.",
    first_step:
      "Pick the top 20 SKUs by movement and count them tonight before close.",
    fields_or_columns: [
      { key: "count_date", label: "Count date", required: true },
      { key: "sku_or_item", label: "SKU / item", required: true },
      { key: "expected_qty", label: "Expected qty", required: true },
      { key: "counted_qty", label: "Counted qty", required: true },
      { key: "variance", label: "Variance", required: true },
      { key: "reason_code", label: "Reason / cause", required: false },
      { key: "counter", label: "Counter", required: true },
    ],
    owner_instructions:
      "Count the same set on a fixed cadence. Investigate any variance over your written tolerance.",
    admin_instructions:
      "Operational visibility only. Not a tax inventory valuation, not an audit, not a regulated cannabis seed-to-sale reconciliation.",
    client_safe_description:
      "A simple sheet for counting key inventory and recording variance against expected levels.",
    scope_boundary: STABILITY_QUICK_START_SCOPE_BOUNDARY,
    output_format: "spreadsheet",
    can_export: false,
    export_supported: false,
    recommended_priority_lane: "quick_wins",
    industry_keys: ["retail", "ecommerce_online_retail", "restaurant_food_service", "general_small_business"],
  },
  {
    template_key: "client_onboarding_checklist",
    title: "Client Onboarding Checklist",
    gear_key: "revenue_conversion",
    failure_pattern:
      "New client kickoffs are inconsistent, scope is unclear, and early friction damages retention.",
    when_to_use:
      "When the team cannot describe a repeatable, documented kickoff for a new client engagement.",
    first_step:
      "List every step that happens in the first two weeks of a typical engagement and assign owners.",
    fields_or_columns: [
      { key: "step", label: "Step", required: true },
      { key: "owner", label: "Owner", required: true },
      { key: "due_offset_days", label: "Due (days from kickoff)", required: true },
      { key: "deliverable", label: "Deliverable / artifact", required: true },
      { key: "client_signoff", label: "Client sign-off needed", required: true },
      { key: "status", label: "Status", required: true },
    ],
    owner_instructions:
      "Run the checklist live with the client in week one. Anything skipped becomes a documented risk.",
    admin_instructions:
      "Operational onboarding only. Not a contract, not legal scope, not a billing arrangement.",
    client_safe_description:
      "A documented kickoff checklist so every new client gets the same clear start.",
    scope_boundary: STABILITY_QUICK_START_SCOPE_BOUNDARY,
    output_format: "checklist",
    can_export: false,
    export_supported: false,
    recommended_priority_lane: "big_rocks",
    industry_keys: ["professional_services", "general_small_business"],
  },
  {
    template_key: "customer_support_response_tracker",
    title: "Customer Support Response Tracker",
    gear_key: "operational_efficiency",
    failure_pattern:
      "Support requests sit too long, response time is unknown, and review damage builds quietly.",
    when_to_use:
      "When customers contact support across email, chat, or social and no one tracks first-response time.",
    first_step:
      "Pick a single inbox and start logging every incoming request with the time it arrived today.",
    fields_or_columns: [
      { key: "received_at", label: "Received at", required: true },
      { key: "channel", label: "Channel", required: true },
      { key: "customer", label: "Customer", required: true },
      { key: "issue_type", label: "Issue type", required: true },
      { key: "first_response_at", label: "First response at", required: true },
      { key: "resolved_at", label: "Resolved at", required: false },
      { key: "owner", label: "Owner", required: true },
    ],
    owner_instructions:
      "Review weekly. Anything past your written first-response target gets root-caused, not blamed.",
    admin_instructions:
      "Operational responsiveness only. Not a service-level agreement, warranty, or consumer-protection claim.",
    client_safe_description:
      "A tracker for incoming support requests and how quickly the team responds.",
    scope_boundary: STABILITY_QUICK_START_SCOPE_BOUNDARY,
    output_format: "spreadsheet",
    can_export: false,
    export_supported: false,
    recommended_priority_lane: "quick_wins",
    industry_keys: ["ecommerce_online_retail", "professional_services", "retail", "general_small_business"],
  },
  {
    template_key: "stockout_backorder_log",
    title: "Stockout / Backorder Log",
    gear_key: "operational_efficiency",
    failure_pattern:
      "Stockouts and backorders are not logged, so reorder discipline and supplier reliability stay invisible.",
    when_to_use:
      "When customers or staff report missing items but no one records frequency or root cause.",
    first_step:
      "Add today's known stockouts to the log and assign each one a reason code.",
    fields_or_columns: [
      { key: "occurred_at", label: "Occurred at", required: true },
      { key: "sku_or_item", label: "SKU / item", required: true },
      { key: "reason_code", label: "Reason code", required: true, hint: "Vendor delay, demand spike, ordering miss" },
      { key: "supplier", label: "Supplier", required: false },
      { key: "lost_sale_estimate", label: "Lost-sale estimate", required: false },
      { key: "resolution_date", label: "Resolution date", required: false },
    ],
    owner_instructions:
      "Review monthly. Recurring SKUs or suppliers move into the reorder discipline review.",
    admin_instructions:
      "Operational visibility only. Not a supplier-contract, regulated-cannabis inventory, or insurance loss claim.",
    client_safe_description:
      "A log of stockouts and backorders so reorder and supplier patterns become visible.",
    scope_boundary: STABILITY_QUICK_START_SCOPE_BOUNDARY,
    output_format: "spreadsheet",
    can_export: false,
    export_supported: false,
    recommended_priority_lane: "quick_wins",
    industry_keys: ["retail", "ecommerce_online_retail", "general_small_business"],
  },
  {
    template_key: "owner_time_audit_worksheet",
    title: "Owner Time Audit Worksheet",
    gear_key: "owner_independence",
    failure_pattern:
      "The owner cannot describe how their week is actually spent, so delegation decisions are guesses.",
    when_to_use:
      "When the owner is the bottleneck and there is no honest record of where their hours go.",
    first_step:
      "Block the owner's calendar in 30-minute slots for one week and tag each slot with a category.",
    fields_or_columns: [
      { key: "day", label: "Day", required: true },
      { key: "time_block", label: "Time block", required: true },
      { key: "activity", label: "Activity", required: true },
      { key: "category", label: "Category", required: true, hint: "Sales, ops, finance, people, owner-only" },
      { key: "delegable", label: "Delegable?", required: true },
      { key: "next_owner_candidate", label: "Next owner candidate", required: false },
    ],
    owner_instructions:
      "Review the week honestly. Anything tagged delegable that recurred 3+ times becomes a delegation candidate.",
    admin_instructions:
      "Operational delegation aid only. Not an HR job description, not an employment classification opinion.",
    client_safe_description:
      "A one-week worksheet that shows where the owner's time actually goes and what could move off the owner's plate.",
    scope_boundary: STABILITY_QUICK_START_SCOPE_BOUNDARY,
    output_format: "weekly_form",
    can_export: false,
    export_supported: false,
    recommended_priority_lane: "big_rocks",
    industry_keys: ["general_small_business", "professional_services", "restaurant_food_service", "retail", "ecommerce_online_retail"],
  },
  {
    template_key: "proposal_pipeline_tracker",
    title: "Proposal Pipeline Tracker",
    gear_key: "revenue_conversion",
    failure_pattern:
      "Proposals go out without a tracked pipeline, so close-rate and follow-up cadence stay invisible.",
    when_to_use:
      "When the team sends proposals but cannot say how many are open, stalled, won, or lost in the last 90 days.",
    first_step:
      "List every proposal sent in the last 90 days and tag its current stage today.",
    fields_or_columns: [
      { key: "client", label: "Client", required: true },
      { key: "proposal_sent", label: "Proposal sent", required: true },
      { key: "value", label: "Estimated value", required: true },
      { key: "stage", label: "Stage", required: true, hint: "Sent, reviewed, negotiating, won, lost" },
      { key: "last_contact", label: "Last contact", required: true },
      { key: "next_step", label: "Next step", required: true },
      { key: "owner", label: "Owner", required: true },
    ],
    owner_instructions:
      "Walk the pipeline weekly. Any proposal idle 14+ days without a next step gets re-engaged or closed.",
    admin_instructions:
      "Operational pipeline visibility only. Not a contract, not a forecast guarantee, not a revenue commitment.",
    client_safe_description:
      "A weekly tracker for every active proposal so opportunities do not stall silently.",
    scope_boundary: STABILITY_QUICK_START_SCOPE_BOUNDARY,
    output_format: "spreadsheet",
    can_export: false,
    export_supported: false,
    recommended_priority_lane: "quick_wins",
    industry_keys: ["professional_services", "general_small_business"],
  },
  {
    template_key: "channel_concentration_review",
    title: "Channel Concentration Review",
    gear_key: "demand_generation",
    failure_pattern:
      "A single lead source, ad platform, or marketplace produces most of the revenue, but no one tracks the dependency.",
    when_to_use:
      "When the business cannot quickly state what share of revenue or leads comes from each channel.",
    first_step:
      "Pull the last 90 days of revenue or leads and split them by source today.",
    fields_or_columns: [
      { key: "channel", label: "Channel / source", required: true },
      { key: "leads_or_orders", label: "Leads / orders", required: true },
      { key: "revenue", label: "Revenue", required: true },
      { key: "share_pct", label: "Share %", required: true },
      { key: "dependency_risk", label: "Dependency risk", required: true },
      { key: "next_diversification_step", label: "Next diversification step", required: false },
    ],
    owner_instructions:
      "Review quarterly. Any channel above your written concentration threshold becomes a diversification priority.",
    admin_instructions:
      "Operational concentration visibility only. Not a marketing-attribution, ad-platform, or investor disclosure opinion.",
    client_safe_description:
      "A quarterly review of how concentrated revenue is in each channel and where to diversify next.",
    scope_boundary: STABILITY_QUICK_START_SCOPE_BOUNDARY,
    output_format: "spreadsheet",
    can_export: false,
    export_supported: false,
    recommended_priority_lane: "big_rocks",
    industry_keys: ["ecommerce_online_retail", "general_small_business", "retail", "professional_services"],
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