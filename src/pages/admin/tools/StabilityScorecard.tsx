import { useState, useMemo } from "react";
import ToolRunnerShell from "@/components/tools/ToolRunnerShell";
import { pillars } from "@/components/scorecard/scorecardData";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Download, FileText, AlertTriangle, TrendingUp, Sparkles, ChevronRight, ArrowRight, Zap, Target, ListOrdered } from "lucide-react";
import { generateRunPdf, downloadCSV } from "@/lib/exports";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  Tooltip,
} from "recharts";

/* ───────────────────────────── Types & defaults ───────────────────────────── */

const PILLAR_WEIGHTS: Record<string, number> = {
  demand: 1.0,
  conversion: 1.1,
  operations: 1.0,
  financial: 0.95,
  independence: 0.95,
};

const MAX_PER_PILLAR = 200;
const MAX_TOTAL = 1000;

type Answers = Record<string, number[]>;
type Notes = Record<string, string>;
type Confidence = "low" | "medium" | "high";
type ConfidenceMap = Record<string, Confidence>;

const buildEmptyAnswers = (): Answers =>
  pillars.reduce((acc, p) => {
    acc[p.id] = p.questions.map(() => -1);
    return acc;
  }, {} as Answers);

const buildEmptyNotes = (): Notes =>
  pillars.reduce((acc, p) => {
    acc[p.id] = "";
    return acc;
  }, {} as Notes);

const buildEmptyConfidence = (): ConfidenceMap =>
  pillars.reduce((acc, p) => {
    acc[p.id] = "medium";
    return acc;
  }, {} as ConfidenceMap);

const defaultData = {
  answers: buildEmptyAnswers(),
  pillarNotes: buildEmptyNotes(),
  confidence: buildEmptyConfidence(),
  generalNotes: "",
};

/* ───────────────────────────── Helpers ───────────────────────────── */

const pillarRawScore = (answers: Answers, id: string) =>
  (answers[id] || []).reduce((s, v) => s + (v >= 0 ? v : 0), 0);

const pillarPct = (raw: number) => Math.round((raw / MAX_PER_PILLAR) * 100);

const weightedTotal = (answers: Answers) => {
  // Each pillar contributes (raw/200) * 200 * weight, then we scale so weighted max stays 1000.
  const weightSum = Object.values(PILLAR_WEIGHTS).reduce((a, b) => a + b, 0);
  const weightedSum = pillars.reduce((s, p) => {
    const raw = pillarRawScore(answers, p.id);
    return s + raw * (PILLAR_WEIGHTS[p.id] ?? 1);
  }, 0);
  // normalize so when every pillar is 200, total === 1000
  const normalized = (weightedSum / (MAX_PER_PILLAR * weightSum)) * MAX_TOTAL;
  return Math.round(normalized);
};

const pillarTone = (pct: number) => {
  if (pct < 40) return { tone: "critical", color: "hsl(0 70% 55%)", bg: "bg-[hsl(0_70%_55%/0.12)]", text: "text-[hsl(0_70%_70%)]", label: "Critical" };
  if (pct < 65) return { tone: "warning", color: "hsl(38 90% 55%)", bg: "bg-[hsl(38_90%_55%/0.12)]", text: "text-[hsl(38_90%_70%)]", label: "At risk" };
  if (pct < 85) return { tone: "stable", color: "hsl(78 36% 55%)", bg: "bg-[hsl(78_36%_55%/0.12)]", text: "text-[hsl(78_36%_70%)]", label: "Stable" };
  return { tone: "strong", color: "hsl(140 50% 55%)", bg: "bg-[hsl(140_50%_55%/0.12)]", text: "text-[hsl(140_50%_70%)]", label: "Strong" };
};

const totalBand = (total: number) => {
  if (total < 300) return { label: "Unstable system", description: "Foundational breakdowns across most pillars. Stabilize before scaling.", tone: "critical" };
  if (total < 600) return { label: "Inconsistent performance", description: "Wins are happening, but driven by effort — not system. High variance.", tone: "warning" };
  if (total < 800) return { label: "Structured but limited", description: "Solid bones. Specific bottlenecks are now the constraint on growth.", tone: "stable" };
  return { label: "Stable and scalable", description: "Mature system. Ready for compounding growth and disciplined expansion.", tone: "strong" };
};

