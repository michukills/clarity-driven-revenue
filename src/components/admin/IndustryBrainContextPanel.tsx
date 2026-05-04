/**
 * Industry Brain Context Panel — admin-only.
 *
 * Surfaces the deterministic Industry Brain context for a customer on the
 * admin diagnostic / report / repair-map / implementation / RGS Control
 * surfaces. This is admin review support: it never auto-publishes, never
 * grants tool access, never overrides deterministic scorecard scoring,
 * and is gated by the page's existing admin role + ProtectedRoute.
 *
 * Cannabis / MMJ / MMC / Rec context is dispensary / regulated-retail
 * operations only. Healthcare / HIPAA / clinical workflows are explicitly
 * out of scope (see `cannabisSafetyNotes`).
 */
import { Badge } from "@/components/ui/badge";
import {
  getIndustryBrainContextForCustomer,
  type IndustryBrainContext,
} from "@/lib/industryBrainContext";
import type { IndustryCategory } from "@/lib/priorityEngine/types";
import { ShieldAlert, Compass } from "lucide-react";

export interface IndustryBrainContextPanelProps {
  industry: IndustryCategory | string | null | undefined;
  /** Where the panel is mounted — drives which lists are emphasised. */
  surface:
    | "diagnostic_review"
    | "report_builder"
    | "repair_map"
    | "implementation"
    | "rgs_control_system";
  className?: string;
}

const SURFACE_LABEL: Record<IndustryBrainContextPanelProps["surface"], string> = {
  diagnostic_review: "Admin diagnostic review",
  report_builder: "Report builder",
  repair_map: "Priority repair map",
  implementation: "Implementation roadmap",
  rgs_control_system: "RGS Control System",
};

function List({
  title,
  items,
  empty = "No items.",
  max = 12,
}: {
  title: string;
  items: string[];
  empty?: string;
  max?: number;
}) {
  const shown = items.slice(0, max);
  const more = items.length - shown.length;
  return (
    <div className="space-y-1">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">
        {title}
      </div>
      {shown.length === 0 ? (
        <p className="text-xs text-muted-foreground">{empty}</p>
      ) : (
        <ul className="text-xs text-foreground space-y-1 list-disc pl-4">
          {shown.map((s) => (
            <li key={s}>{s}</li>
          ))}
          {more > 0 ? (
            <li className="text-muted-foreground list-none italic">
              +{more} more in Industry Brain catalog
            </li>
          ) : null}
        </ul>
      )}
    </div>
  );
}

export function IndustryBrainContextPanel({
  industry,
  surface,
  className,
}: IndustryBrainContextPanelProps) {
  const ctx: IndustryBrainContext = getIndustryBrainContextForCustomer(industry);
  const isCannabis = ctx.brainKey === "cannabis_mmj_mmc";

  const primaryLists: Array<{ title: string; items: string[]; empty?: string }> = (() => {
    switch (surface) {
      case "diagnostic_review":
        return [
          { title: "Likely failure points", items: ctx.industrySpecificFailurePoints },
          { title: "Software / evidence sources to ask for", items: ctx.softwareEvidenceSources },
          { title: "Owner-dependence risks", items: ctx.ownerDependenceRisks },
        ];
      case "report_builder":
        return [
          { title: "Report-language cues", items: ctx.reportLanguageCues },
          { title: "Repair-map implications", items: ctx.repairMapImplications },
          { title: "Monitoring signals to flag", items: ctx.controlSystemSignals },
        ];
      case "repair_map":
        return [
          { title: "Repair-map implications", items: ctx.repairMapImplications },
          { title: "Likely failure points", items: ctx.industrySpecificFailurePoints },
          { title: "Owner-dependence risks", items: ctx.ownerDependenceRisks },
        ];
      case "implementation":
        return [
          { title: "Tool / report mappings", items: ctx.toolReportMappings },
          { title: "Software / evidence sources", items: ctx.softwareEvidenceSources },
          { title: "Repair-map implications", items: ctx.repairMapImplications },
        ];
      case "rgs_control_system":
        return [
          { title: "Monitoring signals", items: ctx.controlSystemSignals },
          { title: "Likely failure points", items: ctx.industrySpecificFailurePoints },
          { title: "Software / evidence sources", items: ctx.softwareEvidenceSources },
        ];
    }
  })();

  return (
    <section
      className={
        "bg-card border border-border rounded-xl p-5 space-y-4 " + (className ?? "")
      }
      data-testid="industry-brain-context-panel"
      data-industry-brain-key={ctx.brainKey}
      data-industry-brain-surface={surface}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Compass className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium text-foreground">
              Industry Brain context
            </h3>
            <Badge variant="outline" className="text-[10px]">
              Admin only
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {SURFACE_LABEL[surface]} support. Helps surface likely gaps and
            organize evidence — does not override deterministic scorecard
            scoring, does not auto-publish, and requires admin review.
          </p>
        </div>
        <div className="text-right space-y-1">
          <Badge variant="secondary" className="text-[11px]">
            {ctx.industryLabel}
          </Badge>
          {ctx.fellBackToGeneral ? (
            <div className="text-[10px] text-amber-300">
              Industry not confirmed — using General fallback
            </div>
          ) : null}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {primaryLists.map((l) => (
          <List key={l.title} title={l.title} items={l.items} />
        ))}
      </div>

      {isCannabis ? (
        <div className="border border-amber-400/30 bg-amber-400/5 rounded-md p-3 text-xs text-amber-200 space-y-1">
          <div className="flex items-center gap-2 font-medium">
            <ShieldAlert className="h-3.5 w-3.5" />
            Cannabis / MMJ / MMC safety notes
          </div>
          <ul className="list-disc pl-4 space-y-0.5">
            {ctx.cannabisSafetyNotes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="text-[11px] text-muted-foreground">
        Source: Industry Brain catalog · resolved from{" "}
        <span className="font-mono text-foreground">customers.industry</span>.
        Content stays admin-only unless approved through existing
        client-visible controls.
      </p>
    </section>
  );
}

export default IndustryBrainContextPanel;