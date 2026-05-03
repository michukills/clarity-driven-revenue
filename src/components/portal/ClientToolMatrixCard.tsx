// P6.2b — Client Tool Operating Matrix card.
// Wraps an assigned tool with branded metadata from src/lib/toolMatrix.ts:
// group, when-to-use, recommended frequency, completion definition,
// last activity, and due/overdue state. Routes through launchToolTarget
// so the existing client launch contract is preserved.
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Lock,
  Sparkles,
} from "lucide-react";
import {
  type ToolMatrixEntry,
  type OverdueState,
  overdueLabel,
  overdueTone,
  PHASE_LABEL,
} from "@/lib/toolMatrix";
import type { ToolInstructions } from "@/lib/toolPolicy";
import { formatRelativeTime } from "@/lib/portal";
import { classifyTool, launchToolTarget } from "@/lib/toolLaunch";

const TONE_CLS: Record<"ok" | "warn" | "critical" | "muted", string> = {
  ok: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  warn: "text-amber-400 border-amber-500/30 bg-amber-500/10",
  critical: "text-destructive border-destructive/40 bg-destructive/10",
  muted: "text-muted-foreground border-border bg-muted/40",
};

const TONE_ICON: Record<"ok" | "warn" | "critical" | "muted", typeof CheckCircle2> = {
  ok: CheckCircle2,
  warn: Clock,
  critical: AlertTriangle,
  muted: Sparkles,
};

type Props = {
  /** Tool matrix entry (source of truth for all metadata). */
  entry: ToolMatrixEntry;
  /** ISO timestamp of last activity, or null if never used. */
  lastActivityAt: string | null;
  /** Computed overdue state from matrix activity loader. */
  overdue: OverdueState;
  /** True if this card represents an RCC tool but the client has no add-on. */
  rccLocked?: boolean;
  /**
   * Optional resource URL fallback when the matrix entry route is not set
   * (e.g. external sheets the admin assigned). Defaults to the entry route.
   */
  resourceUrl?: string | null;
  /** P7.4.2 — optional client-facing instructions, rendered as a collapsible block. */
  instructions?: ToolInstructions | null;
};

export function ClientToolMatrixCard({
  entry,
  lastActivityAt,
  overdue,
  rccLocked = false,
  resourceUrl = null,
  instructions = null,
}: Props) {
  const navigate = useNavigate();
  const tone = rccLocked ? "muted" : overdueTone[overdue];
  const ToneIcon = TONE_ICON[tone];

  const launchHref = entry.route || resourceUrl || null;
  const launch = launchHref
    ? classifyTool({ title: entry.name, url: launchHref }, "client")
    : { kind: "none" as const };
  const isClickable = !rccLocked && launch.kind !== "none";

  const open = () => {
    if (!isClickable) return;
    launchToolTarget(launch, navigate);
  };

  // Empty-state copy per acceptance brief.
  const stateCopy = (() => {
    if (rccLocked) return "Add-on not active for your engagement.";
    if (entry.frequency.kind === "event") {
      return lastActivityAt
        ? `Last used ${formatRelativeTime(lastActivityAt)}.`
        : "Use this when RGS requests it.";
    }
    switch (overdue) {
      case "not_started":
        return "Not started yet.";
      case "due_soon":
        return "Due soon.";
      case "overdue":
        return "Overdue.";
      case "ok":
        return lastActivityAt
          ? `Last used ${formatRelativeTime(lastActivityAt)}.`
          : "On track.";
      default:
        return "—";
    }
  })();

  return (
    <div
      className={`bg-card border border-border rounded-xl p-5 flex flex-col transition-colors ${
        isClickable
          ? "cursor-pointer hover:border-primary/60 hover:bg-card/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          : ""
      }`}
      onClick={isClickable ? open : undefined}
      onKeyDown={(e) => {
        if (!isClickable) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open();
        }
      }}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      aria-label={isClickable ? `Open ${entry.name}` : undefined}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.18em] text-primary/80">
            {entry.group}
          </div>
          <div className="text-sm text-foreground font-medium mt-1 flex items-center gap-2">
            {rccLocked && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
            <span className="truncate">{entry.name}</span>
          </div>
        </div>
        <span
          className={`text-[10px] uppercase tracking-[0.16em] px-2 py-0.5 rounded border whitespace-nowrap ${TONE_CLS[tone]}`}
        >
          {rccLocked ? "Locked" : overdueLabel[overdue]}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 mb-3 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        <span className="px-1.5 py-0.5 rounded border border-border bg-muted/40">
          {PHASE_LABEL[entry.phase]}
        </span>
        <span className="px-1.5 py-0.5 rounded border border-border bg-muted/40">
          {entry.frequencyLabel}
        </span>
      </div>

      <div className="text-xs text-muted-foreground mb-3">
        <div>
          <span className="text-foreground/80">Why:</span> {entry.whenToUse}
        </div>
        <div className="mt-1">
          <span className="text-foreground/80">Counts as done:</span> {entry.completion}
        </div>
      </div>

      {instructions && (
        <details
          className="mb-3 rounded-md border border-border/60 bg-muted/20 p-2.5"
          onClick={(e) => e.stopPropagation()}
        >
          <summary className="text-[11px] uppercase tracking-[0.16em] text-primary/80 cursor-pointer select-none">
            How to use this · open
          </summary>
          <div className="text-xs text-muted-foreground mt-2 space-y-1.5">
            <div><span className="text-foreground/80">What it does:</span> {instructions.whatItDoes}</div>
            <div><span className="text-foreground/80">First step:</span> {instructions.firstStep}</div>
            <div><span className="text-foreground/80">Frequency:</span> {instructions.frequency}</div>
            <div><span className="text-foreground/80">Note for next review:</span> {instructions.askRgsIf}</div>
          </div>
        </details>
      )}

      <div className="mt-auto pt-3 border-t border-border flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
          <ToneIcon
            className={`h-3.5 w-3.5 flex-shrink-0 ${
              tone === "ok"
                ? "text-emerald-400"
                : tone === "warn"
                  ? "text-amber-400"
                  : tone === "critical"
                    ? "text-destructive"
                    : "text-muted-foreground"
            }`}
          />
          <span className="truncate">{stateCopy}</span>
        </div>
        {isClickable ? (
          <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.16em] text-primary">
            Open <ArrowRight className="h-3 w-3" />
          </span>
        ) : rccLocked ? (
          <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Not active
          </span>
        ) : null}
      </div>
    </div>
  );
}