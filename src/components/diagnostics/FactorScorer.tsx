import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  type DiagnosticFactor,
  type FactorEvidence,
  type Severity,
  type Confidence,
  rubricMeaning,
} from "@/lib/diagnostics/engine";

interface Props {
  categoryKey: string;
  factor: DiagnosticFactor;
  value: number;
  evidence?: FactorEvidence;
  onScoreChange: (v: Severity) => void;
  onEvidenceChange: (e: FactorEvidence) => void;
}

/**
 * Per-factor admin scorer: 0–5 selector + rubric meaning + evidence + confidence + finding + internal notes.
 * Collapses by default to keep grids compact; expands on demand.
 */
export function FactorScorer({
  factor,
  value,
  evidence,
  onScoreChange,
  onEvidenceChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const ev: FactorEvidence = evidence ?? {};
  const meaning = rubricMeaning(factor, value);
  const confidence: Confidence = ev.confidence ?? "medium";

  return (
    <div className="rounded-md border border-border bg-card/50 px-3 py-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-xs text-foreground/90">{factor.label}</div>
          {factor.lookFor && (
            <div className="text-[10px] text-muted-foreground mt-0.5">Look for: {factor.lookFor}</div>
          )}
          <div className="text-[10px] text-muted-foreground mt-0.5">
            <span className="text-foreground/70">@{value}:</span> {meaning}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <div className="flex items-center gap-1">
            {[0, 1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => onScoreChange(n as Severity)}
                className={`h-6 w-6 rounded text-[10px] tabular-nums border transition ${
                  value === n
                    ? "border-primary bg-primary/15 text-foreground"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
                aria-label={`${factor.label} severity ${n}`}
              >
                {n}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          >
            {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {open ? "Hide evidence" : ev.notes || ev.clientFinding || ev.internalNotes ? "Edit evidence" : "Add evidence"}
          </button>
        </div>
      </div>

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
  );
}