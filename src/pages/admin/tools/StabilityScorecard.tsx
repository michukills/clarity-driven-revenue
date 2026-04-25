import { useMemo, useState } from "react";
import { Eye, EyeOff, Download, FileText } from "lucide-react";
import ToolRunnerShell from "@/components/tools/ToolRunnerShell";
import { Button } from "@/components/ui/button";
import { DiagnosticAdminPanel } from "@/components/diagnostics/DiagnosticAdminPanel";
import { DiagnosticClientView } from "@/components/diagnostics/DiagnosticClientView";
import { DiagnosticNotesPanel } from "@/components/diagnostics/DiagnosticNotesPanel";
import { DiagnosticReport } from "@/components/diagnostics/DiagnosticReport";
import { SCORECARD_CATEGORIES } from "@/lib/diagnostics/categories/scorecard";
import {
  buildDefaultSeverities,
  computeDiagnostic,
  hydrateSeverities,
  type SeverityMap,
  type Severity,
  type EvidenceMap,
  type FactorEvidence,
} from "@/lib/diagnostics/engine";
import { generateRunPdf, downloadCSV } from "@/lib/exports";

/* ───────────────────────────── Types & defaults ───────────────────────────── */

interface ScorecardData {
  severities: SeverityMap;
  evidence: EvidenceMap;
  baseline_monthly: number;
  internal_notes: string;
  client_notes: string;
}

const defaultData: ScorecardData = {
  severities: buildDefaultSeverities(SCORECARD_CATEGORIES),
  evidence: {},
  baseline_monthly: 50000,
  internal_notes: "",
  client_notes: "",
};

/** Convert the 0..100 health score into the legacy 0..1000 RGS Stability Score. */
const toThousandScale = (score100: number) => Math.round(score100 * 10);

const totalBand = (total1000: number) => {
  if (total1000 < 300) return "Unstable system";
  if (total1000 < 600) return "Inconsistent performance";
  if (total1000 < 800) return "Structured but limited";
  return "Stable and scalable";
};

/* ───────────────────────────── Component ───────────────────────────── */

