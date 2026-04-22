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
  bandForScore,
  bandLabel,
  bandTone,
  rubricMeaning,
  scoreTooltip,
} from "@/lib/diagnostics/engine";

interface Props {
  categoryKey: string;
  factor: DiagnosticFactor;
  value: number;
  evidence?: FactorEvidence;
  onScoreChange: (v: Severity) => void;
  onEvidenceChange: (e: FactorEvidence) => void;
  /** Compact mode hides the always-visible meaning under the label; tooltip still works. */
  compact?: boolean;
}

/**
 * Per-factor scoring row used across every RGS diagnostic tool.
 * Compact by default — score meaning + scoring guide stay behind hover/focus
 * tooltips and an optional "Scoring guide" expandable section.
 *
 * Layout:
 *   [factor name + short explanation]                 [0 1 2 3 4 5]
 *   [selected score summary + severity band]
 *   [Scoring guide ▾]   [Add evidence ▾]
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
  const meaning = rubricMeaning(factor, value);
  const confidence: Confidence = ev.confidence ?? "medium";
  const selectedBand = bandForScore(value);

  return (
    <TooltipProvider delayDuration={120}>
      <div className="rounded-md border border-border bg-card/50 px-3 py-2">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="text-xs text-foreground/90">{factor.label}</div>
            {factor.lookFor && !compact && (
              <div className="text-[10px] text-muted-foreground mt-0.5">{factor.lookFor}</div>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {[0, 1, 2, 3, 4, 5].map((n) => {
              const score = n as 0 | 1 | 2 | 3 | 4 | 5;
              const band = bandForScore(score);
              const isSelected = value === score;
              return (
                <Tooltip key={n}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => onScoreChange(score)}
                      onMouseDown={(e) => e.preventDefault()}
                      className={`h-6 w-6 rounded text-[10px] tabular-nums border transition focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                        isSelected
                          ? "border-primary bg-primary/15 text-foreground"
                          : "border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
                      }`}
                      aria-label={`${factor.label} — ${scoreTooltip(factor, score)}`}
                    >
                      {n}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    align="center"
                    avoidCollisions
                    collisionPadding={12}
                    className="max-w-[260px] text-xs leading-relaxed"
                  >
                    <div className={`text-[10px] uppercase tracking-wider mb-1 ${bandTone(band)}`}>
                      {bandLabel(band)}
                    </div>
                    {scoreTooltip(factor, score)}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </div>

        {/* Selected score summary — always visible after a number is selected */}
        {value > 0 && (
          <div className="mt-2 text-[11px] leading-relaxed">
            <span className={`uppercase tracking-wider text-[10px] ${bandTone(selectedBand)}`}>
              {value} · {bandLabel(selectedBand)}
            </span>
            <span className="text-foreground/80 ml-2">{meaning}</span>
          </div>
        )}

        {/* Compact actions: scoring guide + evidence */}
        <div className="mt-2 flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => setGuideOpen((o) => !o)}
            className="text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          >
            <BookOpen className="h-3 w-3" />
            {guideOpen ? "Hide scoring guide" : "Scoring guide"}
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
          <div className="mt-2 rounded-md border border-border/70 bg-muted/20 p-2 space-y-1">
            {([0, 1, 2, 3, 4, 5] as const).map((n) => {
              const band = bandForScore(n);
              return (
                <div key={n} className="text-[11px] leading-snug flex gap-2">
                  <span className={`tabular-nums w-4 ${bandTone(band)}`}>{n}</span>
                  <span className="text-foreground/85">
                    <span className={`uppercase tracking-wider text-[9px] mr-1 ${bandTone(band)}`}>
                      {bandLabel(band)}
                    </span>
                    {factor.rubric?.[n] ?? meaning /* sensible fallback */}
                  </span>
                </div>
              );
            })}
          </div>
        )}

      {open && (
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 border-t border-border pt-3">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground space-y-1">
            Evidence notes (client-visible)
            <Textarea
              value={ev.notes ?? ""}
              onChange={(e) => onEvidenceChange({ ...ev, notes: e.target.value })}
              placeholder="What did you observe that justifies this score?"
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