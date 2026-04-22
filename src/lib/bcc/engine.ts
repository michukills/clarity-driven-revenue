import type {
  BccDataset,
  BusinessGoal,
  CashFlowEntry,
  ExpenseEntry,
  InvoiceEntry,
  LaborEntry,
  PayrollEntry,
  RevenueEntry,
} from "./types";

export type Severity = "low" | "medium" | "high" | "critical";
export type NextStep = "Diagnostic" | "Implementation" | "Add-ons / Monitoring";

export interface Metrics {
  totalRevenue: number;
  collectedRevenue: number;
  pendingRevenue: number;
  overdueRevenue: number;
  totalExpenses: number;
  payrollCost: number;
  laborCost: number;
  grossProfit: number; // revenue - direct labor
  netProfit: number; // revenue - expenses - payroll
  profitMargin: number; // %
  laborPctRevenue: number; // %
  expenseRatio: number; // %
  cashIn: number;
  cashOut: number;
  netCash: number;
  expectedCashIn: number;
  expectedCashOut: number;
  receivablesOpen: number; // invoiced - collected, not paid/written_off
  receivablesOverdue: number;
  payablesPending: number;
  recurringRevenuePct: number;
  topClientShare: number; // largest single client/job share of revenue
  topServiceShare: number;
  cashRunwayMonths: number | null;
}

export interface Issue {
  key: string;
  title: string;
  meaning: string;
  matters: string;
  next: string;
  severity: Severity;
  dollarImpact?: number;
  category: "revenue" | "margin" | "payroll" | "expense" | "cash" | "receivables" | "concentration";
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + (Number(b) || 0), 0);
const pct = (a: number, b: number) => (b > 0 ? (a / b) * 100 : 0);

export function computeMetrics(d: BccDataset): Metrics {
  const totalRevenue = sum(d.revenue.map((r) => r.amount));
  const collectedRevenue = sum(d.revenue.filter((r) => r.status === "collected").map((r) => r.amount));
  const pendingRevenue = sum(d.revenue.filter((r) => r.status === "pending").map((r) => r.amount));
  const overdueRevenue = sum(d.revenue.filter((r) => r.status === "overdue").map((r) => r.amount));
  const totalExpenses = sum(d.expenses.map((e) => e.amount));
  const payrollCost = sum(d.payroll.map((p) => p.total_payroll_cost || p.gross_pay + p.payroll_taxes_fees));
  const laborCost = sum(d.labor.map((l) => l.labor_cost));
  const grossProfit = totalRevenue - laborCost;
  const netProfit = totalRevenue - totalExpenses - payrollCost;
  const profitMargin = pct(netProfit, totalRevenue);
  const laborPctRevenue = pct(payrollCost + laborCost, totalRevenue);
  const expenseRatio = pct(totalExpenses, totalRevenue);

  const cashIn = sum(d.cashflow.filter((c) => c.direction === "cash_in" && c.expected_or_actual === "actual").map((c) => c.amount));
  const cashOut = sum(d.cashflow.filter((c) => c.direction === "cash_out" && c.expected_or_actual === "actual").map((c) => c.amount));
  const expectedCashIn = sum(d.cashflow.filter((c) => c.direction === "cash_in" && c.expected_or_actual === "expected").map((c) => c.amount));
  const expectedCashOut = sum(d.cashflow.filter((c) => c.direction === "cash_out" && c.expected_or_actual === "expected").map((c) => c.amount));

  const openInv = d.invoices.filter((i) => !["paid", "written_off", "draft"].includes(i.status));
  const receivablesOpen = sum(openInv.map((i) => Math.max(0, i.amount - i.amount_collected)));
  const receivablesOverdue = sum(
    d.invoices.filter((i) => i.status === "overdue").map((i) => Math.max(0, i.amount - i.amount_collected)),
  );
  const payablesPending = sum(d.expenses.filter((e) => e.payment_status !== "paid").map((e) => e.amount));

  const recurringRevenue = sum(d.revenue.filter((r) => r.revenue_type === "recurring").map((r) => r.amount));
  const recurringRevenuePct = pct(recurringRevenue, totalRevenue);

  const topClientShare = topShare(d.revenue, (r) => r.client_or_job);
  const topServiceShare = topShare(d.revenue, (r) => r.service_category);

  const monthlyBurn = totalExpenses + payrollCost;
  const cashRunwayMonths = monthlyBurn > 0 ? Math.max(0, cashIn - cashOut) / monthlyBurn : null;

  return {
    totalRevenue,
    collectedRevenue,
    pendingRevenue,
    overdueRevenue,
    totalExpenses,
    payrollCost,
    laborCost,
    grossProfit,
    netProfit,
    profitMargin,
    laborPctRevenue,
    expenseRatio,
    cashIn,
    cashOut,
    netCash: cashIn - cashOut,
    expectedCashIn,
    expectedCashOut,
    receivablesOpen,
    receivablesOverdue,
    payablesPending,
    recurringRevenuePct,
    topClientShare,
    topServiceShare,
    cashRunwayMonths,
  };
}

