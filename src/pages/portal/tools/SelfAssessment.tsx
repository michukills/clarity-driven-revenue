/**
 * P37 — Stability Self-Assessment, hardened.
 *
 * Replaces the legacy 1–10 slider self-assessment with the same
 * deterministic, natural-language rubric used by the public scorecard.
 *
 * Key rules enforced here:
 *   • No numeric self-rating. No sliders. No 1–10. Typed answers only.
 *   • Scoring is deterministic and runs locally via the rubric module —
 *     no AI, no edge-function calls, no `supabase.functions.invoke`.
 *   • Per-question evidence and per-pillar confidence are surfaced so
 *     the user can see which answers strengthen vs weaken the read.
 *   • Persisted `data` shape stores the typed answers PLUS the locally
 *     computed evidence/confidence summary so reviewers can audit it.
 */

import { useMemo, useState } from "react";
import { ClientToolShell } from "@/components/tools/ClientToolShell";
import {
  PILLARS,
  emptyAnswers,
  scoreScorecard,
  scoreAnswer,
  RUBRIC_VERSION,
  type PillarId,
  type ScorecardResult,
} from "@/lib/scorecard/rubric";

/**
 * Persisted shape for this tool. Typed-answer maps only — no numeric
 * ratings of any kind.
 */
interface SelfAssessmentData {
  rubric_version: typeof RUBRIC_VERSION;
  answers: Record<PillarId, Record<string, string>>;
}

const defaultData: SelfAssessmentData = {
  rubric_version: RUBRIC_VERSION,
  answers: emptyAnswers(),
};

const EVIDENCE_TONE: Record<"low" | "medium" | "high", string> = {
  low: "text-rose-300/80",
  medium: "text-amber-300/80",
  high: "text-emerald-300/80",
};

const EVIDENCE_LABEL: Record<"low" | "medium" | "high", string> = {
  low: "Weak evidence — add specifics",
  medium: "Partial evidence",
  high: "Strong, specific evidence",
};

const CONFIDENCE_LABEL: Record<"low" | "medium" | "high", string> = {
  low: "Low confidence",
  medium: "Medium confidence",
  high: "High confidence",
};

function buildSummary(data: SelfAssessmentData) {
  const result: ScorecardResult = scoreScorecard(data.answers);
  return {
    rubric_version: data.rubric_version,
    overall_score_estimate: result.overall_score_estimate,
    overall_score_low: result.overall_score_low,
    overall_score_high: result.overall_score_high,
    overall_band: result.overall_band,
    overall_confidence: result.overall_confidence,
    pillar_results: result.pillar_results.map((p) => ({
      pillar_id: p.pillar_id,
      title: p.title,
      score: p.score,
      band: p.band,
      confidence: p.confidence,
      evidence_per_question: p.signals.map((s) => ({
        question_id: s.question_id,
        evidence_level: s.evidence,
      })),
    })),
  };
}

