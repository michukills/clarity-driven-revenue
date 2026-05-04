import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { PortalShell } from "@/components/portal/PortalShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  adminListAdvisoryEntries, adminCreateAdvisoryEntry,
  adminUpdateAdvisoryEntry, adminArchiveAdvisoryEntry,
  ADVISORY_STATUSES, ADVISORY_TYPES, ADVISORY_PRIORITIES,
  ADVISORY_LANES, ADVISORY_PHASES, ADVISORY_INDUSTRIES,
  ADVISORY_GEARS, ADVISORY_SOURCE_TYPES,
  ADVISORY_STATUS_LABEL, ADVISORY_TYPE_LABEL, ADVISORY_PRIORITY_LABEL,
  ADVISORY_LANE_LABEL, ADVISORY_PHASE_LABEL, ADVISORY_INDUSTRY_LABEL,
  ADVISORY_GEAR_LABEL, ADVISORY_SOURCE_LABEL,
  type AdminAdvisoryEntry,
  type AdvisoryNoteStatus, type AdvisoryNoteType, type AdvisoryNotePriority,
  type AdvisoryServiceLane, type AdvisoryJourneyPhase, type AdvisoryIndustryBehavior,
  type AdvisoryRelatedGear, type AdvisoryRelatedSourceType,
} from "@/lib/advisoryNotes";

export default function AdvisoryNotesAdmin() {
  const { customerId = "" } = useParams();
  const [items, setItems] = useState<AdminAdvisoryEntry[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    if (!customerId) return;
    setLoading(true);
    try {
      const r = await adminListAdvisoryEntries(customerId);
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
    const r = await adminCreateAdvisoryEntry(customerId, { title: newTitle.trim() });
    setNewTitle(""); setActiveId(r.id);
    await reload();
    toast.success("Note created");
  };

  const patch = async (p: Partial<AdminAdvisoryEntry>) => {
    if (!active) return;
    setItems(items.map(i => i.id === active.id ? { ...i, ...p } : i));
    try { await adminUpdateAdvisoryEntry(active.id, p); }
    catch (e: any) { toast.error(e.message); }
  };

  const archive = async () => {
    if (!active) return;
    if (!confirm("Archive this note? It will be hidden from the client.")) return;
    await adminArchiveAdvisoryEntry(active.id);
    setActiveId(null);
    await reload();
  };

  return (
    <PortalShell variant="admin">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl text-foreground font-serif">Advisory Notes / Clarification Log (Admin)</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
            Create and manage bounded advisory notes, clarification requests, and client-visible
            review comments. This is not open-ended chat. Publishing a note does not bypass
            lane, payment, invite, tenant, or client visibility rules. Internal notes stay
            admin-only. Legal, accounting, tax, compliance, payroll, and HR matters should
            be handled by qualified professionals where required.
          </p>
        </header>

        <section className="bg-card border border-border rounded-xl p-5 space-y-3">
          <div className="flex flex-wrap gap-2 items-center">
            <Input
              placeholder="New note title"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              className="flex-1 min-w-[260px]"
            />
            <Button onClick={create}>Create</Button>
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No notes yet.</p>
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
                    <Badge variant="outline">{ADVISORY_TYPE_LABEL[i.note_type]}</Badge>
                    <Badge variant="outline">{ADVISORY_STATUS_LABEL[i.status]}</Badge>
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
              <Field label="Note type">
                <Select value={active.note_type} options={ADVISORY_TYPES} labelMap={ADVISORY_TYPE_LABEL}
                  onChange={v => patch({ note_type: v as AdvisoryNoteType })} />
              </Field>
              <Field label="Status">
                <Select value={active.status} options={ADVISORY_STATUSES} labelMap={ADVISORY_STATUS_LABEL}
                  onChange={v => patch({ status: v as AdvisoryNoteStatus })} />
              </Field>
              <Field label="Priority">
                <Select value={active.priority} options={ADVISORY_PRIORITIES} labelMap={ADVISORY_PRIORITY_LABEL}
                  onChange={v => patch({ priority: v as AdvisoryNotePriority })} />
              </Field>
              <Field label="Service lane">
                <Select value={active.service_lane} options={ADVISORY_LANES} labelMap={ADVISORY_LANE_LABEL}
                  onChange={v => patch({ service_lane: v as AdvisoryServiceLane })} />
              </Field>
              <Field label="Customer journey phase">
                <Select value={active.customer_journey_phase} options={ADVISORY_PHASES} labelMap={ADVISORY_PHASE_LABEL}
                  onChange={v => patch({ customer_journey_phase: v as AdvisoryJourneyPhase })} />
              </Field>
              <Field label="Industry behavior">
                <Select value={active.industry_behavior} options={ADVISORY_INDUSTRIES} labelMap={ADVISORY_INDUSTRY_LABEL}
                  onChange={v => patch({ industry_behavior: v as AdvisoryIndustryBehavior })} />
              </Field>
              <Field label="Related gear (optional)">
                <select
                  className="w-full bg-background border border-border rounded-md px-2 py-2 text-sm"
                  value={active.related_gear ?? ""}
                  onChange={e => patch({ related_gear: (e.target.value || null) as AdvisoryRelatedGear | null })}
                >
                  <option value="">— none —</option>
                  {ADVISORY_GEARS.map(g => <option key={g} value={g}>{ADVISORY_GEAR_LABEL[g]}</option>)}
                </select>
              </Field>
              <Field label="Related source type (optional)">
                <select
                  className="w-full bg-background border border-border rounded-md px-2 py-2 text-sm"
                  value={active.related_source_type ?? ""}
                  onChange={e => patch({ related_source_type: (e.target.value || null) as AdvisoryRelatedSourceType | null })}
                >
                  <option value="">— none —</option>
                  {ADVISORY_SOURCE_TYPES.map(s => <option key={s} value={s}>{ADVISORY_SOURCE_LABEL[s]}</option>)}
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
              <Field label="Due date (optional)">
                <Input type="date" value={active.due_date ?? ""}
                  onChange={e => patch({ due_date: e.target.value || null })} />
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
            <Field label="Clarification question (optional, client-visible)">
              <Textarea rows={3} value={active.client_question ?? ""}
                onChange={e => patch({ client_question: e.target.value })} />
            </Field>
            <Field label="Client response (optional, client-visible)">
              <Textarea rows={3} value={active.client_response ?? ""}
                onChange={e => patch({ client_response: e.target.value })} />
            </Field>
            <Field label="Internal notes (admin-only — never shown to client)">
              <Textarea rows={3} value={active.internal_notes ?? ""}
                onChange={e => patch({ internal_notes: e.target.value })} />
            </Field>
            <Field label="Admin notes (admin-only — never shown to client)">
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