const completionPct = (answers: Answers) => {
  let total = 0;
  let answered = 0;
  pillars.forEach((p) => {
    p.questions.forEach((_, i) => {
      total += 1;
      if (answers[p.id]?.[i] >= 0) answered += 1;
    });
  });
  return Math.round((answered / total) * 100);
};

/* ───────────────────────────── Insights engine ───────────────────────────── */

const PILLAR_INSIGHTS: Record<string, {
  rootCause: { critical: string; weak: string; strong: string };
  whyItMatters: string;
  ifNothingChanges: string;
  whatToDoNext: { critical: string; weak: string; strong: string };
}> = {
  demand: {
    rootCause: {
      critical: "Lead flow is unpredictable and not tied to a repeatable channel.",
      weak: "Leads come in waves — driven by effort spikes, not a working system.",
      strong: "Demand is consistent across multiple channels.",
    },
    whyItMatters: "Inconsistent demand forces reactive selling and starves the rest of the business of cash.",
    ifNothingChanges: "Revenue stays tied to founder hustle and any slow month becomes a cash crisis.",
    whatToDoNext: {
      critical: "Pick one channel, commit 30 days, and document what produces a qualified lead.",
      weak: "Tighten messaging and double down on the single channel that already converts.",
      strong: "Systemize what works and remove channels that drain time without ROI.",
    },
  },
  conversion: {
    rootCause: {
      critical: "There is no real sales process — outcomes depend on who shows up.",
      weak: "The pipeline leaks at one or two stages that no one is tracking.",
      strong: "Sales process is structured and repeatable.",
    },
    whyItMatters: "Every leak in conversion multiplies the cost of every lead you generate.",
    ifNothingChanges: "You will keep paying to fill a bucket that quietly empties itself.",
    whatToDoNext: {
      critical: "Define a 3-stage pipeline and log every lead this week.",
      weak: "Identify the single stage with the biggest drop-off and fix it first.",
      strong: "Optimize close rate with proof, pricing clarity, and faster follow-up.",
    },
  },
  operations: {
    rootCause: {
      critical: "Delivery depends on memory and heroics — nothing is documented.",
      weak: "Core processes exist but are inconsistent or owner-dependent.",
      strong: "Operations run reliably without constant founder involvement.",
    },
    whyItMatters: "Operational drag silently kills margin and caps how many clients you can serve.",
    ifNothingChanges: "Growth will create chaos faster than revenue.",
    whatToDoNext: {
      critical: "Document the top 3 recurring workflows this week — even rough drafts.",
      weak: "Assign a clear owner to each core process and remove duplicate tools.",
      strong: "Audit for automation opportunities in the steps owners repeat most.",
    },
  },
  financial: {
    rootCause: {
      critical: "There is no clear visibility into cash, margin, or runway.",
      weak: "Numbers exist but aren't reviewed on a rhythm.",
      strong: "Financials are reviewed and inform decisions.",
    },
    whyItMatters: "Without financial clarity, every decision is a guess and every win is invisible.",
    ifNothingChanges: "Profitable months hide unprofitable systems until cash runs short.",
    whatToDoNext: {
      critical: "Set up a simple weekly cash + margin snapshot starting Monday.",
      weak: "Add a 15-minute weekly finance review with one decision attached.",
      strong: "Move to monthly forecasting and tie spend to profit drivers.",
    },
  },
  independence: {
    rootCause: {
      critical: "The business cannot run for a week without the founder.",
      weak: "Key decisions and client relationships still route through one person.",
      strong: "The business runs without daily founder involvement.",
    },
    whyItMatters: "Founder dependence caps growth, valuation, and personal sustainability.",
    ifNothingChanges: "Burnout becomes a question of when, not if.",
    whatToDoNext: {
      critical: "Identify the 3 tasks only you do and delegate or document one this week.",
      weak: "Hand off one recurring decision and track outcomes for 30 days.",
      strong: "Build a leadership rhythm so decisions move without you.",
    },
  },
};

const statusFromPct = (pct: number): "Critical" | "Weak" | "Strong" => {
  if (pct < 40) return "Critical";
  if (pct < 70) return "Weak";
  return "Strong";
};

