import { Gauge, Activity, Flag, Lightbulb, AlertOctagon, Wrench, ArrowRight } from "lucide-react";
import {
  type DiagnosticResult,
  bandLabel,
  bandTone,
  bandRing,
  fmtMoney,
} from "@/lib/diagnostics/engine";

interface Props {
  /** Tool-specific eyebrow (e.g. "Buyer Persona"). */
  toolEyebrow: string;
  /** Two-sentence intro positioning the tool. */
  intro: string;
  result: DiagnosticResult;
  /** Optional context line shown in the header (e.g. "based on Q4 benchmark"). */
  benchmarkLabel?: string;
  /** Override score denominator. Default "/ 100". */
  scoreSuffix?: string;
  /** Hide $ leakage rendering for tools that don't model money. */
  hideMoney?: boolean;
  /** Plain-text note from the RGS team to the client. */
  clientNotes?: string;
}

/**
 * Executive-level client-facing read of a diagnostic result.
 * Mirrors the 10-section diagnostic pattern, simplified:
 *   1 Executive Summary  ·  2 Score / Condition  ·  3 What Is Happening
 *   4 Why It Matters     ·  5 Root Cause         ·  6 If Ignored
 *   7 What To Fix First  ·  8 Recommended Next RGS Step  ·  9 Note from RGS
 */
export function DiagnosticClientView({
  toolEyebrow,
  intro,
  result,
  benchmarkLabel,
  scoreSuffix = "/ 100",
  hideMoney,
  clientNotes,
}: Props) {
  const worst = result.worst;
  const hasLeaks = result.topThree.length > 0;

  return (
    <div className="space-y-6">
      {/* 1–2 EXECUTIVE SUMMARY + SCORE */}
      <div className={`rounded-2xl border p-8 md:p-10 ${bandRing(result.band)}`}>
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-3">
          <Gauge className="h-3.5 w-3.5" /> {toolEyebrow} · Overall Condition
        </div>
        <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6 items-center">
          <div>
            <div className={`font-display text-6xl md:text-7xl tabular-nums leading-none ${bandTone(result.band)}`}>
              {result.score}
              <span className="text-xl text-muted-foreground ml-2">{scoreSuffix}</span>
            </div>
            <div className={`text-xs uppercase tracking-wider mt-2 ${bandTone(result.band)}`}>
              {bandLabel(result.band)}
            </div>
          </div>
          <div className="text-sm text-foreground/90 leading-relaxed">
            {intro}
            {!hideMoney && result.monthly > 0 && (
              <div className="mt-3 text-muted-foreground">
                Estimated leakage:{" "}
                <span className="text-foreground tabular-nums">{fmtMoney(result.monthly)}</span> / month ·{" "}
                <span className="text-foreground tabular-nums">{fmtMoney(result.annual)}</span> / year.
              </div>
            )}
            {benchmarkLabel && (
              <div className="text-[11px] text-muted-foreground mt-3 uppercase tracking-wider">
                Based on: {benchmarkLabel}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3 WHAT IS HAPPENING — top categories */}
      {hasLeaks && (
        <section>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-3">
            <Activity className="h-3 w-3" /> What Is Happening
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {result.topThree.map((c) => (
              <div key={c.key} className={`rounded-xl border p-5 ${bandRing(c.band)}`}>
                <div className={`text-[10px] uppercase tracking-wider ${bandTone(c.band)}`}>{bandLabel(c.band)}</div>
                <div className="text-base text-foreground mt-1">{c.label}</div>
                <div className="text-xs text-muted-foreground mt-1">{c.short}</div>
                {!hideMoney && c.monthly > 0 && (
                  <div className="text-xs text-muted-foreground mt-3">
                    Estimated <span className="text-foreground tabular-nums">{fmtMoney(c.monthly)}</span> / mo
                  </div>
                )}
                <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-3">
                  <div className="h-full bg-foreground/40" style={{ width: `${c.score}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 4 WHY IT MATTERS + 5 ROOT CAUSE */}
      {worst && (
        <section className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-3">
            <Flag className="h-3.5 w-3.5" /> Biggest Constraint — {worst.label}
          </div>
          <p className="text-sm text-foreground leading-relaxed">{worst.rootCause}</p>
        </section>
      )}

      {/* 6 IF IGNORED */}
      {worst && (
        <section className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-amber-500 mb-2">
            <AlertOctagon className="h-3.5 w-3.5" /> If Ignored
          </div>
          <p className="text-sm text-foreground leading-relaxed">{worst.ifIgnored}</p>
        </section>
      )}

      {/* 7 WHAT TO FIX FIRST */}
      {worst && (
        <section className="bg-primary/5 border border-primary/30 rounded-xl p-6">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-primary mb-3">
            <Wrench className="h-3.5 w-3.5" /> What To Fix First
          </div>
          <p className="text-sm text-foreground leading-relaxed">{worst.fixFirst}</p>
        </section>
      )}

      {/* 8 RECOMMENDED NEXT RGS STEP */}
      <section className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
          <Lightbulb className="h-3.5 w-3.5" /> Recommended Next RGS Step
        </div>
        <div className="text-base text-foreground">{result.nextStep}</div>
        <p className="text-xs text-muted-foreground mt-2">
          Aligned to the locked RGS path: Diagnose → Design → Document → Hand off.
        </p>
      </section>

      {/* 9 NOTE FROM RGS */}
      {clientNotes?.trim() && (
        <section className="bg-card border border-border rounded-xl p-6">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">A note from your RGS team</div>
          <p className="text-sm text-foreground whitespace-pre-wrap">{clientNotes}</p>
        </section>
      )}

      <a
        href="/diagnostic-apply"
        className="inline-flex items-center gap-2 text-sm text-primary hover:text-foreground transition"
      >
        Get my stabilization plan <ArrowRight className="h-4 w-4" />
      </a>
    </div>
  );
}