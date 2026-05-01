// P20.20 — Client-facing renderer for the RGS Stability Snapshot™.
//
// Used in:
// - the report draft preview (admin-side, only when client-ready)
// - the portal report view (when an approved snapshot is attached)
// - downstream PDF/export pipelines render their own version, but
//   share the same gating helper.
//
// Hard rules:
// - Client-facing title is ALWAYS "RGS Stability Snapshot™".
// - Never display "SWOT Analysis" or any healthcare/MMC wording.
// - Caller is responsible for gating with isSnapshotClientReadyForDraft().
//   This component is dumb: it just renders what it's given.

import {
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  ShieldAlert,
} from "lucide-react";
import {
  GEAR_KEY_TO_NUMBER,
  type StabilityGearKey,
  type StabilitySnapshot,
  type StabilitySnapshotItem,
  type StabilitySnapshotSection,
} from "@/lib/reports/stabilitySnapshot";
import { GearChip } from "@/components/gears/GearChip";

const SECTION_META: Record<
  string,
  { Icon: typeof CheckCircle2; tone: string; label: string }
> = {
  current_strengths_to_preserve: {
    Icon: CheckCircle2,
    tone: "border-emerald-500/30 bg-emerald-500/5 text-emerald-300",
    label: "Current Strengths to Preserve",
  },
  system_weaknesses_creating_instability: {
    Icon: AlertTriangle,
    tone: "border-amber-500/30 bg-amber-500/5 text-amber-300",
    label: "System Weaknesses Creating Instability",
  },
  opportunities_after_stabilization: {
    Icon: Lightbulb,
    tone: "border-sky-500/30 bg-sky-500/5 text-sky-300",
    label: "Opportunities After Stabilization",
  },
  threats_to_revenue_control: {
    Icon: ShieldAlert,
    tone: "border-rose-500/30 bg-rose-500/5 text-rose-300",
    label: "Threats to Revenue / Control",
  },
};

export function StabilitySnapshotClientView({
  snapshot,
}: {
  snapshot: StabilitySnapshot;
}) {
  const sections: StabilitySnapshotSection[] = [
    snapshot.current_strengths_to_preserve,
    snapshot.system_weaknesses_creating_instability,
    snapshot.opportunities_after_stabilization,
    snapshot.threats_to_revenue_control,
  ];

  return (
    <section
      className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 to-transparent p-6"
      data-testid="stability-snapshot-client-view"
    >
      <div className="text-[11px] uppercase tracking-[0.18em] text-primary">
        Executive Orientation
      </div>
      <h2 className="mt-1 text-xl text-foreground">
        RGS Stability Snapshot&trade;
      </h2>
      <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
        A plain-English read of where the business looks stable, where it
        appears to be slipping, what becomes possible once those areas are
        steadied, and what could put revenue or control at risk if it is not
        addressed. This is a starting read, not a final diagnosis.
      </p>

      <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        {sections.map((sec) => (
          <SnapshotSectionCard key={sec.key} section={sec} />
        ))}
      </div>

      <p className="mt-5 text-xs text-muted-foreground/80 leading-relaxed">
        Findings are based on the information provided and should be
        validated against business records before acting. RGS helps identify
        the issue and explain the likely next step — the owner keeps final
        decision authority. This is not legal, tax, accounting, HR, or
        compliance advice.
      </p>
    </section>
  );
}

function SnapshotSectionCard({
  section,
}: {
  section: StabilitySnapshotSection;
}) {
  const meta = SECTION_META[section.key] ?? {
    Icon: CheckCircle2,
    tone: "border-border bg-card text-foreground",
    label: section.title,
  };
  const Icon = meta.Icon;
  return (
    <div className={`rounded-lg border p-4 ${meta.tone}`}>
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-4 w-4 flex-shrink-0" />
        <h3 className="text-sm font-medium text-foreground">{meta.label}</h3>
      </div>
      {section.items.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">
          No items recorded for this area.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {section.items.map((it, i) => (
            <SnapshotItemRow key={i} item={it} />
          ))}
        </ul>
      )}
    </div>
  );
}

function SnapshotItemRow({ item }: { item: StabilitySnapshotItem }) {
  return (
    <li className="text-sm text-foreground/90 leading-relaxed">
      <div>{item.text}</div>
      {(item.gears && item.gears.length > 0) || item.confidence ? (
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {item.gears?.map((g) => (
            <GearChip key={g} gear={GEAR_KEY_TO_NUMBER[g as StabilityGearKey]} />
          ))}
          {item.confidence ? (
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Confidence: {item.confidence}
            </span>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}