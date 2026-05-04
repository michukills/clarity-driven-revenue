import { supabase } from "@/integrations/supabase/client";

export type FvProvider =
  | "quickbooks" | "xero" | "stripe" | "bank_account" | "point_of_sale"
  | "spreadsheet" | "manual_upload" | "cash_log" | "other";

export type FvSourceType =
  | "accounting" | "payment_processor" | "bank" | "point_of_sale"
  | "revenue_log" | "expense_log" | "manual_financial_summary" | "other";

export type FvStatus =
  | "not_connected" | "connected" | "needs_reconnect" | "sync_paused"
  | "sync_error" | "disconnected" | "manual_source" | "unknown";

export type FvHealth =
  | "healthy" | "needs_attention" | "stale" | "incomplete" | "error" | "unknown";

export type FvRelatedSourceType =
  | "revenue_risk_monitor" | "monthly_system_review" | "scorecard_history"
  | "priority_action_tracker" | "owner_decision_dashboard" | "advisory_notes"
  | "connector" | "other";

export type FvServiceLane =
  | "diagnostic" | "implementation" | "rgs_control_system" | "revenue_control_system"
  | "admin_only" | "shared_support" | "report_only" | "public_pre_client";

export type FvJourneyPhase =
  | "public_pre_client" | "paid_diagnostic" | "owner_interview" | "diagnostic_tools"
  | "admin_review" | "report_repair_map" | "implementation_planning"
  | "implementation_execution" | "training_handoff" | "rcs_ongoing_visibility"
  | "renewal_health_monitoring" | "internal_admin_operations";

export type FvIndustryBehavior =
  | "all_industries_shared" | "industry_aware_copy" | "industry_aware_questions"
  | "industry_aware_outputs" | "industry_specific_benchmarks"
  | "industry_specific_templates" | "industry_restricted" | "general_fallback";

