/**
 * P85.6 — Trades / Home Services Operational Leakage™ config.
 *
 * Deterministic operational-readiness signals for the first target
 * acquisition industry (HVAC, plumbing, electrical, roofing, landscaping,
 * cleaning services, pest control, restoration, appliance repair, general
 * service contractors, and field-service businesses).
 *
 * RGS speaks operational-readiness only here. Nothing in this file is a
 * payroll, labor, legal, accounting, tax, OSHA, licensing, or insurance
 * determination. No connector listed here is treated as a live sync
 * unless an actual integration is wired elsewhere.
 */

/** Industry keys + reasonable aliases treated as Trades / Home Services. */
export const TRADES_INDUSTRY_KEYS: ReadonlyArray<string> = [
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
];

export function isTradesIndustryKey(key: string | null | undefined): boolean {
  if (!key) return false;
  const k = String(key).toLowerCase().trim();
  return TRADES_INDUSTRY_KEYS.some((x) => x.toLowerCase() === k);
}

/** Deterministic thresholds (no AI). */
export const SHADOW_LABOR_GAP_PERCENT_THRESHOLD = 20;
export const FIRST_TIME_FIX_CALLBACK_RATE_THRESHOLD = 5;
export const DISPATCH_CONTINUITY_HOURS = 48;
/** Optional deterministic Operational Efficiency deduction for callback drag. */
export const FIRST_TIME_FIX_DEDUCTION_POINTS = 30;

export type TradesMetricKey =
  | "shadow_labor_leak"
  | "first_time_fix_drag"
  | "truck_inventory_accountability_loop"
  | "shadow_dispatcher_risk";

export type TradesGearKey =
  | "financial_visibility"
  | "operational_efficiency"
  | "owner_independence";

export type TradesEvidenceSourceType =
  | "payroll_manual_export"
  | "adp_manual_export"
  | "gusto_manual_export"
  | "paycom_manual_export"
  | "quickbooks_time_manual_export"
  | "technician_timesheets"
  | "jobber_manual_export"
  | "servicetitan_manual_export"
  | "housecall_pro_manual_export"
  | "work_order_report"
  | "schedule_report"
  | "callback_log"
  | "warranty_return_log"
  | "customer_complaint_log"
  | "technician_qa_report"
  | "manual_truck_inventory_count_sheet"
  | "warehouse_pull_sheet"
  | "parts_usage_log"
  | "job_costing_report"
  | "mobile_inventory_scan_report"
  | "dispatch_priority_playbook"
  | "scheduling_sop"
  | "escalation_rules"
  | "after_hours_dispatch_protocol"
  | "dispatcher_backup_plan"
  | "manual_utilization_log"
  | "other_manual_upload";

export interface TradesEvidenceExample {
  source_type: TradesEvidenceSourceType;
  label: string;
  /**
   * Connector-truth: every entry here is treated as manual export / upload.
   * RGS does not currently maintain live Jobber, ServiceTitan, Housecall
   * Pro, ADP, Gusto, Paycom, or QuickBooks Time integrations.
   */
  live_connector: false;
}

export const TRADES_ALLOWED_EVIDENCE_EXAMPLES: ReadonlyArray<TradesEvidenceExample> = [
  { source_type: "payroll_manual_export", label: "Payroll report (manual export / upload)", live_connector: false },
  { source_type: "adp_manual_export", label: "ADP export (manual upload)", live_connector: false },
  { source_type: "gusto_manual_export", label: "Gusto export (manual upload)", live_connector: false },
  { source_type: "paycom_manual_export", label: "Paycom export (manual upload)", live_connector: false },
  { source_type: "quickbooks_time_manual_export", label: "QuickBooks Time export (manual upload)", live_connector: false },
  { source_type: "technician_timesheets", label: "Technician timesheets", live_connector: false },
  { source_type: "jobber_manual_export", label: "Jobber export (manual upload)", live_connector: false },
  { source_type: "servicetitan_manual_export", label: "ServiceTitan export (manual upload)", live_connector: false },
  { source_type: "housecall_pro_manual_export", label: "Housecall Pro export (manual upload)", live_connector: false },
  { source_type: "work_order_report", label: "Work order completion report", live_connector: false },
  { source_type: "schedule_report", label: "Schedule report", live_connector: false },
  { source_type: "callback_log", label: "Callback / rework log", live_connector: false },
  { source_type: "warranty_return_log", label: "Warranty return log", live_connector: false },
  { source_type: "customer_complaint_log", label: "Customer complaint log", live_connector: false },
  { source_type: "technician_qa_report", label: "Technician QA report", live_connector: false },
  { source_type: "manual_truck_inventory_count_sheet", label: "Manual truck inventory count sheet", live_connector: false },
  { source_type: "warehouse_pull_sheet", label: "Warehouse pull sheet", live_connector: false },
  { source_type: "parts_usage_log", label: "Parts usage log", live_connector: false },
  { source_type: "job_costing_report", label: "Job costing report", live_connector: false },
  { source_type: "mobile_inventory_scan_report", label: "Mobile inventory scan report (manual upload)", live_connector: false },
  { source_type: "dispatch_priority_playbook", label: "Dispatch Priority Playbook™", live_connector: false },
  { source_type: "scheduling_sop", label: "Scheduling SOP", live_connector: false },
  { source_type: "escalation_rules", label: "Escalation rules", live_connector: false },
  { source_type: "after_hours_dispatch_protocol", label: "After-hours dispatch protocol", live_connector: false },
  { source_type: "dispatcher_backup_plan", label: "Dispatcher backup plan", live_connector: false },
  { source_type: "manual_utilization_log", label: "Manual technician utilization log", live_connector: false },
  { source_type: "other_manual_upload", label: "Other manual upload", live_connector: false },
];

