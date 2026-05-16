/**
 * P13.5 — Process Breakdown maturity.
 *
 * Guided, evidence-first 14-section process builder. Replaces the blank
 * manual fields with prompted sections that surface bottlenecks, waste,
 * customer/revenue impact, SOP candidates, operating controls, target
 * gear, and implementation task suggestions. Uses the existing
 * ToolRunnerShell (canonical key `process_breakdown_tool`).
 */
import { useMemo, useState } from "react";
import ToolRunnerShell from "@/components/tools/ToolRunnerShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, ShieldCheck, EyeOff, AlertTriangle, Wand2, Compass } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AiOutputEnvelopePanel } from "@/components/ai/AiOutputEnvelopePanel";
import {
  extractAiOutputEnvelope,
  type AiOutputEnvelope,
} from "@/lib/ai/aiOutputEnvelopeTypes";
import {
  PROCESS_SECTIONS,
  PROCESS_STATUS_LABELS,
  emptyProcess,
  hydrateProcess,
  deriveStatus,
  buildProcessSummary,
  buildProcessFromEvidence,
  clientSafeView,
  mergeAiSeedIntoProcess,
  type AiSeedProcess,
  type ProcessRecord,
  type ProcessSectionKey,
  type ProcessStatus,
  type ConfidenceLevel,
} from "@/lib/process/builder";
import { TARGET_GEARS, type TargetGear } from "@/lib/gears/targetGear";

interface RunData {
  customerId?: string;
  process: ProcessRecord;
}

const defaultData: RunData = { process: emptyProcess() };

