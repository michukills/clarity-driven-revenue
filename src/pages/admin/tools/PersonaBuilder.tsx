/**
 * P13.3 — Buyer Persona maturity.
 *
 * Guided, evidence-first persona builder. Replaces the raw 0–5 scoring UX
 * with semantic fit levels and structured sections. Uses the existing
 * ToolRunnerShell for save / load / client + diagnostic_tool_runs emission
 * — no new persistence model.
 */
import { useMemo, useState } from "react";
import ToolRunnerShell from "@/components/tools/ToolRunnerShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, ShieldCheck, Eye, EyeOff, AlertTriangle, FileText, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  PERSONA_SECTIONS,
  PERSONA_STATUS_LABELS,
  FIT_LEVELS,
  emptyPersona,
  hydratePersona,
  deriveStatus,
  buildPersonaSummary,
  buildPersonaFromEvidence,
  clientSafeView,
  mergeAiSeedIntoPersona,
  type AiSeedPersona,
  type PersonaRecord,
  type PersonaSectionKey,
  type PersonaStatus,
  type FitLevel,
  type ConfidenceLevel,
} from "@/lib/persona/builder";

const ARCHETYPES = [
  "Operator-Owner",
  "Stuck Founder",
  "Scaling CEO",
  "Reluctant Manager",
  "Visionary Builder",
  "Service Veteran",
];

interface RunData {
  customerId?: string;
  persona: PersonaRecord;
}

const defaultData: RunData = { persona: emptyPersona() };

