import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PortalShell } from "@/components/portal/PortalShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  adminListSwotItems, adminCreateSwotItem,
  adminUpdateSwotItem, adminArchiveSwotItem,
  SWOT_CATEGORIES, SWOT_STATUSES, SWOT_PRIORITIES,
  SWOT_LANES, SWOT_PHASES, SWOT_INDUSTRIES,
  SWOT_GEARS, SWOT_SOURCE_TYPES,
  SWOT_CATEGORY_LABEL, SWOT_STATUS_LABEL, SWOT_PRIORITY_LABEL,
  SWOT_LANE_LABEL, SWOT_PHASE_LABEL, SWOT_INDUSTRY_LABEL,
  SWOT_GEAR_LABEL, SWOT_SOURCE_LABEL,
  type AdminSwotItem,
  type SwotCategory, type SwotItemStatus, type SwotPriority,
  type SwotServiceLane, type SwotJourneyPhase, type SwotIndustryBehavior,
  type SwotRelatedGear, type SwotRelatedSourceType,
} from "@/lib/swotAnalysis";

export default function SwotAnalysisAdmin() {
  const { customerId = "" } = useParams();
  const [items, setItems] = useState<AdminSwotItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    if (!customerId) return;
    setLoading(true);
    try {
      const r = await adminListSwotItems(customerId);
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
    const r = await adminCreateSwotItem(customerId, { title: newTitle.trim() });
    setNewTitle(""); setActiveId(r.id);
    await reload();
    toast.success("SWOT item created");
  };

  const patch = async (p: Partial<AdminSwotItem>) => {
    if (!active) return;
    setItems(items.map(i => i.id === active.id ? { ...i, ...p } : i));
    try { await adminUpdateSwotItem(active.id, p); }
    catch (e: any) { toast.error(e.message); }
  };

  const archive = async () => {
    if (!active) return;
    if (!confirm("Archive this SWOT item? It will be hidden from the client.")) return;
    await adminArchiveSwotItem(active.id);
    setActiveId(null);
    await reload();
  };

  return (
    <PortalShell variant="admin">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl text-foreground font-serif">SWOT Analysis Tool (Admin)</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
            Create and manage admin-curated SWOT items for this client. SWOT organizes
            evidence; it does not replace the owner's judgment or the agreed RGS service
            scope. Internal notes stay admin-only and are never shown to the client. The
            client surface is presented as the RGS Stability Snapshot view to keep
            language consistent with the diagnostic report.
          </p>
          <p className="mt-2 text-xs">
            <Link
              to={`/admin/customers/${customerId}/swot-strategic-matrix`}
              className="text-primary hover:underline"
            >
              Open the deeper SWOT Strategic Matrix →
            </Link>{" "}
            <span className="text-muted-foreground">
              (gear-mapped, signal-generating, approval-gated)
            </span>
          </p>
        </header>

        <section className="bg-card border border-border rounded-xl p-5 space-y-3">
          <div className="flex flex-wrap gap-2 items-center">
            <Input
              placeholder="New SWOT item title"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              className="flex-1 min-w-[260px]"
            />
            <Button onClick={create}>Create</Button>
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No SWOT items yet.</p>
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
                    <Badge variant="outline">{SWOT_CATEGORY_LABEL[i.swot_category]}</Badge>
                    <Badge variant="outline">{SWOT_STATUS_LABEL[i.status]}</Badge>
                    {i.archived_at && <Badge variant="outline">Archived</Badge>}
                    {i.client_visible && <Badge variant="secondary">Client-visible</Badge>}
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
              <Button variant="outline" size="sm" onClick={archive}>Archive</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Title">
                <Input value={active.title} onChange={e => patch({ title: e.target.value })} />
              </Field>
              <Field label="SWOT category">
                <Select value={active.swot_category} options={SWOT_CATEGORIES} labelMap={SWOT_CATEGORY_LABEL}
                  onChange={v => patch({ swot_category: v as SwotCategory })} />
              </Field>
              <Field label="Status">
                <Select value={active.status} options={SWOT_STATUSES} labelMap={SWOT_STATUS_LABEL}
                  onChange={v => patch({ status: v as SwotItemStatus })} />
              </Field>
              <Field label="Priority">
                <Select value={active.priority} options={SWOT_PRIORITIES} labelMap={SWOT_PRIORITY_LABEL}
                  onChange={v => patch({ priority: v as SwotPriority })} />
              </Field>
              <Field label="Service lane">
                <Select value={active.service_lane} options={SWOT_LANES} labelMap={SWOT_LANE_LABEL}
                  onChange={v => patch({ service_lane: v as SwotServiceLane })} />
              </Field>
              <Field label="Customer journey phase">
                <Select value={active.customer_journey_phase} options={SWOT_PHASES} labelMap={SWOT_PHASE_LABEL}
                  onChange={v => patch({ customer_journey_phase: v as SwotJourneyPhase })} />
              </Field>
              <Field label="Industry behavior">
                <Select value={active.industry_behavior} options={SWOT_INDUSTRIES} labelMap={SWOT_INDUSTRY_LABEL}
                  onChange={v => patch({ industry_behavior: v as SwotIndustryBehavior })} />
              </Field>
              <Field label="Related gear (optional)">
                <select
                  className="w-full bg-background border border-border rounded-md px-2 py-2 text-sm"
                  value={active.related_gear ?? ""}
                  onChange={e => patch({ related_gear: (e.target.value || null) as SwotRelatedGear | null })}
                >
                  <option value="">— none —</option>
                  {SWOT_GEARS.map(g => <option key={g} value={g}>{SWOT_GEAR_LABEL[g]}</option>)}
                </select>
              </Field>
              <Field label="Related source type (optional)">
                <select
                  className="w-full bg-background border border-border rounded-md px-2 py-2 text-sm"
                  value={active.related_source_type ?? ""}
                  onChange={e => patch({ related_source_type: (e.target.value || null) as SwotRelatedSourceType | null })}
                >
                  <option value="">— none —</option>
                  {SWOT_SOURCE_TYPES.map(s => <option key={s} value={s}>{SWOT_SOURCE_LABEL[s]}</option>)}
                </select>
              </Field>
              <Field label="Related tool key (optional)">
                <Input value={active.related_tool_key ?? ""}
                  onChange={e => patch({ related_tool_key: e.target.value || null })}
                  placeholder="e.g. revenue_risk_monitor" />
              </Field>
              <Field label="Display order">
                <Input type="number" value={active.display_order}
                  onChange={e => patch({ display_order: Number(e.target.value) || 100 })} />
              </Field>
            </div>

            <Field label="Client-visible summary">
              <Textarea rows={2} value={active.client_visible_summary ?? ""}
                onChange={e => patch({ client_visible_summary: e.target.value })} />
            </Field>
            <Field label="Client-visible body">
              <Textarea rows={5} value={active.client_visible_body ?? ""}
                onChange={e => patch({ client_visible_body: e.target.value })} />
            </Field>
            <Field label="Evidence note (optional, client-visible if item is shared)">
              <Textarea rows={3} value={active.evidence_note ?? ""}
                onChange={e => patch({ evidence_note: e.target.value })} />
            </Field>
            <Field label="Suggested next step (optional, client-visible if item is shared)">
              <Textarea rows={3} value={active.recommended_next_step ?? ""}
                onChange={e => patch({ recommended_next_step: e.target.value })} />
            </Field>
            <Field label="Internal notes (admin-only — never shown to the client)">
              <Textarea rows={3} value={active.internal_notes ?? ""}
                onChange={e => patch({ internal_notes: e.target.value })} />
            </Field>
            <Field label="Admin notes (admin-only — never shown to the client)">
              <Textarea rows={3} value={active.admin_notes ?? ""}
                onChange={e => patch({ admin_notes: e.target.value })} />
            </Field>

            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={active.client_visible}
                  onChange={e => patch({ client_visible: e.target.checked })}
                />
                Client-visible (also requires non-draft / non-archived status)
              </label>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={active.pinned}
                  onChange={e => patch({ pinned: e.target.checked })}
                />
                Pinned
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

function Select<T extends string>({
  value, options, labelMap, onChange,
}: {
  value: T;
  options: T[];
  labelMap: Record<T, string>;
  onChange: (v: T) => void;
}) {
  return (
    <select
      className="w-full bg-background border border-border rounded-md px-2 py-2 text-sm"
      value={value}
      onChange={e => onChange(e.target.value as T)}
    >
      {options.map(o => <option key={o} value={o}>{labelMap[o]}</option>)}
    </select>
  );
}
