/* P11.5 — Client Sales Pipeline admin panel.
 *
 * Admin-only operational surface to manage a client's live sales pipeline:
 * deals, stages, stalled/won/lost, aging visibility. Feeds the learning
 * layer via emitClientPipelineSignals.
 */

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  CircleDollarSign,
  Clock,
  Plus,
  RefreshCcw,
  Trash2,
  TrendingUp,
  Workflow,
} from "lucide-react";
import {
  buildPipelineRollup,
  createDeal,
  deleteDeal,
  ensureDefaultStages,
  isAging,
  listDeals,
  listStages,
  updateDeal,
  type DealStatus,
  type PipelineDeal,
  type PipelineStage,
} from "@/lib/pipeline/clientPipeline";
import { emitClientPipelineSignals } from "@/lib/diagnostics/clientPipelineSignalEmitter";

interface Props {
  customerId: string;
}

function money(n: number | null | undefined): string {
  if (n === null || n === undefined || !isFinite(n as number)) return "—";
  return `$${Math.round(n as number).toLocaleString()}`;
}
function pct(n: number | null | undefined): string {
  if (n === null || n === undefined || !isFinite(n as number)) return "—";
  return `${Math.round((n as number) * 100)}%`;
}
function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

const STATUS_CLASS: Record<DealStatus, string> = {
  open: "border-primary/30 text-primary bg-primary/5",
  won: "border-emerald-500/30 text-emerald-300 bg-emerald-500/5",
  lost: "border-rose-500/30 text-rose-300 bg-rose-500/5",
  stalled: "border-amber-500/30 text-amber-300 bg-amber-500/5",
  archived: "border-border text-muted-foreground bg-muted/10",
};

const SOURCE_OPTIONS = [
  "Manual",
  "CSV",
  "HubSpot",
  "Pipedrive",
  "Jobber",
  "Housecall Pro",
  "Salesforce",
  "Other CRM",
];

