import { ArrowRight, TrendingDown, Users, Target, RotateCcw, Lightbulb, Activity, Flag, Wrench, AlertOctagon, Gauge } from "lucide-react";
import { LeakComputation, LeakData, fmtMoney, computeSystemLeak, REVENUE_SYSTEM_CATEGORIES } from "@/lib/revenueLeak";
import { DiagnosticReport } from "@/components/diagnostics/DiagnosticReport";
import { computeDiagnostic, hydrateSeverities } from "@/lib/diagnostics/engine";

interface Props {
  data: LeakData;
  computed: LeakComputation;
  /** Optional benchmark name shown in the header. */
  benchmarkLabel?: string;
}

const CAT_META = {
  lead:       { label: "Lead Loss",       desc: "Missed leads & slow response",       icon: Users,   color: "text-amber-500", bg: "bg-amber-500/10" },
  conversion: { label: "Conversion Loss", desc: "Low close rate & poor follow-up",    icon: Target,  color: "text-orange-500", bg: "bg-orange-500/10" },
  retention:  { label: "Retention Loss",  desc: "No repeat business",                 icon: RotateCcw,color: "text-rose-500",  bg: "bg-rose-500/10" },
} as const;

export function RevenueLeakClientView({ data, computed, benchmarkLabel }: Props) {
  const big = computed.biggest;
  const totalCurrentAnnual = computed.currentRev * 12;
  const potentialAnnual = computed.bestRev * 12;
  const gapAnnual = Math.max(0, potentialAnnual - totalCurrentAnnual);
  const sys = computeSystemLeak(data);
  const hasSystem = sys.topThree.length > 0;
  const hydratedSeverities = hydrateSeverities(REVENUE_SYSTEM_CATEGORIES, data.system_severities);
  const diagnostic = computeDiagnostic(REVENUE_SYSTEM_CATEGORIES, hydratedSeverities, {
    baselineMonthly: data.system_baseline_monthly,
  });
  const bandTone = (b: string) =>
    b === "critical" ? "text-destructive" : b === "leaking" ? "text-amber-500" : b === "watch" ? "text-foreground" : "text-emerald-500";
  const bandLabel = (b: string) =>
    b === "critical" ? "Critical leakage" : b === "leaking" ? "Leaking" : b === "watch" ? "Watch" : "Stable";

  return (
    <div className="space-y-6">
      {/* Generated diagnostic report — uses shared rubric/evidence layer; admin-only notes are stripped (audience=client). */}
      <DiagnosticReport
        toolEyebrow="Revenue Leak Detection"
        categories={REVENUE_SYSTEM_CATEGORIES}
        severities={hydratedSeverities}
        evidence={data.system_evidence}
        result={diagnostic}
        audience="client"
      />

      {/* 0. SYSTEM CONDITION — full-business view */}
      <div className="rounded-2xl border border-border bg-card p-8 md:p-10">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-3">
          <Gauge className="h-3.5 w-3.5" /> Overall Revenue System Condition
        </div>
        <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6 items-center">
          <div>
            <div className={`font-display text-6xl md:text-7xl tabular-nums leading-none ${bandTone(sys.band)}`}>
              {sys.score}
              <span className="text-xl text-muted-foreground ml-2">/ 100</span>
            </div>
            <div className={`text-xs uppercase tracking-wider mt-2 ${bandTone(sys.band)}`}>{bandLabel(sys.band)}</div>
          </div>
          <div className="text-sm text-foreground/90 leading-relaxed">
            This is the full revenue system, not a marketing audit. It reads market clarity, lead capture, sales,
            pricing, delivery, retention, financial visibility, and owner dependency together — the way money actually
            moves through the business.
            {sys.monthly > 0 && (
              <div className="mt-3 text-muted-foreground">
                Estimated leakage: <span className="text-foreground tabular-nums">{fmtMoney(sys.monthly)}</span> / month ·{" "}
                <span className="text-foreground tabular-nums">{fmtMoney(sys.annual)}</span> / year.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 1. TOP IMPACT — the big number */}
      <div className="rounded-2xl border border-destructive/30 bg-gradient-to-br from-destructive/10 via-destructive/5 to-transparent p-8 md:p-10">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-destructive mb-3">
          <TrendingDown className="h-3.5 w-3.5" />
          Funnel Leakage — Revenue Being Lost
        </div>
        <div className="font-display text-5xl md:text-7xl text-foreground tabular-nums leading-none">
          {fmtMoney(computed.totalMonthly)}
          <span className="text-xl md:text-2xl text-muted-foreground ml-3">/ month</span>
        </div>
        <div className="text-sm text-muted-foreground mt-3">
          That's <span className="text-destructive font-medium tabular-nums">{fmtMoney(computed.totalAnnual)}</span> per year leaving the business.
        </div>
        {benchmarkLabel && (
          <div className="text-[11px] text-muted-foreground mt-4 uppercase tracking-wider">Based on: {benchmarkLabel}</div>
        )}
      </div>

      {/* SYSTEM TOP LEAKS — across all 8 categories */}
      {hasSystem && (
        <section>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-3">
            <Activity className="h-3 w-3" /> Top System Leaks
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {sys.topThree.map((c) => (
              <div key={c.key} className="rounded-xl border border-border p-5 bg-card">
                <div className={`text-[10px] uppercase tracking-wider ${bandTone(c.band)}`}>{bandLabel(c.band)}</div>
                <div className="text-base text-foreground mt-1">{c.label}</div>
                <div className="text-xs text-muted-foreground mt-1">{c.short}</div>
                {c.monthly > 0 && (
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
          {sys.worst && (
            <div className="mt-4 text-xs text-muted-foreground">
              Suggested next RGS step: <span className="text-foreground">{sys.nextStep}</span> — starting with{" "}
              <span className="text-foreground">{sys.worst.label}</span>.
            </div>
          )}
        </section>
      )}

      {/* 2. WHAT'S HAPPENING — where it's leaking */}
      <section>
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-3">
          <Activity className="h-3 w-3" /> Funnel Breakdown
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(Object.keys(CAT_META) as Array<keyof typeof CAT_META>).map((k) => {
            const m = CAT_META[k];
            const Icon = m.icon;
            const value = computed.byCategory[k];
            const pct = computed.totalMonthly > 0 ? Math.round((value / computed.totalMonthly) * 100) : 0;
            return (
              <div key={k} className={`rounded-xl border border-border p-5 ${m.bg}`}>
                <div className={`flex items-center gap-2 ${m.color} mb-2`}>
                  <Icon className="h-4 w-4" />
                  <span className="text-sm">{m.label}</span>
                </div>
                <div className="text-2xl text-foreground tabular-nums">{fmtMoney(value)}<span className="text-sm text-muted-foreground"> / mo</span></div>
                <div className="text-xs text-muted-foreground mt-1">{m.desc}</div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-3">
                  <div className="h-full bg-foreground/40" style={{ width: `${pct}%` }} />
                </div>
                <div className="text-[10px] text-muted-foreground mt-1 tabular-nums">{pct}% of total leak</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. WHAT'S MOST IMPORTANT — the biggest leak */}
      {big && big.monthly > 0 && (
        <section className="rounded-2xl border border-destructive/30 bg-card p-6">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-destructive mb-3">
            <Flag className="h-3.5 w-3.5" /> 3 · What's Most Important — Biggest Leak
          </div>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-start">
            <div>
              <h3 className="text-2xl text-foreground">{big.label}</h3>
              <p className="text-sm text-muted-foreground mt-1">{big.why}</p>
            </div>
            <div className="text-right">
              <div className="text-3xl text-destructive tabular-nums">{fmtMoney(big.monthly)}</div>
              <div className="text-xs text-muted-foreground">/ month lost</div>
            </div>
          </div>
        </section>
      )}

      {/* 4. WHY IT'S HAPPENING */}
      {big && big.monthly > 0 && (
        <section className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-3">
            <Lightbulb className="h-3.5 w-3.5" /> 4 · Why It's Happening
          </div>
          <p className="text-sm text-foreground leading-relaxed">{big.rootCause}</p>
        </section>
      )}

      {/* 5. WHAT TO DO NEXT */}
      {big && big.monthly > 0 && (
        <section className="bg-primary/5 border border-primary/30 rounded-xl p-6">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-primary mb-3">
            <Wrench className="h-3.5 w-3.5" /> 5 · What To Do Next
          </div>
          <p className="text-sm text-foreground leading-relaxed">{big.nextAction}</p>
          <p className="text-xs text-muted-foreground mt-3"><span className="text-foreground">Leverage:</span> {big.leverage}</p>
        </section>
      )}

      {/* 6. IF IGNORED */}
      <section className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-amber-500 mb-2">
          <AlertOctagon className="h-3.5 w-3.5" /> 6 · If Ignored
        </div>
        <div className="text-foreground">
          You're on track to leave roughly{" "}
          <span className="text-2xl text-amber-500 tabular-nums">{fmtMoney(computed.totalAnnual)}</span>{" "}
          on the table over the next 12 months.
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          That's revenue you've already paid for in marketing, time, and overhead — but never collected.
        </p>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <Mini label="Current revenue / yr" value={fmtMoney(totalCurrentAnnual)} />
          <Mini label="At benchmark / yr" value={fmtMoney(potentialAnnual)} accent />
          <Mini label="Recoverable / yr" value={fmtMoney(gapAnnual)} danger />
        </div>
      </section>

      {/* CLIENT NOTES (from RGS) */}
      {data.client_notes?.trim() && (
        <section className="bg-card border border-border rounded-xl p-6">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">A note from your RGS team</div>
          <p className="text-sm text-foreground whitespace-pre-wrap">{data.client_notes}</p>
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

function Block({ label, body, accent, icon }: { label: string; body: string; accent?: boolean; icon?: React.ReactNode }) {
  return (
    <div className={`rounded-lg p-4 ${accent ? "bg-primary/10 border border-primary/30" : "bg-muted/30 border border-border"}`}>
      <div className={`flex items-center gap-1.5 text-[10px] uppercase tracking-wider mb-2 ${accent ? "text-primary" : "text-muted-foreground"}`}>
        {icon} {label}
      </div>
      <p className="text-sm text-foreground leading-relaxed">{body}</p>
    </div>
  );
}

function Mini({ label, value, accent, danger }: { label: string; value: string; accent?: boolean; danger?: boolean }) {
  const tone = danger ? "text-destructive" : accent ? "text-emerald-500" : "text-foreground";
  return (
    <div className="bg-card/60 border border-border rounded-lg p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-lg tabular-nums mt-0.5 ${tone}`}>{value}</div>
    </div>
  );
}
