import { useMemo, useState } from "react";
import {
  Plus,
  Sparkles,
  Activity,
  AlertTriangle,
  FileText,
  Info,
  TrendingUp,
  TrendingDown,
  X,
  CheckCircle2,
  Target,
  Wallet,
  Receipt,
  Users,
  Banknote,
  StickyNote,
} from "lucide-react";
import { computeMetrics, computeHealth, detectIssues, detectDataGaps, recommendNextStep, periodChange } from "@/lib/bcc/engine";
import type { BccDataset } from "@/lib/bcc/types";
import {
  buildInsightContext,
  buildInsights,
  prioritizeFixFirst,
  type Insight,
  type InsightContext,
  type InsightSeverity,
} from "@/lib/bcc/intelligence";
import { Money, fmtPct, fmtMoney } from "./Money";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { WeeklyCheckIn } from "./WeeklyCheckIn";

type Props = {
  data: BccDataset;
  customerId: string | null;
  isSample: boolean;
  onChange: () => void;
};

const today = () => new Date().toISOString().slice(0, 10);
const lastSunday = () => {
  const d = new Date();
  const day = d.getDay(); // 0=Sun
  d.setDate(d.getDate() - day - 7); // start of previous week (Sun)
  return d.toISOString().slice(0, 10);
};
const lastSaturday = () => {
  const d = new Date();
  const day = d.getDay();
  d.setDate(d.getDate() - day - 1);
  return d.toISOString().slice(0, 10);
};

/* =========================================================================
   ClientRevenueTracker — full Business Control Tracker (client-facing)
   ========================================================================= */
export function ClientRevenueTracker({ data, customerId, isSample, onChange }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const m = useMemo(() => computeMetrics(data), [data]);
  const health = useMemo(() => computeHealth(m, data), [m, data]);
  const issues = useMemo(() => detectIssues(m, data, data.goals), [m, data]);
  const gaps = useMemo(() => detectDataGaps(data), [data]);
  const nextStep = useMemo(() => recommendNextStep(issues, health), [issues, health]);
  // P3 Pass B — intelligence layer
  const ctx = useMemo(() => buildInsightContext(m, data), [m, data]);
  const insights = useMemo(() => buildInsights(ctx), [ctx]);
  const fixFirst = useMemo(() => prioritizeFixFirst(insights), [insights]);

  const recurringRevenue = useMemo(
    () => data.revenue.filter((r) => r.revenue_type === "recurring").reduce((a, r) => a + (r.amount || 0), 0),
    [data.revenue],
  );
  const oneTimeRevenue = m.totalRevenue - recurringRevenue;

  // Weekly history derived from revenue entries (week-bucketed)
  const weeklyHistory = useMemo(() => buildWeeklyHistory(data), [data]);
  const currentWeek = weeklyHistory[0];
  const prevWeek = weeklyHistory[1];

  const isLinked = !!customerId;
  const canSave = isLinked && !isSample;

  return (
    <div className="space-y-10">
      {/* Action bar — the page title comes from DomainShell so we don't repeat it */}
      <header className="flex justify-end">
        <button
          onClick={() => setDrawerOpen(true)}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 shadow-sm"
        >
          <Plus className="h-4 w-4" /> Add weekly entry
        </button>
      </header>

      {/* Inline notices (never replace the module) */}
      {!isLinked && (
        <Notice tone="info" icon={<Info className="h-3.5 w-3.5 text-primary" />}>
          <span className="font-medium">Live saving will be activated by your RGS team.</span> You can preview
          the Revenue Tracker structure here; your weekly data will start saving once activation is complete.
        </Notice>
      )}
      {isSample && isLinked && (
        <Notice tone="muted" icon={<Sparkles className="h-3.5 w-3.5 text-secondary" />}>
          <span className="font-medium text-foreground">Showing example numbers.</span> Your first real weekly
          entry will replace this preview.
        </Notice>
      )}

      {/* C. Summary Dashboard */}
      <section className="rounded-xl border border-border bg-card p-6">
        <SectionHeading icon={<Activity className="h-4 w-4" />} title="This period at a glance" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard label="Revenue collected" value={<Money value={m.collectedRevenue} />} tone="ok" />
          <StatCard label="Pending revenue" value={<Money value={m.pendingRevenue} />} tone="watch" />
          <StatCard label="Overdue revenue" value={<Money value={m.overdueRevenue} />} tone="critical" />
          <StatCard label="Total expenses" value={<Money value={m.totalExpenses} />} />
          <StatCard label="Payroll / labor" value={<Money value={m.payrollCost + m.laborCost} />} hint={fmtPct(m.laborPctRevenue) + " of revenue"} />
          <StatCard label="Net cash movement" value={<Money value={m.netCash} signed />} tone={m.netCash < 0 ? "critical" : "ok"} />
          <StatCard label="Recurring revenue" value={<Money value={recurringRevenue} />} hint={fmtPct(m.recurringRevenuePct)} />
          <StatCard label="One-time revenue" value={<Money value={oneTimeRevenue} />} />
          <StatCard
            label="Receivables risk"
            value={<Money value={m.receivablesOverdue} />}
            hint={m.receivablesOpen > 0 ? `${Math.round((m.receivablesOverdue / m.receivablesOpen) * 100)}% of open` : "No open invoices"}
            tone={m.receivablesOverdue > 0 ? "watch" : undefined}
          />
          <StatCard
            label="Business health"
            value={<span className="text-base">{health.condition}</span>}
            hint={`${health.overall}/100`}
            tone={health.overall >= 65 ? "ok" : health.overall >= 50 ? "watch" : "critical"}
          />
        </div>
      </section>

      {/* D. Business Control Insights */}
      <BusinessControlInsights
        ctx={ctx}
        insights={insights}
        fixFirst={fixFirst}
      />

      {/* F. Weekly Entries History */}
      <WeeklyHistorySection
        weeks={weeklyHistory}
        onAdd={() => setDrawerOpen(true)}
        hasAnyData={data.revenue.length > 0 || data.expenses.length > 0 || data.cashflow.length > 0}
      />

      {/* F2. Manage individual entries (edit / delete) */}
      {canSave && (
        <ManageEntriesSection data={data} onChange={onChange} />
      )}

      {/* E. Business Control Report (generated) */}
      <BusinessControlReport
        m={m}
        health={health}
        issues={issues}
        gaps={gaps}
        nextStep={nextStep}
        currentWeek={currentWeek}
        prevWeek={prevWeek}
        ctx={ctx}
        insights={insights}
        fixFirst={fixFirst}
      />

      {/* B. Weekly Entry Drawer */}
      {drawerOpen && (
        <WeeklyCheckIn
          customerId={customerId}
          canSave={canSave}
          onClose={() => setDrawerOpen(false)}
          onSaved={() => {
            setDrawerOpen(false);
            onChange();
          }}
        />
      )}
    </div>
  );
}