export default function PersonaBuilderTool() {
  const [data, setRawData] = useState<RunData>(defaultData);
  const setData = (next: any) => {
    // ToolRunnerShell may pass a freshly-loaded run.data — hydrate defensively.
    if (next && typeof next === "object" && next.persona) {
      setRawData({ ...next, persona: hydratePersona(next.persona) });
    } else if (next && typeof next === "object") {
      setRawData({ persona: hydratePersona(next) });
    } else {
      setRawData(defaultData);
    }
  };

  const persona = data.persona ?? emptyPersona();
  const update = (patch: Partial<PersonaRecord>) =>
    setRawData({ ...data, persona: { ...persona, ...patch } });
  const updateSection = (key: PersonaSectionKey, patch: Partial<PersonaRecord["sections"][PersonaSectionKey]>) => {
    setRawData({
      ...data,
      persona: {
        ...persona,
        sections: { ...persona.sections, [key]: { ...persona.sections[key], ...patch } },
      },
    });
  };

  const derived = useMemo(() => deriveStatus(persona), [persona]);
  const summary = useMemo(() => buildPersonaSummary(persona), [persona]);
  const safeView = useMemo(() => clientSafeView(persona), [persona]);
  const [generating, setGenerating] = useState(false);
  // customerId is read from ToolRunnerShell via the render-prop child.
  const [shellCustomerId, setShellCustomerId] = useState<string>("");

  // ── AI Persona Seed state ───────────────────────────────────────────────
  const [seedOpen, setSeedOpen] = useState(false);
  const [seedBusy, setSeedBusy] = useState(false);
  const [seedError, setSeedError] = useState<string | null>(null);
  const [seed, setSeed] = useState({
    product_name: "",
    product_description: "",
    problem_solved: "",
    price_or_range: "",
    target_market: "",
    buyer_type: "",
    best_customers: "",
    bad_fit_customers: "",
    sales_notes: "",
  });
  const [seedOverwrite, setSeedOverwrite] = useState(false);

  const generateAiSeed = async () => {
    if (!seed.product_name.trim() && !seed.product_description.trim() && !seed.problem_solved.trim()) {
      toast.error("Add at least a product name, description, or the problem it solves.");
      return;
    }
    setSeedBusy(true);
    setSeedError(null);
    try {
      const { data: resp, error } = await supabase.functions.invoke("persona-ai-seed", {
        body: seed,
      });
      if (error) {
        // supabase.functions.invoke wraps non-2xx; surface the friendly message.
        const msg = (resp as any)?.error ?? error.message ?? "AI draft unavailable.";
        setSeedError(msg);
        toast.error(msg);
        return;
      }
      const aiPersona = (resp as { persona?: AiSeedPersona })?.persona;
      if (!aiPersona) {
        setSeedError("AI returned no persona payload.");
        toast.error("AI returned no persona payload.");
        return;
      }
      const { persona: next } = mergeAiSeedIntoPersona(persona, aiPersona, { overwrite: seedOverwrite });
      setRawData({ ...data, persona: next });
      toast.success(
        `Hypothesis persona drafted (${aiPersona.confidence ?? "low"} confidence). Review and edit before saving.`,
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
      const { persona: next, rationale } = await buildPersonaFromEvidence(customerId, persona);
      setRawData({ ...data, persona: next });
      toast.success(rationale);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not build draft from evidence.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <ToolRunnerShell
      toolKey="buyer_persona_tool"
      toolTitle="Buyer Persona Builder"
      description="Guided, evidence-first persona for this client. Semantic fit levels replace raw scoring; client-safe and admin-only views are kept separate."
      data={data}
      setData={setData}
      defaultData={defaultData}
      computeSummary={() => buildPersonaSummary(persona)}
      clientPreview={
        <div className="space-y-3">
          <div className="text-sm text-foreground font-medium">{persona.name || "Untitled persona"}</div>
          {safeView.summary ? (
            <p className="text-sm text-foreground/90 leading-relaxed">{safeView.summary}</p>
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
          {/* Status hero — semantic, not a raw score */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Persona status</div>
            <div className="text-lg text-foreground">{PERSONA_STATUS_LABELS[derived]}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {summary.sections_filled} / {summary.sections_total} sections drafted · {summary.band}
            </div>
            <div className="mt-3">
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Override status</label>
              <select
                value={persona.status}
                onChange={(e) => update({ status: e.target.value as PersonaStatus })}
                className="mt-1 w-full bg-muted/40 border border-border rounded-md px-3 py-2 text-sm text-foreground h-10"
              >
                {(Object.keys(PERSONA_STATUS_LABELS) as PersonaStatus[]).map((s) => (
                  <option key={s} value={s}>{PERSONA_STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Build from evidence */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Automation assist</div>
            <p className="text-xs text-muted-foreground">
              Pulls only from this client's profile, intake, connected sources, insight memory, and pipeline notes. Thin evidence stays flagged for validation.
            </p>
            <Button
              onClick={() => generate(shellCustomerId)}
              disabled={generating || !shellCustomerId}
              variant="outline"
              className="w-full border-border justify-start"
            >
              <Sparkles className="h-4 w-4" /> {generating ? "Building…" : "Build From Evidence"}
            </Button>
            {!shellCustomerId && (
              <p className="text-[11px] text-[hsl(40_90%_60%)]">Select a client above to enable.</p>
            )}
          </div>

          {/* Evidence trail */}
          {persona.evidenceTrail.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Evidence used</div>
              <ul className="space-y-1.5">
                {persona.evidenceTrail.slice(0, 8).map((t, i) => (
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
        // Sync ToolRunnerShell's selected client into local state so the
        // right-panel "Build From Evidence" button can react to it.
        if (ctx.customerId !== shellCustomerId) {
          // Defer to avoid setState during render.
          queueMicrotask(() => setShellCustomerId(ctx.customerId));
        }
        return (
          <>
            {/* Identity */}
            <div className="bg-card border border-border rounded-xl p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Persona name</span>
            <Input
              value={persona.name}
              onChange={(e) => update({ name: e.target.value })}
              placeholder="e.g. Operator-Owner Olivia"
              className="mt-1 bg-muted/40 border-border"
            />
          </label>
          <label className="block">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Archetype</span>
            <select
              value={persona.archetype}
              onChange={(e) => update({ archetype: e.target.value })}
              className="mt-1 w-full bg-muted/40 border border-border rounded-md px-3 py-2 text-sm text-foreground h-10"
            >
              {ARCHETYPES.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </label>
        </div>
      </div>

      {/* Guided sections */}
      <div className="space-y-4">
        {PERSONA_SECTIONS.map((def) => {
          const s = persona.sections[def.key];
          return (
            <div key={def.key} className="bg-card border border-border rounded-xl p-5 space-y-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm text-foreground font-medium">{def.label}</h3>
                    {!def.clientSafeAllowed && (
                      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                        <EyeOff className="h-3 w-3" /> admin-only
                      </span>
                    )}
                    {s.needsValidation && s.value.trim() && (
                      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-[hsl(40_90%_60%)]">
                        <AlertTriangle className="h-3 w-3" /> needs validation
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{def.hint}</p>
                </div>
                {def.hasFit && (
                  <FitLevelSelect
                    value={s.fit ?? "unknown"}
                    onChange={(fit) => updateSection(def.key, { fit })}
                  />
                )}
              </div>

              <p className="text-[11px] text-muted-foreground italic">{def.prompt}</p>

              <Textarea
                value={s.value}
                onChange={(e) => updateSection(def.key, { value: e.target.value })}
                placeholder="Capture the evidence in plain language…"
                className="bg-muted/40 border-border min-h-[80px]"
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <label className="block">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Source / context</span>
                  <Input
                    value={s.source}
                    onChange={(e) => updateSection(def.key, { source: e.target.value })}
                    placeholder="Intake answer, sales call, QBO data…"
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

              <div className="flex items-center gap-4 flex-wrap pt-1">
                <label className="inline-flex items-center gap-2 text-[11px] text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={s.needsValidation}
                    onChange={(e) => updateSection(def.key, { needsValidation: e.target.checked })}
                  />
                  Still needs validation
                </label>
                {def.clientSafeAllowed ? (
                  <label className="inline-flex items-center gap-2 text-[11px] text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={s.clientSafe}
                      onChange={(e) => updateSection(def.key, { clientSafe: e.target.checked })}
                    />
                    Include in client-safe view
                  </label>
                ) : (
                  <span className="text-[11px] text-muted-foreground italic">
                    Schema-locked admin-only — never shown to client.
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Client-safe summary + admin notes — separated */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-primary/30 rounded-xl p-5 space-y-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <h3 className="text-sm text-foreground font-medium">Client-safe persona summary</h3>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Plain-language paragraph the client can see. Once written, mark status "Client-safe approved".
          </p>
          <Textarea
            value={persona.clientSafeSummary}
            onChange={(e) => update({ clientSafeSummary: e.target.value })}
            placeholder="Who this buyer is, what they care about, and what they want from this engagement…"
            className="bg-muted/40 border-border min-h-[140px]"
          />
        </div>

        <div className="bg-card border border-border rounded-xl p-5 space-y-2">
          <div className="flex items-center gap-2">
            <EyeOff className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm text-foreground font-medium">Admin-only strategy notes</h3>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Sales context, internal angles, follow-up plays. Never appears in the client portal.
          </p>
          <Textarea
            value={persona.adminNotes}
            onChange={(e) => update({ adminNotes: e.target.value })}
            placeholder="Account intel, deal strategy, sequencing…"
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

function FitLevelSelect({ value, onChange }: { value: FitLevel; onChange: (v: FitLevel) => void }) {
  const cur = FIT_LEVELS.find((l) => l.key === value) ?? FIT_LEVELS[0];
  return (
    <div className="flex items-center gap-2">
      <span
        className="inline-block h-2 w-2 rounded-full"
        style={{ backgroundColor: cur.tone }}
        title={cur.hint}
      />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as FitLevel)}
        className="bg-muted/40 border border-border rounded-md px-2 py-1.5 text-xs text-foreground h-8"
      >
        {FIT_LEVELS.map((l) => (
          <option key={l.key} value={l.key}>{l.label}</option>
        ))}
      </select>
    </div>
  );
}

export { FileText }; // keep tree-shake-friendly named exports tidy