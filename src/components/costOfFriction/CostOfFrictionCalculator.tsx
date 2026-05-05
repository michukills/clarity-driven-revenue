/**
 * P72 — Cost of Friction Calculator™ shared UI.
 *
 * Pure presentation: takes inputs/assumptions, renders editable fields
 * grouped by RGS gear, shows deterministic calculations, total monthly,
 * total annual, and "not enough information" states. No persistence
 * here — admin/client wrapper pages handle saving + visibility.
 */
import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  COST_OF_FRICTION_GEARS,
  COST_OF_FRICTION_GEAR_LABELS,
  COST_OF_FRICTION_LINES,
  COST_OF_FRICTION_NAME,
  COST_OF_FRICTION_CLIENT_DISCLAIMER,
  computeCostOfFriction,
  MISSING_DATA_LABEL,
  type CostOfFrictionAssumptions,
  type CostOfFrictionGear,
  type CostOfFrictionInputs,
} from "@/config/costOfFriction";

const fmtMoney = (n: number) => `$${Math.round(n).toLocaleString()}`;

interface Props {
  inputs: CostOfFrictionInputs;
  assumptions: CostOfFrictionAssumptions;
  onInputChange: (lineKey: string, fieldKey: string, value: number | undefined) => void;
  onAssumptionsChange: (a: CostOfFrictionAssumptions) => void;
  /** Hide assumption-editor (e.g., for read-only client view). */
  readOnly?: boolean;
}

export function CostOfFrictionCalculator({
  inputs,
  assumptions,
  onInputChange,
  onAssumptionsChange,
  readOnly = false,
}: Props) {
  const result = useMemo(
    () => computeCostOfFriction(inputs, assumptions),
    [inputs, assumptions],
  );

  const linesByGear: Record<CostOfFrictionGear, typeof COST_OF_FRICTION_LINES[number][]> = {
    demand_generation: [],
    revenue_conversion: [],
    operational_efficiency: [],
    financial_visibility: [],
    owner_independence: [],
  };
  for (const l of COST_OF_FRICTION_LINES) linesByGear[l.gear].push(l);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card/60 p-5">
        <div className="flex items-center gap-2 mb-2">
          <h2 className="text-lg font-medium text-foreground">{COST_OF_FRICTION_NAME}</h2>
          <Badge variant="outline">Estimate only</Badge>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {COST_OF_FRICTION_CLIENT_DISCLAIMER}
        </p>
      </div>

      {!readOnly && (
        <div className="rounded-xl border border-border bg-card/40 p-5">
          <h3 className="text-sm font-medium text-foreground mb-3">
            Assumptions (editable)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <AssumptionField
              label="Loaded hourly cost ($/hr)"
              value={assumptions.loadedHourlyCost}
              onChange={(v) => onAssumptionsChange({ ...assumptions, loadedHourlyCost: v })}
            />
            <AssumptionField
              label="Owner hourly value ($/hr)"
              value={assumptions.ownerHourlyValue}
              onChange={(v) => onAssumptionsChange({ ...assumptions, ownerHourlyValue: v })}
            />
            <AssumptionField
              label="Collections drag factor (0–1)"
              value={assumptions.collectionsDragFactor}
              onChange={(v) => onAssumptionsChange({ ...assumptions, collectionsDragFactor: v })}
              step="0.001"
            />
          </div>
        </div>
      )}

      {COST_OF_FRICTION_GEARS.map((gear) => (
        <div key={gear} className="rounded-xl border border-border bg-card/60 p-5">
          <header className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-foreground">
              {COST_OF_FRICTION_GEAR_LABELS[gear]}
            </h3>
            <Badge variant="outline">
              {fmtMoney(result.byGear[gear])} / mo
            </Badge>
          </header>
          <ul className="space-y-4">
            {linesByGear[gear].map((line) => {
              const lineResult = result.lines.find((l) => l.key === line.key)!;
              return (
                <li key={line.key} className="rounded-lg border border-border/60 bg-background/40 p-3">
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <span className="text-sm font-medium text-foreground">{line.label}</span>
                    <span className="text-xs">
                      {lineResult.monthly === null ? (
                        <span className="text-muted-foreground italic">{MISSING_DATA_LABEL}</span>
                      ) : (
                        <span className="text-foreground">{fmtMoney(lineResult.monthly)} / mo</span>
                      )}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mb-2">{line.helper}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {line.inputs.map((field) => (
                      <label key={field.key} className="text-[11px] text-muted-foreground">
                        {field.label}
                        <Input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step="any"
                          disabled={readOnly}
                          value={inputs[line.key]?.[field.key] ?? ""}
                          aria-label={field.label}
                          onChange={(e) => {
                            const raw = e.target.value;
                            const v = raw === "" ? undefined : Number(raw);
                            onInputChange(line.key, field.key, Number.isFinite(v as number) && (v as number) >= 0 ? (v as number) : undefined);
                          }}
                          className="mt-1 h-11 sm:h-10 bg-muted/40"
                        />
                      </label>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      <div className="rounded-xl border border-primary/30 bg-primary/5 p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Estimated monthly friction
            </p>
            <p className="text-2xl font-medium text-foreground">{fmtMoney(result.monthlyTotal)}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Estimated annual friction
            </p>
            <p className="text-2xl font-medium text-foreground">{fmtMoney(result.annualTotal)}</p>
          </div>
        </div>
        {result.missingLines.length > 0 && (
          <p className="mt-3 text-[11px] text-muted-foreground">
            {result.missingLines.length} line(s) excluded — not enough information yet.
          </p>
        )}
      </div>
    </div>
  );
}

function AssumptionField({
  label,
  value,
  onChange,
  step = "any",
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: string;
}) {
  return (
    <label className="text-[11px] text-muted-foreground">
      {label}
      <Input
        type="number"
        min={0}
        step={step}
        value={value}
        onChange={(e) => {
          const v = Number(e.target.value);
          onChange(Number.isFinite(v) && v >= 0 ? v : 0);
        }}
        className="mt-1 h-9 bg-muted/40"
      />
    </label>
  );
}

export default CostOfFrictionCalculator;