export default function StabilityScorecardTool() {
  const [data, setData] = useState<ScorecardData>(defaultData);
  const [clientPreview, setClientPreview] = useState(false);

  // Hydrate any saved run so missing factors fall back to 0 instead of undefined.
  const severities = useMemo(
    () => hydrateSeverities(SCORECARD_CATEGORIES, data.severities),
    [data.severities],
  );

  const result = useMemo(
    () => computeDiagnostic(SCORECARD_CATEGORIES, severities, { baselineMonthly: data.baseline_monthly }),
    [severities, data.baseline_monthly],
  );

  const score1000 = toThousandScale(result.score);
  const bandLabel = totalBand(score1000);

  const setSeverity = (catKey: string, factorKey: string, v: Severity) =>
    setData((d) => ({
      ...d,
      severities: { ...severities, [`${catKey}.${factorKey}`]: v },
    }));

  const setEvidence = (catKey: string, factorKey: string, e: FactorEvidence) =>
    setData((d) => ({
      ...d,
      evidence: { ...(d.evidence ?? {}), [`${catKey}.${factorKey}`]: e },
    }));

  const computeSummary = (d: ScorecardData) => {
    const s = hydrateSeverities(SCORECARD_CATEGORIES, d.severities);
    const r = computeDiagnostic(SCORECARD_CATEGORIES, s, { baselineMonthly: d.baseline_monthly });
    return {
      score_100: r.score,
      score_1000: toThousandScale(r.score),
      band: totalBand(toThousandScale(r.score)),
      monthly_leak: r.monthly,
      annual_leak: r.annual,
      weakest: r.worst?.label ?? null,
      strongest: r.strongest?.label ?? null,
      next_step: r.nextStep,
      top_three: r.topThree.map((c) => c.label),
    };
  };

  const exportCsv = () => {
    const rows: Record<string, any>[] = [];
    SCORECARD_CATEGORIES.forEach((cat) => {
      const r = result.categories.find((c) => c.key === cat.key)!;
      cat.factors.forEach((f) => {
        rows.push({
          pillar: cat.label,
          factor: f.label,
          severity: severities[`${cat.key}.${f.key}`] ?? 0,
          max: 5,
        });
      });
      rows.push({
        pillar: cat.label,
        factor: "— PILLAR HEALTH —",
        severity: r.health,
        max: 100,
      });
    });
    rows.push({ pillar: "OVERALL", factor: "Stability Score (0–1000)", severity: score1000, max: 1000 });
    rows.push({ pillar: "OVERALL", factor: "Band", severity: bandLabel, max: "" });
    downloadCSV(`stability-scorecard-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  const exportPdf = () => {
    generateRunPdf(`stability-scorecard-${new Date().toISOString().slice(0, 10)}`, {
      title: "Business Stability Index™",
      subtitle: "Full-business diagnostic across the 5 RGS Stability pillars.",
      meta: [
        ["Stability Score", `${score1000} / 1000`],
        ["Band", bandLabel],
        ["Estimated monthly leakage", result.monthly ? `$${result.monthly.toLocaleString()}` : "—"],
        ["Weakest pillar", result.worst?.label ?? "—"],
        ["Strongest pillar", result.strongest?.label ?? "—"],
        ["Recommended next RGS step", result.nextStep],
        ["Date", new Date().toLocaleDateString()],
      ],
      sections: [
        { type: "heading", text: "Pillar breakdown" },
        ...result.categories.map((c) => ({
          type: "bar" as const,
          label: `${c.label} — health ${c.health}%`,
          value: c.health,
          max: 100,
          suffix: "%",
        })),
        { type: "heading", text: "Biggest constraint" },
        ...(result.worst
          ? [
              { type: "subheading" as const, text: result.worst.label },
              { type: "paragraph" as const, text: `Root cause: ${result.worst.rootCause}` },
              { type: "paragraph" as const, text: `If ignored: ${result.worst.ifIgnored}` },
              { type: "paragraph" as const, text: `Fix first: ${result.worst.fixFirst}` },
            ]
          : [{ type: "paragraph" as const, text: "No critical constraints detected." }]),
        ...(data.internal_notes
          ? [
              { type: "heading" as const, text: "Internal notes (not shown to client)" },
              { type: "paragraph" as const, text: data.internal_notes },
            ]
          : []),
      ],
    });
  };

  return (
    <ToolRunnerShell
      toolKey="rgs_stability_scorecard"
      toolTitle="Business Stability Index™"
      description="Full-business diagnostic across the 5 RGS Stability pillars. Surfaces the highest-leverage stabilization move and produces a shareable client report."
      data={data}
      setData={setData as any}
      defaultData={defaultData}
      computeSummary={computeSummary}
      rightPanel={
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">RGS Stability Score</div>
            <div className="font-display text-4xl text-foreground tabular-nums leading-none">
              {score1000}
              <span className="text-sm text-muted-foreground"> / 1000</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">{bandLabel}</div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <Button onClick={exportPdf} variant="outline" size="sm" className="border-border">
                <FileText className="h-3.5 w-3.5" /> PDF
              </Button>
              <Button onClick={exportCsv} variant="outline" size="sm" className="border-border">
                <Download className="h-3.5 w-3.5" /> CSV
              </Button>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4">
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">View</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setClientPreview(false)}
                className={`px-2 py-2 rounded-md text-xs border transition ${
                  !clientPreview
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                <EyeOff className="h-3 w-3 inline mr-1" /> Admin
              </button>
              <button
                onClick={() => setClientPreview(true)}
                className={`px-2 py-2 rounded-md text-xs border transition ${
                  clientPreview
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                <Eye className="h-3 w-3 inline mr-1" /> Client preview
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">
              Client preview shows exactly what the customer sees. Inputs and internal notes stay hidden.
            </p>
          </div>

          {!clientPreview && result.worst && (
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="text-[10px] uppercase tracking-wider text-destructive mb-1">Biggest constraint</div>
              <div className="text-sm text-foreground">{result.worst.label}</div>
              <div className="text-xs text-muted-foreground mt-1">{result.worst.short}</div>
            </div>
          )}
        </div>
      }
    >
      {clientPreview ? (
        <div className="space-y-4">
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-2 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-2">
            <Eye className="h-3.5 w-3.5" /> Client preview mode — internal notes and inputs are hidden.
          </div>
          <DiagnosticClientView
            toolEyebrow="Business Stability Index™"
            intro="This is the full business stability read across the 5 RGS pillars — Demand Generation, Revenue Conversion, Operational Efficiency, Financial Visibility, and Owner Independence. It identifies which system is constraining the others."
            result={{ ...result, score: score1000 }}
            scoreSuffix="/ 1000"
            clientNotes={data.client_notes}
            reportContext={{
              categories: SCORECARD_CATEGORIES,
              severities,
              evidence: data.evidence,
            }}
          />
        </div>
      ) : (
        <div className="space-y-6">
          <DiagnosticReport
            toolEyebrow="Business Stability Index™"
            categories={SCORECARD_CATEGORIES}
            severities={severities}
            evidence={data.evidence}
            result={result}
            audience="admin"
            scoreSuffix="/ 1000"
            scoreOverride={score1000}
          />
          <DiagnosticAdminPanel
            title="RGS Stability Pillars"
            description="Rate each factor 0 (no leak) to 5 (severe). Score derives the 0–1000 RGS Stability Score and the recommended next step."
            categories={SCORECARD_CATEGORIES}
            severities={severities}
            onSeverityChange={setSeverity}
            result={result}
            baselineMonthly={data.baseline_monthly}
            onBaselineChange={(n) => setData({ ...data, baseline_monthly: n })}
            evidence={data.evidence}
            onEvidenceChange={setEvidence}
          />
          <DiagnosticNotesPanel
            internalNotes={data.internal_notes}
            clientNotes={data.client_notes}
            onInternalChange={(v) => setData({ ...data, internal_notes: v })}
            onClientChange={(v) => setData({ ...data, client_notes: v })}
          />
        </div>
      )}
    </ToolRunnerShell>
  );
}
