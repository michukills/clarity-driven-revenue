import { useMemo, useState } from "react";
import ToolRunnerShell from "@/components/tools/ToolRunnerShell";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
} from "recharts";
import { Download, FileText, AlertTriangle, Sparkles, Target, Plus, Trash2, Eye, EyeOff } from "lucide-react";
import { downloadCSV, generateRunPdf } from "@/lib/exports";
import { PERSONA_FIT_CATEGORIES, legacyFitToSeverity } from "@/lib/diagnostics/categories/persona";
import {
  buildDefaultSeverities,
  computeDiagnostic,
  hydrateSeverities,
  type SeverityMap,
  type EvidenceMap,
  type FactorEvidence,
  type Severity as DiagSeverity,
} from "@/lib/diagnostics/engine";
import { DiagnosticAdminPanel } from "@/components/diagnostics/DiagnosticAdminPanel";
import { DiagnosticReport } from "@/components/diagnostics/DiagnosticReport";
import { DiagnosticClientView } from "@/components/diagnostics/DiagnosticClientView";
import { DiagnosticNotesPanel } from "@/components/diagnostics/DiagnosticNotesPanel";

type Persona = {
  id: string;
  name: string;
  archetype: string;
  role: string;
  industry: string;
  company_size: string;
  revenue_range: string;
  geography: string;
  /**
   * Engine-shaped severities keyed by `${categoryKey}.${factorKey}`.
   * 0 = ideal fit, 5 = wrong fit (inverted from the legacy 1..5 score).
   */
  severities: SeverityMap;
  evidence: EvidenceMap;
  // Story
  goals: string;
  pains: string;
  triggers: string;
  objections: string;
  decision_criteria: string;
  // GTM
  channels: string;
  message: string;
  proof_needed: string;
  disqualifiers: string;
  /** Admin-only sales/strategy notes — never shown to client. */
  notes: string;
  /** Plain-language note rendered in the client view. */
  client_notes: string;
};

const blankPersona = (): Persona => ({
  id: crypto.randomUUID(),
  name: "",
  archetype: "Operator-Owner",
  role: "",
  industry: "",
  company_size: "",
  revenue_range: "",
  geography: "",
  severities: buildDefaultSeverities(PERSONA_FIT_CATEGORIES),
  evidence: {},
  goals: "",
  pains: "",
  triggers: "",
  objections: "",
  decision_criteria: "",
  channels: "",
  message: "",
  proof_needed: "",
  disqualifiers: "",
  notes: "",
  client_notes: "",
});

const ARCHETYPES = [
  "Operator-Owner",
  "Stuck Founder",
  "Scaling CEO",
  "Reluctant Manager",
  "Visionary Builder",
  "Service Veteran",
];

/** Persona fit factor keys, in stable display order. Mirrors PERSONA_FIT_CATEGORIES[0]. */
const FIT_FACTOR_KEYS = ["urgency", "budget", "authority", "self_aware", "coachable"] as const;
const FIT_LABELS = PERSONA_FIT_CATEGORIES[0].factors.map((f) => ({
  key: f.key as (typeof FIT_FACTOR_KEYS)[number],
  label: f.label,
  help: f.lookFor ?? "",
}));

const defaultData: { personas: Persona[]; activeId: string; segment_notes: string } = {
  personas: [{ ...blankPersona(), name: "Persona 1" }],
  activeId: "",
  segment_notes: "",
};
defaultData.activeId = defaultData.personas[0].id;

/**
 * Forward-compatible loader: an older saved persona may contain a `fit: {urgency:1..5,…}`
 * block instead of a `severities` map. Convert it on read so old tool_runs still load.
 */
function hydratePersona(p: any): Persona {
  if (!p) return blankPersona();
  const sev = hydrateSeverities(PERSONA_FIT_CATEGORIES, p.severities);
  // Migrate legacy fit (1..5, higher=better) → severity (0..5, higher=worse).
  if (p.fit && (!p.severities || Object.keys(p.severities).length === 0)) {
    for (const k of FIT_FACTOR_KEYS) {
      if (typeof p.fit[k] === "number") sev[`fit.${k}`] = legacyFitToSeverity(p.fit[k]);
    }
  }
  return {
    ...blankPersona(),
    ...p,
    severities: sev,
    evidence: p.evidence ?? {},
    client_notes: p.client_notes ?? "",
  };
}

