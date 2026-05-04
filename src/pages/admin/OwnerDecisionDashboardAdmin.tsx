import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { PortalShell } from "@/components/portal/PortalShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  adminListOwnerDecisionItems, adminCreateOwnerDecisionItem,
  adminUpdateOwnerDecisionItem, adminArchiveOwnerDecisionItem,
  ODD_DECISION_TYPES, ODD_GEARS, ODD_PRIORITY_LEVELS, ODD_STATUSES, ODD_SOURCE_TYPES,
  ODD_DECISION_TYPE_LABEL, ODD_GEAR_LABEL, ODD_PRIORITY_LABEL,
  ODD_STATUS_LABEL, ODD_SOURCE_LABEL,
  type AdminOwnerDecisionItem, type OddDecisionType, type OddGear,
  type OddPriorityLevel, type OddStatus, type OddSourceType,
} from "@/lib/ownerDecisionDashboard";

export default function OwnerDecisionDashboardAdmin() {
  const { customerId = "" } = useParams();
  const [items, setItems] = useState<AdminOwnerDecisionItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    if (!customerId) return;
    setLoading(true);
    try {
      const r = await adminListOwnerDecisionItems(customerId);
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
    const r = await adminCreateOwnerDecisionItem(customerId, { title: newTitle.trim() });
    setNewTitle(""); setActiveId(r.id);
    await reload();
    toast.success("Decision prompt created");
  };

  const patch = async (p: Partial<AdminOwnerDecisionItem>) => {
    if (!active) return;
    setItems(items.map(i => i.id === active.id ? { ...i, ...p } : i));
    try { await adminUpdateOwnerDecisionItem(active.id, p); }
    catch (e: any) { toast.error(e.message); }
  };

  const archive = async () => {
    if (!active) return;
    if (!confirm("Archive this decision prompt? It will be hidden from clients.")) return;
    await adminArchiveOwnerDecisionItem(active.id);
    setActiveId(null);
    await reload();
  };

  const markReviewed = async () => {
    if (!active) return;
    await patch({
      reviewed_by_admin_at: new Date().toISOString(),
      admin_review_required: false,
    });
    toast.success("Marked as reviewed");
  };

  return (
    <PortalShell variant="admin">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl text-foreground font-serif">Owner Decision Dashboard (Admin)</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
            Use this dashboard to keep owner-level decisions visible. This is a
            review and decision-support tool, not a project tracker, accounting /
            legal / tax / compliance / payroll / HR review, or replacement for
            owner decision-making. The client view also pulls in client-visible
            Priority Action Tracker and Revenue & Risk Monitor items.
            Internal notes never leave this view.
          </p>
        </header>

        <section className="bg-card border border-border rounded-xl p-5 space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="New decision prompt title"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
            />
            <Button onClick={create}>Create</Button>
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No decision prompts yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {items.map(i => (
                <button
                  key={i.id}
                  onClick={() => setActiveId(i.id)}
                  className={`text-xs px-3 py-1.5 rounded-md border ${activeId === i.id ? "border-primary text-foreground" : "border-border text-muted-foreground"}`}
                >
                  {i.title}
                  <span className="opacity-60"> · {ODD_PRIORITY_LABEL[i.priority_level]}</span>
                  {i.client_visible ? <span className="ml-1 text-primary">·visible</span> : null}
                </button>
              ))}
            </div>
          )}
        </section>

        {active ? (
          <section className="bg-card border border-border rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{ODD_STATUS_LABEL[active.status]}</Badge>
                <Badge variant="secondary">{ODD_PRIORITY_LABEL[active.priority_level]}</Badge>
                <Badge variant="outline">{ODD_GEAR_LABEL[active.gear]}</Badge>
                {active.client_visible
                  ? <Badge>Client-visible</Badge>
                  : <Badge variant="outline">Admin-only</Badge>}
                {active.admin_review_required
                  ? <Badge variant="destructive">Needs admin review</Badge> : null}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={markReviewed}>Mark reviewed</Button>
                <Button variant="outline" size="sm"
                  onClick={() => patch({ client_visible: !active.client_visible })}>
                  {active.client_visible ? "Hide from client" : "Make client-visible"}
                </Button>
                <Button variant="outline" size="sm" onClick={archive}>Archive</Button>
              </div>
            </div>

            <Input defaultValue={active.title}
              onBlur={e => patch({ title: e.target.value })} placeholder="Title" />
            <Textarea defaultValue={active.description ?? ""}
              onBlur={e => patch({ description: e.target.value })}
              placeholder="Description (admin-side detail)" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Decision type">
                <select value={active.decision_type}
                  onChange={e => patch({ decision_type: e.target.value as OddDecisionType })}
                  className="bg-background border border-border rounded-md px-2 text-sm h-9 w-full">
                  {ODD_DECISION_TYPES.map(c => (
                    <option key={c} value={c}>{ODD_DECISION_TYPE_LABEL[c]}</option>
                  ))}
                </select>
              </Field>
              <Field label="Gear affected">
                <select value={active.gear}
                  onChange={e => patch({ gear: e.target.value as OddGear })}
                  className="bg-background border border-border rounded-md px-2 text-sm h-9 w-full">
                  {ODD_GEARS.map(g => (
                    <option key={g} value={g}>{ODD_GEAR_LABEL[g]}</option>
                  ))}
                </select>
              </Field>
              <Field label="Priority">
                <select value={active.priority_level}
                  onChange={e => patch({ priority_level: e.target.value as OddPriorityLevel })}
                  className="bg-background border border-border rounded-md px-2 text-sm h-9 w-full">
                  {ODD_PRIORITY_LEVELS.map(p => (
                    <option key={p} value={p}>{ODD_PRIORITY_LABEL[p]}</option>
                  ))}
                </select>
              </Field>
              <Field label="Status">
                <select value={active.status}
                  onChange={e => patch({ status: e.target.value as OddStatus })}
                  className="bg-background border border-border rounded-md px-2 text-sm h-9 w-full">
                  {ODD_STATUSES.map(s => (
                    <option key={s} value={s}>{ODD_STATUS_LABEL[s]}</option>
                  ))}
                </select>
              </Field>
              <Field label="Source type">
                <select value={active.source_type}
                  onChange={e => patch({ source_type: e.target.value as OddSourceType })}
                  className="bg-background border border-border rounded-md px-2 text-sm h-9 w-full">
                  {ODD_SOURCE_TYPES.map(s => (
                    <option key={s} value={s}>{ODD_SOURCE_LABEL[s]}</option>
                  ))}
                </select>
              </Field>
              <Field label="Source label">
                <Input defaultValue={active.source_label ?? ""}
                  onBlur={e => patch({ source_label: e.target.value })}
                  placeholder="e.g. October monthly review" />
              </Field>
              <Field label="Decision needed by">
                <Input type="date" defaultValue={active.decision_needed_by ?? ""}
                  onBlur={e => patch({ decision_needed_by: e.target.value || null })} />
              </Field>
              <Field label="Next review date">
                <Input type="date" defaultValue={active.next_review_date ?? ""}
                  onBlur={e => patch({ next_review_date: e.target.value || null })} />
              </Field>
            </div>

            <Textarea defaultValue={active.decision_question ?? ""}
              onBlur={e => patch({ decision_question: e.target.value })}
              placeholder="Decision question (the owner-level question to answer)" />
            <Textarea defaultValue={active.context_summary ?? ""}
              onBlur={e => patch({ context_summary: e.target.value })}
              placeholder="Context summary (background to support the decision)" />
            <Textarea defaultValue={active.recommended_owner_review ?? ""}
              onBlur={e => patch({ recommended_owner_review: e.target.value })}
              placeholder="Recommended owner review (what to look at before deciding)" />
            <Textarea defaultValue={active.client_notes ?? ""}
              onBlur={e => patch({ client_notes: e.target.value })}
              placeholder="Client-facing notes (only shown when client-visible)" />
            <Textarea defaultValue={active.internal_notes ?? ""}
              onBlur={e => patch({ internal_notes: e.target.value })}
              placeholder="Internal admin notes (never shown to client)" />
          </section>
        ) : null}
      </div>
    </PortalShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}