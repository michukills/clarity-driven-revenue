/**
 * P93E-E3 — v3 OS-brain enrichment helpers.
 *
 * Pure, deterministic, derived view over a scorecard_runs row. Reads the
 * already-persisted columns (rubric_version, pillar_results, top_gaps,
 * overall_score_estimate). Adds NO new tables and NO new writes.
 *
 * - For v3 runs: surfaces strongest gear, most-slipping gear, worn-tooth
 *   signals, interpretation band, evidence-needed prompts (for the paid
 *   Diagnostic), and a recommended next step for admin lead review.
 * - For v2 (historical natural-language) runs: returns a safe fallback
 *   without inventing metadata that v2 was not built to produce.
 *
 * No AI. No scoring overrides. No fake evidence. No legal/tax/financial
 * guarantees.
 */

import {
  RUBRIC_VERSION_V3,
  V3_BANDS,
  type GearId,
  type V3InterpretationBand,
} from "./rubricV3";

export const RUBRIC_VERSION_V2 = "v2_natural_language_evidence" as const;

export type RubricKind = "v3" | "v2" | "unknown";

export interface V3RowLike {
  rubric_version?: string | null;
  overall_score_estimate?: number | null;
  pillar_results?: unknown;
  top_gaps?: unknown;
}

export interface GearSummary {
  pillar_id: GearId;
  title: string;
  score: number;
}

export interface EvidencePrompt {
  pillar_id: GearId;
  title: string;
  /** What the paid Diagnostic would inspect for this gear. */
  prompts: string[];
}

export interface V3EnrichedView {
  rubric_kind: RubricKind;
  rubric_label: string;
  rubric_is_current: boolean;
  /** Self-reported / public-scorecard indicator copy for admin. */
  self_reported_label: string;
  /** True when the row carries enough v3 metadata to render a useful summary. */
  has_structured_metadata: boolean;
  total_score: number | null;
  interpretation_band: V3InterpretationBand | null;
  strongest_gear: GearSummary | null;
  most_slipping_gear: GearSummary | null;
  gear_scores: GearSummary[];
  worn_tooth_signals: string[];
  /** Top admin-visible risk patterns (currently mirrors worn-tooth signals, capped). */
  admin_risk_signals: string[];
  evidence_needed: EvidencePrompt[];
  recommended_next_step: {
    category: "diagnostic" | "implementation" | "monitor" | "not_a_fit";
    label: string;
    rationale: string;
  };
  fallback_note: string | null;
}

/**
 * Per-gear evidence the paid Diagnostic would inspect. These are PROMPTS,
 * not required uploads in the free Scorecard.
 */
export const EVIDENCE_PROMPTS_V3: Record<GearId, string[]> = {
  demand: [
    "Lead source report (per-channel breakdown)",
    "Inquiry log or website/contact form source report",
    "CRM export of inbound leads with first-touch source",
    "Top-channel concentration check (last 90 days)",
  ],
  conversion: [
    "Quote / proposal tracker with status",
    "Close-rate report by source and offer",
    "Documented follow-up sequence",
    "Sales pipeline export with lost-deal reasons",
  ],
  operations: [
    "SOPs for the top 3 recurring workflows",
    "Rework / callback / refund log",
    "Job or order workflow with hand-off points",
    "Task ownership list with single named owners",
  ],
  financial: [
    "Most recent monthly P&L",
    "Cash position snapshot and runway calculation",
    "AR aging report",
    "Margin or job-costing report by service / product",
  ],
  owner: [
    "SOP library or operating handbook",
    "Decision rights list (who decides what)",
    "Escalation rules to involve the owner",
    "Access / tool ownership list",
    "Vacation coverage plan",
  ],
};

export const GEAR_TITLES: Record<GearId, string> = {
  demand: "Demand Generation",
  conversion: "Revenue Conversion",
  operations: "Operational Efficiency",
  financial: "Financial Visibility",
  owner: "Owner Independence",
};

function detectRubric(version: string | null | undefined): RubricKind {
  if (version === RUBRIC_VERSION_V3) return "v3";
  if (version === RUBRIC_VERSION_V2) return "v2";
  return "unknown";
}

function isGearId(x: unknown): x is GearId {
  return (
    x === "demand" ||
    x === "conversion" ||
    x === "operations" ||
    x === "financial" ||
    x === "owner"
  );
}

function bandFor(score: number): V3InterpretationBand {
  for (const b of V3_BANDS) if (score >= b.min) return b;
  return V3_BANDS[V3_BANDS.length - 1];
}

function safeArray(x: unknown): unknown[] {
  return Array.isArray(x) ? x : [];
}