function diagnosticFor(p: Persona) {
  return computeDiagnostic(PERSONA_FIT_CATEGORIES, p.severities, {});
}
function fitScore(p: Persona) {
  return diagnosticFor(p).score;
}

function fitBand(score: number) {
  if (score >= 80) return { label: "Ideal Client", color: "hsl(140 60% 45%)", desc: "High intent, ready to buy, will succeed in delivery." };
  if (score >= 65) return { label: "Strong Fit", color: "hsl(95 50% 45%)", desc: "Qualified — minor friction in close or onboarding." };
  if (score >= 50) return { label: "Workable", color: "hsl(40 80% 50%)", desc: "Possible win, but expect longer cycle and education." };
  if (score >= 35) return { label: "Marginal", color: "hsl(20 80% 55%)", desc: "Likely drag on close rate or delivery margin." };
  return { label: "Wrong Fit", color: "hsl(0 70% 55%)", desc: "Disqualify early — protect pipeline quality." };
}

function generateInsights(p: Persona) {
  const risks: string[] = [];
  const opps: string[] = [];
  // severities are inverted: 0 = ideal, 5 = wrong fit. Treat sev>=3 as risk, <=1 as opp.
  const sev = (k: string) => Number(p.severities[`fit.${k}`] ?? 0);
  if (sev("urgency") >= 3) risks.push("Low urgency — buying cycle will stall without an external trigger.");
  if (sev("budget") >= 3) risks.push("Budget capacity is thin — expect heavy price negotiation or churn.");
  if (sev("authority") >= 3) risks.push("Limited decision authority — multi-stakeholder deal, plan for it.");
  if (sev("self_aware") >= 3) risks.push("Low self-awareness — sales will be education-heavy, not transactional.");
  if (sev("coachable") >= 3) risks.push("Low coachability — implementation risk is high; results likely poor.");
  if (!p.message.trim()) risks.push("No resonant message defined — outbound will underperform.");
  if (!p.proof_needed.trim()) risks.push("Proof requirements unclear — sales will fall back to discounts.");
  if (!p.disqualifiers.trim()) risks.push("No disqualifiers defined — pipeline will fill with bad-fit leads.");

  if (sev("urgency") <= 1 && sev("budget") <= 1) opps.push("High-urgency + funded — prioritize this segment in outbound.");
  if (sev("authority") <= 1) opps.push("Single-decision-maker profile — short cycle is achievable.");
  if (sev("self_aware") <= 1) opps.push("Self-aware buyer — lead with diagnosis, not education.");
  if (sev("coachable") <= 1) opps.push("Highly coachable — case study and testimonial yield will be strong.");
  if (p.channels.trim()) opps.push(`Concentrate channel spend: ${p.channels.split(/[,\n]/)[0].trim()}.`);

  return { risks, opps };
}