export function ClientSalesPipelinePanel({ customerId }: Props) {
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [deals, setDeals] = useState<PipelineDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // Sort/filter
  const [filterStatus, setFilterStatus] = useState<DealStatus | "all">("open");
  const [sortKey, setSortKey] = useState<"last_activity" | "expected_close" | "value">(
    "last_activity",
  );

  // Add deal form
  const [title, setTitle] = useState("");
  const [contact, setContact] = useState("");
  const [sourceChannel, setSourceChannel] = useState("");
  const [stageId, setStageId] = useState<string>("");
  const [estimatedValue, setEstimatedValue] = useState<string>("");
  const [probability, setProbability] = useState<string>("50");
  const [expectedClose, setExpectedClose] = useState<string>("");
  const [source, setSource] = useState<string>("Manual");

  async function load() {
    setLoading(true);
    try {
      const s = await ensureDefaultStages(customerId);
      const d = await listDeals(customerId);
      setStages(s);
      setDeals(d);
      if (!stageId && s[0]) setStageId(s[0].id);
    } catch (e) {
      toast.error("Failed to load pipeline", { description: (e as Error).message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  const rollup = useMemo(
    () => buildPipelineRollup({ stages, deals }),
    [stages, deals],
  );

  const filtered = useMemo(() => {
    let xs = deals.filter((d) => d.status !== "archived");
    if (filterStatus !== "all") xs = xs.filter((d) => d.status === filterStatus);
    xs = [...xs].sort((a, b) => {
      if (sortKey === "value") return (b.estimated_value || 0) - (a.estimated_value || 0);
      if (sortKey === "expected_close") {
        const av = a.expected_close_date ?? "9999-12-31";
        const bv = b.expected_close_date ?? "9999-12-31";
        return av.localeCompare(bv);
      }
      // last_activity
      const av = a.last_activity_date ?? a.created_date;
      const bv = b.last_activity_date ?? b.created_date;
      return bv.localeCompare(av);
    });
    return xs;
  }, [deals, filterStatus, sortKey]);

  async function handleAddDeal() {
    if (!title.trim()) {
      toast.error("Deal title is required");
      return;
    }
    setBusy(true);
    try {
      await createDeal({
        customer_id: customerId,
        title: title.trim(),
        company_or_contact: contact.trim() || null,
        source_channel: sourceChannel.trim() || null,
        stage_id: stageId || null,
        estimated_value: Number(estimatedValue) || 0,
        probability_percent: Math.max(0, Math.min(100, Number(probability) || 0)),
        expected_close_date: expectedClose || null,
        source,
      });
      toast.success("Deal added");
      setTitle("");
      setContact("");
      setSourceChannel("");
      setEstimatedValue("");
      setProbability("50");
      setExpectedClose("");
      await load();
      void emitClientPipelineSignals({ customerId });
    } catch (e) {
      toast.error("Failed to add deal", { description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function handleStageChange(d: PipelineDeal, newStageId: string) {
    try {
      await updateDeal(d.id, { stage_id: newStageId || null });
      await load();
    } catch (e) {
      toast.error("Failed to update stage", { description: (e as Error).message });
    }
  }

  async function handleStatusChange(d: PipelineDeal, newStatus: DealStatus) {
    try {
      const patch: Parameters<typeof updateDeal>[1] = { status: newStatus };
      if (newStatus === "lost" && !d.loss_reason) {
        const reason = prompt("Loss reason (optional):") ?? "";
        if (reason) patch.loss_reason = reason;
      }
      await updateDeal(d.id, patch);
      await load();
      void emitClientPipelineSignals({ customerId });
    } catch (e) {
      toast.error("Failed to update status", { description: (e as Error).message });
    }
  }

  async function handleEditValue(d: PipelineDeal) {
    const v = prompt("Estimated value ($):", String(d.estimated_value));
    if (v === null) return;
    const n = Number(v);
    if (!isFinite(n) || n < 0) {
      toast.error("Invalid value");
      return;
    }
    try {
      await updateDeal(d.id, { estimated_value: n });
      await load();
    } catch (e) {
      toast.error("Failed to update", { description: (e as Error).message });
    }
  }

  async function handleEditProbability(d: PipelineDeal) {
    const v = prompt("Probability (0–100):", String(d.probability_percent));
    if (v === null) return;
    const n = Number(v);
    if (!isFinite(n) || n < 0 || n > 100) {
      toast.error("Invalid percent");
      return;
    }
    try {
      await updateDeal(d.id, { probability_percent: n });
      await load();
    } catch (e) {
      toast.error("Failed to update", { description: (e as Error).message });
    }
  }

  async function handleTouchActivity(d: PipelineDeal) {
    try {
      await updateDeal(d.id, { last_activity_date: todayIso() });
      await load();
    } catch (e) {
      toast.error("Failed to update", { description: (e as Error).message });
    }
  }

  async function handleDelete(d: PipelineDeal) {
    if (!confirm(`Delete deal "${d.title}"?`)) return;
    try {
      await deleteDeal(d.id);
      toast.success("Deal deleted");
      await load();
    } catch (e) {
      toast.error("Failed to delete", { description: (e as Error).message });
    }
  }

  async function handleEmit() {
    setBusy(true);
    try {
      const r = await emitClientPipelineSignals({ customerId });
      toast.success(`Signals emitted: ${r.emitted}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-lg border border-border bg-card p-5 space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Workflow className="w-4 h-4 text-primary" />
            Client Sales Pipeline
          </h3>
          <p className="text-[11px] text-muted-foreground mt-1 max-w-xl">
            Live view of the client's sales pipeline. Track deals through
            stages, mark stalled/won/lost, and surface aging risk before it
            becomes a revenue problem. Aggregate weakness feeds the RGS
            learning layer.
          </p>
        </div>
        <button
          onClick={handleEmit}
          disabled={busy}
          className="text-[11px] px-2.5 py-1 rounded-md bg-muted/40 border border-border hover:border-primary/40 inline-flex items-center gap-1 disabled:opacity-50"
        >
          <RefreshCcw className="w-3 h-3" />
          Emit signals
        </button>
      </header>

      {/* Rollup */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
        <Stat label="Open" value={`${rollup.open_count} · ${money(rollup.open_value)}`} />
        <Stat label="Weighted" value={money(rollup.weighted_value)} />
        <Stat
          label="Aging 30d+"
          value={`${rollup.aging_count} · ${money(rollup.aging_value)}`}
          tone={rollup.aging_count > 0 ? "warn" : "muted"}
        />
        <Stat
          label="Stalled"
          value={`${rollup.stalled_count} · ${money(rollup.stalled_value)}`}
          tone={rollup.stalled_count > 0 ? "warn" : "muted"}
        />
        <Stat
          label="Closing this month"
          value={`${rollup.closing_this_month_count} · ${money(rollup.closing_this_month_value)}`}
        />
        <Stat
          label="Won (period)"
          value={`${rollup.won_count} · ${money(rollup.won_value)}`}
          tone={rollup.won_count > 0 ? "ok" : "muted"}
        />
      </div>

      {/* By stage */}
      <div>
        <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
          By stage
        </h4>
        {rollup.by_stage.length === 0 ? (
          <p className="text-xs text-muted-foreground">No active deals.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
            {rollup.by_stage.map((s) => (
              <div
                key={s.stage_id ?? "unassigned"}
                className="rounded-md border border-border bg-muted/10 p-2"
              >
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {s.label}
                </div>
                <div className="text-sm text-foreground mt-0.5">{s.count}</div>
                <div className="text-[11px] text-muted-foreground">{money(s.value)}</div>
              </div>
            ))}
          </div>
        )}
        <div className="text-[10px] text-muted-foreground mt-2 flex flex-wrap gap-x-4">
          <span>Proposal→Win: {pct(rollup.proposal_to_win_rate)}</span>
          <span>Call→Proposal: {pct(rollup.call_to_proposal_rate)}</span>
        </div>
      </div>

      {/* Deals table */}
      <div>
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <h4 className="text-xs uppercase tracking-wider text-muted-foreground">
            Deals
          </h4>
          <div className="flex items-center gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as DealStatus | "all")}
              className="text-[11px] bg-background border border-border rounded px-2 py-1"
            >
              <option value="all">All (active)</option>
              <option value="open">Open</option>
              <option value="stalled">Stalled</option>
              <option value="won">Won</option>
              <option value="lost">Lost</option>
            </select>
            <select
              value={sortKey}
              onChange={(e) =>
                setSortKey(e.target.value as "last_activity" | "expected_close" | "value")
              }
              className="text-[11px] bg-background border border-border rounded px-2 py-1"
            >
              <option value="last_activity">Sort: Last activity</option>
              <option value="expected_close">Sort: Expected close</option>
              <option value="value">Sort: Value</option>
            </select>
          </div>
        </div>

        {loading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground">No deals to show.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-[11px]">
              <thead className="bg-muted/30 text-muted-foreground">
                <tr>
                  <th className="text-left px-2 py-1.5 font-medium">Deal</th>
                  <th className="text-left px-2 py-1.5 font-medium">Stage</th>
                  <th className="text-right px-2 py-1.5 font-medium">Value</th>
                  <th className="text-right px-2 py-1.5 font-medium">Prob.</th>
                  <th className="text-right px-2 py-1.5 font-medium">Weighted</th>
                  <th className="text-left px-2 py-1.5 font-medium">Close</th>
                  <th className="text-left px-2 py-1.5 font-medium">Last activity</th>
                  <th className="text-left px-2 py-1.5 font-medium">Status</th>
                  <th className="px-2 py-1.5"></th>
                </tr>
              </thead>
              <tbody className="text-foreground">
                {filtered.map((d) => {
                  const aging = isAging(d);
                  return (
                    <tr key={d.id} className="border-t border-border/60 align-top">
                      <td className="px-2 py-1.5 max-w-[240px]">
                        <div className="font-medium truncate">{d.title}</div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          {d.company_or_contact || "—"}
                          {d.source_channel ? ` · ${d.source_channel}` : ""}
                        </div>
                      </td>
                      <td className="px-2 py-1.5">
                        <select
                          value={d.stage_id ?? ""}
                          onChange={(e) => handleStageChange(d, e.target.value)}
                          className="text-[10px] bg-background border border-border rounded px-1.5 py-0.5"
                        >
                          <option value="">Unassigned</option>
                          {stages.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        <button
                          onClick={() => handleEditValue(d)}
                          className="hover:text-primary"
                          title="Edit value"
                        >
                          {money(d.estimated_value)}
                        </button>
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        <button
                          onClick={() => handleEditProbability(d)}
                          className="hover:text-primary"
                          title="Edit probability"
                        >
                          {Math.round(d.probability_percent)}%
                        </button>
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        {money(d.weighted_value)}
                      </td>
                      <td className="px-2 py-1.5">{d.expected_close_date ?? "—"}</td>
                      <td className="px-2 py-1.5">
                        <button
                          onClick={() => handleTouchActivity(d)}
                          className={`inline-flex items-center gap-1 ${aging ? "text-amber-300" : ""}`}
                          title="Mark activity today"
                        >
                          {aging ? <AlertTriangle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {d.last_activity_date ?? d.created_date}
                        </button>
                      </td>
                      <td className="px-2 py-1.5">
                        <select
                          value={d.status}
                          onChange={(e) =>
                            handleStatusChange(d, e.target.value as DealStatus)
                          }
                          className={`text-[10px] px-1.5 py-0.5 rounded border bg-transparent ${STATUS_CLASS[d.status]}`}
                        >
                          <option value="open">open</option>
                          <option value="stalled">stalled</option>
                          <option value="won">won</option>
                          <option value="lost">lost</option>
                          <option value="archived">archived</option>
                        </select>
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        <button
                          onClick={() => handleDelete(d)}
                          className="text-muted-foreground hover:text-rose-300"
                          title="Delete deal"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add deal */}
      <div className="rounded-md border border-border bg-muted/10 p-3 space-y-2">
        <h4 className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1">
          <Plus className="w-3 h-3" /> Add deal
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
          <FieldShell label="Title">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Acme retainer"
              className="text-xs bg-background border border-border rounded px-2 py-1 w-full"
            />
          </FieldShell>
          <FieldShell label="Company / contact">
            <input
              type="text"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              className="text-xs bg-background border border-border rounded px-2 py-1 w-full"
            />
          </FieldShell>
          <FieldShell label="Stage">
            <select
              value={stageId}
              onChange={(e) => setStageId(e.target.value)}
              className="text-xs bg-background border border-border rounded px-2 py-1 w-full"
            >
              {stages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </FieldShell>
          <FieldShell label="Source channel">
            <input
              type="text"
              value={sourceChannel}
              onChange={(e) => setSourceChannel(e.target.value)}
              placeholder="Google Ads / referral / …"
              className="text-xs bg-background border border-border rounded px-2 py-1 w-full"
            />
          </FieldShell>
          <FieldShell label="Estimated value">
            <input
              type="number"
              value={estimatedValue}
              onChange={(e) => setEstimatedValue(e.target.value)}
              className="text-xs bg-background border border-border rounded px-2 py-1 w-full"
            />
          </FieldShell>
          <FieldShell label="Probability %">
            <input
              type="number"
              min={0}
              max={100}
              value={probability}
              onChange={(e) => setProbability(e.target.value)}
              className="text-xs bg-background border border-border rounded px-2 py-1 w-full"
            />
          </FieldShell>
          <FieldShell label="Expected close">
            <input
              type="date"
              value={expectedClose}
              onChange={(e) => setExpectedClose(e.target.value)}
              className="text-xs bg-background border border-border rounded px-2 py-1 w-full"
            />
          </FieldShell>
          <FieldShell label="Source">
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="text-xs bg-background border border-border rounded px-2 py-1 w-full"
            >
              {SOURCE_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </FieldShell>
        </div>
        <div className="flex justify-end">
          <button
            onClick={handleAddDeal}
            disabled={busy}
            className="text-[11px] px-3 py-1.5 rounded-md bg-primary/15 border border-primary/40 text-primary hover:bg-primary/25 disabled:opacity-50 inline-flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> Add deal
          </button>
        </div>
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  tone = "muted",
}: {
  label: string;
  value: string;
  tone?: "muted" | "warn" | "ok";
}) {
  const toneCls =
    tone === "warn"
      ? "border-amber-500/30 text-amber-200"
      : tone === "ok"
        ? "border-emerald-500/30 text-emerald-200"
        : "border-border text-foreground";
  return (
    <div className={`rounded-md border ${toneCls} bg-muted/10 px-3 py-2`}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
        <CircleDollarSign className="w-3 h-3" />
        {label}
      </div>
      <div className="text-sm mt-0.5">{value}</div>
    </div>
  );
}

function FieldShell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
        {label}
      </span>
      {children}
    </label>
  );
}