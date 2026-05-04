import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Compass } from "lucide-react";

/**
 * Shared premium tool header. Used by client and admin tool surfaces.
 * Provides a consistent lane/stage badge, purpose statement, current
 * status, and recommended next action — without exposing admin-only
 * notes, raw enum strings, or AI draft content.
 */

export type ToolLane =
  | "Diagnostic"
  | "Implementation"
  | "RGS Control System"
  | "Admin-only";

const LANE_TONE: Record<ToolLane, string> = {
  Diagnostic: "border-primary/40 text-primary bg-primary/[0.08]",
  Implementation: "border-accent/40 text-accent bg-accent/[0.08]",
  "RGS Control System": "border-primary/30 text-primary bg-primary/[0.06]",
  "Admin-only": "border-destructive/40 text-destructive bg-destructive/[0.08]",
};

export function PremiumToolHeader({
  toolName,
  lane,
  purpose,
  currentStatus,
  nextAction,
  backTo,
  backLabel,
  rightSlot,
}: {
  toolName: string;
  lane: ToolLane;
  purpose: string;
  currentStatus?: string | null;
  nextAction?: string | null;
  backTo?: string;
  backLabel?: string;
  rightSlot?: ReactNode;
}) {
  return (
    <header className="mb-6">
      {backTo && (
        <Link
          to={backTo}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3"
        >
          <ArrowLeft className="h-3 w-3" /> {backLabel ?? "Back"}
        </Link>
      )}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <span
            className={`inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] border rounded-full px-2 py-0.5 ${LANE_TONE[lane]}`}
          >
            <Compass className="h-3 w-3" /> {lane}
          </span>
          <h1 className="mt-3 text-3xl text-foreground font-serif tracking-tight">
            {toolName}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-2xl leading-relaxed">
            {purpose}
          </p>
        </div>
        {rightSlot}
      </div>
      {(currentStatus || nextAction) && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 max-w-3xl">
          {currentStatus && (
            <div className="rounded-lg border border-border bg-card p-3.5">
              <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                Current status
              </div>
              <p className="mt-1 text-sm text-foreground leading-relaxed">{currentStatus}</p>
            </div>
          )}
          {nextAction && (
            <div className="rounded-lg border border-primary/30 bg-primary/[0.05] p-3.5">
              <div className="text-[10px] uppercase tracking-[0.16em] text-primary/90">
                Recommended next action
              </div>
              <p className="mt-1 text-sm text-foreground leading-relaxed">{nextAction}</p>
            </div>
          )}
        </div>
      )}
    </header>
  );
}

export default PremiumToolHeader;