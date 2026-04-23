/* P10.0 — RGS Score Benchmark Scale (0–1000)

   Editable configuration for the 5-tier benchmark used by the public
   Scorecard, the client portal Stability Score, and any admin/report
   surface that displays a 0–1000 score.

   Designed so industry-specific or future configs can be passed in via
   the optional `config` arg without changing call sites.
*/

export type BenchmarkLevelKey =
  | "critical_instability"
  | "fragile"
  | "functional_leaking"
  | "stable_scalable"
  | "high_performance";

export interface BenchmarkLevel {
  key: BenchmarkLevelKey;
  min: number;
  max: number;
  label: string;
  /** Short explanation of what landing in this band means. */
  meaning: string;
  /** Strategic direction recommended for this band. */
  recommendedFocus: string;
  /** Restrained tone token for visual highlighting. */
  tone: "critical" | "fragile" | "functional" | "stable" | "high";
}

export const DEFAULT_BENCHMARK_CONFIG: BenchmarkLevel[] = [
  {
    key: "critical_instability",
    min: 0,
    max: 199,
    label: "Critical Instability",
    meaning:
      "The business is operating with serious structural weaknesses. Revenue, systems, and owner dependence likely create constant instability.",
    recommendedFocus:
      "Stabilize the core operating system before pursuing growth.",
    tone: "critical",
  },
  {
    key: "fragile",
    min: 200,
    max: 399,
    label: "Fragile",
    meaning:
      "The business has some functional parts but is still highly vulnerable to breakdowns, inconsistency, and hidden revenue leaks.",
    recommendedFocus:
      "Reduce fragility, clarify ownership, and address the highest-risk revenue leaks.",
    tone: "fragile",
  },
  {
    key: "functional_leaking",
    min: 400,
    max: 599,
    label: "Functional but Leaking",
    meaning:
      "The business works, but inefficiencies, conversion issues, or lack of visibility are reducing growth and profitability.",
    recommendedFocus:
      "Prioritize the leaks and bottlenecks that are limiting performance.",
    tone: "functional",
  },
  {
    key: "stable_scalable",
    min: 600,
    max: 799,
    label: "Stable and Scalable",
    meaning:
      "The business has a solid operational base and can begin scaling more predictably with targeted improvements.",
    recommendedFocus:
      "Strengthen repeatable systems and scale what is already working.",
    tone: "stable",
  },
  {
    key: "high_performance",
    min: 800,
    max: 1000,
    label: "High-Performance System",
    meaning:
      "The business is operating from a strong systems foundation with healthy scalability, visibility, and control.",
    recommendedFocus:
      "Protect the system, improve leverage, and refine high-performing growth channels.",
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