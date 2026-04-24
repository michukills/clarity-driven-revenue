import { useMemo, useState } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Calendar,
  TrendingUp,
  Receipt,
  Users,
  Banknote,
  Activity,
  Target,
  HelpCircle,
  Database,
  Info,
  Check,
  ChevronDown,
  Plus as PlusIcon,
  Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SourceReadinessPanel } from "./SourceReadinessPanel";
import { Link } from "react-router-dom";

/* ============================================================================
   WeeklyCheckIn — guided weekly business check-in (P2)

   Replaces the old single-screen "Add weekly entry" form with a calm,
   sectioned stepper. The form is positioned as a weekly check-in summary —
   the client pulls weekly totals from QuickBooks / payroll / bank / invoice
   software and enters them once. All data is written to the existing tables
   (revenue_entries, expense_entries, payroll_entries, invoice_entries,
   cash_flow_entries, business_goals). Sales pipeline + business pressure
   context is embedded as a structured marker in notes — no new tables.
   ========================================================================= */

type Step =
  | "week"
  | "revenue"
  | "expenses"
  | "payroll"
  | "cash"
  | "pipeline"
  | "pressure"
  | "goals"
  | "review";

const STEPS: { key: Step; label: string; short: string; icon: any }[] = [
  { key: "week", label: "Week & Source Systems", short: "Week", icon: Calendar },
  { key: "revenue", label: "Revenue Summary", short: "Revenue", icon: TrendingUp },
  { key: "expenses", label: "Expenses Summary", short: "Expenses", icon: Receipt },
  { key: "payroll", label: "Payroll & Labor", short: "Labor", icon: Users },
  { key: "cash", label: "Cash & Receivables", short: "Cash", icon: Banknote },
  { key: "pipeline", label: "Sales / Pipeline Snapshot", short: "Pipeline", icon: Activity },
  { key: "pressure", label: "Business Pressure Check", short: "Pressure", icon: HelpCircle },
  { key: "goals", label: "Goals & Targets", short: "Goals", icon: Target },
  { key: "review", label: "Review & Save", short: "Review", icon: Check },
];

const SOURCE_SYSTEM_OPTIONS = [
  "QuickBooks",
  "Payroll software",
  "Bank account / bank report",
  "Invoice software",
  "CRM / sales pipeline",
  "Spreadsheet",
  "Other",
];

const PRESSURE_OPTIONS = [
  "Not enough leads",
  "Leads not converting",
  "Revenue not collected",
  "Expenses too high",
  "Payroll/labor too high",
  "Cash tight",
  "Owner overloaded",
  "Delivery/capacity issue",
  "Other",
];

const CHANNEL_KEYS: { k: string; label: string }[] = [
  { k: "referral", label: "Referral" },
  { k: "repeat", label: "Repeat customer" },
  { k: "organic", label: "Organic" },
  { k: "paid", label: "Paid" },
  { k: "outbound", label: "Outbound" },
  { k: "walk_in", label: "Walk-in / local" },
  { k: "other", label: "Other" },
];

const LOST_REASONS: { k: string; label: string }[] = [
  { k: "price", label: "Price" },
  { k: "timing", label: "Timing" },
  { k: "no_response", label: "No response" },
  { k: "competitor", label: "Lost to competitor" },
  { k: "not_a_fit", label: "Not a fit" },
  { k: "capacity", label: "Capacity issue" },
  { k: "other", label: "Other" },
];

const EXPENSE_BUCKETS: { k: string; label: string }[] = [
  { k: "materials", label: "Materials / COGS" },
  { k: "payroll", label: "Payroll / labor" },
  { k: "rent", label: "Rent / facility" },
  { k: "software", label: "Software" },
  { k: "marketing", label: "Marketing" },
  { k: "vehicle", label: "Vehicle / equipment" },
  { k: "insurance", label: "Insurance" },
  { k: "debt", label: "Debt / financing" },
  { k: "owner_draw", label: "Owner draw" },
  { k: "other", label: "Other" },
];

const today = () => new Date().toISOString().slice(0, 10);
const lastSunday = () => {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay() - 7);
  return d.toISOString().slice(0, 10);
};
const lastSaturday = () => {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay() - 1);
  return d.toISOString().slice(0, 10);
};

type Form = {
  week_start: string;
  week_end: string;
  period_label: string;
  source_systems: string[];
  other_source_detail: string;
  data_quality: "complete" | "mostly" | "partial" | "unsure" | "";

  // Revenue
  rev_collected: string;
  rev_invoiced: string;
  rev_pending: string;
  rev_overdue: string;
  rev_recurring: string;
  rev_one_time: string;
  rev_new_customer: string;
  rev_returning: string;
  rev_top_service: string;
  rev_top_client: string;
  rev_notes: string;

  // Expenses
  exp_total: string;
  exp_recurring: string;
  exp_one_time: string;
  exp_top_category: string;
  exp_top_vendor: string;
  exp_unusual: "yes" | "no" | "";
  exp_notes: string;

  // Payroll
  pay_total: string;
  pay_owner_included: "yes" | "no" | "";
  pay_total_hours: string;
  pay_billable_hours: string;
  pay_overtime: string;
  pay_subcontractor: string;
  pay_notes: string;

  // Cash
  cash_in: string;
  cash_out: string;
  cash_on_hand: string;
  ar_outstanding: string;
  ar_overdue: string;
  cash_in_next7: string;
  cash_out_next7: string;
  cash_notes: string;

  // Pipeline
  pipe_new_leads: string;
  pipe_quotes_sent: string;
  pipe_quotes_accepted: string;
  pipe_lost: string;
  pipe_open_value: string;
  pipe_lost_reason: string;
  pipe_notes: string;

  // Pressure
  pressure_main_issue: string;
  pressure_concern_level: string; // 1-5
  pressure_attention_first: string;
  pressure_decision: string;

  // Goals
  goal_revenue_weekly: string;
  goal_expense_limit: string;
  goal_labor: string;
  goal_cash_reserve: string;
  goal_primary: string;

  // ===== Advanced (P3) — all optional =====
  // Revenue advanced
  adv_rev_by_service: { label: string; amount: string }[];
  adv_rev_channel: Record<string, string>;
  adv_top_clients: { label: string; amount: string }[];
  adv_lost_revenue: string;
  adv_lost_revenue_notes: string;

  // Pipeline advanced
  adv_best_quality_source: string;
  adv_highest_volume_source: string;
  adv_quote_close_notes: string;
  adv_lost_reasons: string[];
  adv_estimated_close_date: string;
  adv_pipeline_confidence: "low" | "medium" | "high" | "";

  // Expense advanced
  adv_exp_breakdown: Record<string, string>;
  adv_vendor_concentration: string;
  adv_discretionary: string;
  adv_required: string;
  adv_unusual_explanation: string;

  // Payroll advanced
  adv_billable_hours: string;
  adv_non_billable_hours: string;
  adv_utilization: string;
  adv_owner_hours: string;
  adv_owner_only_decisions: string;
  adv_delegatable_work: string;
  adv_capacity: "under" | "healthy" | "near" | "over" | "";

  // Cash advanced
  adv_ar_0_30: string;
  adv_ar_31_60: string;
  adv_ar_61_90: string;
  adv_ar_90_plus: string;
  adv_obligations_7: string;
  adv_obligations_30: string;
  adv_expected_inflows_30: string;
  adv_cash_concern: "low" | "watch" | "critical" | "";

  // Pressure advanced
  adv_process_blocker: string;
  adv_people_blocker: string;
  adv_sales_blocker: string;
  adv_cash_blocker: string;
  adv_owner_bottleneck: string;
  adv_repeated_issue: boolean;
  adv_request_rgs_review: boolean;
};

