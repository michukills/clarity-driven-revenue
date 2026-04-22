import type { HealthScore } from "@/lib/bcc/engine";

const colorFor = (n: number) =>
  n >= 80 ? "text-emerald-400" : n >= 65 ? "text-sky-400" : n >= 50 ? "text-amber-300" : n >= 35 ? "text-orange-400" : "text-rose-400";

const barColorFor = (n: number) =>
  n >= 80 ? "bg-emerald-500/80" : n >= 65 ? "bg-sky-500/80" : n >= 50 ? "bg-amber-400/80" : n >= 35 ? "bg-orange-500/80" : "bg-rose-500/80";

const conditionStyle: Record<HealthScore["condition"], string> = {
  Strong: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  Stable: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  Watch: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  Leaking: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  Critical: "bg-rose-500/15 text-rose-300 border-rose-500/30",
};

const COMPONENTS: Array<[keyof HealthScore["components"], string]> = [
  ["revenueStability", "Revenue stability"],
  ["marginHealth", "Margin health"],
  ["payrollLoad", "Payroll load"],
  ["expenseControl", "Expense control"],
  ["cashVisibility", "Cash visibility"],
  ["receivablesRisk", "Receivables risk"],
  ["ownerDependency", "Owner dependency"],
];

export function HealthScoreCard({ health }: { health: HealthScore }) {
  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Business Health Score</div>
          <div className="mt-2 flex items-end gap-3">
            <div className={`text-5xl font-light tabular-nums ${colorFor(health.overall)}`}>{health.overall}</div>
            <div className="text-xs text-muted-foreground pb-2">/ 100</div>
          </div>
        </div>
        <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] uppercase tracking-wider ${conditionStyle[health.condition]}`}>
          {health.condition}
        </span>
      </div>
      <div className="flex flex-col gap-4">
        {COMPONENTS.map(([key, label]) => {
          const v = Math.max(0, Math.min(100, health.components[key] ?? 0));
          return (
            <div key={key} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-xs text-muted-foreground leading-snug break-words pr-2">{label}</span>
                <span className={`text-xs tabular-nums shrink-0 ${colorFor(v)}`}>{v}</span>
              </div>
              <div
                className="h-1.5 w-full bg-muted/40 rounded-full overflow-hidden"
                role="progressbar"
                aria-valuenow={v}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={label}
              >
                <div
                  className={`h-full rounded-full transition-[width] duration-300 ${barColorFor(v)}`}
                  style={{ width: `${v}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