/**
 * Forbidden client-facing claims. Trades operational leakage signals never
 * speak in legal, payroll, accounting, tax, labor-law, OSHA, licensing,
 * insurance, compliance certification, or guarantee language. Matched
 * case-insensitively as substrings.
 */
export const TRADES_OPERATIONAL_FORBIDDEN_CLAIMS: ReadonlyArray<string> = [
  "payroll violation",
  "wage violation",
  "wage issue",
  "labor law",
  "labor-law",
  "labor compliance",
  "osha compliance",
  "osha violation",
  "licensing compliance",
  "license violation",
  "insurance suitability",
  "insurance compliance",
  "tax determination",
  "tax violation",
  "tax compliance",
  "accounting determination",
  "accounting compliance",
  "legal compliance",
  "legal violation",
  "compliance certification",
  "compliance certified",
  "guaranteed savings",
  "guaranteed profit",
  "guaranteed revenue",
  "guaranteed results",
  "guaranteed",
  "theft",
  "stealing",
  "fraud",
  "criminal",
];

export function findTradesOperationalForbiddenPhrase(
  text: string | null | undefined,
): string | null {
  if (!text) return null;
  const lc = text.toLowerCase();
  for (const phrase of TRADES_OPERATIONAL_FORBIDDEN_CLAIMS) {
    if (lc.includes(phrase.toLowerCase())) return phrase;
  }
  return null;
}

export const TRADES_OPERATIONAL_CLIENT_SAFE_EXPLANATION =
  "Trades / Home Services operational leakage signals are operational-readiness and business-stability indicators. " +
  "They do not determine payroll, employment, accounting, tax, licensing, insurance, or financial-results matters, " +
  "and they are not a substitute for qualified professional advice in those areas.";

export const TRADES_OPERATIONAL_REPORT_SAFE_LANGUAGE =
  TRADES_OPERATIONAL_CLIENT_SAFE_EXPLANATION;

export const TRADES_OPERATIONAL_ADMIN_INTERPRETATION =
  "Use to surface labor leakage, callback drag, truck inventory accountability gaps, and dispatch single-point-of-failure " +
  "risk. Treat as operational-readiness signals, not legal/payroll/tax/OSHA/insurance determinations. Request manual " +
  "evidence (export / upload) before approving for client visibility.";

export interface TradesMetricDefinition {
  metric_key: TradesMetricKey;
  label: string;
  gears: ReadonlyArray<TradesGearKey>;
  /** Plain-English deterministic trigger rule. */
  trigger_rule: string;
  threshold_value: number | null;
  threshold_unit: "percent" | "hours" | "boolean" | null;
  client_safe_explanation: string;
  evidence_examples: ReadonlyArray<TradesEvidenceSourceType>;
  forward_risk: string;
  repair_map_recommendation: string;
  recommended_quick_start_templates: ReadonlyArray<string>;
}