const blank: Form = {
  week_start: lastSunday(),
  week_end: lastSaturday(),
  period_label: "",
  source_systems: [],
  other_source_detail: "",
  data_quality: "",
  rev_collected: "", rev_invoiced: "", rev_pending: "", rev_overdue: "",
  rev_recurring: "", rev_one_time: "", rev_new_customer: "", rev_returning: "",
  rev_top_service: "", rev_top_client: "", rev_notes: "",
  exp_total: "", exp_recurring: "", exp_one_time: "",
  exp_top_category: "", exp_top_vendor: "", exp_unusual: "", exp_notes: "",
  pay_total: "", pay_owner_included: "", pay_total_hours: "",
  pay_billable_hours: "", pay_overtime: "", pay_subcontractor: "", pay_notes: "",
  cash_in: "", cash_out: "", cash_on_hand: "", ar_outstanding: "", ar_overdue: "",
  cash_in_next7: "", cash_out_next7: "", cash_notes: "",
  pipe_new_leads: "", pipe_quotes_sent: "", pipe_quotes_accepted: "",
  pipe_lost: "", pipe_open_value: "", pipe_lost_reason: "", pipe_notes: "",
  pressure_main_issue: "", pressure_concern_level: "", pressure_attention_first: "", pressure_decision: "",
  goal_revenue_weekly: "", goal_expense_limit: "", goal_labor: "",
  goal_cash_reserve: "", goal_primary: "",

  adv_rev_by_service: [],
  adv_rev_channel: {},
  adv_top_clients: [],
  adv_lost_revenue: "",
  adv_lost_revenue_notes: "",

  adv_best_quality_source: "",
  adv_highest_volume_source: "",
  adv_quote_close_notes: "",
  adv_lost_reasons: [],
  adv_estimated_close_date: "",
  adv_pipeline_confidence: "",

  adv_exp_breakdown: {},
  adv_vendor_concentration: "",
  adv_discretionary: "",
  adv_required: "",
  adv_unusual_explanation: "",

  adv_billable_hours: "",
  adv_non_billable_hours: "",
  adv_utilization: "",
  adv_owner_hours: "",
  adv_owner_only_decisions: "",
  adv_delegatable_work: "",
  adv_capacity: "",

  adv_ar_0_30: "",
  adv_ar_31_60: "",
  adv_ar_61_90: "",
  adv_ar_90_plus: "",
  adv_obligations_7: "",
  adv_obligations_30: "",
  adv_expected_inflows_30: "",
  adv_cash_concern: "",

  adv_process_blocker: "",
  adv_people_blocker: "",
  adv_sales_blocker: "",
  adv_cash_blocker: "",
  adv_owner_bottleneck: "",
  adv_repeated_issue: false,
  adv_request_rgs_review: false,
};

const num = (s: string) => (s === "" ? 0 : Number(s) || 0);

