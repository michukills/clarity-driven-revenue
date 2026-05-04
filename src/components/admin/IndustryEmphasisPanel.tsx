/**
 * Industry Emphasis Panel — admin-only.
 *
 * Surfaces the deterministic industry-adjusted interpretation layer
 * (`src/lib/industries/interpretation.ts`) on launch-relevant admin /
 * reporting / repair-map / implementation / RGS Control surfaces. This is
 * an emphasis layer ONLY — it never alters the deterministic 0–1000
 * Business Stability Score, never auto-publishes, and never relaxes role
 * or access gates. Cannabis / MMJ / MMC context is dispensary / regulated
 * retail operations only — never healthcare / HIPAA / clinical.
 */
import { Badge } from "@/components/ui/badge";
import {
  getIndustryEmphasis,
  type IndustryEmphasis,
} from "@/lib/industries/interpretation";
import type { IndustryCategory } from "@/lib/priorityEngine/types";
import { Gauge, ShieldAlert } from "lucide-react";

const GEAR_LABEL: Record<string, string> = {
  demand_generation: "Demand generation",
  revenue_conversion: "Revenue conversion",
  operational_efficiency: "Operational efficiency",
  financial_visibility: "Financial visibility",
  owner_independence: "Owner independence",
};

export type EmphasisSurface =
  | "diagnostic_review"
  | "report_builder"
  | "repair_map"
  | "implementation"
  | "rgs_control_system"
  | "revenue_risk_monitor";

const SURFACE_HINT: Record<EmphasisSurface, string> = {
  diagnostic_review:
    "Use these emphasis cues while reviewing the owner's answers. The base 0–1000 Stability Score is unchanged.",
  report_builder:
    "Pull these signals into the report's prioritization narrative. The deterministic score is not altered.",
  repair_map:
    "These items typically rise in priority for this industry. Use to sequence the repair map.",
  implementation:
    "Use these signals to sequence implementation. Score remains unchanged.",
  rgs_control_system:
    "Monitoring emphasis for this industry — informs what to watch first.",
  revenue_risk_monitor:
    "Risk signals weighted higher for this industry — informs what to flag first.",
};

export interface IndustryEmphasisPanelProps {
  industry: IndustryCategory | string | null | undefined;
  surface: EmphasisSurface;
  className?: string;
}

function Section({ title, items }: { title: string; items: string[] }) {
  if (!items?.length) return null;
  return (
    <div className="space-y-1">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">
        {title}
      </div>
      <ul className="text-xs text-foreground space-y-1 list-disc pl-4">
        {items.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
    </div>
  );
}

export function IndustryEmphasisPanel({
  industry,
  surface,
  className,
}: IndustryEmphasisPanelProps) {
  const e: IndustryEmphasis = getIndustryEmphasis(
    (industry as IndustryCategory | null | undefined) ?? null,
  );
  const isCannabis = e.industry === "mmj_cannabis";
  return (
    <section
      className={
        "bg-card border border-border rounded-xl p-5 space-y-4 " + (className ?? "")
      }
      data-testid="industry-emphasis-panel"
      data-industry-emphasis-key={e.industry}
      data-industry-emphasis-surface={surface}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Gauge className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium text-foreground">
              Industry emphasis
            </h3>
            <Badge variant="outline" className="text-[10px]">
              Admin only
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              Score unchanged
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">{SURFACE_HINT[surface]}</p>
        </div>
        <Badge variant="secondary" className="text-[11px]">
          {e.label}
        </Badge>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Section
          title="Priority gears (review first)"
          items={e.priority_gears.map((g) => GEAR_LABEL[g] ?? g)}
        />
        <Section title="Industry priority signals" items={e.priority_signals} />
        <Section
          title="Repair-map impact (why these rise in priority)"
          items={e.repair_priority_emphasis}
        />
        <Section title="Monitoring emphasis" items={e.monitoring_emphasis} />
      </div>

      {isCannabis && e.safety_notes.length > 0 ? (
        <div className="border border-amber-400/30 bg-amber-400/5 rounded-md p-3 text-xs text-amber-200 space-y-1">
          <div className="flex items-center gap-2 font-medium">
            <ShieldAlert className="h-3.5 w-3.5" />
            Cannabis / MMJ / MMC safety notes
          </div>
          <ul className="list-disc pl-4 space-y-0.5">
            {e.safety_notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="text-[11px] text-muted-foreground">
        Source: industry-adjusted interpretation layer. This is supporting
        emphasis only — it does not change the deterministic 0–1000 Business
        Stability Score and is not client-visible unless approved through
        existing controls.
      </p>
    </section>
  );
}

export default IndustryEmphasisPanel;