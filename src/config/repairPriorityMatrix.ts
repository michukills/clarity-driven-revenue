/**
 * P85.2 — RGS Repair Priority Matrix™
 *
 * Deterministic Impact × Effort scoring for Repair Map items.
 * No AI is involved. Lane assignment is pure logic.
 */

export type ImpactScore = 1 | 3 | 5;
export type EffortScore = 1 | 3 | 5;

export type PriorityLane =
  | "quick_wins"
  | "big_rocks"
  | "support_tasks"
  | "later_hold";

export interface ImpactDefinition {
  score: ImpactScore;
  label: string;
  client_safe_label: string;
  description: string;
}

export interface EffortDefinition {
  score: EffortScore;
  label: string;
  client_safe_label: string;
  description: string;
}

export interface PriorityLaneDefinition {
  lane: PriorityLane;
  label: string;
  client_safe_label: string;
  client_safe_description: string;
  admin_guidance: string;
  recommended_week: number | null;
}

export const IMPACT_SCORES: ImpactDefinition[] = [
  {
    score: 5,
    label: "Critical",
    client_safe_label: "Critical impact",
    description:
      "Stops or reduces severe operational risk, immediate cash drain, stop-sell risk, major owner-dependence risk, or serious system failure.",
  },
  {
    score: 3,
    label: "High",
    client_safe_label: "High impact",
    description:
      "Directly improves margin, lead conversion, revenue reliability, capacity, operational control, evidence quality, or owner independence.",
  },
  {
    score: 1,
    label: "Moderate",
    client_safe_label: "Moderate impact",
    description:
      "Quality-of-life improvement, clarity, long-term polish, or non-urgent improvement.",
  },
];

export const EFFORT_SCORES: EffortDefinition[] = [
  {
    score: 1,
    label: "Easy",
    client_safe_label: "Easy lift",
    description: "Under 2 hours, no new software, no new hires.",
  },
  {
    score: 3,
    label: "Medium",
    client_safe_label: "Medium lift",
    description:
      "Requires a team meeting, new tracking sheet, updated SOP, light process install, or basic staff training.",
  },
  {
    score: 5,
    label: "Hard",
    client_safe_label: "Heavy lift",
    description:
      "Requires structural change, multiple departments, deep cleanup, 20+ hours, software/process migration, or major owner/team involvement.",
  },
];

export const PRIORITY_LANES: Record<PriorityLane, PriorityLaneDefinition> = {
  quick_wins: {
    lane: "quick_wins",
    label: "Quick Wins",
    client_safe_label: "Quick Wins",
    client_safe_description:
      "High impact and easy to start. Recommended in the first 7 days of implementation.",
    admin_guidance:
      "Schedule in week one. Strong candidates for RGS Stability Quick-Start™ templates.",
    recommended_week: 1,
  },
  big_rocks: {
    lane: "big_rocks",
    label: "Big Rocks",
    client_safe_label: "Big Rocks",
    client_safe_description:
      "High impact but requires meaningful work. Core implementation project work.",
    admin_guidance:
      "Plan into the implementation engagement with clear ownership and milestones.",
    recommended_week: 2,
  },
  support_tasks: {
    lane: "support_tasks",
    label: "Support Tasks",
    client_safe_label: "Support Tasks",
    client_safe_description:
      "Lower impact and easy to handle. Good tasks for client or admin staff.",
    admin_guidance:
      "Delegate to client staff or RGS admin. Useful momentum builders.",
    recommended_week: 3,
  },
  later_hold: {
    lane: "later_hold",
    label: "Later / Hold",
    client_safe_label: "Later",
    client_safe_description:
      "Lower impact and heavy lift. Hold until the system is more stable, unless risk is severe.",
    admin_guidance:
      "Hold until structural health score is above 700, unless an underlying risk is severe.",
    recommended_week: null,
  },
};

/**
 * Deterministic priority lane computation.
 *
 * - Quick Wins:    impact >= 3 AND effort <= 1
 * - Big Rocks:     impact >= 3 AND effort >= 3
 * - Support Tasks: impact <= 1 AND effort <= 1
 * - Later / Hold:  impact <= 1 AND effort >= 3
 *
 * For combinations involving effort = 3 with low impact, default to
 * Support Tasks if impact = 1, otherwise Big Rocks if impact >= 3.
 * Critical impact (5) with high effort always lands in Big Rocks.
 */
export function computePriorityLane(
  impact: ImpactScore,
  effort: EffortScore,
): PriorityLane {
  if (impact === 5 && effort >= 3) return "big_rocks";
  if (impact >= 3 && effort <= 1) return "quick_wins";
  if (impact >= 3 && effort >= 3) return "big_rocks";
  if (impact <= 1 && effort <= 1) return "support_tasks";
  if (impact <= 1 && effort >= 3) return "later_hold";
  // Effort = 3 fallthrough cases
  if (impact >= 3) return "big_rocks";
  return "support_tasks";
}

export const REPAIR_PRIORITY_MATRIX_VERSION = "1.0.0" as const;

export const REPAIR_PRIORITY_MATRIX_SCOPE_BOUNDARY =
  "Priority lanes help sequence repair work. They do not guarantee results or replace owner decision-making.";

export function getImpactDefinition(score: ImpactScore): ImpactDefinition {
  const d = IMPACT_SCORES.find((x) => x.score === score);
  if (!d) throw new Error(`Unknown impact score: ${score}`);
  return d;
}

export function getEffortDefinition(score: EffortScore): EffortDefinition {
  const d = EFFORT_SCORES.find((x) => x.score === score);
  if (!d) throw new Error(`Unknown effort score: ${score}`);
  return d;
}

export function getPriorityLane(lane: PriorityLane): PriorityLaneDefinition {
  return PRIORITY_LANES[lane];
}