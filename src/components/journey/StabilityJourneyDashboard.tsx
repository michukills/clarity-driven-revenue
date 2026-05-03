import { Link } from "react-router-dom";
import {
  Compass,
  ArrowRight,
  CheckCircle2,
  CircleDot,
  Lock,
  ClipboardCheck,
  FileText,
} from "lucide-react";
import {
  EVIDENCE_STRENGTH_LABEL,
  GEAR_STATE_LABEL,
  REPORT_READINESS_LABEL,
  type EvidenceStrength,
  type GearProgress,
  type GearState,
  type JourneyResult,
} from "@/lib/journey/stabilityJourney";

interface Props {
  journey: JourneyResult;
}

const EVIDENCE_TONE: Record<EvidenceStrength, string> = {
  none: "border-border bg-muted/20 text-muted-foreground",
  light: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  moderate: "border-primary/40 bg-primary/10 text-foreground",
  strong: "border-secondary/50 bg-secondary/10 text-secondary",
};

const GEAR_TONE: Record<GearState, string> = {
  not_started: "border-border bg-card text-muted-foreground",
  in_progress: "border-amber-500/40 bg-amber-500/5 text-foreground",
  evidence_light: "border-amber-500/40 bg-amber-500/5 text-foreground",
  evidence_moderate: "border-primary/40 bg-primary/5 text-foreground",
  evidence_strong: "border-secondary/50 bg-secondary/5 text-foreground",
  ready_for_review: "border-secondary/60 bg-secondary/10 text-foreground",
  diagnosed: "border-secondary/70 bg-secondary/15 text-foreground",
};

function GearCard({ g }: { g: GearProgress }) {
  return (
    <div className={`rounded-xl border p-5 ${GEAR_TONE[g.state]}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {g.gear.short}
          </div>
          <div className="text-base text-foreground font-medium leading-snug mt-1">
            {g.gear.name}
          </div>
        </div>
        <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${EVIDENCE_TONE[g.evidence]}`}>
          {GEAR_STATE_LABEL[g.state]}
        </span>
      </div>
      <div className="mt-3 text-xs text-muted-foreground tabular-nums">
        {g.answeredCount}/{g.totalCount} interview answers
        {g.toolCompleted && <> · diagnostic tool completed</>}
      </div>
      {g.miniInsight && (
        <p className="text-xs text-foreground/85 mt-3 leading-relaxed">
          {g.miniInsight}
        </p>
      )}
    </div>
  );
}

export function StabilityJourneyDashboard({ journey }: Props) {
  const { recommendedNext, gears, evidenceStrength, reportReadiness, progressPct, phaseLabel } = journey;
  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-primary">
          <Compass className="h-3 w-3" /> Your Stability Journey
        </div>
        <h2 className="mt-2 text-2xl text-foreground leading-tight">
          Your Stability Journey is underway.
        </h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl leading-relaxed">
          Each step helps map how your business actually runs, where pressure is building,
          and which gear may be slipping first. Your RGS team uses this evidence to assemble your Stability Report.
        </p>
        <div className="mt-5 grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <div className="rounded-lg border border-border p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Current phase</div>
            <div className="text-sm text-foreground mt-1 leading-snug">{phaseLabel}</div>
          </div>
          <div className="rounded-lg border border-border p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Diagnostic progress</div>
            <div className="text-sm text-foreground mt-1 tabular-nums">{progressPct}%</div>
            <div className="mt-2 h-1.5 w-full rounded-full bg-muted/40 overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
          <div className="rounded-lg border border-border p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Evidence strength</div>
            <div className="text-sm text-foreground mt-1">{EVIDENCE_STRENGTH_LABEL[evidenceStrength]}</div>
          </div>
          <div className="rounded-lg border border-border p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Report readiness</div>
            <div className="text-sm text-foreground mt-1 leading-snug">{REPORT_READINESS_LABEL[reportReadiness]}</div>
          </div>
        </div>
      </div>

      {/* Recommended next move */}
      {recommendedNext.routePath ? (
        <Link
          to={recommendedNext.routePath}
          className="block rounded-2xl border border-primary/40 bg-primary/5 p-6 hover:bg-primary/10 transition-colors group"
        >
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.18em] text-primary mb-2">
                Recommended Next Move
              </div>
              <div className="text-lg text-foreground font-medium leading-snug">{recommendedNext.label}</div>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-3xl">
                {recommendedNext.reason}
              </p>
            </div>
            <ArrowRight className="h-5 w-5 text-primary shrink-0 transition-transform group-hover:translate-x-1" />
          </div>
        </Link>
      ) : (
        <div className="rounded-2xl border border-secondary/40 bg-secondary/5 p-6">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-secondary mb-2">
            <ClipboardCheck className="h-3 w-3" /> Recommended Next Move
          </div>
          <div className="text-lg text-foreground font-medium leading-snug">{recommendedNext.label}</div>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{recommendedNext.reason}</p>
        </div>
      )}

      {/* Five-gear map */}
      <div>
        <div className="flex items-end justify-between border-b border-border pb-3 mb-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-primary">Stability Engine</div>
            <h3 className="text-base text-foreground mt-1">Five-gear progress map</h3>
          </div>
        </div>
        <p className="text-xs text-muted-foreground/90 mb-4 max-w-3xl leading-relaxed">
          Evidence strength reflects how much useful information has been captured so RGS can review the business accurately.
          "I don't know" is still useful diagnostic evidence.
        </p>
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}
        >
          {gears.map((g) => (
            <GearCard key={g.gear.key} g={g} />
          ))}
        </div>
      </div>

      {/* Report readiness explainer */}
      <div className="rounded-xl border border-dashed border-border p-5 bg-card/40">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
          <FileText className="h-3 w-3" /> About your Stability Report
        </div>
        <p className="text-sm text-foreground/90 leading-relaxed max-w-3xl">
          Your report is built from the information captured across the diagnostic journey.
          The more complete the evidence, the stronger the review. Your RGS team will let you know when the Stability Report is ready.
        </p>
      </div>
    </section>
  );
}

export function JourneyStepIcon({ done, locked }: { done: boolean; locked: boolean }) {
  if (done) return <CheckCircle2 className="h-4 w-4 text-secondary" />;
  if (locked) return <Lock className="h-4 w-4 text-muted-foreground" />;
  return <CircleDot className="h-4 w-4 text-primary" />;
}
