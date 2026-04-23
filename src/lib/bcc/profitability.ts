/* P11.6 — Profitability computation layer.
 *
 * Computes offer/service-line and client/job profitability using existing
 * BCC data sources (revenue_entries, expense_entries, labor_entries).
 *
 * Principles:
 *  - direct attribution only (service_category for offers, client_or_job for clients)
 *  - no fake precision: unattributed revenue/cost is surfaced as a separate bucket
 *  - payroll is intentionally NOT allocated automatically (we don't have allocation
 *    rules); it shows up only at the BCC overall level, not per-line profitability
 */

import { supabase } from "@/integrations/supabase/client";

export type ProfitWindow = "current_month" | "prior_month" | "trailing_90";

export interface ProfitabilityLine {
  key: string;
  label: string;
  revenue: number;
  labor_cost: number;
  expense_cost: number;
  gross_profit: number;
  gross_margin: number; // 0..1, or NaN when revenue == 0
  hours: number;
  hourly_yield: number | null; // gross_profit / hours
  share_of_revenue: number; // 0..1
  share_of_profit: number; // 0..1 (of positive profit pool)
  attribution_complete: boolean;
}

export interface ProfitabilityRollup {
  window: ProfitWindow;
  period_start: string;
  period_end: string;
  total_revenue: number;
  attributed_revenue: number;
  unattributed_revenue: number;
  total_labor_cost: number;
  attributed_labor_cost: number;
  total_expense_cost: number;
  attributed_expense_cost: number;
  total_gross_profit: number;
  total_gross_margin: number;
  offers: ProfitabilityLine[];
  clients: ProfitabilityLine[];
  best_offer: ProfitabilityLine | null;
  worst_offer: ProfitabilityLine | null;
  best_client: ProfitabilityLine | null;
  worst_client: ProfitabilityLine | null;
}

function pad(n: number) {
  return n < 10 ? `0${n}` : String(n);
}
function ymd(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function resolveWindow(window: ProfitWindow): { start: string; end: string } {
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth();
  if (window === "current_month") {
    const start = new Date(y, m, 1);
    const end = new Date(y, m + 1, 0);
    return { start: ymd(start), end: ymd(end) };
  }
  if (window === "prior_month") {
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0);
    return { start: ymd(start), end: ymd(end) };
  }
  // trailing_90
  const end = new Date(y, m, today.getDate());
  const start = new Date(end);
  start.setDate(start.getDate() - 89);
  return { start: ymd(start), end: ymd(end) };
}

function normalizeKey(s: string | null | undefined): string {
  return (s ?? "").trim();
}

function ratio(n: number, d: number): number {
  return d > 0 ? n / d : 0;
}

function buildLines(args: {
  revenue: { key: string; amount: number }[];
  labor: { key: string; cost: number; hours: number }[];
  expense: { key: string; amount: number }[];
  totalRevenue: number;
}): { lines: ProfitabilityLine[]; profitPool: number } {
  const map = new Map<
    string,
    { revenue: number; labor_cost: number; expense_cost: number; hours: number; hasLaborOrExpense: boolean }
  >();
  const ensure = (k: string) => {
    let cur = map.get(k);
    if (!cur) {
      cur = { revenue: 0, labor_cost: 0, expense_cost: 0, hours: 0, hasLaborOrExpense: false };
      map.set(k, cur);
    }
    return cur;
  };
  for (const r of args.revenue) {
    if (!r.key) continue;
    ensure(r.key).revenue += r.amount;
  }
  for (const l of args.labor) {
    if (!l.key) continue;
    const e = ensure(l.key);
    e.labor_cost += l.cost;
    e.hours += l.hours;
    e.hasLaborOrExpense = true;
  }
  for (const x of args.expense) {
    if (!x.key) continue;
    const e = ensure(x.key);
    e.expense_cost += x.amount;
    e.hasLaborOrExpense = true;
  }

  const profitPool = Array.from(map.values()).reduce(
    (acc, v) => acc + Math.max(0, v.revenue - v.labor_cost - v.expense_cost),
    0,
  );

  const lines: ProfitabilityLine[] = Array.from(map.entries()).map(([key, v]) => {
    const gp = v.revenue - v.labor_cost - v.expense_cost;
    const margin = v.revenue > 0 ? gp / v.revenue : 0;
    return {
      key,
      label: key,
      revenue: v.revenue,
      labor_cost: v.labor_cost,
      expense_cost: v.expense_cost,
      gross_profit: gp,
      gross_margin: margin,
      hours: v.hours,
      hourly_yield: v.hours > 0 ? gp / v.hours : null,
      share_of_revenue: ratio(v.revenue, args.totalRevenue),
      share_of_profit: profitPool > 0 ? Math.max(0, gp) / profitPool : 0,
      attribution_complete: v.hasLaborOrExpense,
    };
  });
  // sort by revenue desc
  lines.sort((a, b) => b.revenue - a.revenue);
  return { lines, profitPool };
}

