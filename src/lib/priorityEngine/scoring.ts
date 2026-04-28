// P16.1 — Deterministic priority scoring.
//
// Formula: priority_score = (impact * 2) + visibility + ease_of_fix + dependency
// Each factor is on a 1–5 scale.
// Score range: min 5, max 25.

import type { PriorityBand, PriorityFactors, ScoredIssue } from "./types";

export const FACTOR_MIN = 1;
export const FACTOR_MAX = 5;
export const SCORE_MIN = 5;  // 1*2 + 1 + 1 + 1
export const SCORE_MAX = 25; // 5*2 + 5 + 5 + 5

function clamp(n: number): number {
  if (!Number.isFinite(n)) return FACTOR_MIN;
  if (n < FACTOR_MIN) return FACTOR_MIN;
  if (n > FACTOR_MAX) return FACTOR_MAX;
  return Math.round(n);
}

export function normalizeFactors(f: PriorityFactors): PriorityFactors {
  return {
    impact: clamp(f.impact),
    visibility: clamp(f.visibility),
    ease_of_fix: clamp(f.ease_of_fix),
    dependency: clamp(f.dependency),
  };
}

export function computePriorityScore(f: PriorityFactors): number {
  const n = normalizeFactors(f);
  return n.impact * 2 + n.visibility + n.ease_of_fix + n.dependency;
}

export function bandForScore(score: number): PriorityBand {
  if (score >= 20) return "critical";
  if (score >= 16) return "high";
  if (score >= 11) return "medium";
  return "low";
}

export function buildRationale(f: PriorityFactors): string {
  const n = normalizeFactors(f);
  const parts: string[] = [];
  if (n.impact >= 4) parts.push("high business impact");
  else if (n.impact <= 2) parts.push("limited business impact");
  if (n.visibility >= 4) parts.push("highly visible to the owner");
  else if (n.visibility <= 2) parts.push("low felt pain");
  if (n.ease_of_fix >= 4) parts.push("quick to address");
  else if (n.ease_of_fix <= 2) parts.push("complex to address");
  if (n.dependency >= 4) parts.push("unblocks other systems");
  return parts.length ? parts.join(", ") : "balanced across factors";
}

/**
 * Rank a set of factor-bearing issues by priority_score (desc),
 * tiebreak by impact desc, then ease_of_fix desc.
 */
export function rankIssues<T extends PriorityFactors & {
  issue_key: string;
  issue_title: string;
  source_recommendation_id: string | null;
}>(input: T[]): ScoredIssue[] {
  const scored = input.map((it) => {
    const factors = normalizeFactors(it);
    const score = computePriorityScore(factors);
    return {
      ...it,
      ...factors,
      priority_score: score,
      priority_band: bandForScore(score),
      rank: 0,
      rationale: buildRationale(factors),
    } as ScoredIssue;
  });

  scored.sort((a, b) => {
    if (b.priority_score !== a.priority_score) return b.priority_score - a.priority_score;
    if (b.impact !== a.impact) return b.impact - a.impact;
    return b.ease_of_fix - a.ease_of_fix;
  });

  scored.forEach((s, i) => {
    s.rank = i + 1;
  });

  return scored;
}