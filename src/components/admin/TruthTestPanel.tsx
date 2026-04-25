/**
 * P13.TruthTesting.Rubric.H.1 — Admin-only Truth-Test panel.
 * Renders a 100-point rubric grade + commercial readiness label for a
 * scorecard run, diagnostic interview, or report draft.
 */
import { ShieldCheck, AlertTriangle, ArrowDownRight } from "lucide-react";
import {
  READINESS_LABEL,
  type CommercialLabel,
  type RubricResult,
} from "@/lib/truthTesting/rubric";

const READINESS_TONE: Record<CommercialLabel, string> = {
  not_ready: "bg-rose-500/10 text-rose-300 border-rose-500/30",
  diagnostic_ready: "bg-amber-500/10 text-amber-300 border-amber-500/30",
  implementation_ready: "bg-sky-500/10 text-sky-300 border-sky-500/30",
  premium_ready: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
};

interface Props {
  result: RubricResult;
  title?: string;
  subtitle?: string;
}

export function TruthTestPanel({ result, title = "Truth-Test", subtitle }: Props) {
  const { total, categories, readiness, top_weaknesses, must_improve } = result;

  return (
    <section className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" /> {title} · admin-only
          </div>
          <div className="mt-1 text-2xl text-foreground">
            {total}
            <span className="text-muted-foreground text-base">/100</span>
          </div>
          {subtitle ? (
            <div className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</div>
          ) : null}
        </div>
        <span
          className={`text-xs px-2.5 py-1 rounded-md border ${READINESS_TONE[readiness.label]}`}
        >
          {READINESS_LABEL[readiness.label]}
        </span>
      </div>

      <ul className="mt-4 space-y-1.5">
        {categories.map((c) => {
          const pct = c.max === 0 ? 0 : Math.round((c.score / c.max) * 100);
          return (
            <li key={c.category} className="text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-foreground truncate">{c.label}</span>
                <span
                  className={`tabular-nums ${c.pass ? "text-emerald-300" : "text-amber-300"}`}
                >
                  {c.score}/{c.max}
                </span>
              </div>
              <div className="h-1 bg-muted/50 rounded mt-0.5 overflow-hidden">
                <div
                  className={`h-full ${c.pass ? "bg-emerald-500/70" : "bg-amber-500/70"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              {!c.pass ? (
                <div className="text-[11px] text-muted-foreground mt-0.5">{c.reason}</div>
              ) : null}
            </li>
          );
        })}
      </ul>

      {top_weaknesses.length > 0 ? (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
            <ArrowDownRight className="h-3 w-3" /> Top weaknesses
          </div>
          <ul className="space-y-1 text-xs text-muted-foreground">
            {top_weaknesses.map((w) => (
              <li key={w.category}>
                <span className="text-foreground">{w.label}</span> — {w.reason}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {must_improve.length > 0 ? (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
            <AlertTriangle className="h-3 w-3 text-amber-400" /> What must improve before this is client-ready
          </div>
          <ul className="space-y-1 text-xs text-foreground list-disc list-inside">
            {must_improve.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {readiness.blockers.length > 0 ? (
        <div className="mt-3 text-[11px] text-muted-foreground">
          Readiness blockers: {readiness.blockers.join(" · ")}
        </div>
      ) : null}
    </section>
  );
}