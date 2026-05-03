import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, BookOpen, Sparkles } from "lucide-react";
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
      <div className="rounded-md border border-border bg-card/50 px-4 py-3 space-y-2">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="text-sm text-foreground">{factor.label}</div>
            {factor.hint && !compact && (
              <div className="text-xs text-muted-foreground mt-0.5">{factor.hint}</div>
            )}
          </div>
        </div>
        <p className="text-sm text-foreground/90 font-medium">{questionText}</p>
        <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-2">
          <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground/80 mb-1">
            What a strong answer includes
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">{prompt.helper}</p>
        </div>
        <Textarea
          value={notes}
          onChange={(e) => updateNotes(e.target.value)}
          placeholder={prompt.placeholder}
          className="bg-muted/30 border-border min-h-[72px] text-sm normal-case tracking-normal"
        />
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="text-[10px] text-muted-foreground italic">
            "I don't know" is a valid answer if you are unsure.
          </p>
          <button
            type="button"
            onClick={() => updateNotes(EVIDENCE_UNKNOWN_INSERT)}
            className="text-[10px] px-2 py-1 rounded-md border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition"
          >
            Mark as "I don't know"
          </button>
        </div>

        <div
          className={`rounded-md border px-3 py-2 text-[11px] leading-relaxed ${TONE_CLS[opt.tone]}`}
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-1.5 font-medium">
            <Sparkles className="h-3 w-3" /> Calculated evidence status: {opt.label}
          </div>
          <div className="mt-1 text-foreground/80">{scored.reason}</div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => setGuideOpen((o) => !o)}
            className="text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          >
            <BookOpen className="h-3 w-3" />
            {guideOpen ? "Hide rubric" : "Rubric guide"}
          </button>
        </div>

        {guideOpen && (
          <div className="rounded-md border border-border/70 bg-muted/20 p-2 space-y-1.5">
            {EVIDENCE_STATUS_OPTIONS.map((opt) => (
              <div key={opt.value} className="text-[11px] leading-snug">
                <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] mr-2 border ${TONE_CLS[opt.tone]}`}>
                  {opt.label}
                </span>
                <span className="text-foreground/85">
                  {opt.hint}
                </span>
              </div>
            ))}
          </div>
        )}

        {isAdmin && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border-t border-border pt-3">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground space-y-1">
              Client-facing finding
              <Input
                value={ev.clientFinding ?? ""}
                onChange={(e) => onEvidenceChange({ ...ev, clientFinding: e.target.value })}
                placeholder="One-line summary the client will read"
                className="bg-muted/30 border-border h-8 text-xs normal-case tracking-normal"
              />
            </label>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground space-y-1">
              Admin review confidence
              <div className="flex items-center gap-1">
                {(["low", "medium", "high"] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => onEvidenceChange({ ...ev, confidence: c })}
                    className={`h-7 px-3 rounded border text-[11px] capitalize transition ${
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
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground space-y-1 md:col-span-2">
              Internal notes (admin-only)
              <Textarea
                value={ev.internalNotes ?? ""}
                onChange={(e) => onEvidenceChange({ ...ev, internalNotes: e.target.value })}
                placeholder="Sales context, assumptions, follow-up questions — never shown to client."
                className="bg-muted/30 border-border min-h-[64px] text-xs normal-case tracking-normal"
              />
            </label>
          </div>
        )}
      </div>
  );
}

/** Preferred public name for new code. `FactorScorer` remains for back-compat. */
export const DiagnosticScoringRow = FactorScorer;

/** Re-export of rubricMeaning so legacy imports don't break. */
export { rubricMeaning };
