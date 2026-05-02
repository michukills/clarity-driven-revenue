/* P7.1 — Long-Term Trends section for Revenue Control Center™.
   Pure presentational. Reads precomputed LongHorizonAnalysis. No I/O. */
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Clock, Eye, HelpCircle } from "lucide-react";
import type { LongHorizonAnalysis, HorizonKey, TrendDirection } from "@/lib/bcc/longTrend";

type Props = {
  analysis: LongHorizonAnalysis;
};

const HORIZON_ORDER: HorizonKey[] = ["4w", "13w", "26w", "52w"];

export function LongTermTrends({ analysis }: Props) {
  const { horizons, yoy, streaks, blockerStreaks, persistence, nextUnlock, watchNext, weeksAvailable, confidence } = analysis;

  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <header className="mb-5 flex items-center gap-2 pb-3 border-b border-border/60">
        <span className="text-primary"><Clock className="h-4 w-4" /></span>
        <div>
          <h3 className="text-base text-foreground font-medium tracking-tight">Long-Term Trends</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Patterns across 4, 13, 26, and 52 weeks — plus year-over-year when enough history exists.
          </p>
        </div>
      </header>

      {/* Header strip — history & confidence */}
      <div className="mb-5 rounded-md border border-border bg-muted/10 p-3 text-xs text-foreground/85 leading-relaxed flex items-start gap-2">
        <HelpCircle className="h-3.5 w-3.5 mt-0.5 text-primary flex-shrink-0" />
        <div>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground mr-2">
            History: {weeksAvailable} week{weeksAvailable === 1 ? "" : "s"} · Confidence: {confidence}
          </span>
          {nextUnlock ? (
            <>Log {nextUnlock.weeksToGo} more week{nextUnlock.weeksToGo === 1 ? "" : "s"} for the {labelForUnlock(nextUnlock.horizon)} to become available.</>
          ) : (
            <>Full long-horizon history is available, including year-over-year.</>
          )}
        </div>
      </div>

      {/* Horizon cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {HORIZON_ORDER.map((k) => (
          <HorizonCard key={k} h={horizons[k]} />
        ))}
      </div>

      {/* YoY card (full width) */}
      <div className="mb-5">
        <YoYCard yoy={yoy} />
      </div>

      {/* Streaks + persistence */}
      {(streaks.length > 0 || persistence.some((p) => p.active) || blockerStreaks.length > 0) && (
        <div className="mb-5 rounded-md border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="text-[10px] uppercase tracking-wider text-amber-300/90 mb-2 flex items-center gap-1.5">
            <AlertTriangle className="h-3 w-3" /> Pattern signals
          </div>
          <ul className="space-y-1.5 text-sm text-foreground/90">
            {streaks.map((s) => (
              <li key={s.metric}>{s.narrative}</li>
            ))}
            {persistence.filter((p) => p.active).map((p) => (
              <li key={p.key}>{p.narrative}</li>
            ))}
            {blockerStreaks.map((b) => (
              <li key={b.type}>{b.narrative}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Watch next */}
      <div className="rounded-md border border-border bg-muted/20 p-3 text-sm text-foreground/90 flex items-start gap-2">
        <Eye className="h-3.5 w-3.5 mt-0.5 text-primary flex-shrink-0" />
        <span>{watchNext}</span>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- */

function HorizonCard({ h }: { h: LongHorizonAnalysis["horizons"][HorizonKey] }) {
  if (!h.unlocked) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/10 p-3 opacity-80">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{h.label}</div>
        <div className="mt-1.5 text-sm text-muted-foreground leading-snug">
          Not yet available — {h.weeksRequired - h.weeksAvailable} more week{h.weeksRequired - h.weeksAvailable === 1 ? "" : "s"} of history needed.
        </div>
        <div className="mt-2 text-[11px] text-muted-foreground/80">
          {h.weeksAvailable}/{h.weeksRequired} weeks logged
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{h.label}</div>
      <div className="mt-2 space-y-1.5 text-[12px]">
        <SignalRow label="Revenue"   dir={h.revenueDirection} />
        <SignalRow label="Expenses"  dir={h.expensesDirection} invert />
        <SignalRow label="Net cash"  dir={h.netCashDirection} />
      </div>
      <div className="mt-3 text-[11px] text-foreground/80 leading-snug">{h.narrative}</div>
    </div>
  );
}

function SignalRow({ label, dir, invert }: { label: string; dir: TrendDirection; invert?: boolean }) {
  const { icon, tone, text } = signalDisplay(dir, invert);
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className={`inline-flex items-center gap-1 ${tone}`}>
        {icon}
        <span>{text}</span>
      </span>
    </div>
  );
}

function signalDisplay(dir: TrendDirection, invert?: boolean) {
  if (dir === "insufficient") {
    return { icon: <Minus className="h-3 w-3" />, tone: "text-muted-foreground", text: "n/a" };
  }
  if (dir === "flat") {
    return { icon: <Minus className="h-3 w-3" />, tone: "text-foreground/80", text: "flat" };
  }
  const positive = invert ? dir === "falling" : dir === "rising";
  return positive
    ? { icon: <TrendingUp className="h-3 w-3" />, tone: "text-emerald-300", text: dir === "rising" ? "rising" : "easing" }
    : { icon: <TrendingDown className="h-3 w-3" />, tone: "text-rose-300", text: dir === "rising" ? "rising" : "falling" };
}

function YoYCard({ yoy }: { yoy: LongHorizonAnalysis["yoy"] }) {
  return (
    <div className={`rounded-lg border ${yoy.available ? "border-border bg-muted/20" : "border-dashed border-border bg-muted/10 opacity-90"} p-4`}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Year-over-year</div>
      <div className="text-sm text-foreground/90 leading-relaxed">{yoy.narrative}</div>
    </div>
  );
}

function labelForUnlock(h: HorizonKey | "yoy") {
  switch (h) {
    case "4w":  return "4-week trend";
    case "13w": return "13-week (quarterly) trend";
    case "26w": return "26-week (half-year) trend";
    case "52w": return "52-week (annual) trend";
    case "yoy": return "year-over-year comparison";
  }
}
