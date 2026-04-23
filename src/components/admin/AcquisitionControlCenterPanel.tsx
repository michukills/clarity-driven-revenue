/* P11.4 — Acquisition Control Center admin panel.
 *
 * Admin-only operational surface to manage marketing channels, spend, and
 * lead/outcome metrics for a single customer. Renders derived rollups so
 * weak vs strong channels are visible at a glance.
 */

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  RefreshCcw,
  Megaphone,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
import {
  CHANNEL_KEY_LABEL,
  CHANNEL_KEYS,
  buildChannelRollups,
  createMetric,
  createSpend,
  deleteChannel,
  deleteMetric,
  deleteSpend,
  listChannels,
  listMetrics,
  listSpend,
  updateChannel,
  upsertChannel,
  type ChannelKey,
  type ChannelRollup,
  type ChannelStatus,
  type LeadSourceMetric,
  type MarketingChannel,
  type MarketingSpendEntry,
} from "@/lib/acquisition/acquisition";
import { emitAcquisitionSignals } from "@/lib/diagnostics/acquisitionSignalEmitter";

interface Props {
  customerId: string;
}

function money(n: number | null | undefined) {
  if (n === null || n === undefined || !isFinite(n as number)) return "—";
  return `$${Math.round(n as number).toLocaleString()}`;
}
function pct(n: number | null | undefined) {
  if (n === null || n === undefined || !isFinite(n as number)) return "—";
  return `${Math.round((n as number) * 100)}%`;
}
function ratio(n: number | null | undefined) {
  if (n === null || n === undefined || !isFinite(n as number)) return "—";
  return `${(n as number).toFixed(2)}×`;
}
function todayIso() {
  return new Date().toISOString().slice(0, 10);
}
function firstOfMonthIso() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

const STATUS_CLASS: Record<ChannelStatus, string> = {
  active: "border-emerald-500/30 text-emerald-300 bg-emerald-500/5",
  paused: "border-amber-500/30 text-amber-300 bg-amber-500/5",
  archived: "border-border text-muted-foreground bg-muted/10",
};

function performanceTone(r: ChannelRollup): {
  label: string;
  cls: string;
} {
  if (r.spend >= 500 && r.won_deals === 0 && r.booked_calls < 2) {
    return { label: "Leak", cls: "border-rose-500/40 text-rose-300 bg-rose-500/5" };
  }
  if (r.revenue_to_spend !== null && r.revenue_to_spend < 1 && r.spend >= 500) {
    return { label: "Weak", cls: "border-rose-500/30 text-rose-300 bg-rose-500/5" };
  }
  if (r.revenue_to_spend !== null && r.revenue_to_spend >= 3 && r.won_deals >= 2) {
    return { label: "Strong", cls: "border-emerald-500/30 text-emerald-300 bg-emerald-500/5" };
  }
  if (r.leads >= 10 && r.lead_to_call_rate !== null && r.lead_to_call_rate < 0.1) {
    return { label: "Follow-up gap", cls: "border-amber-500/30 text-amber-300 bg-amber-500/5" };
  }
  if (
    r.booked_calls >= 5 &&
    r.call_to_win_rate !== null &&
    r.call_to_win_rate < 0.1
  ) {
    return { label: "Pipeline risk", cls: "border-amber-500/30 text-amber-300 bg-amber-500/5" };
  }
  return { label: "OK", cls: "border-border text-muted-foreground bg-muted/10" };
}

