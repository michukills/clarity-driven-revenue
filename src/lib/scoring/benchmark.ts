/* RGS Score Benchmark Scale (0–1000) — Score Band Interpretation Pass

   Single source of truth for the official 0–1000 Business Stability
   Score bands used by the public Scorecard, the client portal
   Stability Score, reports, the Stability Snapshot, exports, and any
   admin/report surface that displays a 0–1000 score.

   Bands are intentionally calibrated so:
   - A low score does not sound hopeless.
   - A high score does not sound perfect or risk-free.
   - The score is positioned as a starting read, not a final diagnosis.
   The Diagnostic remains the deeper evidence review.

   Industry-specific configs may be passed in via the optional `config`
   arg without changing call sites, but they should preserve the same
   five-band structure and tone.
*/

export type BenchmarkLevelKey =
  | "critical_instability"
  | "high_risk_reactive"
  | "functional_but_fragile"
  | "stable_with_repair_areas"
  | "strong_operating_stability";

export interface BenchmarkLevel {
  key: BenchmarkLevelKey;
  min: number;
  max: number;
  label: string;
  /** Short, plain-English explanation of what this band suggests. */
  meaning: string;
  /** What landing in this band does NOT prove on its own. */
  whatNotToAssume: string;
  /** Suggested next step for an owner in this band. */
  recommendedFocus: string;
  /** Restrained tone token for visual highlighting. */
  tone: "critical" | "fragile" | "functional" | "stable" | "high";
}

export const DEFAULT_BENCHMARK_CONFIG: BenchmarkLevel[] = [
  {
    key: "critical_instability",
    min: 0,
    max: 250,
    label: "Critical Instability",
    meaning:
      "The business appears to be carrying significant instability across multiple system areas. The owner may be relying on urgency, memory, or constant intervention to keep things moving.",
    whatNotToAssume:
      "This does not mean the business is hopeless. It means the system needs clearer visibility before more pressure is added.",
    recommendedFocus:
      "Start with a Diagnostic before spending more money on isolated fixes.",
    tone: "critical",
  },
  {
    key: "high_risk_reactive",
    min: 251,
    max: 500,
    label: "High Risk / Reactive",
    meaning:
      "The business may be functioning, but it likely depends too much on reaction, owner involvement, inconsistent follow-up, or unclear standards.",
    whatNotToAssume:
      "Producing revenue does not mean the system is stable enough to repeat success without pressure.",
    recommendedFocus:
      "Identify which gear is slipping first and validate the score through a Diagnostic.",
    tone: "fragile",
  },
  {
    key: "functional_but_fragile",
    min: 501,
    max: 700,
    label: "Functional but Fragile",
    meaning:
      "The business has working parts, but there are still areas where revenue, operations, visibility, or owner independence may break down under pressure.",
    whatNotToAssume:
      "Feeling busy or somewhat successful is not the same as being fully in control.",
    recommendedFocus:
      "Use the score to identify the weakest gears and decide whether a Diagnostic is needed to prioritize repairs.",
    tone: "functional",
  },
  {
    key: "stable_with_repair_areas",
    min: 701,
    max: 850,
    label: "Stable with Repair Areas",
    meaning:
      "The business appears to have several stable systems in place, but there are still repair areas that could create risk if ignored.",
    whatNotToAssume:
      "A stronger score does not mean there is nothing to fix. It means the business may have a better base to work from.",
    recommendedFocus:
      "Review the lowest-scoring gear areas and decide whether targeted implementation guidance or Revenue Control System™ monitoring makes sense.",
    tone: "stable",
  },
  {
    key: "strong_operating_stability",
    min: 851,
    max: 1000,
    label: "Strong Operating Stability",
    meaning:
      "The business appears to have strong operating stability across the five gears based on the information provided.",
    whatNotToAssume:
      "Strong does not mean perfect. The business may have stronger visibility, repeatability, and owner independence than most — but pressure can still reveal weak points.",
    recommendedFocus:
      "Use the score to monitor stability, watch for slipping gears, and consider the Revenue Control System™ if ongoing visibility would help keep decisions clear.",
    tone: "high",
  },
];

/**
 * Resolve the benchmark level for a given 0–1000 score.
 * Returns null when the score is missing or invalid so the UI can render
 * a graceful empty state rather than guessing a band.
 */
export function getScoreBenchmark(
  score: number | null | undefined,
  config: BenchmarkLevel[] = DEFAULT_BENCHMARK_CONFIG,
): BenchmarkLevel | null {
  if (score == null || !Number.isFinite(score)) return null;
  const clamped = Math.max(0, Math.min(1000, Math.round(score)));
  return (
    config.find((lvl) => clamped >= lvl.min && clamped <= lvl.max) ?? null
  );
}

/** Friendly label for a benchmark tone. */
export const BENCHMARK_TONE_CLASSES: Record<BenchmarkLevel["tone"], {
  bar: string;
  ring: string;
  text: string;
  bg: string;
}> = {
  critical: {
    bar: "bg-rose-500/70",
    ring: "border-rose-500/40",
    text: "text-rose-300",
    bg: "bg-rose-500/10",
  },
  fragile: {
    bar: "bg-orange-500/70",
    ring: "border-orange-500/40",
    text: "text-orange-300",
    bg: "bg-orange-500/10",
  },
  functional: {
    bar: "bg-amber-500/70",
    ring: "border-amber-500/40",
    text: "text-amber-300",
    bg: "bg-amber-500/10",
  },
  stable: {
    bar: "bg-primary/80",
    ring: "border-primary/40",
    text: "text-primary",
    bg: "bg-primary/10",
  },
  high: {
    bar: "bg-emerald-500/80",
    ring: "border-emerald-500/40",
    text: "text-emerald-300",
    bg: "bg-emerald-500/10",
  },
};