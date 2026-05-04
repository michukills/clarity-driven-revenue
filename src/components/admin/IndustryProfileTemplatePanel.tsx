// P22.1 — Admin-only vertical profile template panel.
// Renders the lightweight industry profile + diagnostic prompts that guide
// internal questioning. NEVER render this verbatim to clients.

import { useMemo, useState } from "react";
import {
  INDUSTRY_DIAGNOSTIC_PROMPTS,
  INDUSTRY_PROFILE_TEMPLATES,
  industryAccessDecision,
} from "@/lib/industryGuardrails";
import type { IndustryKey } from "@/lib/toolCatalog";
import { ChevronDown, ChevronRight, ShieldAlert, Lock } from "lucide-react";

interface Props {
  customerIndustry: string | null | undefined;
  industryConfirmed: boolean;
}

function isTemplated(k: string): k is Exclude<IndustryKey, "other"> {
  return (
    k === "trade_field_service" ||
    k === "retail" ||
    k === "restaurant" ||
    k === "mmj_cannabis" ||
    k === "general_service"
  );
}

export function IndustryProfileTemplatePanel({
  customerIndustry,
  industryConfirmed,
}: Props) {
  const [open, setOpen] = useState(true);

  const decision = useMemo(
    () => industryAccessDecision({ industry: customerIndustry, industryConfirmed }),
    [customerIndustry, industryConfirmed],
  );

  const templated = isTemplated((customerIndustry ?? "") as string);
  const tpl = templated
    ? INDUSTRY_PROFILE_TEMPLATES[customerIndustry as Exclude<IndustryKey, "other">]
    : null;
  const prompts = templated
    ? INDUSTRY_DIAGNOSTIC_PROMPTS[customerIndustry as Exclude<IndustryKey, "other">]
    : null;

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between w-full text-left"
      >
        <div>
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-primary">
            <Lock className="h-3 w-3" /> Admin-only
          </div>
          <h3 className="text-base text-foreground mt-1">Vertical profile & diagnostic prompts</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-xl">
            Internal guidance to help RGS ask better questions. Do not show this
            verbatim to clients.
          </p>
        </div>
        {open ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {open && (
        <>
          {decision.warning && (
            <div className="text-[11px] text-foreground border border-amber-500/30 bg-amber-500/10 rounded-md px-3 py-2 flex items-start gap-2">
              <ShieldAlert className="h-3.5 w-3.5 text-amber-500 mt-0.5" />
              <div>{decision.warning}</div>
            </div>
          )}
          {!decision.allowed && !decision.warning && (
            <div className="text-[11px] text-foreground border border-amber-500/30 bg-amber-500/10 rounded-md px-3 py-2 flex items-start gap-2">
              <ShieldAlert className="h-3.5 w-3.5 text-amber-500 mt-0.5" />
              <div>
                Industry-specific tools and learning are restricted until industry is confirmed.
              </div>
            </div>
          )}

          {!templated && (
            <div className="text-xs text-muted-foreground">
              No vertical template for <code>{customerIndustry ?? "(unset)"}</code>.
              Confirm a supported industry to load its template.
            </div>
          )}

          {templated && tpl && prompts && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Block label="Revenue streams" items={tpl.revenue_streams} />
              <Block label="Lead / demand sources" items={tpl.lead_demand_sources} />
              <Block label="Conversion bottlenecks" items={tpl.conversion_bottlenecks} />
              <Block label="Operational bottlenecks" items={tpl.operational_bottlenecks} />
              <Block label="Financial visibility risks" items={tpl.financial_visibility_risks} />
              <Block label="Owner-dependence risks" items={tpl.owner_dependence_risks} />
              <Block label="Staffing / labor" items={tpl.staffing_labor} />
              <Block label="Customer experience / handoff" items={tpl.customer_experience} />
              <Block label="Capacity constraints" items={tpl.capacity_constraints} />
              <Block label="Margin / profitability" items={tpl.margin_profitability} />
              <Block label="Industry-specific failure points" items={tpl.industry_failure_points} />
              <Block label="RGS Control System monitoring signals" items={tpl.monitoring_signals} />
              <Block label="Typical evidence sources" items={tpl.typical_evidence_sources} />
              <Block label="Diagnostic considerations" items={prompts.considerations} />
              <Block
                label="Forbidden assumptions"
                items={tpl.forbidden_assumptions}
                tone="danger"
              />
              <Block
                label="Industry guardrails"
                items={prompts.guardrails}
                tone="danger"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Block({
  label,
  items,
  tone,
}: {
  label: string;
  items: string[];
  tone?: "default" | "danger";
}) {
  return (
    <div
      className={
        "rounded-md border p-3 " +
        (tone === "danger"
          ? "border-destructive/30 bg-destructive/5"
          : "border-border bg-muted/20")
      }
    >
      <div
        className={
          "text-[10px] uppercase tracking-wider mb-1.5 " +
          (tone === "danger" ? "text-destructive" : "text-muted-foreground")
        }
      >
        {label}
      </div>
      <ul className="space-y-1 text-[12px] text-foreground list-disc pl-4">
        {items.map((it) => (
          <li key={it}>{it}</li>
        ))}
      </ul>
    </div>
  );
}

export default IndustryProfileTemplatePanel;