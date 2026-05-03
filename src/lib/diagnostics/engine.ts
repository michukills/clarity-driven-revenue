/**
 * Shared diagnostic engine for every RGS tool.
 *
 * A "diagnostic" rates a business across N categories, each containing M
 * factors scored 0..5 by the admin (or, for some client tools, by the client).
 * From those severities the engine derives:
 *   • per-category score (0..100) and severity band
 *   • overall score (0..100) and band
 *   • estimated $ leakage (when a baseline + weight is provided)
 *   • top-N categories
 *   • biggest root cause / "if ignored" / "fix first" copy
 *   • suggested next RGS step (Diagnostic / Implementation / Add-ons / Monitoring)
 *
 * Every consumer (Scorecard, Buyer Persona, Journey Mapper, etc.) just supplies
 * a typed registry of categories and an instance of severities. This keeps the
 * 10-section diagnostic structure consistent across the whole tool suite.
 */

export type Severity = 0 | 1 | 2 | 3 | 4 | 5;

export type NextStep = "Diagnostic" | "Implementation" | "Add-ons / Monitoring";

export type Band = "healthy" | "watch" | "leaking" | "critical";

export type Confidence = "low" | "medium" | "high";

export type FactorRubric = Partial<Record<0 | 1 | 2 | 3 | 4 | 5, string>>;

export interface FactorEvidence {
  /** Free-text evidence the admin observed that justifies the score. Client-visible (cleaned). */
  notes?: string;
  /** Admin's confidence in the score. Defaults to "medium" if unset. */
  confidence?: Confidence;
  /** Client-facing one-liner finding (optional override; falls back to rubric meaning). */
  clientFinding?: string;
  /** Admin-only sales/strategy notes. NEVER shown to client. */
  internalNotes?: string;
}

export type EvidenceMap = Record<string, FactorEvidence>;

export interface DiagnosticFactor {
  key: string;
  label: string;
  hint?: string;
  /** What an admin should look for when scoring this factor. */
  lookFor?: string;
  /** Plain-language meaning of each 0..5 score. Drives client-facing copy. */
  rubric?: FactorRubric;
}

export interface DiagnosticCategory {
  key: string;
  label: string;
  short: string;
  factors: DiagnosticFactor[];
  /** Relative importance (0..1). Used both for weighted overall score and $ leakage estimates. */
  weight: number;
  /** Suggested next RGS step when this is the worst category. */
  nextStep: NextStep;
  rootCause: string;
  ifIgnored: string;
  fixFirst: string;
}

export interface CategoryResult {
  key: string;
  label: string;
  short: string;
  /** Average severity 0..5 across factors. */
  severity: number;
  /** 0..100 leak score (higher = more leakage). */
  score: number;
  /** 0..100 health score (100 - score). */
  health: number;
  monthly: number;
  annual: number;
  band: Band;
  nextStep: NextStep;
  rootCause: string;
  ifIgnored: string;
  fixFirst: string;
}

export interface DiagnosticResult {
  /** 0..100 overall HEALTH score (higher = healthier). Null when there is no evidence to score. */
  score: number;
  band: Band;
  monthly: number;
  annual: number;
  categories: CategoryResult[];
  topThree: CategoryResult[];
  worst: CategoryResult | null;
  strongest: CategoryResult | null;
  nextStep: NextStep;
  /**
   * "scored"        — at least one factor has a non-zero severity OR captured evidence notes.
   * "insufficient"  — nothing has been scored and no evidence captured. The headline score
   *                   should NOT be presented as a real assessment in this state.
   */
  dataState: "scored" | "insufficient";
  /** Count of factors with severity > 0. */
  scoredFactors: number;
  /** Count of factors with captured evidence notes. */
  evidenceFactors: number;
}

export type SeverityMap = Record<string, Severity | number>;

export const bandFor = (severity: number): Band => {
  if (severity < 1) return "healthy";
  if (severity < 2.5) return "watch";
  if (severity < 4) return "leaking";
  return "critical";
};

/**
 * Per-integer-score band, per the locked RGS rubric:
 *   0–1 = Stable · 2 = Watch · 3 = Leaking · 4–5 = Critical
 * Use this for the scoring buttons / per-factor badges. `bandFor` is still used
 * for averaged category/overall severity (which can be fractional).
 */