function generateInsights(answers: Answers, confidence?: ConfidenceMap) {
  const ranked = pillars.map((p) => {
    const raw = pillarRawScore(answers, p.id);
    const pct = pillarPct(raw);
    const status = statusFromPct(pct);
    const tmpl = PILLAR_INSIGHTS[p.id];
    const key = status === "Critical" ? "critical" : status === "Weak" ? "weak" : "strong";
    const lowConfidence = confidence?.[p.id] === "low";
    return {
      id: p.id,
      title: p.title,
      raw,
      pct,
      status,
      rootCause: tmpl?.rootCause[key] ?? "",
      whyItMatters: tmpl?.whyItMatters ?? "",
      ifNothingChanges: tmpl?.ifNothingChanges ?? "",
      whatToDoNext: tmpl?.whatToDoNext[key] ?? "",
      lowConfidence,
    };
  });

  const sortedAsc = [...ranked].sort((a, b) => a.pct - b.pct);
  const weakest = sortedAsc[0];
  const strongest = sortedAsc[sortedAsc.length - 1];

  const priorityOrder = [...ranked].sort((a, b) => a.pct - b.pct);

  // System diagnosis — explains how pillars connect
  const criticalCount = ranked.filter((r) => r.status === "Critical").length;
  const weakCount = ranked.filter((r) => r.status === "Weak").length;
  let systemDiagnosis = "";
  if (criticalCount >= 2) {
    systemDiagnosis = `Multiple foundations are failing at once. ${weakest?.title} is dragging on ${ranked.filter(r => r.id !== weakest?.id && r.pct < 65).map(r => r.title).join(" and ") || "the rest of the business"} — the system is compounding instability instead of growth.`;
  } else if (criticalCount === 1) {
    systemDiagnosis = `${weakest?.title} is the single biggest constraint on the business right now. It's quietly capping the upside of stronger areas like ${strongest?.title}.`;
  } else if (weakCount >= 2) {
    systemDiagnosis = `The business is functional but inconsistent. ${weakest?.title} and ${priorityOrder[1]?.title} are creating drag that prevents ${strongest?.title} from compounding.`;
  } else {
    systemDiagnosis = `Foundations are largely in place. The next move is sharpening ${weakest?.title} so ${strongest?.title} can scale without friction.`;
  }

  // Compound effect — single sentence
  const compoundEffect = weakest
    ? `Fixing ${weakest.title} first will lift ${priorityOrder[1]?.title ?? "the next weakest pillar"} and unlock the leverage already sitting in ${strongest?.title}.`
    : "";

  return { ranked, weakest, strongest, priorityOrder, systemDiagnosis, compoundEffect, criticalCount, weakCount };
}

/* ───────────────────────────── Component ───────────────────────────── */

