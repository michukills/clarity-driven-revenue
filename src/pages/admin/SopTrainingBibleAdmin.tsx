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
import { requestSopAiDraft, type SopAiDraftResponse } from "@/lib/implementationSeed";
import { AiOutputEnvelopePanel } from "@/components/ai/AiOutputEnvelopePanel";
import { extractAiOutputEnvelope } from "@/lib/ai/aiOutputEnvelopeTypes";

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
  const [aiOpen, setAiOpen] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiSeed, setAiSeed] = useState({
    task_description: "", current_process_notes: "", desired_outcome: "",
    role_team: "", known_bottlenecks: "", software_tools: "",
    customer_handoff_points: "", quality_issues: "",
  });
  const [aiDraft, setAiDraft] = useState<SopAiDraftResponse | null>(null);

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

  const runAi = async (mode: "draft" | "improve") => {
    setAiBusy(true);
    setAiDraft(null);
    try {
      const existing = mode === "improve" && active ? {
        title: active.title, purpose: active.purpose, role_team: active.role_team,
        trigger_when_used: active.trigger_when_used, inputs_tools_needed: active.inputs_tools_needed,
        quality_standard: active.quality_standard, common_mistakes: active.common_mistakes,
        escalation_point: active.escalation_point, owner_decision_point: active.owner_decision_point,
        training_notes: active.training_notes, client_summary: active.client_summary,
        steps: active.steps,
      } : null;
      const res = await requestSopAiDraft({
        mode, customer_id: customerId, sop_entry_id: active?.id ?? null,
        ...aiSeed, existing,
      });
      setAiDraft(res);
      toast.success("AI draft ready — review before applying");
    } catch (e: any) {
      toast.error(e?.message ?? "AI draft failed");
    } finally { setAiBusy(false); }
  };

  const applyAiDraft = async () => {
    if (!aiDraft || !active) return;
    const s = aiDraft.sop;
    // Always preserve admin-only defaults: status=draft, client_visible=false.
    await patch({
      title: s.title ?? active.title,
      purpose: s.purpose ?? active.purpose,
      role_team: s.role_team ?? active.role_team,
      trigger_when_used: s.trigger_when_used ?? active.trigger_when_used,
      inputs_tools_needed: s.inputs_tools_needed ?? active.inputs_tools_needed,
      quality_standard: s.quality_standard ?? active.quality_standard,
      common_mistakes: s.common_mistakes ?? active.common_mistakes,
      escalation_point: s.escalation_point ?? active.escalation_point,
      owner_decision_point: s.owner_decision_point ?? active.owner_decision_point,
      training_notes: s.training_notes ?? active.training_notes,
      client_summary: s.client_summary ?? active.client_summary,
      steps: (s.steps as any) ?? active.steps,
      internal_notes: [active.internal_notes, s.admin_review_notes ? `\n[AI review notes]\n${s.admin_review_notes}` : ""]
        .filter(Boolean).join("\n"),
      status: "draft",
      client_visible: false,
    });
    setAiDraft(null);
    toast.success("AI draft applied (still admin-only, needs review)");
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
          <div className="mt-3 flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setAiOpen((v) => !v)}>
              {aiOpen ? "Hide AI assist" : "AI assist"}
            </Button>
            <span className="text-xs text-muted-foreground self-center">
              AI drafts are admin-only and require review before publishing.
            </span>
          </div>
        </header>

        {aiOpen ? (
          <section className="bg-card border border-border rounded-xl p-5 space-y-3">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">AI SOP assist (admin draft only)</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Input placeholder="Task description" value={aiSeed.task_description}
                onChange={(e) => setAiSeed({ ...aiSeed, task_description: e.target.value })} />
              <Input placeholder="Desired outcome" value={aiSeed.desired_outcome}
                onChange={(e) => setAiSeed({ ...aiSeed, desired_outcome: e.target.value })} />
              <Input placeholder="Role / team" value={aiSeed.role_team}
                onChange={(e) => setAiSeed({ ...aiSeed, role_team: e.target.value })} />
              <Input placeholder="Software / tools" value={aiSeed.software_tools}
                onChange={(e) => setAiSeed({ ...aiSeed, software_tools: e.target.value })} />
              <Input placeholder="Known bottlenecks" value={aiSeed.known_bottlenecks}
                onChange={(e) => setAiSeed({ ...aiSeed, known_bottlenecks: e.target.value })} />
              <Input placeholder="Customer handoff points" value={aiSeed.customer_handoff_points}
                onChange={(e) => setAiSeed({ ...aiSeed, customer_handoff_points: e.target.value })} />
            </div>
            <Textarea placeholder="Current process notes" value={aiSeed.current_process_notes}
              onChange={(e) => setAiSeed({ ...aiSeed, current_process_notes: e.target.value })} />
            <Textarea placeholder="Quality issues / what usually goes wrong" value={aiSeed.quality_issues}
              onChange={(e) => setAiSeed({ ...aiSeed, quality_issues: e.target.value })} />
            <div className="flex gap-2">
              <Button size="sm" disabled={aiBusy} onClick={() => runAi("draft")}>
                {aiBusy ? "Drafting…" : "Generate SOP draft"}
              </Button>
              <Button size="sm" variant="outline" disabled={aiBusy || !active} onClick={() => runAi("improve")}>
                Improve current SOP
              </Button>
            </div>
            {aiDraft ? (
              <div className="border border-border rounded-md p-3 space-y-2">
                <div className="text-xs text-muted-foreground">
                  Confidence: {aiDraft.sop.confidence ?? "low"} · admin-only draft, not client-visible
                </div>
                <div className="text-sm font-medium text-foreground">{aiDraft.sop.title}</div>
                {aiDraft.sop.steps?.length ? (
                  <ol className="list-decimal pl-5 text-sm space-y-1">
                    {aiDraft.sop.steps.map((s) => (
                      <li key={s.order}><span className="text-foreground">{s.instruction}</span>
                        {s.expected_outcome ? <span className="text-muted-foreground"> — {s.expected_outcome}</span> : null}
                      </li>
                    ))}
                  </ol>
                ) : null}
                {aiDraft.sop.client_summary ? (
                  <p className="text-sm text-muted-foreground"><span className="text-foreground">Client summary:</span> {aiDraft.sop.client_summary}</p>
                ) : null}
                {aiDraft.sop.admin_review_notes ? (
                  <p className="text-xs text-muted-foreground"><span className="text-foreground">Admin review notes:</span> {aiDraft.sop.admin_review_notes}</p>
                ) : null}
                <AiOutputEnvelopePanel
                  envelope={extractAiOutputEnvelope(aiDraft)}
                  variant="review"
                  title="SOP AI-assisted draft"
                />
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  AI-assisted draft. Not a legal, HR, OSHA, or compliance certification. Human review required before client visibility.
                </p>
                <div className="flex gap-2">
                  <Button size="sm" disabled={!active} onClick={applyAiDraft}>Apply to current SOP</Button>
                  <Button size="sm" variant="outline" onClick={() => setAiDraft(null)}>Discard</Button>
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

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