export async function buildProfitabilityRollup(args: {
  customerId: string;
  window?: ProfitWindow;
}): Promise<ProfitabilityRollup> {
  const window = args.window ?? "trailing_90";
  const { start, end } = resolveWindow(window);

  const [rev, exp, lab] = await Promise.all([
    supabase
      .from("revenue_entries")
      .select("amount, service_category, client_or_job, entry_date")
      .eq("customer_id", args.customerId)
      .gte("entry_date", start)
      .lte("entry_date", end),
    supabase
      .from("expense_entries")
      .select("amount, entry_date, notes, vendor")
      .eq("customer_id", args.customerId)
      .gte("entry_date", start)
      .lte("entry_date", end),
    supabase
      .from("labor_entries")
      .select("labor_cost, hours_worked, service_category, job_or_project, entry_date")
      .eq("customer_id", args.customerId)
      .gte("entry_date", start)
      .lte("entry_date", end),
  ]);

  const revRows = (rev.data as any[]) || [];
  const expRows = (exp.data as any[]) || [];
  const labRows = (lab.data as any[]) || [];

  const total_revenue = revRows.reduce((a, r) => a + (Number(r.amount) || 0), 0);
  const total_labor_cost = labRows.reduce((a, r) => a + (Number(r.labor_cost) || 0), 0);
  // expenses: in current schema we don't have direct service_category/client_or_job
  // attribution. We surface total expense cost but only attribute when notes/vendor
  // happens to match an existing key (lightweight, safe). For now, expense
  // attribution is left empty to avoid fake precision.
  const total_expense_cost = expRows.reduce((a, r) => a + (Number(r.amount) || 0), 0);

  // OFFERS — keyed by service_category
  const revenueByOffer = revRows.map((r) => ({
    key: normalizeKey(r.service_category),
    amount: Number(r.amount) || 0,
  }));
  const laborByOffer = labRows.map((l) => ({
    key: normalizeKey(l.service_category),
    cost: Number(l.labor_cost) || 0,
    hours: Number(l.hours_worked) || 0,
  }));
  const offerAttributedRevenue = revenueByOffer
    .filter((r) => r.key)
    .reduce((a, r) => a + r.amount, 0);
  const offerAttributedLabor = laborByOffer
    .filter((l) => l.key)
    .reduce((a, l) => a + l.cost, 0);

  const offerBuild = buildLines({
    revenue: revenueByOffer,
    labor: laborByOffer,
    expense: [],
    totalRevenue: total_revenue,
  });

  // CLIENTS — keyed by client_or_job
  const revenueByClient = revRows.map((r) => ({
    key: normalizeKey(r.client_or_job),
    amount: Number(r.amount) || 0,
  }));
  const laborByClient = labRows.map((l) => ({
    key: normalizeKey(l.job_or_project),
    cost: Number(l.labor_cost) || 0,
    hours: Number(l.hours_worked) || 0,
  }));
  const clientBuild = buildLines({
    revenue: revenueByClient,
    labor: laborByClient,
    expense: [],
    totalRevenue: total_revenue,
  });

  const total_gross_profit = total_revenue - total_labor_cost - total_expense_cost;
  const total_gross_margin = total_revenue > 0 ? total_gross_profit / total_revenue : 0;

  const offersWithRevenue = offerBuild.lines.filter((l) => l.revenue > 0);
  const clientsWithRevenue = clientBuild.lines.filter((l) => l.revenue > 0);

  // Best/worst — only consider lines with meaningful revenue (>= 5% share or >= $500)
  const meaningful = (l: ProfitabilityLine) => l.share_of_revenue >= 0.05 || l.revenue >= 500;
  const offersMeaningful = offersWithRevenue.filter(meaningful);
  const clientsMeaningful = clientsWithRevenue.filter(meaningful);

  const byMargin = (a: ProfitabilityLine, b: ProfitabilityLine) => b.gross_margin - a.gross_margin;
  const bestOffer = [...offersMeaningful].sort(byMargin)[0] ?? null;
  const worstOffer = [...offersMeaningful].sort((a, b) => a.gross_margin - b.gross_margin)[0] ?? null;
  const bestClient = [...clientsMeaningful].sort(byMargin)[0] ?? null;
  const worstClient = [...clientsMeaningful].sort((a, b) => a.gross_margin - b.gross_margin)[0] ?? null;

  return {
    window,
    period_start: start,
    period_end: end,
    total_revenue,
    attributed_revenue: offerAttributedRevenue,
    unattributed_revenue: Math.max(0, total_revenue - offerAttributedRevenue),
    total_labor_cost,
    attributed_labor_cost: offerAttributedLabor,
    total_expense_cost,
    attributed_expense_cost: 0,
    total_gross_profit,
    total_gross_margin,
    offers: offerBuild.lines,
    clients: clientBuild.lines,
    best_offer: bestOffer,
    worst_offer: worstOffer === bestOffer ? null : worstOffer,
    best_client: bestClient,
    worst_client: worstClient === bestClient ? null : worstClient,
  };
}