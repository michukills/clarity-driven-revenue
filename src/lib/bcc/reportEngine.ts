import type { BccDataset } from "./types";
import { computeMetrics, computeHealth, detectDataGaps } from "./engine";
import {
  buildInsightContext,
  buildInsights,
  prioritizeFixFirst,
  type Insight,
} from "./intelligence";
import { buildLongHorizonAnalysis, summarizeLongTrend } from "./longTrend";
import type {
  RecommendedNextStep,
  ReportSection,
  ReportSnapshot,
  ReportType,
} from "./reportTypes";
import { REPORT_SCHEMA_VERSION } from "./reportTypes";

/* ------------------------------------------------------------------
   P4 Report Engine

   Pure functions. Filters the BccDataset to a date range and produces
   a frozen snapshot for storage in business_control_reports.report_data.

   Monthly  → trailing 4 calendar weeks containing period_end
   Quarterly → trailing 13 calendar weeks containing period_end
   ------------------------------------------------------------------ */

const fmtMoney = (n: number) =>
  `$${Math.round(Math.abs(n)).toLocaleString()}${n < 0 ? " (out)" : ""}`;
const fmtPct = (n: number) => `${n.toFixed(0)}%`;

function inRange(date: string | null | undefined, start: string, end: string): boolean {
  if (!date) return false;
  return date >= start && date <= end;
}

export function filterDataset(d: BccDataset, periodStart: string, periodEnd: string): BccDataset {
  return {
    revenue: d.revenue.filter((r) => inRange(r.entry_date, periodStart, periodEnd)),
    expenses: d.expenses.filter((e) => inRange(e.entry_date, periodStart, periodEnd)),
    payroll: d.payroll.filter((p) =>
      inRange(p.pay_period_end || p.pay_period_start, periodStart, periodEnd),
    ),
    labor: d.labor.filter((l) => inRange(l.entry_date, periodStart, periodEnd)),
    invoices: d.invoices.filter((i) => inRange(i.invoice_date, periodStart, periodEnd)),
    cashflow: d.cashflow.filter((c) => inRange(c.entry_date, periodStart, periodEnd)),
    goals: d.goals,
    weekly_checkins: (d.weekly_checkins || []).filter((w) =>
      inRange(w.week_end, periodStart, periodEnd),
    ),
  };
}