export default function PersonaBuilderTool() {
  const [data, setData] = useState<typeof defaultData>(defaultData);

  const personas = data.personas ?? [];
  const active = personas.find((p) => p.id === data.activeId) ?? personas[0];

  const updateActive = (patch: Partial<Persona>) => {
    setData({
      ...data,
      personas: personas.map((p) => (p.id === active.id ? { ...p, ...patch } : p)),
    });
  };
  const setSeverity = (catKey: string, factorKey: string, v: DiagSeverity) =>
    updateActive({ severities: { ...active.severities, [`${catKey}.${factorKey}`]: v } });
  const setEvidence = (catKey: string, factorKey: string, e: FactorEvidence) =>
    updateActive({ evidence: { ...(active.evidence ?? {}), [`${catKey}.${factorKey}`]: e } });
  /** Display value 1..5 (legacy "higher = better") derived from internal severity 0..5. */
  const fitDisplay = (factorKey: string) => 5 - Number(active.severities[`fit.${factorKey}`] ?? 0);

  const addPersona = () => {
    const np = { ...blankPersona(), name: `Persona ${personas.length + 1}` };
    setData({ ...data, personas: [...personas, np], activeId: np.id });
  };
  const removePersona = (id: string) => {
    if (personas.length <= 1) return;
    const next = personas.filter((p) => p.id !== id);
    setData({ ...data, personas: next, activeId: next[0].id });
  };

  const score = active ? fitScore(active) : 0;
  const band = fitBand(score);
  const insights = active ? generateInsights(active) : { risks: [], opps: [] };
  const [previewClient, setPreviewClient] = useState(false);

  const personaIntro = (p: Persona) =>
    `${p.name || "This persona"} — ${p.archetype}${p.role ? `, ${p.role}` : ""}. ` +
    `Ideal-fit read across urgency, budget, authority, self-awareness, and coachability. ` +
    `Higher score = stronger fit; lower score = revenue risk if pursued without adjustment.`;

  const radarData = useMemo(
    () =>
      FIT_LABELS.map((f) => ({
        dimension: f.label,
        value: active ? 5 - Number(active.severities[`fit.${f.key}`] ?? 0) : 0,
        full: 5,
      })),
    [active],
  );

  const compareData = useMemo(
    () =>
      personas.map((p) => ({
        name: p.name || "Unnamed",
        score: fitScore(p),
        color: fitBand(fitScore(p)).color,
      })),
    [personas],
  );

  const exportPDF = () => {
    if (!active) return;
    const sections: any[] = [
      { type: "heading", text: "Persona Profile" },
      {
        type: "kv",
        pairs: [
          ["Name", active.name || "—"],
          ["Archetype", active.archetype],
          ["Role", active.role || "—"],
          ["Industry", active.industry || "—"],
          ["Company size", active.company_size || "—"],
          ["Revenue range", active.revenue_range || "—"],
          ["Geography", active.geography || "—"],
        ],
      },
      { type: "spacer" },
      { type: "heading", text: "Ideal-Fit Score" },
      { type: "paragraph", text: `${score}/100 — ${band.label}. ${band.desc}` },
      { type: "spacer" },
      { type: "subheading", text: "Fit Dimensions" },
      ...FIT_LABELS.map((f) => ({
        type: "bar" as const,
        label: f.label,
        value: 5 - Number(active.severities[`fit.${f.key}`] ?? 0),
        max: 5,
      })),
      { type: "spacer" },
      { type: "heading", text: "Top Risks" },
      ...(insights.risks.length
        ? insights.risks.map((r) => ({ type: "paragraph" as const, text: `• ${r}` }))
        : [{ type: "paragraph" as const, text: "No critical risks flagged." }]),
      { type: "spacer" },
      { type: "heading", text: "Opportunities" },
      ...(insights.opps.length
        ? insights.opps.map((r) => ({ type: "paragraph" as const, text: `• ${r}` }))
        : [{ type: "paragraph" as const, text: "Add fit signals to surface opportunities." }]),
      { type: "spacer" },
      { type: "heading", text: "Story" },
      { type: "subheading", text: "Goals" },
      { type: "paragraph", text: active.goals || "—" },
      { type: "subheading", text: "Pains" },
      { type: "paragraph", text: active.pains || "—" },
      { type: "subheading", text: "Buying Triggers" },
      { type: "paragraph", text: active.triggers || "—" },
      { type: "subheading", text: "Objections" },
      { type: "paragraph", text: active.objections || "—" },
      { type: "subheading", text: "Decision Criteria" },
      { type: "paragraph", text: active.decision_criteria || "—" },
      { type: "spacer" },
      { type: "heading", text: "Go-To-Market" },
      { type: "subheading", text: "Channels" },
      { type: "paragraph", text: active.channels || "—" },
      { type: "subheading", text: "Resonant Message" },
      { type: "paragraph", text: active.message || "—" },
      { type: "subheading", text: "Proof Required" },
      { type: "paragraph", text: active.proof_needed || "—" },
      { type: "subheading", text: "Disqualifiers" },
      { type: "paragraph", text: active.disqualifiers || "—" },
    ];
    if (active.notes.trim()) {
      sections.push({ type: "spacer" }, { type: "heading", text: "Internal Notes" }, { type: "paragraph", text: active.notes });
    }
    generateRunPdf(`Persona-${active.name || "untitled"}.pdf`, {
      title: active.name || "Buyer Persona",
      subtitle: `${active.archetype} · ${active.role || "—"}${active.industry ? ` · ${active.industry}` : ""}`,
      meta: [
        ["Fit Score", `${score}/100 (${band.label})`],
        ["Generated", new Date().toLocaleString()],
      ],
      sections,
    });
  };

  const exportCSV = () => {
    const rows = personas.map((p) => ({
      name: p.name,
      archetype: p.archetype,
      role: p.role,
      industry: p.industry,
      company_size: p.company_size,
      revenue_range: p.revenue_range,
      geography: p.geography,
      fit_score: fitScore(p),
      fit_band: fitBand(fitScore(p)).label,
      ...Object.fromEntries(FIT_LABELS.map((f) => [`fit_${f.key}`, 5 - Number(p.severities[`fit.${f.key}`] ?? 0)])),
      goals: p.goals,
      pains: p.pains,
      triggers: p.triggers,
      objections: p.objections,
      decision_criteria: p.decision_criteria,
      channels: p.channels,
      message: p.message,
      proof_needed: p.proof_needed,
      disqualifiers: p.disqualifiers,
      notes: p.notes,
    }));
    downloadCSV("personas.csv", rows);
  };

  return (
    <ToolRunnerShell
      toolKey="buyer_persona_tool"
      toolTitle="Buyer Persona Builder"
      description="Define ideal-fit buyer profiles tied to revenue motion. Score fit, surface risks, and align messaging across sales and delivery."
      data={data}
      setData={setData}
      defaultData={defaultData}
      computeSummary={(d) => ({
        personas: d.personas?.length ?? 0,
        ideal: d.personas?.filter((p: Persona) => fitScore(p) >= 80).length ?? 0,
        active_score: d.personas?.find((p: Persona) => p.id === d.activeId) ? fitScore(d.personas.find((p: Persona) => p.id === d.activeId)) : 0,
      })}
      rightPanel={
        <div className="space-y-4">
          {/* Score hero */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Ideal-Fit Score</div>
            <div className="flex items-baseline gap-2">
              <div className="text-4xl font-bold tabular-nums text-foreground">{score}</div>
              <div className="text-sm text-muted-foreground">/ 100</div>
            </div>
            <div
              className="mt-2 inline-flex px-2 py-1 rounded-md text-xs font-medium"
              style={{ backgroundColor: `${band.color}22`, color: band.color }}
            >
              {band.label}
            </div>
            <p className="mt-3 text-xs text-muted-foreground leading-relaxed">{band.desc}</p>
            <div className="mt-4 h-1.5 bg-muted/40 rounded-full overflow-hidden">
              <div className="h-full transition-all" style={{ width: `${score}%`, backgroundColor: band.color }} />
            </div>
          </div>

          {/* Compare across personas */}
          {personas.length > 1 && (
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-3">Persona Comparison</div>
              <div className="h-[160px]">
                <ResponsiveContainer>
                  <BarChart data={compareData} layout="vertical" margin={{ left: 0, right: 20, top: 4, bottom: 4 }}>
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: "hsl(var(--muted) / 0.3)" }} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 11 }} />
                    <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                      {compareData.map((d, i) => (
                        <Cell key={i} fill={d.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Exports */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-2">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Export</div>
            <Button onClick={exportPDF} variant="outline" className="w-full border-border justify-start">
              <FileText className="h-4 w-4" /> PDF report
            </Button>
            <Button onClick={exportCSV} variant="outline" className="w-full border-border justify-start">
              <Download className="h-4 w-4" /> CSV (all personas)
            </Button>
          </div>
        </div>
      }
    >
      {/* Persona switcher */}
      <div className="bg-card border border-border rounded-xl p-3 flex items-center gap-2 flex-wrap">
        {personas.map((p) => {
          const s = fitScore(p);
          const b = fitBand(s);
          const isActive = p.id === active?.id;
          return (
            <button
              key={p.id}
              onClick={() => setData({ ...data, activeId: p.id })}
              className={`group inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                isActive ? "border-primary bg-primary/10 text-foreground" : "border-border bg-muted/20 text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: b.color }} />
              <span>{p.name || "Unnamed"}</span>
              <span className="text-[10px] tabular-nums opacity-70">{s}</span>
              {personas.length > 1 && (
                <span
                  onClick={(e) => { e.stopPropagation(); removePersona(p.id); }}
                  className="ml-1 opacity-0 group-hover:opacity-100 hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </span>
              )}
            </button>
          );
        })}
        <Button onClick={addPersona} size="sm" variant="outline" className="border-border ml-auto">
          <Plus className="h-3.5 w-3.5" /> Add persona
        </Button>
        <Button
          onClick={() => setPreviewClient((v) => !v)}
          size="sm"
          variant="outline"
          className="border-border"
          type="button"
        >
          {previewClient ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {previewClient ? "Exit client preview" : "Client preview"}
        </Button>
      </div>

      {active && previewClient && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
          <div className="text-[11px] uppercase tracking-[0.2em] text-primary mb-3">
            Client preview — admin-only notes hidden
          </div>
          <DiagnosticClientView
            toolEyebrow={`Buyer Persona · ${active.name || "Untitled"}`}
            intro={personaIntro(active)}
            result={diagnosticFor(active)}
            clientNotes={active.client_notes}
            hideMoney
            reportContext={{
              categories: PERSONA_FIT_CATEGORIES,
              severities: active.severities,
              evidence: active.evidence,
            }}
          />
        </div>
      )}

      {active && (
        <Tabs defaultValue="identity" className="w-full">
          <TabsList className="bg-card border border-border h-auto p-1 flex-wrap">
            <TabsTrigger value="identity">Identity</TabsTrigger>
            <TabsTrigger value="fit">Fit Scoring</TabsTrigger>
            <TabsTrigger value="story">Story</TabsTrigger>
            <TabsTrigger value="gtm">Go-To-Market</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
          </TabsList>

          {/* IDENTITY */}
          <TabsContent value="identity" className="mt-4">
            <div className="bg-card border border-border rounded-xl p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Persona name" value={active.name} onChange={(v) => updateActive({ name: v })} placeholder="Operator-Owner Olivia" />
              <div>
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Archetype</span>
                <select
                  value={active.archetype}
                  onChange={(e) => updateActive({ archetype: e.target.value })}
                  className="mt-1 w-full bg-muted/40 border border-border rounded-md px-3 py-2 text-sm text-foreground h-10"
                >
                  {ARCHETYPES.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <Field label="Role / title" value={active.role} onChange={(v) => updateActive({ role: v })} placeholder="Founder / CEO" />
              <Field label="Industry" value={active.industry} onChange={(v) => updateActive({ industry: v })} placeholder="Professional services" />
              <Field label="Company size" value={active.company_size} onChange={(v) => updateActive({ company_size: v })} placeholder="5–25 employees" />
              <Field label="Revenue range" value={active.revenue_range} onChange={(v) => updateActive({ revenue_range: v })} placeholder="$1M–$5M ARR" />
              <Field label="Geography" value={active.geography} onChange={(v) => updateActive({ geography: v })} placeholder="North America" />
            </div>
          </TabsContent>

          {/* FIT */}
          <TabsContent value="fit" className="mt-4">
            <div className="space-y-4">
              <DiagnosticReport
                toolEyebrow="Buyer Persona"
                categories={PERSONA_FIT_CATEGORIES}
                severities={active.severities}
                evidence={active.evidence}
                result={diagnosticFor(active)}
                audience="admin"
              />
              <DiagnosticAdminPanel
                title="Buyer Fit Scoring"
                description="Score each dimension 0 (ideal fit) → 5 (wrong fit). Add evidence and confidence so the report can defend each call."
                categories={PERSONA_FIT_CATEGORIES}
                severities={active.severities}
                onSeverityChange={setSeverity}
                result={diagnosticFor(active)}
                evidence={active.evidence}
                onEvidenceChange={setEvidence}
                hideMoney
              />
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-3">Fit Shape</div>
                <div className="h-[260px]">
                  <ResponsiveContainer>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="hsl(var(--border))" />
                      <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                      <PolarRadiusAxis domain={[0, 5]} tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={false} />
                      <Radar dataKey="value" stroke={band.color} fill={band.color} fillOpacity={0.3} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">Radar shows fit (1–5, higher = better) — derived from the inverted severity scoring above.</p>
              </div>
            </div>
          </TabsContent>

          {/* STORY */}
          <TabsContent value="story" className="mt-4">
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <LongField label="Top 3 goals" value={active.goals} onChange={(v) => updateActive({ goals: v })} placeholder="Stabilize revenue, get out of delivery, hire ops lead…" />
              <LongField label="Top pains" value={active.pains} onChange={(v) => updateActive({ pains: v })} placeholder="Cash flow swings, owner-dependence, scattered tools…" />
              <LongField label="Buying triggers" value={active.triggers} onChange={(v) => updateActive({ triggers: v })} placeholder="Missed forecast, hiring breakdown, scaling chaos…" />
              <LongField label="Common objections" value={active.objections} onChange={(v) => updateActive({ objections: v })} placeholder="“I’m too busy,” “We tried consultants before”…" />
              <LongField label="Decision criteria" value={active.decision_criteria} onChange={(v) => updateActive({ decision_criteria: v })} placeholder="ROI clarity, low time investment, proof of process…" />
            </div>
          </TabsContent>

          {/* GTM */}
          <TabsContent value="gtm" className="mt-4">
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <LongField label="Where they hang out" value={active.channels} onChange={(v) => updateActive({ channels: v })} placeholder="LinkedIn, peer groups, podcasts…" />
              <LongField label="Resonant message" value={active.message} onChange={(v) => updateActive({ message: v })} placeholder="We make your revenue predictable without owner dependence." />
              <LongField label="Proof required to close" value={active.proof_needed} onChange={(v) => updateActive({ proof_needed: v })} placeholder="Case study, peer reference, written guarantee…" />
              <LongField label="Disqualifiers" value={active.disqualifiers} onChange={(v) => updateActive({ disqualifiers: v })} placeholder="<$500k revenue, no team, not the decision-maker…" />
            </div>
            <div className="mt-4">
              <DiagnosticNotesPanel
                internalNotes={active.notes}
                clientNotes={active.client_notes}
                onInternalChange={(v) => updateActive({ notes: v })}
                onClientChange={(v) => updateActive({ client_notes: v })}
                internalPlaceholder="Sales context, account intel, follow-up questions — never shown to the client."
                clientPlaceholder="Plain-language summary of who this persona is and why it matters for their revenue."
              />
            </div>
          </TabsContent>

          {/* INSIGHTS */}
          <TabsContent value="insights" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <h3 className="text-sm font-medium text-foreground">Top Risks</h3>
                </div>
                {insights.risks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No critical risks flagged. Strong profile.</p>
                ) : (
                  <ul className="space-y-2">
                    {insights.risks.map((r, i) => (
                      <li key={i} className="text-sm text-foreground flex gap-2">
                        <span className="text-destructive mt-1">•</span><span>{r}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-medium text-foreground">Opportunities</h3>
                </div>
                {insights.opps.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Add more fit signals and channels to surface opportunities.</p>
                ) : (
                  <ul className="space-y-2">
                    {insights.opps.map((r, i) => (
                      <li key={i} className="text-sm text-foreground flex gap-2">
                        <span className="text-primary mt-1">•</span><span>{r}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-5 mt-4">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Segment-level notes</span>
              <Textarea
                value={data.segment_notes}
                onChange={(e) => setData({ ...data, segment_notes: e.target.value })}
                placeholder="Cross-persona observations, prioritization, sequencing…"
                className="mt-2 bg-muted/40 border-border min-h-[100px]"
              />
            </div>
          </TabsContent>
        </Tabs>
      )}
    </ToolRunnerShell>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="mt-1 bg-muted/40 border-border" />
    </label>
  );
}

function LongField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <Textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="mt-1 bg-muted/40 border-border min-h-[80px]" />
    </label>
  );
}
