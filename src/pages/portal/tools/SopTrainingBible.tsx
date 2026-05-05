import { useEffect, useState } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { usePortalCustomerId } from "@/hooks/usePortalCustomerId";
import { Loader2, BookOpen, Plus, Sparkles, Trash2, Save, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { MobileActionBar } from "@/components/portal/MobileActionBar";
import {
  getClientSopTrainingBible,
  clientListOwnSopDrafts,
  clientUpsertSopEntry,
  clientDeleteSopDraft,
  callClientSopAi,
  SopForbiddenContentError,
  type ClientSopEntry,
  type ClientSopDraft,
  type SopStep,
  type ClientSopAiMode,
} from "@/lib/sopTrainingBible";
import { GEAR_LABELS } from "@/lib/implementationRoadmap";
import { ImplementationScopeBanner } from "@/components/tools/ImplementationScopeBanner";

const AI_DISCLOSURE =
  "This SOP draft was created with AI assistance. Review it carefully, adjust it to your business, and confirm it before using it with your team.";
const PRO_REVIEW_DISCLOSURE =
  "AI can help structure process information, but it does not provide legal, HR, OSHA, cannabis compliance, healthcare privacy, licensing, tax, accounting, or professional certification advice.";

interface DraftForm {
  id: string | null;
  title: string;
  category: string;
  role_team: string;
  purpose: string;
  trigger_when_used: string;
  inputs_tools_needed: string;
  source_notes: string;
  steps: SopStep[];
  quality_standard: string;
  common_mistakes: string;
  escalation_point: string;
  owner_decision_point: string;
  training_notes: string;
  training_checklist: string[];
  qa_checklist: string[];
  handoff_points: string[];
  client_summary: string;
  ready_for_internal_use: boolean;
  ai_assisted: boolean;
  ai_disclosure_acknowledged: boolean;
}

const EMPTY_FORM: DraftForm = {
  id: null,
  title: "",
  category: "",
  role_team: "",
  purpose: "",
  trigger_when_used: "",
  inputs_tools_needed: "",
  source_notes: "",
  steps: [],
  quality_standard: "",
  common_mistakes: "",
  escalation_point: "",
  owner_decision_point: "",
  training_notes: "",
  training_checklist: [],
  qa_checklist: [],
  handoff_points: [],
  client_summary: "",
  ready_for_internal_use: false,
  ai_assisted: false,
  ai_disclosure_acknowledged: false,
};

function stepsToText(steps: SopStep[]): string {
  return steps
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((s) => {
      const out = [s.instruction];
      if (s.expected_outcome) out.push(`  → ${s.expected_outcome}`);
      if (s.note) out.push(`  (${s.note})`);
      return out.join("\n");
    })
    .join("\n");
}

function parseSteps(text: string): SopStep[] {
  const lines = text.split(/\r?\n/).map((l) => l.replace(/^\s*\d+[.)]\s*/, "").trim()).filter(Boolean);
  return lines.map((instruction, i) => ({ order: i + 1, instruction }));
}