export const bandForScore = (score: number): Band => {
  const s = Math.max(0, Math.min(5, Math.round(score)));
  if (s <= 1) return "healthy";
  if (s === 2) return "watch";
  if (s === 3) return "leaking";
  return "critical";
};

/** Universal 0–5 meanings used as a tooltip fallback when a factor has no custom rubric. */
export const UNIVERSAL_SCORE_MEANINGS: Record<0 | 1 | 2 | 3 | 4 | 5, string> = {
  0: "Stable. No meaningful leak observed in this area.",
  1: "Minor friction. Working overall, with small gaps to monitor.",
  2: "Inconsistent. Outcomes vary depending on who is involved.",
  3: "Recurring leak. Costing time, revenue, or clarity each month.",
  4: "Significant leak. Actively constraining growth or cash.",
  5: "Critical. The system is broken or fully owner-dependent here.",
};

/**
 * Tooltip copy for a single score on a factor: prefers factor-specific rubric,
 * falls back to the universal meaning. Always prefixed with score + band.
 */
export const scoreTooltip = (factor: DiagnosticFactor, score: 0 | 1 | 2 | 3 | 4 | 5): string => {
  const detail = factor.rubric?.[score] ?? UNIVERSAL_SCORE_MEANINGS[score];
  return `${score} — ${bandLabel(bandForScore(score))}: ${detail}`;
};

export const bandLabel = (b: Band): string =>
  b === "critical" ? "Critical" : b === "leaking" ? "Leaking" : b === "watch" ? "Watch" : "Stable";

export const bandTone = (b: Band): string =>
  b === "critical"
    ? "text-destructive"
    : b === "leaking"
    ? "text-amber-500"
    : b === "watch"
    ? "text-foreground"
    : "text-emerald-500";

export const bandRing = (b: Band): string =>
  b === "critical"
    ? "border-destructive/40 bg-destructive/5"
    : b === "leaking"
    ? "border-amber-500/40 bg-amber-500/5"
    : b === "watch"
    ? "border-border bg-card"
    : "border-emerald-500/30 bg-emerald-500/5";

/** Build an all-zero severity map from a category registry. */
export function buildDefaultSeverities(categories: DiagnosticCategory[]): SeverityMap {
  const out: SeverityMap = {};
  for (const cat of categories) for (const f of cat.factors) out[`${cat.key}.${f.key}`] = 0;
  return out;
}

/** Forward-compatible loader: merge saved severities over fresh defaults. */
export function hydrateSeverities(
  categories: DiagnosticCategory[],
  saved: SeverityMap | null | undefined,
): SeverityMap {
  const base = buildDefaultSeverities(categories);
  if (!saved) return base;
  for (const k of Object.keys(saved)) {
    if (k in base) base[k] = saved[k];
  }
  return base;
}

export interface ComputeOptions {
  /** Optional monthly revenue baseline used to estimate $ leakage from severity. */
  baselineMonthly?: number;
  /** Optional evidence map — used only to determine whether the run has any captured evidence. */
  evidence?: EvidenceMap;
}

