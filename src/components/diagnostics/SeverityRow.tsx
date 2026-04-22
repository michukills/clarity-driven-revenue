import type { Severity } from "@/lib/diagnostics/engine";

interface Props {
  label: string;
  hint?: string;
  value: number;
  onChange: (v: Severity) => void;
}

/**
 * Compact 0–5 severity selector used inside admin diagnostic grids.
 * 0 = no leak, 5 = severe.
 */
export function SeverityRow({ label, hint, value, onChange }: Props) {
  return (
    <label className="flex items-center justify-between gap-3 py-1">
      <span className="text-xs text-foreground/90">
        {label}
        {hint && <span className="block text-[10px] text-muted-foreground">{hint}</span>}
      </span>
      <div className="flex items-center gap-1">
        {[0, 1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n as Severity)}
            className={`h-6 w-6 rounded text-[10px] tabular-nums border transition ${
              value === n
                ? "border-primary bg-primary/15 text-foreground"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
            aria-label={`${label} severity ${n}`}
          >
            {n}
          </button>
        ))}
      </div>
    </label>
  );
}