import { useMemo } from "react";
import { Sparkles } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import {
  evidenceStatusOption,
  scoreEvidenceText,
  severityToEvidenceStatus,
  type Severity,
} from "@/lib/diagnostics/engine";

interface Props {
  label: string;
  hint?: string;
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
export function SeverityRow({ label, hint, value, onChange, text, onTextChange }: Props) {
  const [localText, setLocalText] = useStateFallback(text ?? "");
  const current = useMemo(() => scoreEvidenceText(localText), [localText]);
  const opt = evidenceStatusOption(current.status);

  const update = (next: string) => {
    setLocalText(next);
    onTextChange?.(next);
    onChange(scoreEvidenceText(next).severity);
  };

  return (
    <div className="py-2 border-b border-border/40 last:border-0 space-y-1.5">
      <div className="text-xs text-foreground/90">{label}</div>
      {hint && <div className="text-[10px] text-muted-foreground">{hint}</div>}
      <Textarea
        value={localText}
        onChange={(e) => update(e.target.value)}
        placeholder="Describe what is actually happening. RGS will calculate the status."
        className="bg-muted/30 border-border min-h-[56px] text-xs normal-case tracking-normal"
      />
      <div className={`rounded border px-2 py-1 text-[10px] inline-flex items-center gap-1 ${TONE_CLS[opt.tone]}`}>
        <Sparkles className="h-3 w-3" /> {opt.label}
      </div>
    </div>
  );
}

// Tiny inline useState shim so this file doesn't need an extra import line for a single hook.
import { useState as useStateFallback } from "react";
// Re-export severityToEvidenceStatus for legacy callers.
export { severityToEvidenceStatus };

function _legacy(_: Severity) {
  return _;
}
