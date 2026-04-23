/* P11.1 — BCC → Insight Signal Bus emitters.
 *
 * Reads a customer's structured BCC data for the report period (and the
 * prior period of equal length), runs threshold + trend logic, and emits
 * a small number of structured signals into `customer_insight_signals`.
 *
 * Principles:
 *   - One aggregate signal per concern, not one per row.
 *   - Only emit when the data is materially conclusive.
 *   - All writes go through `recordInsightSignals`, which already honors
 *     `learning_enabled` per-customer learning controls.
 *   - This module never writes to `rgs_pattern_intelligence`.
 */

import { supabase } from "@/integrations/supabase/client";
import type { BccDataset } from "@/lib/bcc/types";
import { computeMetrics, type Metrics } from "@/lib/bcc/engine";
import {
  recordInsightSignals,
  type InsightSignalInput,
} from "./insightSignals";

/* ---------------------- data loading ---------------------- */

async function fetchPeriodDataset(
  customerId: string,
  start: string,
  end: string,
): Promise<BccDataset> {
  const [rev, exp, pay, lab, inv, cash, goals] = await Promise.all([
    supabase
      .from("revenue_entries")
      .select("*")
      .eq("customer_id", customerId)
      .gte("entry_date", start)
      .lte("entry_date", end),
    supabase
      .from("expense_entries")
      .select("*")
      .eq("customer_id", customerId)
      .gte("entry_date", start)
      .lte("entry_date", end),
    supabase
      .from("payroll_entries")
      .select("*")
      .eq("customer_id", customerId)
      .gte("pay_period_end", start)
      .lte("pay_period_end", end),
    supabase
      .from("labor_entries")
      .select("*")
      .eq("customer_id", customerId)
      .gte("entry_date", start)
      .lte("entry_date", end),
    supabase
      .from("invoice_entries")
      .select("*")
      .eq("customer_id", customerId)
      .gte("invoice_date", start)
      .lte("invoice_date", end),
    supabase
      .from("cash_flow_entries")
      .select("*")
      .eq("customer_id", customerId)
      .gte("entry_date", start)
      .lte("entry_date", end),
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

/* ---------------------- helpers ---------------------- */

function shiftPeriod(
  start: string,
  end: string,
): { prevStart: string; prevEnd: string } {
  const s = new Date(start);
  const e = new Date(end);
  const lenDays =
    Math.round((e.getTime() - s.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  const prevEnd = new Date(s);
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - lenDays + 1);
  return {
    prevStart: prevStart.toISOString().slice(0, 10),
    prevEnd: prevEnd.toISOString().slice(0, 10),
  };
}

function pctChange(curr: number, prev: number): number {
  if (prev === 0) return curr === 0 ? 0 : 100;
  return ((curr - prev) / Math.abs(prev)) * 100;
}

function fmtMoney(n: number): string {
  return `$${Math.round(Math.abs(n)).toLocaleString()}`;
}

/* ---------------------- signal builders ---------------------- */

interface BuildArgs {
  customerId: string;
  reportId?: string | null;
  periodEnd: string;
  curr: Metrics;
  prev: Metrics | null;
  hasCurrData: boolean;
  hasPrevData: boolean;
}

function buildBccSignals(args: BuildArgs): InsightSignalInput[] {
  const { customerId, reportId, periodEnd, curr, prev } = args;
  const out: InsightSignalInput[] = [];
  const base = {
    customer_id: customerId,
    signal_source: "business_control_report" as const,
    source_table: "business_control_reports" as const,
    source_id: reportId ?? null,
    occurred_at: new Date(periodEnd).toISOString(),
  };

  /* 1. Cash pressure (current-period structural). */
  const netCash = curr.netCash;
  const negativeNetCash = netCash < 0;
  const expectedSlippage =
    curr.expectedCashIn > 0 &&
    curr.cashIn < curr.expectedCashIn * 0.7; // received <70% of expected
  const burnVsCash =
    curr.cashRunwayMonths !== null && curr.cashRunwayMonths < 1.5;
  if (negativeNetCash || expectedSlippage || burnVsCash) {
    const reasons: string[] = [];
    if (negativeNetCash)
      reasons.push(`net cash ${fmtMoney(netCash)} negative`);
    if (expectedSlippage)
      reasons.push(
        `actual cash-in ${fmtMoney(curr.cashIn)} vs expected ${fmtMoney(curr.expectedCashIn)}`,
      );
    if (burnVsCash)
      reasons.push(
        `runway ~${curr.cashRunwayMonths!.toFixed(1)} months at current burn`,
      );
    const strong =
      negativeNetCash && (expectedSlippage || burnVsCash) ? "high" : "medium";
    out.push({
      ...base,
      signal_type: "cash_pressure",
      strength: strong as "high" | "medium",
      confidence: "medium",
      related_pillar: "financial_visibility",
      evidence_label: "Cash pressure in BCC period",
      evidence_summary: `Period ending ${periodEnd}: ${reasons.join("; ")}.`,
      metadata: {
        period_end: periodEnd,
        net_cash: netCash,
        expected_cash_in: curr.expectedCashIn,
        actual_cash_in: curr.cashIn,
        runway_months: curr.cashRunwayMonths,
      },
    });
  }

  /* 2. Revenue leak — overdue receivables material, or revenue trend dropped. */
  const overdueShare =
    curr.totalRevenue > 0 ? curr.receivablesOverdue / curr.totalRevenue : 0;
  const revenueDrop =
    prev && prev.totalRevenue > 0
      ? pctChange(curr.totalRevenue, prev.totalRevenue)
      : 0;
  if (curr.receivablesOverdue > 0 && overdueShare >= 0.15) {
    out.push({
      ...base,
      signal_type: "revenue_leak",
      strength: overdueShare >= 0.3 ? "high" : "medium",
      confidence: "high",
      related_pillar: "financial_visibility",
      evidence_label: "Overdue receivables material",
      evidence_summary: `${fmtMoney(curr.receivablesOverdue)} overdue (~${Math.round(
        overdueShare * 100,
      )}% of period revenue ${fmtMoney(curr.totalRevenue)}).`,
      metadata: {
        overdue: curr.receivablesOverdue,
        revenue: curr.totalRevenue,
      },
    });
  }
  if (prev && prev.totalRevenue > 0 && revenueDrop <= -15) {
    out.push({
      ...base,
      signal_type: "revenue_leak",
      strength: revenueDrop <= -30 ? "high" : "medium",
      confidence: "medium",
      related_pillar: "revenue_conversion",
      evidence_label: "Revenue trend declined",
      evidence_summary: `Period revenue ${fmtMoney(curr.totalRevenue)} down ${Math.abs(
        Math.round(revenueDrop),
      )}% vs prior period ${fmtMoney(prev.totalRevenue)}.`,
      metadata: {
        curr_revenue: curr.totalRevenue,
        prev_revenue: prev.totalRevenue,
        delta_pct: revenueDrop,
      },
    });
  }

  /* 3. Pipeline risk — collected share weak vs invoiced/pending. */
  const collectedShare =
    curr.totalRevenue > 0 ? curr.collectedRevenue / curr.totalRevenue : 1;
  if (
    curr.totalRevenue > 0 &&
    collectedShare < 0.5 &&
    curr.pendingRevenue + curr.overdueRevenue > 0
  ) {
    out.push({
      ...base,
      signal_type: "pipeline_risk",
      strength: collectedShare < 0.3 ? "high" : "medium",
      confidence: "medium",
      related_pillar: "revenue_conversion",
      evidence_label: "Weak collection-to-invoice conversion",
      evidence_summary: `Only ${Math.round(
        collectedShare * 100,
      )}% of period revenue is collected; ${fmtMoney(
        curr.pendingRevenue + curr.overdueRevenue,
      )} still pending or overdue.`,
      metadata: {
        collected: curr.collectedRevenue,
        pending: curr.pendingRevenue,
        overdue: curr.overdueRevenue,
      },
    });
  }

  /* 4. Benchmark risk — stacked structural weakness in margin/payroll/expense. */
  const benchmarkFlags: string[] = [];
  if (curr.totalRevenue > 0 && curr.profitMargin < 5)
    benchmarkFlags.push(`margin ${curr.profitMargin.toFixed(1)}%`);
  if (curr.laborPctRevenue > 60)
    benchmarkFlags.push(`labor load ${curr.laborPctRevenue.toFixed(0)}%`);
  if (curr.expenseRatio > 70)
    benchmarkFlags.push(`expense ratio ${curr.expenseRatio.toFixed(0)}%`);
  if (benchmarkFlags.length >= 2) {
    out.push({
      ...base,
      signal_type: "benchmark_risk",
      strength: benchmarkFlags.length >= 3 ? "high" : "medium",
      confidence: "medium",
      related_pillar: "financial_visibility",
      evidence_label: "Structural benchmark weakness",
      evidence_summary: `Multiple weak fundamentals in period: ${benchmarkFlags.join(", ")}.`,
      metadata: {
        margin_pct: curr.profitMargin,
        labor_pct: curr.laborPctRevenue,
        expense_pct: curr.expenseRatio,
      },
    });
  }

  /* 5. Validated strength — improving margin or improving collections trend. */
  if (prev && prev.totalRevenue > 0 && curr.totalRevenue > 0) {
    const marginImproved =
      curr.profitMargin >= 10 &&
      curr.profitMargin - prev.profitMargin >= 3;
    const revenueImproved =
      pctChange(curr.totalRevenue, prev.totalRevenue) >= 15 &&
      curr.profitMargin >= 0;
    if (marginImproved || revenueImproved) {
      out.push({
        ...base,
        signal_type: "validated_strength",
        strength: "medium",
        confidence: "medium",
        related_pillar: marginImproved
          ? "financial_visibility"
          : "revenue_conversion",
        evidence_label: marginImproved
          ? "Margin improving period-over-period"
          : "Revenue improving period-over-period",
        evidence_summary: marginImproved
          ? `Profit margin ${curr.profitMargin.toFixed(1)}% (up from ${prev.profitMargin.toFixed(1)}%).`
          : `Revenue ${fmtMoney(curr.totalRevenue)} up from ${fmtMoney(prev.totalRevenue)}.`,
        metadata: {
          curr_margin: curr.profitMargin,
          prev_margin: prev.profitMargin,
          curr_revenue: curr.totalRevenue,
          prev_revenue: prev.totalRevenue,
        },
      });
    }
  }

  /* 6. Resolved issue — overdue receivables materially down vs prior. */
  if (
    prev &&
    prev.receivablesOverdue > 0 &&
    curr.receivablesOverdue < prev.receivablesOverdue * 0.5
  ) {
    out.push({
      ...base,
      signal_type: "resolved_issue",
      strength: "medium",
      confidence: "medium",
      related_pillar: "financial_visibility",
      evidence_label: "Overdue receivables improved",
      evidence_summary: `Overdue ${fmtMoney(curr.receivablesOverdue)} vs prior period ${fmtMoney(prev.receivablesOverdue)} — material improvement.`,
      metadata: {
        curr_overdue: curr.receivablesOverdue,
        prev_overdue: prev.receivablesOverdue,
      },
    });
  }
  if (
    prev &&
    prev.netCash < 0 &&
    curr.netCash > 0
  ) {
    out.push({
      ...base,
      signal_type: "resolved_issue",
      strength: "medium",
      confidence: "medium",
      related_pillar: "financial_visibility",
      evidence_label: "Cash flow flipped positive",
      evidence_summary: `Net cash ${fmtMoney(curr.netCash)} this period vs ${fmtMoney(prev.netCash)} (negative) prior period.`,
      metadata: { curr_net_cash: curr.netCash, prev_net_cash: prev.netCash },
    });
  }

  /* 7. Report insight — health snapshot (light) when several conditions stack. */
  if (
    curr.totalRevenue > 0 &&
    (curr.profitMargin < 0 ||
      (curr.netCash < 0 && curr.receivablesOverdue > curr.totalRevenue * 0.2))
  ) {
    out.push({
      ...base,
      signal_type: "report_insight",
      strength: "high",
      confidence: "medium",
      related_pillar: "financial_visibility",
      evidence_label: "Period combines unprofitability and cash strain",
      evidence_summary: `Margin ${curr.profitMargin.toFixed(1)}%, net cash ${fmtMoney(curr.netCash)}, overdue ${fmtMoney(curr.receivablesOverdue)}.`,
      metadata: {
        margin: curr.profitMargin,
        net_cash: curr.netCash,
        overdue: curr.receivablesOverdue,
      },
    });
  }

  /* 8. Implementation progress — cleaner data + healthier ratios than prior period. */
  if (prev && args.hasPrevData && args.hasCurrData) {
    const cleaner =
      curr.totalRevenue > 0 &&
      curr.collectedRevenue / Math.max(1, curr.totalRevenue) >=
        prev.collectedRevenue / Math.max(1, prev.totalRevenue) + 0.15 &&
      curr.profitMargin >= prev.profitMargin;
    if (cleaner) {
      out.push({
        ...base,
        signal_type: "implementation_progress",
        strength: "medium",
        confidence: "low",
        related_pillar: "operational_efficiency",
        evidence_label: "Collection discipline improving",
        evidence_summary: `Collected share rose to ${Math.round(
          (curr.collectedRevenue / Math.max(1, curr.totalRevenue)) * 100,
        )}% from ${Math.round(
          (prev.collectedRevenue / Math.max(1, prev.totalRevenue)) * 100,
        )}% with non-worse margin.`,
      });
    }
  }

  return out;
}

/* ---------------------- public API ---------------------- */

export interface EmitBccSignalsArgs {
  customerId: string;
  /** The report period this aggregation is for. */
  periodStart: string;
  periodEnd: string;
  /** Optional: link the signals to a specific report row. */
  reportId?: string | null;
}

/**
 * Aggregate the customer's BCC data for the given period (and the prior
 * equal-length period for trend signals) and emit structured signals.
 * Best-effort: never throws.
 */
export async function emitBccPeriodSignals(
  args: EmitBccSignalsArgs,
): Promise<{ emitted: number }> {
  try {
    if (!args.customerId || !args.periodStart || !args.periodEnd) {
      return { emitted: 0 };
    }
    const [currData, { prevStart, prevEnd }] = [
      await fetchPeriodDataset(args.customerId, args.periodStart, args.periodEnd),
      shiftPeriod(args.periodStart, args.periodEnd),
    ];
    const prevData = await fetchPeriodDataset(
      args.customerId,
      prevStart,
      prevEnd,
    );

    const hasCurrData =
      currData.revenue.length +
        currData.expenses.length +
        currData.invoices.length +
        currData.cashflow.length >
      0;
    const hasPrevData =
      prevData.revenue.length +
        prevData.expenses.length +
        prevData.invoices.length +
        prevData.cashflow.length >
      0;
    if (!hasCurrData) return { emitted: 0 };

    const curr = computeMetrics(currData);
    const prev = hasPrevData ? computeMetrics(prevData) : null;

    const inputs = buildBccSignals({
      customerId: args.customerId,
      reportId: args.reportId ?? null,
      periodEnd: args.periodEnd,
      curr,
      prev,
      hasCurrData,
      hasPrevData,
    });

    if (inputs.length === 0) return { emitted: 0 };
    await recordInsightSignals(inputs);
    return { emitted: inputs.length };
  } catch (e) {
    if (typeof console !== "undefined") {
      console.warn("[bccSignalEmitter] suppressed:", (e as Error)?.message);
    }
    return { emitted: 0 };
  }
}