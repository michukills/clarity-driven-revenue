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
  /** 0..100 overall HEALTH score (higher = healthier). */
  score: number;
  band: Band;
  monthly: number;
  annual: number;
  categories: CategoryResult[];
  topThree: CategoryResult[];
  worst: CategoryResult | null;
  strongest: CategoryResult | null;
  nextStep: NextStep;
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
  0: "No meaningful issue. The system is strong here.",
  1: "Minor weakness. Low leakage risk.",
  2: "Noticeable weakness. Some leakage risk.",
  3: "Moderate breakdown. Recurring leakage.",
  4: "Serious breakdown. Major leakage.",
  5: "Severe breakdown. Urgent revenue loss.",
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
  0: "No leak observed — system is healthy here.",
  1: "Minor friction. Working overall but with small gaps.",
  2: "Noticeable inconsistency. Outcomes vary based on who's involved.",
  3: "Recurring leak. Costing time, revenue, or clarity each month.",
  4: "Significant leak. Actively constraining growth or cash.",
  5: "Severe leak. System is broken or fully owner-dependent.",
};

export const rubricMeaning = (factor: DiagnosticFactor, score: number): string => {
  const s = Math.max(0, Math.min(5, Math.round(score))) as 0 | 1 | 2 | 3 | 4 | 5;
  return factor.rubric?.[s] ?? DEFAULT_RUBRIC[s];
};

export const confidenceLabel = (c?: Confidence) =>
  c === "high" ? "High confidence" : c === "low" ? "Low confidence" : "Medium confidence";

export const severityLabel = (s: number): string => {
  if (s >= 4) return "High priority";
  if (s >= 3) return "Moderate";
  if (s >= 1) return "Watch";
  return "Stable";
};

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