export default function ClientSelfAssessment() {
  const [data, setData] = useState<SelfAssessmentData>(defaultData);

  // Migrate any legacy slider data shape into the new typed shape so an
  // older saved run does not crash the UI.
  const safeData: SelfAssessmentData = useMemo(() => {
    if (
      data &&
      typeof data === "object" &&
      "answers" in data &&
      data.answers &&
      typeof data.answers === "object"
    ) {
      return data as SelfAssessmentData;
    }
    return defaultData;
  }, [data]);

  const result = useMemo(() => scoreScorecard(safeData.answers), [safeData]);

  const setAnswer = (pillarId: PillarId, qid: string, val: string) => {
    setData({
      rubric_version: RUBRIC_VERSION,
      answers: {
        ...safeData.answers,
        [pillarId]: {
          ...safeData.answers[pillarId],
          [qid]: val,
        },
      },
    });
  };

  return (
    <ClientToolShell
      toolKey="client_self_assessment"
      toolTitle="Stability Self-Assessment"
      description="Describe what actually happens in your business — in your own words. The RGS scoring engine reads your answers for cadence, ownership, systems, and review rhythm, and produces a deterministic 0–1,000 estimate. No 1–10 self-rating."
      entryNoun="benchmark"
      data={safeData}
      setData={setData as (d: unknown) => void}
      defaultData={defaultData}
      computeSummary={(d: unknown) => buildSummary(d as SelfAssessmentData)}
      rightPanel={
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
              Preliminary score
            </div>
            <div className="text-3xl text-foreground tabular-nums">
              {result.overall_score_estimate}
              <span className="text-base text-muted-foreground">/1000</span>
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              Range {result.overall_score_low}–{result.overall_score_high} ·{" "}
              {CONFIDENCE_LABEL[result.overall_confidence]}
            </div>
          </div>
          <div className="border-t border-border pt-3 space-y-1.5">
            {result.pillar_results.map((p) => (
              <div
                key={p.pillar_id}
                className="flex items-center justify-between gap-3 text-[11px]"
              >
                <span className="text-foreground/80 truncate">{p.title}</span>
                <span className="tabular-nums text-muted-foreground">
                  {p.score}
                  <span className={`ml-2 ${EVIDENCE_TONE[p.confidence]}`}>
                    · {p.confidence}
                  </span>
                </span>
              </div>
            ))}
          </div>
          <p className="text-[10px] leading-relaxed text-muted-foreground/70 border-t border-border pt-3">
            Self-reported, preliminary. Not a final diagnosis. RGS would
            validate this against your real operating evidence.
          </p>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="rounded-md border border-border/60 bg-muted/20 px-4 py-3 text-[12px] leading-relaxed text-muted-foreground">
          <strong className="text-foreground">Describe what actually happens in your business, not what should happen.</strong>{" "}
          Be specific. The more detail you provide — tools, cadence, owner names, what breaks under pressure — the more accurate your score will be.
        </div>

        {PILLARS.map((pillar) => {
          const pResult = result.pillar_results.find(
            (r) => r.pillar_id === pillar.id,
          );
          return (
            <section
              key={pillar.id}
              className="bg-card border border-border rounded-xl p-5 space-y-4"
            >
              <header className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.18em] text-primary/80">
                    {pillar.title}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 max-w-xl leading-relaxed">
                    {pillar.intro}
                  </p>
                </div>
                {pResult && (
                  <div className="text-right shrink-0">
                    <div className="text-base text-foreground tabular-nums">
                      {pResult.score}
                      <span className="text-[11px] text-muted-foreground">
                        /200
                      </span>
                    </div>
                    <div
                      className={`text-[10px] mt-0.5 ${EVIDENCE_TONE[pResult.confidence]}`}
                    >
                      {CONFIDENCE_LABEL[pResult.confidence]}
                    </div>
                  </div>
                )}
              </header>

              <div className="space-y-5">
                {pillar.questions.map((q, i) => {
                  const val = safeData.answers[pillar.id]?.[q.id] ?? "";
                  const sig = scoreAnswer(q, val);
                  return (
                    <div key={q.id}>
                      <label className="block text-sm text-foreground mb-1.5 leading-snug">
                        <span className="text-primary/70 mr-2 tabular-nums">
                          Q{i + 1}.
                        </span>
                        {q.prompt}
                      </label>
                      <textarea
                        value={val}
                        onChange={(e) =>
                          setAnswer(pillar.id, q.id, e.target.value)
                        }
                        placeholder={q.placeholder}
                        rows={3}
                        maxLength={2000}
                        className="w-full rounded-md bg-background border border-border px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/50 leading-relaxed resize-y"
                      />
                      <div className="mt-1 flex items-center justify-between gap-3 text-[10px]">
                        <span className={EVIDENCE_TONE[sig.evidence]}>
                          {EVIDENCE_LABEL[sig.evidence]}
                        </span>
                        <span className="tabular-nums text-muted-foreground/60">
                          {val.length}/2000
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </ClientToolShell>
  );
}