export function AcquisitionControlCenterPanel({ customerId }: Props) {
  const [channels, setChannels] = useState<MarketingChannel[]>([]);
  const [spend, setSpend] = useState<MarketingSpendEntry[]>([]);
  const [metrics, setMetrics] = useState<LeadSourceMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // add channel
  const [newChannelKey, setNewChannelKey] = useState<ChannelKey>("google_ads");
  const [newChannelLabel, setNewChannelLabel] = useState("");

  // add spend
  const [spendChannelId, setSpendChannelId] = useState<string>("");
  const [spendStart, setSpendStart] = useState<string>(firstOfMonthIso());
  const [spendEnd, setSpendEnd] = useState<string>(todayIso());
  const [spendAmount, setSpendAmount] = useState<string>("");
  const [spendSource, setSpendSource] = useState<string>("Manual");

  // add metric
  const [metricChannelId, setMetricChannelId] = useState<string>("");
  const [metricStart, setMetricStart] = useState<string>(firstOfMonthIso());
  const [metricEnd, setMetricEnd] = useState<string>(todayIso());
  const [mLeads, setMLeads] = useState<string>("");
  const [mQualified, setMQualified] = useState<string>("");
  const [mCalls, setMCalls] = useState<string>("");
  const [mProposals, setMProposals] = useState<string>("");
  const [mWon, setMWon] = useState<string>("");
  const [mLost, setMLost] = useState<string>("");
  const [mRevenue, setMRevenue] = useState<string>("");

  async function load() {
    setLoading(true);
    try {
      const [c, s, m] = await Promise.all([
        listChannels(customerId),
        listSpend(customerId, { sinceDays: 90 }),
        listMetrics(customerId, { sinceDays: 90 }),
      ]);
      setChannels(c);
      setSpend(s);
      setMetrics(m);
      if (!spendChannelId && c[0]) setSpendChannelId(c[0].id);
      if (!metricChannelId && c[0]) setMetricChannelId(c[0].id);
    } catch (e) {
      toast.error("Failed to load acquisition data", {
        description: (e as Error).message,
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  const rollups = useMemo(
    () => buildChannelRollups({ channels, spend, metrics }),
    [channels, spend, metrics],
  );
  const sortedRollups = useMemo(
    () => [...rollups].sort((a, b) => b.spend - a.spend || b.leads - a.leads),
    [rollups],
  );

  const totals = useMemo(() => {
    return rollups.reduce(
      (acc, r) => {
        acc.spend += r.spend;
        acc.leads += r.leads;
        acc.qualified += r.qualified_leads;
        acc.calls += r.booked_calls;
        acc.won += r.won_deals;
        acc.revenue += r.revenue_attributed;
        return acc;
      },
      { spend: 0, leads: 0, qualified: 0, calls: 0, won: 0, revenue: 0 },
    );
  }, [rollups]);

  async function handleAddChannel() {
    if (!newChannelKey) return;
    setBusy(true);
    try {
      await upsertChannel({
        customer_id: customerId,
        channel_key: newChannelKey,
        label: newChannelLabel.trim() || CHANNEL_KEY_LABEL[newChannelKey],
      });
      toast.success("Channel added");
      setNewChannelLabel("");
      await load();
    } catch (e) {
      toast.error("Failed to add channel", { description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function handleSetStatus(c: MarketingChannel, status: ChannelStatus) {
    try {
      await updateChannel(c.id, { status });
      await load();
    } catch (e) {
      toast.error("Failed to update channel", { description: (e as Error).message });
    }
  }

  async function handleDeleteChannel(c: MarketingChannel) {
    if (
      !confirm(
        `Delete channel "${c.label}"? This also removes its spend and metric rows.`,
      )
    )
      return;
    try {
      await deleteChannel(c.id);
      toast.success("Channel deleted");
      await load();
    } catch (e) {
      toast.error("Failed to delete", { description: (e as Error).message });
    }
  }

  async function handleAddSpend() {
    if (!spendChannelId || !spendAmount) return;
    setBusy(true);
    try {
      await createSpend({
        customer_id: customerId,
        channel_id: spendChannelId,
        period_start: spendStart,
        period_end: spendEnd,
        amount_spent: Number(spendAmount) || 0,
        source: spendSource || "Manual",
      });
      setSpendAmount("");
      toast.success("Spend recorded");
      await load();
      void emitAcquisitionSignals({ customerId });
    } catch (e) {
      toast.error("Failed to record spend", { description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function handleAddMetric() {
    if (!metricChannelId) return;
    setBusy(true);
    try {
      await createMetric({
        customer_id: customerId,
        channel_id: metricChannelId,
        period_start: metricStart,
        period_end: metricEnd,
        leads: Number(mLeads) || 0,
        qualified_leads: Number(mQualified) || 0,
        booked_calls: Number(mCalls) || 0,
        proposals_sent: Number(mProposals) || 0,
        won_deals: Number(mWon) || 0,
        lost_deals: Number(mLost) || 0,
        revenue_attributed: Number(mRevenue) || 0,
      });
      setMLeads("");
      setMQualified("");
      setMCalls("");
      setMProposals("");
      setMWon("");
      setMLost("");
      setMRevenue("");
      toast.success("Outcome metrics recorded");
      await load();
      void emitAcquisitionSignals({ customerId });
    } catch (e) {
      toast.error("Failed to record metrics", { description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function handleEmit() {
    setBusy(true);
    try {
      const r = await emitAcquisitionSignals({ customerId });
      toast.success(`Signals emitted: ${r.emitted}`);
    } finally {
      setBusy(false);
    }
  }

  const usedKeys = new Set(channels.map((c) => c.channel_key));
  const availableKeys = CHANNEL_KEYS.filter((k) => !usedKeys.has(k));

  return (
    <section className="rounded-lg border border-border bg-card p-5 space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-primary" />
            Acquisition Control Center
          </h3>
          <p className="text-[11px] text-muted-foreground mt-1 max-w-xl">
            Track channel-level spend and lead/conversion outcomes. Derived
            efficiency metrics feed the RGS learning layer as structured
            signals (leak, strength, follow-up gap, pipeline risk).
          </p>
        </div>
        <button
          onClick={handleEmit}
          disabled={busy || channels.length === 0}
          className="text-[11px] px-2.5 py-1 rounded-md bg-muted/40 border border-border hover:border-primary/40 inline-flex items-center gap-1 disabled:opacity-50"
        >
          <RefreshCcw className="w-3 h-3" />
          Emit signals
        </button>
      </header>

      {/* Portfolio totals */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
        <Stat label="Spend" value={money(totals.spend)} />
        <Stat label="Leads" value={String(totals.leads)} />
        <Stat label="Qualified" value={String(totals.qualified)} />
        <Stat label="Booked calls" value={String(totals.calls)} />
        <Stat label="Won deals" value={String(totals.won)} />
        <Stat label="Revenue (att.)" value={money(totals.revenue)} />
      </div>

      {/* Channel performance table */}
      <div>
        <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
          Channel performance (last 90 days)
        </h4>
        {loading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : sortedRollups.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No channels yet. Add one below to start tracking acquisition.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-[11px]">
              <thead className="bg-muted/30 text-muted-foreground">
                <tr>
                  <th className="text-left px-2 py-1.5 font-medium">Channel</th>
                  <th className="text-right px-2 py-1.5 font-medium">Spend</th>
                  <th className="text-right px-2 py-1.5 font-medium">Leads</th>
                  <th className="text-right px-2 py-1.5 font-medium">Qual.</th>
                  <th className="text-right px-2 py-1.5 font-medium">Calls</th>
                  <th className="text-right px-2 py-1.5 font-medium">Won</th>
                  <th className="text-right px-2 py-1.5 font-medium">Revenue</th>
                  <th className="text-right px-2 py-1.5 font-medium">CPL</th>
                  <th className="text-right px-2 py-1.5 font-medium">CPQL</th>
                  <th className="text-right px-2 py-1.5 font-medium">CPC</th>
                  <th className="text-right px-2 py-1.5 font-medium">CPW</th>
                  <th className="text-right px-2 py-1.5 font-medium">L→C</th>
                  <th className="text-right px-2 py-1.5 font-medium">C→W</th>
                  <th className="text-right px-2 py-1.5 font-medium">R/$</th>
                  <th className="text-left px-2 py-1.5 font-medium">Signal</th>
                  <th className="text-left px-2 py-1.5 font-medium">Status</th>
                  <th className="px-2 py-1.5"></th>
                </tr>
              </thead>
              <tbody className="text-foreground">
                {sortedRollups.map((r) => {
                  const c = channels.find((ch) => ch.id === r.channel_id);
                  const tone = performanceTone(r);
                  return (
                    <tr key={r.channel_id} className="border-t border-border/60">
                      <td className="px-2 py-1.5">{r.label}</td>
                      <td className="px-2 py-1.5 text-right">{money(r.spend)}</td>
                      <td className="px-2 py-1.5 text-right">{r.leads || "—"}</td>
                      <td className="px-2 py-1.5 text-right">{r.qualified_leads || "—"}</td>
                      <td className="px-2 py-1.5 text-right">{r.booked_calls || "—"}</td>
                      <td className="px-2 py-1.5 text-right">{r.won_deals || "—"}</td>
                      <td className="px-2 py-1.5 text-right">{money(r.revenue_attributed)}</td>
                      <td className="px-2 py-1.5 text-right">{money(r.cost_per_lead)}</td>
                      <td className="px-2 py-1.5 text-right">{money(r.cost_per_qualified_lead)}</td>
                      <td className="px-2 py-1.5 text-right">{money(r.cost_per_booked_call)}</td>
                      <td className="px-2 py-1.5 text-right">{money(r.cost_per_won_deal)}</td>
                      <td className="px-2 py-1.5 text-right">{pct(r.lead_to_call_rate)}</td>
                      <td className="px-2 py-1.5 text-right">{pct(r.call_to_win_rate)}</td>
                      <td className="px-2 py-1.5 text-right">{ratio(r.revenue_to_spend)}</td>
                      <td className="px-2 py-1.5">
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] ${tone.cls}`}>
                          {tone.label === "Leak" || tone.label === "Weak" ? (
                            <AlertTriangle className="w-3 h-3" />
                          ) : tone.label === "Strong" ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : null}
                          {tone.label}
                        </span>
                      </td>
                      <td className="px-2 py-1.5">
                        {c ? (
                          <select
                            value={c.status}
                            onChange={(e) =>
                              handleSetStatus(c, e.target.value as ChannelStatus)
                            }
                            className={`text-[10px] px-1.5 py-0.5 rounded border bg-transparent ${STATUS_CLASS[c.status]}`}
                          >
                            <option value="active">active</option>
                            <option value="paused">paused</option>
                            <option value="archived">archived</option>
                          </select>
                        ) : null}
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        {c ? (
                          <button
                            onClick={() => handleDeleteChannel(c)}
                            className="text-muted-foreground hover:text-rose-300"
                            title="Delete channel"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-[10px] text-muted-foreground mt-1">
          CPL = cost / lead · CPQL = cost / qualified · CPC = cost / booked call · CPW = cost / won deal · L→C = leads→calls · C→W = calls→wins · R/$ = revenue per $ spent.
        </p>
      </div>

      {/* Add channel */}
      <div className="rounded-md border border-border bg-muted/10 p-3 space-y-2">
        <h4 className="text-xs uppercase tracking-wider text-muted-foreground">
          Add channel
        </h4>
        <div className="flex flex-wrap items-end gap-2">
          <FieldShell label="Channel">
            <select
              value={newChannelKey}
              onChange={(e) => setNewChannelKey(e.target.value as ChannelKey)}
              className="text-xs bg-background border border-border rounded px-2 py-1"
            >
              {availableKeys.length === 0 ? (
                <option value="">All channels added</option>
              ) : (
                availableKeys.map((k) => (
                  <option key={k} value={k}>
                    {CHANNEL_KEY_LABEL[k]}
                  </option>
                ))
              )}
            </select>
          </FieldShell>
          <FieldShell label="Custom label (optional)">
            <input
              type="text"
              value={newChannelLabel}
              onChange={(e) => setNewChannelLabel(e.target.value)}
              placeholder={CHANNEL_KEY_LABEL[newChannelKey] || "Label"}
              className="text-xs bg-background border border-border rounded px-2 py-1 w-56"
            />
          </FieldShell>
          <button
            onClick={handleAddChannel}
            disabled={busy || availableKeys.length === 0}
            className="text-xs px-3 py-1.5 rounded-md bg-primary/15 text-foreground border border-primary/40 hover:bg-primary/25 inline-flex items-center gap-1 disabled:opacity-50"
          >
            <Plus className="w-3 h-3" />
            Add
          </button>
        </div>
      </div>

      {/* Add spend */}
      <div className="rounded-md border border-border bg-muted/10 p-3 space-y-2">
        <h4 className="text-xs uppercase tracking-wider text-muted-foreground">
          Record spend
        </h4>
        <div className="flex flex-wrap items-end gap-2">
          <FieldShell label="Channel">
            <select
              value={spendChannelId}
              onChange={(e) => setSpendChannelId(e.target.value)}
              className="text-xs bg-background border border-border rounded px-2 py-1"
            >
              {channels.length === 0 ? (
                <option value="">Add a channel first</option>
              ) : (
                channels.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))
              )}
            </select>
          </FieldShell>
          <FieldShell label="Period start">
            <input
              type="date"
              value={spendStart}
              onChange={(e) => setSpendStart(e.target.value)}
              className="text-xs bg-background border border-border rounded px-2 py-1"
            />
          </FieldShell>
          <FieldShell label="Period end">
            <input
              type="date"
              value={spendEnd}
              onChange={(e) => setSpendEnd(e.target.value)}
              className="text-xs bg-background border border-border rounded px-2 py-1"
            />
          </FieldShell>
          <FieldShell label="Amount $">
            <input
              type="number"
              step="0.01"
              value={spendAmount}
              onChange={(e) => setSpendAmount(e.target.value)}
              className="text-xs bg-background border border-border rounded px-2 py-1 w-28"
            />
          </FieldShell>
          <FieldShell label="Source">
            <input
              type="text"
              value={spendSource}
              onChange={(e) => setSpendSource(e.target.value)}
              className="text-xs bg-background border border-border rounded px-2 py-1 w-28"
              placeholder="Manual"
            />
          </FieldShell>
          <button
            onClick={handleAddSpend}
            disabled={busy || !spendChannelId || !spendAmount}
            className="text-xs px-3 py-1.5 rounded-md bg-primary/15 text-foreground border border-primary/40 hover:bg-primary/25 inline-flex items-center gap-1 disabled:opacity-50"
          >
            <Plus className="w-3 h-3" />
            Record
          </button>
        </div>
        {spend.length > 0 && (
          <RecentList
            title="Recent spend"
            rows={spend.slice(0, 6).map((s) => {
              const c = channels.find((ch) => ch.id === s.channel_id);
              return {
                id: s.id,
                left: `${c?.label ?? "—"} · ${s.period_start} → ${s.period_end}`,
                right: money(s.amount_spent),
                source: s.source ?? null,
                onDelete: async () => {
                  await deleteSpend(s.id);
                  await load();
                },
              };
            })}
          />
        )}
      </div>

      {/* Add metric */}
      <div className="rounded-md border border-border bg-muted/10 p-3 space-y-2">
        <h4 className="text-xs uppercase tracking-wider text-muted-foreground">
          Record outcome metrics
        </h4>
        <div className="flex flex-wrap items-end gap-2">
          <FieldShell label="Channel">
            <select
              value={metricChannelId}
              onChange={(e) => setMetricChannelId(e.target.value)}
              className="text-xs bg-background border border-border rounded px-2 py-1"
            >
              {channels.length === 0 ? (
                <option value="">Add a channel first</option>
              ) : (
                channels.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))
              )}
            </select>
          </FieldShell>
          <FieldShell label="Period start">
            <input
              type="date"
              value={metricStart}
              onChange={(e) => setMetricStart(e.target.value)}
              className="text-xs bg-background border border-border rounded px-2 py-1"
            />
          </FieldShell>
          <FieldShell label="Period end">
            <input
              type="date"
              value={metricEnd}
              onChange={(e) => setMetricEnd(e.target.value)}
              className="text-xs bg-background border border-border rounded px-2 py-1"
            />
          </FieldShell>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <NumField label="Leads" value={mLeads} onChange={setMLeads} />
          <NumField label="Qualified" value={mQualified} onChange={setMQualified} />
          <NumField label="Booked calls" value={mCalls} onChange={setMCalls} />
          <NumField label="Proposals" value={mProposals} onChange={setMProposals} />
          <NumField label="Won" value={mWon} onChange={setMWon} />
          <NumField label="Lost" value={mLost} onChange={setMLost} />
          <NumField label="Revenue $" value={mRevenue} onChange={setMRevenue} />
          <button
            onClick={handleAddMetric}
            disabled={busy || !metricChannelId}
            className="text-xs px-3 py-1.5 rounded-md bg-primary/15 text-foreground border border-primary/40 hover:bg-primary/25 inline-flex items-center gap-1 disabled:opacity-50"
          >
            <Plus className="w-3 h-3" />
            Record
          </button>
        </div>
        {metrics.length > 0 && (
          <RecentList
            title="Recent metrics"
            rows={metrics.slice(0, 6).map((m) => {
              const c = channels.find((ch) => ch.id === m.channel_id);
              const parts = [
                m.leads && `${m.leads} leads`,
                m.booked_calls && `${m.booked_calls} calls`,
                m.won_deals && `${m.won_deals} won`,
                m.revenue_attributed && money(m.revenue_attributed),
              ].filter(Boolean);
              return {
                id: m.id,
                left: `${c?.label ?? "—"} · ${m.period_start} → ${m.period_end}`,
                right: parts.join(" · ") || "—",
                source: m.source ?? null,
                onDelete: async () => {
                  await deleteMetric(m.id);
                  await load();
                },
              };
            })}
          />
        )}
      </div>
    </section>
  );
}

/* ---------- presentational helpers ---------- */

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-muted/10 px-2.5 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="text-sm text-foreground">{value}</div>
    </div>
  );
}

function FieldShell({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <FieldShell label={label}>
      <input
        type="number"
        step="0.01"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-xs bg-background border border-border rounded px-2 py-1 w-24"
      />
    </FieldShell>
  );
}

function RecentList({
  title,
  rows,
}: {
  title: string;
  rows: Array<{
    id: string;
    left: string;
    right: string;
    source: string | null;
    onDelete: () => Promise<void>;
  }>;
}) {
  return (
    <div className="mt-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
        {title}
      </div>
      <ul className="divide-y divide-border/60 rounded-md border border-border">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center justify-between px-2 py-1.5 text-[11px]">
            <span className="text-foreground truncate">{r.left}</span>
            <span className="flex items-center gap-2 text-muted-foreground">
              <span className="text-foreground">{r.right}</span>
              {r.source && (
                <span className="text-[10px] px-1.5 py-0.5 rounded border border-border">
                  {r.source}
                </span>
              )}
              <button
                onClick={async () => {
                  if (confirm("Delete this entry?")) await r.onDelete();
                }}
                className="text-muted-foreground hover:text-rose-300"
                title="Delete"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
