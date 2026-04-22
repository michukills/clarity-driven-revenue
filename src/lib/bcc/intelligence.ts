import type { BccDataset, WeeklyCheckin } from "./types";
import type { Metrics } from "./engine";

/* ============================================================================
   P3 Pass B — Business Control Intelligence

   Layered on top of the P2 engine. Adds:
     - Weekly buckets derived from base entries
     - Trend awareness (this week vs prior week vs trailing 4-week avg)
     - Repeated-blocker detection from weekly_checkins
     - 8 typed insight signals
     - "What to fix first" prioritization
     - Data-quality / confidence framing

   Pure functions. No I/O. No UI imports. Safe to call repeatedly.
   ========================================================================== */

export type Trend = "up" | "down" | "flat";
export type Confidence = "high" | "medium" | "low";
export type InsightSeverity = "ok" | "watch" | "warn" | "critical";
export type InsightCategory =
  | "revenue_stability"
  | "concentration"
  | "pipeline"
  | "expense_pressure"
  | "payroll_labor"
  | "cash_risk"
  | "owner_dependency"
  | "repeated_blocker";

export interface WeekRollup {
  weekStart: string;
  weekEnd: string;
  revenue: number;
  expenses: number;
  payroll: number;
  netCash: number;
  /** linked weekly_checkins row for this week, latest wins */
  checkin?: WeeklyCheckin | null;
}

export interface TrendComparison {
  current: number;
  prior: number | null;
  trailing4Avg: number | null;
  vsPrior: { delta: number; pct: number } | null;
  vsAvg: { delta: number; pct: number } | null;
  trend: Trend;
}

export interface Insight {
  key: InsightCategory;
  title: string;
  severity: InsightSeverity;
  signal: string;
  meaning: string;
  action: string;
  confidence: Confidence;
  /** higher = more urgent for fix-first ordering */
  priority: number;
  /** approximate dollar impact when known */
  dollarImpact?: number;
  missingDataNote?: string;
}

/* ----------------------------- Weekly rollups ---------------------------- */

export function buildWeekRollups(d: BccDataset): WeekRollup[] {
  const buckets = new Map<string, WeekRollup>();
  const ensure = (date: string) => {
    const ws = weekStart(date);
    const we = weekEnd(date);
    if (!buckets.has(ws)) {
      buckets.set(ws, {
        weekStart: ws,
        weekEnd: we,
        revenue: 0,
        expenses: 0,
        payroll: 0,
        netCash: 0,
        checkin: null,
      });
    }
    return buckets.get(ws)!;
  };

  d.revenue.forEach((r) => {
    if (!r.entry_date) return;
    if (r.status === "collected") ensure(r.entry_date).revenue += Number(r.amount) || 0;
  });
  d.expenses.forEach((e) => {
    if (e.entry_date) ensure(e.entry_date).expenses += Number(e.amount) || 0;
  });
  d.payroll.forEach((p) => {
    const date = p.pay_period_end || p.pay_period_start;
    if (date) ensure(date).payroll += Number(p.total_payroll_cost || p.gross_pay || 0);
  });
  d.cashflow.forEach((c) => {
    if (!c.entry_date) return;
    const sign = c.direction === "cash_in" ? 1 : -1;
    ensure(c.entry_date).netCash += sign * (Number(c.amount) || 0);
  });

  // Attach the matching weekly_checkin (already deduped to latest per week
  // by useClientRevenueTrackerData). Match on week_end falling inside bucket.
  (d.weekly_checkins || []).forEach((c) => {
    if (!c.week_end) return;
    const bucket = ensure(c.week_end);
    bucket.checkin = c;
  });

  return Array.from(buckets.values()).sort((a, b) =>
    a.weekStart < b.weekStart ? 1 : -1,
  );
}

/* ------------------------------ Trend math ------------------------------- */

