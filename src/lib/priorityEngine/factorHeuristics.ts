// P16.1 — Heuristic mapping from a report recommendation to priority factors.
// Deterministic, conservative, and easy for admins to override later.

import type { PriorityFactors } from "./types";

export interface RecommendationLike {
  id: string;
  title: string;
  category: string | null;
  priority: string | null;       // "low" | "medium" | "high"
  explanation: string | null;
  related_pillar: string | null;
  origin: string | null;          // "ai" | "rule" | "admin" | etc.
  rule_key: string | null;
}

function mapPriorityToImpact(p: string | null): number {
  switch ((p ?? "").toLowerCase()) {
    case "high": return 5;
    case "medium": return 3;
    case "low": return 2;
    default: return 3;
  }
}

const HIGH_VIS_HINTS = ["cash", "revenue", "ar", "collection", "follow-up", "follow up", "invoice", "lead"];
const LOW_EASE_HINTS = ["restructure", "rebuild", "migrate", "replace system", "process map", "implement crm"];
const HIGH_EASE_HINTS = ["enable", "turn on", "schedule", "send", "draft", "create template", "review"];
const HIGH_DEP_HINTS = ["foundation", "single source of truth", "integrate", "connect", "data quality", "owner bottleneck"];

function matchesAny(text: string, hints: string[]): boolean {
  const t = text.toLowerCase();
  return hints.some((h) => t.includes(h));
}

export function deriveFactors(rec: RecommendationLike): PriorityFactors {
  const blob = `${rec.title ?? ""} ${rec.explanation ?? ""} ${rec.related_pillar ?? ""}`;

  const impact = mapPriorityToImpact(rec.priority);

  let visibility = 3;
  if (matchesAny(blob, HIGH_VIS_HINTS)) visibility = 5;
  else if ((rec.priority ?? "").toLowerCase() === "high") visibility = 4;
  else if ((rec.priority ?? "").toLowerCase() === "low") visibility = 2;

  let ease_of_fix = 3;
  if (matchesAny(blob, HIGH_EASE_HINTS)) ease_of_fix = 4;
  if (matchesAny(blob, LOW_EASE_HINTS)) ease_of_fix = 2;

  let dependency = 2;
  if (matchesAny(blob, HIGH_DEP_HINTS)) dependency = 5;
  else if ((rec.related_pillar ?? "").toLowerCase().includes("foundation")) dependency = 4;

  return { impact, visibility, ease_of_fix, dependency };
}