import type { ReportSnapshot, ReportSection } from "@/lib/bcc/reportTypes";
import { CheckCircle2, AlertTriangle, Activity, Compass, Info } from "lucide-react";
import { parseReportSnapshot } from "@/lib/bcc/reportParser";

const tone: Record<NonNullable<ReportSection["severity"]>, string> = {
  ok: "border-emerald-500/30 bg-emerald-500/5",
  watch: "border-amber-500/30 bg-amber-500/5",
  warn: "border-orange-500/40 bg-orange-500/5",
  critical: "border-rose-500/40 bg-rose-500/10",
};

const fmtMoney = (n: number) =>
  `$${Math.round(Math.abs(n)).toLocaleString()}${n < 0 ? " (out)" : ""}`;

export function ReportRenderer({
  snapshot,
  clientNotes,
  internalNotes,
  showInternal = false,
}: {
  /** May be a valid snapshot, a legacy/partial snapshot, or unknown JSON. */
  snapshot: ReportSnapshot | unknown;
  clientNotes?: string | null;
  internalNotes?: string | null;
  /** Only true in the admin viewer. The client portal must never set this. */
  showInternal?: boolean;
}) {
  const parsed = parseReportSnapshot(snapshot);
  const snap = parsed.snapshot;
  const isMonthly = snap.reportType === "monthly";
  return (
    <article className="space-y-6">
      <header className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 to-transparent p-6">
        <div className="text-[11px] uppercase tracking-[0.18em] text-primary">
          {isMonthly ? "Monthly Business Health Report" : "Quarterly Stability Review"}
        </div>
        <h1 className="mt-1 text-2xl text-foreground">{snap.customerLabel}</h1>
        <div className="text-xs text-muted-foreground mt-1">
          Period: {snap.periodStart || "—"} → {snap.periodEnd || "—"}
          {" · "}Generated {snap.generatedAt ? new Date(snap.generatedAt).toLocaleString() : "—"}
        </div>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Stat label="Health" value={snap.healthScore != null ? `${snap.healthScore}/100` : "—"} hint={snap.condition} />
          <Stat label="Revenue (period)" value={fmtMoney(snap.meta.totalRevenue)} hint={`${snap.meta.weeksCovered} weeks`} />
          <Stat label="Net cash (period)" value={fmtMoney(snap.meta.netCash)} hint={`${snap.meta.advancedWeeks} advanced check-ins`} />
        </div>
        <div className="mt-4 flex items-center gap-2 rounded-md border border-primary/30 bg-primary/10 p-3">
          <Compass className="h-4 w-4 text-primary flex-shrink-0" />
          <div className="text-xs">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Recommended next step</div>
            <div className="text-foreground font-medium">{snap.recommendedNextStep}</div>
            <div className="text-muted-foreground mt-0.5">{snap.recommendationReason}</div>
          </div>
        </div>
      </header>

      {parsed.notice && (
        <section className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 flex items-start gap-2">
          <Info className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-foreground/90">{parsed.notice}</div>
        </section>
      )}

      {clientNotes && clientNotes.trim() && (
        <section className="rounded-xl border border-border bg-card p-5">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">A note from RGS</div>
          <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{clientNotes}</p>
        </section>
      )}

      {snap.sections.length > 0 ? (
        snap.sections.map((s, idx) => <SectionBlock key={idx} section={s} />)
      ) : (
        !parsed.notice && (
          <section className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
            No report sections are available.
          </section>
        )
      )}

      {snap.trendTable && snap.trendTable.length > 0 && (
        <section className="rounded-xl border border-border bg-card p-5">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-3">Trend table</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {snap.trendTable.map((row) => (
              <div key={row.label} className="rounded-lg border border-border bg-muted/20 p-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{row.label}</div>
                <ul className="mt-1.5 space-y-0.5 text-sm tabular-nums">
                  {row.values.map((v) => (
                    <li key={v.label} className="flex justify-between">
                      <span className="text-muted-foreground">{v.label}</span>
                      <span className="text-foreground">{fmtMoney(v.value)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {showInternal && internalNotes && internalNotes.trim() && (
        <section className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-5">
          <div className="text-[11px] uppercase tracking-wider text-amber-400 mb-2 flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" /> Internal notes (admin only)
          </div>
          <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{internalNotes}</p>
        </section>
      )}
    </article>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card/60 p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-light tabular-nums text-foreground">{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div>}
    </div>
  );
}

function SectionBlock({ section }: { section: ReportSection }) {
  const sevClass = section.severity ? tone[section.severity] : "border-border bg-card";
  const Icon =
    section.severity === "warn" || section.severity === "critical"
      ? AlertTriangle
      : section.severity === "ok"
      ? CheckCircle2
      : Activity;
  return (
    <section className={`rounded-xl border p-5 ${sevClass}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-medium text-foreground">{section.title}</h2>
      </div>
      <p className="text-sm text-foreground/90 leading-relaxed">{section.body}</p>
      {section.bullets && section.bullets.length > 0 && (
        <ul className="mt-2 space-y-1 text-sm text-foreground/80">
          {section.bullets.map((b, i) => (
            <li key={i} className="leading-relaxed">• {b}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