function topShare<T>(items: T[], key: (t: T) => string | null | undefined): number {
  if (!items.length) return 0;
  const totals = new Map<string, number>();
  let total = 0;
  for (const item of items) {
    const k = (key(item) || "Unspecified").trim() || "Unspecified";
    const amt = Number((item as any).amount) || 0;
    totals.set(k, (totals.get(k) || 0) + amt);
    total += amt;
  }
  if (total <= 0) return 0;
  const max = Math.max(...totals.values());
  return (max / total) * 100;
}

/* -------------------- Health score (0–100) -------------------- */
export interface HealthScore {
  overall: number;
  components: {
    revenueStability: number;
    marginHealth: number;
    payrollLoad: number;
    expenseControl: number;
    cashVisibility: number;
    receivablesRisk: number;
    ownerDependency: number;
  };
  condition: "Strong" | "Stable" | "Watch" | "Leaking" | "Critical";
}

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

export function computeHealth(m: Metrics, d: BccDataset): HealthScore {
  const recurring = clamp(m.recurringRevenuePct * 1.2);
  const concentrationPenalty = m.topClientShare > 40 ? (m.topClientShare - 40) * 1.5 : 0;
  const revenueStability = clamp(40 + recurring - concentrationPenalty);

  const marginHealth = clamp(m.profitMargin >= 20 ? 90 : m.profitMargin >= 10 ? 70 : m.profitMargin >= 0 ? 45 : 15);

  const payrollLoad = clamp(m.laborPctRevenue <= 30 ? 90 : m.laborPctRevenue <= 45 ? 70 : m.laborPctRevenue <= 60 ? 45 : 20);

  const expenseControl = clamp(m.expenseRatio <= 30 ? 90 : m.expenseRatio <= 50 ? 70 : m.expenseRatio <= 70 ? 45 : 20);

  const hasCash = d.cashflow.length > 0;
  const cashVisibility = clamp(
    (hasCash ? 50 : 20) + (m.netCash > 0 ? 30 : m.netCash === 0 ? 10 : -10) + (m.cashRunwayMonths && m.cashRunwayMonths >= 3 ? 20 : 0),
  );

  const overdueShare = m.receivablesOpen > 0 ? (m.receivablesOverdue / m.receivablesOpen) * 100 : 0;
  const receivablesRisk = clamp(100 - overdueShare * 1.2 - (m.receivablesOpen > m.totalRevenue * 0.4 ? 20 : 0));

  const ownerDraws = d.payroll.filter((p) => p.labor_type === "owner_draw");
  const ownerDrawTotal = sum(ownerDraws.map((p) => p.total_payroll_cost || p.gross_pay));
  const ownerDependency = clamp(
    100 - (m.totalRevenue > 0 ? (ownerDrawTotal / m.totalRevenue) * 100 : 0) - (d.payroll.length === 0 ? 25 : 0),
  );

  const overall = Math.round(
    revenueStability * 0.18 +
      marginHealth * 0.2 +
      payrollLoad * 0.16 +
      expenseControl * 0.14 +
      cashVisibility * 0.14 +
      receivablesRisk * 0.1 +
      ownerDependency * 0.08,
  );

  const condition: HealthScore["condition"] =
    overall >= 80 ? "Strong" : overall >= 65 ? "Stable" : overall >= 50 ? "Watch" : overall >= 35 ? "Leaking" : "Critical";

  return {
    overall,
    components: {
      revenueStability: Math.round(revenueStability),
      marginHealth: Math.round(marginHealth),
      payrollLoad: Math.round(payrollLoad),
      expenseControl: Math.round(expenseControl),
      cashVisibility: Math.round(cashVisibility),
      receivablesRisk: Math.round(receivablesRisk),
      ownerDependency: Math.round(ownerDependency),
    },
    condition,
  };
}

