import { useMemo, useState } from "react";
import { Plus, Database, Sparkles } from "lucide-react";
import { computeMetrics } from "@/lib/bcc/engine";
import type { BccDataset } from "@/lib/bcc/types";
import { Money, fmtPct } from "./Money";
import { RevenueTable } from "./EntryTables";
import { RevenueQuickForm } from "./QuickEntryForms";
import { toast } from "sonner";
import { EditEntryDialog } from "./EditEntryDialog";
import { ENTRY_TARGETS, deleteEntry } from "@/lib/bcc/entryActions";
import type { RevenueEntry } from "@/lib/bcc/types";

type Props = {
  data: BccDataset;
  customerId: string | null;
  isSample: boolean;
  audience: "client" | "admin";
  onChange: () => void;
};

/**
 * Dedicated Revenue Tracker module — focused, full-bleed view of revenue
 * entries inside the Business Control Center shell. Used when the BCC URL
 * is /:scope/business-control-center/revenue-tracker.
 */
export function RevenueTrackerModule({ data, customerId, isSample, audience, onChange }: Props) {
  const m = useMemo(() => computeMetrics(data), [data]);
  const [formOpen, setFormOpen] = useState(false);

  // Top service & client by total amount
  const top = useMemo(() => {
    const svc = new Map<string, number>();
    const cli = new Map<string, number>();
    for (const r of data.revenue) {
      if (r.service_category) svc.set(r.service_category, (svc.get(r.service_category) || 0) + (r.amount || 0));
      if (r.client_or_job) cli.set(r.client_or_job, (cli.get(r.client_or_job) || 0) + (r.amount || 0));
    }
    const sortTop = (mp: Map<string, number>) => [...mp.entries()].sort((a, b) => b[1] - a[1])[0] || null;
    return { service: sortTop(svc), client: sortTop(cli) };
  }, [data.revenue]);

  const recurringRevenue = useMemo(
    () => data.revenue.filter((r) => r.revenue_type === "recurring").reduce((a, r) => a + (r.amount || 0), 0),
    [data.revenue],
  );
  const oneTimeRevenue = m.totalRevenue - recurringRevenue;

  const subtitle =
    audience === "admin"
      ? "Revenue data supports the Business Control Report, Revenue Leak Detection Engine™, and Financial Visibility Diagnostic."
      : "Revenue entries help RGS OS identify what came in, what is still outstanding, and where revenue patterns may need attention.";

  const canSave = !!customerId;
  const [editing, setEditing] = useState<RevenueEntry | null>(null);

  const handleDelete = async (id: string) => {
    const res = await deleteEntry(ENTRY_TARGETS.revenue, id);
    if (!res.ok) {
      toast.error(res.error || "Could not delete entry");
      return;
    }
    toast.success("Revenue entry removed");
    onChange();
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-primary/70">Revenue Control Center™ · Module</div>
          <h2 className="mt-1 text-2xl font-light text-foreground">Revenue Control Center™</h2>
          <p className="text-xs text-muted-foreground mt-2 max-w-2xl leading-relaxed">
            Track collected, pending, overdue, one-time, and recurring revenue so RGS OS can identify revenue patterns,
            collection risk, and business control signals.
          </p>
          <p className="text-[11px] text-muted-foreground/80 mt-2 max-w-2xl italic">{subtitle}</p>
        </div>
        {canSave && (
          <button
            onClick={() => setFormOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors self-start"
          >
            <Plus className="h-3.5 w-3.5" /> {formOpen ? "Close form" : "Add revenue entry"}
          </button>
        )}
      </header>

      {/* State banners */}
      {!canSave && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-200 flex items-start gap-2">
          <Database className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
          <div>
            Revenue Control Center™ is ready, but database saving is not connected for this view yet.
            {audience === "admin"
              ? " Select a client to start logging revenue entries on their behalf."
              : " Your account isn't linked to a customer record yet — RGS will provision this for you."}
          </div>
        </div>
      )}
      {canSave && isSample && (
        <div className="rounded-md border border-secondary/40 bg-secondary/5 p-3 text-xs text-secondary-foreground flex items-start gap-2">
          <Sparkles className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-secondary" />
          <div>
            <span className="font-medium text-foreground">Sample / demo data shown.</span> Add your first real revenue
            entry and the sample data will be replaced automatically.
          </div>
        </div>
      )}

      {/* Summary cards — always visible */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryStat label="Total revenue" value={<Money value={m.totalRevenue} />} />
        <SummaryStat label="Collected" value={<Money value={m.collectedRevenue} />} tone="ok" />
        <SummaryStat label="Pending" value={<Money value={m.pendingRevenue} />} tone="watch" />
        <SummaryStat label="Overdue" value={<Money value={m.overdueRevenue} />} tone="critical" />
        <SummaryStat label="Recurring" value={<Money value={recurringRevenue} />} hint={fmtPct(m.recurringRevenuePct)} />
        <SummaryStat label="One-time" value={<Money value={oneTimeRevenue} />} hint={fmtPct(100 - m.recurringRevenuePct)} />
        <SummaryStat
          label="Top service"
          value={<span className="text-base">{top.service ? top.service[0] : "—"}</span>}
          hint={top.service ? `${fmtPct(m.topServiceShare)} share` : undefined}
        />
        <SummaryStat
          label="Top client / job"
          value={<span className="text-base">{top.client ? top.client[0] : "—"}</span>}
          hint={top.client ? `${fmtPct(m.topClientShare)} share` : undefined}
        />
      </div>

      {/* Add-entry form */}
      {canSave && formOpen && (
        <section className="rounded-xl border border-border bg-muted/10 p-4">
          <RevenueQuickForm
            customerId={customerId!}
            onSaved={() => {
              setFormOpen(false);
              onChange();
            }}
          />
        </section>
      )}

      {/* Entries table */}
      <section className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-baseline justify-between mb-4">
          <div>
            <h3 className="text-sm text-foreground font-medium">Revenue entries</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Date · service · client · type · status · amount.
            </p>
          </div>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {data.revenue.length} {data.revenue.length === 1 ? "entry" : "entries"}
          </span>
        </div>
        <RevenueTable
          rows={data.revenue}
          canEdit={!isSample && canSave}
          onEdit={(row) => setEditing(row)}
          onDelete={handleDelete}
          emptyLabel="No revenue has been recorded for this period yet. Add revenue entries to begin building your Business Control Report."
        />
      </section>

      {/* Report preview */}
      <section className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm text-foreground font-medium">Feeds the Business Control Report</h3>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          These figures roll up into total revenue, collection health, recurring vs. one-time mix, revenue
          concentration, and revenue leak signals.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
          <ReportRow label="Total revenue" value={<Money value={m.totalRevenue} />} />
          <ReportRow label="Collected" value={<Money value={m.collectedRevenue} />} />
          <ReportRow label="Pending" value={<Money value={m.pendingRevenue} />} />
          <ReportRow label="Overdue" value={<Money value={m.overdueRevenue} />} />
          <ReportRow label="Recurring share" value={fmtPct(m.recurringRevenuePct)} />
          <ReportRow label="Top client share" value={fmtPct(m.topClientShare)} />
        </div>
      </section>
    </div>
      {/* Edit dialog */}
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

function ReportRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border/60 bg-background/40 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm text-foreground tabular-nums mt-0.5">{value}</div>
    </div>
  );
}
