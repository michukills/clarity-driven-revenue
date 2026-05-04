import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { PortalShell } from "@/components/portal/PortalShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  adminListScorecardHistoryEntries, adminCreateScorecardHistoryEntry,
  adminUpdateScorecardHistoryEntry, adminArchiveScorecardHistoryEntry,
  SHTE_SOURCE_TYPES, SHTE_STABILITY_BANDS, SHTE_TREND_DIRECTIONS,
  SHTE_SOURCE_LABEL, SHTE_BAND_LABEL, SHTE_TREND_LABEL,
  type AdminScorecardHistoryEntry, type ShteSourceType,
  type ShteStabilityBand, type ShteTrendDirection,
} from "@/lib/scorecardHistory";

function numOrNull(v: string): number | null {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export default function ScorecardHistoryAdmin() {
  const { customerId = "" } = useParams();
  const [items, setItems] = useState<AdminScorecardHistoryEntry[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    if (!customerId) return;
    setLoading(true);
    try {
      const r = await adminListScorecardHistoryEntries(customerId);
      setItems(r);
      if (!activeId && r[0]) setActiveId(r[0].id);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [customerId]);

  const active = useMemo(
    () => items.find(i => i.id === activeId) ?? null,
    [items, activeId],
  );

  const create = async () => {
    if (!newTitle.trim()) return;
    const r = await adminCreateScorecardHistoryEntry(customerId, {
      title: newTitle.trim(),
      scored_at: new Date().toISOString(),
    });
    setNewTitle(""); setActiveId(r.id);
    await reload();
    toast.success("Score snapshot created");
  };

  const patch = async (p: Partial<AdminScorecardHistoryEntry>) => {
    if (!active) return;
    setItems(items.map(i => i.id === active.id ? { ...i, ...p } : i));
    try { await adminUpdateScorecardHistoryEntry(active.id, p); }
    catch (e: any) { toast.error(e.message); }
  };

  const archive = async () => {
    if (!active) return;
    if (!confirm("Archive this score snapshot? It will be hidden from clients.")) return;
    await adminArchiveScorecardHistoryEntry(active.id);
    setActiveId(null);
    await reload();
  };

  const markReviewed = async () => {
    if (!active) return;
    await patch({ admin_review_required: false });
    toast.success("Marked as reviewed");
  };

  return (
    <PortalShell variant="admin">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl text-foreground font-serif">Scorecard History / Stability Trend Tracker (Admin)</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
            Use this tracker to keep score history visible over time. It stores reviewed
            score snapshots and trend context. It is not a guarantee, forecast, valuation,
            accounting / legal / tax / compliance / payroll / HR review, or promise that
            the business will improve. Internal notes never leave this view.
          </p>
        </header>

        <section className="bg-card border border-border rounded-xl p-5 space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="New score snapshot title (e.g. Q1 2026 monthly review)"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
            />
            <Button onClick={create}>Create snapshot</Button>
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No score snapshots yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {items.map(i => (
                <li key={i.id}>
                  <button
                    type="button"
                    onClick={() => setActiveId(i.id)}
                    className={`w-full text-left py-2 px-1 flex items-center gap-2 ${activeId === i.id ? "text-foreground" : "text-muted-foreground"}`}
                  >
                    <span className="flex-1 truncate">{i.title}</span>
                    {i.archived_at && <Badge variant="outline">Archived</Badge>}
                    {i.client_visible && <Badge variant="secondary">Client-visible</Badge>}
                    {i.total_score !== null && <Badge variant="outline">Score {i.total_score}</Badge>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {active && (
          <section className="bg-card border border-border rounded-xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg text-foreground font-serif">{active.title}</h2>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={markReviewed}>Mark reviewed</Button>
                <Button variant="outline" size="sm" onClick={archive}>Archive</Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Title">
                <Input value={active.title} onChange={e => patch({ title: e.target.value })} />
              </Field>
              <Field label="Source type">
                <select
                  className="w-full bg-background border border-border rounded-md px-2 py-2 text-sm"
                  value={active.source_type}
                  onChange={e => patch({ source_type: e.target.value as ShteSourceType })}
                >
                  {SHTE_SOURCE_TYPES.map(s => <option key={s} value={s}>{SHTE_SOURCE_LABEL[s]}</option>)}
                </select>
              </Field>
              <Field label="Source label">
                <Input value={active.source_label ?? ""} onChange={e => patch({ source_label: e.target.value })} />
              </Field>
              <Field label="Stability band">
                <select
                  className="w-full bg-background border border-border rounded-md px-2 py-2 text-sm"
                  value={active.stability_band ?? "unknown"}
                  onChange={e => patch({ stability_band: e.target.value as ShteStabilityBand })}
                >
                  {SHTE_STABILITY_BANDS.map(b => <option key={b} value={b}>{SHTE_BAND_LABEL[b]}</option>)}
                </select>
              </Field>
              <Field label="Total score (0–1000)">
                <Input type="number" min={0} max={1000} value={active.total_score ?? ""} onChange={e => patch({ total_score: numOrNull(e.target.value) })} />
              </Field>
              <Field label="Prior total score">
                <Input type="number" min={0} max={1000} value={active.prior_total_score ?? ""} onChange={e => patch({ prior_total_score: numOrNull(e.target.value) })} />
              </Field>
              <Field label="Score change">
                <Input type="number" value={active.score_change ?? ""} onChange={e => patch({ score_change: numOrNull(e.target.value) })} />
              </Field>
              <Field label="Trend direction">
                <select
                  className="w-full bg-background border border-border rounded-md px-2 py-2 text-sm"
                  value={active.trend_direction ?? "unknown"}
                  onChange={e => patch({ trend_direction: e.target.value as ShteTrendDirection })}
                >
                  {SHTE_TREND_DIRECTIONS.map(t => <option key={t} value={t}>{SHTE_TREND_LABEL[t]}</option>)}
                </select>
              </Field>
              <Field label="Demand generation (0–200)">
                <Input type="number" min={0} max={200} value={active.demand_generation_score ?? ""} onChange={e => patch({ demand_generation_score: numOrNull(e.target.value) })} />
              </Field>
              <Field label="Revenue conversion (0–200)">
                <Input type="number" min={0} max={200} value={active.revenue_conversion_score ?? ""} onChange={e => patch({ revenue_conversion_score: numOrNull(e.target.value) })} />
              </Field>
              <Field label="Operational efficiency (0–200)">
                <Input type="number" min={0} max={200} value={active.operational_efficiency_score ?? ""} onChange={e => patch({ operational_efficiency_score: numOrNull(e.target.value) })} />
              </Field>
              <Field label="Financial visibility (0–200)">
                <Input type="number" min={0} max={200} value={active.financial_visibility_score ?? ""} onChange={e => patch({ financial_visibility_score: numOrNull(e.target.value) })} />
              </Field>
              <Field label="Owner independence (0–200)">
                <Input type="number" min={0} max={200} value={active.owner_independence_score ?? ""} onChange={e => patch({ owner_independence_score: numOrNull(e.target.value) })} />
              </Field>
              <Field label="Scored at">
                <Input
                  type="datetime-local"
                  value={active.scored_at ? active.scored_at.slice(0, 16) : ""}
                  onChange={e => patch({ scored_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
                />
              </Field>
              <Field label="Next review date">
                <Input
                  type="date"
                  value={active.next_review_date ?? ""}
                  onChange={e => patch({ next_review_date: e.target.value || null })}
                />
              </Field>
            </div>

            <Field label="Client-visible summary (shown to client)">
              <Textarea rows={3} value={active.client_visible_summary ?? ""} onChange={e => patch({ client_visible_summary: e.target.value })} />
            </Field>
            <Field label="Admin summary (admin-only)">
              <Textarea rows={3} value={active.admin_summary ?? ""} onChange={e => patch({ admin_summary: e.target.value })} />
            </Field>
            <Field label="Internal notes (never shown to client)">
              <Textarea rows={3} value={active.internal_notes ?? ""} onChange={e => patch({ internal_notes: e.target.value })} />
            </Field>

            <div className="flex items-center gap-2">
              <input
                id="client_visible"
                type="checkbox"
                checked={active.client_visible}
                onChange={e => patch({ client_visible: e.target.checked })}
              />
              <label htmlFor="client_visible" className="text-sm text-foreground">
                Client-visible (show this snapshot in the client portal)
              </label>
            </div>
          </section>
        )}
      </div>
    </PortalShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}