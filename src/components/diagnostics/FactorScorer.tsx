import { useMemo, useState } from "react";
import { ChevronDown, BookOpen, Sparkles, Settings2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  type DiagnosticFactor,
  type FactorEvidence,
  type Severity,
  type Confidence,
  EVIDENCE_STATUS_OPTIONS,
  evidenceStatusToSeverity,
  severityToEvidenceStatus,
  evidenceStatusOption,
  rubricMeaning,
  scoreEvidenceText,
  EVIDENCE_UNKNOWN_INSERT,
} from "@/lib/diagnostics/engine";
import { getFactorPrompt } from "@/lib/diagnostics/factorPrompts";

interface Props {
  categoryKey: string;
  factor: DiagnosticFactor;
  /** Internal numeric severity (0..5). Used by deterministic scoring math only. */
  value: number;
  evidence?: FactorEvidence;
  onScoreChange: (v: Severity) => void;
  onEvidenceChange: (e: FactorEvidence) => void;
  /** Compact mode hides the always-visible meaning under the label; tooltip still works. */
  compact?: boolean;
  /** Hide admin-only fields (internal notes, client-finding override). */
  audience?: "admin" | "client";
}

const TONE_CLS: Record<string, string> = {
  ok: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
  watch: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  leaking: "border-orange-500/40 bg-orange-500/10 text-orange-200",
  critical: "border-destructive/50 bg-destructive/10 text-destructive",
  muted: "border-border bg-muted/30 text-muted-foreground",
};

/**
 * P41.4 — Typed-evidence diagnostic row used by every RGS diagnostic tool.
 *
 * The user (client or admin) describes what is actually happening in plain
 * English. RGS deterministically classifies that text into an evidence
 * status using `scoreEvidenceText`, and stores the calculated severity for
 * scoring math. There is no manual status selector — the status is an
 * output, never a primary input.
 */
export function FactorScorer({
  factor,
  value,
  evidence,
  onScoreChange,
  onEvidenceChange,
  compact,
  audience = "admin",
}: Props) {
  const [guideOpen, setGuideOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const ev: FactorEvidence = evidence ?? {};
  const confidence: Confidence = ev.confidence ?? "medium";
  const notes = ev.notes ?? "";
  const scored = useMemo(() => scoreEvidenceText(notes), [notes]);
  const opt = evidenceStatusOption(scored.status);
  const isAdmin = audience === "admin";
  const prompt = getFactorPrompt(factor.key, factor.label);
  const questionText = factor.question?.trim() || prompt.question;

  const updateNotes = (next: string) => {
    onEvidenceChange({ ...ev, notes: next });
    onScoreChange(scoreEvidenceText(next).severity);
  };

  return (
      <div className="rounded-lg border border-border bg-card/50 p-5 space-y-5">
        {/* 1. Question block */}
        <div className="space-y-2">
          <div className="text-sm text-foreground/90">{factor.label}</div>
          <p className="text-base text-foreground font-medium leading-snug">{questionText}</p>
          {factor.hint && !compact && (
            <div className="text-xs text-muted-foreground">{factor.hint}</div>
          )}
        </div>

        {/* 2. What a strong answer includes — visually distinct helper */}
        <div className="rounded-md border-l-2 border-primary/40 bg-muted/20 px-4 py-3">
          <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground/80 mb-1.5">
            What a strong answer includes
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{prompt.helper}</p>
        </div>

        {/* 3. Answer */}
        <div className="space-y-2">
          <Textarea
            value={notes}
            onChange={(e) => updateNotes(e.target.value)}
            placeholder={"Type your answer here. \"I don't know\" is valid."}
            className="bg-muted/30 border-border min-h-[120px] text-sm normal-case tracking-normal leading-relaxed"
          />
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={() => updateNotes(EVIDENCE_UNKNOWN_INSERT)}
              className="text-[10px] px-2.5 py-1 rounded-md border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition"
            >
              Mark as "I don't know"
            </button>
          </div>
        </div>

        {/* 4. Calculated status — compact pill row */}
        <div
          className={`rounded-md border px-3 py-2 text-[11px] leading-relaxed ${TONE_CLS[opt.tone]}`}
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 font-medium">
              <Sparkles className="h-3 w-3" /> Calculated status: {opt.label}
            </div>
            <button
              type="button"
              onClick={() => setGuideOpen((o) => !o)}
              className="text-[10px] text-foreground/80 hover:text-foreground inline-flex items-center gap-1"
            >
              <BookOpen className="h-3 w-3" />
              {guideOpen ? "Hide rubric" : "Rubric guide"}
            </button>
          </div>
          <div className="mt-1 text-foreground/80">{scored.reason}</div>
        </div>

        {guideOpen && (
          <div className="rounded-md border border-border/70 bg-muted/20 p-3 space-y-1.5">
            {EVIDENCE_STATUS_OPTIONS.map((opt) => (
              <div key={opt.value} className="text-[11px] leading-snug">
                <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] mr-2 border ${TONE_CLS[opt.tone]}`}>
                  {opt.label}
                </span>
                <span className="text-foreground/85">{opt.hint}</span>
              </div>
            ))}
          </div>
        )}

        {/* 5. Admin-only review section — visually subordinated and collapsible */}
        {isAdmin && (
          <div className="rounded-md border border-dashed border-border/70 bg-background/40">
            <button
              type="button"
              onClick={() => setAdminOpen((o) => !o)}
              className="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-[10px] uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground transition"
            >
              <span className="inline-flex items-center gap-1.5">
                <Settings2 className="h-3 w-3" /> Admin review (internal only)
              </span>
              <ChevronDown className={`h-3 w-3 transition-transform ${adminOpen ? "rotate-180" : ""}`} />
            </button>
            {adminOpen && (
              <div className="px-4 pb-4 pt-1 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-4">
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground space-y-1.5">
                  Client-facing finding
                  <Input
                    value={ev.clientFinding ?? ""}
                    onChange={(e) => onEvidenceChange({ ...ev, clientFinding: e.target.value })}
                    placeholder="One-line summary the client will read"
                    className="bg-muted/30 border-border h-9 text-xs normal-case tracking-normal"
                  />
                </label>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground space-y-1.5">
                  Admin review confidence
                  <div className="flex items-center gap-1.5">
                    {(["low", "medium", "high"] as const).map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => onEvidenceChange({ ...ev, confidence: c })}
                        className={`h-9 px-3 rounded border text-[11px] capitalize transition ${
                          confidence === c
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </label>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground space-y-1.5 md:col-span-2">
                  Internal notes (admin-only)
                  <Textarea
                    value={ev.internalNotes ?? ""}
                    onChange={(e) => onEvidenceChange({ ...ev, internalNotes: e.target.value })}
                    placeholder="Sales context, assumptions, follow-up questions — never shown to client."
                    className="bg-muted/30 border-border min-h-[72px] text-xs normal-case tracking-normal"
                  />
                </label>
              </div>
            )}
          </div>
        )}
      </div>
  );
}

/** Preferred public name for new code. `FactorScorer` remains for back-compat. */
export const DiagnosticScoringRow = FactorScorer;

/** Re-export of rubricMeaning so legacy imports don't break. */
export { rubricMeaning };
