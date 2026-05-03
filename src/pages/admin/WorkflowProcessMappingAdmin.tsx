import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { PortalShell } from "@/components/portal/PortalShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  adminListWorkflowMaps, adminCreateWorkflowMap, adminUpdateWorkflowMap,
  adminArchiveWorkflowMap,
  type AdminWorkflowProcessMap, WORKFLOW_MAP_STATUS_LABELS, type WorkflowMapStatus,
  type WorkflowProcessStep,
} from "@/lib/workflowProcessMapping";

const STATUSES: WorkflowMapStatus[] = [
  "draft","ready_for_review","client_visible","active","needs_update","archived",
];

export default function WorkflowProcessMappingAdmin() {
  const { customerId = "" } = useParams();
  const [entries, setEntries] = useState<AdminWorkflowProcessMap[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    if (!customerId) return;
    setLoading(true);
    try {
      const r = await adminListWorkflowMaps(customerId);
      setEntries(r);
      if (!activeId && r[0]) setActiveId(r[0].id);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [customerId]);

  const active = useMemo(() => entries.find(e => e.id === activeId) ?? null, [entries, activeId]);

  const create = async () => {
    if (!newTitle.trim()) return;
    const r = await adminCreateWorkflowMap(customerId, { title: newTitle.trim() });
    setNewTitle(""); setActiveId(r.id);
    await reload();
    toast.success("Map created (draft)");
  };

  const patch = async (p: Partial<AdminWorkflowProcessMap>) => {
    if (!active) return;
    setEntries(entries.map(e => e.id === active.id ? { ...e, ...p } : e));
    try {
      await adminUpdateWorkflowMap(active.id, p);
    } catch (e: any) { toast.error(e.message); }
  };

  const toggleVisible = async () => {
    if (!active) return;
    await patch({ client_visible: !active.client_visible });
  };

  const archive = async () => {
    if (!active) return;
    if (!confirm("Archive this map? It will be hidden from clients.")) return;
    await adminArchiveWorkflowMap(active.id);
    setActiveId(null);
    await reload();
  };

  const updateStep = async (idx: number, p: Partial<WorkflowProcessStep>) => {
    if (!active) return;
    const next = [...active.steps];
    next[idx] = { ...next[idx], ...p };
    await patch({ steps: next });
  };
  const addStep = async () => {
    if (!active) return;
    const next = [...active.steps, {
      order: active.steps.length + 1, step_name: "New step",
    } as WorkflowProcessStep];
    await patch({ steps: next });
  };
  const removeStep = async (idx: number) => {
    if (!active) return;
    const next = active.steps.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order: i + 1 }));
    await patch({ steps: next });
  };

  return (
    <PortalShell variant="admin">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl text-foreground font-serif">Workflow / Process Mapping (Admin)</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Map how work moves through the business: trigger, ordered steps, handoffs,
            decisions, bottlenecks, and outputs. Internal notes and drafts never leave this view.
          </p>
        </header>

        <section className="bg-card border border-border rounded-xl p-5 space-y-3">
          <div className="flex gap-2">
            <Input placeholder="New process map title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
            <Button onClick={create}>Create</Button>
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No maps yet.</p>
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
                <Badge variant="outline">{WORKFLOW_MAP_STATUS_LABELS[active.status]}</Badge>
                <Badge variant="secondary">v{active.version}</Badge>
                {active.client_visible
                  ? <Badge>Client-visible</Badge>
                  : <Badge variant="outline">Admin-only</Badge>}
              </div>
              <div className="flex items-center gap-2">
                <select value={active.status}
                  onChange={(e) => patch({ status: e.target.value as WorkflowMapStatus })}
                  className="bg-background border border-border rounded-md px-2 text-sm h-9">
                  {STATUSES.map(s => <option key={s} value={s}>{WORKFLOW_MAP_STATUS_LABELS[s]}</option>)}
                </select>
                <Button variant="outline" size="sm" onClick={toggleVisible}>
                  {active.client_visible ? "Hide from client" : "Make client-visible"}
                </Button>
                <Button variant="outline" size="sm" onClick={archive}>Archive</Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input defaultValue={active.title} placeholder="Title"
                onBlur={(e) => patch({ title: e.target.value })} />
              <Input defaultValue={active.business_area ?? ""} placeholder="Business area / category"
                onBlur={(e) => patch({ business_area: e.target.value })} />
              <Input defaultValue={active.industry_context ?? ""} placeholder="Industry context (optional)"
                onBlur={(e) => patch({ industry_context: e.target.value })} />
              <Input defaultValue={active.process_owner ?? ""} placeholder="Process owner"
                onBlur={(e) => patch({ process_owner: e.target.value })} />
            </div>

            <Textarea defaultValue={active.process_purpose ?? ""}
              placeholder="Process purpose"
              onBlur={(e) => patch({ process_purpose: e.target.value })} />
            <Textarea defaultValue={active.process_trigger ?? ""}
              placeholder="Process trigger / start condition"
              onBlur={(e) => patch({ process_trigger: e.target.value })} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Textarea defaultValue={active.current_state_summary ?? ""}
                placeholder="Current state summary"
                onBlur={(e) => patch({ current_state_summary: e.target.value })} />
              <Textarea defaultValue={active.desired_future_state_summary ?? ""}
                placeholder="Desired future state summary"
                onBlur={(e) => patch({ desired_future_state_summary: e.target.value })} />
              <Textarea defaultValue={active.primary_roles ?? ""}
                placeholder="Primary roles involved"
                onBlur={(e) => patch({ primary_roles: e.target.value })} />
              <Textarea defaultValue={active.systems_tools_used ?? ""}
                placeholder="Systems / tools used"
                onBlur={(e) => patch({ systems_tools_used: e.target.value })} />
              <Textarea defaultValue={active.inputs_needed ?? ""}
                placeholder="Inputs needed"
                onBlur={(e) => patch({ inputs_needed: e.target.value })} />
              <Textarea defaultValue={active.outputs_deliverables ?? ""}
                placeholder="Outputs / deliverables"
                onBlur={(e) => patch({ outputs_deliverables: e.target.value })} />
              <Textarea defaultValue={active.handoff_points ?? ""}
                placeholder="Handoff points"
                onBlur={(e) => patch({ handoff_points: e.target.value })} />
              <Textarea defaultValue={active.decision_points ?? ""}
                placeholder="Decision points"
                onBlur={(e) => patch({ decision_points: e.target.value })} />
              <Textarea defaultValue={active.approval_points ?? ""}
                placeholder="Approval points"
                onBlur={(e) => patch({ approval_points: e.target.value })} />
              <Textarea defaultValue={active.bottlenecks ?? ""}
                placeholder="Bottlenecks"
                onBlur={(e) => patch({ bottlenecks: e.target.value })} />
              <Textarea defaultValue={active.rework_loops ?? ""}
                placeholder="Rework loops"
                onBlur={(e) => patch({ rework_loops: e.target.value })} />
              <Textarea defaultValue={active.revenue_time_risk_leaks ?? ""}
                placeholder="Revenue / time / risk leaks"
                onBlur={(e) => patch({ revenue_time_risk_leaks: e.target.value })} />
            </div>

            <Textarea defaultValue={active.client_summary ?? ""}
              placeholder="Client summary (client-facing)"
              onBlur={(e) => patch({ client_summary: e.target.value })} />
            <Textarea defaultValue={active.internal_notes ?? ""}
              placeholder="Internal admin notes (never shown to client)"
              onBlur={(e) => patch({ internal_notes: e.target.value })} />

            <div className="space-y-2 pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <h3 className="text-sm text-foreground">Ordered steps</h3>
                <Button size="sm" variant="outline" onClick={addStep}>Add step</Button>
              </div>
              {active.steps.length === 0 && (
                <p className="text-xs text-muted-foreground">No steps yet.</p>
              )}
              {active.steps.map((s, i) => (
                <div key={i} className="border border-border rounded-md p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Step {s.order ?? i + 1}</span>
                    <Button size="sm" variant="ghost" onClick={() => removeStep(i)}>Remove</Button>
                  </div>
                  <Input defaultValue={s.step_name} placeholder="Step name"
                    onBlur={(e) => updateStep(i, { step_name: e.target.value })} />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Input defaultValue={s.role_owner ?? ""} placeholder="Role owner"
                      onBlur={(e) => updateStep(i, { role_owner: e.target.value })} />
                    <Input defaultValue={s.tool_or_system_used ?? ""} placeholder="Tool / system used"
                      onBlur={(e) => updateStep(i, { tool_or_system_used: e.target.value })} />
                    <Input defaultValue={s.input ?? ""} placeholder="Input"
                      onBlur={(e) => updateStep(i, { input: e.target.value })} />
                    <Input defaultValue={s.output ?? ""} placeholder="Output"
                      onBlur={(e) => updateStep(i, { output: e.target.value })} />
                    <Input defaultValue={s.handoff_to ?? ""} placeholder="Handoff to"
                      onBlur={(e) => updateStep(i, { handoff_to: e.target.value })} />
                    <Input defaultValue={s.action ?? ""} placeholder="Action"
                      onBlur={(e) => updateStep(i, { action: e.target.value })} />
                  </div>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <label className="flex items-center gap-1">
                      <input type="checkbox" defaultChecked={!!s.decision_required}
                        onChange={(e) => updateStep(i, { decision_required: e.target.checked })} />
                      Decision required
                    </label>
                    <label className="flex items-center gap-1">
                      <input type="checkbox" defaultChecked={!!s.bottleneck_flag}
                        onChange={(e) => updateStep(i, { bottleneck_flag: e.target.checked })} />
                      Bottleneck
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </PortalShell>
  );
}