export function compareTrend(
  weeks: WeekRollup[],
  selector: (w: WeekRollup) => number,
): TrendComparison {
  const current = weeks[0] ? selector(weeks[0]) : 0;
  const prior = weeks[1] ? selector(weeks[1]) : null;
  const trailing = weeks.slice(1, 5).map(selector);
  const trailing4Avg = trailing.length
    ? trailing.reduce((a, b) => a + b, 0) / trailing.length
    : null;

  const vsPrior =
    prior !== null
      ? { delta: current - prior, pct: prior !== 0 ? ((current - prior) / Math.abs(prior)) * 100 : 0 }
      : null;
  const vsAvg =
    trailing4Avg !== null
      ? {
          delta: current - trailing4Avg,
          pct: trailing4Avg !== 0 ? ((current - trailing4Avg) / Math.abs(trailing4Avg)) * 100 : 0,
        }
      : null;

  const ref = vsAvg ?? vsPrior;
  const trend: Trend = !ref || Math.abs(ref.pct) < 5 ? "flat" : ref.delta > 0 ? "up" : "down";
  return { current, prior, trailing4Avg, vsPrior, vsAvg, trend };
}

/* ----------------------- Repeated-blocker detection ---------------------- */

export interface RepeatedBlocker {
  type: "process" | "people" | "sales" | "cash" | "owner";
  label: string;
  weeks: number;
  latestNote: string;
}

export function detectRepeatedBlockers(weeks: WeekRollup[]): RepeatedBlocker[] {
  // Look at the trailing 4 weeks (current + 3 prior).
  const recent = weeks.slice(0, 4).map((w) => w.checkin).filter(Boolean) as WeeklyCheckin[];
  if (recent.length < 2) return [];

  const buckets: { type: RepeatedBlocker["type"]; label: string; pick: (c: WeeklyCheckin) => string | null }[] = [
    { type: "process", label: "Process bottleneck", pick: (c) => nz(c.process_blocker) },
    { type: "people",  label: "People bottleneck",  pick: (c) => nz(c.people_blocker) },
    { type: "sales",   label: "Sales bottleneck",   pick: (c) => nz(c.sales_blocker) },
    { type: "cash",    label: "Cash bottleneck",    pick: (c) => nz(c.cash_blocker) },
    { type: "owner",   label: "Owner overload",     pick: (c) => nz(c.owner_bottleneck) },
  ];

  const out: RepeatedBlocker[] = [];
  for (const b of buckets) {
    const hits = recent.map(b.pick).filter((x): x is string => !!x);
    if (hits.length >= 2) {
      out.push({ type: b.type, label: b.label, weeks: hits.length, latestNote: hits[0] });
    }
  }
  return out;
}

function nz(s: string | null | undefined): string | null {
  if (!s) return null;
  const t = s.trim();
  return t ? t : null;
}

/* --------------------------- Data quality ------------------------------- */

export interface DataQuality {
  weeksLogged: number;
  hasAdvanced: boolean;
  confidence: Confidence;
  note: string;
}

export function assessDataQuality(weeks: WeekRollup[]): DataQuality {
  const weeksLogged = weeks.length;
  const hasAdvanced = weeks.some((w) => !!w.checkin);
  let confidence: Confidence = "low";
  if (weeksLogged >= 4 && hasAdvanced) confidence = "high";
  else if (weeksLogged >= 2) confidence = "medium";

  let note = "";
  if (weeksLogged === 0) {
    note = "Insights are not yet generated — add a weekly entry to start the report.";
  } else if (weeksLogged === 1) {
    note = "Only one week of data is available, so trend signals are limited. Save next week's entry to unlock comparison.";
  } else if (!hasAdvanced) {
    note = "Basic numbers are present, but advanced detail (pipeline, AR aging, blockers) hasn't been entered. Add detail in the weekly check-in to deepen insight.";
  } else if (weeksLogged < 4) {
    note = `Trend signals use ${weeksLogged} weeks of history. Insight strength grows past 4 weeks.`;
  } else {
    note = "Insight is being generated from a healthy trailing window of weekly check-ins.";
  }
  return { weeksLogged, hasAdvanced, confidence, note };
}

/* --------------------------- Insight builders --------------------------- */

