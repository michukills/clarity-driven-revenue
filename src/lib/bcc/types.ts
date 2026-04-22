export type RevenueStatus = "collected" | "pending" | "overdue";
export type RevenueType = "one_time" | "recurring";
export type ExpenseType = "fixed" | "variable";
export type PaymentStatus = "paid" | "pending" | "overdue";
export type LaborType = "employee" | "contractor" | "owner_draw";
export type BillableStatus = "billable" | "non_billable" | "mixed";
export type InvoiceStatus = "draft" | "sent" | "partially_paid" | "paid" | "overdue" | "written_off";
export type CashDirection = "cash_in" | "cash_out";
export type CashKind = "expected" | "actual";
export type GoalType =
  | "revenue"
  | "profit_margin"
  | "cash_flow"
  | "payroll_ratio"
  | "expense_ratio"
  | "receivables"
  | "custom";

export interface RevenueEntry {
  id: string;
  customer_id: string;
  period_id: string | null;
  entry_date: string;
  amount: number;
  service_category: string | null;
  client_or_job: string | null;
  revenue_type: RevenueType;
  status: RevenueStatus;
  source_channel: string | null;
  notes: string | null;
}

export interface ExpenseEntry {
  id: string;
  customer_id: string;
  period_id: string | null;
  entry_date: string;
  amount: number;
  category_id: string | null;
  vendor: string | null;
  expense_type: ExpenseType;
  payment_status: PaymentStatus;
  notes: string | null;
  category_name?: string | null;
}

export interface PayrollEntry {
  id: string;
  customer_id: string;
  period_id: string | null;
  pay_period_start: string | null;
  pay_period_end: string | null;
  person_name: string | null;
  role: string | null;
  gross_pay: number;
  payroll_taxes_fees: number;
  total_payroll_cost: number;
  hours_worked: number | null;
  labor_type: LaborType;
  notes: string | null;
}

export interface LaborEntry {
  id: string;
  customer_id: string;
  period_id: string | null;
  entry_date: string;
  person_name: string | null;
  role: string | null;
  job_or_project: string | null;
  service_category: string | null;
  hours_worked: number | null;
  labor_cost: number;
  billable_status: BillableStatus;
  notes: string | null;
}

export interface InvoiceEntry {
  id: string;
  customer_id: string;
  period_id: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
  due_date: string | null;
  client_or_job: string | null;
  amount: number;
  amount_collected: number;
  status: InvoiceStatus;
  notes: string | null;
}

export interface CashFlowEntry {
  id: string;
  customer_id: string;
  period_id: string | null;
  entry_date: string;
  amount: number;
  direction: CashDirection;
  category: string | null;
  description: string | null;
  expected_or_actual: CashKind;
  notes: string | null;
}

export interface BusinessGoal {
  id: string;
  customer_id: string;
  period_id: string | null;
  goal_type: GoalType;
  target_value: number | null;
  current_value: number | null;
  goal_label: string | null;
  status: "on_track" | "at_risk" | "missed" | "achieved";
  notes: string | null;
}

export interface FinancialPeriod {
  id: string;
  customer_id: string;
  period_start: string;
  period_end: string;
  period_label: string | null;
  status: "draft" | "submitted" | "reviewed" | "locked";
}

export interface BccDataset {
  revenue: RevenueEntry[];
  expenses: ExpenseEntry[];
  payroll: PayrollEntry[];
  labor: LaborEntry[];
  invoices: InvoiceEntry[];
  cashflow: CashFlowEntry[];
  goals: BusinessGoal[];
  weekly_checkins?: WeeklyCheckin[];
}

export interface WeeklyCheckin {
  id: string;
  customer_id: string;
  week_start: string;
  week_end: string;
  period_label: string | null;
  source_systems: string[];
  data_quality: string | null;

  revenue_by_service: { label: string; amount: number }[];
  revenue_by_channel: Record<string, number>;
  top_clients: { label: string; amount: number }[];
  lost_revenue: number | null;
  lost_revenue_notes: string | null;

  best_quality_lead_source: string | null;
  highest_volume_lead_source: string | null;
  quote_to_close_notes: string | null;
  lost_deal_reasons: string[];
  estimated_close_date: string | null;
  pipeline_confidence: string | null;

  expense_breakdown: Record<string, number>;
  vendor_concentration_note: string | null;
  discretionary_estimate: number | null;
  required_estimate: number | null;
  unusual_expense_explanation: string | null;

  billable_hours: number | null;
  non_billable_hours: number | null;
  utilization_pct: number | null;
  owner_hours: number | null;
  owner_only_decisions: string | null;
  delegatable_work: string | null;
  capacity_status: string | null;

  ar_0_30: number | null;
  ar_31_60: number | null;
  ar_61_90: number | null;
  ar_90_plus: number | null;
  obligations_next_7: number | null;
  obligations_next_30: number | null;
  expected_inflows_next_30: number | null;
  cash_concern_level: string | null;

  process_blocker: string | null;
  people_blocker: string | null;
  sales_blocker: string | null;
  cash_blocker: string | null;
  owner_bottleneck: string | null;
  repeated_issue: boolean;
  request_rgs_review: boolean;

  created_at: string;
}