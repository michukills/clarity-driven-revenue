import { useMemo, useState } from "react";
import { Plus, Sparkles, TrendingUp } from "lucide-react";
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
 * Client-facing Revenue Tracker. Owner-friendly language, no admin/internal
 * framing, no customer selector, no technical database warnings.
 */
export function ClientRevenueTracker({ data, customerId, isSample, onChange }: Props) {
  const m = useMemo(() => computeMetrics(data), [data]);
  const [formOpen, setFormOpen] = useState(false);

  const recurringRevenue = useMemo(
    () => data.revenue.filter((r) => r.revenue_type === "recurring").reduce((a, r) => a + (r.amount || 0), 0),
    [data.revenue],
  );
  const oneTimeRevenue = m.totalRevenue - recurringRevenue;

  // Polished "workspace not yet activated" state — no technical/DB language.
  if (!customerId) {
    return (
      <div className="rounded-xl border border-border bg-card p-10 text-center max-w-2xl mx-auto">
        <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <TrendingUp className="h-5 w-5 text-primary" />
        </div>
        <h2 className="text-xl font-light text-foreground">Your Revenue Tracker is being prepared</h2>
        <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
          Your Business Control Center is being set up. Your RGS team will activate revenue tracking for your
          workspace shortly. You'll be able to log collected, pending, and recurring revenue here.
        </p>
      </div>
    );
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this revenue entry?")) return;
    const { error } = await supabase.from("revenue_entries").delete().eq("id", id);
    if (error) {
      toast.error("Could not remove entry");
      return;
    }
    toast.success("Entry removed");
    onChange();
  };

  const hasEntries = data.revenue.length > 0 && !isSample;

  return (
    <div className="space-y-5">
      {/* Header — owner-friendly, no admin framing */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-light text-foreground">Your Revenue</h2>
          <p className="text-xs text-muted-foreground mt-2 max-w-2xl leading-relaxed">
            Log what came in, what's still owed, and what's recurring. This gives you a clear, honest picture
            of money moving through your business.
          </p>
        </div>
        <button
          onClick={() => setFormOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors self-start"
        >
          <Plus className="h-3.5 w-3.5" /> {formOpen ? "Close" : "Add revenue entry"}
        </button>
      </header>

      {isSample && (
        <div className="rounded-md border border-secondary/40 bg-secondary/5 p-3 text-xs text-secondary-foreground flex items-start gap-2">
          <Sparkles className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-secondary" />
          <div>
            <span className="font-medium text-foreground">Showing example numbers.</span> Add your first real
            entry below and your own data will replace this preview.
          </div>
        </div>
      )}

      {/* Summary cards — exactly the six the client view needs */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <SummaryStat label="Total revenue" value={<Money value={m.totalRevenue} />} />
        <SummaryStat label="Collected" value={<Money value={m.collectedRevenue} />} tone="ok" />
        <SummaryStat label="Pending" value={<Money value={m.pendingRevenue} />} tone="watch" />
        <SummaryStat label="Overdue" value={<Money value={m.overdueRevenue} />} tone="critical" />
        <SummaryStat label="Recurring" value={<Money value={recurringRevenue} />} hint={fmtPct(m.recurringRevenuePct)} />
        <SummaryStat label="One-time" value={<Money value={oneTimeRevenue} />} hint={fmtPct(100 - m.recurringRevenuePct)} />
      </div>

      {formOpen && (
        <section className="rounded-xl border border-border bg-muted/10 p-4">
          <RevenueQuickForm
            customerId={customerId}
            onSaved={() => {
              setFormOpen(false);
              onChange();
            }}
          />
        </section>
      )}

      <section className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-baseline justify-between mb-4">
          <div>
            <h3 className="text-sm text-foreground font-medium">Revenue entries</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Each row is one piece of revenue. Date, what it was for, and whether it's been collected.
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
            canDelete={!isSample}
            onDelete={handleDelete}
            emptyLabel="No revenue logged yet."
          />
        ) : (
          <div className="text-center py-10">
            <p className="text-sm text-foreground">No revenue logged yet.</p>
            <p className="text-xs text-muted-foreground mt-2 max-w-md mx-auto">
              Add your first entry to start building a clear picture of your revenue. You can log a single
              project, a recurring client, or anything that came in.
            </p>
            <button
              onClick={() => setFormOpen(true)}
              className="mt-4 inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-primary/90 text-primary-foreground text-xs font-medium hover:bg-primary"
            >
              <Plus className="h-3.5 w-3.5" /> Add your first entry
            </button>
          </div>
        )}
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
  hint?: string;
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
      {hint && <div className="text-[10px] text-muted-foreground mt-0.5">{hint}</div>}
    </div>
  );
}