export interface InsightContext {
  m: Metrics;
  data: BccDataset;
  weeks: WeekRollup[];
  revenueTrend: TrendComparison;
  expenseTrend: TrendComparison;
  cashTrend: TrendComparison;
  blockers: RepeatedBlocker[];
  quality: DataQuality;
}

export function buildInsightContext(m: Metrics, data: BccDataset): InsightContext {
  const weeks = buildWeekRollups(data);
  return {
    m,
    data,
    weeks,
    revenueTrend: compareTrend(weeks, (w) => w.revenue),
    expenseTrend: compareTrend(weeks, (w) => w.expenses),
    cashTrend: compareTrend(weeks, (w) => w.netCash),
    blockers: detectRepeatedBlockers(weeks),
    quality: assessDataQuality(weeks),
  };
}

const fmtMoney = (n: number) =>
  `$${Math.round(Math.abs(n)).toLocaleString()}${n < 0 ? " (out)" : ""}`;
const fmtPct = (n: number) => `${n.toFixed(0)}%`;

export function buildInsights(ctx: InsightContext): Insight[] {
  const out: Insight[] = [];
  const { m, weeks, revenueTrend, expenseTrend, cashTrend, blockers, quality } = ctx;
  const latest = weeks[0];
  const checkin = latest?.checkin || null;
  const conf: Confidence = quality.confidence;

  /* 1. Revenue stability */
  {
    let severity: InsightSeverity = "ok";
    let signal = "Revenue is consistent week-over-week.";
    let action = "Maintain current sales and delivery cadence.";
    if (!latest) {
      severity = "watch";
      signal = "No revenue data yet for this week.";
      action = "Add this week's collected revenue in the check-in.";
    } else if (revenueTrend.vsAvg && revenueTrend.vsAvg.pct <= -20) {
      severity = "warn";
      signal = `Revenue is ${fmtMoney(revenueTrend.current)} this week — ${fmtPct(Math.abs(revenueTrend.vsAvg.pct))} below the 4-week average (${fmtMoney(revenueTrend.trailing4Avg ?? 0)}).`;
      action = "Investigate which service or client drove the drop before adding new spend.";
    } else if (revenueTrend.vsPrior && revenueTrend.vsPrior.pct <= -15) {
      severity = "watch";
      signal = `Revenue dropped ${fmtPct(Math.abs(revenueTrend.vsPrior.pct))} vs last week.`;
      action = "Confirm the dip is timing, not demand. Compare to your trailing average next week.";
    } else if (revenueTrend.vsAvg && revenueTrend.vsAvg.pct >= 20) {
      signal = `Revenue is ${fmtPct(revenueTrend.vsAvg.pct)} above the 4-week average.`;
      action = "Confirm the lift came from sustainable activity, not a one-off job.";
    } else if (revenueTrend.vsPrior) {
      signal = `Revenue ${revenueTrend.trend === "up" ? "rose" : revenueTrend.trend === "down" ? "fell" : "held"} vs last week (${fmtMoney(revenueTrend.current)} vs ${fmtMoney(revenueTrend.prior ?? 0)}).`;
    }
    out.push({
      key: "revenue_stability",
      title: "Revenue stability",
      severity,
      signal,
      meaning:
        "Revenue stability tells you whether your weekly sales hold up across normal swings, or whether one week is hiding a problem.",
      action,
      confidence: conf,
      priority: severity === "warn" ? 70 : severity === "watch" ? 40 : 10,
    });
  }

  /* 2. Concentration risk */
  {
    const top = checkin?.top_clients?.[0];
    const topAmount = top ? Number(top.amount) || 0 : 0;
    const collected = revenueTrend.current;
    const share = collected > 0 && topAmount > 0 ? (topAmount / collected) * 100 : m.topClientShare;
    let severity: InsightSeverity = "ok";
    let signal = "No concentration risk detected this week.";
    let action = "Keep prospect mix balanced.";
    let missing: string | undefined;
    if (!checkin?.top_clients?.length && m.topClientShare === 0) {
      severity = "watch";
      signal = "Concentration risk cannot be evaluated yet.";
      action = "Add the top 3 clients in the weekly check-in's revenue detail.";
      missing = "Top-client breakdown was not entered.";
    } else if (share > 50) {
      severity = "warn";
      signal = `One client/job represents ${fmtPct(share)} of this week's revenue.`;
      action = "Identify two next-anchor clients to reduce single-account dependency.";
    } else if (share > 35) {
      severity = "watch";
      signal = `Top client is ${fmtPct(share)} of this week's revenue.`;
      action = "Watch concentration trend over the next 4 weeks.";
    } else {
      signal = `Top client is ${fmtPct(share)} of revenue — within healthy range.`;
    }
    out.push({
      key: "concentration",
      title: "Client concentration risk",
      severity,
      signal,
      meaning:
        "When one client drives most revenue, losing them destabilizes the business. RGS treats >50% as elevated risk.",
      action,
      confidence: conf,
      priority: severity === "warn" ? 75 : severity === "watch" ? 35 : 10,
      missingDataNote: missing,
    });
  }

  /* 3. Pipeline risk */
  {
    const conf2 = checkin?.pipeline_confidence || null;
    const lostReasons = checkin?.lost_deal_reasons?.length || 0;
    let severity: InsightSeverity = "ok";
    let signal = "Pipeline confidence is steady.";
    let action = "Maintain outbound and follow-up cadence.";
    let missing: string | undefined;
    if (!checkin || (!conf2 && lostReasons === 0 && !checkin.best_quality_lead_source)) {
      severity = "watch";
      signal = "Pipeline risk cannot be evaluated yet.";
      action = "Enter pipeline confidence and lost-deal reasons in the check-in.";
      missing = "Sales/Pipeline detail was not entered.";
    } else if (conf2 === "low") {
      severity = "warn";
      signal = "Pipeline confidence was reported as low this week.";
      action = "Review lead source quality and quote-to-close conversion before forecasting next month.";
    } else if (lostReasons >= 2) {
      severity = "watch";
      signal = `${lostReasons} lost-deal reasons logged this week.`;
      action = "Look for a pattern across lost deals (price, timing, no response).";
    } else if (conf2 === "high") {
      signal = "Pipeline confidence reported as high.";
    } else {
      signal = `Pipeline confidence: ${conf2 || "medium"}.`;
    }
    out.push({
      key: "pipeline",
      title: "Sales pipeline risk",
      severity,
      signal,
      meaning:
        "Pipeline weakness shows up in revenue 2–4 weeks later. Catching it early lets you act before the dip arrives.",
      action,
      confidence: conf,
      priority: severity === "warn" ? 65 : severity === "watch" ? 30 : 10,
      missingDataNote: missing,
    });
  }

  /* 4. Expense pressure */
  {
    let severity: InsightSeverity = "ok";
    let signal = `Operating expenses are ${fmtPct(m.expenseRatio)} of revenue.`;
    let action = "Continue current expense discipline.";
    if (m.totalRevenue === 0) {
      severity = "watch";
      signal = "Expense pressure cannot be evaluated without revenue.";
      action = "Add this week's revenue so the ratio can be calculated.";
    } else if (m.expenseRatio > 70) {
      severity = "critical";
      signal = `Operating expenses are ${fmtPct(m.expenseRatio)} of revenue.`;
      action = "Pause new spend. Review the top three expense categories this week.";
    } else if (m.expenseRatio > 55) {
      severity = "warn";
      signal = `Operating expenses are ${fmtPct(m.expenseRatio)} of revenue — above healthy range.`;
      action = "Identify which costs are fixed, variable, or avoidable this quarter.";
    } else if (expenseTrend.vsAvg && expenseTrend.vsAvg.pct >= 25) {
      severity = "watch";
      signal = `Expenses are ${fmtPct(expenseTrend.vsAvg.pct)} above the 4-week average.`;
      action = "Confirm the spike is one-time, not a new run-rate.";
    }
    out.push({
      key: "expense_pressure",
      title: "Expense pressure",
      severity,
      signal,
      meaning:
        "When expenses outpace revenue growth, profit erodes even when the top line looks healthy.",
      action,
      confidence: conf,
      priority: severity === "critical" ? 95 : severity === "warn" ? 70 : severity === "watch" ? 40 : 10,
    });
  }

  /* 5. Payroll / labor pressure */
  {
    const totalLabor = m.payrollCost + m.laborCost;
    let severity: InsightSeverity = "ok";
    let signal = `Labor consumes ${fmtPct(m.laborPctRevenue)} of revenue.`;
    let action = "Maintain current labor scheduling.";
    let missing: string | undefined;
    if (totalLabor === 0) {
      severity = "watch";
      signal = "No payroll/labor data entered.";
      action = "Enter weekly payroll totals in the check-in to unlock this signal.";
      missing = "Payroll totals were not entered.";
    } else if (m.totalRevenue === 0) {
      severity = "watch";
      signal = "Labor ratio cannot be evaluated without revenue.";
      action = "Add this week's collected revenue.";
    } else if (m.laborPctRevenue > 60) {
      severity = "critical";
      signal = `Labor consumes ${fmtPct(m.laborPctRevenue)} of revenue.`;
      action = "Review scheduling, billable vs non-billable hours, and pricing before adding work.";
    } else if (m.laborPctRevenue > 45) {
      severity = "warn";
      signal = `Labor consumes ${fmtPct(m.laborPctRevenue)} of revenue — above sustainable range for most service businesses.`;
      action = "Compare billable vs non-billable hours to identify capacity drag.";
    } else if (checkin?.utilization_pct != null && checkin.utilization_pct < 50) {
      severity = "watch";
      signal = `Utilization reported at ${fmtPct(checkin.utilization_pct)} this week.`;
      action = "Low utilization indicates capacity is being paid for but not used.";
    }
    out.push({
      key: "payroll_labor",
      title: "Payroll & labor load",
      severity,
      signal,
      meaning:
        "Labor is usually the largest controllable cost. Letting it drift compresses margin quickly.",
      action,
      confidence: conf,
      priority: severity === "critical" ? 90 : severity === "warn" ? 75 : severity === "watch" ? 35 : 10,
      missingDataNote: missing,
    });
  }

  /* 6. Cash risk */
  {
    const aging = checkin
      ? (checkin.ar_61_90 ?? 0) + (checkin.ar_90_plus ?? 0)
      : 0;
    const cashConcern = checkin?.cash_concern_level || null;
    const obligations30 = checkin?.obligations_next_30 ?? null;
    const expectedIn30 = checkin?.expected_inflows_next_30 ?? null;
    let severity: InsightSeverity = "ok";
    let signal = `Net cash this week: ${fmtMoney(m.netCash)}.`;
    let action = "Maintain weekly cash check-ins.";
    if (cashConcern === "critical" || (m.netCash < 0 && Math.abs(m.netCash) > m.totalRevenue * 0.2)) {
      severity = "critical";
      signal = "Cash position is critical this week.";
      action = "Match upcoming receivables against next-30-day obligations and defer non-essential spend.";
    } else if (m.netCash < 0 || cashConcern === "watch" || aging > 0) {
      severity = "warn";
      const parts: string[] = [];
      if (m.netCash < 0) parts.push(`net cash is ${fmtMoney(m.netCash)}`);
      if (aging > 0) parts.push(`${fmtMoney(aging)} sitting in 61+ day AR`);
      if (cashConcern === "watch") parts.push("owner flagged cash concern");
      signal = `Cash risk: ${parts.join(", ")}.`;
      action = "Run collection follow-up this week and review the next-30-day obligation list.";
    } else if (
      obligations30 != null &&
      expectedIn30 != null &&
      obligations30 > expectedIn30
    ) {
      severity = "watch";
      signal = `Next-30-day obligations (${fmtMoney(obligations30)}) exceed expected inflows (${fmtMoney(expectedIn30)}).`;
      action = "Identify which obligations can be deferred and which receivables can be accelerated.";
    } else if (m.receivablesOverdue > 0) {
      severity = "watch";
      signal = `${fmtMoney(m.receivablesOverdue)} in receivables is overdue.`;
      action = "Prioritize collection on overdue invoices before pursuing new spend.";
    }
    out.push({
      key: "cash_risk",
      title: "Cash & receivables risk",
      severity,
      signal,
      meaning:
        "Sustained negative cash flow or aging receivables create pressure on payroll and vendors — even when the P&L looks fine.",
      action,
      confidence: conf,
      priority: severity === "critical" ? 100 : severity === "warn" ? 80 : severity === "watch" ? 45 : 10,
      dollarImpact: aging > 0 ? aging : undefined,
    });
  }

  /* 7. Owner dependency */
  {
    const ownerHrs = checkin?.owner_hours ?? null;
    const ownerOnly = checkin?.owner_only_decisions || null;
    const ownerBlocker = checkin?.owner_bottleneck || null;
    const capacity = checkin?.capacity_status || null;
    let severity: InsightSeverity = "ok";
    let signal = "Owner load looks balanced this week.";
    let action = "Continue delegating where possible.";
    let missing: string | undefined;
    if (!checkin || (ownerHrs == null && !ownerOnly && !ownerBlocker && !capacity)) {
      severity = "watch";
      signal = "Owner-load signal cannot be evaluated yet.";
      action = "Use the Payroll & Labor advanced section to log owner hours and bottlenecks.";
      missing = "Owner-load detail was not entered.";
    } else if (capacity === "over" || (ownerHrs != null && ownerHrs >= 60)) {
      severity = "warn";
      signal = `Owner is over capacity${ownerHrs != null ? ` (${ownerHrs} hrs this week)` : ""}.`;
      action = "Identify one delegatable workflow this week to reduce owner-only decisions.";
    } else if (ownerBlocker) {
      severity = "watch";
      signal = `Owner bottleneck reported: ${truncate(ownerBlocker, 90)}`;
      action = "Document the bottleneck step and decide who else could own it.";
    }
    out.push({
      key: "owner_dependency",
      title: "Owner dependency",
      severity,
      signal,
      meaning:
        "When growth depends on the owner being involved in every decision, the business cannot scale or rest.",
      action,
      confidence: conf,
      priority: severity === "warn" ? 60 : severity === "watch" ? 30 : 10,
      missingDataNote: missing,
    });
  }

  /* 8. Repeated blocker */
  {
    if (blockers.length === 0) {
      out.push({
        key: "repeated_blocker",
        title: "Repeated blockers",
        severity: "ok",
        signal: "No repeated blockers detected in the trailing 4 weeks.",
        meaning:
          "A blocker that repeats across multiple weeks usually points to a structural issue, not a one-off event.",
        action: "Keep logging weekly blockers — pattern detection improves with history.",
        confidence: conf,
        priority: 5,
      });
    } else {
      const top = blockers[0];
      out.push({
        key: "repeated_blocker",
        title: "Repeated blocker pattern",
        severity: top.weeks >= 3 ? "warn" : "watch",
        signal: `${top.label} reported in ${top.weeks} of the last 4 weeks. Latest: "${truncate(top.latestNote, 100)}"`,
        meaning:
          "When the same area blocks the business multiple weeks in a row, the cause is structural and won't resolve on its own.",
        action:
          "Pick this blocker as your single focus next week. Treat it as a project, not a recurring complaint.",
        confidence: conf,
        priority: top.weeks >= 3 ? 85 : 50,
      });
    }
  }

  return out;
}

/* --------------------------- Fix-first ordering ------------------------- */

export function prioritizeFixFirst(insights: Insight[]): Insight[] {
  return [...insights]
    .filter((i) => i.severity !== "ok")
    .sort((a, b) => b.priority - a.priority);
}

/* ------------------------------ Date helpers ---------------------------- */

function weekStart(dateStr: string) {
  const d = new Date(dateStr);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
}
function weekEnd(dateStr: string) {
  const d = new Date(dateStr);
  const day = d.getDay();
  d.setDate(d.getDate() + (6 - day));
  return d.toISOString().slice(0, 10);
}
function truncate(s: string, n: number) {
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}