export function WeeklyCheckIn({
  customerId,
  canSave,
  mode = "weekly",
  onClose,
  onSaved,
}: {
  customerId: string | null;
  canSave: boolean;
  mode?: "weekly" | "monthly";
  onClose: () => void;
  onSaved: () => void;
}) {
  const [step, setStep] = useState<Step>("week");
  const [f, setF] = useState<Form>(blank);
  const [busy, setBusy] = useState(false);
  const isMonthly = mode === "monthly";
  const stepOneShort = isMonthly ? "Period" : "Week";
  const stepOneLabel = isMonthly ? "Month & Source Systems" : "Week & Source Systems";

  const stepIndex = STEPS.findIndex((s) => s.key === step);
  const isLast = step === "review";
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((p) => ({ ...p, [k]: v }));

  const toggleSource = (s: string) => {
    setF((p) => ({
      ...p,
      source_systems: p.source_systems.includes(s)
        ? p.source_systems.filter((x) => x !== s)
        : [...p.source_systems, s],
      other_source_detail:
        s === "Other" && p.source_systems.includes(s)
          ? ""
          : p.other_source_detail,
    }));
  };

  const otherSelected = f.source_systems.includes("Other");
  const otherDetailMissing =
    otherSelected && !f.other_source_detail.trim();

  const goNext = () => {
    if (step === "week" && otherDetailMissing) {
      toast.error("Please enter the source used for Other.");
      return;
    }
    const idx = STEPS.findIndex((s) => s.key === step);
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1].key);
  };
  const goPrev = () => {
    const idx = STEPS.findIndex((s) => s.key === step);
    if (idx > 0) setStep(STEPS[idx - 1].key);
  };

  const summary = useMemo(() => buildSummary(f), [f]);

  const handleSave = async () => {
    if (!canSave || !customerId) {
      toast.info("Live saving will be activated by your RGS team.");
      onClose();
      return;
    }
    if (otherSelected && !f.other_source_detail.trim()) {
      toast.error("Please enter the source used for Other.");
      setStep("week");
      return;
    }
    setBusy(true);
    const week = f.week_end || today();

    // Encode source systems + pressure + pipeline as a structured marker
    // appended to the first revenue notes (kept inside notes columns — no schema change).
    const meta = {
      v: 1,
      period_label: f.period_label || null,
      sources: f.source_systems,
      other_source_detail:
        otherSelected && f.other_source_detail.trim()
          ? f.other_source_detail.trim()
          : null,
      data_quality: f.data_quality || null,
      pipeline: {
        new_leads: num(f.pipe_new_leads),
        quotes_sent: num(f.pipe_quotes_sent),
        quotes_accepted: num(f.pipe_quotes_accepted),
        lost: num(f.pipe_lost),
        open_value: num(f.pipe_open_value),
        lost_reason: f.pipe_lost_reason || null,
        notes: f.pipe_notes || null,
      },
      pressure: {
        main_issue: f.pressure_main_issue || null,
        concern: num(f.pressure_concern_level) || null,
        attention_first: f.pressure_attention_first || null,
        decision: f.pressure_decision || null,
      },
      labor_extras: {
        owner_included: f.pay_owner_included || null,
        total_hours: num(f.pay_total_hours) || null,
        billable_hours: num(f.pay_billable_hours) || null,
        overtime: num(f.pay_overtime) || null,
        subcontractor: num(f.pay_subcontractor) || null,
        notes: f.pay_notes || null,
      },
      cash_extras: {
        on_hand: num(f.cash_on_hand) || null,
        in_next7: num(f.cash_in_next7) || null,
        out_next7: num(f.cash_out_next7) || null,
        notes: f.cash_notes || null,
      },
      revenue_extras: {
        invoiced: num(f.rev_invoiced) || null,
        new_customer: num(f.rev_new_customer) || null,
        returning_customer: num(f.rev_returning) || null,
        notes: f.rev_notes || null,
      },
      expense_extras: {
        unusual: f.exp_unusual || null,
        top_vendor: f.exp_top_vendor || null,
        notes: f.exp_notes || null,
      },
    };
    const metaTag = `[[RGS_META:${JSON.stringify(meta)}]]`;

    try {
      const tasks: any[] = [];

      // ===== Revenue =====
      // Avoid double-counting: if recurring + one_time provided, those become the
      // collected breakdown. Otherwise total collected becomes a single one_time row.
      const revRows: any[] = [];
      const recurring = num(f.rev_recurring);
      const oneTime = num(f.rev_one_time);
      const collected = num(f.rev_collected);
      const breakdownTotal = recurring + oneTime;

      if (breakdownTotal > 0) {
        if (recurring > 0) {
          revRows.push(rev(customerId, week, recurring, "collected", "recurring", f, metaTag));
        }
        if (oneTime > 0) {
          revRows.push(rev(customerId, week, oneTime, "collected", "one_time", f, ""));
        }
        // If a separate "collected total" was entered AND it's larger, capture remainder
        if (collected > breakdownTotal) {
          revRows.push(rev(customerId, week, collected - breakdownTotal, "collected", "one_time", f, ""));
        }
      } else if (collected > 0) {
        revRows.push(rev(customerId, week, collected, "collected", "one_time", f, metaTag));
      } else {
        // Make sure meta still gets persisted even if no revenue numbers entered
        revRows.push(rev(customerId, week, 0, "collected", "one_time", f, metaTag));
      }
      if (num(f.rev_pending) > 0) revRows.push(rev(customerId, week, num(f.rev_pending), "pending", "one_time", f, ""));
      if (num(f.rev_overdue) > 0) revRows.push(rev(customerId, week, num(f.rev_overdue), "overdue", "one_time", f, ""));
      tasks.push(supabase.from("revenue_entries").insert(revRows));

      // ===== Expenses =====
      // If recurring + one_time totals provided, those become the breakdown.
      // Otherwise total expenses becomes a single row.
      const expRows: any[] = [];
      const expRec = num(f.exp_recurring);
      const expOne = num(f.exp_one_time);
      const expTotal = num(f.exp_total);
      if (expRec > 0) expRows.push(exp(customerId, week, expRec, "fixed", f.exp_top_category || "Recurring", f.exp_top_vendor, f));
      if (expOne > 0) expRows.push(exp(customerId, week, expOne, "variable", f.exp_top_category || "One-time", f.exp_top_vendor, f));
      if (expRec === 0 && expOne === 0 && expTotal > 0) {
        expRows.push(exp(customerId, week, expTotal, "variable", f.exp_top_category || "General", f.exp_top_vendor, f));
      } else if (expTotal > 0 && expRec + expOne < expTotal) {
        // Capture remainder if recorded total exceeds breakdown
        expRows.push(exp(customerId, week, expTotal - (expRec + expOne), "variable", "Other", f.exp_top_vendor, f));
      }
      if (expRows.length) tasks.push(supabase.from("expense_entries").insert(expRows));

      // ===== Payroll / labor =====
      const payTotal = num(f.pay_total);
      const subContract = num(f.pay_subcontractor);
      if (payTotal > 0 || subContract > 0) {
        const payRows: any[] = [];
        if (payTotal > 0) {
          payRows.push({
            customer_id: customerId,
            pay_period_start: f.week_start,
            pay_period_end: f.week_end,
            person_name: "Team",
            labor_type: f.pay_owner_included === "yes" ? "owner_draw" : "employee",
            gross_pay: payTotal,
            payroll_taxes_fees: 0,
            total_payroll_cost: payTotal,
            hours_worked: num(f.pay_total_hours) || null,
            notes: f.pay_notes || null,
          });
        }
        if (subContract > 0) {
          payRows.push({
            customer_id: customerId,
            pay_period_start: f.week_start,
            pay_period_end: f.week_end,
            person_name: "Subcontractors",
            labor_type: "contractor",
            gross_pay: subContract,
            payroll_taxes_fees: 0,
            total_payroll_cost: subContract,
            hours_worked: null,
            notes: f.pay_notes || null,
          });
        }
        tasks.push(supabase.from("payroll_entries").insert(payRows));
      }

      // ===== Invoices / receivables =====
      // Persist invoiced (sent) vs collected as one row, and outstanding/overdue as marker rows.
      const invoiced = num(f.rev_invoiced);
      if (invoiced > 0) {
        tasks.push(supabase.from("invoice_entries").insert({
          customer_id: customerId,
          invoice_date: week,
          due_date: week,
          client_or_job: f.rev_top_client || null,
          amount: invoiced,
          amount_collected: Math.min(num(f.rev_collected), invoiced),
          status: num(f.rev_collected) >= invoiced ? "paid" : num(f.rev_collected) > 0 ? "partially_paid" : "sent",
          notes: f.rev_notes || null,
        }));
      }
      if (num(f.ar_outstanding) > 0) {
        tasks.push(supabase.from("invoice_entries").insert({
          customer_id: customerId,
          invoice_date: week,
          due_date: week,
          client_or_job: "Outstanding receivables",
          amount: num(f.ar_outstanding),
          amount_collected: 0,
          status: "sent",
          notes: f.cash_notes || null,
        }));
      }
      if (num(f.ar_overdue) > 0) {
        tasks.push(supabase.from("invoice_entries").insert({
          customer_id: customerId,
          invoice_date: week,
          due_date: week,
          client_or_job: "Overdue receivables",
          amount: num(f.ar_overdue),
          amount_collected: 0,
          status: "overdue",
          notes: f.cash_notes || null,
        }));
      }

      // ===== Cash flow =====
      const cashRows: any[] = [];
      if (num(f.cash_in) > 0)
        cashRows.push({ customer_id: customerId, entry_date: week, amount: num(f.cash_in), direction: "cash_in", expected_or_actual: "actual", description: "Cash in this week", notes: f.cash_notes || null });
      if (num(f.cash_out) > 0)
        cashRows.push({ customer_id: customerId, entry_date: week, amount: num(f.cash_out), direction: "cash_out", expected_or_actual: "actual", description: "Cash out this week", notes: f.cash_notes || null });
      if (num(f.cash_in_next7) > 0)
        cashRows.push({ customer_id: customerId, entry_date: week, amount: num(f.cash_in_next7), direction: "cash_in", expected_or_actual: "expected", description: "Expected cash inflow (next 7 days)" });
      if (num(f.cash_out_next7) > 0)
        cashRows.push({ customer_id: customerId, entry_date: week, amount: num(f.cash_out_next7), direction: "cash_out", expected_or_actual: "expected", description: "Expected cash outflow (next 7 days)" });
      if (cashRows.length) tasks.push(supabase.from("cash_flow_entries").insert(cashRows));

      // ===== Goals =====
      const goalRows: any[] = [];
      if (num(f.goal_revenue_weekly) > 0)
        goalRows.push({ customer_id: customerId, goal_type: "revenue", target_value: num(f.goal_revenue_weekly), goal_label: "Weekly revenue goal", status: "on_track" });
      if (num(f.goal_expense_limit) > 0)
        goalRows.push({ customer_id: customerId, goal_type: "expense_ratio", target_value: num(f.goal_expense_limit), goal_label: "Weekly expense limit", status: "on_track" });
      if (num(f.goal_labor) > 0)
        goalRows.push({ customer_id: customerId, goal_type: "payroll_ratio", target_value: num(f.goal_labor), goal_label: "Payroll / labor target", status: "on_track" });
      if (num(f.goal_cash_reserve) > 0)
        goalRows.push({ customer_id: customerId, goal_type: "cash_flow", target_value: num(f.goal_cash_reserve), goal_label: "Cash reserve target", status: "on_track" });
      if (f.goal_primary)
        goalRows.push({ customer_id: customerId, goal_type: "custom", target_value: null, goal_label: f.goal_primary, status: "on_track" });
      if (goalRows.length) tasks.push(supabase.from("business_goals").insert(goalRows));

      // ===== Weekly check-in (P3 advanced storage) =====
      const numOrNull = (s: string) => (s === "" || s == null ? null : Number(s));
      const channelObj: Record<string, number> = {};
      Object.entries(f.adv_rev_channel).forEach(([k, v]) => {
        const n = numOrNull(v);
        if (n != null && !Number.isNaN(n)) channelObj[k] = n;
      });
      const expBreakObj: Record<string, number> = {};
      Object.entries(f.adv_exp_breakdown).forEach(([k, v]) => {
        const n = numOrNull(v);
        if (n != null && !Number.isNaN(n)) expBreakObj[k] = n;
      });
      const checkinRow = {
        customer_id: customerId,
        week_start: f.week_start,
        week_end: f.week_end,
        period_label: f.period_label || null,
        source_systems: f.source_systems,
        other_source_detail:
          otherSelected && f.other_source_detail.trim()
            ? f.other_source_detail.trim()
            : null,
        data_quality: f.data_quality || null,

        revenue_by_service: f.adv_rev_by_service
          .filter((r) => r.label || r.amount)
          .map((r) => ({ label: r.label || "", amount: Number(r.amount) || 0 })),
        revenue_by_channel: channelObj,
        top_clients: f.adv_top_clients
          .filter((r) => r.label || r.amount)
          .map((r) => ({ label: r.label || "", amount: Number(r.amount) || 0 })),
        lost_revenue: numOrNull(f.adv_lost_revenue),
        lost_revenue_notes: f.adv_lost_revenue_notes || null,

        best_quality_lead_source: f.adv_best_quality_source || null,
        highest_volume_lead_source: f.adv_highest_volume_source || null,
        quote_to_close_notes: f.adv_quote_close_notes || null,
        lost_deal_reasons: f.adv_lost_reasons,
        estimated_close_date: f.adv_estimated_close_date || null,
        pipeline_confidence: f.adv_pipeline_confidence || null,

        expense_breakdown: expBreakObj,
        vendor_concentration_note: f.adv_vendor_concentration || null,
        discretionary_estimate: numOrNull(f.adv_discretionary),
        required_estimate: numOrNull(f.adv_required),
        unusual_expense_explanation: f.adv_unusual_explanation || null,

        billable_hours: numOrNull(f.adv_billable_hours),
        non_billable_hours: numOrNull(f.adv_non_billable_hours),
        utilization_pct: numOrNull(f.adv_utilization),
        owner_hours: numOrNull(f.adv_owner_hours),
        owner_only_decisions: f.adv_owner_only_decisions || null,
        delegatable_work: f.adv_delegatable_work || null,
        capacity_status: f.adv_capacity || null,

        ar_0_30: numOrNull(f.adv_ar_0_30),
        ar_31_60: numOrNull(f.adv_ar_31_60),
        ar_61_90: numOrNull(f.adv_ar_61_90),
        ar_90_plus: numOrNull(f.adv_ar_90_plus),
        obligations_next_7: numOrNull(f.adv_obligations_7),
        obligations_next_30: numOrNull(f.adv_obligations_30),
        expected_inflows_next_30: numOrNull(f.adv_expected_inflows_30),
        cash_concern_level: f.adv_cash_concern || null,

        process_blocker: f.adv_process_blocker || null,
        people_blocker: f.adv_people_blocker || null,
        sales_blocker: f.adv_sales_blocker || null,
        cash_blocker: f.adv_cash_blocker || null,
        owner_bottleneck: f.adv_owner_bottleneck || null,
        repeated_issue: !!f.adv_repeated_issue,
        request_rgs_review: !!f.adv_request_rgs_review,
      };
      // Upsert on (customer_id, week_end): saving the same week updates
      // the existing summary instead of creating a duplicate trend row.
      tasks.push(
        supabase
          .from("weekly_checkins")
          .upsert(checkinRow, { onConflict: "customer_id,week_end" }),
      );

      const results = await Promise.all(tasks);
      const firstError = results.find((r: any) => r?.error);
      if (firstError?.error) {
        toast.error("Some parts of the entry could not be saved.");
        console.error(firstError.error);
      } else {
        toast.success("Weekly check-in saved.");
        // P10.2d — Emit insight signals (best-effort, never blocks save).
        try {
          const { emitWeeklyCheckinSignals } = await import(
            "@/lib/diagnostics/signalEmitters"
          );
          await emitWeeklyCheckinSignals({
            customerId: checkinRow.customer_id,
            weekEnd: checkinRow.week_end,
            cashConcern: checkinRow.cash_concern_level,
            pipelineConfidence: checkinRow.pipeline_confidence,
            dataQuality: checkinRow.data_quality,
            repeatedIssue: checkinRow.repeated_issue,
            requestRgsReview: checkinRow.request_rgs_review,
            processBlocker: checkinRow.process_blocker,
            peopleBlocker: checkinRow.people_blocker,
            salesBlocker: checkinRow.sales_blocker,
            cashBlocker: checkinRow.cash_blocker,
            ownerBottleneck: checkinRow.owner_bottleneck,
          });
        } catch {
          /* swallow */
        }
        onSaved();
        return;
      }
    } catch (e: any) {
      toast.error("Could not save weekly check-in.");
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm overflow-y-auto" onClick={onClose}>
      <div className="min-h-screen flex items-start justify-center p-4 sm:p-8" onClick={(e) => e.stopPropagation()}>
        <div className="w-full max-w-3xl bg-card border border-border rounded-xl shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-border">
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-primary/70">
                {isMonthly ? "Monthly baseline" : "Weekly check-in"}
              </div>
              <h3 className="text-lg font-light text-foreground mt-0.5">
                {step === "week" ? stepOneLabel : STEPS[stepIndex].label}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-1">
                {isMonthly
                  ? "Set the baseline period and choose where the numbers came from. RGS turns these into your control baseline."
                  : "Pull the totals from QuickBooks, payroll, your bank report, and invoice software once per week. RGS turns those numbers into business control insight."}
              </p>
            </div>
            <button onClick={onClose} className="p-1 rounded-md hover:bg-muted/50 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          {!canSave && (
            <div className="px-5 pt-4">
              <Banner tone="info">
                Live saving will be activated by your RGS team. You can still walk through the check-in to preview the structure — values won't persist yet.
              </Banner>
            </div>
          )}

          {/* Stepper */}
          <div className="px-5 pt-4">
            <ol className="flex flex-wrap items-center gap-1.5 text-[10px] uppercase tracking-wider">
              {STEPS.map((s, i) => {
                const active = s.key === step;
                const done = i < stepIndex;
                const shortLabel = s.key === "week" ? stepOneShort : s.short;
                return (
                  <li key={s.key}>
                    <button
                      onClick={() => setStep(s.key)}
                      className={`px-2 h-6 rounded-md border transition-colors ${
                        active
                          ? "border-primary/50 bg-primary/10 text-foreground"
                          : done
                          ? "border-emerald-500/30 text-emerald-300/90 hover:bg-emerald-500/10"
                          : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {i + 1}. {shortLabel}
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>

          {/* Body */}
          <div className="p-5 space-y-5">
            {step === "week" && (
              <StepWeek f={f} set={set} toggleSource={toggleSource} customerId={customerId} isMonthly={isMonthly} />
            )}
            {step === "revenue" && <StepRevenue f={f} set={set} />}
            {step === "expenses" && <StepExpenses f={f} set={set} />}
            {step === "payroll" && <StepPayroll f={f} set={set} />}
            {step === "cash" && <StepCash f={f} set={set} />}
            {step === "pipeline" && <StepPipeline f={f} set={set} />}
            {step === "pressure" && <StepPressure f={f} set={set} />}
            {step === "goals" && <StepGoals f={f} set={set} />}
            {step === "review" && <StepReview f={f} summary={summary} />}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-2 p-5 border-t border-border">
            <button
              onClick={goPrev}
              disabled={stepIndex === 0}
              className="inline-flex items-center gap-1 h-9 px-3 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground disabled:opacity-30"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Back
            </button>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Step {stepIndex + 1} of {STEPS.length}
            </div>
            {isLast ? (
              <button
                onClick={handleSave}
                disabled={busy}
                className="inline-flex items-center gap-1 h-9 px-4 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50 shadow-sm"
              >
                {busy
                  ? "Saving…"
                  : canSave
                  ? isMonthly ? "Save monthly baseline" : "Save weekly entry"
                  : "Close (preview only)"}
              </button>
            ) : (
              <button
                onClick={goNext}
                className="inline-flex items-center gap-1 h-9 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 shadow-sm"
              >
                Continue <ChevronRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================ Step renderers ============================ */

function StepWeek({
  f,
  set,
  toggleSource,
  customerId,
  isMonthly,
}: {
  f: Form;
  set: any;
  toggleSource: (s: string) => void;
  customerId: string | null;
  isMonthly?: boolean;
}) {
  return (
    <>
      <Helper>
        {isMonthly
          ? "Tell RGS what month you're setting a baseline for, and which systems the numbers came from. This helps the report flag when something might be missing."
          : "Tell RGS what week you're reporting on, and which systems your numbers came from. This helps the report flag when something might be missing."}
      </Helper>
      <Grid>
        <Field label={isMonthly ? "Month start" : "Week start"}>
          <DateInput value={f.week_start} onChange={(v) => set("week_start", v)} />
        </Field>
        <Field label={isMonthly ? "Month ending" : "Week ending"}>
          <DateInput value={f.week_end} onChange={(v) => set("week_end", v)} />
        </Field>
        <Field
          label={isMonthly ? "Reporting month label" : "Reporting period label"}
          hint={isMonthly ? "e.g. 'April 2026' or 'April baseline'" : "e.g. 'Week of Apr 14' or 'Late April'"}
        >
          <TextInput value={f.period_label} onChange={(v) => set("period_label", v)} placeholder="Optional" />
        </Field>
      </Grid>

      {/* Compact, always-visible source setup callout (P13.RCC.H.2). */}
      <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="text-xs font-medium text-foreground">Want to reduce manual entry?</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Connect QuickBooks or request setup for your other systems. Manual entry below still works.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              to="/portal/connected-sources"
              className="inline-flex items-center gap-1 h-8 px-3 rounded-md border border-primary/40 bg-primary/10 text-[11px] text-foreground hover:bg-primary/20"
            >
              Connect QuickBooks · Open Connected Sources
            </Link>
            <Link
              to="/portal/imports"
              className="inline-flex items-center gap-1 h-8 px-3 rounded-md border border-border text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/40"
            >
              Upload / import spreadsheet
            </Link>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground italic">
          Only QuickBooks has live-sync today. Other systems use RGS setup requests.
        </p>
      </div>

      <SubLabel>{isMonthly ? "Source systems used this month" : "Source systems used this week"}</SubLabel>
      <Helper>Check every place these numbers came from. Leave unchecked if you didn't use it.</Helper>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {SOURCE_SYSTEM_OPTIONS.map((s) => {
          const active = f.source_systems.includes(s);
          return (
            <button
              key={s}
              type="button"
              onClick={() => toggleSource(s)}
              className={`text-left text-xs px-3 h-9 rounded-md border transition-colors ${
                active ? "border-primary/50 bg-primary/10 text-foreground" : "border-border bg-muted/20 text-muted-foreground hover:text-foreground"
              }`}
            >
              {s}
            </button>
          );
        })}
      </div>

      <SourceReadinessPanel
        customerId={customerId}
        selectedSourceLabels={f.source_systems}
      />

      {f.source_systems.includes("Other") && (
        <div className="space-y-1">
          <SubLabel>Other source</SubLabel>
          <TextInput
            value={f.other_source_detail}
            onChange={(v) => set("other_source_detail", v)}
            placeholder="Enter the system, report, spreadsheet, or source used"
          />
          <Helper>
            Required when Other is selected. RGS needs to know where the numbers came from.
          </Helper>
          {!f.other_source_detail.trim() && (
            <p className="text-[11px] text-amber-300/90">
              Please enter the source used for Other.
            </p>
          )}
        </div>
      )}

      <SubLabel>How complete is the source data?</SubLabel>
      <ChoiceRow
        value={f.data_quality}
        onChange={(v) => set("data_quality", v as any)}
        options={[
          { v: "complete", label: "Complete" },
          { v: "mostly", label: "Mostly complete" },
          { v: "partial", label: "Partial / estimated" },
          { v: "unsure", label: "Unsure" },
        ]}
      />
    </>
  );
}

function StepRevenue({ f, set }: { f: Form; set: any }) {
  const updateService = (i: number, field: "label" | "amount", v: string) => {
    const next = [...f.adv_rev_by_service];
    next[i] = { ...next[i], [field]: v };
    set("adv_rev_by_service", next);
  };
  const updateClient = (i: number, field: "label" | "amount", v: string) => {
    const next = [...f.adv_top_clients];
    next[i] = { ...next[i], [field]: v };
    set("adv_top_clients", next);
  };
  const concentration = (() => {
    const total = f.adv_top_clients.reduce((a, c) => a + (Number(c.amount) || 0), 0);
    const collected = Number(f.rev_collected) || 0;
    if (!total || !collected) return null;
    const top = Math.max(...f.adv_top_clients.map((c) => Number(c.amount) || 0));
    return collected > 0 ? (top / collected) * 100 : null;
  })();
  return (
    <>
      <WhyMatters>Used to detect revenue stability, concentration risk, and collection gaps.</WhyMatters>
      <Helper>
        Use weekly totals from QuickBooks, your bank report, or your bookkeeping software.
        Don't enter individual transactions — just the rolled-up numbers for the week.
      </Helper>
      <Grid>
        <Field label="Revenue collected this week" hint="Money actually received."><MoneyInput value={f.rev_collected} onChange={(v) => set("rev_collected", v)} /></Field>
        <Field label="Revenue invoiced this week" hint="What you billed, not necessarily collected."><MoneyInput value={f.rev_invoiced} onChange={(v) => set("rev_invoiced", v)} /></Field>
        <Field label="Revenue still pending"><MoneyInput value={f.rev_pending} onChange={(v) => set("rev_pending", v)} /></Field>
        <Field label="Overdue revenue"><MoneyInput value={f.rev_overdue} onChange={(v) => set("rev_overdue", v)} /></Field>
      </Grid>

      <SubLabel>Optional breakdown of collected revenue</SubLabel>
      <Helper>Recurring + one-time should roughly equal collected. RGS uses this to assess stability.</Helper>
      <Grid>
        <Field label="Recurring revenue collected"><MoneyInput value={f.rev_recurring} onChange={(v) => set("rev_recurring", v)} /></Field>
        <Field label="One-time revenue collected"><MoneyInput value={f.rev_one_time} onChange={(v) => set("rev_one_time", v)} /></Field>
        <Field label="New customer revenue"><MoneyInput value={f.rev_new_customer} onChange={(v) => set("rev_new_customer", v)} /></Field>
        <Field label="Returning customer revenue"><MoneyInput value={f.rev_returning} onChange={(v) => set("rev_returning", v)} /></Field>
        <Field label="Top revenue source / service"><TextInput value={f.rev_top_service} onChange={(v) => set("rev_top_service", v)} placeholder="e.g. Maintenance contracts" /></Field>
        <Field label="Largest client or job"><TextInput value={f.rev_top_client} onChange={(v) => set("rev_top_client", v)} placeholder="e.g. Acme Corp" /></Field>
      </Grid>

      <Field label="Revenue notes"><TextArea value={f.rev_notes} onChange={(v) => set("rev_notes", v)} placeholder="Anything unusual about revenue this week?" /></Field>

      <Advanced label="Add detail — revenue mix & concentration">
        <SubLabel>Revenue by service line</SubLabel>
        <RowList
          items={f.adv_rev_by_service}
          onAdd={() => set("adv_rev_by_service", [...f.adv_rev_by_service, { label: "", amount: "" }])}
          onRemove={(i) => set("adv_rev_by_service", f.adv_rev_by_service.filter((_: any, idx: number) => idx !== i))}
          renderRow={(row: any, i: number) => (
            <>
              <TextInput value={row.label} onChange={(v) => updateService(i, "label", v)} placeholder="Service line (e.g. Installs)" />
              <MoneyInput value={row.amount} onChange={(v) => updateService(i, "amount", v)} />
            </>
          )}
          addLabel="Add service line"
        />

        <SubLabel>Revenue by channel / source</SubLabel>
        <Grid>
          {CHANNEL_KEYS.map((c) => (
            <Field key={c.k} label={c.label}>
              <MoneyInput value={f.adv_rev_channel[c.k] || ""} onChange={(v) => set("adv_rev_channel", { ...f.adv_rev_channel, [c.k]: v })} />
            </Field>
          ))}
        </Grid>

        <SubLabel>Top 3 clients / jobs by revenue this week</SubLabel>
        <RowList
          items={f.adv_top_clients}
          onAdd={() => f.adv_top_clients.length < 3 && set("adv_top_clients", [...f.adv_top_clients, { label: "", amount: "" }])}
          onRemove={(i) => set("adv_top_clients", f.adv_top_clients.filter((_: any, idx: number) => idx !== i))}
          renderRow={(row: any, i: number) => (
            <>
              <TextInput value={row.label} onChange={(v) => updateClient(i, "label", v)} placeholder="Client / job name" />
              <MoneyInput value={row.amount} onChange={(v) => updateClient(i, "amount", v)} />
            </>
          )}
          addLabel="Add client / job"
        />
        {concentration != null && concentration > 30 && (
          <Banner tone="info">
            Heads up — your top client/job is roughly {concentration.toFixed(0)}% of collected revenue this week. RGS will flag this as concentration risk.
          </Banner>
        )}

        <Grid>
          <Field label="Lost / churned revenue this week" hint="If a customer cancelled or a contract ended">
            <MoneyInput value={f.adv_lost_revenue} onChange={(v) => set("adv_lost_revenue", v)} />
          </Field>
          <Field label="Lost revenue notes">
            <TextInput value={f.adv_lost_revenue_notes} onChange={(v) => set("adv_lost_revenue_notes", v)} placeholder="What was lost and why?" />
          </Field>
        </Grid>
      </Advanced>
    </>
  );
}

function StepExpenses({ f, set }: { f: Form; set: any }) {
  return (
    <>
      <WhyMatters>Used to identify expense pressure and margin risk.</WhyMatters>
      <Helper>Pull the weekly total from your bank report or QuickBooks. Don't enter every transaction.</Helper>
      <Grid>
        <Field label="Total expenses paid this week"><MoneyInput value={f.exp_total} onChange={(v) => set("exp_total", v)} /></Field>
        <Field label="Recurring expenses" hint="Rent, software, subscriptions"><MoneyInput value={f.exp_recurring} onChange={(v) => set("exp_recurring", v)} /></Field>
        <Field label="One-time expenses" hint="Equipment, repairs, project costs"><MoneyInput value={f.exp_one_time} onChange={(v) => set("exp_one_time", v)} /></Field>
        <Field label="Largest expense category"><TextInput value={f.exp_top_category} onChange={(v) => set("exp_top_category", v)} placeholder="e.g. Materials" /></Field>
        <Field label="Largest vendor or expense item"><TextInput value={f.exp_top_vendor} onChange={(v) => set("exp_top_vendor", v)} placeholder="e.g. Home Depot" /></Field>
      </Grid>
      <SubLabel>Anything unusual?</SubLabel>
      <ChoiceRow
        value={f.exp_unusual}
        onChange={(v) => set("exp_unusual", v as any)}
        options={[{ v: "no", label: "No" }, { v: "yes", label: "Yes" }]}
      />
      <Field label="Expense notes"><TextArea value={f.exp_notes} onChange={(v) => set("exp_notes", v)} /></Field>

      <Advanced label="Add detail — expense breakdown & pressure">
        <SubLabel>Expense category breakdown</SubLabel>
        <Grid>
          {EXPENSE_BUCKETS.map((b) => (
            <Field key={b.k} label={b.label}>
              <MoneyInput value={f.adv_exp_breakdown[b.k] || ""} onChange={(v) => set("adv_exp_breakdown", { ...f.adv_exp_breakdown, [b.k]: v })} />
            </Field>
          ))}
        </Grid>

        <Grid>
          <Field label="Vendor concentration note" hint="Are too many dollars going to one vendor?">
            <TextInput value={f.adv_vendor_concentration} onChange={(v) => set("adv_vendor_concentration", v)} placeholder="Optional" />
          </Field>
          <Field label="Discretionary spend (estimate)">
            <MoneyInput value={f.adv_discretionary} onChange={(v) => set("adv_discretionary", v)} />
          </Field>
          <Field label="Required spend (estimate)">
            <MoneyInput value={f.adv_required} onChange={(v) => set("adv_required", v)} />
          </Field>
        </Grid>

        {f.exp_unusual === "yes" && (
          <Field label="Unusual expense — what was it?">
            <TextArea value={f.adv_unusual_explanation} onChange={(v) => set("adv_unusual_explanation", v)} />
          </Field>
        )}
      </Advanced>
    </>
  );
}

function StepPayroll({ f, set }: { f: Form; set: any }) {
  return (
    <>
      <WhyMatters>Used to understand whether labor is supporting growth or absorbing too much revenue.</WhyMatters>
      <Helper>Pull the weekly totals from your payroll software. Skip anything you don't track.</Helper>
      <Grid>
        <Field label="Total payroll / labor cost this week"><MoneyInput value={f.pay_total} onChange={(v) => set("pay_total", v)} /></Field>
        <Field label="Subcontractor cost"><MoneyInput value={f.pay_subcontractor} onChange={(v) => set("pay_subcontractor", v)} /></Field>
        <Field label="Overtime cost"><MoneyInput value={f.pay_overtime} onChange={(v) => set("pay_overtime", v)} /></Field>
        <Field label="Total hours worked by team"><TextInput value={f.pay_total_hours} onChange={(v) => set("pay_total_hours", v)} placeholder="e.g. 120" /></Field>
        <Field label="Billable / productive hours" hint="Hours that produced revenue, if known"><TextInput value={f.pay_billable_hours} onChange={(v) => set("pay_billable_hours", v)} placeholder="e.g. 95" /></Field>
      </Grid>
      <SubLabel>Owner compensation included in the total?</SubLabel>
      <ChoiceRow
        value={f.pay_owner_included}
        onChange={(v) => set("pay_owner_included", v as any)}
        options={[{ v: "yes", label: "Yes" }, { v: "no", label: "No" }]}
      />
      <Field label="Labor notes"><TextArea value={f.pay_notes} onChange={(v) => set("pay_notes", v)} /></Field>

      <Advanced label="Add detail — utilization, owner load, capacity">
        <Grid>
          <Field label="Billable hours"><TextInput value={f.adv_billable_hours} onChange={(v) => set("adv_billable_hours", v)} placeholder="e.g. 95" /></Field>
          <Field label="Non-billable hours"><TextInput value={f.adv_non_billable_hours} onChange={(v) => set("adv_non_billable_hours", v)} placeholder="e.g. 25" /></Field>
          <Field label="Utilization %" hint="Billable ÷ total hours"><TextInput value={f.adv_utilization} onChange={(v) => set("adv_utilization", v)} placeholder="e.g. 78" /></Field>
          <Field label="Owner hours worked this week"><TextInput value={f.adv_owner_hours} onChange={(v) => set("adv_owner_hours", v)} placeholder="e.g. 55" /></Field>
        </Grid>
        <Field label="Owner-only decisions this week"><TextArea value={f.adv_owner_only_decisions} onChange={(v) => set("adv_owner_only_decisions", v)} placeholder="Decisions only the owner could make" /></Field>
        <Field label="Work that could have been delegated"><TextArea value={f.adv_delegatable_work} onChange={(v) => set("adv_delegatable_work", v)} placeholder="What did you do that someone else should be doing?" /></Field>
        <SubLabel>Team capacity status</SubLabel>
        <ChoiceRow
          value={f.adv_capacity}
          onChange={(v) => set("adv_capacity", v as any)}
          options={[
            { v: "under", label: "Under capacity" },
            { v: "healthy", label: "Healthy" },
            { v: "near", label: "Near capacity" },
            { v: "over", label: "Over capacity" },
          ]}
        />
      </Advanced>
    </>
  );
}

function StepCash({ f, set }: { f: Form; set: any }) {
  return (
    <>
      <WhyMatters>Used to detect cash pressure and collection risk before it becomes urgent.</WhyMatters>
      <Helper>If you don't know a number yet, leave it blank. The report will note where data is missing.</Helper>
      <Grid>
        <Field label="Cash in this week" hint="From your bank report"><MoneyInput value={f.cash_in} onChange={(v) => set("cash_in", v)} /></Field>
        <Field label="Cash out this week"><MoneyInput value={f.cash_out} onChange={(v) => set("cash_out", v)} /></Field>
        <Field label="Current cash on hand" hint="If known"><MoneyInput value={f.cash_on_hand} onChange={(v) => set("cash_on_hand", v)} /></Field>
        <Field label="Total accounts receivable outstanding"><MoneyInput value={f.ar_outstanding} onChange={(v) => set("ar_outstanding", v)} /></Field>
        <Field label="Overdue receivables"><MoneyInput value={f.ar_overdue} onChange={(v) => set("ar_overdue", v)} /></Field>
        <Field label="Expected cash inflow next 7 days"><MoneyInput value={f.cash_in_next7} onChange={(v) => set("cash_in_next7", v)} /></Field>
        <Field label="Expected cash outflow next 7 days"><MoneyInput value={f.cash_out_next7} onChange={(v) => set("cash_out_next7", v)} /></Field>
      </Grid>
      <Field label="Cash notes"><TextArea value={f.cash_notes} onChange={(v) => set("cash_notes", v)} /></Field>

      <Advanced label="Add detail — receivables aging, obligations, cash concern">
        <SubLabel>Receivables aging</SubLabel>
        <Grid>
          <Field label="0–30 days"><MoneyInput value={f.adv_ar_0_30} onChange={(v) => set("adv_ar_0_30", v)} /></Field>
          <Field label="31–60 days"><MoneyInput value={f.adv_ar_31_60} onChange={(v) => set("adv_ar_31_60", v)} /></Field>
          <Field label="61–90 days"><MoneyInput value={f.adv_ar_61_90} onChange={(v) => set("adv_ar_61_90", v)} /></Field>
          <Field label="90+ days"><MoneyInput value={f.adv_ar_90_plus} onChange={(v) => set("adv_ar_90_plus", v)} /></Field>
        </Grid>

        <SubLabel>Obligations & inflows</SubLabel>
        <Grid>
          <Field label="Upcoming obligations next 7 days"><MoneyInput value={f.adv_obligations_7} onChange={(v) => set("adv_obligations_7", v)} /></Field>
          <Field label="Upcoming obligations next 30 days"><MoneyInput value={f.adv_obligations_30} onChange={(v) => set("adv_obligations_30", v)} /></Field>
          <Field label="Expected inflows next 30 days"><MoneyInput value={f.adv_expected_inflows_30} onChange={(v) => set("adv_expected_inflows_30", v)} /></Field>
        </Grid>

        <SubLabel>Owner cash concern level</SubLabel>
        <ChoiceRow
          value={f.adv_cash_concern}
          onChange={(v) => set("adv_cash_concern", v as any)}
          options={[
            { v: "low", label: "Low" },
            { v: "watch", label: "Watch" },
            { v: "critical", label: "Critical" },
          ]}
        />
      </Advanced>
    </>
  );
}

function StepPipeline({ f, set }: { f: Form; set: any }) {
  return (
    <>
      <WhyMatters>Used to spot future revenue risk before it appears in revenue reports.</WhyMatters>
      <Helper>Pull from your CRM, sales pipeline tool, or estimate manually. All fields optional.</Helper>
      <Grid>
        <Field label="New leads this week"><TextInput value={f.pipe_new_leads} onChange={(v) => set("pipe_new_leads", v)} placeholder="e.g. 5" /></Field>
        <Field label="Quotes / estimates sent"><TextInput value={f.pipe_quotes_sent} onChange={(v) => set("pipe_quotes_sent", v)} placeholder="e.g. 3" /></Field>
        <Field label="Quotes / estimates accepted"><TextInput value={f.pipe_quotes_accepted} onChange={(v) => set("pipe_quotes_accepted", v)} placeholder="e.g. 2" /></Field>
        <Field label="Lost deals this week"><TextInput value={f.pipe_lost} onChange={(v) => set("pipe_lost", v)} placeholder="e.g. 1" /></Field>
        <Field label="Estimated value of open opportunities"><MoneyInput value={f.pipe_open_value} onChange={(v) => set("pipe_open_value", v)} /></Field>
        <Field label="Main reason deals were lost"><TextInput value={f.pipe_lost_reason} onChange={(v) => set("pipe_lost_reason", v)} placeholder="e.g. Price" /></Field>
      </Grid>
      <Field label="Sales notes"><TextArea value={f.pipe_notes} onChange={(v) => set("pipe_notes", v)} /></Field>

      <Advanced label="Add detail — sources, lost reasons, confidence">
        <Grid>
          <Field label="Lead source with best quality"><TextInput value={f.adv_best_quality_source} onChange={(v) => set("adv_best_quality_source", v)} placeholder="e.g. Referrals" /></Field>
          <Field label="Lead source with highest volume"><TextInput value={f.adv_highest_volume_source} onChange={(v) => set("adv_highest_volume_source", v)} placeholder="e.g. Google" /></Field>
          <Field label="Estimated close date for open pipeline"><DateInput value={f.adv_estimated_close_date} onChange={(v) => set("adv_estimated_close_date", v)} /></Field>
        </Grid>

        <Field label="Quote-to-close notes"><TextArea value={f.adv_quote_close_notes} onChange={(v) => set("adv_quote_close_notes", v)} placeholder="What helped or hurt closing this week?" /></Field>

        <SubLabel>Lost deal reason categories (select any)</SubLabel>
        <div className="flex flex-wrap gap-1.5">
          {LOST_REASONS.map((r) => {
            const active = f.adv_lost_reasons.includes(r.k);
            return (
              <button
                key={r.k}
                type="button"
                onClick={() =>
                  set(
                    "adv_lost_reasons",
                    active ? f.adv_lost_reasons.filter((x: string) => x !== r.k) : [...f.adv_lost_reasons, r.k],
                  )
                }
                className={`text-xs px-3 h-9 rounded-md border transition-colors ${
                  active ? "border-primary/50 bg-primary/10 text-foreground" : "border-border bg-muted/20 text-muted-foreground hover:text-foreground"
                }`}
              >
                {r.label}
              </button>
            );
          })}
        </div>

        <SubLabel>Confidence in open pipeline</SubLabel>
        <ChoiceRow
          value={f.adv_pipeline_confidence}
          onChange={(v) => set("adv_pipeline_confidence", v as any)}
          options={[
            { v: "low", label: "Low" },
            { v: "medium", label: "Medium" },
            { v: "high", label: "High" },
          ]}
        />
      </Advanced>
    </>
  );
}

function StepPressure({ f, set }: { f: Form; set: any }) {
  return (
    <>
      <WhyMatters>Used to decide what RGS should recommend first. This is the human side of the report.</WhyMatters>
      <Helper>Plain language is fine. RGS uses this to weigh what to address first.</Helper>

      <SubLabel>Biggest issue this week</SubLabel>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {PRESSURE_OPTIONS.map((opt) => {
          const active = f.pressure_main_issue === opt;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => set("pressure_main_issue", active ? "" : opt)}
              className={`text-left text-xs px-3 h-9 rounded-md border transition-colors ${
                active ? "border-primary/50 bg-primary/10 text-foreground" : "border-border bg-muted/20 text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>

      <SubLabel>How concerned is the owner this week? (1 = calm, 5 = urgent)</SubLabel>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => set("pressure_concern_level", String(n))}
            className={`w-10 h-10 rounded-md border text-sm transition-colors ${
              String(n) === f.pressure_concern_level
                ? "border-primary/60 bg-primary/15 text-foreground"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {n}
          </button>
        ))}
      </div>

      <Field label="What needs attention first?"><TextArea value={f.pressure_attention_first} onChange={(v) => set("pressure_attention_first", v)} /></Field>
      <Field label="Any decision you want RGS to help clarify?"><TextArea value={f.pressure_decision} onChange={(v) => set("pressure_decision", v)} /></Field>

      <Advanced label="Add detail — blockers & repeat issues">
        <Grid>
          <Field label="Process blocker"><TextInput value={f.adv_process_blocker} onChange={(v) => set("adv_process_blocker", v)} placeholder="A workflow or system that slowed things down" /></Field>
          <Field label="People blocker"><TextInput value={f.adv_people_blocker} onChange={(v) => set("adv_people_blocker", v)} placeholder="A staffing or skill gap" /></Field>
          <Field label="Sales blocker"><TextInput value={f.adv_sales_blocker} onChange={(v) => set("adv_sales_blocker", v)} placeholder="Something stopping deals from closing" /></Field>
          <Field label="Cash blocker"><TextInput value={f.adv_cash_blocker} onChange={(v) => set("adv_cash_blocker", v)} placeholder="Something stopping cash from arriving" /></Field>
        </Grid>
        <Field label="Owner bottleneck"><TextArea value={f.adv_owner_bottleneck} onChange={(v) => set("adv_owner_bottleneck", v)} placeholder="What only the owner could move forward?" /></Field>

        <div className="flex flex-wrap items-center gap-4 pt-1">
          <label className="inline-flex items-center gap-2 text-xs text-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={f.adv_repeated_issue}
              onChange={(e) => set("adv_repeated_issue", e.target.checked)}
              className="h-4 w-4 rounded border-border bg-background"
            />
            Repeated issue from last week
          </label>
          <label className="inline-flex items-center gap-2 text-xs text-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={f.adv_request_rgs_review}
              onChange={(e) => set("adv_request_rgs_review", e.target.checked)}
              className="h-4 w-4 rounded border-border bg-background"
            />
            RGS should review this
          </label>
        </div>
      </Advanced>
    </>
  );
}

function StepGoals({ f, set }: { f: Form; set: any }) {
  return (
    <>
      <WhyMatters>Compares actuals to intent. Skip anything you haven't set yet.</WhyMatters>
      <Helper>You can leave these blank. They make the weekly report stronger over time.</Helper>
      <Grid>
        <Field label="Weekly revenue goal"><MoneyInput value={f.goal_revenue_weekly} onChange={(v) => set("goal_revenue_weekly", v)} /></Field>
        <Field label="Weekly expense limit"><MoneyInput value={f.goal_expense_limit} onChange={(v) => set("goal_expense_limit", v)} /></Field>
        <Field label="Payroll / labor target"><MoneyInput value={f.goal_labor} onChange={(v) => set("goal_labor", v)} /></Field>
        <Field label="Cash reserve target"><MoneyInput value={f.goal_cash_reserve} onChange={(v) => set("goal_cash_reserve", v)} /></Field>
      </Grid>
      <Field label="Primary business goal this week"><TextArea value={f.goal_primary} onChange={(v) => set("goal_primary", v)} placeholder="e.g. Collect overdue invoices from top 3 clients" /></Field>
    </>
  );
}

function StepReview({ f, summary }: { f: Form; summary: ReturnType<typeof buildSummary> }) {
  return (
    <>
      <Helper>Quick check. Anything you skipped will be flagged in the report rather than blocking the entry.</Helper>
      <div className="space-y-2">
        {summary.map((row) => (
          <div key={row.label} className="flex items-start justify-between gap-3 px-3 py-2 rounded-md border border-border bg-muted/20">
            <div className="text-xs">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{row.label}</div>
              <div className="text-foreground mt-0.5">{row.value}</div>
            </div>
            {row.warn && <span className="text-[10px] uppercase tracking-wider text-amber-300/90">Missing</span>}
          </div>
        ))}
      </div>
      <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-xs text-foreground/90 flex items-start gap-2">
        <Info className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
        <div className="leading-relaxed">
          When you save, RGS combines these numbers with prior weeks to update your Business Control Report —
          revenue stability, collection risk, expense pressure, labor load, cash runway, and pipeline health.
        </div>
      </div>
    </>
  );
}

/* ============================ helpers / atoms ============================ */

function rev(customerId: string, week: string, amount: number, status: string, type: string, f: Form, metaTag: string) {
  return {
    customer_id: customerId,
    entry_date: week,
    amount,
    status,
    revenue_type: type,
    service_category: f.rev_top_service || null,
    client_or_job: f.rev_top_client || null,
    source_channel: null,
    notes: [f.rev_notes, metaTag].filter(Boolean).join(" ").trim() || null,
  };
}
function exp(customerId: string, week: string, amount: number, type: "fixed" | "variable", category: string, vendor: string, f: Form) {
  return {
    customer_id: customerId,
    entry_date: week,
    amount,
    vendor: vendor || null,
    expense_type: type,
    payment_status: "paid",
    notes: [category && `Category: ${category}`, f.exp_notes].filter(Boolean).join(" | ") || null,
  };
}

function buildSummary(f: Form) {
  const fm = (n: string) => (n ? `$${Number(n).toLocaleString()}` : "—");
  const t = (n: string) => (n ? n : "—");
  const otherSelected = f.source_systems.includes("Other");
  const rows: { label: string; value: string; warn: boolean }[] = [
    { label: "Week", value: `${f.week_start} → ${f.week_end}`, warn: false },
    { label: "Source systems", value: f.source_systems.length ? f.source_systems.join(", ") : "Not specified", warn: f.source_systems.length === 0 },
  ];
  if (otherSelected) {
    const detail = f.other_source_detail.trim();
    rows.push({
      label: "Other source",
      value: detail || "Other source not specified",
      warn: !detail,
    });
  }
  rows.push(
    { label: "Revenue collected", value: fm(f.rev_collected), warn: !f.rev_collected },
    { label: "Total expenses", value: fm(f.exp_total), warn: !f.exp_total && !f.exp_recurring && !f.exp_one_time },
    { label: "Payroll / labor", value: fm(f.pay_total), warn: !f.pay_total },
    { label: "Cash in / out", value: `${fm(f.cash_in)} / ${fm(f.cash_out)}`, warn: !f.cash_in && !f.cash_out },
    { label: "Accounts receivable", value: fm(f.ar_outstanding), warn: !f.ar_outstanding },
    { label: "Pipeline activity", value: f.pipe_new_leads || f.pipe_quotes_sent ? `${t(f.pipe_new_leads)} leads · ${t(f.pipe_quotes_sent)} quotes` : "Not entered", warn: !f.pipe_new_leads && !f.pipe_quotes_sent },
    { label: "Biggest issue this week", value: t(f.pressure_main_issue), warn: !f.pressure_main_issue },
    { label: "Owner concern (1–5)", value: t(f.pressure_concern_level), warn: !f.pressure_concern_level },
  );
  return rows;
}

function Helper({ children }: { children: React.ReactNode }) {
  return <p className="text-[12px] text-muted-foreground leading-relaxed">{children}</p>;
}
function WhyMatters({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-[11px] text-foreground/80 leading-relaxed flex items-start gap-2">
      <Database className="h-3 w-3 mt-0.5 text-primary flex-shrink-0" />
      <span><span className="text-primary/90 font-medium">Why this matters: </span>{children}</span>
    </div>
  );
}
function Banner({ tone, children }: { tone: "info"; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-xs text-foreground flex items-start gap-2">
      <Info className="h-3.5 w-3.5 mt-0.5 text-primary flex-shrink-0" />
      <div className="leading-relaxed">{children}</div>
    </div>
  );
}
function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{children}</div>;
}
function SubLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-[11px] uppercase tracking-wider text-muted-foreground mt-2">{children}</div>;
}
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
      {hint && <span className="block text-[10px] text-muted-foreground/80 italic mt-0.5">{hint}</span>}
    </label>
  );
}
const inputCls = "w-full h-9 px-2 rounded-md bg-background border border-input text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40";
function MoneyInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <input type="number" inputMode="decimal" placeholder="0" value={value} onChange={(e) => onChange(e.target.value)} className={inputCls} />;
}
function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <input type="text" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} className={inputCls} />;
}
function DateInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <input type="date" value={value} onChange={(e) => onChange(e.target.value)} className={inputCls} />;
}
function TextArea({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <textarea rows={2} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} className={`${inputCls} h-auto py-2 leading-snug`} />;
}
function ChoiceRow({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { v: string; label: string }[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(value === o.v ? "" : o.v)}
          className={`text-xs px-3 h-9 rounded-md border transition-colors ${
            value === o.v ? "border-primary/50 bg-primary/10 text-foreground" : "border-border bg-muted/20 text-muted-foreground hover:text-foreground"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Advanced({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3 rounded-md border border-dashed border-border bg-muted/10">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-3 h-9 text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
      >
        <span className="inline-flex items-center gap-2">
          <PlusIcon className="h-3 w-3" /> {open ? "Hide detail" : label}
        </span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="p-3 pt-0 space-y-3 border-t border-border/60">{children}</div>}
    </div>
  );
}

function RowList({
  items,
  onAdd,
  onRemove,
  renderRow,
  addLabel,
}: {
  items: any[];
  onAdd: () => void;
  onRemove: (i: number) => void;
  renderRow: (row: any, i: number) => React.ReactNode;
  addLabel: string;
}) {
  return (
    <div className="space-y-2">
      {items.map((row, i) => (
        <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_140px_auto] gap-2 items-end">
          {renderRow(row, i)}
          <button
            type="button"
            onClick={() => onRemove(i)}
            className="h-9 w-9 inline-flex items-center justify-center rounded-md border border-border text-muted-foreground hover:text-destructive"
            aria-label="Remove row"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={onAdd}
        className="inline-flex items-center gap-1 h-8 px-3 rounded-md border border-border text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
      >
        <PlusIcon className="h-3 w-3" /> {addLabel}
      </button>
    </div>
  );
}