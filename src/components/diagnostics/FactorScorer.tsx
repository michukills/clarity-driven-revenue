import { useState } from "react";
import { ChevronDown, ChevronUp, BookOpen } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
} from "@/lib/diagnostics/engine";

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
}

const TONE_CLS: Record<string, string> = {
  ok: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
  watch: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  leaking: "border-orange-500/40 bg-orange-500/10 text-orange-200",
  critical: "border-destructive/50 bg-destructive/10 text-destructive",
  muted: "border-border bg-muted/30 text-muted-foreground",
};

/**
 * P41.3 — Per-factor evidence-status row used by every RGS diagnostic tool.
 *
 * The legacy 0–5 numeric severity buttons have been replaced with categorical
 * evidence statuses (Verified strength → Critical gap). The numeric value is
 * derived deterministically from the chosen status and stored internally so
 * the scoring engine math is preserved, but it is NEVER rendered in the UI.
 */
export function FactorScorer({
  factor,
  value,
  evidence,
  onScoreChange,
  onEvidenceChange,
  compact,
}: Props) {
  const [open, setOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const ev: FactorEvidence = evidence ?? {};
  const currentStatus = severityToEvidenceStatus(value);
  const currentOpt = evidenceStatusOption(currentStatus);
  const confidence: Confidence = ev.confidence ?? "medium";

  return (
    <TooltipProvider delayDuration={120}>
      <div className="rounded-md border border-border bg-card/50 px-3 py-2.5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="text-xs text-foreground/90">{factor.label}</div>
            {factor.lookFor && !compact && (
              <div className="text-[10px] text-muted-foreground mt-0.5">{factor.lookFor}</div>
            )}
          </div>
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {EVIDENCE_STATUS_OPTIONS.map((opt) => {
            const isSelected = currentStatus === opt.value;
            return (
              <Tooltip key={opt.value}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => onScoreChange(evidenceStatusToSeverity(opt.value))}
                    onMouseDown={(e) => e.preventDefault()}
                    aria-pressed={isSelected}
                    aria-label={`${factor.label} — ${opt.label}`}
                    className={`text-[10px] px-2 py-1 rounded-md border transition focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                      isSelected
                        ? TONE_CLS[opt.tone]
                        : "border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
                    }`}
                  >
                    {opt.label}
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  align="center"
                  avoidCollisions
                  collisionPadding={12}
                  className="max-w-[260px] text-xs leading-relaxed"
                >
                  {opt.hint}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        {value > 0 && (
          <div className="mt-2 text-[11px] leading-relaxed text-foreground/80">
            <span className="text-muted-foreground">Current assessment:</span>{" "}
            {currentOpt.label} — {currentOpt.hint}
          </div>
        )}

        <div className="mt-2 flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => setGuideOpen((o) => !o)}
            className="text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          >
            <BookOpen className="h-3 w-3" />
            {guideOpen ? "Hide rubric" : "Rubric guide"}
          </button>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          >
            {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {open ? "Hide evidence" : ev.notes || ev.clientFinding || ev.internalNotes ? "Edit evidence" : "Add evidence"}
          </button>
        </div>

        {guideOpen && (
          <div className="mt-2 rounded-md border border-border/70 bg-muted/20 p-2 space-y-1.5">
            {EVIDENCE_STATUS_OPTIONS.map((opt) => (
              <div key={opt.value} className="text-[11px] leading-snug">
                <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] mr-2 border ${TONE_CLS[opt.tone]}`}>
                  {opt.label}
                </span>
                <span className="text-foreground/85">
                  {factor.rubric?.[evidenceStatusToSeverity(opt.value)] ?? opt.hint}
                </span>
              </div>
            ))}
          </div>
        )}

        {open && (
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 border-t border-border pt-3">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground space-y-1">
              Evidence basis (client-visible)
              <Textarea
                value={ev.notes ?? ""}
                onChange={(e) => onEvidenceChange({ ...ev, notes: e.target.value })}
                placeholder="What evidence — examples, artifacts, observations — supports this assessment?"
                className="bg-muted/30 border-border min-h-[64px] text-xs normal-case tracking-normal"
              />
            </label>
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
              Confidence
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
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground space-y-1">
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
    </TooltipProvider>
  );
}

/** Preferred public name for new code. `FactorScorer` remains for back-compat. */
export const DiagnosticScoringRow = FactorScorer;

/** Re-export of rubricMeaning so legacy imports don't break. */
export { rubricMeaning };
