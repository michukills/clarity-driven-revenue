import type { HealthScore } from "@/lib/bcc/engine";

const colorFor = (n: number) =>
  n >= 80 ? "text-emerald-400" : n >= 65 ? "text-sky-400" : n >= 50 ? "text-amber-300" : n >= 35 ? "text-orange-400" : "text-rose-400";

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
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Business Health Score</div>
          <div className="mt-2 flex items-end gap-3">
            <div className={`text-5xl font-light ${colorFor(health.overall)}`}>{health.overall}</div>
            <div className="text-xs text-muted-foreground pb-2">/ 100</div>
          </div>
        </div>
        <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] uppercase tracking-wider ${conditionStyle[health.condition]}`}>
          {health.condition}
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {COMPONENTS.map(([key, label]) => {
          const v = health.components[key];
          return (
            <div key={key} className="flex items-center justify-between gap-3 p-2 rounded-md bg-muted/20">
              <span className="text-xs text-muted-foreground">{label}</span>
              <div className="flex items-center gap-2 min-w-[120px]">
                <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      v >= 70 ? "bg-emerald-500/70" : v >= 50 ? "bg-amber-400/70" : "bg-rose-500/70"
                    }`}
                    style={{ width: `${v}%` }}
                  />
                </div>
                <span className={`text-xs tabular-nums ${colorFor(v)}`}>{v}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}