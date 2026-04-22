import { useMemo, useState } from "react";
import { Plus, Sparkles, TrendingUp, AlertTriangle, Info, Activity, FileText } from "lucide-react";
import { computeMetrics } from "@/lib/bcc/engine";
import type { BccDataset } from "@/lib/bcc/types";
import { Money, fmtPct } from "./Money";
import { RevenueTable } from "./EntryTables";
import { RevenueQuickForm } from "./QuickEntryForms";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Props = {
  data: BccDataset;
  customerId: string | null;
  isSample: boolean;
  onChange: () => void;
};

/**
 * Detailed client-facing Revenue Tracker. Always renders the full module
 * structure (header, summary cards, entries table, add form, insights,
 * report linkage). Uses inline notices for "not linked yet" or "saving not
 * active" — never replaces the page with a placeholder.
 */
export function ClientRevenueTracker({ data, customerId, isSample, onChange }: Props) {
  const m = useMemo(() => computeMetrics(data), [data]);
  const [formOpen, setFormOpen] = useState(false);

  const recurringRevenue = useMemo(
    () => data.revenue.filter((r) => r.revenue_type === "recurring").reduce((a, r) => a + (r.amount || 0), 0),
    [data.revenue],
  );
  const oneTimeRevenue = m.totalRevenue - recurringRevenue;

  // Revenue by service/category
  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    data.revenue.forEach((r) => {
      const key = r.service_category || "Uncategorized";
      map.set(key, (map.get(key) || 0) + (r.amount || 0));
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [data.revenue]);

  // Top client/job
  const topClient = useMemo(() => {
    const map = new Map<string, number>();
    data.revenue.forEach((r) => {
      const key = r.client_or_job || "—";
      map.set(key, (map.get(key) || 0) + (r.amount || 0));
    });
    const sorted = Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
    return sorted[0] || null;
  }, [data.revenue]);

  const isLinked = !!customerId;
  const hasEntries = data.revenue.length > 0 && !isSample;

  const handleDelete = async (id: string) => {
    if (!isLinked) return;
    if (!confirm("Remove this revenue entry?")) return;
    const { error } = await supabase.from("revenue_entries").delete().eq("id", id);
    if (error) {
      toast.error("Could not remove entry");
      return;
    }
    toast.success("Entry removed");
    onChange();
  };

  return (
    <div className="space-y-5">
      {/* 1. Client header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-light text-foreground">Revenue Tracker</h2>
          <p className="text-xs text-muted-foreground mt-2 max-w-2xl leading-relaxed">
            Track what came in, what is pending, what is overdue, what is recurring, and where revenue
            patterns may need attention.
          </p>
        </div>
        <button
          onClick={() => setFormOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors self-start"
        >
          <Plus className="h-3.5 w-3.5" /> {formOpen ? "Close" : "Add revenue entry"}
        </button>
      </header>

      {/* Inline setup notice — never replaces the module */}
      {!isLinked && (
        <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-xs text-foreground flex items-start gap-2">
          <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-primary" />
          <div>
            <span className="font-medium">Your Business Control Center is being connected to your client workspace.</span>{" "}
            You can preview the Revenue Tracker structure here; your RGS team will activate live tracking shortly.
          </div>
        </div>
      )}

      {isSample && isLinked && (
        <div className="rounded-md border border-secondary/40 bg-secondary/5 p-3 text-xs text-secondary-foreground flex items-start gap-2">
          <Sparkles className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-secondary" />
          <div>
            <span className="font-medium text-foreground">Showing example numbers.</span> Add your first real
            entry below and your own data will replace this preview.
          </div>
        </div>
      )}

      {/* 2. Summary dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryStat label="Total revenue" value={<Money value={m.totalRevenue} />} />
        <SummaryStat label="Collected" value={<Money value={m.collectedRevenue} />} tone="ok" />
        <SummaryStat label="Pending" value={<Money value={m.pendingRevenue} />} tone="watch" />
        <SummaryStat label="Overdue" value={<Money value={m.overdueRevenue} />} tone="critical" />
        <SummaryStat label="Recurring" value={<Money value={recurringRevenue} />} hint={fmtPct(m.recurringRevenuePct)} />
        <SummaryStat label="One-time" value={<Money value={oneTimeRevenue} />} hint={fmtPct(100 - m.recurringRevenuePct)} />
        <SummaryStat
          label="Top client / job"
          value={<span className="text-base">{topClient ? topClient[0] : "—"}</span>}
          hint={topClient ? <Money value={topClient[1]} /> as any : undefined}
        />
        <SummaryStat
          label="Top category share"
          value={fmtPct(m.topServiceShare)}
          hint={byCategory[0]?.[0]}
        />
      </div>

      {/* Revenue by service/category breakdown */}
      <section className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm text-foreground font-medium mb-3">Revenue by service / category</h3>
        {byCategory.length === 0 ? (
          <p className="text-xs text-muted-foreground">No category data yet. Add entries with a service/category to see this breakdown.</p>
        ) : (
          <ul className="space-y-2">
            {byCategory.map(([name, amt]) => {
              const share = m.totalRevenue > 0 ? (amt / m.totalRevenue) * 100 : 0;
              return (
                <li key={name} className="space-y-1">
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="text-foreground">{name}</span>
                    <span className="text-muted-foreground tabular-nums">
                      <Money value={amt} /> · {share.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden">
                    <div className="h-full bg-primary/70" style={{ width: `${Math.min(100, share)}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* 4. Add revenue entry form */}
      {formOpen && (
        <section className="rounded-xl border border-border bg-muted/10 p-4">
          {isLinked ? (
            <RevenueQuickForm
              customerId={customerId!}
              onSaved={() => {
                setFormOpen(false);
                onChange();
              }}
            />
          ) : (
            <div className="text-xs text-muted-foreground p-3 rounded-md border border-border bg-card">
              Revenue entry saving is not active yet. Your RGS team will activate this during setup.
            </div>
          )}
        </section>
      )}

      {/* 3. Entries table */}
      <section className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-baseline justify-between mb-4">
          <div>
            <h3 className="text-sm text-foreground font-medium">Revenue entries</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Each row is one piece of revenue — date, what it was for, and whether it has been collected.
            </p>
          </div>
          {hasEntries && (
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {data.revenue.length} {data.revenue.length === 1 ? "entry" : "entries"}
            </span>
          )}
        </div>

        {hasEntries || isSample ? (
          <RevenueTable
            rows={data.revenue}
            canDelete={!isSample && isLinked}
            onDelete={handleDelete}
            emptyLabel="No revenue logged yet."
          />
        ) : (
          <div className="text-center py-10 border border-dashed border-border rounded-md">
            <p className="text-sm text-foreground">No revenue has been recorded for this period yet.</p>
            <p className="text-xs text-muted-foreground mt-2 max-w-md mx-auto">
              Add revenue entries to begin building your Business Control Report.
            </p>
            <button
              onClick={() => setFormOpen(true)}
              className="mt-4 inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-primary/90 text-primary-foreground text-xs font-medium hover:bg-primary"
            >
              <Plus className="h-3.5 w-3.5" /> Add revenue entry
            </button>
          </div>
        )}
      </section>

      {/* 5. Revenue insights / guidance */}
      <section className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="h-4 w-4 text-primary" />
          <h3 className="text-sm text-foreground font-medium">Revenue insights</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <InsightCard
            title="What came in"
            body={
              m.collectedRevenue > 0
                ? <>You have collected <Money value={m.collectedRevenue} /> so far this period.</>
                : "No collected revenue recorded yet for this period."
            }
          />
          <InsightCard
            title="What is still outstanding"
            body={
              m.pendingRevenue > 0
                ? <>Roughly <Money value={m.pendingRevenue} /> is pending. Review whether each is on track.</>
                : "Nothing currently flagged as pending."
            }
          />
          <InsightCard
            title="What is overdue"
            tone={m.overdueRevenue > 0 ? "warn" : undefined}
            body={
              m.overdueRevenue > 0
                ? <><Money value={m.overdueRevenue} /> is marked overdue. This is a signal to investigate collection follow-up.</>
                : "No overdue revenue detected."
            }
          />
          <InsightCard
            title="What is recurring"
            body={
              recurringRevenue > 0
                ? <>Recurring revenue is <Money value={recurringRevenue} /> ({fmtPct(m.recurringRevenuePct)} of total). Recurring revenue tends to stabilize cash flow.</>
                : "No recurring revenue logged. Review whether any work could shift to a recurring arrangement."
            }
          />
          <InsightCard
            title="Concentration risk"
            tone={m.topClientShare > 40 ? "warn" : undefined}
            body={
              m.topClientShare > 40
                ? <>Your top client/job represents {fmtPct(m.topClientShare)} of revenue. This may indicate concentration risk worth reviewing.</>
                : "Revenue appears reasonably distributed across clients/jobs."
            }
          />
          <InsightCard
            title="What RGS recommends reviewing next"
            body={
              m.overdueRevenue > 0
                ? "Review overdue entries and confirm collection follow-up is happening."
                : m.pendingRevenue > m.collectedRevenue
                ? "Pending revenue is outpacing collected revenue. Review payment terms and follow-up cadence."
                : m.totalRevenue === 0
                ? "Add a few revenue entries to begin generating a Business Control Report."
                : "Continue logging entries consistently so trends become visible over time."
            }
          />
        </div>
      </section>

      {/* 6. Business Control Report linkage */}
      <section className="bg-muted/10 border border-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="h-4 w-4 text-primary" />
          <h3 className="text-sm text-foreground font-medium">How this feeds your reports</h3>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Entries logged here support your{" "}
          <span className="text-foreground">Business Control Report</span>, your{" "}
          <span className="text-foreground">Revenue Leak Detection</span> review, and your{" "}
          <span className="text-foreground">Financial Visibility Diagnostic</span>. The more consistently
          revenue is captured, the more accurate these reviews become.
        </p>
      </section>
    </div>
  );
}

function SummaryStat({
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
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 text-lg font-light tabular-nums truncate ${toneCls}`}>{value}</div>
      {hint && <div className="text-[10px] text-muted-foreground mt-0.5 truncate">{hint}</div>}
    </div>
  );
}

function InsightCard({
  title,
  body,
  tone,
}: {
  title: string;
  body: React.ReactNode;
  tone?: "warn";
}) {
  const border = tone === "warn" ? "border-amber-500/30 bg-amber-500/5" : "border-border bg-muted/10";
  return (
    <div className={`rounded-md border p-3 ${border}`}>
      <div className="flex items-center gap-1.5 mb-1">
        {tone === "warn" && <AlertTriangle className="h-3 w-3 text-amber-400" />}
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{title}</div>
      </div>
      <div className="text-xs text-foreground/90 leading-relaxed">{body}</div>
    </div>
  );
}
