/* P11.3 — Report delta helpers.
 *
 * Computes a "What Changed" comparison between the current period and the
 * prior comparable period using BCC engine metrics.
 */

import { supabase } from "@/integrations/supabase/client";
import { computeMetrics, type Metrics } from "./engine";
import type { BccDataset } from "./types";

async function fetchDataset(
  customerId: string,
  start: string,
  end: string,
): Promise<BccDataset> {
  const [rev, exp, pay, lab, inv, cash, goals] = await Promise.all([
    supabase.from("revenue_entries").select("*").eq("customer_id", customerId)
      .gte("entry_date", start).lte("entry_date", end),
    supabase.from("expense_entries").select("*").eq("customer_id", customerId)
      .gte("entry_date", start).lte("entry_date", end),
    supabase.from("payroll_entries").select("*").eq("customer_id", customerId)
      .gte("pay_period_end", start).lte("pay_period_end", end),
    supabase.from("labor_entries").select("*").eq("customer_id", customerId)
      .gte("entry_date", start).lte("entry_date", end),
    supabase.from("invoice_entries").select("*").eq("customer_id", customerId)
      .gte("invoice_date", start).lte("invoice_date", end),
    supabase.from("cash_flow_entries").select("*").eq("customer_id", customerId)
      .gte("entry_date", start).lte("entry_date", end),
    supabase.from("business_goals").select("*").eq("customer_id", customerId),
  ]);
  return {
    revenue: ((rev.data as any) || []) as BccDataset["revenue"],
    expenses: ((exp.data as any) || []) as BccDataset["expenses"],
    payroll: ((pay.data as any) || []) as BccDataset["payroll"],
    labor: ((lab.data as any) || []) as BccDataset["labor"],
    invoices: ((inv.data as any) || []) as BccDataset["invoices"],
    cashflow: ((cash.data as any) || []) as BccDataset["cashflow"],
    goals: ((goals.data as any) || []) as BccDataset["goals"],
  };
}

function shiftPeriod(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  const lenDays = Math.round((e.getTime() - s.getTime()) / 86400000) + 1;
  const prevEnd = new Date(s);
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - lenDays + 1);
  return {
    prevStart: prevStart.toISOString().slice(0, 10),
    prevEnd: prevEnd.toISOString().slice(0, 10),
  };
}

export type DeltaDirection = "improved" | "worsened" | "flat";

export interface DeltaLine {
  label: string;
  direction: DeltaDirection;
  detail: string;
}

export interface ReportDelta {
  hasComparison: boolean;
  prevPeriodStart: string;
  prevPeriodEnd: string;
  improved: DeltaLine[];
  worsened: DeltaLine[];
  stable_risks: DeltaLine[];
}

const fmtMoney = (n: number) => `$${Math.round(Math.abs(n)).toLocaleString()}`;
const pctChange = (a: number, b: number) =>
  b === 0 ? (a === 0 ? 0 : 100) : ((a - b) / Math.abs(b)) * 100;

function classifyDelta(
  curr: number,
  prev: number,
  betterIsHigher: boolean,
  threshold = 5,
): DeltaDirection {
  const change = pctChange(curr, prev);
  if (Math.abs(change) < threshold) return "flat";
  const improved = betterIsHigher ? change > 0 : change < 0;
  return improved ? "improved" : "worsened";
}

