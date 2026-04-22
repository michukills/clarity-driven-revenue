import { AlertTriangle, ArrowRight, TrendingDown, Users, Target, RotateCcw, Lightbulb, Calendar } from "lucide-react";
import { LeakComputation, LeakData, fmtMoney } from "@/lib/revenueLeak";

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

  return (
    <div className="space-y-6">
      {/* BIG NUMBER */}
      <div className="rounded-2xl border border-destructive/30 bg-gradient-to-br from-destructive/10 via-destructive/5 to-transparent p-8 md:p-10">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-destructive mb-3">
          <TrendingDown className="h-3.5 w-3.5" />
          Revenue Being Lost
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

      {/* WHERE IT'S LEAKING */}
      <section>
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-3">Where it's leaking</div>
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

      {/* CURRENT vs POTENTIAL */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Current Revenue</div>
          <div className="text-2xl text-foreground tabular-nums mt-1">{fmtMoney(totalCurrentAnnual)}</div>
          <div className="text-xs text-muted-foreground mt-1">per year</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Potential Revenue</div>
          <div className="text-2xl text-emerald-500 tabular-nums mt-1">{fmtMoney(potentialAnnual)}</div>
          <div className="text-xs text-muted-foreground mt-1">at benchmark</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Revenue Gap</div>
          <div className="text-2xl text-destructive tabular-nums mt-1">{fmtMoney(gapAnnual)}</div>
          <div className="text-xs text-muted-foreground mt-1">recoverable per year</div>
        </div>
      </section>

      {/* BIGGEST LEAK */}
      {big && big.monthly > 0 && (
        <section className="rounded-2xl border border-destructive/30 bg-card p-6">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-destructive mb-3">
            <AlertTriangle className="h-3.5 w-3.5" /> Biggest Leak
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <Block label="Why it's happening" body={big.rootCause} />
            <Block label="What to do next" body={big.nextAction} accent />
            <Block label="Leverage" body={big.leverage} icon={<Lightbulb className="h-3 w-3" />} />
          </div>
        </section>
      )}

      {/* IF NOTHING CHANGES */}
      <section className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-amber-500 mb-2">
          <Calendar className="h-3.5 w-3.5" /> If nothing changes
        </div>
        <div className="text-foreground">
          You're on track to leave roughly{" "}
          <span className="text-2xl text-amber-500 tabular-nums">{fmtMoney(computed.totalAnnual)}</span>{" "}
          on the table over the next 12 months.
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          That's revenue you've already paid for in marketing, time, and overhead — but never collected.
        </p>
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
