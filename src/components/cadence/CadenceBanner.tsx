/**
 * P12.1 — Shared cadence banner.
 *
 * Single visual component used by every recurring-input surface so the
 * "you're current / due soon / overdue / baseline needed" language and
 * styling stay consistent across tools and the portal.
 */

import { Calendar, Clock, AlertTriangle, CheckCircle2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CadenceState } from "@/lib/cadence/cadence";

interface Props {
  state: CadenceState;
  onAction?: () => void;
  /** Optional secondary line override. */
  secondaryDetail?: string;
}

export function CadenceBanner({ state, onAction, secondaryDetail }: Props) {
  const tone = state.tone;
  const cls =
    tone === "good"
      ? "border-emerald-500/30 bg-emerald-500/5"
      : tone === "info"
      ? "border-primary/25 bg-primary/5"
      : tone === "warn"
      ? "border-amber-500/40 bg-amber-500/10"
      : "border-rose-500/40 bg-rose-500/10";

  const Icon =
    state.status === "current"
      ? CheckCircle2
      : state.status === "missing_baseline"
      ? Sparkles
      : state.status === "overdue"
      ? AlertTriangle
      : state.status === "stale"
      ? Clock
      : Calendar;

  const iconCls =
    tone === "good"
      ? "text-emerald-400"
      : tone === "info"
      ? "text-primary"
      : tone === "warn"
      ? "text-amber-400"
      : "text-rose-400";

  return (
    <div
      className={`rounded-lg border ${cls} p-4 flex flex-col sm:flex-row sm:items-center gap-3`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3 flex-1">
        <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${iconCls}`} aria-hidden />
        <div className="min-w-0">
          <div className="text-sm font-medium text-foreground">{state.headline}</div>
          <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            {secondaryDetail ?? state.detail}
          </div>
        </div>
      </div>
      {state.actionLabel && onAction && (
        <Button
          size="sm"
          variant={tone === "warn" || tone === "critical" ? "default" : "outline"}
          onClick={onAction}
          className="shrink-0"
        >
          {state.actionLabel}
        </Button>
      )}
    </div>
  );
}