export default function ProcessBreakdownTool() {
  const [data, setRawData] = useState<RunData>(defaultData);
  const setData = (next: any) => {
    if (next && typeof next === "object" && next.process) {
      setRawData({ ...next, process: hydrateProcess(next.process) });
    } else if (next && typeof next === "object") {
      setRawData({ process: hydrateProcess(next) });
    } else {
      setRawData(defaultData);
    }
  };

  const proc = data.process ?? emptyProcess();
  const update = (patch: Partial<ProcessRecord>) =>
    setRawData({ ...data, process: { ...proc, ...patch } });
  const updateSection = (key: ProcessSectionKey, patch: Partial<ProcessRecord["sections"][ProcessSectionKey]>) => {
    setRawData({
      ...data,
      process: {
        ...proc,
        sections: { ...proc.sections, [key]: { ...proc.sections[key], ...patch } },
      },
    });
  };

  const derived = useMemo(() => deriveStatus(proc), [proc]);
  const summary = useMemo(() => buildProcessSummary(proc), [proc]);
  const safeView = useMemo(() => clientSafeView(proc), [proc]);
  const [generating, setGenerating] = useState(false);
  const [shellCustomerId, setShellCustomerId] = useState<string>("");

  // ── AI Seed state ─────────────────────────────────────────────────────
  const [seedOpen, setSeedOpen] = useState(false);
  const [seedBusy, setSeedBusy] = useState(false);
  const [seedError, setSeedError] = useState<string | null>(null);
  const [seedEnvelope, setSeedEnvelope] = useState<AiOutputEnvelope | null>(null);
  const [seed, setSeed] = useState({
    process_name: "",
    trigger: "",
    where_it_breaks: "",
    owner: "",
    tools_used: "",
    customer_impact: "",
    estimated_waste: "",
    context_notes: "",
  });
  const [seedOverwrite, setSeedOverwrite] = useState(false);

  const generateAiSeed = async () => {
    if (!seed.process_name.trim() && !seed.where_it_breaks.trim() && !seed.trigger.trim()) {
      toast.error("Add at least a process name, the trigger, or where it breaks.");
      return;
    }
    setSeedBusy(true);
    setSeedError(null);
    try {
      const { data: resp, error } = await supabase.functions.invoke("process-ai-seed", { body: seed });
      if (error) {
        const msg = (resp as any)?.error ?? error.message ?? "AI draft unavailable.";
        setSeedError(msg);
        toast.error(msg);
        return;
      }
      const aiProcess = (resp as { process?: AiSeedProcess })?.process;
      const envelope = extractAiOutputEnvelope(resp);
      setSeedEnvelope(envelope);
      if (!aiProcess) {
        setSeedError("AI returned no process payload.");
        toast.error("AI returned no process payload.");
        return;
      }
      const { process: next } = mergeAiSeedIntoProcess(proc, aiProcess, { overwrite: seedOverwrite });
      setRawData({ ...data, process: next });
      toast.success(
        `Hypothesis process drafted (${aiProcess.confidence ?? "low"} confidence). Review and edit before saving.`,
      );
      setSeedOpen(false);
    } catch (e: any) {
      const msg = e?.message ?? "AI draft unavailable. Manual builder still works.";
      setSeedError(msg);
      toast.error(msg);
    } finally {
      setSeedBusy(false);
    }
  };

  const generate = async (customerId: string) => {
    if (!customerId) {
      toast.error("Pick a client first — evidence drafts are per-client.");
      return;
    }
    setGenerating(true);
    try {
      const { process: next, rationale } = await buildProcessFromEvidence(customerId, proc);
      setRawData({ ...data, process: next });
      toast.success(rationale);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not build process from evidence.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <ToolRunnerShell
      toolKey="process_breakdown_tool"
      toolTitle="Process Clarity Engine™"
      description="Guided, evidence-first process breakdown. Surfaces bottlenecks, waste, SOP candidates, and gear-linked task suggestions. Client-safe and admin-only views are kept separate."
      data={data}
      setData={setData}
      defaultData={defaultData}
      computeSummary={() => buildProcessSummary(proc)}
      clientPreview={
        <div className="space-y-3">
          {safeView.summary ? (
            <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{safeView.summary}</p>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              No client-safe summary written yet. Add one before sharing.
            </p>
          )}
          {safeView.sections.length > 0 ? (
            <div className="space-y-2">
              {safeView.sections.map((s) => (
                <div key={s.label} className="rounded-md border border-border bg-muted/20 p-3">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{s.label}</div>
                  <div className="text-sm text-foreground mt-1 whitespace-pre-wrap">{s.value}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              No sections marked client-safe yet.
            </p>
          )}
        </div>
      }
      rightPanel={
        <div className="space-y-4">
          {/* Status hero */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Process status</div>
            <div className="text-lg text-foreground">{PROCESS_STATUS_LABELS[derived]}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {summary.sections_filled} / {summary.sections_total} sections drafted
              {summary.bottleneck_flagged ? " · bottleneck flagged" : ""}
              {summary.sop_candidate ? " · SOP candidate" : ""}
            </div>
            <div className="mt-3">
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Override status</label>
              <select
                value={proc.status}
                onChange={(e) => update({ status: e.target.value as ProcessStatus })}
                className="mt-1 w-full bg-muted/40 border border-border rounded-md px-3 py-2 text-sm text-foreground h-10"
              >
                {(Object.keys(PROCESS_STATUS_LABELS) as ProcessStatus[]).map((s) => (
                  <option key={s} value={s}>{PROCESS_STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
            <div className="mt-3">
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Target Gear</label>
              <GearSelect
                value={proc.targetGear}
                onChange={(g) => {
                  update({ targetGear: g });
                  updateSection("target_gear", { value: g ? `G${g}` : "", needsValidation: true });
                }}
              />
            </div>
          </div>

          {/* AI Process Seed */}
          <div className="bg-card border border-primary/30 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-primary" />
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">AI Process Seed</div>
            </div>
            <p className="text-xs text-muted-foreground">
              Generate a <span className="text-foreground">hypothesis</span> process breakdown from a small seed.
              Output is labelled "needs validation" until you confirm each section.
            </p>
            {!seedOpen ? (
              <Button onClick={() => setSeedOpen(true)} variant="outline" className="w-full border-primary/40 justify-start">
                <Wand2 className="h-4 w-4" /> Open AI Seed
              </Button>
            ) : (
              <div className="space-y-2">
                <SeedField label="Process name / area" value={seed.process_name}
                  onChange={(v) => setSeed((s) => ({ ...s, process_name: v }))}
                  placeholder="e.g. Client onboarding" />
                <SeedTextarea label="What starts the process" value={seed.trigger}
                  onChange={(v) => setSeed((s) => ({ ...s, trigger: v }))}
                  placeholder="The trigger / starting event." />
                <SeedTextarea label="Where it breaks" value={seed.where_it_breaks}
                  onChange={(v) => setSeed((s) => ({ ...s, where_it_breaks: v }))}
                  placeholder="The friction point you've already noticed." />
                <div className="grid grid-cols-2 gap-2">
                  <SeedField label="Who owns it" value={seed.owner}
                    onChange={(v) => setSeed((s) => ({ ...s, owner: v }))} placeholder="Owner / role" />
                  <SeedField label="Tools used" value={seed.tools_used}
                    onChange={(v) => setSeed((s) => ({ ...s, tools_used: v }))} placeholder="QBO, Slack, sheets…" />
                </div>
                <SeedTextarea label="Customer impact (optional)" value={seed.customer_impact}
                  onChange={(v) => setSeed((s) => ({ ...s, customer_impact: v }))}
                  placeholder="What the customer experiences." />
                <SeedField label="Estimated cost / time waste (optional)" value={seed.estimated_waste}
                  onChange={(v) => setSeed((s) => ({ ...s, estimated_waste: v }))}
                  placeholder="$2k/mo, 6 hrs/wk…" />
                <SeedTextarea label="Other context (optional)" value={seed.context_notes}
                  onChange={(v) => setSeed((s) => ({ ...s, context_notes: v }))}
                  placeholder="Anything else useful." />
                <label className="inline-flex items-center gap-2 text-[11px] text-muted-foreground pt-1">
                  <input type="checkbox" checked={seedOverwrite} onChange={(e) => setSeedOverwrite(e.target.checked)} />
                  Overwrite sections that already have content
                </label>
                {seedError && (
                  <div className="rounded-md border border-[hsl(0_70%_55%/0.4)] bg-[hsl(0_70%_55%/0.08)] p-2 text-[11px] text-[hsl(0_85%_70%)]">
                    {seedError}
                  </div>
                )}
                {seedEnvelope && (
                  <AiOutputEnvelopePanel
                    envelope={seedEnvelope}
                    variant="review"
                    title="AI process draft — review metadata"
                  />
                )}
                <div className="flex items-center gap-2 pt-1">
                  <Button onClick={generateAiSeed} disabled={seedBusy} className="flex-1 justify-center">
                    <Sparkles className="h-4 w-4" />
                    {seedBusy ? "Generating…" : "Generate hypothesis process"}
                  </Button>
                  <Button onClick={() => setSeedOpen(false)} variant="ghost" disabled={seedBusy}>Cancel</Button>
                </div>
                <p className="text-[10px] text-muted-foreground italic">
                  Output is a hypothesis. Friction, waste, SOP, control, and tasks stay admin-only by default. Tasks are suggestions only — never auto-created.
                </p>
              </div>
            )}
          </div>

          {/* Build from evidence */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Automation assist</div>
            <p className="text-xs text-muted-foreground">
              Pulls only from this client's profile, latest persona, latest journey, intake, sources, insight memory, and tasks. Thin evidence stays flagged.
            </p>
            <Button
              onClick={() => generate(shellCustomerId)}
              disabled={generating || !shellCustomerId}
              variant="outline"
              className="w-full border-border justify-start"
            >
              <Sparkles className="h-4 w-4" /> {generating ? "Building…" : "Build Process From Evidence"}
            </Button>
            {!shellCustomerId && (
              <p className="text-[11px] text-[hsl(40_90%_60%)]">Select a client above to enable.</p>
            )}
          </div>

          {/* Evidence trail */}
          {proc.evidenceTrail.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Evidence used</div>
              <ul className="space-y-1.5">
                {proc.evidenceTrail.slice(0, 8).map((t, i) => (
                  <li key={i} className="text-[11px] text-muted-foreground">
                    <span className="text-foreground">{t.source}</span> — {t.detail}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      }
    >
      {(ctx) => {
        if (ctx.customerId !== shellCustomerId) {
          queueMicrotask(() => setShellCustomerId(ctx.customerId));
        }
        return (
          <>
            <div className="space-y-4">
              {PROCESS_SECTIONS.filter((d) => d.key !== "target_gear").map((def, idx) => {
                const s = proc.sections[def.key];
                const isAdminOnlyByDefault = !def.clientSafeDefault;
                return (
                  <div key={def.key} className="bg-card border border-border rounded-xl p-5 space-y-3">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0 flex items-start gap-3">
                        <span className="h-7 w-7 mt-0.5 rounded-full bg-primary/15 text-primary text-xs flex items-center justify-center tabular-nums shrink-0">{idx + 1}</span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm text-foreground font-medium">{def.label}</h3>
                            {s.needsValidation && s.value.trim() && (
                              <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-[hsl(40_90%_60%)]">
                                <AlertTriangle className="h-3 w-3" /> needs validation
                              </span>
                            )}
                            {isAdminOnlyByDefault && (
                              <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                                <EyeOff className="h-3 w-3" /> admin-only by default
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{def.hint}</p>
                        </div>
                      </div>
                    </div>

                    <p className="text-[11px] text-muted-foreground italic">{def.prompt}</p>

                    <Textarea
                      value={s.value}
                      onChange={(e) => updateSection(def.key, { value: e.target.value })}
                      placeholder="Capture what you know today…"
                      className="bg-muted/40 border-border min-h-[90px]"
                    />

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <label className="block">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Evidence / source</span>
                        <Input
                          value={s.evidenceSource}
                          onChange={(e) => updateSection(def.key, { evidenceSource: e.target.value })}
                          placeholder="Intake, journey, persona, AI hypothesis…"
                          className="mt-1 bg-muted/40 border-border h-9 text-xs"
                        />
                      </label>
                      <label className="block">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Confidence</span>
                        <select
                          value={s.confidence}
                          onChange={(e) => updateSection(def.key, { confidence: e.target.value as ConfidenceLevel })}
                          className="mt-1 w-full bg-muted/40 border border-border rounded-md px-2 py-2 text-xs text-foreground h-9"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                      </label>
                      <label className="block">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">What's still missing?</span>
                        <Input
                          value={s.missingInfo}
                          onChange={(e) => updateSection(def.key, { missingInfo: e.target.value })}
                          placeholder="Question to ask next…"
                          className="mt-1 bg-muted/40 border-border h-9 text-xs"
                        />
                      </label>
                    </div>

                    <Textarea
                      value={s.adminNote}
                      onChange={(e) => updateSection(def.key, { adminNote: e.target.value })}
                      placeholder="Admin-only note (never client-visible)…"
                      className="bg-muted/30 border-border/60 min-h-[50px] text-xs"
                    />

                    <div className="flex items-center gap-4 flex-wrap pt-1">
                      <label className="inline-flex items-center gap-2 text-[11px] text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={s.needsValidation}
                          onChange={(e) => updateSection(def.key, { needsValidation: e.target.checked })}
                        />
                        Still needs validation
                      </label>
                      <label className="inline-flex items-center gap-2 text-[11px] text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={s.clientSafe}
                          onChange={(e) => updateSection(def.key, { clientSafe: e.target.checked })}
                        />
                        Include in client-safe view
                      </label>
                      {def.key === "implementation_tasks" && s.value.trim() && (
                        <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground">
                          Suggestions only — never auto-created
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Client-safe summary + admin notes — separated */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
              <div className="bg-card border border-primary/30 rounded-xl p-5 space-y-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <h3 className="text-sm text-foreground font-medium">Client-safe process summary</h3>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Plain-language paragraph the client can see. Once written, mark status "Client-safe approved".
                </p>
                <Textarea
                  value={proc.clientSafeSummary}
                  onChange={(e) => update({ clientSafeSummary: e.target.value })}
                  placeholder="What this process is, where it breaks, and what the fix looks like — in their language…"
                  className="bg-muted/40 border-border min-h-[140px]"
                />
              </div>

              <div className="bg-card border border-border rounded-xl p-5 space-y-2">
                <div className="flex items-center gap-2">
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm text-foreground font-medium">Admin-only strategy notes</h3>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Sequencing, internal levers, escalation, validation questions. Never appears in the client portal.
                </p>
                <Textarea
                  value={proc.adminNotes}
                  onChange={(e) => update({ adminNotes: e.target.value })}
                  placeholder="Sequencing, blockers, validation backlog…"
                  className="bg-muted/40 border-border min-h-[140px]"
                />
              </div>
            </div>
          </>
        );
      }}
    </ToolRunnerShell>
  );
}

function GearSelect({ value, onChange }: { value: TargetGear | null; onChange: (g: TargetGear | null) => void }) {
  return (
    <div className="flex items-center gap-2 mt-1">
      <Compass className="h-3.5 w-3.5 text-muted-foreground" />
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : (Number(e.target.value) as TargetGear))}
        className="bg-muted/40 border border-border rounded-md px-2 py-1.5 text-xs text-foreground h-9 flex-1"
      >
        <option value="">Ungeared</option>
        {TARGET_GEARS.map((g) => (
          <option key={g.gear} value={g.gear}>{g.short}</option>
        ))}
      </select>
    </div>
  );
}

function SeedField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 bg-muted/40 border-border h-9 text-xs"
      />
    </label>
  );
}

function SeedTextarea({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 bg-muted/40 border-border min-h-[60px] text-xs"
      />
    </label>
  );
}