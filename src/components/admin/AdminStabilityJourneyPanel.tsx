import { useStabilityJourney } from "@/lib/journey/useStabilityJourney";
import { GEAR_STATE_LABEL, EVIDENCE_STRENGTH_LABEL, REPORT_READINESS_LABEL } from "@/lib/journey/stabilityJourney";
import { Compass } from "lucide-react";

/** P42 — Admin-side read of a customer's Stability Journey state. */
export function AdminStabilityJourneyPanel({ customerId }: { customerId: string }) {
  const { journey, loading } = useStabilityJourney(customerId);
  if (loading || !journey) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 text-xs text-muted-foreground">
        Loading Stability Journey…
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-primary">
        <Compass className="h-3 w-3" /> Stability Journey · admin view
      </div>
      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
        <Stat label="Phase" value={journey.phaseLabel} />
        <Stat label="Progress" value={`${journey.progressPct}%`} />
        <Stat label="Evidence" value={EVIDENCE_STRENGTH_LABEL[journey.evidenceStrength]} />
        <Stat label="Report readiness" value={REPORT_READINESS_LABEL[journey.reportReadiness]} />
        <Stat label="Owner interview" value={journey.ownerInterviewComplete ? "Complete" : "Incomplete"} />
        <Stat label="Recommended next" value={journey.recommendedNext.label} />
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Five-gear progress</div>
        <ul className="space-y-1 text-xs">
          {journey.gears.map((g) => (
            <li key={g.gear.key} className="flex justify-between gap-2 border-b border-border/40 py-1.5">
              <span className="text-foreground">{g.gear.name}</span>
              <span className="text-muted-foreground tabular-nums">
                {g.answeredCount}/{g.totalCount} · {GEAR_STATE_LABEL[g.state]}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <p className="text-[11px] text-muted-foreground/80">
        Recommended next move and gear states are derived from the persisted P41 sequence (admin override respected),
        Owner Diagnostic Interview answers, and completed diagnostic tool runs. Report readiness never claims "ready"
        without a real report record.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm text-foreground mt-1 leading-snug">{value}</div>
    </div>
  );
}