export default function SopTrainingBible() {
  const { customerId, loading } = usePortalCustomerId();
  const [rows, setRows] = useState<ClientSopEntry[] | null>(null);
  const [drafts, setDrafts] = useState<ClientSopDraft[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState<DraftForm>(EMPTY_FORM);
  const [editing, setEditing] = useState(false);
  const [stepsText, setStepsText] = useState("");
  const [aiBusy, setAiBusy] = useState<ClientSopAiMode | null>(null);
  const [saving, setSaving] = useState(false);

  async function refresh() {
    if (!customerId) return;
    try {
      const [pub, mine] = await Promise.all([
        getClientSopTrainingBible(customerId),
        clientListOwnSopDrafts(customerId),
      ]);
      setRows(pub);
      setDrafts(mine);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load training bible");
    }
  }

  useEffect(() => {
    if (loading || !customerId) return;
    let alive = true;
    (async () => {
      try {
        const [pub, mine] = await Promise.all([
          getClientSopTrainingBible(customerId),
          clientListOwnSopDrafts(customerId),
        ]);
        if (alive) {
          setRows(pub);
          setDrafts(mine);
        }
      } catch (e: any) {
        if (alive) setErr(e?.message ?? "Failed to load training bible");
      }
    })();
    return () => { alive = false; };
  }, [customerId, loading]);

  // Group by category (fallback "General")
  const groups: Record<string, ClientSopEntry[]> = {};
  for (const r of rows ?? []) {
    const key = r.category?.trim() || "General";
    (groups[key] ||= []).push(r);
  }

  function startNew() {
    setForm(EMPTY_FORM);
    setStepsText("");
    setEditing(true);
  }

  function loadDraft(d: ClientSopDraft) {
    setForm({
      id: d.id,
      title: d.title ?? "",
      category: d.category ?? "",
      role_team: d.role_team ?? "",
      purpose: d.purpose ?? "",
      trigger_when_used: d.trigger_when_used ?? "",
      inputs_tools_needed: d.inputs_tools_needed ?? "",
      source_notes: "",
      steps: Array.isArray(d.steps) ? d.steps : [],
      quality_standard: d.quality_standard ?? "",
      common_mistakes: d.common_mistakes ?? "",
      escalation_point: d.escalation_point ?? "",
      owner_decision_point: d.owner_decision_point ?? "",
      training_notes: d.training_notes ?? "",
      training_checklist: [],
      qa_checklist: [],
      handoff_points: [],
      client_summary: d.client_summary ?? "",
      ready_for_internal_use: d.ready_for_internal_use,
      ai_assisted: d.ai_assisted,
      ai_disclosure_acknowledged: d.ai_disclosure_acknowledged,
    });
    setStepsText(stepsToText(Array.isArray(d.steps) ? d.steps : []));
    setEditing(true);
  }

  async function runAi(mode: ClientSopAiMode) {
    if (!customerId) return;
    setAiBusy(mode);
    try {
      const res = await callClientSopAi({
        customerId,
        mode,
        process_name: form.title || null,
        role_team: form.role_team || null,
        process_purpose: form.purpose || null,
        tools_needed: form.inputs_tools_needed || null,
        source_notes: form.source_notes || null,
        common_mistakes: form.common_mistakes || null,
        measurable_completion_standard: form.quality_standard || null,
        existing:
          mode === "draft"
            ? null
            : {
                title: form.title,
                purpose: form.purpose,
                role_team: form.role_team,
                trigger_when_used: form.trigger_when_used,
                inputs_tools_needed: form.inputs_tools_needed,
                quality_standard: form.quality_standard,
                common_mistakes: form.common_mistakes,
                escalation_point: form.escalation_point,
                owner_decision_point: form.owner_decision_point,
                training_notes: form.training_notes,
                client_summary: form.client_summary,
                steps: form.steps,
              },
      });
      const s = res.sop ?? {};
      setForm((prev) => ({
        ...prev,
        title: s.title ?? prev.title,
        purpose: s.purpose ?? prev.purpose,
        role_team: s.role_team ?? prev.role_team,
        trigger_when_used: s.trigger_when_used ?? prev.trigger_when_used,
        inputs_tools_needed: s.inputs_tools_needed ?? prev.inputs_tools_needed,
        steps: Array.isArray(s.steps) && s.steps.length > 0 ? s.steps : prev.steps,
        quality_standard: s.quality_standard ?? prev.quality_standard,
        common_mistakes: s.common_mistakes ?? prev.common_mistakes,
        escalation_point: s.escalation_point ?? prev.escalation_point,
        owner_decision_point: s.owner_decision_point ?? prev.owner_decision_point,
        training_notes: s.training_notes ?? prev.training_notes,
        training_checklist: s.training_checklist ?? prev.training_checklist,
        qa_checklist: s.qa_checklist ?? prev.qa_checklist,
        handoff_points: s.handoff_points ?? prev.handoff_points,
        client_summary: s.client_summary ?? prev.client_summary,
        ai_assisted: true,
      }));
      if (Array.isArray(s.steps) && s.steps.length > 0) setStepsText(stepsToText(s.steps));
      toast({ title: "AI draft ready", description: "Review and edit before saving." });
    } catch (e: any) {
      toast({ title: "AI draft unavailable", description: e?.message ?? "Try again shortly.", variant: "destructive" });
    } finally {
      setAiBusy(null);
    }
  }

  async function save() {
    if (!customerId) return;
    if (!form.title.trim()) {
      toast({ title: "Title required", description: "Add a short title before saving.", variant: "destructive" });
      return;
    }
    if (form.ai_assisted && !form.ai_disclosure_acknowledged) {
      toast({
        title: "Acknowledge AI disclosure",
        description: "Confirm you've reviewed the AI-assisted draft before saving.",
        variant: "destructive",
      });
      return;
    }
    const parsedSteps = stepsText.trim() ? parseSteps(stepsText) : form.steps;
    setSaving(true);
    try {
      await clientUpsertSopEntry({
        id: form.id,
        customerId,
        title: form.title,
        purpose: form.purpose,
        category: form.category,
        role_team: form.role_team,
        trigger_when_used: form.trigger_when_used,
        inputs_tools_needed: form.inputs_tools_needed,
        steps: parsedSteps,
        quality_standard: form.quality_standard,
        common_mistakes: form.common_mistakes,
        escalation_point: form.escalation_point,
        owner_decision_point: form.owner_decision_point,
        training_notes: form.training_notes,
        client_summary: form.client_summary,
        ready_for_internal_use: form.ready_for_internal_use,
        ai_assisted: form.ai_assisted,
        ai_disclosure_acknowledged: form.ai_disclosure_acknowledged,
      });
      toast({ title: "SOP saved", description: "Saved to your drafts." });
      setEditing(false);
      setForm(EMPTY_FORM);
      setStepsText("");
      await refresh();
    } catch (e: any) {
      if (e instanceof SopForbiddenContentError) {
        toast({ title: "Reword needed", description: e.message, variant: "destructive" });
      } else {
        toast({ title: "Save failed", description: e?.message ?? "Try again.", variant: "destructive" });
      }
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Archive this SOP draft? You can recreate one anytime.")) return;
    try {
      await clientDeleteSopDraft(id);
      toast({ title: "Draft archived" });
      await refresh();
    } catch (e: any) {
      toast({ title: "Could not archive", description: e?.message ?? "Try again.", variant: "destructive" });
    }
  }

  return (
    <PortalShell variant="customer">
      <div className="max-w-4xl mx-auto px-4 py-8 pb-24 md:pb-8 space-y-6">
        <header className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <BookOpen className="h-4 w-4" /> Implementation
          </div>
          <h1 className="text-2xl text-foreground font-serif">SOP / Training Bible</h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            This page contains approved operating instructions and training notes built during
            implementation. Each entry shows when to use the process, the steps to follow, the
            quality standard, and who owns the work. Review before using with staff and adapt to
            your business and any legal or compliance requirements.
          </p>
        </header>

        <ImplementationScopeBanner
          included="approved operating instructions and training notes built during implementation."
          excluded="employee management, ongoing training delivery, legal, tax, HR, or compliance review. Adapt each entry to your business and applicable requirements before using with staff."
        />

        {/* ----------------------------------------------------------------- */}
        {/* Client-authored drafts + creator                                  */}
        {/* ----------------------------------------------------------------- */}
        <section className="space-y-3" data-testid="client-sop-creator">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-base text-foreground">Your SOP drafts</h2>
              <p className="text-xs text-muted-foreground">
                Create internal SOPs for your own team. These stay private to your account unless
                an admin includes them in an official RGS deliverable.
              </p>
            </div>
            {!editing ? (
              <Button onClick={startNew} className="h-11 sm:h-10 w-full sm:w-auto" data-testid="sop-new">
                <Plus className="h-4 w-4 mr-2" /> New SOP
              </Button>
            ) : null}
          </div>

          {drafts && drafts.length > 0 && !editing ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {drafts.map((d) => (
                <article key={d.id} className="bg-card border border-border rounded-xl p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-foreground truncate">{d.title}</h3>
                      <div className="text-[11px] text-muted-foreground">
                        {d.category || "General"} · v{d.version}
                        {d.ai_assisted ? " · AI-assisted" : ""}
                      </div>
                    </div>
                    <Badge variant="outline" className="capitalize">{d.status.replace(/_/g, " ")}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="min-h-[44px] sm:min-h-0"
                      onClick={() => loadDraft(d)}
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="min-h-[44px] sm:min-h-0 text-destructive"
                      onClick={() => remove(d.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Archive
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          ) : null}

          {editing ? (
            <div className="bg-card border border-border rounded-xl p-4 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="sop-title">Title</Label>
                  <Input
                    id="sop-title"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="h-11 sm:h-10"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="sop-category">Category</Label>
                  <Input
                    id="sop-category"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    placeholder="e.g. Sales, Operations"
                    className="h-11 sm:h-10"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="sop-role">Responsible role / team</Label>
                  <Input
                    id="sop-role"
                    value={form.role_team}
                    onChange={(e) => setForm({ ...form, role_team: e.target.value })}
                    className="h-11 sm:h-10"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="sop-trigger">When used / trigger</Label>
                  <Input
                    id="sop-trigger"
                    value={form.trigger_when_used}
                    onChange={(e) => setForm({ ...form, trigger_when_used: e.target.value })}
                    className="h-11 sm:h-10"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="sop-purpose">Process purpose</Label>
                <Textarea
                  id="sop-purpose"
                  value={form.purpose}
                  onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="sop-tools">Tools / software / materials needed</Label>
                <Textarea
                  id="sop-tools"
                  value={form.inputs_tools_needed}
                  onChange={(e) => setForm({ ...form, inputs_tools_needed: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="sop-notes">Source notes (rough — for AI assist)</Label>
                <Textarea
                  id="sop-notes"
                  value={form.source_notes}
                  onChange={(e) => setForm({ ...form, source_notes: e.target.value })}
                  rows={4}
                  placeholder="Paste messy notes about how this work gets done. AI will turn them into a structured draft."
                />
              </div>

              <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2" data-testid="ai-disclosure">
                <div className="flex items-center gap-2 text-xs text-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-primary" /> AI assist
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{AI_DISCLOSURE}</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{PRO_REVIEW_DISCLOSURE}</p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {(["draft", "improve", "training_checklist", "qa_checklist", "handoff_gaps"] as ClientSopAiMode[]).map((m) => (
                    <Button
                      key={m}
                      size="sm"
                      variant="outline"
                      disabled={aiBusy !== null}
                      onClick={() => runAi(m)}
                      className="min-h-[44px] sm:min-h-0"
                      data-testid={`ai-${m}`}
                    >
                      {aiBusy === m ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5 mr-1" />
                      )}
                      {m === "draft"
                        ? "Draft from notes"
                        : m === "improve"
                        ? "Refine draft"
                        : m === "training_checklist"
                        ? "Training checklist"
                        : m === "qa_checklist"
                        ? "QA checklist"
                        : "Find handoff gaps"}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="sop-steps">Steps (one per line)</Label>
                <Textarea
                  id="sop-steps"
                  value={stepsText}
                  onChange={(e) => setStepsText(e.target.value)}
                  rows={8}
                  className="font-mono text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Quality standard / definition of done</Label>
                  <Textarea value={form.quality_standard} onChange={(e) => setForm({ ...form, quality_standard: e.target.value })} rows={2} />
                </div>
                <div className="space-y-1">
                  <Label>Common mistakes</Label>
                  <Textarea value={form.common_mistakes} onChange={(e) => setForm({ ...form, common_mistakes: e.target.value })} rows={2} />
                </div>
                <div className="space-y-1">
                  <Label>Escalation point</Label>
                  <Textarea value={form.escalation_point} onChange={(e) => setForm({ ...form, escalation_point: e.target.value })} rows={2} />
                </div>
                <div className="space-y-1">
                  <Label>Owner decision point</Label>
                  <Textarea value={form.owner_decision_point} onChange={(e) => setForm({ ...form, owner_decision_point: e.target.value })} rows={2} />
                </div>
              </div>

              {(form.training_checklist.length > 0 || form.qa_checklist.length > 0 || form.handoff_points.length > 0) ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  {form.training_checklist.length > 0 ? (
                    <div>
                      <div className="text-muted-foreground uppercase tracking-wider mb-1">Training checklist</div>
                      <ul className="list-disc pl-4 space-y-1 text-foreground">
                        {form.training_checklist.map((t, i) => <li key={i}>{t}</li>)}
                      </ul>
                    </div>
                  ) : null}
                  {form.qa_checklist.length > 0 ? (
                    <div>
                      <div className="text-muted-foreground uppercase tracking-wider mb-1">QA checklist</div>
                      <ul className="list-disc pl-4 space-y-1 text-foreground">
                        {form.qa_checklist.map((t, i) => <li key={i}>{t}</li>)}
                      </ul>
                    </div>
                  ) : null}
                  {form.handoff_points.length > 0 ? (
                    <div>
                      <div className="text-muted-foreground uppercase tracking-wider mb-1">Handoff points</div>
                      <ul className="list-disc pl-4 space-y-1 text-foreground">
                        {form.handoff_points.map((t, i) => <li key={i}>{t}</li>)}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="space-y-1">
                <Label>Training notes</Label>
                <Textarea value={form.training_notes} onChange={(e) => setForm({ ...form, training_notes: e.target.value })} rows={3} />
              </div>

              <div className="space-y-1">
                <Label>Client summary (plain language for staff)</Label>
                <Textarea value={form.client_summary} onChange={(e) => setForm({ ...form, client_summary: e.target.value })} rows={2} />
              </div>

              <div className="flex flex-col gap-2 text-xs text-muted-foreground">
                <label className="flex items-start gap-2 min-h-[44px]">
                  <input
                    type="checkbox"
                    checked={form.ready_for_internal_use}
                    onChange={(e) => setForm({ ...form, ready_for_internal_use: e.target.checked })}
                    className="mt-1 h-4 w-4"
                  />
                  <span>Mark this SOP as ready for internal use with my team.</span>
                </label>
                {form.ai_assisted ? (
                  <label className="flex items-start gap-2 min-h-[44px]" data-testid="ai-ack">
                    <input
                      type="checkbox"
                      checked={form.ai_disclosure_acknowledged}
                      onChange={(e) => setForm({ ...form, ai_disclosure_acknowledged: e.target.checked })}
                      className="mt-1 h-4 w-4"
                    />
                    <span>
                      I reviewed the AI-assisted draft, adjusted it to my business, and understand AI does not
                      replace legal, HR, OSHA, tax, accounting, or other professional review.
                    </span>
                  </label>
                ) : null}
              </div>

              <MobileActionBar>
                <Button
                  variant="ghost"
                  className="h-11 sm:h-10 w-full sm:w-auto"
                  onClick={() => { setEditing(false); setForm(EMPTY_FORM); setStepsText(""); }}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  className="h-11 sm:h-10 flex-1 sm:flex-none"
                  onClick={save}
                  disabled={saving}
                  data-testid="sop-save"
                >
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Save SOP
                </Button>
              </MobileActionBar>
            </div>
          ) : null}

          {!editing && drafts && drafts.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              You haven't created any SOPs yet. Start one above — AI assist can turn rough notes into a structured draft.
            </p>
          ) : null}
        </section>

        {loading || rows === null ? (
          <div className="py-16 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : err ? (
          <div className="bg-card border border-border rounded-xl p-6 text-sm text-muted-foreground">
            We couldn't load your training bible right now. Please try again shortly.
          </div>
        ) : rows.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-8 text-center">
            <h2 className="text-base text-foreground mb-2">Your SOP / Training Bible is being prepared.</h2>
            <p className="text-sm text-muted-foreground">
              Once RGS marks entries ready, approved operating instructions will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groups).map(([cat, entries]) => (
              <section key={cat} className="space-y-3">
                <h2 className="text-xs uppercase tracking-wider text-muted-foreground">{cat}</h2>
                <div className="space-y-3">
                  {entries.map((e) => (
                    <article key={e.id} className="bg-card border border-border rounded-xl p-5 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-foreground">{e.title}</h3>
                          <div className="text-[11px] text-muted-foreground mt-0.5 space-x-2">
                            {e.role_team ? <span>Role: {e.role_team}</span> : null}
                            {e.gear ? <span>· {GEAR_LABELS[e.gear]}</span> : null}
                          </div>
                        </div>
                        <Badge variant="outline" className="capitalize">v{e.version}</Badge>
                      </div>
                      {e.purpose ? (
                        <p className="text-sm text-muted-foreground whitespace-pre-line">{e.purpose}</p>
                      ) : null}
                      {e.client_summary ? (
                        <p className="text-sm text-foreground/90 whitespace-pre-line">{e.client_summary}</p>
                      ) : null}

                      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        {e.trigger_when_used ? (
                          <div>
                            <dt className="text-muted-foreground uppercase tracking-wider mb-0.5">When to use</dt>
                            <dd className="text-foreground whitespace-pre-line">{e.trigger_when_used}</dd>
                          </div>
                        ) : null}
                        {e.inputs_tools_needed ? (
                          <div>
                            <dt className="text-muted-foreground uppercase tracking-wider mb-0.5">Inputs / tools needed</dt>
                            <dd className="text-foreground whitespace-pre-line">{e.inputs_tools_needed}</dd>
                          </div>
                        ) : null}
                      </dl>

                      {Array.isArray(e.steps) && e.steps.length > 0 ? (
                        <div>
                          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Steps</div>
                          <ol className="space-y-2 list-decimal pl-5 text-sm text-foreground">
                            {e.steps
                              .slice()
                              .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                              .map((s, idx) => (
                                <li key={idx} className="space-y-0.5">
                                  <div className="whitespace-pre-line">{s.instruction}</div>
                                  {s.expected_outcome ? (
                                    <div className="text-xs text-muted-foreground">
                                      Expected outcome: {s.expected_outcome}
                                    </div>
                                  ) : null}
                                  {s.note ? (
                                    <div className="text-xs text-muted-foreground">Note: {s.note}</div>
                                  ) : null}
                                </li>
                              ))}
                          </ol>
                        </div>
                      ) : null}

                      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        {e.quality_standard ? (
                          <div className="sm:col-span-2">
                            <dt className="text-muted-foreground uppercase tracking-wider mb-0.5">Quality standard / definition of done</dt>
                            <dd className="text-foreground whitespace-pre-line">{e.quality_standard}</dd>
                          </div>
                        ) : null}
                        {e.common_mistakes ? (
                          <div>
                            <dt className="text-muted-foreground uppercase tracking-wider mb-0.5">Common mistakes</dt>
                            <dd className="text-foreground whitespace-pre-line">{e.common_mistakes}</dd>
                          </div>
                        ) : null}
                        {e.escalation_point ? (
                          <div>
                            <dt className="text-muted-foreground uppercase tracking-wider mb-0.5">Escalation</dt>
                            <dd className="text-foreground whitespace-pre-line">{e.escalation_point}</dd>
                          </div>
                        ) : null}
                        {e.owner_decision_point ? (
                          <div className="sm:col-span-2">
                            <dt className="text-muted-foreground uppercase tracking-wider mb-0.5">Owner decision point</dt>
                            <dd className="text-foreground whitespace-pre-line">{e.owner_decision_point}</dd>
                          </div>
                        ) : null}
                        {e.training_notes ? (
                          <div className="sm:col-span-2">
                            <dt className="text-muted-foreground uppercase tracking-wider mb-0.5">Training notes</dt>
                            <dd className="text-foreground whitespace-pre-line">{e.training_notes}</dd>
                          </div>
                        ) : null}
                      </dl>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        <p className="text-[11px] text-muted-foreground">
          These instructions are built from available process details and admin-reviewed before
          being released. Adapt them to your business and any legal or compliance requirements.
          Ongoing visibility after implementation is offered separately through the
          RGS Control System™ subscription.
        </p>
      </div>
    </PortalShell>
  );
}
