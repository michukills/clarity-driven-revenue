/**
 * P101 — Report Mode Selector.
 *
 * Small admin control that lets the operator pick Gig Report vs RGS
 * Report for a stored tool-report artifact, with a live scope preview
 * and a clear denial reason if the requested mode is not allowed.
 *
 * Pure UI — does not call Supabase. Parent owns the selection and passes
 * `customerScope` so `resolveReportMode` runs against real customer data.
 */

import { Button } from "@/components/ui/button";
import { ShieldAlert, Sparkles } from "lucide-react";
import {
  resolveReportMode,
  type ToolReportMode,
  type ResolveReportModeInput,
} from "@/lib/reports/toolReportMode";
import { GIG_TIER_LABEL, type GigTier } from "@/lib/gig/gigTier";

export interface ReportModeSelectorProps {
  toolKey: string;
  customer: ResolveReportModeInput["customer"];
  value: ToolReportMode;
  onChange: (mode: ToolReportMode) => void;
}

export function ReportModeSelector({
  toolKey,
  customer,
  value,
  onChange,
}: ReportModeSelectorProps) {
  const resolved = resolveReportMode({
    customer,
    toolKey,
    requestedMode: value,
  });

  const isGig = !!customer?.isGig;
  const tier: GigTier | null = customer?.gigTier ?? null;

  return (
    <div
      className="mt-4 border border-border rounded-lg p-3 bg-muted/20"
      data-testid="report-mode-selector"
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
          Report mode
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          {isGig ? (
            <span className="inline-flex items-center gap-1">
              Gig customer
              {tier ? ` · ${GIG_TIER_LABEL[tier]}` : ""}
            </span>
          ) : (
            <span>Full RGS client</span>
          )}
        </div>
      </div>

      <div className="mt-2 flex gap-2 flex-wrap">
        <Button
          size="sm"
          variant={value === "gig_report" ? "default" : "outline"}
          onClick={() => onChange("gig_report")}
          className={value === "gig_report" ? "bg-primary hover:bg-secondary" : "border-border"}
          data-testid="report-mode-gig"
        >
          Gig Report
        </Button>
        <Button
          size="sm"
          variant={value === "full_rgs_report" ? "default" : "outline"}
          onClick={() => onChange("full_rgs_report")}
          className={value === "full_rgs_report" ? "bg-primary hover:bg-secondary" : "border-border"}
          disabled={isGig}
          data-testid="report-mode-full"
        >
          <Sparkles className="h-3 w-3" /> RGS Report
        </Button>
      </div>

      {resolved.denialReason ? (
        <div
          className="mt-2 text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-md px-3 py-2 inline-flex items-start gap-2"
          data-testid="report-mode-denial"
        >
          <ShieldAlert className="h-3.5 w-3.5 mt-0.5" />
          <span>{resolved.denialReason}</span>
        </div>
      ) : (
        <div className="mt-2 text-[11px] text-muted-foreground">
          {resolved.allowedSections.length} allowed sections ·{" "}
          {resolved.excludedSectionKeys.length} excluded
          {resolved.allowedSections.length > 0 ? (
            <div className="mt-1 text-[10px]">
              Scope: {resolved.allowedSections.map((s) => s.label).join(" · ")}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

export default ReportModeSelector;