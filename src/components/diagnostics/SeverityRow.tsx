import { useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import {
  evidenceStatusOption,
  scoreEvidenceText,
  severityToEvidenceStatus,
  EVIDENCE_UNKNOWN_INSERT,
  type Severity,
} from "@/lib/diagnostics/engine";
import { getFactorPrompt } from "@/lib/diagnostics/factorPrompts";

interface Props {
  label: string;
  hint?: string;
  /** Optional metric-specific question rendered above the textarea. */
  question?: string;
  /** Factor key used to look up plain-English question/helper/placeholder copy. */
  factorKey?: string;
  /** Internal numeric severity (0..5). Derived from typed evidence text. */
  value: number;
  onChange: (v: Severity) => void;
  /** Optional pre-existing typed evidence text. */
  text?: string;
  onTextChange?: (next: string) => void;
}

const TONE_CLS: Record<string, string> = {
  ok: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
  watch: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  leaking: "border-orange-500/40 bg-orange-500/10 text-orange-200",
  critical: "border-destructive/50 bg-destructive/10 text-destructive",
  muted: "border-border bg-muted/30 text-muted-foreground",
};

/**
 * P41.4 — Compact typed-evidence row used in admin diagnostic grids when
 * the parent does not maintain a full evidence map. The typed answer is
 * scored deterministically; the resulting status is shown as output only.
 */
export function SeverityRow({ label, hint, question, factorKey, value, onChange, text, onTextChange }: Props) {
  void value;
  const [localText, setLocalText] = useState(text ?? "");
  const current = useMemo(() => scoreEvidenceText(localText), [localText]);
  const opt = evidenceStatusOption(current.status);
  const prompt = getFactorPrompt(factorKey ?? label, label);
  const questionText = question?.trim() || prompt.question;

  const update = (next: string) => {
    setLocalText(next);
    onTextChange?.(next);
    onChange(scoreEvidenceText(next).severity);
  };

  return (
    <div className="py-2 border-b border-border/40 last:border-0 space-y-1.5">
      <div className="text-xs text-foreground/90">{label}</div>
      <div className="text-[11px] text-foreground/85 font-medium">{questionText}</div>
      <div className="text-[10px] text-muted-foreground leading-relaxed">
        <span className="uppercase tracking-[0.14em] text-muted-foreground/70 mr-1">
          What a strong answer includes:
        </span>
        {prompt.helper}
      </div>
      {hint && <div className="text-[10px] text-muted-foreground/80">{hint}</div>}
      <Textarea
        value={localText}
        onChange={(e) => update(e.target.value)}
        placeholder={prompt.placeholder}
        className="bg-muted/30 border-border min-h-[56px] text-xs normal-case tracking-normal"
      />
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className={`rounded border px-2 py-1 text-[10px] inline-flex items-center gap-1 ${TONE_CLS[opt.tone]}`}>
          <Sparkles className="h-3 w-3" /> {opt.label}
        </div>
        <button
          type="button"
          onClick={() => update(EVIDENCE_UNKNOWN_INSERT)}
          className="text-[10px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
        >
          Mark as "I don't know"
        </button>
      </div>
    </div>
  );
}

/** Re-export so legacy callers continue to compile. */
export { severityToEvidenceStatus };
