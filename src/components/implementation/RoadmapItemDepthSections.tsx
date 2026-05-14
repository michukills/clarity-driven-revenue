/**
 * P93H-G — Roadmap item E2F depth sections.
 *
 * Surfaces the deterministic Implementation Depth Engine (P93E-E2F)
 * data — dependency mapping, do-not-do-yet, first actions, leading
 * indicators, and the RGS Control System monitoring handoff — directly
 * on a single roadmap item card.
 *
 * Two variants:
 *   - "admin"  — full E2F depth, including admin-only sequencing notes.
 *   - "client" — only client-safe fields (never renders admin notes,
 *                never invents data, falls back to honest empty states).
 *
 * This component does not change scoring, does not call AI, and does
 * not generate content — it only consumes existing industry sequencing
 * + diagnostic depth matrix data via getRoadmapItemDepthContext().
 */
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, ShieldCheck, Activity, Compass } from "lucide-react";
import { industryToMatrixKey } from "@/lib/controlSystem/industryMap";
import {
  getRoadmapItemDepthContext,
  type RoadmapItemDepthContext,
} from "@/lib/implementation/depthEngine";
import type { MatrixGearKey } from "@/config/industryDiagnosticDepthMatrix";

type Variant = "admin" | "client";

export interface RoadmapItemDepthSectionsProps {
  /** Free-form customer industry; will be normalized to MatrixIndustryKey. */
  industry: string | null | undefined;
  /** Roadmap item gear; null/unknown gears render honest empty states. */
  gear: MatrixGearKey | string | null | undefined;
  /** Admin sees the full set; client sees only approved/safe fields. */
  variant: Variant;
  /**
   * For client variant only: gate everything behind the item's
   * client_visible flag. Admin-only fields are never rendered when this
   * is false; the whole block renders nothing if false on client.
   */
  clientVisible?: boolean;
  className?: string;
}

