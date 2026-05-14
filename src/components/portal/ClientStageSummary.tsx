/**
 * P93E-E2G-P2.7B — Client-safe "where you are" summary.
 *
 * Shows a calm, plain-English snapshot at the top of the client portal so
 * the client immediately sees: current stage, what RGS is doing, what they
 * need to do, and what is locked. Uses no admin-only language.
 */
import { Compass } from "lucide-react";
import { getClientWorkSnapshot } from "@/lib/workflow/clientWorkSnapshot";

const WAITING_LABEL = {
  you: "Waiting on you",
  rgs: "Waiting on RGS",
  no_one: "No action needed right now",
} as const;

const WAITING_TONE = {
  you: "border-primary/40 bg-primary/10 text-primary",
  rgs: "border-amber-500/30 bg-amber-500/5 text-amber-200",
  no_one: "border-border bg-muted/30 text-muted-foreground",
} as const;

export function ClientStageSummary({ customer }: { customer: any }) {
  if (!customer) return null;
  const s = getClientWorkSnapshot(customer);
  return (
    <section
      data-testid="client-stage-summary"
      className="mb-4 rounded-xl border border-border bg-card/40 p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground inline-flex items-center gap-1.5">
            <Compass className="h-3 w-3" /> Where you are
          </div>
          <div className="mt-1 text-sm text-foreground font-medium">{s.stageLabel}</div>
          <p className="mt-1 text-xs text-muted-foreground leading-snug">{s.currentWork}</p>
          {s.yourNextStep && (
            <p className="mt-2 text-xs text-foreground/90 leading-snug">{s.yourNextStep}</p>
          )}
          {s.blockedReason && (
            <p className="mt-2 text-[11px] text-muted-foreground italic">{s.blockedReason}</p>
          )}
        </div>
        <span
          className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-full border whitespace-nowrap ${WAITING_TONE[s.waitingOn]}`}
        >
          {WAITING_LABEL[s.waitingOn]}
        </span>
      </div>
    </section>
  );
}

export default ClientStageSummary;