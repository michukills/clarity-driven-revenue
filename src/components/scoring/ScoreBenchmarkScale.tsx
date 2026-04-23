import {
  DEFAULT_BENCHMARK_CONFIG,
  BENCHMARK_TONE_CLASSES,
  getScoreBenchmark,
  type BenchmarkLevel,
} from "@/lib/scoring/benchmark";
import { Compass } from "lucide-react";

interface Props {
  score: number | null | undefined;
  /** Override the configured tiers (e.g. industry profile). */
  config?: BenchmarkLevel[];
  /** Compact variant for embedded contexts (admin sidebars, report headers). */
  compact?: boolean;
  /** Optional label override for the score line, e.g. "Diagnostic score". */
  scoreLabel?: string;
}

/**
 * Premium 0–1000 score benchmark scale used wherever an RGS Stability
 * Score is shown. Renders the raw score, the band label, a segmented
 * 5-tier bar with the active segment highlighted, "What this means",
 * and "Recommended next focus".
 */
export function ScoreBenchmarkScale({
  score,
  config = DEFAULT_BENCHMARK_CONFIG,
  compact = false,
  scoreLabel = "RGS Stability Score",
}: Props) {
  const level = getScoreBenchmark(score, config);

  if (!level || score == null) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/40 p-5 text-sm text-muted-foreground">
        No score on file yet. The benchmark scale appears once a score is
        recorded.
      </div>
    );
  }

  const tone = BENCHMARK_TONE_CLASSES[level.tone];
  const clampedScore = Math.max(0, Math.min(1000, Math.round(score)));
  const positionPct = (clampedScore / 1000) * 100;

  return (
    <section
      className={`rounded-xl border ${tone.ring} ${tone.bg} p-5 space-y-5`}
    >
      {/* Header: score + band */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {scoreLabel}
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <div className="font-display text-4xl tabular-nums text-foreground leading-none">
              {clampedScore}
            </div>
            <div className="text-sm text-muted-foreground">/ 1,000</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Benchmark
          </div>
          <div className={`mt-1 text-sm font-medium ${tone.text}`}>
            {level.label}
          </div>
        </div>
      </div>

      {/* Segmented bar */}
      <div>
        <div className="relative h-2 rounded-full bg-muted/50 overflow-hidden flex">
          {config.map((lvl) => {
            const widthPct = ((lvl.max - lvl.min + 1) / 1001) * 100;
            const active = lvl.key === level.key;
            const lvlTone = BENCHMARK_TONE_CLASSES[lvl.tone];
            return (
              <div
                key={lvl.key}
                style={{ width: `${widthPct}%` }}
                className={`h-full ${active ? lvlTone.bar : "bg-muted/40"} border-r border-background/40 last:border-r-0`}
                aria-label={lvl.label}
              />
            );
          })}
          {/* Score marker */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-0.5 h-3 bg-foreground/80 rounded-sm"
            style={{ left: `calc(${positionPct}% - 1px)` }}
            aria-hidden
          />
        </div>
        {!compact && (
          <div className="mt-2 flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
            {config.map((lvl) => (
              <span
                key={lvl.key}
                className={lvl.key === level.key ? tone.text : ""}
              >
                {lvl.min}
              </span>
            ))}
            <span>1000</span>
          </div>
        )}
      </div>

      {!compact && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-lg border border-border bg-card/60 p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              What this means
            </div>
            <p className="mt-1.5 text-sm text-foreground/90 leading-relaxed">
              {level.meaning}
            </p>
          </div>
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
            <div className="text-[10px] uppercase tracking-wider text-primary flex items-center gap-1.5">
              <Compass className="h-3 w-3" /> Recommended next focus
            </div>
            <p className="mt-1.5 text-sm text-foreground/90 leading-relaxed">
              {level.recommendedFocus}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}