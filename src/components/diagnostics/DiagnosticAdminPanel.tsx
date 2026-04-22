import { Gauge, Flag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { SeverityRow } from "./SeverityRow";
import {
  type DiagnosticCategory,
  type DiagnosticResult,
  type SeverityMap,
  type Severity,
  fmtMoney,
} from "@/lib/diagnostics/engine";

interface Props {
  title: string;
  description: string;
  categories: DiagnosticCategory[];
  severities: SeverityMap;
  onSeverityChange: (categoryKey: string, factorKey: string, value: Severity) => void;
  result: DiagnosticResult;
  /** Optional revenue baseline input ($/mo). Hidden if `onBaselineChange` is omitted. */
  baselineMonthly?: number;
  onBaselineChange?: (n: number) => void;
  /** Override the score's denominator label, e.g. "/ 100" or "/ 1000". Default "/ 100". */
  scoreSuffix?: string;
  /** Hide $ leakage tiles for tools that don't model dollars (e.g. self-assessment). */
  hideMoney?: boolean;
}

/**
 * Reusable admin-side diagnostic panel: header (score + baseline), top-3 root cause callout,
 * and the 0–5 severity grid for every category × factor.
 * Used by every RGS tool that follows the shared diagnostic structure.
 */
export function DiagnosticAdminPanel({
  title,
  description,
  categories,
  severities,
  onSeverityChange,
  result,
  baselineMonthly,
  onBaselineChange,
  scoreSuffix = "/ 100",
  hideMoney,
}: Props) {
  return (
    <section className="bg-card border border-border rounded-xl p-6">
      <div className="mb-5 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-foreground flex items-center gap-2">
            <Gauge className="h-4 w-4 text-primary" /> {title}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5 max-w-xl">{description}</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {onBaselineChange && (
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              Monthly revenue baseline
              <Input
                type="number"
                value={baselineMonthly ?? 0}
                onChange={(e) => onBaselineChange(Number(e.target.value))}
                className="bg-muted/30 border-border h-8 w-32"
              />
            </label>
          )}
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Health score</div>
            <div className="font-display text-2xl tabular-nums text-foreground">
              {result.score}
              <span className="text-xs text-muted-foreground"> {scoreSuffix}</span>
            </div>
          </div>
        </div>
      </div>

      {!hideMoney && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          <div className="rounded-lg border border-border p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Estimated monthly leakage</div>
            <div className="text-lg tabular-nums text-foreground mt-1">{fmtMoney(result.monthly)}</div>
          </div>
          <div className="rounded-lg border border-border p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Estimated annual leakage</div>
            <div className="text-lg tabular-nums text-foreground mt-1">{fmtMoney(result.annual)}</div>
          </div>
          <div className="rounded-lg border border-border p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Suggested RGS next step</div>
            <div className="text-sm text-foreground mt-1">{result.nextStep}</div>
          </div>
        </div>
      )}

      {result.topThree.length > 0 && (
        <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-destructive mb-2">
            <Flag className="h-3 w-3" /> Top {Math.min(3, result.topThree.length)} weakest categories
          </div>
          <ul className="space-y-1 text-sm text-foreground">
            {result.topThree.map((c) => (
              <li key={c.key} className="flex justify-between gap-3">
                <span>{c.label}</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  severity {c.severity.toFixed(1)}
                  {!hideMoney ? ` · ${fmtMoney(c.monthly)}/mo` : ""}
                </span>
              </li>
            ))}
          </ul>
          {result.worst && (
            <div className="mt-3 text-xs text-muted-foreground space-y-1">
              <div><span className="text-foreground">Biggest root cause:</span> {result.worst.rootCause}</div>
              <div><span className="text-foreground">If ignored:</span> {result.worst.ifIgnored}</div>
              <div><span className="text-foreground">Fix first:</span> {result.worst.fixFirst}</div>
            </div>
          )}
        </div>
      )}

      <div className="space-y-4">
        {categories.map((cat) => {
          const r = result.categories.find((c) => c.key === cat.key)!;
          return (
            <div key={cat.key} className="rounded-lg border border-border p-4">
              <div className="flex items-center justify-between gap-4 mb-3 flex-wrap">
                <div>
                  <div className="text-sm text-foreground">{cat.label}</div>
                  <div className="text-[11px] text-muted-foreground">{cat.short}</div>
                </div>
                <div className="flex items-center gap-3 text-[11px]">
                  <span className="text-muted-foreground">Avg severity</span>
                  <span className="text-foreground tabular-nums">{r.severity.toFixed(1)} / 5</span>
                  {!hideMoney && (
                    <>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-foreground tabular-nums">{fmtMoney(r.monthly)}/mo</span>
                    </>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                {cat.factors.map((f) => {
                  const k = `${cat.key}.${f.key}`;
                  const v = Number(severities[k] ?? 0);
                  return (
                    <SeverityRow
                      key={k}
                      label={f.label}
                      hint={f.hint}
                      value={v}
                      onChange={(n) => onSeverityChange(cat.key, f.key, n)}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}