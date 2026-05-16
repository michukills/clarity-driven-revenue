/**
 * P13.4 — Customer Journey Mapper maturity.
 *
 * Guided, evidence-first 8-stage journey builder. Replaces the blank
 * manual text fields with stage cards that prompt for buyer mindset,
 * question, friction, recommended action, and target gear. Uses the
 * existing ToolRunnerShell (canonical key `customer_journey_mapper`)
 * for save / load / diagnostic_tool_runs emission.
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
  JOURNEY_STAGES,
  JOURNEY_STATUS_LABELS,
  emptyJourney,
  hydrateJourney,
  deriveStatus,
  buildJourneySummary,
  buildJourneyFromEvidence,
  clientSafeView,
  mergeAiSeedIntoJourney,
  type AiSeedJourney,
  type JourneyRecord,
  type JourneyStageKey,
  type JourneyStatus,
  type ConfidenceLevel,
} from "@/lib/journey/builder";
import { TARGET_GEARS, type TargetGear } from "@/lib/gears/targetGear";

interface RunData {
  customerId?: string;
  journey: JourneyRecord;
}

const defaultData: RunData = { journey: emptyJourney() };

export default function JourneyMapperTool() {
  const [data, setRawData] = useState<RunData>(defaultData);
  const setData = (next: any) => {
    if (next && typeof next === "object" && next.journey) {
      setRawData({ ...next, journey: hydrateJourney(next.journey) });
    } else if (next && typeof next === "object") {
      setRawData({ journey: hydrateJourney(next) });
    } else {
      setRawData(defaultData);
    }
  };

  const journey = data.journey ?? emptyJourney();
  const update = (patch: Partial<JourneyRecord>) =>
    setRawData({ ...data, journey: { ...journey, ...patch } });
  const updateStage = (key: JourneyStageKey, patch: Partial<JourneyRecord["stages"][JourneyStageKey]>) => {
    setRawData({
      ...data,
      journey: {
        ...journey,
        stages: { ...journey.stages, [key]: { ...journey.stages[key], ...patch } },
      },
    });
  };

  const derived = useMemo(() => deriveStatus(journey), [journey]);
  const summary = useMemo(() => buildJourneySummary(journey), [journey]);
  const safeView = useMemo(() => clientSafeView(journey), [journey]);
  const [generating, setGenerating] = useState(false);
  const [shellCustomerId, setShellCustomerId] = useState<string>("");

  // ── AI Seed state ─────────────────────────────────────────────────────
  const [seedOpen, setSeedOpen] = useState(false);
  const [seedBusy, setSeedBusy] = useState(false);
  const [seedError, setSeedError] = useState<string | null>(null);
  const [seedEnvelope, setSeedEnvelope] = useState<AiOutputEnvelope | null>(null);
  const [seed, setSeed] = useState({
    product_name: "",
    product_description: "",
    problem_solved: "",
    price_or_range: "",
    target_market: "",
    buyer_type: "",
    persona_hint: "",
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
      const { data: resp, error } = await supabase.functions.invoke("journey-ai-seed", { body: seed });
      if (error) {
        const msg = (resp as any)?.error ?? error.message ?? "AI draft unavailable.";
        setSeedError(msg);
        toast.error(msg);
        return;
      }
      const aiJourney = (resp as { journey?: AiSeedJourney })?.journey;
      const envelope = extractAiOutputEnvelope(resp);
      setSeedEnvelope(envelope);
      if (!aiJourney) {
        setSeedError("AI returned no journey payload.");
        toast.error("AI returned no journey payload.");
        return;
      }
      const { journey: next } = mergeAiSeedIntoJourney(journey, aiJourney, { overwrite: seedOverwrite });
      setRawData({ ...data, journey: next });
      toast.success(
        `Hypothesis journey drafted (${aiJourney.confidence ?? "low"} confidence). Review and edit before saving.`,
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
      const { journey: next, rationale } = await buildJourneyFromEvidence(customerId, journey);
      setRawData({ ...data, journey: next });
      toast.success(rationale);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not build journey from evidence.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <ToolRunnerShell
      toolKey="customer_journey_mapper"
      toolTitle="Customer Journey Mapping System™"
      description="Guided, evidence-first journey across the 8 RGS stages. Client-safe and admin-only views are kept separate."
      data={data}
      setData={setData}
      defaultData={defaultData}
      computeSummary={() => buildJourneySummary(journey)}
      clientPreview={
        <div className="space-y-3">
          {safeView.summary ? (
            <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{safeView.summary}</p>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              No client-safe summary written yet. Add one before sharing.
            </p>
          )}
          {safeView.stages.length > 0 ? (
            <div className="space-y-2">
              {safeView.stages.map((s) => (
                <div key={s.label} className="rounded-md border border-border bg-muted/20 p-3">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{s.label}</div>
                  {s.mindset && <div className="text-sm text-foreground mt-1 whitespace-pre-wrap">{s.mindset}</div>}
                  {s.question && (
                    <div className="text-xs text-foreground/80 mt-1 italic">"{s.question}"</div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              No stages marked client-safe yet.
            </p>
          )}
        </div>
      }
      rightPanel={
        <div className="space-y-4">
          {/* Status hero */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Journey status</div>
            <div className="text-lg text-foreground">{JOURNEY_STATUS_LABELS[derived]}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {summary.stages_filled} / {summary.stages_total} stages drafted · {summary.friction_stages} friction point{summary.friction_stages === 1 ? "" : "s"}
            </div>
            <div className="mt-3">
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Override status</label>
              <select
                value={journey.status}
                onChange={(e) => update({ status: e.target.value as JourneyStatus })}
                className="mt-1 w-full bg-muted/40 border border-border rounded-md px-3 py-2 text-sm text-foreground h-10"
              >
                {(Object.keys(JOURNEY_STATUS_LABELS) as JourneyStatus[]).map((s) => (
                  <option key={s} value={s}>{JOURNEY_STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
          </div>

          {/* AI Journey Seed */}
          <div className="bg-card border border-primary/30 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-primary" />
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">AI Journey Seed</div>
            </div>
            <p className="text-xs text-muted-foreground">
              Generate a <span className="text-foreground">hypothesis</span> journey from a product / problem / persona seed.
              Output is labelled "needs validation" until you confirm each stage.
            </p>
            {!seedOpen ? (
              <Button onClick={() => setSeedOpen(true)} variant="outline" className="w-full border-primary/40 justify-start">
                <Wand2 className="h-4 w-4" /> Open AI Seed
              </Button>
            ) : (
              <div className="space-y-2">
                <SeedField label="Product / service name" value={seed.product_name}
                  onChange={(v) => setSeed((s) => ({ ...s, product_name: v }))}
                  placeholder="e.g. RGS Stability Diagnostic" />
                <SeedTextarea label="Product / service description" value={seed.product_description}
                  onChange={(v) => setSeed((s) => ({ ...s, product_description: v }))}
                  placeholder="What it actually does, in one short paragraph." />
                <SeedTextarea label="Problem it solves" value={seed.problem_solved}
                  onChange={(v) => setSeed((s) => ({ ...s, problem_solved: v }))}
                  placeholder="The pain the buyer is feeling before they engage." />
                <div className="grid grid-cols-2 gap-2">
                  <SeedField label="Price / range" value={seed.price_or_range}
                    onChange={(v) => setSeed((s) => ({ ...s, price_or_range: v }))} placeholder="$2k–$10k…" />
                  <SeedField label="Target market" value={seed.target_market}
                    onChange={(v) => setSeed((s) => ({ ...s, target_market: v }))} placeholder="US service SMBs…" />
                </div>
                <SeedField label="Buyer type (optional)" value={seed.buyer_type}
                  onChange={(v) => setSeed((s) => ({ ...s, buyer_type: v }))}
                  placeholder="Operator-owner, marketing director…" />
                <SeedField label="Persona hint (optional)" value={seed.persona_hint}
                  onChange={(v) => setSeed((s) => ({ ...s, persona_hint: v }))}
                  placeholder="e.g. Operator-Owner Olivia, $1M services" />
                <SeedTextarea label="Best-fit customers (optional)" value={seed.best_customers}
                  onChange={(v) => setSeed((s) => ({ ...s, best_customers: v }))}
                  placeholder="Patterns from your strongest closes." />
                <SeedTextarea label="Bad-fit customers (optional)" value={seed.bad_fit_customers}
                  onChange={(v) => setSeed((s) => ({ ...s, bad_fit_customers: v }))}
                  placeholder="Patterns from churn or no-shows." />
                <SeedTextarea label="Sales / review notes (optional)" value={seed.sales_notes}
                  onChange={(v) => setSeed((s) => ({ ...s, sales_notes: v }))}
                  placeholder="Any qualitative signal you've collected." />
                <label className="inline-flex items-center gap-2 text-[11px] text-muted-foreground pt-1">
                  <input type="checkbox" checked={seedOverwrite} onChange={(e) => setSeedOverwrite(e.target.checked)} />
                  Overwrite stages that already have content
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
                    title="AI journey draft — review metadata"
                  />
                )}
                <div className="flex items-center gap-2 pt-1">
                  <Button onClick={generateAiSeed} disabled={seedBusy} className="flex-1 justify-center">
                    <Sparkles className="h-4 w-4" />
                    {seedBusy ? "Generating…" : "Generate hypothesis journey"}
                  </Button>
                  <Button onClick={() => setSeedOpen(false)} variant="ghost" disabled={seedBusy}>Cancel</Button>
                </div>
                <p className="text-[10px] text-muted-foreground italic">
                  Output is a hypothesis. Friction and recommended actions stay admin-only by default. Always validate before sharing.
                </p>
              </div>
            )}
          </div>

          {/* Build from evidence */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Automation assist</div>
            <p className="text-xs text-muted-foreground">
              Pulls only from this client's profile, latest persona, intake, pipeline, sources, and insight memory. Thin evidence stays flagged.
            </p>
            <Button
              onClick={() => generate(shellCustomerId)}
              disabled={generating || !shellCustomerId}
              variant="outline"
              className="w-full border-border justify-start"
            >
              <Sparkles className="h-4 w-4" /> {generating ? "Building…" : "Build Journey From Evidence"}
            </Button>
            {!shellCustomerId && (
              <p className="text-[11px] text-[hsl(40_90%_60%)]">Select a client above to enable.</p>
            )}
          </div>

          {/* Evidence trail */}
          {journey.evidenceTrail.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Evidence used</div>
              <ul className="space-y-1.5">
                {journey.evidenceTrail.slice(0, 8).map((t, i) => (
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
            {/* Stage cards */}
            <div className="space-y-4">
              {JOURNEY_STAGES.map((def, idx) => {
                const s = journey.stages[def.key];
                return (
                  <div key={def.key} className="bg-card border border-border rounded-xl p-5 space-y-3">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0 flex items-start gap-3">
                        <span className="h-7 w-7 mt-0.5 rounded-full bg-primary/15 text-primary text-xs flex items-center justify-center tabular-nums shrink-0">{idx + 1}</span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm text-foreground font-medium">{def.label}</h3>
                            {s.needsValidation && (s.buyerMindset.trim() || s.buyerQuestion.trim() || s.frictionPoint.trim() || s.recommendedAction.trim()) && (
                              <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-[hsl(40_90%_60%)]">
                                <AlertTriangle className="h-3 w-3" /> needs validation
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{def.hint}</p>
                        </div>
                      </div>
                      <GearSelect value={s.targetGear} onChange={(g) => updateStage(def.key, { targetGear: g })} />
                    </div>

                    <p className="text-[11px] text-muted-foreground italic">{def.prompt}</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <label className="block">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Buyer mindset</span>
                        <Textarea
                          value={s.buyerMindset}
                          onChange={(e) => updateStage(def.key, { buyerMindset: e.target.value })}
                          placeholder="What are they thinking and feeling here?"
                          className="mt-1 bg-muted/40 border-border min-h-[70px]"
                        />
                      </label>
                      <label className="block">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Buyer question</span>
                        <Textarea
                          value={s.buyerQuestion}
                          onChange={(e) => updateStage(def.key, { buyerQuestion: e.target.value })}
                          placeholder="The question they're privately asking themselves."
                          className="mt-1 bg-muted/40 border-border min-h-[70px]"
                        />
                      </label>
                      <label className="block">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Friction point <span className="normal-case text-muted-foreground/70">(admin)</span></span>
                        <Textarea
                          value={s.frictionPoint}
                          onChange={(e) => updateStage(def.key, { frictionPoint: e.target.value })}
                          placeholder="Where the journey breaks down here."
                          className="mt-1 bg-muted/40 border-border min-h-[70px]"
                        />
                      </label>
                      <label className="block">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Recommended RGS action <span className="normal-case text-muted-foreground/70">(admin)</span></span>
                        <Textarea
                          value={s.recommendedAction}
                          onChange={(e) => updateStage(def.key, { recommendedAction: e.target.value })}
                          placeholder="What RGS should do at this stage."
                          className="mt-1 bg-muted/40 border-border min-h-[70px]"
                        />
                      </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <label className="block">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Evidence / source</span>
                        <Input
                          value={s.evidenceSource}
                          onChange={(e) => updateStage(def.key, { evidenceSource: e.target.value })}
                          placeholder="Intake, pipeline, persona…"
                          className="mt-1 bg-muted/40 border-border h-9 text-xs"
                        />
                      </label>
                      <label className="block">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Confidence</span>
                        <select
                          value={s.confidence}
                          onChange={(e) => updateStage(def.key, { confidence: e.target.value as ConfidenceLevel })}
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
                          onChange={(e) => updateStage(def.key, { missingInfo: e.target.value })}
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
                          onChange={(e) => updateStage(def.key, { needsValidation: e.target.checked })}
                        />
                        Still needs validation
                      </label>
                      <label className="inline-flex items-center gap-2 text-[11px] text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={s.clientSafe}
                          onChange={(e) => updateStage(def.key, { clientSafe: e.target.checked })}
                        />
                        Include mindset & question in client-safe view
                      </label>
                      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground ml-auto">
                        <EyeOff className="h-3 w-3" /> friction & action stay admin-only
                      </span>
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
                  <h3 className="text-sm text-foreground font-medium">Client-safe journey summary</h3>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Plain-language paragraph the client can see. Once written, mark status "Client-safe approved".
                </p>
                <Textarea
                  value={journey.clientSafeSummary}
                  onChange={(e) => update({ clientSafeSummary: e.target.value })}
                  placeholder="How this buyer moves from awareness to retention, in their language…"
                  className="bg-muted/40 border-border min-h-[140px]"
                />
              </div>

              <div className="bg-card border border-border rounded-xl p-5 space-y-2">
                <div className="flex items-center gap-2">
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm text-foreground font-medium">Admin-only strategy notes</h3>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Sequencing, internal levers, validation questions. Never appears in the client portal.
                </p>
                <Textarea
                  value={journey.adminNotes}
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

function GearSelect({ value, onChange }: { value: TargetGear | null; onChange: (g: TargetGear | null) => void }) {
  return (
    <div className="flex items-center gap-2">
      <Compass className="h-3.5 w-3.5 text-muted-foreground" />
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : (Number(e.target.value) as TargetGear))}
        className="bg-muted/40 border border-border rounded-md px-2 py-1.5 text-xs text-foreground h-8"
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