export interface AdminFinancialVisibilitySource {
  id: string;
  customer_id: string;
  provider: FvProvider;
  source_type: FvSourceType;
  display_name: string;
  status: FvStatus;
  health: FvHealth;
  service_lane: FvServiceLane;
  customer_journey_phase: FvJourneyPhase;
  industry_behavior: FvIndustryBehavior;
  related_tool_key: string | null;
  related_source_type: FvRelatedSourceType | null;
  related_source_id: string | null;
  last_sync_at: string | null;
  last_checked_at: string | null;
  client_visible_summary: string | null;
  visibility_limitations: string | null;
  revenue_summary: string | null;
  expense_summary: string | null;
  cash_visibility_summary: string | null;
  margin_visibility_summary: string | null;
  invoice_payment_summary: string | null;
  data_quality_summary: string | null;
  industry_notes: unknown;
  internal_notes: string | null;
  admin_notes: string | null;
  tags: unknown;
  client_visible: boolean;
  pinned: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface ClientFinancialVisibilitySource {
  id: string;
  provider: FvProvider;
  source_type: FvSourceType;
  display_name: string;
  status: FvStatus;
  health: FvHealth;
  service_lane: FvServiceLane;
  customer_journey_phase: FvJourneyPhase;
  industry_behavior: FvIndustryBehavior;
  related_tool_key: string | null;
  related_source_type: FvRelatedSourceType | null;
  related_source_id: string | null;
  last_sync_at: string | null;
  last_checked_at: string | null;
  client_visible_summary: string | null;
  visibility_limitations: string | null;
  revenue_summary: string | null;
  expense_summary: string | null;
  cash_visibility_summary: string | null;
  margin_visibility_summary: string | null;
  invoice_payment_summary: string | null;
  data_quality_summary: string | null;
  industry_notes: unknown;
  tags: unknown;
  pinned: boolean;
  display_order: number;
  updated_at: string;
}

export const FV_PROVIDERS: FvProvider[] = [
  "quickbooks","xero","stripe","bank_account","point_of_sale",
  "spreadsheet","manual_upload","cash_log","other",
];
export const FV_SOURCE_TYPES: FvSourceType[] = [
  "accounting","payment_processor","bank","point_of_sale",
  "revenue_log","expense_log","manual_financial_summary","other",
];
export const FV_STATUSES: FvStatus[] = [
  "not_connected","connected","needs_reconnect","sync_paused",
  "sync_error","disconnected","manual_source","unknown",
];
export const FV_HEALTHS: FvHealth[] = [
  "healthy","needs_attention","stale","incomplete","error","unknown",
];
export const FV_RELATED_SOURCE_TYPES: FvRelatedSourceType[] = [
  "revenue_risk_monitor","monthly_system_review","scorecard_history",
  "priority_action_tracker","owner_decision_dashboard","advisory_notes",
  "connector","other",
];
export const FV_LANES: FvServiceLane[] = [
  "diagnostic","implementation","rgs_control_system","revenue_control_system",
  "admin_only","shared_support","report_only","public_pre_client",
];
export const FV_PHASES: FvJourneyPhase[] = [
  "public_pre_client","paid_diagnostic","owner_interview","diagnostic_tools",
  "admin_review","report_repair_map","implementation_planning",
  "implementation_execution","training_handoff","rcs_ongoing_visibility",
  "renewal_health_monitoring","internal_admin_operations",
];
export const FV_INDUSTRIES: FvIndustryBehavior[] = [
  "all_industries_shared","industry_aware_copy","industry_aware_questions",
  "industry_aware_outputs","industry_specific_benchmarks",
  "industry_specific_templates","industry_restricted","general_fallback",
];

// Brand-correct labels (preserve exact official capitalization).
export const FV_PROVIDER_LABEL: Record<FvProvider, string> = {
  quickbooks: "QuickBooks",
  xero: "Xero",
  stripe: "Stripe",
  bank_account: "Bank account",
  point_of_sale: "Point of sale",
  spreadsheet: "Spreadsheet",
  manual_upload: "Manual upload",
  cash_log: "Cash log",
  other: "Other",
};

export const FV_SOURCE_TYPE_LABEL: Record<FvSourceType, string> = {
  accounting: "Accounting",
  payment_processor: "Payment processor",
  bank: "Bank",
  point_of_sale: "Point of sale",
  revenue_log: "Revenue log",
  expense_log: "Expense log",
  manual_financial_summary: "Manual financial summary",
  other: "Other",
};

export const FV_STATUS_LABEL: Record<FvStatus, string> = {
  not_connected: "Not connected",
  connected: "Connected",
  needs_reconnect: "Needs reconnect",
  sync_paused: "Sync paused",
  sync_error: "Sync error",
  disconnected: "Disconnected",
  manual_source: "Manual source",
  unknown: "Unknown",
};

export const FV_HEALTH_LABEL: Record<FvHealth, string> = {
  healthy: "Healthy",
  needs_attention: "Needs attention",
  stale: "Stale",
  incomplete: "Incomplete",
  error: "Error",
  unknown: "Unknown",
};

export const FV_RELATED_SOURCE_LABEL: Record<FvRelatedSourceType, string> = {
  revenue_risk_monitor: "Revenue & Risk Monitor",
  monthly_system_review: "Monthly System Review",
  scorecard_history: "Scorecard history",
  priority_action_tracker: "Priority Action Tracker",
  owner_decision_dashboard: "Owner Decision Dashboard",
  advisory_notes: "Advisory Notes",
  connector: "Connector",
  other: "Other",
};

export const FV_LANE_LABEL: Record<FvServiceLane, string> = {
  diagnostic: "Diagnostic",
  implementation: "Implementation",
  rgs_control_system: "RGS Control System",
  revenue_control_system: "Revenue Control System",
  admin_only: "Admin only",
  shared_support: "Shared support",
  report_only: "Report",
  public_pre_client: "Public",
};

export const FV_PHASE_LABEL: Record<FvJourneyPhase, string> = {
  public_pre_client: "Public",
  paid_diagnostic: "Paid diagnostic",
  owner_interview: "Owner interview",
  diagnostic_tools: "Diagnostic tools",
  admin_review: "Admin review",
  report_repair_map: "Report / repair map",
  implementation_planning: "Implementation planning",
  implementation_execution: "Implementation execution",
  training_handoff: "Training handoff",
  rcs_ongoing_visibility: "Ongoing visibility",
  renewal_health_monitoring: "Renewal / health monitoring",
  internal_admin_operations: "Internal admin",
};

export const FV_INDUSTRY_LABEL: Record<FvIndustryBehavior, string> = {
  all_industries_shared: "All industries",
  industry_aware_copy: "Industry-aware copy",
  industry_aware_questions: "Industry-aware questions",
  industry_aware_outputs: "Industry-aware outputs",
  industry_specific_benchmarks: "Industry benchmarks",
  industry_specific_templates: "Industry templates",
  industry_restricted: "Industry restricted",
  general_fallback: "General fallback",
};

export async function adminListFinancialVisibility(
  customerId: string,
): Promise<AdminFinancialVisibilitySource[]> {
  const { data, error } = await (supabase as any)
    .from("financial_visibility_sources")
    .select("*")
    .eq("customer_id", customerId)
    .order("pinned", { ascending: false })
    .order("display_order", { ascending: true })
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as AdminFinancialVisibilitySource[];
}

export async function adminCreateFinancialVisibility(
  customerId: string,
  patch: Partial<AdminFinancialVisibilitySource> & { display_name: string },
): Promise<AdminFinancialVisibilitySource> {
  const { data, error } = await (supabase as any)
    .from("financial_visibility_sources")
    .insert({ customer_id: customerId, ...patch })
    .select("*")
    .single();
  if (error) throw error;
  return data as AdminFinancialVisibilitySource;
}

export async function adminUpdateFinancialVisibility(
  id: string,
  patch: Partial<AdminFinancialVisibilitySource>,
): Promise<void> {
  const { error } = await (supabase as any)
    .from("financial_visibility_sources").update(patch).eq("id", id);
  if (error) throw error;
}

export async function adminArchiveFinancialVisibility(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from("financial_visibility_sources")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function getClientFinancialVisibility(
  customerId: string,
): Promise<ClientFinancialVisibilitySource[]> {
  const { data, error } = await (supabase as any).rpc(
    "get_client_financial_visibility_sources",
    { _customer_id: customerId },
  );
  if (error) throw error;
  return (data ?? []) as ClientFinancialVisibilitySource[];
}
