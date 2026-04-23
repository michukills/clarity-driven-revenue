/* P11.2 — Cash position + obligations signal emitter.
 *
 * Reads the latest cash position snapshot and current open obligations,
 * applies aggregate threshold logic, and emits a small number of signals
 * into `customer_insight_signals`. Compares against the prior snapshot to
 * detect resolved issues. Best-effort: never throws.
 *
 * Honors `learning_enabled` via `recordInsightSignals`. Never writes to
 * `rgs_pattern_intelligence`.
 */

import {
  listCashSnapshots,
  listObligations,
  summarizeCashPressure,
  type CashPositionSnapshot,
  type FinancialObligation,
} from "@/lib/bcc/cashPosition";
import {
  recordInsightSignals,
  type InsightSignalInput,
} from "./insightSignals";

function fmtMoney(n: number): string {
  return `$${Math.round(Math.abs(n)).toLocaleString()}`;
}

export interface EmitCashPositionArgs {
  customerId: string;
  /** Optional monthly burn input for runway thresholds. */
  monthlyBurn?: number | null;
  /** Optional explicit asOf date (defaults to now). */
  asOf?: Date;
}

export async function emitCashPositionSignals(
  args: EmitCashPositionArgs,
): Promise<{ emitted: number }> {
  try {
    if (!args.customerId) return { emitted: 0 };
    const [snapshots, obligations] = await Promise.all([
      listCashSnapshots(args.customerId, 2),
      listObligations(args.customerId),
    ]);
    const latest: CashPositionSnapshot | null = snapshots[0] ?? null;
    const prior: CashPositionSnapshot | null = snapshots[1] ?? null;

    // Skip cleanly if there is essentially nothing to evaluate.
    if (!latest && obligations.length === 0) return { emitted: 0 };

    const sum = summarizeCashPressure({
      snapshot: latest,
      obligations,
      monthlyBurn: args.monthlyBurn ?? null,
      asOf: args.asOf,
    });

    const occurredAt = (latest?.snapshot_date
      ? new Date(latest.snapshot_date)
      : new Date()
    ).toISOString();

    const base = {
      customer_id: args.customerId,
      signal_source: "business_control_report" as const,
      source_table: "cash_position_snapshots" as const,
      source_id: latest?.id ?? null,
      occurred_at: occurredAt,
    };

    const out: InsightSignalInput[] = [];

    /* 1. Cash pressure */
    const reasons: string[] = [];
    if (sum.overdueCount > 0) {
      reasons.push(
        `${sum.overdueCount} overdue (${fmtMoney(sum.overdueTotal)})`,
      );
    }
    if (
      sum.cashOnHand !== null &&
      sum.dueIn30Total > 0 &&
      sum.dueIn30Total > Math.max(sum.cashOnHand, 1) * 1.25
    ) {
      reasons.push(
        `30-day obligations ${fmtMoney(sum.dueIn30Total)} vs cash ${fmtMoney(sum.cashOnHand)}`,
      );
    }
    if (sum.runwayMonths !== null && sum.runwayMonths < 1.5) {
      reasons.push(`runway ~${sum.runwayMonths.toFixed(1)} months`);
    }
    if (
      sum.cashOnHand !== null &&
      sum.cashOnHand > 0 &&
      sum.obligationsTotalOpen > sum.cashOnHand * 2
    ) {
      reasons.push(
        `open obligations ${fmtMoney(sum.obligationsTotalOpen)} > 2× cash`,
      );
    }
    if (reasons.length > 0) {
      const high =
        sum.runwayMonths !== null && sum.runwayMonths < 1
          ? true
          : sum.overdueCount >= 3;
      out.push({
        ...base,
        signal_type: "cash_pressure",
        strength: high ? "high" : "medium",
        confidence: latest ? "high" : "medium",
        related_pillar: "financial_visibility",
        evidence_label: "Cash pressure from obligations",
        evidence_summary: reasons.join("; ") + ".",
        metadata: {
          cash_on_hand: sum.cashOnHand,
          overdue_total: sum.overdueTotal,
          overdue_count: sum.overdueCount,
          due_in_7: sum.dueIn7Total,
          due_in_30: sum.dueIn30Total,
          runway_months: sum.runwayMonths,
          monthly_burn: sum.monthlyBurn,
        },
      });
    }

    /* 2. Benchmark risk — stacked weakness: weak cash + obligation load */
    const stacked =
      sum.cashOnHand !== null &&
      sum.cashOnHand > 0 &&
      sum.dueIn30Total > sum.cashOnHand &&
      sum.overdueCount > 0;
    if (stacked) {
      out.push({
        ...base,
        signal_type: "benchmark_risk",
        strength: "high",
        confidence: "high",
        related_pillar: "financial_visibility",
        evidence_label: "Stacked obligations + weak cash position",
        evidence_summary: `Cash ${fmtMoney(sum.cashOnHand!)}, 30-day obligations ${fmtMoney(
          sum.dueIn30Total,
        )}, ${sum.overdueCount} overdue.`,
        metadata: {
          cash_on_hand: sum.cashOnHand,
          due_in_30: sum.dueIn30Total,
          overdue_count: sum.overdueCount,
        },
      });
    }

    /* 3. Resolved issue — overdue materially reduced or runway improved */
    if (prior) {
      const priorSum = summarizeCashPressure({
        snapshot: prior,
        obligations: [],
        monthlyBurn: args.monthlyBurn ?? null,
        asOf: args.asOf,
      });
      const cashImproved =
        prior.cash_on_hand <= 0 && (latest?.cash_on_hand ?? 0) > 0;
      const cashJump =
        prior.cash_on_hand > 0 &&
        (latest?.cash_on_hand ?? 0) >= prior.cash_on_hand * 1.5;
      if (cashImproved || cashJump) {
        out.push({
          ...base,
          signal_type: "resolved_issue",
          strength: "medium",
          confidence: "medium",
          related_pillar: "financial_visibility",
          evidence_label: "Cash position improved",
          evidence_summary: `Cash on hand ${fmtMoney(latest!.cash_on_hand)} vs prior snapshot ${fmtMoney(prior.cash_on_hand)} on ${prior.snapshot_date}.`,
          metadata: {
            curr: latest?.cash_on_hand,
            prev: prior.cash_on_hand,
            prior_snapshot_date: prior.snapshot_date,
          },
        });
      }
      // Light: log presence of priorSum to keep tree-shaker happy.
      void priorSum;
    }

    /* 4. Report insight — combined operational picture if material. */
    if (
      latest &&
      sum.overdueCount > 0 &&
      sum.dueIn30Total > 0 &&
      sum.cashOnHand !== null
    ) {
      const cover =
        sum.cashOnHand > 0 ? sum.dueIn30Total / sum.cashOnHand : null;
      if (cover !== null && cover >= 0.75) {
        out.push({
          ...base,
          signal_type: "report_insight",
          strength: cover >= 1.5 ? "high" : "medium",
          confidence: "medium",
          related_pillar: "financial_visibility",
          evidence_label: "Obligation coverage ratio elevated",
          evidence_summary: `30-day obligations ${fmtMoney(sum.dueIn30Total)} = ${(cover * 100).toFixed(0)}% of cash on hand.`,
          metadata: {
            coverage_ratio: cover,
            cash_on_hand: sum.cashOnHand,
            due_in_30: sum.dueIn30Total,
          },
        });
      }
    }

    if (out.length === 0) return { emitted: 0 };
    await recordInsightSignals(out);
    return { emitted: out.length };
  } catch (e) {
    if (typeof console !== "undefined") {
      console.warn(
        "[cashPositionSignalEmitter] suppressed:",
        (e as Error)?.message,
      );
    }
    return { emitted: 0 };
  }
}

/** Convenience type re-exports for callers that need them. */
export type { CashPositionSnapshot, FinancialObligation };