/* -------------------- Issue detection -------------------- */
export function detectIssues(m: Metrics, d: BccDataset, goals: BusinessGoal[]): Issue[] {
  const issues: Issue[] = [];
  const marginGoal = goals.find((g) => g.goal_type === "profit_margin")?.target_value ?? 15;
  const payrollGoal = goals.find((g) => g.goal_type === "payroll_ratio")?.target_value ?? 45;

  if (m.totalRevenue > 0 && m.profitMargin < marginGoal) {
    issues.push({
      key: "margin_low",
      category: "margin",
      title: `Profit margin is ${m.profitMargin.toFixed(1)}% — below the ${marginGoal}% target`,
      meaning: "Revenue is coming in but not converting into enough profit after delivery and operating costs.",
      matters: "Thin margins leave nothing to reinvest, weather slow months, or fund growth.",
      next: "Review pricing on the top three services and the cost-to-deliver each one. Consider raising rates or reducing discounting before adding more volume.",
      severity: m.profitMargin < 0 ? "critical" : m.profitMargin < marginGoal / 2 ? "high" : "medium",
      dollarImpact: Math.round(((marginGoal - m.profitMargin) / 100) * m.totalRevenue),
    });
  }

  if (m.laborPctRevenue > payrollGoal) {
    issues.push({
      key: "payroll_heavy",
      category: "payroll",
      title: `Payroll & labor consume ${m.laborPctRevenue.toFixed(1)}% of revenue`,
      meaning: "A high payroll-to-revenue ratio signals scheduling inefficiency, overstaffing, underpricing, or low production output.",
      matters: "Labor is usually the largest controllable cost in a service business. Letting it drift compresses margin quickly.",
      next: "Review labor cost by job and service before adding more work. Look for non-billable hours and capacity gaps.",
      severity: m.laborPctRevenue > 60 ? "high" : "medium",
    });
  }

  if (m.expenseRatio > 60 && m.totalRevenue > 0) {
    issues.push({
      key: "expense_heavy",
      category: "expense",
      title: `Operating expenses are ${m.expenseRatio.toFixed(1)}% of revenue`,
      meaning: "Fixed and variable costs may be growing faster than revenue.",
      matters: "When expenses outpace sales, profit erodes even when the top line looks healthy.",
      next: "Review the top three expense categories. Identify which costs are fixed, variable, or avoidable this quarter.",
      severity: m.expenseRatio > 80 ? "high" : "medium",
    });
  }

  if (m.netCash < 0) {
    issues.push({
      key: "cash_negative",
      category: "cash",
      title: "Cash flow is negative this period",
      meaning: "More cash is going out than coming in.",
      matters: "Sustained negative cash movement creates pressure on payroll, vendors, and owner draw — even if the P&L looks fine.",
      next: "Match upcoming receivables against obligations for the next 30 days. Defer non-essential spend until collections improve.",
      severity: Math.abs(m.netCash) > m.totalRevenue * 0.2 ? "high" : "medium",
    });
  }

  if (m.receivablesOverdue > 0) {
    issues.push({
      key: "receivables_overdue",
      category: "receivables",
      title: `$${Math.round(m.receivablesOverdue).toLocaleString()} in receivables is overdue`,
      meaning: "Revenue has been earned but not collected.",
      matters: "Overdue receivables create cash flow pressure and can hide the true health of the business.",
      next: "Prioritize collection follow-up this week and review payment terms with repeat clients.",
      severity: m.receivablesOverdue > m.totalRevenue * 0.15 ? "high" : "medium",
      dollarImpact: Math.round(m.receivablesOverdue),
    });
  }

  if (m.recurringRevenuePct < 20 && m.totalRevenue > 0) {
    issues.push({
      key: "weak_recurring",
      category: "revenue",
      title: `Recurring revenue is only ${m.recurringRevenuePct.toFixed(0)}% of total`,
      meaning: "The business depends heavily on one-time sales each month.",
      matters: "Without a recurring base, every month restarts from zero — making revenue stability fragile.",
      next: "Consider packaging a recurring offer (retainer, monitoring, maintenance) for existing high-fit clients.",
      severity: "medium",
    });
  }

  if (m.topClientShare > 40) {
    issues.push({
      key: "client_concentration",
      category: "concentration",
      title: `One client/job represents ${m.topClientShare.toFixed(0)}% of revenue`,
      meaning: "Revenue is concentrated in a single source.",
      matters: "Losing one account would meaningfully destabilize the business.",
      next: "Review the lead and referral pipeline. Investigate where the next two anchor clients will come from.",
      severity: m.topClientShare > 60 ? "high" : "medium",
    });
  }

  return issues.sort((a, b) => sevWeight(b.severity) - sevWeight(a.severity));
}

const sevWeight = (s: Severity) => ({ critical: 4, high: 3, medium: 2, low: 1 }[s]);

/* -------------------- Data gaps -------------------- */
export function detectDataGaps(d: BccDataset): string[] {
  const gaps: string[] = [];
  if (d.revenue.length === 0) gaps.push("No revenue entries — total revenue cannot be computed.");
  if (d.expenses.length === 0) gaps.push("No expense entries — operating cost is unknown.");
  if (d.payroll.length === 0) gaps.push("No payroll entered — labor load cannot be evaluated.");
  if (d.labor.length === 0) gaps.push("No job-level labor — service-level profitability cannot be evaluated.");
  if (d.invoices.length === 0) gaps.push("No invoices — receivables risk cannot be assessed.");
  if (d.cashflow.length === 0) gaps.push("No cash flow entries — runway and obligations are unknown.");
  if (d.goals.length === 0) gaps.push("No goals set — performance is being judged against generic benchmarks.");
  if (d.revenue.length > 0 && d.revenue.every((r) => !r.service_category)) {
    gaps.push("Revenue is not categorized by service — leak signals will be limited.");
  }
  return gaps;
}

/* -------------------- Recommendation -------------------- */
export function recommendNextStep(issues: Issue[], health: HealthScore): NextStep {
  const critical = issues.some((i) => i.severity === "critical");
  if (critical || health.overall < 50) return "Diagnostic";
  const operational = issues.some((i) => ["payroll", "expense", "receivables", "cash"].includes(i.category));
  if (operational) return "Implementation";
  return "Add-ons / Monitoring";
}

export function periodChange(curr: number, prev: number): { delta: number; pct: number } {
  const delta = curr - prev;
  const pctVal = prev !== 0 ? (delta / Math.abs(prev)) * 100 : 0;
  return { delta, pct: pctVal };
}