/** Suggest period_start/end given a report type and reference date (defaults today). */
export function defaultPeriod(reportType: ReportType, refDate = new Date()): { start: string; end: string } {
  const end = new Date(refDate);
  const start = new Date(end);
  start.setDate(start.getDate() - (reportType === "monthly" ? 28 : 91) + 1);
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

/* ------------------------- Recommended next step ------------------------- */

export function recommendReportNextStep(insights: Insight[]): {
  step: RecommendedNextStep;
  reason: string;
} {
  const fixFirst = prioritizeFixFirst(insights);
  const top = fixFirst[0];
  if (!top) {
    return {
      step: "Continue Monitoring",
      reason: "No critical issues detected. Maintain weekly check-ins.",
    };
  }
  // Map highest-severity insight to a next step
  switch (top.key) {
    case "cash_risk":
      return {
        step: "Cash Flow Review",
        reason: `Cash & receivables risk is the most pressing signal. ${top.signal}`,
      };
    case "expense_pressure":
    case "payroll_labor":
      return {
        step: "Diagnostic",
        reason: `Margin pressure detected. ${top.signal}`,
      };
    case "concentration":
    case "revenue_stability":
      return {
        step: "Revenue Leak Review",
        reason: `Revenue stability is the most pressing signal. ${top.signal}`,
      };
    case "owner_dependency":
      return {
        step: "Owner Dependency Review",
        reason: `Owner load is the most pressing signal. ${top.signal}`,
      };
    case "repeated_blocker":
      return {
        step: "Implementation",
        reason: `A blocker is recurring across weeks. ${top.signal}`,
      };
    case "pipeline":
      return {
        step: "Diagnostic",
        reason: `Pipeline weakness detected. ${top.signal}`,
      };
    default:
      return {
        step: "Continue Monitoring",
        reason: top.signal,
      };
  }
}

/* ----------------------------- Section builders -------------------------- */

function sevForInsight(i: Insight | undefined): ReportSection["severity"] | undefined {
  if (!i) return undefined;
  if (i.severity === "ok") return "ok";
  if (i.severity === "watch") return "watch";
  if (i.severity === "warn") return "warn";
  return "critical";
}

function insightSection(title: string, i: Insight | undefined): ReportSection {
  if (!i) {
    return {
      title,
      body: "Not enough data yet to evaluate this area. Continue weekly check-ins to unlock this signal.",
    };
  }
  return {
    title,
    body: `${i.signal} ${i.meaning}`,
    bullets: [`Suggested action: ${i.action}`, ...(i.missingDataNote ? [i.missingDataNote] : [])],
    severity: sevForInsight(i),
  };
}

function findInsight(insights: Insight[], key: Insight["key"]): Insight | undefined {
  return insights.find((i) => i.key === key);
}

/* -------------------------- Monthly snapshot ---------------------------- */

export function buildMonthlySnapshot(
  fullDataset: BccDataset,
  periodStart: string,
  periodEnd: string,
  customerLabel: string,
): ReportSnapshot {
  const data = filterDataset(fullDataset, periodStart, periodEnd);
  const m = computeMetrics(data);
  const health = computeHealth(m, data);
  const ctx = buildInsightContext(m, data);
  const insights = buildInsights(ctx);
  const fixFirst = prioritizeFixFirst(insights);
  const gaps = detectDataGaps(data);
  const next = recommendReportNextStep(insights);

  const weeksCovered = ctx.weeks.length;
  const advancedWeeks = ctx.weeks.filter((w) => !!w.checkin).length;

  const sections: ReportSection[] = [];

  sections.push({
    title: "Executive Summary",
    body:
      `Over the past month, the business registered as ${health.condition} (${health.overall}/100). ` +
      `Revenue collected: ${fmtMoney(m.totalRevenue)}. Expenses: ${fmtMoney(m.totalExpenses)}. ` +
      `Net cash movement: ${fmtMoney(m.netCash)}. ` +
      (fixFirst.length
        ? `${fixFirst.length} area${fixFirst.length === 1 ? "" : "s"} need attention this month.`
        : "No critical issues were detected this month."),
  });

  sections.push({
    title: "Business Health Score",
    body: `${health.overall}/100 — ${health.condition}.`,
    bullets: [
      `Revenue stability: ${fmtPct(m.recurringRevenuePct)} recurring share`,
      `Margin proxy: expenses ${fmtPct(m.expenseRatio)} of revenue`,
      `Labor load: ${fmtPct(m.laborPctRevenue)} of revenue`,
      ctx.quality.note,
    ],
  });

  sections.push(insightSection("Revenue Stability", findInsight(insights, "revenue_stability")));
  sections.push({
    title: "Revenue Leak Signals",
    body:
      m.overdueRevenue + m.receivablesOverdue > 0
        ? `Approximately ${fmtMoney(m.overdueRevenue + m.receivablesOverdue)} of earned revenue is not yet collected. Review collection cadence.`
        : "No active revenue leak signals this month.",
    severity: m.overdueRevenue + m.receivablesOverdue > 0 ? "watch" : "ok",
  });
  sections.push(insightSection("Expense Pressure", findInsight(insights, "expense_pressure")));
  sections.push(insightSection("Payroll / Labor Load", findInsight(insights, "payroll_labor")));
  sections.push(insightSection("Cash & Receivables Risk", findInsight(insights, "cash_risk")));
  sections.push(insightSection("Sales Pipeline Signals", findInsight(insights, "pipeline")));
  sections.push(insightSection("Owner Dependency Signals", findInsight(insights, "owner_dependency")));
  sections.push(insightSection("Repeated Blockers", findInsight(insights, "repeated_blocker")));

  // What improved / got worse — compare first half vs second half of weeks
  const halves = splitHalves(ctx.weeks);
  sections.push({
    title: "What Improved",
    body: halves.improved.length
      ? "These areas moved in a healthier direction this month:"
      : "No clear improvements detected this month.",
    bullets: halves.improved,
  });
  sections.push({
    title: "What Got Worse",
    body: halves.worsened.length
      ? "These areas trended in the wrong direction this month:"
      : "Nothing trended materially worse this month.",
    bullets: halves.worsened,
    severity: halves.worsened.length ? "watch" : undefined,
  });

  sections.push({
    title: "What Needs Attention Next Month",
    body: fixFirst.length === 0 ? "Continue current weekly cadence." : "Focus on the following items first:",
    bullets: fixFirst.slice(0, 3).map((i) => `${i.title}: ${i.action}`),
    severity: fixFirst[0] ? sevForInsight(fixFirst[0]) : undefined,
  });

  sections.push({
    title: "RGS Recommended Next Step",
    body: `${next.step}. ${next.reason}`,
  });

  sections.push({
    title: "Data Gaps / Confidence",
    body: `Insight confidence: ${ctx.quality.confidence}. ${ctx.quality.note}`,
    bullets: gaps.length ? gaps : ["No major data gaps."],
  });

  return {
    schemaVersion: REPORT_SCHEMA_VERSION,
    reportType: "monthly",
    periodStart,
    periodEnd,
    generatedAt: new Date().toISOString(),
    customerLabel,
    healthScore: health.overall,
    condition: health.condition,
    confidence: ctx.quality.confidence,
    confidenceNote: ctx.quality.note,
    recommendedNextStep: next.step,
    recommendationReason: next.reason,
    sections,
    meta: {
      weeksCovered,
      advancedWeeks,
      totalRevenue: m.totalRevenue,
      totalExpenses: m.totalExpenses,
      netCash: m.netCash,
    },
  };
}

/* ------------------------- Quarterly snapshot --------------------------- */

export function buildQuarterlySnapshot(
  fullDataset: BccDataset,
  periodStart: string,
  periodEnd: string,
  customerLabel: string,
): ReportSnapshot {
  const data = filterDataset(fullDataset, periodStart, periodEnd);
  const m = computeMetrics(data);
  const health = computeHealth(m, data);
  const ctx = buildInsightContext(m, data);
  const insights = buildInsights(ctx);
  const fixFirst = prioritizeFixFirst(insights);
  const next = recommendReportNextStep(insights);

  const weeksCovered = ctx.weeks.length;
  const advancedWeeks = ctx.weeks.filter((w) => !!w.checkin).length;

  // 13-week trend: split into early / mid / late thirds
  const thirds = splitThirds(ctx.weeks);

  const sections: ReportSection[] = [];

  sections.push({
    title: "13-Week Business Health Trend",
    body:
      `Overall condition this quarter: ${health.condition} (${health.overall}/100). ` +
      `Trailing ${weeksCovered} weeks of data analyzed.`,
    bullets: [
      `Early period revenue avg: ${fmtMoney(thirds.early.revenue)}`,
      `Mid period revenue avg: ${fmtMoney(thirds.mid.revenue)}`,
      `Recent period revenue avg: ${fmtMoney(thirds.late.revenue)}`,
    ],
  });

  sections.push({
    title: "Revenue Stability Trend",
    body: trendNarrative("Revenue", thirds.early.revenue, thirds.mid.revenue, thirds.late.revenue),
    severity: directionSeverity(thirds.early.revenue, thirds.late.revenue, true),
  });
  sections.push({
    title: "Margin / Expense Pressure Trend",
    body: trendNarrative("Expenses", thirds.early.expenses, thirds.mid.expenses, thirds.late.expenses, true),
    severity: directionSeverity(thirds.early.expenses, thirds.late.expenses, false),
  });
  sections.push({
    title: "Cash Trajectory",
    body: trendNarrative("Net cash", thirds.early.netCash, thirds.mid.netCash, thirds.late.netCash),
    severity: directionSeverity(thirds.early.netCash, thirds.late.netCash, true),
  });
  sections.push(insightSection("Receivables Trend", findInsight(insights, "cash_risk")));
  sections.push(insightSection("Labor / Capacity Trend", findInsight(insights, "payroll_labor")));
  sections.push(insightSection("Owner Dependency Trend", findInsight(insights, "owner_dependency")));

  sections.push({
    title: "Repeated Blockers",
    body: ctx.blockers.length === 0
      ? "No blockers repeated multiple weeks this quarter."
      : "These patterns surfaced repeatedly this quarter:",
    bullets: ctx.blockers.map((b) => `${b.label} — appeared in ${b.weeks} of last 4 weeks. Latest: ${b.latestNote}`),
    severity: ctx.blockers.length ? "watch" : "ok",
  });

  sections.push({
    title: "Where the Business Matured",
    body: thirds.matured.length
      ? "These areas show greater stability now than at the start of the quarter:"
      : "No clear maturation signals yet.",
    bullets: thirds.matured,
  });

  sections.push({
    title: "Where the Business Is Still Fragile",
    body: thirds.fragile.length
      ? "These areas still need structural attention:"
      : "No structural fragility detected this quarter.",
    bullets: thirds.fragile,
    severity: thirds.fragile.length ? "warn" : undefined,
  });

  sections.push({
    title: "RGS Recommended Next Engagement",
    body: `${next.step}. ${next.reason}`,
    bullets: fixFirst.slice(0, 3).map((i) => `${i.title}: ${i.action}`),
  });

  return {
    schemaVersion: REPORT_SCHEMA_VERSION,
    reportType: "quarterly",
    periodStart,
    periodEnd,
    generatedAt: new Date().toISOString(),
    customerLabel,
    healthScore: health.overall,
    condition: health.condition,
    confidence: ctx.quality.confidence,
    confidenceNote: ctx.quality.note,
    recommendedNextStep: next.step,
    recommendationReason: next.reason,
    sections,
    trendTable: [
      {
        label: "Revenue",
        values: [
          { label: "Early", value: thirds.early.revenue },
          { label: "Mid", value: thirds.mid.revenue },
          { label: "Recent", value: thirds.late.revenue },
        ],
      },
      {
        label: "Expenses",
        values: [
          { label: "Early", value: thirds.early.expenses },
          { label: "Mid", value: thirds.mid.expenses },
          { label: "Recent", value: thirds.late.expenses },
        ],
      },
      {
        label: "Net cash",
        values: [
          { label: "Early", value: thirds.early.netCash, signed: true },
          { label: "Mid", value: thirds.mid.netCash, signed: true },
          { label: "Recent", value: thirds.late.netCash, signed: true },
        ],
      },
    ],
    meta: {
      weeksCovered,
      advancedWeeks,
      totalRevenue: m.totalRevenue,
      totalExpenses: m.totalExpenses,
      netCash: m.netCash,
    },
  };
}

/* ------------------------------ helpers --------------------------------- */

type Bucket = { revenue: number; expenses: number; netCash: number };

function avgBucket(weeks: { revenue: number; expenses: number; netCash: number }[]): Bucket {
  if (weeks.length === 0) return { revenue: 0, expenses: 0, netCash: 0 };
  const sum = weeks.reduce(
    (a, w) => ({
      revenue: a.revenue + w.revenue,
      expenses: a.expenses + w.expenses,
      netCash: a.netCash + w.netCash,
    }),
    { revenue: 0, expenses: 0, netCash: 0 },
  );
  return {
    revenue: sum.revenue / weeks.length,
    expenses: sum.expenses / weeks.length,
    netCash: sum.netCash / weeks.length,
  };
}

function splitHalves(weeks: { revenue: number; expenses: number; netCash: number }[]) {
  // weeks are sorted newest-first; second half is OLDER
  const mid = Math.floor(weeks.length / 2);
  const recent = avgBucket(weeks.slice(0, Math.max(1, mid)));
  const older = avgBucket(weeks.slice(mid));
  const improved: string[] = [];
  const worsened: string[] = [];
  if (recent.revenue > older.revenue * 1.05) improved.push(`Revenue averaged ${fmtMoney(recent.revenue)} recently vs ${fmtMoney(older.revenue)} earlier.`);
  if (recent.revenue < older.revenue * 0.95) worsened.push(`Revenue averaged ${fmtMoney(recent.revenue)} recently vs ${fmtMoney(older.revenue)} earlier.`);
  if (recent.expenses < older.expenses * 0.95) improved.push(`Expenses came down on average (${fmtMoney(older.expenses)} → ${fmtMoney(recent.expenses)}).`);
  if (recent.expenses > older.expenses * 1.05) worsened.push(`Expenses rose on average (${fmtMoney(older.expenses)} → ${fmtMoney(recent.expenses)}).`);
  if (recent.netCash > older.netCash) improved.push(`Net cash improved (${fmtMoney(older.netCash)} → ${fmtMoney(recent.netCash)}).`);
  if (recent.netCash < older.netCash) worsened.push(`Net cash trended weaker (${fmtMoney(older.netCash)} → ${fmtMoney(recent.netCash)}).`);
  return { improved, worsened };
}

function splitThirds(weeks: { revenue: number; expenses: number; netCash: number }[]) {
  // weeks newest-first → late = first third, mid = middle, early = last third
  const n = weeks.length;
  if (n === 0) {
    const empty = { revenue: 0, expenses: 0, netCash: 0 };
    return { early: empty, mid: empty, late: empty, matured: [], fragile: [] };
  }
  const t = Math.max(1, Math.floor(n / 3));
  const late = avgBucket(weeks.slice(0, t));
  const mid = avgBucket(weeks.slice(t, t * 2));
  const early = avgBucket(weeks.slice(t * 2));
  const matured: string[] = [];
  const fragile: string[] = [];
  if (late.revenue > early.revenue * 1.1) matured.push("Revenue base strengthened across the quarter.");
  if (late.expenses < early.expenses * 0.9) matured.push("Expense discipline improved across the quarter.");
  if (late.netCash > early.netCash) matured.push("Cash position improved across the quarter.");
  if (late.revenue < early.revenue * 0.9) fragile.push("Revenue base weakened across the quarter.");
  if (late.expenses > early.expenses * 1.1) fragile.push("Expense load grew across the quarter.");
  if (late.netCash < 0 && early.netCash >= 0) fragile.push("Cash position turned negative late in the quarter.");
  return { early, mid, late, matured, fragile };
}

function trendNarrative(
  label: string,
  early: number,
  mid: number,
  late: number,
  invert = false,
) {
  const dir =
    late > early * 1.05 ? "rose"
    : late < early * 0.95 ? "fell"
    : "held steady";
  const verdict = invert
    ? dir === "rose" ? "which is a pressure signal" : dir === "fell" ? "which is a positive signal" : ""
    : dir === "rose" ? "which is a positive signal" : dir === "fell" ? "which is a pressure signal" : "";
  return `${label} ${dir} across the quarter (${fmtMoney(early)} → ${fmtMoney(mid)} → ${fmtMoney(late)})${verdict ? `, ${verdict}` : ""}.`;
}

function directionSeverity(early: number, late: number, higherIsBetter: boolean): ReportSection["severity"] {
  if (early === 0 && late === 0) return undefined;
  const ratio = early === 0 ? 1 : late / early;
  const better = higherIsBetter ? ratio > 1.05 : ratio < 0.95;
  const worse = higherIsBetter ? ratio < 0.85 : ratio > 1.15;
  return worse ? "warn" : better ? "ok" : "watch";
}