export default function StabilityScorecardTool() {
  const [data, setData] = useState<any>(defaultData);
  const [activePillar, setActivePillar] = useState<string>(pillars[0].id);

  const answers: Answers = data.answers || buildEmptyAnswers();
  const pillarNotes: Notes = data.pillarNotes || buildEmptyNotes();
  const confidence: ConfidenceMap = data.confidence || buildEmptyConfidence();

  const total = useMemo(() => weightedTotal(answers), [answers]);
  const band = totalBand(total);
  const completion = completionPct(answers);
  const insights = useMemo(() => generateInsights(answers, confidence), [answers, confidence]);

  // Per-pillar progress
  const activePillarIndex = pillars.findIndex((p) => p.id === activePillar);
  const activePillarObj = pillars[activePillarIndex];
  const activeAnswered = (answers[activePillarObj.id] || []).filter((v) => v >= 0).length;
  const activeTotalQs = activePillarObj.questions.length;

  const setAnswer = (pid: string, qIdx: number, value: number) => {
    setData({
      ...data,
      answers: {
        ...answers,
        [pid]: answers[pid].map((v, i) => (i === qIdx ? value : v)),
      },
    });
  };

  const setPillarNote = (pid: string, value: string) => {
    setData({
      ...data,
      pillarNotes: { ...pillarNotes, [pid]: value },
    });
  };

  const setConfidence = (pid: string, value: Confidence) => {
    setData({
      ...data,
      confidence: { ...confidence, [pid]: value },
    });
  };

  const radarData = insights.ranked.map((r) => ({
    pillar: r.title.split(" ")[0],
    score: r.pct,
    fullMark: 100,
  }));

  const barData = insights.ranked.map((r) => ({
    name: r.title,
    score: r.pct,
    fill: pillarTone(r.pct).color,
  }));

  const summary = (d: any) => {
    const a = d.answers || buildEmptyAnswers();
    const t = weightedTotal(a);
    const i = generateInsights(a);
    return {
      total: t,
      band: totalBand(t).label,
      weakest: i.weakest?.title,
      strongest: i.strongest?.title,
      completion: completionPct(a),
    };
  };

  /* ───────── Exports ───────── */

  const exportCsv = () => {
    const rows: Record<string, any>[] = [];
    pillars.forEach((p) => {
      p.questions.forEach((q, i) => {
        const v = answers[p.id]?.[i] ?? -1;
        rows.push({
          pillar: p.title,
          question: q.text,
          score: v >= 0 ? v : "",
          max: 40,
        });
      });
      const raw = pillarRawScore(answers, p.id);
      rows.push({
        pillar: p.title,
        question: "— PILLAR TOTAL —",
        score: raw,
        max: MAX_PER_PILLAR,
      });
    });
    rows.push({ pillar: "OVERALL", question: "Weighted total", score: total, max: MAX_TOTAL });
    downloadCSV(`stability-scorecard-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  const exportPdf = () => {
    generateRunPdf(`stability-scorecard-${new Date().toISOString().slice(0, 10)}`, {
      title: "RGS Stability Scorecard",
      subtitle: "Weighted diagnostic of foundational business stability across the 5 RGS pillars.",
      meta: [
        ["Weighted score", `${total} / ${MAX_TOTAL}`],
        ["Band", band.label],
        ["Completion", `${completion}%`],
        ["Strongest pillar", insights.strongest?.title ?? "—"],
        ["Weakest pillar", insights.weakest?.title ?? "—"],
        ["Date", new Date().toLocaleDateString()],
      ],
      sections: [
        { type: "heading", text: "Banding" },
        { type: "paragraph", text: `${band.label}. ${band.description}` },
        { type: "heading", text: "System Diagnosis" },
        { type: "paragraph", text: insights.systemDiagnosis },
        { type: "heading", text: "Benchmark Comparison" },
        { type: "paragraph", text: `Your Score: ${total} / ${MAX_TOTAL}   ·   Typical Business: 450–600   ·   High-Performing: 750+` },
        { type: "heading", text: "Pillar breakdown" },
        ...insights.ranked.map((r) => ({
          type: "bar" as const,
          label: `${r.title} — ${pillarTone(r.pct).label}`,
          value: r.pct,
          max: 100,
          suffix: "%",
        })),
        { type: "heading", text: "Priority Fix Order" },
        ...insights.priorityOrder.map((r, i) => ({
          type: "paragraph" as const,
          text: `${i + 1}. ${r.title} — ${r.status} (${r.pct}%)`,
        })),
        { type: "heading", text: "Compound Effect" },
        { type: "paragraph", text: insights.compoundEffect },
        { type: "heading", text: "Pillar Insights" },
        ...insights.ranked.flatMap((r) => [
          { type: "subheading" as const, text: `${r.title} — ${r.status} (${r.pct}%)` },
          { type: "paragraph" as const, text: `Root Cause: ${r.rootCause}` },
          { type: "paragraph" as const, text: `Why It Matters: ${r.whyItMatters}` },
          { type: "paragraph" as const, text: `If Nothing Changes: ${r.ifNothingChanges}` },
          { type: "paragraph" as const, text: `What To Do Next: ${r.whatToDoNext}` },
          ...(r.lowConfidence
            ? [{ type: "paragraph" as const, text: `Note: Confidence in this area is low — actual performance may be worse than indicated.` }]
            : []),
        ]),
        ...(Object.values(pillarNotes).some((n) => n.trim())
          ? [
              { type: "heading" as const, text: "Pillar notes" },
              ...pillars.flatMap((p) =>
                pillarNotes[p.id]?.trim()
                  ? [
                      { type: "subheading" as const, text: p.title },
                      { type: "paragraph" as const, text: pillarNotes[p.id] },
                    ]
                  : [],
              ),
            ]
          : []),
        ...(data.generalNotes
          ? [
              { type: "heading" as const, text: "General notes" },
              { type: "paragraph" as const, text: data.generalNotes },
            ]
          : []),
      ],
    });
  };

  /* ───────── Render ───────── */

  const active = pillars.find((p) => p.id === activePillar)!;
  const activeRaw = pillarRawScore(answers, active.id);
  const activePct = pillarPct(activeRaw);
  const activeTone = pillarTone(activePct);

  return (
    <ToolRunnerShell
      toolKey="rgs_stability_scorecard"
      toolTitle="RGS Stability Scorecard"
      description="Weighted diagnostic across the 5 RGS pillars. Surfaces the single highest-leverage stabilization move and produces a shareable client report."
      data={data}
      setData={setData}
      defaultData={defaultData}
      computeSummary={summary}
      rightPanel={
        <div className="space-y-4">
          {/* Score hero */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">Weighted score</div>
            <div className="flex items-baseline gap-1">
              <div className="font-display text-5xl text-foreground tabular-nums leading-none">{total}</div>
              <div className="text-sm text-muted-foreground">/ {MAX_TOTAL}</div>
            </div>
            <div
              className={`mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] ${pillarTone(Math.round((total / MAX_TOTAL) * 100)).bg} ${pillarTone(Math.round((total / MAX_TOTAL) * 100)).text}`}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: pillarTone(Math.round((total / MAX_TOTAL) * 100)).color }} />
              {band.label}
            </div>
            <p className="text-xs text-muted-foreground mt-3 leading-relaxed">{band.description}</p>

            <div className="mt-4 pt-4 border-t border-border/60">
              <div className="flex justify-between text-[11px] text-muted-foreground mb-1.5">
                <span>Completion</span>
                <span className="tabular-nums">{completion}%</span>
              </div>
              <div className="h-1 bg-muted/50 rounded-full overflow-hidden">
                <div className="h-full bg-primary transition-all" style={{ width: `${completion}%` }} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-4">
              <Button onClick={exportPdf} variant="outline" size="sm" className="border-border">
                <FileText className="h-3.5 w-3.5" /> PDF
              </Button>
              <Button onClick={exportCsv} variant="outline" size="sm" className="border-border">
                <Download className="h-3.5 w-3.5" /> CSV
              </Button>
            </div>
          </div>

          {/* Strongest / weakest */}
          {insights.weakest && insights.strongest && (
            <div className="bg-card border border-border rounded-xl p-5 space-y-3">
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Highlights</div>
              <div>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <TrendingUp className="h-3 w-3" /> Strongest
                </div>
                <div className="text-sm text-foreground mt-0.5">{insights.strongest.title}</div>
                <div className={`text-xs ${pillarTone(insights.strongest.pct).text}`}>{insights.strongest.pct}%</div>
              </div>
              <div className="border-t border-border/60 pt-3">
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <AlertTriangle className="h-3 w-3" /> Weakest
                </div>
                <div className="text-sm text-foreground mt-0.5">{insights.weakest.title}</div>
                <div className={`text-xs ${pillarTone(insights.weakest.pct).text}`}>{insights.weakest.pct}%</div>
              </div>
            </div>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        {/* Visual breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-3">Pillar Radar</div>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis dataKey="pillar" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }} />
                  <Radar dataKey="score" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.35} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5">
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-3">Pillar Strength</div>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} layout="vertical" margin={{ left: 10, right: 20, top: 8, bottom: 8 }}>
                  <XAxis type="number" domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" width={130} tick={{ fill: "hsl(var(--foreground))", fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      fontSize: 12,
                      borderRadius: 8,
                    }}
                    formatter={(v: any) => [`${v}%`, "Score"]}
                  />
                  <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                    {barData.map((d, i) => (
                      <Cell key={i} fill={d.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* System Diagnosis */}
        {completion > 0 && (
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-3">
              <Target className="h-3 w-3" /> System Diagnosis
            </div>
            <p className="text-sm text-foreground/90 leading-relaxed">{insights.systemDiagnosis}</p>
          </div>
        )}

        {/* Benchmark Comparison */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-3">Benchmark Comparison</div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-primary/10 border border-primary/30 p-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Your Score</div>
              <div className="font-display text-2xl text-foreground tabular-nums mt-1">{total}</div>
              <div className="text-[10px] text-muted-foreground">/ {MAX_TOTAL}</div>
            </div>
            <div className="rounded-lg bg-muted/30 border border-border p-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Typical Business</div>
              <div className="font-display text-2xl text-foreground tabular-nums mt-1">450–600</div>
              <div className="text-[10px] text-muted-foreground">average range</div>
            </div>
            <div className="rounded-lg bg-muted/30 border border-border p-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">High-Performing</div>
              <div className="font-display text-2xl text-foreground tabular-nums mt-1">750+</div>
              <div className="text-[10px] text-muted-foreground">stable & scalable</div>
            </div>
          </div>
        </div>

        {/* Priority Fix Order */}
        {completion > 0 && (
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-3">
              <ListOrdered className="h-3 w-3" /> Priority Fix Order
            </div>
            <ol className="space-y-2">
              {insights.priorityOrder.map((r, i) => {
                const tone = pillarTone(r.pct);
                return (
                  <li key={r.id} className="flex items-center gap-3 text-sm">
                    <span className="h-6 w-6 rounded-full bg-muted/40 text-xs text-muted-foreground tabular-nums flex items-center justify-center">{i + 1}</span>
                    <span className="text-foreground flex-1">{r.title}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${tone.bg} ${tone.text}`}>{r.status} · {r.pct}%</span>
                  </li>
                );
              })}
            </ol>
            {insights.compoundEffect && (
              <div className="mt-4 pt-4 border-t border-border/60 flex items-start gap-2 text-xs text-muted-foreground leading-relaxed">
                <Zap className="h-3.5 w-3.5 text-primary flex-shrink-0 mt-0.5" />
                <span><span className="text-foreground">Compound effect: </span>{insights.compoundEffect}</span>
              </div>
            )}
          </div>
        )}

        {/* Per-Pillar Structured Insights */}
        {completion > 0 && (
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-4">
              <Sparkles className="h-3 w-3" /> Pillar Insights
            </div>
            <div className="space-y-4">
              {insights.ranked.map((r) => {
                const tone = pillarTone(r.pct);
                return (
                  <div key={r.id} className="border border-border/60 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm text-foreground">{r.title}</div>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full ${tone.bg} ${tone.text}`}>
                        {r.status} · {r.pct}%
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Root Cause</div>
                        <p className="text-foreground/90 leading-relaxed">{r.rootCause}</p>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Why It Matters</div>
                        <p className="text-foreground/90 leading-relaxed">{r.whyItMatters}</p>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">If Nothing Changes</div>
                        <p className="text-foreground/90 leading-relaxed">{r.ifNothingChanges}</p>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">What To Do Next</div>
                        <p className="text-foreground/90 leading-relaxed">{r.whatToDoNext}</p>
                      </div>
                    </div>
                    {r.lowConfidence && (
                      <div className="mt-3 text-[11px] text-[hsl(38_90%_70%)] bg-[hsl(38_90%_55%/0.10)] border border-[hsl(38_90%_55%/0.25)] rounded-md px-3 py-2">
                        Confidence in this area is low — actual performance may be worse than indicated.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Pillar tab navigator */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex overflow-x-auto border-b border-border">
            {pillars.map((p) => {
              const raw = pillarRawScore(answers, p.id);
              const pct = pillarPct(raw);
              const tone = pillarTone(pct);
              const isActive = p.id === activePillar;
              return (
                <button
                  key={p.id}
                  onClick={() => setActivePillar(p.id)}
                  className={`flex-1 min-w-[160px] px-4 py-3 text-left border-r border-border last:border-r-0 transition-colors ${
                    isActive ? "bg-muted/30" : "hover:bg-muted/20"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-xs ${isActive ? "text-foreground" : "text-muted-foreground"} truncate`}>
                      {p.title}
                    </span>
                    <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: tone.color }} />
                  </div>
                  <div className="text-[10px] tabular-nums text-muted-foreground">
                    {raw}/{MAX_PER_PILLAR} · {pct}%
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active pillar editor */}
          <div className="p-6">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Pillar {activePillarIndex + 1} of {pillars.length} · {activeAnswered}/{activeTotalQs} questions
                </div>
                <h3 className="text-xl text-foreground mt-0.5">{active.title}</h3>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs ${activeTone.bg} ${activeTone.text}`}>
                {activeTone.label} · {activePct}%
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-1 bg-muted/40 rounded-full overflow-hidden mb-6">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${(activeAnswered / activeTotalQs) * 100}%` }}
              />
            </div>

            <div className="space-y-5">
              {active.questions.map((q, qi) => {
                const selected = answers[active.id]?.[qi] ?? -1;
                return (
                  <div
                    key={qi}
                    id={`q-${active.id}-${qi}`}
                    className="border-t border-border/40 pt-4 first:border-0 first:pt-0"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <span className="h-5 w-5 rounded-full bg-muted/40 text-[10px] text-muted-foreground tabular-nums flex items-center justify-center mt-0.5">
                        {qi + 1}
                      </span>
                      <div className="text-sm text-foreground flex-1">{q.text}</div>
                    </div>
                    <div className="grid grid-cols-5 gap-1.5 ml-8">
                      {q.options.map((opt) => {
                        const isSel = selected === opt.value;
                        return (
                          <button
                            key={opt.value}
                            onClick={() => {
                              setAnswer(active.id, qi, opt.value);
                              // Auto-scroll to next question after a short delay
                              if (qi < active.questions.length - 1) {
                                setTimeout(() => {
                                  const nextEl = document.getElementById(`q-${active.id}-${qi + 1}`);
                                  nextEl?.scrollIntoView({ behavior: "smooth", block: "center" });
                                }, 180);
                              }
                            }}
                            className={`px-2 py-2.5 rounded-md text-[11px] border text-left transition-all ${
                              isSel
                                ? "border-primary bg-primary/20 text-foreground shadow-[0_0_0_2px_hsl(var(--primary)/0.35)] ring-1 ring-primary/40"
                                : "border-border bg-muted/20 text-muted-foreground hover:text-foreground hover:border-border"
                            }`}
                          >
                            <div className="tabular-nums text-[10px] mb-1 text-muted-foreground">{opt.value}</div>
                            <div className="leading-tight">{opt.label}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Confidence */}
            <div className="mt-6 pt-5 border-t border-border/40">
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
                How confident are you in these answers?
              </div>
              <div className="flex gap-2">
                {(["low", "medium", "high"] as Confidence[]).map((level) => {
                  const isSel = confidence[active.id] === level;
                  return (
                    <button
                      key={level}
                      onClick={() => setConfidence(active.id, level)}
                      className={`px-3 py-1.5 rounded-md text-xs border capitalize transition-all ${
                        isSel
                          ? "border-primary bg-primary/15 text-foreground"
                          : "border-border bg-muted/20 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {level}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Pillar notes */}
            <div className="mt-6 pt-5 border-t border-border/40">
              <label className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Notes — {active.title}
              </label>
              <Textarea
                value={pillarNotes[active.id] ?? ""}
                onChange={(e) => setPillarNote(active.id, e.target.value)}
                placeholder="Context, observations, root causes for this pillar…"
                className="mt-2 bg-muted/30 border-border min-h-[80px]"
              />
            </div>

            {/* Pillar nav */}
            <div className="mt-5 flex justify-between items-center text-xs text-muted-foreground">
              <button
                onClick={() => {
                  const idx = pillars.findIndex((p) => p.id === activePillar);
                  if (idx > 0) setActivePillar(pillars[idx - 1].id);
                }}
                className="hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                disabled={pillars[0].id === activePillar}
              >
                ← Previous pillar
              </button>
              <button
                onClick={() => {
                  const idx = pillars.findIndex((p) => p.id === activePillar);
                  if (idx < pillars.length - 1) setActivePillar(pillars[idx + 1].id);
                }}
                className="inline-flex items-center gap-1 hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                disabled={pillars[pillars.length - 1].id === activePillar}
              >
                Next pillar <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>

        {/* General notes */}
        <div className="bg-card border border-border rounded-xl p-5">
          <label className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Overall diagnostic notes
          </label>
          <Textarea
            value={data.generalNotes ?? ""}
            onChange={(e) => setData({ ...data, generalNotes: e.target.value })}
            placeholder="High-level summary, recommended starting point, follow-up actions…"
            className="mt-2 bg-muted/30 border-border min-h-[100px]"
          />
        </div>

        {/* Final action CTA */}
        <div className="bg-gradient-to-br from-primary/15 via-card to-card border border-primary/30 rounded-xl p-6 text-center">
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">What to do next</div>
          <h3 className="font-display text-2xl text-foreground">
            Turn this benchmark into a stabilization plan
          </h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-xl mx-auto">
            If you want help fixing this, we can map out exactly what needs to change.
          </p>
          <Button
            onClick={() => (window.location.href = "/diagnostic")}
            className="mt-5 bg-primary hover:bg-secondary"
          >
            Get My Stabilization Plan <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </ToolRunnerShell>
  );
}