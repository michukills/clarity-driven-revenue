import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { PortalShell } from "@/components/portal/PortalShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  adminListSopEntries, adminCreateSopEntry, adminUpdateSopEntry, adminArchiveSopEntry,
  type AdminSopEntry, type SopStep, SOP_STATUS_LABELS, type SopStatus,
} from "@/lib/sopTrainingBible";

const STATUSES: SopStatus[] = ["draft","ready_for_review","client_visible","active","needs_update","archived"];

function StepEditor({ entry, onChange }: { entry: AdminSopEntry; onChange: (steps: SopStep[]) => void }) {
  const steps = entry.steps ?? [];
  const update = (idx: number, patch: Partial<SopStep>) => {
    const next = steps.map((s, i) => i === idx ? { ...s, ...patch } : s);
    onChange(next);
  };
  const add = () => onChange([...steps, { order: steps.length + 1, instruction: "" }]);
  const remove = (idx: number) =>
    onChange(steps.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order: i + 1 })));

  return (
    <div className="space-y-2">
      {steps.map((s, idx) => (
        <div key={idx} className="border border-border rounded-md p-2 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-6">#{idx + 1}</span>
            <Input
              value={s.instruction}
              placeholder="Step instruction"
              onChange={(e) => update(idx, { instruction: e.target.value })}
            />
            <Button variant="ghost" size="sm" onClick={() => remove(idx)}>Remove</Button>
          </div>
          <Input
            value={s.expected_outcome ?? ""}
            placeholder="Expected outcome (optional)"
            onChange={(e) => update(idx, { expected_outcome: e.target.value })}
          />
          <Input
            value={s.note ?? ""}
            placeholder="Note (optional)"
            onChange={(e) => update(idx, { note: e.target.value })}
          />
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={add}>Add step</Button>
    </div>
  );
}

export default function SopTrainingBibleAdmin() {
  const { customerId = "" } = useParams();
  const [entries, setEntries] = useState<AdminSopEntry[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    if (!customerId) return;
    setLoading(true);
    try {
      const r = await adminListSopEntries(customerId);
      setEntries(r);
      if (!activeId && r[0]) setActiveId(r[0].id);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [customerId]);

  const active = useMemo(() => entries.find(e => e.id === activeId) ?? null, [entries, activeId]);

  const create = async () => {
    if (!newTitle.trim()) return;
    const r = await adminCreateSopEntry(customerId, { title: newTitle.trim() });
    setNewTitle(""); setActiveId(r.id);
    await reload();
    toast.success("SOP created (draft)");
  };

  const patch = async (p: Partial<AdminSopEntry>) => {
    if (!active) return;
    setEntries(entries.map(e => e.id === active.id ? { ...e, ...p } : e));
    try {
      await adminUpdateSopEntry(active.id, p);
    } catch (e: any) { toast.error(e.message); }
  };

  const toggleVisible = async () => {
    if (!active) return;
    await patch({ client_visible: !active.client_visible });
  };

  const archive = async () => {
    if (!active) return;
    if (!confirm("Archive this SOP? It will be hidden from clients.")) return;
    await adminArchiveSopEntry(active.id);
    setActiveId(null);
    await reload();
  };

  return (
    <PortalShell variant="admin">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl text-foreground font-serif">SOP / Training Bible (Admin)</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Build approved operating instructions and training notes from implementation work.
            Internal notes and drafts never leave this view.
          </p>
        </header>

        <section className="bg-card border border-border rounded-xl p-5 space-y-3">
          <div className="flex gap-2">
            <Input placeholder="New SOP title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
            <Button onClick={create}>Create</Button>
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No SOPs yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {entries.map((e) => (
                <button key={e.id}
                  onClick={() => setActiveId(e.id)}
                  className={`text-xs px-3 py-1.5 rounded-md border ${activeId === e.id ? "border-primary text-foreground" : "border-border text-muted-foreground"}`}>
                  {e.title} <span className="opacity-60">· {e.status}</span>
                  {e.client_visible ? <span className="ml-1 text-primary">·visible</span> : null}
                </button>
              ))}
            </div>
          )}
        </section>

        {active ? (
          <section className="bg-card border border-border rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{SOP_STATUS_LABELS[active.status]}</Badge>
                <Badge variant="secondary">v{active.version}</Badge>
                {active.client_visible
                  ? <Badge>Client-visible</Badge>
                  : <Badge variant="outline">Admin-only</Badge>}
              </div>
              <div className="flex items-center gap-2">
                <select value={active.status}
                  onChange={(e) => patch({ status: e.target.value as SopStatus })}
                  className="bg-background border border-border rounded-md px-2 text-sm h-9">
                  {STATUSES.map(s => <option key={s} value={s}>{SOP_STATUS_LABELS[s]}</option>)}
                </select>
                <Button variant="outline" size="sm" onClick={toggleVisible}>
                  {active.client_visible ? "Hide from client" : "Make client-visible"}
                </Button>
                <Button variant="outline" size="sm" onClick={archive}>Archive</Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                defaultValue={active.title}
                placeholder="Title"
                onBlur={(e) => patch({ title: e.target.value })}
              />
              <Input
                defaultValue={active.category ?? ""}
                placeholder="Category / department"
                onBlur={(e) => patch({ category: e.target.value })}
              />
              <Input
                defaultValue={active.role_team ?? ""}
                placeholder="Role / team responsible"
                onBlur={(e) => patch({ role_team: e.target.value })}
              />
              <Input
                defaultValue={active.trigger_when_used ?? ""}
                placeholder="Trigger / when used"
                onBlur={(e) => patch({ trigger_when_used: e.target.value })}
              />
            </div>

            <Textarea defaultValue={active.purpose ?? ""} placeholder="Purpose"
              onBlur={(e) => patch({ purpose: e.target.value })} />
            <Textarea defaultValue={active.client_summary ?? ""} placeholder="Client summary (client-facing)"
              onBlur={(e) => patch({ client_summary: e.target.value })} />
            <Textarea defaultValue={active.inputs_tools_needed ?? ""} placeholder="Inputs / tools needed"
              onBlur={(e) => patch({ inputs_tools_needed: e.target.value })} />

            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Steps</div>
              <StepEditor entry={active} onChange={(steps) => patch({ steps })} />
            </div>

            <Textarea defaultValue={active.quality_standard ?? ""} placeholder="Quality standard / definition of done"
              onBlur={(e) => patch({ quality_standard: e.target.value })} />
            <Textarea defaultValue={active.common_mistakes ?? ""} placeholder="Common mistakes"
              onBlur={(e) => patch({ common_mistakes: e.target.value })} />
            <Textarea defaultValue={active.escalation_point ?? ""} placeholder="Escalation point"
              onBlur={(e) => patch({ escalation_point: e.target.value })} />
            <Textarea defaultValue={active.owner_decision_point ?? ""} placeholder="Owner decision point"
              onBlur={(e) => patch({ owner_decision_point: e.target.value })} />
            <Textarea defaultValue={active.training_notes ?? ""} placeholder="Training notes (client-visible if entry is)"
              onBlur={(e) => patch({ training_notes: e.target.value })} />
            <Textarea defaultValue={active.internal_notes ?? ""} placeholder="Internal admin notes (never shown to client)"
              onBlur={(e) => patch({ internal_notes: e.target.value })} />
          </section>
        ) : null}
      </div>
    </PortalShell>
  );
}