export const TRADES_OPERATIONAL_LEAKAGE_METRICS: ReadonlyArray<TradesMetricDefinition> = [
  {
    metric_key: "shadow_labor_leak",
    label: "Shadow Labor Leak™",
    gears: ["financial_visibility", "operational_efficiency"],
    trigger_rule:
      "If (paid hours - billable hours) / paid hours * 100 is more than 20%, RGS triggers Shadow Labor Leak™. Exactly 20% does not trigger high risk.",
    threshold_value: SHADOW_LABOR_GAP_PERCENT_THRESHOLD,
    threshold_unit: "percent",
    client_safe_explanation:
      "Paid labor is not fully converting into billable work. This can create financial drag even when the team looks busy.",
    evidence_examples: [
      "payroll_manual_export",
      "technician_timesheets",
      "jobber_manual_export",
      "servicetitan_manual_export",
      "housecall_pro_manual_export",
      "work_order_report",
      "schedule_report",
      "manual_utilization_log",
      "quickbooks_time_manual_export",
      "adp_manual_export",
      "gusto_manual_export",
      "paycom_manual_export",
    ],
    forward_risk:
      "Sustained paid-vs-billable gap erodes margin and hides capacity for new work.",
    repair_map_recommendation:
      "Install Technician Utilization Tracker™ and weekly paid-to-billable review.",
    recommended_quick_start_templates: ["technician_utilization_tracker"],
  },
  {
    metric_key: "first_time_fix_drag",
    label: "First-Time Fix Drag™",
    gears: ["operational_efficiency"],
    trigger_rule:
      "If callback jobs / completed jobs * 100 is more than 5%, RGS triggers First-Time Fix Drag™. Exactly 5% does not trigger high risk.",
    threshold_value: FIRST_TIME_FIX_CALLBACK_RATE_THRESHOLD,
    threshold_unit: "percent",
    client_safe_explanation:
      "A full schedule can hide rework. RGS flags this when completed jobs are creating too many return visits.",
    evidence_examples: [
      "jobber_manual_export",
      "servicetitan_manual_export",
      "housecall_pro_manual_export",
      "work_order_report",
      "callback_log",
      "warranty_return_log",
      "customer_complaint_log",
      "technician_qa_report",
    ],
    forward_risk:
      "Rising callback rate quietly consumes labor capacity and damages customer trust.",
    repair_map_recommendation:
      "Install First-Time Fix / Callback Log™ and callback root-cause review.",
    recommended_quick_start_templates: ["first_time_fix_callback_log"],
  },
  {
    metric_key: "truck_inventory_accountability_loop",
    label: "Truck Inventory Accountability Loop™",
    gears: ["operational_efficiency", "financial_visibility"],
    trigger_rule:
      "If the business has truck inventory but no mobile scanning and no logged parts movement, RGS marks the accountability loop Incomplete. Verified accountability requires mobile scanning OR logged parts movement plus job-costing tie-out.",
    threshold_value: null,
    threshold_unit: "boolean",
    client_safe_explanation:
      "Truck inventory only helps if parts movement is logged. RGS flags this when the office cannot verify what moved from truck or warehouse to job.",
    evidence_examples: [
      "mobile_inventory_scan_report",
      "manual_truck_inventory_count_sheet",
      "warehouse_pull_sheet",
      "parts_usage_log",
      "job_costing_report",
      "servicetitan_manual_export",
      "jobber_manual_export",
    ],
    forward_risk:
      "Without an accountability loop, parts cost cannot be tied to jobs and margin per job becomes unreliable.",
    repair_map_recommendation:
      "Install Truck Inventory Scan Checklist™ and job-costing parts movement review.",
    recommended_quick_start_templates: ["truck_inventory_scan_checklist"],
  },
  {
    metric_key: "shadow_dispatcher_risk",
    label: "Shadow Dispatcher Risk™",
    gears: ["owner_independence", "operational_efficiency"],
    trigger_rule:
      "If the business has a dispatcher but no written Dispatch Priority Playbook™, RGS triggers Shadow Dispatcher Risk™. Inability to cover dispatch for 48 hours, or dispatcher single point of failure, also triggers a high-risk Owner Independence alert. Good scheduling software does not suppress the risk if no playbook or backup exists.",
    threshold_value: DISPATCH_CONTINUITY_HOURS,
    threshold_unit: "hours",
    client_safe_explanation:
      "If one person is the only one who understands dispatch priority, the business has a hidden single point of failure.",
    evidence_examples: [
      "dispatch_priority_playbook",
      "scheduling_sop",
      "escalation_rules",
      "after_hours_dispatch_protocol",
      "dispatcher_backup_plan",
    ],
    forward_risk:
      "Dispatch dependency leaves the business exposed to revenue stoppage if the dispatcher is unavailable for even a short window.",
    repair_map_recommendation:
      "Build Dispatch Priority Playbook™ and 48-hour backup dispatch protocol.",
    recommended_quick_start_templates: ["dispatch_priority_playbook"],
  },
];

export const TRADES_OPERATIONAL_LEAKAGE_CONFIG = {
  industry_keys: TRADES_INDUSTRY_KEYS,
  metrics: TRADES_OPERATIONAL_LEAKAGE_METRICS,
  shadow_labor_gap_threshold_percent: SHADOW_LABOR_GAP_PERCENT_THRESHOLD,
  callback_rate_threshold_percent: FIRST_TIME_FIX_CALLBACK_RATE_THRESHOLD,
  dispatch_continuity_hours: DISPATCH_CONTINUITY_HOURS,
  first_time_fix_deduction_points: FIRST_TIME_FIX_DEDUCTION_POINTS,
  client_safe_explanation: TRADES_OPERATIONAL_CLIENT_SAFE_EXPLANATION,
  report_safe_language: TRADES_OPERATIONAL_REPORT_SAFE_LANGUAGE,
  admin_interpretation: TRADES_OPERATIONAL_ADMIN_INTERPRETATION,
  forbidden_claims: TRADES_OPERATIONAL_FORBIDDEN_CLAIMS,
  allowed_evidence_examples: TRADES_ALLOWED_EVIDENCE_EXAMPLES,
} as const;

export function getTradesMetricDefinition(
  key: TradesMetricKey,
): TradesMetricDefinition {
  const m = TRADES_OPERATIONAL_LEAKAGE_METRICS.find((x) => x.metric_key === key);
  if (!m) throw new Error(`Unknown trades metric: ${key}`);
  return m;
}