function Section({
  title,
  items,
  emptyMessage,
  testId,
  tone = "default",
}: {
  title: string;
  items: ReadonlyArray<string>;
  emptyMessage: string;
  testId: string;
  tone?: "default" | "warn" | "ok";
}) {
  const toneClass =
    tone === "warn"
      ? "border-amber-500/30 bg-amber-500/5"
      : tone === "ok"
      ? "border-emerald-500/20 bg-emerald-500/5"
      : "border-border/60 bg-background/40";
  return (
    <div
      className={`rounded-md border ${toneClass} p-3 space-y-1 min-w-0 break-words`}
      data-testid={testId}
    >
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
        {title}
      </div>
      {items && items.length > 0 ? (
        <ul className="text-xs text-foreground space-y-1 list-disc pl-4">
          {items.map((s) => (
            <li key={s} className="break-words">{s}</li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground italic">{emptyMessage}</p>
      )}
    </div>
  );
}

export function RoadmapItemDepthSections(props: RoadmapItemDepthSectionsProps) {
  const { industry, gear, variant, clientVisible, className } = props;
  const [open, setOpen] = useState(variant === "admin");

  // Client variant: never render anything when the item is not client-visible.
  if (variant === "client" && clientVisible === false) return null;

  const matrixIndustry = industry ? industryToMatrixKey(industry) : null;
  const ctx: RoadmapItemDepthContext | null = getRoadmapItemDepthContext(
    matrixIndustry,
    (gear ?? null) as MatrixGearKey | null,
  );

  // Honest empty state: no industry/gear → no invented dependency data.
  if (!ctx) {
    return (
      <div
        className={`rounded-md border border-dashed border-border/60 bg-background/40 p-3 space-y-2 min-w-0 break-words ${className ?? ""}`}
        data-testid={
          variant === "admin"
            ? "roadmap-item-depth-empty-admin"
            : "roadmap-item-depth-empty-client"
        }
      >
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
          Implementation depth
        </div>
        <p className="text-xs text-muted-foreground italic">
          Dependency mapping will appear after this roadmap item is generated
          from approved Diagnostic findings and assigned to an industry-aware gear.
        </p>
        <p className="text-xs text-muted-foreground italic">
          Do-not-do-yet guidance and the RGS Control System™ monitoring
          handoff appear once sequencing data is available.
        </p>
      </div>
    );
  }

  const { step, cell, prerequisite_titles } = ctx;
  const controlMonitoring: ReadonlyArray<string> = [
    `Watch ${step.leading_indicators[0] ?? cell.kpi} on the standing operating cadence.`,
    "Re-check evidence freshness during the monthly system review.",
  ];
  const firstActions: ReadonlyArray<string> = [
    `Confirm the current state of: ${cell.process}.`,
    `Stage the evidence required: ${cell.evidence_prompts.slice(0, 2).join(" and ")}.`,
    `Install the operating step: ${step.title}.`,
  ];

  // Client-safe view: a calmer subset, no admin sequencing notes.
  if (variant === "client") {
    return (
      <div
        className={`pt-2 border-t border-border space-y-3 min-w-0 break-words ${className ?? ""}`}
        data-testid="client-roadmap-item-depth"
      >
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
          <Compass className="h-3 w-3" /> Why this is here
        </div>
        <p className="text-xs text-foreground break-words">
          {cell.client_safe_explanation}
        </p>

        <Section
          title="First actions"
          items={firstActions}
          emptyMessage="First actions appear once this item is approved for client release."
          testId="client-first-actions"
        />
        <Section
          title="Evidence needed"
          items={cell.evidence_prompts}
          emptyMessage="Evidence requirements appear once Diagnostic findings are approved."
          testId="client-evidence-needed"
        />
        <Section
          title="What this unlocks"
          items={step.unblocks}
          emptyMessage="Unlocked items appear once dependency mapping is complete."
          testId="client-unblocks"
        />
        <Section
          title="What to wait on"
          items={step.do_not_do_yet}
          emptyMessage="Do-not-do-yet guidance appears when sequencing data is available."
          testId="client-do-not-do-yet"
          tone="warn"
        />

        <div
          className="rounded-md border border-emerald-500/20 bg-emerald-500/5 p-3 space-y-1 min-w-0 break-words"
          data-testid="client-control-system-handoff"
        >
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
            <ShieldCheck className="h-3 w-3" /> RGS Control System™ handoff
          </div>
          <p className="text-xs text-foreground">
            After this item is installed, the RGS Control System™ subscription
            keeps watch on the leading indicators below. Implementation
            installs the operating structure; the Control System monitors it.
          </p>
          <ul className="text-xs text-foreground space-y-1 list-disc pl-4">
            {controlMonitoring.map((m) => (
              <li key={m} className="break-words">{m}</li>
            ))}
          </ul>
        </div>

        <p className="text-[11px] text-muted-foreground italic">
          RGS does not run the business and does not promise revenue, profit,
          growth, valuation, or compliance outcomes.
        </p>
      </div>
    );
  }

  // Admin variant: full E2F depth, collapsible for density control.
  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className={`rounded-md border border-border/60 bg-background/30 min-w-0 break-words ${className ?? ""}`}
    >
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full flex flex-wrap items-center justify-between gap-2 px-3 py-2 h-auto"
          data-testid="admin-roadmap-item-depth-toggle"
        >
          <span className="flex items-center gap-2 text-xs text-foreground">
            <Activity className="h-3.5 w-3.5" />
            Implementation depth (E2F)
          </span>
          <span className="flex flex-wrap items-center gap-1">
            <Badge variant="outline" className="text-[10px]">
              Step {step.step_number}
            </Badge>
            {step.prerequisite_step_numbers.length > 0 ? (
              <Badge variant="outline" className="text-[10px]">
                {step.prerequisite_step_numbers.length} prerequisite
                {step.prerequisite_step_numbers.length === 1 ? "" : "s"}
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-[10px]">No prerequisites</Badge>
            )}
            {open ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </span>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-3 pb-3 space-y-3" data-testid="admin-roadmap-item-depth">
        <div
          className="rounded-md border border-border/60 bg-background/40 p-3 space-y-1 min-w-0 break-words"
          data-testid="admin-why-this-here"
        >
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Why this repair is here / Why now
          </div>
          <p className="text-xs text-foreground">{step.why_first}</p>
          <p className="text-xs text-muted-foreground">
            Failure pattern: {cell.failure_pattern}
          </p>
          <p className="text-xs text-muted-foreground">
            Owner bottleneck reduced: {step.owner_bottleneck_reduced}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 min-w-0">
          <Section
            title="Dependency mapping (prerequisites)"
            items={prerequisite_titles}
            emptyMessage="No prerequisites — this item can sequence first for this industry."
            testId="admin-dependency-map"
          />
          <Section
            title="Unblocks"
            items={step.unblocks}
            emptyMessage="Unlocked items appear once downstream sequencing is registered."
            testId="admin-unblocks"
            tone="ok"
          />
          <Section
            title="Do-not-do-yet"
            items={step.do_not_do_yet}
            emptyMessage="Deferred guidance appears when sequencing data is available."
            testId="admin-do-not-do-yet"
            tone="warn"
          />
          <Section
            title="First actions"
            items={firstActions}
            emptyMessage="First actions appear after the item is gear-classified."
            testId="admin-first-actions"
          />
          <Section
            title="Evidence required"
            items={cell.evidence_prompts}
            emptyMessage="Evidence requirements appear once a gear is assigned."
            testId="admin-evidence-required"
          />
          <Section
            title="Leading indicators"
            items={step.leading_indicators}
            emptyMessage="Leading indicators appear once industry sequencing is loaded."
            testId="admin-leading-indicators"
          />
        </div>

        <div
          className="rounded-md border border-emerald-500/20 bg-emerald-500/5 p-3 space-y-1 min-w-0 break-words"
          data-testid="admin-control-system-monitoring"
        >
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
            <ShieldCheck className="h-3 w-3" /> RGS Control System™ monitoring handoff
          </div>
          <p className="text-xs text-muted-foreground">
            After installation, the RGS Control System™ monitors the installed
            structure. Implementation does not become an open-ended retainer.
          </p>
          <ul className="text-xs text-foreground space-y-1 list-disc pl-4">
            {controlMonitoring.map((m) => (
              <li key={m} className="break-words">{m}</li>
            ))}
          </ul>
        </div>

        <div
          className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 space-y-1 min-w-0 break-words"
          data-testid="admin-only-sequencing-note"
        >
          <div className="text-[11px] uppercase tracking-wider text-amber-300/90">
            Admin-only sequencing note — never shown to the client
          </div>
          <p className="text-xs text-foreground">{step.admin_sequencing_note}</p>
          <p className="text-xs text-muted-foreground">
            Diagnostic review note: {cell.admin_review_note}
          </p>
        </div>

        <p className="text-[11px] text-muted-foreground italic">
          E2F depth is operational/structural visibility only. RGS does not
          guarantee revenue, profit, growth, valuation, or compliance — and
          for cannabis/MMJ contexts, this is documentation visibility only,
          not regulatory or compliance certification.
        </p>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default RoadmapItemDepthSections;