/* ===== Building blocks ===== */

function SectionHeading({ icon, title, subtitle }: { icon?: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-2 pb-3 border-b border-border/60">
      {icon && <span className="text-primary">{icon}</span>}
      <h3 className="text-base text-foreground font-medium tracking-tight">{title}</h3>
      {subtitle && <span className="text-xs text-muted-foreground">— {subtitle}</span>}
    </div>
  );
}

function Notice({ tone, icon, children }: { tone: "info" | "muted" | "warn"; icon: React.ReactNode; children: React.ReactNode }) {
  const cls =
    tone === "info"
      ? "border-primary/30 bg-primary/5"
      : tone === "warn"
      ? "border-amber-500/30 bg-amber-500/5"
      : "border-secondary/40 bg-secondary/5";
  return (
    <div className={`rounded-md border ${cls} p-3 text-xs text-foreground flex items-start gap-2`}>
      <span className="mt-0.5 flex-shrink-0">{icon}</span>
      <div className="leading-relaxed">{children}</div>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  tone?: "ok" | "watch" | "critical";
  hint?: React.ReactNode;
}) {
  const toneCls =
    tone === "ok"
      ? "text-emerald-300"
      : tone === "watch"
      ? "text-amber-300"
      : tone === "critical"
      ? "text-rose-300"
      : "text-foreground";
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-4 hover:bg-muted/30 transition-colors">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-2 text-2xl font-light tabular-nums truncate ${toneCls}`}>{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground mt-1 truncate">{hint}</div>}
    </div>
  );
}