function nextStepFor(
  total: number | null,
  slipping: GearSummary | null,
): V3EnrichedView["recommended_next_step"] {
  if (total == null) {
    return {
      category: "monitor",
      label: "Review answers manually before recommending a path.",
      rationale: "No total score is available on this run.",
    };
  }
  if (total >= 850) {
    return {
      category: "monitor",
      label: "Likely fit for monitoring or selective implementation, not full Diagnostic.",
      rationale: "Self-reported answers indicate a stable foundation. Confirm before recommending.",
    };
  }
  if (total >= 700) {
    return {
      category: "implementation",
      label: "Consider scoping a targeted Implementation engagement.",
      rationale: slipping
        ? `Most visible wear is in ${slipping.title.toLowerCase()}.`
        : "Targeted fixes may resolve the visible weak spots.",
    };
  }
  if (total >= 400) {
    return {
      category: "diagnostic",
      label: "Strong fit for the paid Diagnostic.",
      rationale: slipping
        ? `Multiple gears show wear; ${slipping.title.toLowerCase()} is the most slipping.`
        : "Multiple gears show wear and need an evidence-backed review.",
    };
  }
  return {
    category: "diagnostic",
    label: "High-priority Diagnostic candidate.",
    rationale: "Self-reported answers indicate the system is carrying significant pressure.",
  };
}

/**
 * Build a derived, admin-useful view over a scorecard_runs row. Pure: no
 * network calls, no AI, no writes.
 */
export function enrichScorecardRun(row: V3RowLike): V3EnrichedView {
  const kind = detectRubric(row.rubric_version);
  const total =
    typeof row.overall_score_estimate === "number" ? row.overall_score_estimate : null;

  if (kind !== "v3") {
    // v2 / unknown — safe fallback. Do NOT invent v3 metadata.
    return {
      rubric_kind: kind,
      rubric_label:
        kind === "v2"
          ? "v2 historical · natural-language (read-only)"
          : "Unknown rubric · read-only",
      rubric_is_current: false,
      self_reported_label: "Self-reported public Scorecard answers.",
      has_structured_metadata: false,
      total_score: total,
      interpretation_band: total != null ? bandFor(total) : null,
      strongest_gear: null,
      most_slipping_gear: null,
      gear_scores: [],
      worn_tooth_signals: [],
      admin_risk_signals: [],
      evidence_needed: [],
      recommended_next_step: nextStepFor(total, null),
      fallback_note:
        kind === "v2"
          ? "Historical v2 run. Structured per-question gear metadata, worn-tooth signals, and evidence prompts were not produced by this rubric version."
          : "Rubric version is not recognized. Showing safe read-only summary only.",
    };
  }

  // v3 — derive from pillar_results.
  const pillars = safeArray(row.pillar_results) as Array<{
    pillar_id?: unknown;
    title?: unknown;
    score?: unknown;
    worn_tooth_signals?: unknown;
  }>;

  const gear_scores: GearSummary[] = [];
  const worn: string[] = [];
  for (const p of pillars) {
    if (!isGearId(p.pillar_id)) continue;
    const score = typeof p.score === "number" ? p.score : 0;
    const title = typeof p.title === "string" && p.title ? p.title : GEAR_TITLES[p.pillar_id];
    gear_scores.push({ pillar_id: p.pillar_id, title, score });
    for (const w of safeArray(p.worn_tooth_signals)) {
      if (typeof w === "string" && w.trim()) worn.push(w);
    }
  }

  const sorted = [...gear_scores].sort((a, b) => b.score - a.score);
  const strongest = sorted[0] ?? null;
  const slipping = sorted[sorted.length - 1] ?? null;

  // Worn-tooth signals: dedupe + cap at 5 (matches v3 result contract).
  const dedupedWorn = Array.from(new Set(worn)).slice(0, 5);

  // Evidence prompts: include lowest-scoring gears first, plus any gear in the
  // top_gaps list. Cap at 3 gears so the admin view stays scannable.
  const topGapIds = new Set<GearId>();
  for (const g of safeArray(row.top_gaps) as Array<{ pillar_id?: unknown }>) {
    if (isGearId(g.pillar_id)) topGapIds.add(g.pillar_id);
  }
  const evidenceGearOrder = [...gear_scores]
    .sort((a, b) => a.score - b.score)
    .map((g) => g.pillar_id);
  const evidenceGears: GearId[] = [];
  for (const id of evidenceGearOrder) {
    if (evidenceGears.length >= 3) break;
    if (topGapIds.has(id) || evidenceGears.length < 3) {
      if (!evidenceGears.includes(id)) evidenceGears.push(id);
    }
  }
  const evidence_needed: EvidencePrompt[] = evidenceGears.map((id) => ({
    pillar_id: id,
    title: GEAR_TITLES[id],
    prompts: EVIDENCE_PROMPTS_V3[id],
  }));

  return {
    rubric_kind: "v3",
    rubric_label: "v3 deterministic gears · current",
    rubric_is_current: true,
    self_reported_label:
      "Self-reported public Scorecard answers — first-pass read, not a final diagnosis.",
    has_structured_metadata: gear_scores.length > 0,
    total_score: total,
    interpretation_band: total != null ? bandFor(total) : null,
    strongest_gear: strongest,
    most_slipping_gear: slipping,
    gear_scores,
    worn_tooth_signals: dedupedWorn,
    admin_risk_signals: dedupedWorn.slice(0, 5),
    evidence_needed,
    recommended_next_step: nextStepFor(total, slipping),
    fallback_note: null,
  };
}