export function computeDiagnostic(
  categories: DiagnosticCategory[],
  severities: SeverityMap,
  opts: ComputeOptions = {},
): DiagnosticResult {
  const baseline = Math.max(0, Number(opts.baselineMonthly) || 0);

  const cats: CategoryResult[] = categories.map((cat) => {
    const vals = cat.factors.map((f) => Number(severities[`${cat.key}.${f.key}`] ?? 0));
    const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    const norm = avg / 5; // 0..1
    const monthly = Math.round(baseline * cat.weight * norm);
    const score = Math.round(norm * 100);
    return {
      key: cat.key,
      label: cat.label,
      short: cat.short,
      severity: avg,
      score,
      health: 100 - score,
      monthly,
      annual: monthly * 12,
      band: bandFor(avg),
      nextStep: cat.nextStep,
      rootCause: cat.rootCause,
      ifIgnored: cat.ifIgnored,
      fixFirst: cat.fixFirst,
    };
  });

  const monthly = cats.reduce((s, c) => s + c.monthly, 0);
  const totalWeight = categories.reduce((s, c) => s + c.weight, 0);
  const totalWeighted = cats.reduce((s, c) => {
    const w = categories.find((x) => x.key === c.key)?.weight ?? 0;
    return s + c.severity * w;
  }, 0);
  const avgSeverity = totalWeight > 0 ? totalWeighted / totalWeight : 0;
  const score = Math.round(100 - (avgSeverity / 5) * 100);

  const sortedWorst = [...cats].sort((a, b) => b.severity - a.severity);
  const sortedBest = [...cats].sort((a, b) => a.severity - b.severity);
  const worst = sortedWorst[0]?.severity > 0 ? sortedWorst[0] : null;
  const strongest = sortedBest[0] ?? null;

  // Evidence/data-state truthfulness: a perfect 100 is misleading when nothing has been scored.
  let scoredFactors = 0;
  for (const k of Object.keys(severities)) {
    if (Number(severities[k] ?? 0) > 0) scoredFactors += 1;
  }
  let evidenceFactors = 0;
  if (opts.evidence) {
    for (const k of Object.keys(opts.evidence)) {
      const ev = opts.evidence[k];
      if (ev && (ev.notes?.trim() || ev.clientFinding?.trim() || ev.internalNotes?.trim())) {
        evidenceFactors += 1;
      }
    }
  }
  const dataState: "scored" | "insufficient" =
    scoredFactors > 0 || evidenceFactors > 0 ? "scored" : "insufficient";

  return {
    score,
    band: bandFor(avgSeverity),
    monthly,
    annual: monthly * 12,
    categories: cats,
    topThree: sortedWorst.slice(0, 3).filter((c) => c.severity > 0),
    worst,
    strongest,
    nextStep: worst?.nextStep ?? "Diagnostic",
    dataState,
    scoredFactors,
    evidenceFactors,
  };
}

/**
 * Format helpers used across diagnostic UIs.
 */
export const fmtMoney = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export const fmtScore = (n: number) => `${Math.round(n)}`;

/* ─────────────────────── Scoring evidence / report ─────────────────────── */

/** Default plain-language meaning for a score when a factor doesn't define a custom rubric. */
export const DEFAULT_RUBRIC: Required<FactorRubric> = {
  0: "Stable. No leak observed in this area.",
  1: "Minor friction. Working overall, with small gaps to monitor.",
  2: "Inconsistent. Outcomes vary based on who is involved.",
  3: "Recurring leak. Costing time, revenue, or clarity each month.",
  4: "Significant leak. Actively constraining growth or cash.",
  5: "Critical. System is broken or fully owner-dependent here.",
};

export const rubricMeaning = (factor: DiagnosticFactor, score: number): string => {
  const s = Math.max(0, Math.min(5, Math.round(score))) as 0 | 1 | 2 | 3 | 4 | 5;
  return factor.rubric?.[s] ?? DEFAULT_RUBRIC[s];
};

export const confidenceLabel = (c?: Confidence) =>
  c === "high" ? "High confidence" : c === "low" ? "Low confidence" : "Medium confidence";

export const severityLabel = (s: number): string => {
  if (s >= 4) return "Critical · address now";
  if (s >= 3) return "Leaking · investigate";
  if (s >= 1) return "Watch · monitor closely";
  return "Stable";
};

/**
 * Client-safe evidence-status label. Replaces numeric severity wording on
 * client-visible surfaces. Admin views still use {@link severityLabel}.
 */
export const evidenceStatusLabel = (s: number): string => {
  if (s >= 4) return "Evidence shows a critical gap";
  if (s >= 3) return "Evidence shows a meaningful gap";
  if (s >= 1) return "Some evidence — needs review";
  return "Clear or no concern";
};

/**
 * P41.3 — Evidence status categories used everywhere RGS captures a
 * diagnostic judgment. The numeric severity (0..5) remains internal as a
 * deterministic input to the scoring math, but is NEVER shown in the UI.
 *
 * Mapping (internal-only):
 *   verified_strength  → 0
 *   mostly_supported   → 1
 *   needs_review       → 2
 *   gap_identified     → 3
 *   significant_gap    → 4
 *   critical_gap       → 5
 *   not_enough_evidence→ 2 (treated as "needs review" until evidence lands)
 */
export type EvidenceStatus =
  | "verified_strength"
  | "mostly_supported"
  | "needs_review"
  | "gap_identified"
  | "significant_gap"
  | "critical_gap"
  | "not_enough_evidence";