/* ===== Insights ===== */
function BusinessControlInsights({
  ctx,
  insights,
  fixFirst,
}: {
  ctx: InsightContext;
  insights: Insight[];
  fixFirst: Insight[];
}) {
  const { revenueTrend, expenseTrend, cashTrend, blockers, quality } = ctx;

  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <SectionHeading
        icon={<Activity className="h-4 w-4" />}
        title="Business Control Insights"
        subtitle="Signal · Meaning · Suggested action"
      />

      {/* Data confidence framing */}
      <div className="mb-5 rounded-md border border-border bg-muted/10 p-3 text-xs text-foreground/85 leading-relaxed flex items-start gap-2">
        <Info className="h-3.5 w-3.5 mt-0.5 text-primary flex-shrink-0" />
        <div>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground mr-2">
            Insight confidence: {quality.confidence}
          </span>
          {quality.note}
        </div>
      </div>

      {/* Trend strip */}
      <div className="mb-5 grid grid-cols-1 md:grid-cols-3 gap-3">
        <TrendCard label="Revenue this week" tc={revenueTrend} kind="money" />
        <TrendCard label="Expenses this week" tc={expenseTrend} kind="money" invert />
        <TrendCard label="Net cash this week" tc={cashTrend} kind="money" />
      </div>

      {/* Fix first banner */}
      {fixFirst.length > 0 && (
        <div className="mb-5 rounded-md border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="text-[10px] uppercase tracking-wider text-amber-300/90 mb-2 flex items-center gap-1.5">
            <AlertTriangle className="h-3 w-3" /> What to fix first
          </div>
          <ol className="space-y-1.5 text-sm text-foreground/90">
            {fixFirst.slice(0, 3).map((i, idx) => (
              <li key={i.key} className="leading-relaxed">
                <span className="text-foreground font-medium mr-1.5">{idx + 1}.</span>
                <span className="text-foreground">{i.title}</span>
                <span className="text-muted-foreground"> — {i.action}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Repeated blockers */}
      {blockers.length > 0 && (
        <div className="mb-5 rounded-md border border-rose-500/30 bg-rose-500/5 p-4">
          <div className="text-[10px] uppercase tracking-wider text-rose-300/90 mb-2 flex items-center gap-1.5">
            <AlertTriangle className="h-3 w-3" /> Repeated blockers (last 4 weeks)
          </div>
          <ul className="space-y-1 text-sm text-foreground/90">
            {blockers.map((b) => (
              <li key={b.type}>
                <span className="text-foreground font-medium">{b.label}</span>
                <span className="text-muted-foreground"> — reported {b.weeks}× recently. Latest: "{b.latestNote}"</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Insight grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {insights.map((i) => (
          <InsightCard key={i.key} insight={i} />
        ))}
      </div>
    </section>
  );
}

function TrendCard({
  label,
  tc,
  kind,
  invert,
}: {
  label: string;
  tc: InsightContext["revenueTrend"];
  kind: "money";
  invert?: boolean;
}) {
  const isUp = tc.vsAvg ? tc.vsAvg.delta > 0 : tc.vsPrior ? tc.vsPrior.delta > 0 : false;
  const isDown = tc.vsAvg ? tc.vsAvg.delta < 0 : tc.vsPrior ? tc.vsPrior.delta < 0 : false;
  const positive = invert ? isDown : isUp;
  const negative = invert ? isUp : isDown;
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1.5 text-xl font-light tabular-nums text-foreground">
        <Money value={tc.current} />
      </div>
      <div className="mt-1 text-[11px] leading-snug">
        <span className="text-muted-foreground">vs prior week: </span>
        {tc.vsPrior ? (
          <span className={positive ? "text-emerald-300" : negative ? "text-rose-300" : "text-foreground"}>
            {tc.vsPrior.delta >= 0 ? "+" : ""}
            {fmtMoney(tc.vsPrior.delta)} ({tc.vsPrior.pct.toFixed(0)}%)
          </span>
        ) : (
          <span className="text-muted-foreground/80">no prior week</span>
        )}
      </div>
      <div className="text-[11px] leading-snug">
        <span className="text-muted-foreground">vs 4-week avg: </span>
        {tc.vsAvg ? (
          <span className={positive ? "text-emerald-300" : negative ? "text-rose-300" : "text-foreground"}>
            {tc.vsAvg.delta >= 0 ? "+" : ""}
            {fmtMoney(tc.vsAvg.delta)} ({tc.vsAvg.pct.toFixed(0)}%)
          </span>
        ) : (
          <span className="text-muted-foreground/80">need 2+ prior weeks</span>
        )}
      </div>
    </div>
  );
}

function InsightCard({ insight }: { insight: Insight }) {
  const sevTone: Record<InsightSeverity, string> = {
    ok: "border-border bg-muted/10",
    watch: "border-amber-500/20 bg-amber-500/5",
    warn: "border-amber-500/40 bg-amber-500/10",
    critical: "border-rose-500/40 bg-rose-500/10",
  };
  const sevLabel: Record<InsightSeverity, string> = {
    ok: "Stable",
    watch: "Watch",
    warn: "Action needed",
    critical: "Urgent",
  };
  return (
    <div className={`rounded-lg border p-4 ${sevTone[insight.severity]}`}>
      <div className="flex items-center gap-1.5 mb-2">
        {(insight.severity === "warn" || insight.severity === "critical") && (
          <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
        )}
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
          {insight.title}
        </div>
        <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground/80">
          {sevLabel[insight.severity]}
        </span>
      </div>
      <div className="space-y-2 text-sm text-foreground/90 leading-relaxed">
        <div>
          <span className="text-[10px] uppercase tracking-wider text-primary/70 mr-2">Signal</span>
          {insight.signal}
        </div>
        <div className="text-foreground/80">
          <span className="text-[10px] uppercase tracking-wider text-primary/70 mr-2">Meaning</span>
          {insight.meaning}
        </div>
        <div className="text-foreground/80">
          <span className="text-[10px] uppercase tracking-wider text-primary/70 mr-2">Suggested action</span>
          {insight.action}
        </div>
        {insight.missingDataNote && (
          <div className="text-[11px] text-muted-foreground italic">
            {insight.missingDataNote}
          </div>
        )}
      </div>
    </div>
  );
}

function SMA({
  title,
  signal,
  meaning,
  action,
  tone,
  missing,
}: {
  title: string;
  signal: React.ReactNode;
  meaning: React.ReactNode;
  action: React.ReactNode;
  tone?: "warn";
  missing?: boolean;
}) {
  const border = tone === "warn" ? "border-amber-500/30 bg-amber-500/5" : missing ? "border-border bg-muted/5" : "border-border bg-muted/10";
  return (
    <div className={`rounded-lg border p-4 ${border}`}>
      <div className="flex items-center gap-1.5 mb-2">
        {tone === "warn" && <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />}
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{title}</div>
        {missing && <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground/70">Limited data</span>}
      </div>
      <div className="space-y-2 text-sm text-foreground/90 leading-relaxed">
        <div>
          <span className="text-[10px] uppercase tracking-wider text-primary/70 mr-2">Signal</span>
          {signal}
        </div>
        <div className="text-foreground/80">
          <span className="text-[10px] uppercase tracking-wider text-primary/70 mr-2">Meaning</span>
          {meaning}
        </div>
        <div className="text-foreground/80">
          <span className="text-[10px] uppercase tracking-wider text-primary/70 mr-2">Suggested action</span>
          {action}
        </div>
      </div>
    </div>
  );
}

/* Pull RGS_META marker out of the most recent revenue notes (no schema change) */
type Meta = {
  pipeline: { new_leads?: number | null; quotes_sent?: number | null; quotes_accepted?: number | null; lost?: number | null; open_value?: number | null; lost_reason?: string | null };
  pressure: { main_issue?: string | null; concern?: number | null; attention_first?: string | null; decision?: string | null };
};
function extractMeta(d: BccDataset): Meta | null {
  for (const r of d.revenue) {
    const note = r.notes || "";
    const m = note.match(/\[\[RGS_META:(\{[\s\S]*?\})\]\]/);
    if (m) {
      try {
        const parsed = JSON.parse(m[1]);
        return {
          pipeline: parsed.pipeline || {},
          pressure: parsed.pressure || {},
        };
      } catch { /* ignore */ }
    }
  }
  return null;
}

function arrow(delta: number) {
  if (delta > 0) return <span className="text-emerald-400 inline-flex items-center gap-0.5">▲</span>;
  if (delta < 0) return <span className="text-rose-400 inline-flex items-center gap-0.5">▼</span>;
  return <span className="text-muted-foreground">·</span>;
}

/* ===== Weekly History ===== */
type WeekBucket = {
  weekKey: string;
  weekLabel: string;
  weekStart: string;
  weekEnd: string;
  revenue: number;
  expenses: number;
  payroll: number;
  netCash: number;
  mainIssue: string;
  condition: "Strong" | "Watch" | "Leaking" | "—";
};

function buildWeeklyHistory(d: BccDataset): WeekBucket[] {
  const buckets = new Map<string, WeekBucket>();
  const ensure = (date: string) => {
    const wk = weekStart(date);
    const we = weekEnd(date);
    const key = wk;
    if (!buckets.has(key)) {
      buckets.set(key, {
        weekKey: key,
        weekLabel: `${shortDate(wk)} – ${shortDate(we)}`,
        weekStart: wk,
        weekEnd: we,
        revenue: 0,
        expenses: 0,
        payroll: 0,
        netCash: 0,
        mainIssue: "",
        condition: "—",
      });
    }
    return buckets.get(key)!;
  };
  d.revenue.forEach((r) => { if (r.entry_date) ensure(r.entry_date).revenue += Number(r.amount) || 0; });
  d.expenses.forEach((e) => { if (e.entry_date) ensure(e.entry_date).expenses += Number(e.amount) || 0; });
  d.payroll.forEach((p) => {
    const date = p.pay_period_end || p.pay_period_start;
    if (date) ensure(date).payroll += Number(p.total_payroll_cost || p.gross_pay || 0);
  });
  d.cashflow.forEach((c) => {
    if (!c.entry_date) return;
    const b = ensure(c.entry_date);
    const sign = c.direction === "cash_in" ? 1 : -1;
    b.netCash += sign * (Number(c.amount) || 0);
  });
  // Derive main issue + condition for each week
  const list = Array.from(buckets.values()).sort((a, b) => (a.weekStart < b.weekStart ? 1 : -1));
  list.forEach((w) => {
    if (w.expenses > w.revenue && w.revenue > 0) { w.mainIssue = "Expenses exceeded revenue"; w.condition = "Leaking"; }
    else if (w.netCash < 0) { w.mainIssue = "Negative net cash"; w.condition = "Watch"; }
    else if (w.revenue === 0) { w.mainIssue = "No revenue logged"; w.condition = "Watch"; }
    else { w.mainIssue = "Stable week"; w.condition = "Strong"; }
  });
  return list.slice(0, 8);
}

function weekStart(dateStr: string) {
  const d = new Date(dateStr);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
}
function weekEnd(dateStr: string) {
  const d = new Date(dateStr);
  const day = d.getDay();
  d.setDate(d.getDate() + (6 - day));
  return d.toISOString().slice(0, 10);
}
function shortDate(s: string) {
  const d = new Date(s);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function WeeklyHistorySection({ weeks, onAdd, hasAnyData }: { weeks: WeekBucket[]; onAdd: () => void; hasAnyData: boolean }) {
  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <SectionHeading icon={<FileText className="h-4 w-4" />} title="Weekly entries history" subtitle="Last 8 weeks" />
      {weeks.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-border rounded-md">
          <p className="text-sm text-foreground">
            {hasAnyData ? "No weekly buckets yet for this period." : "No weekly business data has been entered yet."}
          </p>
          <p className="text-xs text-muted-foreground mt-2 max-w-md mx-auto">
            Add your first weekly entry to begin building your Business Control Report.
          </p>
          <button
            onClick={onAdd}
            className="mt-4 inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-primary/90 text-primary-foreground text-xs font-medium hover:bg-primary"
          >
            <Plus className="h-3.5 w-3.5" /> Add weekly entry
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr className="border-b border-border">
                <th className="text-left py-2 pr-3 font-normal">Week</th>
                <th className="text-right py-2 px-3 font-normal">Revenue</th>
                <th className="text-right py-2 px-3 font-normal">Expenses</th>
                <th className="text-right py-2 px-3 font-normal">Payroll/Labor</th>
                <th className="text-right py-2 px-3 font-normal">Net cash</th>
                <th className="text-left py-2 px-3 font-normal">Main issue</th>
                <th className="text-left py-2 pl-3 font-normal">Condition</th>
              </tr>
            </thead>
            <tbody>
              {weeks.map((w) => (
                <tr key={w.weekKey} className="border-b border-border/50">
                  <td className="py-2 pr-3 text-foreground">{w.weekLabel}</td>
                  <td className="py-2 px-3 text-right tabular-nums"><Money value={w.revenue} /></td>
                  <td className="py-2 px-3 text-right tabular-nums"><Money value={w.expenses} /></td>
                  <td className="py-2 px-3 text-right tabular-nums"><Money value={w.payroll} /></td>
                  <td className="py-2 px-3 text-right tabular-nums"><Money value={w.netCash} signed /></td>
                  <td className="py-2 px-3 text-muted-foreground">{w.mainIssue}</td>
                  <td className="py-2 pl-3">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                      w.condition === "Strong" ? "border-emerald-500/30 text-emerald-300" :
                      w.condition === "Watch" ? "border-amber-500/30 text-amber-300" :
                      w.condition === "Leaking" ? "border-rose-500/30 text-rose-300" :
                      "border-border text-muted-foreground"
                    }`}>{w.condition}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/* ===== Business Control Report ===== */
function BusinessControlReport({
  m, health, issues, gaps, nextStep, currentWeek, prevWeek,
}: {
  m: ReturnType<typeof computeMetrics>;
  health: ReturnType<typeof computeHealth>;
  issues: ReturnType<typeof detectIssues>;
  gaps: string[];
  nextStep: ReturnType<typeof recommendNextStep>;
  currentWeek?: WeekBucket;
  prevWeek?: WeekBucket;
}) {
  return (
    <section className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-6">
      <SectionHeading icon={<FileText className="h-4 w-4" />} title="Business Control Report" subtitle="Auto-generated from your weekly data" />

      <ReportRow title="Executive summary">
        Your business currently registers as <span className="text-foreground font-medium">{health.condition}</span>{" "}
        ({health.overall}/100). Revenue this period: <Money value={m.totalRevenue} />. Expenses: <Money value={m.totalExpenses} />.
        Net cash movement: <Money value={m.netCash} signed />.
        {issues.length > 0 ? ` ${issues.length} area${issues.length === 1 ? "" : "s"} need attention.` : " No critical issues detected."}
      </ReportRow>

      <ReportRow title="Current business condition">
        Health score is <span className="text-foreground">{health.overall}/100</span> — {conditionExplain(health.condition)}.
      </ReportRow>

      <ReportRow title="Weekly financial snapshot">
        {currentWeek ? (
          <>
            Most recent week ({currentWeek.weekLabel}): revenue <Money value={currentWeek.revenue} />, expenses <Money value={currentWeek.expenses} />,
            payroll <Money value={currentWeek.payroll} />, net cash <Money value={currentWeek.netCash} signed />.
            {prevWeek && <> Prior week revenue was <Money value={prevWeek.revenue} />.</>}
          </>
        ) : (
          "No weekly snapshot available yet."
        )}
      </ReportRow>

      <ReportRow title="Areas needing attention">
        {issues.length === 0 ? "None detected based on entered data." : (
          <ul className="space-y-1 mt-1">
            {issues.map((i) => <li key={i.key}>• {i.title} — <span className="text-muted-foreground">{i.meaning}</span></li>)}
          </ul>
        )}
      </ReportRow>

      <ReportRow title="Revenue leak signals">
        {(m.overdueRevenue + m.receivablesOverdue) > 0
          ? <>Approximately <Money value={m.overdueRevenue + m.receivablesOverdue} /> of earned revenue is not yet collected. Review collection cadence.</>
          : "No active leak signals."}
      </ReportRow>

      <ReportRow title="Expense / payroll signals">
        Operating expenses are {fmtPct(m.expenseRatio)} of revenue. Payroll & labor are {fmtPct(m.laborPctRevenue)} of revenue.
      </ReportRow>

      <ReportRow title="Cash flow signals">
        Net cash is <Money value={m.netCash} signed />.
        {m.cashRunwayMonths !== null && ` Estimated runway: ${m.cashRunwayMonths.toFixed(1)} months at current burn.`}
      </ReportRow>

      <ReportRow title="Data gaps">
        {gaps.length === 0 ? "No major data gaps." : (
          <ul className="space-y-1 mt-1">{gaps.map((g) => <li key={g} className="text-muted-foreground">• {g}</li>)}</ul>
        )}
      </ReportRow>

      <ReportRow title="What to fix first">
        {issues.length === 0
          ? gaps[0] || "Continue logging weekly data to maintain visibility."
          : issues[0].next}
      </ReportRow>

      <div className="mt-4 rounded-md border border-primary/30 bg-primary/10 p-3 flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
        <div className="text-xs">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground block">Recommended next step</span>
          <span className="text-foreground font-medium">{nextStep}</span>
        </div>
      </div>
    </section>
  );
}

function ReportRow({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="py-3 border-b border-border/40 last:border-0">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{title}</div>
      <div className="text-sm text-foreground/90 mt-1.5 leading-relaxed">{children}</div>
    </div>
  );
}

function conditionExplain(c: string) {
  switch (c) {
    case "Strong": return "the business is operating with stability and visibility";
    case "Stable": return "fundamentals look reasonable; keep monitoring trends";
    case "Watch": return "early signals suggest one or more areas need review";
    case "Leaking": return "money or capacity is being lost in identifiable areas";
    case "Critical": return "intervention is recommended before adding more activity";
    default: return "more data is needed to evaluate condition";
  }
}

/* ===== Manage Entries (edit / delete) ===== */
type EntryTable =
  | "revenue_entries"
  | "expense_entries"
  | "payroll_entries"
  | "invoice_entries"
  | "cash_flow_entries"
  | "business_goals";

function ManageEntriesSection({ data, onChange }: { data: BccDataset; onChange: () => void }) {
  const [tab, setTab] = useState<EntryTable>("revenue_entries");

  const tabs: { key: EntryTable; label: string; count: number }[] = [
    { key: "revenue_entries", label: "Revenue", count: data.revenue.length },
    { key: "expense_entries", label: "Expenses", count: data.expenses.length },
    { key: "payroll_entries", label: "Payroll", count: data.payroll.length },
    { key: "invoice_entries", label: "Invoices", count: data.invoices.length },
    { key: "cash_flow_entries", label: "Cash flow", count: data.cashflow.length },
    { key: "business_goals", label: "Goals", count: data.goals.length },
  ];

  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <SectionHeading
        icon={<FileText className="h-4 w-4" />}
        title="Manage entries"
        subtitle="Edit or delete individual saved rows"
      />
      <div className="flex flex-wrap gap-1.5 mb-4">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`text-[11px] px-2.5 h-7 rounded-md border ${
              tab === t.key
                ? "border-primary/50 bg-primary/10 text-foreground"
                : "border-border bg-muted/20 text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label} <span className="opacity-60">({t.count})</span>
          </button>
        ))}
      </div>
      <EntryTableView table={tab} data={data} onChange={onChange} />
    </section>
  );
}

function EntryTableView({ table, data, onChange }: { table: EntryTable; data: BccDataset; onChange: () => void }) {
  const rows: any[] =
    table === "revenue_entries" ? data.revenue
    : table === "expense_entries" ? data.expenses
    : table === "payroll_entries" ? data.payroll
    : table === "invoice_entries" ? data.invoices
    : table === "cash_flow_entries" ? data.cashflow
    : data.goals;

  if (rows.length === 0) {
    return <div className="text-xs text-muted-foreground py-3">No entries yet for this category.</div>;
  }
  return (
    <div className="space-y-1.5">
      {rows.slice(0, 50).map((r) => (
        <EntryRow key={r.id} table={table} row={r} onChange={onChange} />
      ))}
      {rows.length > 50 && (
        <div className="text-[11px] text-muted-foreground pt-2">Showing 50 most recent. Older entries are still saved.</div>
      )}
    </div>
  );
}

function EntryRow({ table, row, onChange }: { table: EntryTable; row: any; onChange: () => void }) {
  const [editing, setEditing] = useState(false);
  const initialAmount =
    table === "payroll_entries" ? (row.total_payroll_cost ?? row.gross_pay ?? 0)
    : table === "business_goals" ? (row.target_value ?? 0)
    : (row.amount ?? 0);
  const [amount, setAmount] = useState<string>(String(initialAmount ?? ""));
  const [busy, setBusy] = useState(false);

  const dateLabel =
    table === "payroll_entries" ? (row.pay_period_end || row.pay_period_start || "")
    : table === "invoice_entries" ? (row.invoice_date || "")
    : table === "business_goals" ? ""
    : (row.entry_date || "");

  const meta =
    table === "revenue_entries" ? `${row.revenue_type || ""} · ${row.status || ""}${row.client_or_job ? ` · ${row.client_or_job}` : ""}`
    : table === "expense_entries" ? `${row.expense_type || ""}${row.vendor ? ` · ${row.vendor}` : ""}`
    : table === "payroll_entries" ? `${row.labor_type || ""}${row.person_name ? ` · ${row.person_name}` : ""}`
    : table === "invoice_entries" ? `${row.status || ""}${row.client_or_job ? ` · ${row.client_or_job}` : ""}`
    : table === "cash_flow_entries" ? `${row.direction || ""}${row.description ? ` · ${row.description}` : ""}`
    : `${row.goal_type || ""}${row.goal_label ? ` · ${row.goal_label}` : ""}`;

  const save = async () => {
    setBusy(true);
    const value = Number(amount) || 0;
    const patch: any =
      table === "payroll_entries" ? { total_payroll_cost: value, gross_pay: value }
      : table === "business_goals" ? { target_value: value }
      : { amount: value };
    const { error } = await supabase.from(table).update(patch).eq("id", row.id);
    setBusy(false);
    if (error) {
      toast.error("Could not update entry.");
      return;
    }
    toast.success("Entry updated.");
    setEditing(false);
    onChange();
  };

  const remove = async () => {
    if (!confirm("Delete this entry? This cannot be undone.")) return;
    setBusy(true);
    const { error } = await supabase.from(table).delete().eq("id", row.id);
    setBusy(false);
    if (error) {
      toast.error("Could not delete entry.");
      return;
    }
    toast.success("Entry deleted.");
    onChange();
  };

  return (
    <div className="flex items-center gap-3 rounded-md border border-border bg-muted/20 px-3 py-2">
      <div className="flex-1 min-w-0">
        <div className="text-[11px] text-muted-foreground truncate">
          {dateLabel && <span className="text-foreground/80 mr-2">{dateLabel}</span>}
          <span className="capitalize">{meta}</span>
        </div>
      </div>
      {editing ? (
        <input
          type="number"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-28 h-8 px-2 rounded-md bg-background border border-input text-sm text-foreground tabular-nums focus:outline-none focus:ring-1 focus:ring-primary/40"
        />
      ) : (
        <div className="w-28 text-right text-sm tabular-nums text-foreground">
          <Money value={Number(initialAmount) || 0} />
        </div>
      )}
      <div className="flex items-center gap-1">
        {editing ? (
          <>
            <button onClick={save} disabled={busy} className="text-[11px] h-7 px-2 rounded-md bg-primary/90 text-primary-foreground hover:bg-primary disabled:opacity-50">
              Save
            </button>
            <button onClick={() => { setEditing(false); setAmount(String(initialAmount ?? "")); }} className="text-[11px] h-7 px-2 rounded-md border border-border text-muted-foreground hover:text-foreground">
              Cancel
            </button>
          </>
        ) : (
          <>
            <button onClick={() => setEditing(true)} className="text-[11px] h-7 px-2 rounded-md border border-border text-muted-foreground hover:text-foreground">
              Edit
            </button>
            <button onClick={remove} disabled={busy} className="text-[11px] h-7 px-2 rounded-md border border-rose-500/30 text-rose-300 hover:bg-rose-500/10 disabled:opacity-50">
              Delete
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ===== Weekly Entry Drawer ===== */
type WeeklyForm = {
  week_start: string; week_end: string;
  rev_collected: string; rev_pending: string; rev_overdue: string; rev_recurring: string; rev_one_time: string;
  rev_category: string; rev_client: string; rev_source: string;
  expenses_total: string; expense_category: string; expense_vendor: string; expense_type: "fixed" | "variable";
  exp_fixed: string; exp_variable: string; exp_marketing: string; exp_software: string; exp_other: string; exp_notes: string;
  payroll_cost: string; contractor_cost: string; owner_draw: string; hours_worked: string; labor_jobs: string;
  invoices_sent: string; invoices_collected: string; receivables_outstanding: string; invoices_overdue: string; collection_risk: string;
  cash_in: string; cash_out: string; upcoming_obligations: string; cash_pressure: string;
  goal_revenue: string; goal_revenue_monthly: string; goal_margin: string; goal_expense: string; goal_labor: string; goal_cashflow: string;
  note_revenue: string; note_expense: string; note_blocker: string; note_owner: string;
};

const blank: WeeklyForm = {
  week_start: lastSunday(), week_end: lastSaturday(),
  rev_collected: "", rev_pending: "", rev_overdue: "", rev_recurring: "", rev_one_time: "",
  rev_category: "", rev_client: "", rev_source: "",
  expenses_total: "", expense_category: "", expense_vendor: "", expense_type: "variable",
  exp_fixed: "", exp_variable: "", exp_marketing: "", exp_software: "", exp_other: "", exp_notes: "",
  payroll_cost: "", contractor_cost: "", owner_draw: "", hours_worked: "", labor_jobs: "",
  invoices_sent: "", invoices_collected: "", receivables_outstanding: "", invoices_overdue: "", collection_risk: "",
  cash_in: "", cash_out: "", upcoming_obligations: "", cash_pressure: "",
  goal_revenue: "", goal_revenue_monthly: "", goal_margin: "", goal_expense: "", goal_labor: "", goal_cashflow: "",
  note_revenue: "", note_expense: "", note_blocker: "", note_owner: "",
};

function WeeklyEntryDrawer({
  customerId, canSave, onClose, onSaved,
}: {
  customerId: string | null;
  canSave: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [f, setF] = useState<WeeklyForm>(blank);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof WeeklyForm, v: string) => setF((p) => ({ ...p, [k]: v }));
  const num = (s: string) => (s === "" ? 0 : Number(s) || 0);

  const handleSave = async () => {
    if (!canSave || !customerId) {
      toast.info("Live saving will be activated by your RGS team.");
      onClose();
      return;
    }
    setBusy(true);
    const week = f.week_end;
    const allNotes = [
      f.note_revenue && `Revenue concern: ${f.note_revenue}`,
      f.note_expense && `Expense concern: ${f.note_expense}`,
      f.note_blocker && `Blocker: ${f.note_blocker}`,
      f.note_owner && `Owner note: ${f.note_owner}`,
    ].filter(Boolean).join(" | ");

    try {
      const tasks: any[] = [];

      // Revenue rows — collected / pending / overdue / recurring / one-time
      const revRows: any[] = [];
      const pushRev = (amount: number, status: string, type: string) => {
        if (amount <= 0) return;
        revRows.push({
          customer_id: customerId,
          entry_date: week,
          amount,
          status,
          revenue_type: type,
          service_category: f.rev_category || null,
          client_or_job: f.rev_client || null,
          source_channel: f.rev_source || null,
          notes: allNotes || null,
        });
      };
      pushRev(num(f.rev_collected), "collected", "one_time");
      pushRev(num(f.rev_pending), "pending", "one_time");
      pushRev(num(f.rev_overdue), "overdue", "one_time");
      pushRev(num(f.rev_recurring), "collected", "recurring");
      pushRev(num(f.rev_one_time), "collected", "one_time");
      if (revRows.length) tasks.push(supabase.from("revenue_entries").insert(revRows));

      // Expenses — write each named bucket as its own row so totals & breakdowns work
      const expRows: any[] = [];
      const pushExp = (amount: number, type: "fixed" | "variable", category: string, vendor?: string) => {
        if (amount <= 0) return;
        expRows.push({
          customer_id: customerId,
          entry_date: week,
          amount,
          vendor: vendor || f.expense_vendor || null,
          expense_type: type,
          payment_status: "paid",
          notes: [
            category && `Category: ${category}`,
            f.exp_notes && `Notes: ${f.exp_notes}`,
          ].filter(Boolean).join(" | ") || null,
        });
      };
      pushExp(num(f.expenses_total), f.expense_type, f.expense_category || "General");
      pushExp(num(f.exp_fixed), "fixed", "Fixed");
      pushExp(num(f.exp_variable), "variable", "Variable");
      pushExp(num(f.exp_marketing), "variable", "Marketing");
      pushExp(num(f.exp_software), "fixed", "Software / tools");
      pushExp(num(f.exp_other), "variable", "Other");
      if (expRows.length) tasks.push(supabase.from("expense_entries").insert(expRows));

      // Payroll
      if (num(f.payroll_cost) > 0 || num(f.contractor_cost) > 0 || num(f.owner_draw) > 0) {
        const payRows: any[] = [];
        const pushPay = (cost: number, type: string, name: string) => {
          if (cost <= 0) return;
          payRows.push({
            customer_id: customerId,
            pay_period_start: f.week_start,
            pay_period_end: f.week_end,
            person_name: name,
            labor_type: type,
            gross_pay: cost,
            payroll_taxes_fees: 0,
            total_payroll_cost: cost,
            hours_worked: num(f.hours_worked) || null,
            notes: [f.labor_jobs && `Jobs: ${f.labor_jobs}`, allNotes].filter(Boolean).join(" | ") || null,
          });
        };
        pushPay(num(f.payroll_cost), "employee", "Team");
        pushPay(num(f.contractor_cost), "contractor", "Contractors");
        pushPay(num(f.owner_draw), "owner_draw", "Owner");
        tasks.push(supabase.from("payroll_entries").insert(payRows));
      }

      // Invoices: represent sent vs collected as a single row
      if (num(f.invoices_sent) > 0) {
        const sent = num(f.invoices_sent);
        const collected = Math.min(num(f.invoices_collected), sent);
        tasks.push(supabase.from("invoice_entries").insert({
          customer_id: customerId,
          invoice_date: week,
          due_date: week,
          client_or_job: f.rev_client || null,
          amount: sent,
          amount_collected: collected,
          status: collected >= sent ? "paid" : collected > 0 ? "partially_paid" : "sent",
          notes: [
            f.collection_risk && `Collection risk: ${f.collection_risk}`,
            allNotes,
          ].filter(Boolean).join(" | ") || null,
        }));
      }
      // Outstanding receivables / overdue invoices — separate marker rows so totals reflect them
      if (num(f.receivables_outstanding) > 0) {
        tasks.push(supabase.from("invoice_entries").insert({
          customer_id: customerId,
          invoice_date: week,
          due_date: week,
          client_or_job: "Outstanding receivables",
          amount: num(f.receivables_outstanding),
          amount_collected: 0,
          status: "sent",
          notes: f.collection_risk || null,
        }));
      }
      if (num(f.invoices_overdue) > 0) {
        tasks.push(supabase.from("invoice_entries").insert({
          customer_id: customerId,
          invoice_date: week,
          due_date: week,
          client_or_job: "Overdue invoices",
          amount: num(f.invoices_overdue),
          amount_collected: 0,
          status: "overdue",
          notes: f.collection_risk || null,
        }));
      }

      // Cash flow
      const cashRows: any[] = [];
      if (num(f.cash_in) > 0) cashRows.push({ customer_id: customerId, entry_date: week, amount: num(f.cash_in), direction: "cash_in", expected_or_actual: "actual", description: "Weekly cash in" });
      if (num(f.cash_out) > 0) cashRows.push({ customer_id: customerId, entry_date: week, amount: num(f.cash_out), direction: "cash_out", expected_or_actual: "actual", description: "Weekly cash out" });
      if (num(f.upcoming_obligations) > 0) cashRows.push({ customer_id: customerId, entry_date: week, amount: num(f.upcoming_obligations), direction: "cash_out", expected_or_actual: "expected", description: "Upcoming obligations", notes: f.cash_pressure || null });
      if (cashRows.length) tasks.push(supabase.from("cash_flow_entries").insert(cashRows));

      // Goals (upserts as inserts; latest wins for display purposes)
      const goalRows: any[] = [];
      if (num(f.goal_revenue) > 0) goalRows.push({ customer_id: customerId, goal_type: "revenue", target_value: num(f.goal_revenue), goal_label: "Weekly revenue goal", status: "on_track" });
      if (num(f.goal_revenue_monthly) > 0) goalRows.push({ customer_id: customerId, goal_type: "revenue_monthly", target_value: num(f.goal_revenue_monthly), goal_label: "Monthly revenue goal", status: "on_track" });
      if (num(f.goal_margin) > 0) goalRows.push({ customer_id: customerId, goal_type: "profit_margin", target_value: num(f.goal_margin), goal_label: "Profit margin target", status: "on_track" });
      if (num(f.goal_expense) > 0) goalRows.push({ customer_id: customerId, goal_type: "expense", target_value: num(f.goal_expense), goal_label: "Expense target", status: "on_track" });
      if (num(f.goal_labor) > 0) goalRows.push({ customer_id: customerId, goal_type: "labor", target_value: num(f.goal_labor), goal_label: "Payroll / labor target", status: "on_track" });
      if (num(f.goal_cashflow) > 0) goalRows.push({ customer_id: customerId, goal_type: "cash_flow", target_value: num(f.goal_cashflow), goal_label: "Cash flow goal", status: "on_track" });
      if (goalRows.length) tasks.push(supabase.from("business_goals").insert(goalRows));

      if (tasks.length === 0) {
        toast.info("Add at least one number to save the week.");
        setBusy(false);
        return;
      }

      const results = await Promise.all(tasks);
      const firstError = results.find((r: any) => r?.error);
      if (firstError?.error) {
        toast.error("Some parts of the entry could not be saved.");
        console.error(firstError.error);
      } else {
        toast.success("Weekly entry saved.");
        onSaved();
        return;
      }
    } catch (e: any) {
      toast.error("Could not save weekly entry.");
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm overflow-y-auto" onClick={onClose}>
      <div
        className="min-h-screen flex items-start justify-center p-4 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-full max-w-3xl bg-card border border-border rounded-xl shadow-xl">
          <div className="flex items-center justify-between p-5 border-b border-border">
            <div>
              <h3 className="text-lg font-light text-foreground">Add weekly entry</h3>
              <p className="text-[11px] text-muted-foreground mt-1">
                Capture this week's revenue, expenses, payroll, invoices, cash flow, goals, and notes.
              </p>
            </div>
            <button onClick={onClose} className="p-1 rounded-md hover:bg-muted/50 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
          </div>

          {!canSave && (
            <div className="px-5 pt-4">
              <Notice tone="info" icon={<Info className="h-3.5 w-3.5 text-primary" />}>
                Live saving will be activated by your RGS team. You can fill out this form to preview the structure;
                values won't persist yet.
              </Notice>
            </div>
          )}

          <div className="p-5 space-y-6">
            <FormSection icon={<Wallet className="h-3.5 w-3.5" />} title="Week">
              <Grid>
                <FormField label="Week start"><DateInput value={f.week_start} onChange={(v) => set("week_start", v)} /></FormField>
                <FormField label="Week end"><DateInput value={f.week_end} onChange={(v) => set("week_end", v)} /></FormField>
              </Grid>
            </FormSection>

            <FormSection icon={<TrendingUp className="h-3.5 w-3.5" />} title="Revenue">
              <Grid>
                <FormField label="Revenue collected"><MoneyInput value={f.rev_collected} onChange={(v) => set("rev_collected", v)} /></FormField>
                <FormField label="Pending revenue"><MoneyInput value={f.rev_pending} onChange={(v) => set("rev_pending", v)} /></FormField>
                <FormField label="Overdue revenue"><MoneyInput value={f.rev_overdue} onChange={(v) => set("rev_overdue", v)} /></FormField>
                <FormField label="Recurring revenue"><MoneyInput value={f.rev_recurring} onChange={(v) => set("rev_recurring", v)} /></FormField>
                <FormField label="One-time revenue"><MoneyInput value={f.rev_one_time} onChange={(v) => set("rev_one_time", v)} /></FormField>
                <FormField label="Service / category"><TextInput value={f.rev_category} onChange={(v) => set("rev_category", v)} placeholder="e.g. Implementation" /></FormField>
                <FormField label="Client / job"><TextInput value={f.rev_client} onChange={(v) => set("rev_client", v)} placeholder="e.g. Acme Co." /></FormField>
                <FormField label="Source / channel"><TextInput value={f.rev_source} onChange={(v) => set("rev_source", v)} placeholder="e.g. Referral" /></FormField>
              </Grid>
            </FormSection>

            <FormSection icon={<Receipt className="h-3.5 w-3.5" />} title="Expenses">
              <Grid>
                <FormField label="Total expenses"><MoneyInput value={f.expenses_total} onChange={(v) => set("expenses_total", v)} /></FormField>
                <FormField label="Fixed expenses"><MoneyInput value={f.exp_fixed} onChange={(v) => set("exp_fixed", v)} /></FormField>
                <FormField label="Variable expenses"><MoneyInput value={f.exp_variable} onChange={(v) => set("exp_variable", v)} /></FormField>
                <FormField label="Main category"><TextInput value={f.expense_category} onChange={(v) => set("expense_category", v)} placeholder="e.g. Software" /></FormField>
                <FormField label="Vendor"><TextInput value={f.expense_vendor} onChange={(v) => set("expense_vendor", v)} placeholder="e.g. Vendor name" /></FormField>
                <FormField label="Type">
                  <select className={selectCls} value={f.expense_type} onChange={(e) => set("expense_type", e.target.value as any)}>
                    <option value="fixed">Fixed</option>
                    <option value="variable">Variable</option>
                  </select>
                </FormField>
                <FormField label="Marketing spend"><MoneyInput value={f.exp_marketing} onChange={(v) => set("exp_marketing", v)} /></FormField>
                <FormField label="Software / tools"><MoneyInput value={f.exp_software} onChange={(v) => set("exp_software", v)} /></FormField>
                <FormField label="Other expenses"><MoneyInput value={f.exp_other} onChange={(v) => set("exp_other", v)} /></FormField>
              </Grid>
              <div className="mt-3">
                <FormField label="Expense notes"><TextArea value={f.exp_notes} onChange={(v) => set("exp_notes", v)} /></FormField>
              </div>
            </FormSection>

            <FormSection icon={<Users className="h-3.5 w-3.5" />} title="Payroll / Labor">
              <Grid>
                <FormField label="Payroll cost"><MoneyInput value={f.payroll_cost} onChange={(v) => set("payroll_cost", v)} /></FormField>
                <FormField label="Contractor cost"><MoneyInput value={f.contractor_cost} onChange={(v) => set("contractor_cost", v)} /></FormField>
                <FormField label="Owner draw"><MoneyInput value={f.owner_draw} onChange={(v) => set("owner_draw", v)} /></FormField>
                <FormField label="Hours worked"><TextInput value={f.hours_worked} onChange={(v) => set("hours_worked", v)} placeholder="e.g. 120" /></FormField>
                <FormField label="Labor tied to jobs / projects"><TextInput value={f.labor_jobs} onChange={(v) => set("labor_jobs", v)} placeholder="e.g. Acme install, Smith repair" /></FormField>
              </Grid>
              <p className="mt-2 text-[11px] text-muted-foreground">Labor as % of revenue is calculated automatically from your weekly numbers and shown in the dashboard.</p>
            </FormSection>

            <FormSection icon={<FileText className="h-3.5 w-3.5" />} title="Invoices / Receivables">
              <Grid>
                <FormField label="Invoices sent ($)"><MoneyInput value={f.invoices_sent} onChange={(v) => set("invoices_sent", v)} /></FormField>
                <FormField label="Invoices collected ($)"><MoneyInput value={f.invoices_collected} onChange={(v) => set("invoices_collected", v)} /></FormField>
                <FormField label="Outstanding receivables"><MoneyInput value={f.receivables_outstanding} onChange={(v) => set("receivables_outstanding", v)} /></FormField>
                <FormField label="Overdue invoices"><MoneyInput value={f.invoices_overdue} onChange={(v) => set("invoices_overdue", v)} /></FormField>
              </Grid>
              <div className="mt-3">
                <FormField label="Collection risk notes"><TextArea value={f.collection_risk} onChange={(v) => set("collection_risk", v)} /></FormField>
              </div>
            </FormSection>

            <FormSection icon={<Banknote className="h-3.5 w-3.5" />} title="Cash flow">
              <Grid>
                <FormField label="Cash in"><MoneyInput value={f.cash_in} onChange={(v) => set("cash_in", v)} /></FormField>
                <FormField label="Cash out"><MoneyInput value={f.cash_out} onChange={(v) => set("cash_out", v)} /></FormField>
                <FormField label="Upcoming obligations"><MoneyInput value={f.upcoming_obligations} onChange={(v) => set("upcoming_obligations", v)} /></FormField>
              </Grid>
              <div className="mt-3">
                <FormField label="Cash pressure signals"><TextArea value={f.cash_pressure} onChange={(v) => set("cash_pressure", v)} /></FormField>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">Net cash movement is calculated from cash in minus cash out.</p>
            </FormSection>

            <FormSection icon={<Target className="h-3.5 w-3.5" />} title="Goals">
              <Grid>
                <FormField label="Weekly revenue goal"><MoneyInput value={f.goal_revenue} onChange={(v) => set("goal_revenue", v)} /></FormField>
                <FormField label="Monthly revenue goal"><MoneyInput value={f.goal_revenue_monthly} onChange={(v) => set("goal_revenue_monthly", v)} /></FormField>
                <FormField label="Profit margin target (%)"><TextInput value={f.goal_margin} onChange={(v) => set("goal_margin", v)} placeholder="e.g. 20" /></FormField>
                <FormField label="Expense target"><MoneyInput value={f.goal_expense} onChange={(v) => set("goal_expense", v)} /></FormField>
                <FormField label="Payroll / labor target"><MoneyInput value={f.goal_labor} onChange={(v) => set("goal_labor", v)} /></FormField>
                <FormField label="Cash flow goal"><MoneyInput value={f.goal_cashflow} onChange={(v) => set("goal_cashflow", v)} /></FormField>
              </Grid>
            </FormSection>

            <FormSection icon={<StickyNote className="h-3.5 w-3.5" />} title="Notes / Context">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FormField label="Main revenue concern this week"><TextArea value={f.note_revenue} onChange={(v) => set("note_revenue", v)} /></FormField>
                <FormField label="Main expense concern this week"><TextArea value={f.note_expense} onChange={(v) => set("note_expense", v)} /></FormField>
                <FormField label="Operational blocker"><TextArea value={f.note_blocker} onChange={(v) => set("note_blocker", v)} /></FormField>
                <FormField label="Owner note / anything unusual"><TextArea value={f.note_owner} onChange={(v) => set("note_owner", v)} /></FormField>
              </div>
            </FormSection>
          </div>

          <div className="flex justify-end gap-2 p-5 border-t border-border">
            <button onClick={onClose} className="h-9 px-4 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground">Cancel</button>
            <button
              onClick={handleSave}
              disabled={busy}
              className="h-9 px-4 rounded-md bg-primary/90 text-primary-foreground text-xs font-medium hover:bg-primary disabled:opacity-50"
            >
              {busy ? "Saving…" : canSave ? "Save weekly entry" : "Close (preview only)"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const inputCls = "w-full h-9 px-2 rounded-md bg-background border border-input text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40";
const selectCls = inputCls;

function FormSection({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
        <span className="text-primary">{icon}</span>{title}
      </div>
      {children}
    </div>
  );
}
function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{children}</div>;
}
function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
function MoneyInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <input type="number" inputMode="decimal" placeholder="0" value={value} onChange={(e) => onChange(e.target.value)} className={inputCls} />;
}
function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <input type="text" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} className={inputCls} />;
}
function DateInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <input type="date" value={value} onChange={(e) => onChange(e.target.value)} className={inputCls} />;
}
function TextArea({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <textarea rows={2} value={value} onChange={(e) => onChange(e.target.value)} className={`${inputCls} h-auto py-2 leading-snug`} />;
}
