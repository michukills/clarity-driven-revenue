// P20.3 — Trades / Services industry brain.
//
// Adds vertical-specific leaks beyond what estimate friction already produces.
// Pure / deterministic. No AI, no network.

import type { Leak } from "@/lib/leakEngine/leakObject";
import type { BrainInput, BrainResult } from "../types";
import { makeLeak } from "./_helpers";

export function runTradesBrain(input: BrainInput): BrainResult {
  const d = input.industryData?.trades ?? {};
  const leaks: Leak[] = [];

  if (typeof d.estimatesUnsent === "number" && d.estimatesUnsent > 0) {
    leaks.push(
      makeLeak(input, {
        id: `trades:estimates_unsent:${d.estimatesUnsent}`,
        type: "estimates_unsent_backlog",
        category: "conversion",
        gear: 2,
        severity: d.estimatesUnsent >= 5 ? "high" : "medium",
        estimated_revenue_impact: 0,
        confidence: "Confirmed",
        source: "manual",
        message: `${d.estimatesUnsent} estimates created but never sent.`,
        recommended_fix: "Send today, then enforce a same-day estimate rule on every booked job.",
      }),
    );
  }

  if (typeof d.jobsCompletedNotInvoiced === "number" && d.jobsCompletedNotInvoiced > 0) {
    leaks.push(
      makeLeak(input, {
        id: `trades:jobs_uninvoiced:${d.jobsCompletedNotInvoiced}`,
        type: "jobs_completed_not_invoiced_bulk",
        category: "financial_visibility",
        gear: 4,
        severity: "high",
        estimated_revenue_impact: 0,
        confidence: "Confirmed",
        source: "manual",
        message: `${d.jobsCompletedNotInvoiced} completed jobs are not yet invoiced.`,
        recommended_fix: "Invoice all completed jobs today and add a daily close-out check.",
      }),
    );
  }

  if (d.hasJobCosting === false) {
    leaks.push(
      makeLeak(input, {
        id: "trades:no_job_costing",
        type: "no_job_costing",
        category: "financial_visibility",
        gear: 4,
        severity: "high",
        estimated_revenue_impact: 0,
        confidence: "Confirmed",
        source: "manual",
        message: "No job costing — gross profit per job is invisible.",
        recommended_fix: "Tag labor and materials to each job to expose margin per job.",
      }),
    );
  }

  if (typeof d.grossMarginPct === "number" && d.grossMarginPct < 0.25) {
    leaks.push(
      makeLeak(input, {
        id: "trades:low_margin",
        type: "low_gross_margin",
        category: "financial_visibility",
        gear: 4,
        severity: "high",
        estimated_revenue_impact: 0,
        confidence: "Estimated",
        source: "manual",
        message: `Gross margin reported at ${(d.grossMarginPct * 100).toFixed(0)}% — below trades floor.`,
        recommended_fix: "Re-price the lowest-margin service line and rebuild estimate templates.",
      }),
    );
  }

  return { brain: "trade_field_service", leaks };
}
