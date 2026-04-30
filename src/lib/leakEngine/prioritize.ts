// P20.2 — Convert Leak objects into PriorityEngine ScoredIssues.
//
// Pure deterministic scoring. No AI, no network. Reuses the canonical
// scoring formula from src/lib/priorityEngine/scoring.ts:
//
//   priority_score = (impact * 2) + visibility + ease_of_fix + dependency
//
// Each factor is mapped from leak fields using transparent rules so the
// scoring is reproducible and explainable.

import {
  bandForScore,
  buildRationale,
  computePriorityScore,
  rankIssues,
} from "@/lib/priorityEngine/scoring";
import type { ScoredIssue } from "@/lib/priorityEngine/types";
import type { Leak } from "./leakObject";

/** Map dollar impact to a 1..5 scale. Tunable but deterministic. */
export function impactFromDollars(dollars: number): number {
  const d = Math.max(0, dollars || 0);
  if (d >= 25_000) return 5;
  if (d >= 10_000) return 4;
  if (d >= 2_500) return 3;
  if (d >= 500) return 2;
  return 1;
}

/** Severity gives a small nudge so a "high" $0 leak isn't ignored. */
function severityBoost(sev: Leak["severity"]): number {
  if (sev === "high") return 1;
  if (sev === "medium") return 0;
  return -1;
}

function clamp1to5(n: number): number {
  if (!Number.isFinite(n)) return 1;
  if (n < 1) return 1;
  if (n > 5) return 5;
  return Math.round(n);
}

/** Visibility: how obvious the problem is to the client. */
function visibilityFor(leak: Leak): number {
  // Approved-but-uninvoiced and completed-but-uninvoiced are felt directly
  // (cash is missing). Sent-but-stale is medium. Drafts never sent are low
  // because the owner often doesn't realize the draft exists.
  switch (leak.type) {
    case "estimate_approved_not_invoiced":
    case "job_completed_not_invoiced":
      return 5;
    case "estimate_expired_unanswered":
      return 4;
    case "estimate_stale_sent":
      return 3;
    case "estimate_never_sent":
      return 2;
    default:
      // Generic mapping by category for non-estimate sources.
      if (leak.category === "financial_visibility") return 5;
      if (leak.category === "conversion") return 3;
      return 2;
  }
}

/** Ease of fix: higher = easier. */
function easeFor(leak: Leak): number {
  switch (leak.type) {
    case "estimate_never_sent":
      return 5; // literally hit send
    case "estimate_stale_sent":
    case "estimate_expired_unanswered":
      return 4; // send a follow-up
    case "estimate_approved_not_invoiced":
    case "job_completed_not_invoiced":
      return 4; // generate the invoice
    default:
      if (leak.category === "financial_visibility") return 3;
      if (leak.category === "conversion") return 3;
      return 2;
  }
}

/** Dependency: does fixing this unlock other systems? */
function dependencyFor(leak: Leak): number {
  // Invoicing backlog unlocks cash-flow visibility and downstream reporting.
  if (leak.category === "financial_visibility") return 5;
  // Conversion fixes unlock the entire revenue funnel.
  if (leak.category === "conversion") return 4;
  if (leak.category === "workflow") return 3;
  return 2;
}

/** Project a Leak into the priority engine's ScoredIssue shape. */
export function leakToScoredIssue(leak: Leak): ScoredIssue {
  const impact = clamp1to5(impactFromDollars(leak.estimated_revenue_impact) + severityBoost(leak.severity));
  const factors = {
    impact,
    visibility: clamp1to5(visibilityFor(leak)),
    ease_of_fix: clamp1to5(easeFor(leak)),
    dependency: clamp1to5(dependencyFor(leak)),
  };
  const score = computePriorityScore(factors);
  return {
    issue_key: leak.id,
    issue_title: leak.message,
    source_recommendation_id: null,
    ...factors,
    priority_score: score,
    priority_band: bandForScore(score),
    rank: 0,
    rationale: buildRationale(factors),
  };
}

export interface RankedLeak {
  leak: Leak;
  scored: ScoredIssue;
  /**
   * Plain-English explanation suitable for both admin and client surfaces.
   * Example: "Ranked #1 because it impacts $12,400, is easy to fix, and
   * unlocks revenue visibility."
   */
  explanation: string;
}

function explain(rank: number, leak: Leak, scored: ScoredIssue): string {
  const dollars = leak.estimated_revenue_impact > 0
    ? `impacts $${leak.estimated_revenue_impact.toLocaleString("en-US")}`
    : `affects ${leak.category.replace("_", " ")}`;
  return `Ranked #${rank} because it ${dollars}, ${scored.rationale}.`;
}

/**
 * Rank a set of leaks by priority. Returns the full list (sorted) plus a
 * convenience top3 slice. Pure / deterministic.
 */
export function prioritizeLeaks(leaks: Leak[]): {
  ranked: RankedLeak[];
  top3: RankedLeak[];
} {
  const scoredInputs = leaks.map((leak) => {
    const scored = leakToScoredIssue(leak);
    return { leak, scoredSeed: scored };
  });

  const ranked = rankIssues(
    scoredInputs.map(({ leak, scoredSeed }) => ({
      issue_key: leak.id,
      issue_title: leak.message,
      source_recommendation_id: null,
      impact: scoredSeed.impact,
      visibility: scoredSeed.visibility,
      ease_of_fix: scoredSeed.ease_of_fix,
      dependency: scoredSeed.dependency,
    })),
  );

  // Recombine ranked output with original leaks (stable on issue_key).
  const byKey = new Map(scoredInputs.map((x) => [x.leak.id, x.leak]));
  const out: RankedLeak[] = ranked.map((scored) => {
    const leak = byKey.get(scored.issue_key)!;
    return {
      leak,
      scored,
      explanation: explain(scored.rank, leak, scored),
    };
  });

  return { ranked: out, top3: out.slice(0, 3) };
}