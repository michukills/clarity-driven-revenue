import { useMemo } from "react";
import type { BccDataset } from "@/lib/bcc/types";
import { computeMetrics, computeHealth, detectIssues, detectDataGaps, recommendNextStep } from "@/lib/bcc/engine";
import { SeverityBadge } from "./SeverityBadge";
import { Money, fmtPct } from "./Money";
import { AlertTriangle, ArrowRight, FileText, Target } from "lucide-react";

const NEXT_STEP_ROUTE: Record<string, string> = {
  Diagnostic: "/admin/diagnostic-system",
  Implementation: "/admin/operations-sop",
  "Add-ons / Monitoring": "/admin/add-on-monitoring",
};

function Section({ n, title, children, eyebrow }: { n: number; title: string; eyebrow?: string; children: React.ReactNode }) {
  return (
    <section className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-baseline gap-3 mb-4">
        <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Section {n}</span>
        <h3 className="text-base font-medium text-foreground">{title}</h3>
      </div>
      {eyebrow && <p className="text-xs text-muted-foreground mb-3">{eyebrow}</p>}
      {children}
    </section>
  );
}

export function BusinessControlReport({
  data,
  audience,
  adminNotes,
  isSample,
}: {
  data: BccDataset;
  audience: "client" | "admin";
  adminNotes?: string | null;
  isSample?: boolean;
}) {
  const m = useMemo(() => computeMetrics(data), [data]);
  const h = useMemo(() => computeHealth(m, data), [m, data]);
  const issues = useMemo(() => detectIssues(m, data, data.goals), [m, data]);
  const gaps = useMemo(() => detectDataGaps(data), [data]);
  const nextStep = useMemo(() => recommendNextStep(issues, h), [issues, h]);
  const fixFirst = issues[0];
  const ownerSummary = buildOwnerSummary(m, h, issues);

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">RGS Business Control Report</div>
            <h2 className="mt-2 text-2xl text-foreground font-light">Operating read for this period</h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
              QuickBooks shows what happened. This report explains what it means, where the business needs attention, and what to consider next. It is not tax, legal, or accounting advice.
            </p>
          </div>
          {isSample && (
            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[10px] uppercase tracking-wider text-amber-300">
              Showing sample data
            </span>
          )}
        </div>
      </div>

      {/* 1 — Executive Summary */}
      <Section n={1} title="Executive Summary">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Total revenue" value={<Money value={m.totalRevenue} />} />
          <Stat label="Total expenses" value={<Money value={m.totalExpenses} />} />
          <Stat label="Payroll & labor" value={<Money value={m.payrollCost + m.laborCost} />} />
          <Stat label="Net profit" value={<Money value={m.netProfit} signed />} />
          <Stat label="Profit margin" value={fmtPct(m.profitMargin)} />
          <Stat label="Cash movement" value={<Money value={m.netCash} signed />} />
          <Stat label="Receivables open" value={<Money value={m.receivablesOpen} />} />
          <Stat label="Overall condition" value={<span className="text-foreground">{h.condition}</span>} />
        </div>
      </Section>

      {/* 2 — What Changed */}
      <Section n={2} title="What Changed This Period">
        <p className="text-sm text-muted-foreground">
          Period-over-period analysis activates once a second reporting period is recorded. Until then, this section will stay quiet on purpose.
        </p>
      </Section>

      {/* 3 — Areas Needing Attention */}
      <Section n={3} title="Areas Needing Attention" eyebrow="Signals worth investigating in this period's data.">
        {issues.length === 0 ? (
          <p className="text-sm text-emerald-300">No critical attention areas surfaced for this period.</p>
        ) : (
          <div className="space-y-2">
            {issues.map((i) => (
              <div key={i.key} className="flex items-start justify-between gap-3 p-3 rounded-md bg-muted/20 border border-border">
                <div className="min-w-0">
                  <div className="text-sm text-foreground">{i.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 capitalize">{i.category} signal</div>
                </div>
                <SeverityBadge severity={i.severity} />
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* 4 — Revenue Leak Signals */}
      <Section n={4} title="Revenue Leak Signals" eyebrow="Areas where money may be leaking based on this period's data.">
        <RevenueLeakSignals m={m} data={data} />
      </Section>

      {/* 5 — Guidance & Suggested Actions */}
      <Section n={5} title="Guidance & Suggested Actions">
        {issues.length === 0 ? (
          <p className="text-sm text-muted-foreground">No actions needed this period. Continue weekly tracking and review again next period.</p>
        ) : (
          <div className="space-y-3">
            {issues.map((i) => (
              <div key={i.key} className="rounded-lg border border-border bg-muted/10 p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="text-sm font-medium text-foreground">{i.title}</div>
                  <SeverityBadge severity={i.severity} />
                </div>
                <dl className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <Block label="What this signal means" value={i.meaning} />
                  <Block label="Why it matters" value={i.matters} />
                  <Block label="Consider doing this next" value={i.next} />
                </dl>
                {i.dollarImpact ? (
                  <div className="mt-3 text-[11px] text-muted-foreground">
                    Estimated impact: <Money value={i.dollarImpact} /> · directional, not a forecast.
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* 6 — What To Fix First */}
      <Section n={6} title="What To Fix First">
        {fixFirst ? (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 flex items-start gap-3">
            <Target className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <div className="min-w-0">
              <div className="text-sm text-foreground">{fixFirst.title}</div>
              <div className="text-xs text-muted-foreground mt-1">{fixFirst.next}</div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nothing critical to address right now. Maintain weekly tracking and review again next period.</p>
        )}
      </Section>

      {/* 7 — RGS Recommended Next Step */}
      <Section n={7} title="RGS Recommended Next Step">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs text-primary">{nextStep}</span>
          <span className="text-xs text-muted-foreground">{recommendCopy(nextStep)}</span>
          {audience === "admin" && NEXT_STEP_ROUTE[nextStep] && (
            <a href={NEXT_STEP_ROUTE[nextStep]} className="ml-auto inline-flex items-center gap-1 text-xs text-primary hover:underline">
              Open domain <ArrowRight className="h-3 w-3" />
            </a>
          )}
        </div>
      </Section>

      {/* 8 — Data Gaps */}
      <Section n={8} title="Data Gaps">
        {gaps.length === 0 ? (
          <p className="text-sm text-emerald-300">All core data is present. Confidence in this read is high.</p>
        ) : (
          <>
            <div className="flex items-start gap-2 text-xs text-amber-200 mb-3">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5" />
              Confidence in this read is limited because key business data is missing. Treat the guidance below as directional.
            </div>
            <ul className="space-y-1.5 text-sm text-muted-foreground list-disc pl-5">
              {gaps.map((g) => <li key={g}>{g}</li>)}
            </ul>
          </>
        )}
      </Section>

      {/* 9 — Owner Summary */}
      <Section n={9} title="Owner Summary">
        <div className="rounded-lg border border-border bg-muted/10 p-4 text-sm text-foreground leading-relaxed whitespace-pre-line">
          {ownerSummary}
        </div>
      </Section>

      {/* Admin-only: internal notes */}
      {audience === "admin" && (
        <Section n={10} title="Internal Advisor Notes" eyebrow="Visible to RGS team only.">
          <div className="rounded-lg border border-dashed border-border bg-muted/10 p-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-3.5 w-3.5" />
              <span className="uppercase tracking-wider">Admin context</span>
            </div>
            {adminNotes ? <p className="text-foreground whitespace-pre-line">{adminNotes}</p> : <p>No internal notes recorded for this snapshot.</p>}
            {gaps.length > 2 && (
              <p className="mt-3 text-amber-300">⚠ Confidence warning: {gaps.length} data gaps detected. Consider collecting missing data before sharing this report with the client.</p>
            )}
          </div>
        </Section>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md bg-muted/20 border border-border p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-light tabular-nums">{value}</div>
    </div>
  );
}
function Block({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-foreground/90 leading-relaxed">{value}</dd>
    </div>
  );
}

function recommendCopy(step: string) {
  if (step === "Diagnostic") return "Signals point to deeper structural leaks. A full diagnostic will map the revenue system before anything is rebuilt.";
  if (step === "Implementation") return "Operational issues are clear enough to act on. The business is ready for a structured implementation phase.";
  return "The read is stable. Monitoring add-ons will catch drift before it turns into a leak.";
}

function buildOwnerSummary(m: ReturnType<typeof computeMetrics>, h: ReturnType<typeof computeHealth>, issues: ReturnType<typeof detectIssues>) {
  const going =
    h.overall >= 65
      ? "The business reads as structurally stable this period."
      : h.overall >= 50
      ? "There are signs of strength, but several watch points need attention."
      : "The business shows meaningful pressure points worth addressing now.";
  const attention =
    issues.length === 0
      ? "No urgent attention areas surfaced."
      : `Areas worth investigating: ${issues.slice(0, 3).map((i) => i.title).join("; ")}.`;
  const action = issues[0]
    ? `Consider starting here: ${issues[0].next}`
    : "Continue weekly tracking and review again next period.";
  return `${going}\n\n${attention}\n\n${action}`;
}

function RevenueLeakSignals({ m, data }: { m: ReturnType<typeof computeMetrics>; data: BccDataset }) {
  const signals: { label: string; detail: string }[] = [];
  if (m.profitMargin < 10 && m.totalRevenue > 0) signals.push({ label: "Revenue not covering full cost of delivery", detail: "Net margin is below 10% — pricing or cost structure should be reviewed." });
  if (m.laborPctRevenue > 50) signals.push({ label: "High payroll & labor load", detail: `${m.laborPctRevenue.toFixed(0)}% of revenue is consumed by labor.` });
  if (m.recurringRevenuePct < 25 && m.totalRevenue > 0) signals.push({ label: "Weak recurring revenue", detail: "Less than a quarter of revenue is recurring." });
  if (m.receivablesOverdue > 0) signals.push({ label: "Overdue receivables", detail: `$${Math.round(m.receivablesOverdue).toLocaleString()} earned but not collected.` });
  if (m.topClientShare > 40) signals.push({ label: "Client concentration", detail: `One client/job represents ${m.topClientShare.toFixed(0)}% of revenue.` });
  const fixedShare = data.expenses.length ? (data.expenses.filter((e) => e.expense_type === "fixed").reduce((a, e) => a + e.amount, 0) / m.totalExpenses) * 100 : 0;
  if (fixedShare > 60 && m.totalExpenses > 0) signals.push({ label: "High fixed expense base", detail: `${fixedShare.toFixed(0)}% of expenses are fixed — limited flexibility in slow months.` });
  if (m.netCash < 0 && m.netProfit > 0) signals.push({ label: "Cash flow mismatch", detail: "Profit looks healthy but cash is leaving faster than it arrives." });

  if (!signals.length) return <p className="text-sm text-emerald-300">No active revenue leak signals detected this period.</p>;
  return (
    <ul className="space-y-2">
      {signals.map((s) => (
        <li key={s.label} className="flex items-start gap-3 p-3 rounded-md bg-muted/20 border border-border">
          <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
          <div>
            <div className="text-sm text-foreground">{s.label}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{s.detail}</div>
          </div>
        </li>
      ))}
    </ul>
  );
}