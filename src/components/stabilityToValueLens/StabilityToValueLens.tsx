/**
 * P73 — Stability-to-Value Lens™ shared UI.
 *
 * Pure presentation: takes deterministic answers, renders factor
 * questions grouped by RGS gear, computes the per-gear and total
 * lens score, surfaces the structure rating + insufficient-evidence
 * states. Persistence lives in the admin/client wrapper pages.
 *
 * No valuation/appraisal/lending/investment language anywhere.
 */
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import {
  STABILITY_TO_VALUE_LENS_NAME,
  STABILITY_TO_VALUE_LENS_GEARS,
  STABILITY_TO_VALUE_GEAR_LABELS,
  STV_FACTORS,
  STV_CLIENT_DISCLAIMER,
  STV_PLAIN_ENGLISH_DISCLAIMER,
  STRUCTURE_RATING_LABELS,
  computeStabilityToValueLens,
  type StabilityToValueGear,
  type StvAnswer,
  type StvAnswers,
} from "@/config/stabilityToValueLens";

const ANSWER_OPTIONS: ReadonlyArray<{ value: StvAnswer; label: string }> = [
  { value: "yes", label: "Yes" },
  { value: "partial", label: "Partial" },
  { value: "no", label: "No" },
  { value: "unknown", label: "Don't know yet" },
];

interface Props {
  answers: StvAnswers;
  onAnswerChange: (factorKey: string, value: StvAnswer) => void;
  readOnly?: boolean;
}

export function StabilityToValueLens({ answers, onAnswerChange, readOnly = false }: Props) {
  const result = useMemo(() => computeStabilityToValueLens(answers), [answers]);

  const factorsByGear: Record<StabilityToValueGear, typeof STV_FACTORS[number][]> = {
    demand_generation: [],
    revenue_conversion: [],
    operational_efficiency: [],
    financial_visibility: [],
    owner_independence: [],
  };
  for (const f of STV_FACTORS) factorsByGear[f.gear].push(f);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card/60 p-5">
        <div className="flex items-center gap-2 mb-2">
          <h2 className="text-lg font-medium text-foreground">{STABILITY_TO_VALUE_LENS_NAME}</h2>
          <Badge variant="outline">Operational lens · Not a valuation</Badge>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{STV_CLIENT_DISCLAIMER}</p>
        <p className="text-xs text-muted-foreground leading-relaxed mt-2">{STV_PLAIN_ENGLISH_DISCLAIMER}</p>
      </div>

      {STABILITY_TO_VALUE_LENS_GEARS.map((gear) => {
        const gs = result.byGear[gear];
        return (
          <div key={gear} className="rounded-xl border border-border bg-card/60 p-5">
            <header className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-foreground">
                {STABILITY_TO_VALUE_GEAR_LABELS[gear]}
              </h3>
              <Badge variant="outline">
                {gs.insufficientEvidence ? "Insufficient evidence" : `${gs.score}/20`}
              </Badge>
            </header>
            <ul className="space-y-3">
              {factorsByGear[gear].map((f) => {
                const current = answers[f.key];
                return (
                  <li key={f.key} className="rounded-lg border border-border/60 bg-background/40 p-3">
                    <div className="text-sm font-medium text-foreground">{f.prompt}</div>
                    <p className="text-[11px] text-muted-foreground mb-2">{f.helper}</p>
                    <div className="flex flex-wrap gap-2">
                      {ANSWER_OPTIONS.map((opt) => {
                        const selected = current === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            disabled={readOnly}
                            onClick={() => onAnswerChange(f.key, opt.value)}
                            className={`px-3 py-1 rounded-md text-xs border transition ${
                              selected
                                ? "bg-primary/15 border-primary/60 text-foreground"
                                : "border-border/60 text-muted-foreground hover:border-primary/40"
                            } ${readOnly ? "opacity-60 cursor-not-allowed" : ""}`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}

      <div className="rounded-xl border border-primary/30 bg-primary/5 p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Lens score</p>
            <p className="text-2xl font-medium text-foreground">
              {result.isInsufficientEvidence ? "—" : `${result.totalScore}/100`}
            </p>
            <p className="text-[11px] text-muted-foreground">Operational readiness, not a valuation.</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Structure rating</p>
            <p className="text-base font-medium text-foreground">
              {STRUCTURE_RATING_LABELS[result.structureRating]}
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Perceived operational risk</p>
            <p className="text-base font-medium text-foreground capitalize">
              {result.perceivedOperationalRiskLevel}
            </p>
          </div>
        </div>
        {result.insufficientEvidenceFactors.length > 0 && (
          <p className="mt-3 text-[11px] text-muted-foreground">
            {result.insufficientEvidenceFactors.length} factor(s) not yet answered — answer more to firm up the lens.
          </p>
        )}
      </div>
    </div>
  );
}

export default StabilityToValueLens;