export const EVIDENCE_STATUS_OPTIONS: ReadonlyArray<{
  value: EvidenceStatus;
  label: string;
  hint: string;
  tone: "ok" | "watch" | "leaking" | "critical" | "muted";
}> = [
  { value: "verified_strength", label: "Verified strength", hint: "Documented, consistent, and operating as intended.", tone: "ok" },
  { value: "mostly_supported", label: "Mostly supported", hint: "Largely working, with minor exceptions or informal practice.", tone: "ok" },
  { value: "needs_review", label: "Unclear / needs review", hint: "Inconsistent or undocumented; requires more evidence.", tone: "watch" },
  { value: "gap_identified", label: "Gap identified", hint: "Clear gap with operational impact.", tone: "leaking" },
  { value: "significant_gap", label: "Significant gap", hint: "Material impact — recurring revenue, trust, or stability loss.", tone: "leaking" },
  { value: "critical_gap", label: "Critical gap", hint: "Severe, immediate constraint on the business.", tone: "critical" },
  { value: "not_enough_evidence", label: "Not enough evidence", hint: "RGS cannot judge this yet — request more from the client.", tone: "muted" },
];

export const evidenceStatusToSeverity = (s: EvidenceStatus): Severity => {
  switch (s) {
    case "verified_strength": return 0;
    case "mostly_supported": return 1;
    case "needs_review": return 2;
    case "not_enough_evidence": return 2;
    case "gap_identified": return 3;
    case "significant_gap": return 4;
    case "critical_gap": return 5;
  }
};

export const severityToEvidenceStatus = (n: number): EvidenceStatus => {
  const s = Math.max(0, Math.min(5, Math.round(n)));
  if (s === 0) return "verified_strength";
  if (s === 1) return "mostly_supported";
  if (s === 2) return "needs_review";
  if (s === 3) return "gap_identified";
  if (s === 4) return "significant_gap";
  return "critical_gap";
};

export const evidenceStatusOption = (s: EvidenceStatus) =>
  EVIDENCE_STATUS_OPTIONS.find((o) => o.value === s) ?? EVIDENCE_STATUS_OPTIONS[2];

/* ───────────────────── P41.4 — Deterministic rubric scoring ─────────────────────
 * RGS no longer asks the client/admin to manually pick an evidence status. The
 * primary input is the typed answer that describes what is actually happening.
 * `scoreEvidenceText` deterministically classifies that text into an
 * EvidenceStatus + plain-language reason. The numeric severity is derived from
 * the status and stays internal to the scoring engine.
 */

export const RUBRIC_VERSION = "rgs-rubric-2026.05.04";

export interface RubricScoreResult {
  status: EvidenceStatus;
  severity: Severity;
  reason: string;
  matched: string[];
  rubricVersion: string;
  scoredAt: string;
  scoredBySystem: true;
}

const includesAny = (hay: string, needles: string[]): string[] =>
  needles.filter((n) => hay.includes(n));

/**
 * Deterministic, dependency-free rubric. Order matters — first match wins,
 * scanning from most-severe to most-positive so that mixed answers like
 * "we use a CRM but lose leads" are correctly flagged as a gap.
 */
