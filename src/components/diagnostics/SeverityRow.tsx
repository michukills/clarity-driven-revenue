import {
  EVIDENCE_STATUS_OPTIONS,
  evidenceStatusToSeverity,
  severityToEvidenceStatus,
  type Severity,
} from "@/lib/diagnostics/engine";

interface Props {
  label: string;
  hint?: string;
  /** Internal numeric severity (0..5). Kept for back-compat with existing scoring math. */
  value: number;
  onChange: (v: Severity) => void;
}

const TONE_CLS: Record<string, string> = {
  ok: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
  watch: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  leaking: "border-orange-500/40 bg-orange-500/10 text-orange-200",
  critical: "border-destructive/50 bg-destructive/10 text-destructive",
  muted: "border-border bg-muted/30 text-muted-foreground",
};

/**
 * P41.3 — Compact evidence-status row used inside admin diagnostic grids.
 * Replaces the legacy 0–5 numeric severity buttons. The numeric value is
 * still stored internally so the deterministic engine math is unchanged.
 */
export function SeverityRow({ label, hint, value, onChange }: Props) {
  const current = severityToEvidenceStatus(value);
  return (
    <div className="py-2 border-b border-border/40 last:border-0">
      <div className="text-xs text-foreground/90">{label}</div>
      {hint && <div className="text-[10px] text-muted-foreground mb-1">{hint}</div>}
      <div className="mt-1 flex flex-wrap gap-1.5">
        {EVIDENCE_STATUS_OPTIONS.map((opt) => {
          const isSelected = current === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(evidenceStatusToSeverity(opt.value))}
              onMouseDown={(e) => e.preventDefault()}
              title={opt.hint}
              aria-label={`${label} — ${opt.label}`}
              aria-pressed={isSelected}
              className={`text-[10px] px-2 py-1 rounded-md border transition ${
                isSelected
                  ? TONE_CLS[opt.tone]
                  : "border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