function buildDelta(curr: Metrics, prev: Metrics): ReportDelta {
  const lines: DeltaLine[] = [];
  const push = (
    label: string,
    direction: DeltaDirection,
    detail: string,
  ) => lines.push({ label, direction, detail });

  // Revenue
  {
    const dir = classifyDelta(curr.totalRevenue, prev.totalRevenue, true, 5);
    const ch = pctChange(curr.totalRevenue, prev.totalRevenue);
    push(
      "Revenue",
      dir,
      `${fmtMoney(curr.totalRevenue)} vs ${fmtMoney(prev.totalRevenue)} (${ch >= 0 ? "+" : ""}${Math.round(ch)}%)`,
    );
  }
  // Margin
  {
    const diff = curr.profitMargin - prev.profitMargin;
    const dir: DeltaDirection =
      Math.abs(diff) < 1 ? "flat" : diff > 0 ? "improved" : "worsened";
    push(
      "Profit margin",
      dir,
      `${curr.profitMargin.toFixed(1)}% vs ${prev.profitMargin.toFixed(1)}% (${diff >= 0 ? "+" : ""}${diff.toFixed(1)} pts)`,
    );
  }
  // Overdue AR
  {
    const dir = classifyDelta(curr.receivablesOverdue, prev.receivablesOverdue, false, 10);
    push(
      "Overdue receivables",
      dir,
      `${fmtMoney(curr.receivablesOverdue)} vs ${fmtMoney(prev.receivablesOverdue)}`,
    );
  }
  // Net cash
  {
    const dir: DeltaDirection =
      curr.netCash >= 0 && prev.netCash < 0
        ? "improved"
        : curr.netCash < 0 && prev.netCash >= 0
        ? "worsened"
        : classifyDelta(curr.netCash, prev.netCash, true, 10);
    push(
      "Net cash",
      dir,
      `${curr.netCash < 0 ? "-" : ""}${fmtMoney(curr.netCash)} vs ${prev.netCash < 0 ? "-" : ""}${fmtMoney(prev.netCash)}`,
    );
  }
  // Expense ratio
  {
    const diff = curr.expenseRatio - prev.expenseRatio;
    const dir: DeltaDirection =
      Math.abs(diff) < 2 ? "flat" : diff < 0 ? "improved" : "worsened";
    push(
      "Expense ratio",
      dir,
      `${curr.expenseRatio.toFixed(0)}% vs ${prev.expenseRatio.toFixed(0)}%`,
    );
  }
  // Labor load
  {
    const diff = curr.laborPctRevenue - prev.laborPctRevenue;
    const dir: DeltaDirection =
      Math.abs(diff) < 2 ? "flat" : diff < 0 ? "improved" : "worsened";
    push(
      "Labor load",
      dir,
      `${curr.laborPctRevenue.toFixed(0)}% vs ${prev.laborPctRevenue.toFixed(0)}% of revenue`,
    );
  }

  const improved = lines.filter((l) => l.direction === "improved");
  const worsened = lines.filter((l) => l.direction === "worsened");

  // Stable risks: things that are flat AND remain risky.
  const stable_risks: DeltaLine[] = [];
  if (curr.receivablesOverdue > 0 && Math.abs(curr.receivablesOverdue - prev.receivablesOverdue) < prev.receivablesOverdue * 0.1) {
    stable_risks.push({
      label: "Overdue receivables",
      direction: "flat",
      detail: `${fmtMoney(curr.receivablesOverdue)} still outstanding (no material change).`,
    });
  }
  if (curr.profitMargin < 5 && Math.abs(curr.profitMargin - prev.profitMargin) < 1) {
    stable_risks.push({
      label: "Margin",
      direction: "flat",
      detail: `Margin still thin at ${curr.profitMargin.toFixed(1)}%.`,
    });
  }
  if (curr.netCash < 0 && prev.netCash < 0) {
    stable_risks.push({
      label: "Net cash",
      direction: "flat",
      detail: `Net cash remained negative across both periods.`,
    });
  }

  return {
    hasComparison: true,
    prevPeriodStart: "",
    prevPeriodEnd: "",
    improved,
    worsened,
    stable_risks,
  };
}

export async function buildReportDelta(
  customerId: string,
  periodStart: string,
  periodEnd: string,
): Promise<ReportDelta | null> {
  try {
    const { prevStart, prevEnd } = shiftPeriod(periodStart, periodEnd);
    const [currData, prevData] = await Promise.all([
      fetchDataset(customerId, periodStart, periodEnd),
      fetchDataset(customerId, prevStart, prevEnd),
    ]);
    const hasCurr = currData.revenue.length + currData.expenses.length + currData.invoices.length + currData.cashflow.length > 0;
    const hasPrev = prevData.revenue.length + prevData.expenses.length + prevData.invoices.length + prevData.cashflow.length > 0;
    if (!hasCurr || !hasPrev) return null;
    const curr = computeMetrics(currData);
    const prev = computeMetrics(prevData);
    const delta = buildDelta(curr, prev);
    delta.prevPeriodStart = prevStart;
    delta.prevPeriodEnd = prevEnd;
    return delta;
  } catch {
    return null;
  }
}