export function scoreEvidenceText(input: string | null | undefined): RubricScoreResult {
  const raw = (input ?? "").trim();
  const now = new Date().toISOString();
  const empty = (status: EvidenceStatus, reason: string, matched: string[] = []): RubricScoreResult => ({
    status,
    severity: evidenceStatusToSeverity(status),
    reason,
    matched,
    rubricVersion: RUBRIC_VERSION,
    scoredAt: now,
    scoredBySystem: true,
  });

  if (!raw) {
    return empty(
      "not_enough_evidence",
      "No answer captured yet — RGS cannot judge this until the owner describes what is happening.",
    );
  }

  const text = ` ${raw.toLowerCase()} `;

  const UNSURE = ["i don't know", "i do not know", "not sure", "no idea", "unclear", "unsure", "tbd", "n/a"];
  const CRITICAL = [
    "missed lead", "lost lead", "dropped deal", "lost deal", "no follow up", "no follow-up", "no followup",
    "no tracking", "no system", "lose revenue", "losing revenue", "lost revenue", "broken", "chaos",
    "fire", "no process",
  ];
  const SIGNIFICANT = [
    "owner does", "i do everything", "depends on me", "only i ", "key person", "key-person",
    "all in my head", "in my head", "no documentation", "undocumented",
  ];
  const GAP = [
    "memory", "manual only", "manually", "inconsistent", "sometimes", "depends", "ad hoc", "ad-hoc",
    "spreadsheet only", "varies", "case by case", "case-by-case", "informal",
  ];
  const MOSTLY = [
    "crm", "dashboard", "tracked", "tracking system", "weekly review", "spreadsheet", "system in place",
    "process", "documented", "sop", "checklist", "pipeline",
  ];
  const STRENGTH = [
    "consistently", "always documented", "automated", "verified", "every week", "every deal",
    "always tracked", "audited", "fully documented",
  ];

  const reasonFor = (m: string[], head: string) =>
    `${head}${m.length ? ` (mentions: ${m.slice(0, 3).join(", ")})` : ""}.`;

  let m = includesAny(text, UNSURE);
  if (m.length) {
    return empty(
      "needs_review",
      reasonFor(m, "Answer indicates the owner is unsure — RGS will gather more evidence before scoring"),
      m,
    );
  }

  m = includesAny(text, CRITICAL);
  if (m.length) {
    return empty(
      "critical_gap",
      reasonFor(m, "Answer describes lost revenue or no working system — treated as a critical gap"),
      m,
    );
  }

  m = includesAny(text, SIGNIFICANT);
  if (m.length) {
    return empty(
      "significant_gap",
      reasonFor(m, "Answer shows strong owner-dependence or no documentation — significant operational risk"),
      m,
    );
  }

  m = includesAny(text, GAP);
  if (m.length) {
    return empty(
      "gap_identified",
      reasonFor(m, "Answer suggests inconsistent or informal handling — a gap is present"),
      m,
    );
  }

  m = includesAny(text, STRENGTH);
  if (m.length) {
    return empty(
      "verified_strength",
      reasonFor(m, "Answer describes a documented, consistent system — treated as a verified strength"),
      m,
    );
  }

  m = includesAny(text, MOSTLY);
  if (m.length) {
    return empty(
      "mostly_supported",
      reasonFor(m, "Answer points to a system or process in use — mostly supported, pending review"),
      m,
    );
  }

  if (raw.length < 12) {
    return empty(
      "not_enough_evidence",
      "Answer is too short for RGS to classify — capture more detail before scoring.",
    );
  }

  return empty(
    "needs_review",
    "Answer captured, but RGS could not match it to a clear pattern — flagged for admin review.",
  );
}

/** Quick-insert chips offered under every typed evidence prompt. */
export const EVIDENCE_QUICK_INSERTS: ReadonlyArray<string> = [
  "I don't know",
  "We track this manually",
  "We use a CRM/spreadsheet",
  "It depends on the person or job",
  "No system in place — we lose revenue here",
];

export interface FactorReportItem {
  categoryKey: string;
  categoryLabel: string;
  factorKey: string;
  factorLabel: string;
  score: number;
  severityLabel: string;
  meaning: string;
  evidence: string;
  evidencePresent: boolean;
  confidence: Confidence;
  confidenceLow: boolean;
  clientFinding?: string;
  internalNotes?: string;
  lookFor?: string;
}

/**
 * Build a flat, sorted list of factor evidence items used by the generated report.
 * Sorted by score desc so the highest-risk factors come first.
 */
export function buildFactorReport(
  categories: DiagnosticCategory[],
  severities: SeverityMap,
  evidence: EvidenceMap | undefined,
): FactorReportItem[] {
  const items: FactorReportItem[] = [];
  for (const cat of categories) {
    for (const f of cat.factors) {
      const k = `${cat.key}.${f.key}`;
      const score = Number(severities[k] ?? 0);
      const ev = evidence?.[k] ?? {};
      const notes = (ev.notes ?? "").trim();
      const conf: Confidence = ev.confidence ?? "medium";
      items.push({
        categoryKey: cat.key,
        categoryLabel: cat.label,
        factorKey: f.key,
        factorLabel: f.label,
        score,
        severityLabel: severityLabel(score),
        meaning: rubricMeaning(f, score),
        evidence: notes || rubricMeaning(f, score),
        evidencePresent: notes.length > 0,
        confidence: conf,
        confidenceLow: conf === "low",
        clientFinding: (ev.clientFinding ?? "").trim() || undefined,
        internalNotes: (ev.internalNotes ?? "").trim() || undefined,
        lookFor: f.lookFor,
      });
    }
  }
  return items.sort((a, b) => b.score - a.score);
}