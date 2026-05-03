import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { PortalShell } from "@/components/portal/PortalShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  adminListPriorityActionItems, adminCreatePriorityActionItem,
  adminUpdatePriorityActionItem, adminArchivePriorityActionItem,
  PAT_CATEGORIES, PAT_GEARS, PAT_PRIORITY_LEVELS, PAT_STATUSES,
  PAT_OWNER_ROLES, PAT_SOURCE_TYPES,
  PAT_CATEGORY_LABEL, PAT_GEAR_LABEL, PAT_PRIORITY_LABEL,
  PAT_STATUS_LABEL, PAT_OWNER_ROLE_LABEL, PAT_SOURCE_LABEL,
  type AdminPriorityActionItem, type PatActionCategory, type PatGear,
  type PatPriorityLevel, type PatStatus, type PatOwnerRole, type PatSourceType,
} from "@/lib/priorityActionTracker";

export default function PriorityActionTrackerAdmin() {
  const { customerId = "" } = useParams();
  const [items, setItems] = useState<AdminPriorityActionItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    if (!customerId) return;
    setLoading(true);
    try {
      const r = await adminListPriorityActionItems(customerId);
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
    const r = await adminCreatePriorityActionItem(customerId, { title: newTitle.trim() });
    setNewTitle(""); setActiveId(r.id);
    await reload();
    toast.success("Priority action created");
  };

  const patch = async (p: Partial<AdminPriorityActionItem>) => {
    if (!active) return;
    setItems(items.map(i => i.id === active.id ? { ...i, ...p } : i));
    try { await adminUpdatePriorityActionItem(active.id, p); }
    catch (e: any) { toast.error(e.message); }
  };

  const archive = async () => {
    if (!active) return;
    if (!confirm("Archive this priority action? It will be hidden from clients.")) return;
    await adminArchivePriorityActionItem(active.id);
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

  const markCompleted = async () => {
    if (!active) return;
    await patch({ status: "completed", completed_at: new Date().toISOString() });
    toast.success("Marked completed");
  };

  return (
    <PortalShell variant="admin">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl text-foreground font-serif">Priority Action Tracker (Admin)</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
            Use this tracker to turn reviewed signals into visible priorities.
            This is a review and accountability tool — not a project-management
            suite, accounting / legal / compliance review, or replacement for
            owner decision-making. Internal notes never leave this view.
          </p>
        </header>

        <section className="bg-card border border-border rounded-xl p-5 space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="New priority action title"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
            />
            <Button onClick={create}>Create</Button>
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No priority actions yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {items.map(i => (
                <button
                  key={i.id}
                  onClick={() => setActiveId(i.id)}
                  className={`text-xs px-3 py-1.5 rounded-md border ${activeId === i.id ? "border-primary text-foreground" : "border-border text-muted-foreground"}`}
                >
                  {i.title}
                  <span className="opacity-60"> · {PAT_PRIORITY_LABEL[i.priority_level]}</span>
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
                <Badge variant="outline">{PAT_STATUS_LABEL[active.status]}</Badge>
                <Badge variant="secondary">{PAT_PRIORITY_LABEL[active.priority_level]}</Badge>
                <Badge variant="outline">{PAT_GEAR_LABEL[active.gear]}</Badge>
                {active.client_visible
                  ? <Badge>Client-visible</Badge>
                  : <Badge variant="outline">Admin-only</Badge>}
                {active.admin_review_required
                  ? <Badge variant="destructive">Needs admin review</Badge> : null}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={markReviewed}>Mark reviewed</Button>
                <Button variant="outline" size="sm" onClick={markCompleted}>Mark completed</Button>
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
              <Field label="Action category">
                <select value={active.action_category}
                  onChange={e => patch({ action_category: e.target.value as PatActionCategory })}
                  className="bg-background border border-border rounded-md px-2 text-sm h-9 w-full">
                  {PAT_CATEGORIES.map(c => (
                    <option key={c} value={c}>{PAT_CATEGORY_LABEL[c]}</option>
                  ))}
                </select>
              </Field>
              <Field label="Gear affected">
                <select value={active.gear}
                  onChange={e => patch({ gear: e.target.value as PatGear })}
                  className="bg-background border border-border rounded-md px-2 text-sm h-9 w-full">
                  {PAT_GEARS.map(g => (
                    <option key={g} value={g}>{PAT_GEAR_LABEL[g]}</option>
                  ))}
                </select>
              </Field>
              <Field label="Priority">
                <select value={active.priority_level}
                  onChange={e => patch({ priority_level: e.target.value as PatPriorityLevel })}
                  className="bg-background border border-border rounded-md px-2 text-sm h-9 w-full">
                  {PAT_PRIORITY_LEVELS.map(p => (
                    <option key={p} value={p}>{PAT_PRIORITY_LABEL[p]}</option>
                  ))}
                </select>
              </Field>
              <Field label="Status">
                <select value={active.status}
                  onChange={e => patch({ status: e.target.value as PatStatus })}
                  className="bg-background border border-border rounded-md px-2 text-sm h-9 w-full">
                  {PAT_STATUSES.map(s => (
                    <option key={s} value={s}>{PAT_STATUS_LABEL[s]}</option>
                  ))}
                </select>
              </Field>
              <Field label="Owner role">
                <select value={active.owner_role}
                  onChange={e => patch({ owner_role: e.target.value as PatOwnerRole })}
                  className="bg-background border border-border rounded-md px-2 text-sm h-9 w-full">
                  {PAT_OWNER_ROLES.map(o => (
                    <option key={o} value={o}>{PAT_OWNER_ROLE_LABEL[o]}</option>
                  ))}
                </select>
              </Field>
              <Field label="Assigned to (label)">
                <Input defaultValue={active.assigned_to_label ?? ""}
                  onBlur={e => patch({ assigned_to_label: e.target.value })}
                  placeholder="e.g. Owner, Office manager" />
              </Field>
              <Field label="Source type">
                <select value={active.source_type}
                  onChange={e => patch({ source_type: e.target.value as PatSourceType })}
                  className="bg-background border border-border rounded-md px-2 text-sm h-9 w-full">
                  {PAT_SOURCE_TYPES.map(s => (
                    <option key={s} value={s}>{PAT_SOURCE_LABEL[s]}</option>
                  ))}
                </select>
              </Field>
              <Field label="Source label">
                <Input defaultValue={active.source_label ?? ""}
                  onBlur={e => patch({ source_label: e.target.value })}
                  placeholder="e.g. October Revenue & Risk Monitor item" />
              </Field>
              <Field label="Due date">
                <Input type="date" defaultValue={active.due_date ?? ""}
                  onBlur={e => patch({ due_date: e.target.value || null })} />
              </Field>
              <Field label="Next review date">
                <Input type="date" defaultValue={active.next_review_date ?? ""}
                  onBlur={e => patch({ next_review_date: e.target.value || null })} />
              </Field>
            </div>

            <Textarea defaultValue={active.why_it_matters ?? ""}
              onBlur={e => patch({ why_it_matters: e.target.value })}
              placeholder="Why it matters (plain language)" />
            <Textarea defaultValue={active.recommended_next_step ?? ""}
              onBlur={e => patch({ recommended_next_step: e.target.value })}
              placeholder="Recommended next step" />
            <Textarea defaultValue={active.success_signal ?? ""}
              onBlur={e => patch({ success_signal: e.target.value })}
              placeholder="Success signal (how we'll know it's done)" />
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