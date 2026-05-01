// P20.19 — Admin review surface for the RGS Stability Snapshot
// (SWOT-style diagnostic interpretation layer).
//
// Lets the reviewer edit per-item text, evidence summary, confidence,
// and gear mapping, and approve each section. Pure UI: receives the
// current snapshot from the parent and emits change events. The parent
// (`ReportDraftDetail`) is responsible for persisting the snapshot inside
// `draft_sections.stability_snapshot` and re-rendering the matching
// `rgs_stability_snapshot` section body on save.

import { useMemo } from "react";
import {
  STABILITY_GEAR_KEYS,
  STABILITY_SECTION_ORDER,
  deriveOverallStatus,
  isSnapshotClientReady,
  type SnapshotConfidence,
  type SnapshotStatus,
  type StabilityGearKey,
  type StabilitySectionKey,
  type StabilitySnapshot,
  type StabilitySnapshotItem,
  type StabilitySnapshotSection,
  GEAR_KEY_TO_NUMBER,
} from "@/lib/reports/stabilitySnapshot";
import { GearChip } from "@/components/gears/GearChip";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ShieldCheck, AlertTriangle, Plus, Trash2, Wand2 } from "lucide-react";

const STATUS_OPTIONS: SnapshotStatus[] = ["Draft", "Needs Review", "Approved"];
const CONFIDENCE_OPTIONS: SnapshotConfidence[] = ["High", "Medium", "Low"];

const GEAR_LABEL: Record<StabilityGearKey, string> = {
  demand_generation: "Demand",
  revenue_conversion: "Conversion",
  operational_efficiency: "Ops",
  financial_visibility: "Finance",
  owner_independence: "Owner Independence",
};

function statusBadgeClass(s: SnapshotStatus): string {
  if (s === "Approved") return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
  if (s === "Needs Review") return "bg-amber-500/15 text-amber-300 border-amber-500/30";
  return "bg-muted/40 text-muted-foreground border-border";
}

export interface StabilitySnapshotReviewPanelProps {
  snapshot: StabilitySnapshot | null;
  onChange: (next: StabilitySnapshot) => void;
  onRegenerate?: () => void;
  regenerating?: boolean;
  draftStatus: string; // e.g. "approved" — affects whether snapshot is client-deliverable
}

export function StabilitySnapshotReviewPanel({
  snapshot,
  onChange,
  onRegenerate,
  regenerating,
  draftStatus,
}: StabilitySnapshotReviewPanelProps) {
  const sectionsArr: StabilitySnapshotSection[] | null = useMemo(() => {
    if (!snapshot) return null;
    return STABILITY_SECTION_ORDER.map((k) => snapshot[k]);
  }, [snapshot]);

  if (!snapshot || !sectionsArr) {
    return (
      <section
        className="bg-card border border-border rounded-xl p-5"
        data-testid="stability-snapshot-review-empty"
      >
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm uppercase tracking-wider text-muted-foreground">
            RGS Stability Snapshot
          </h2>
          <span className="text-[11px] text-muted-foreground">
            Internal: SWOT-style diagnostic layer
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          No structured snapshot has been generated yet for this draft. Regenerate the
          deterministic draft to produce one.
        </p>
      </section>
    );
  }

  const clientReady = isSnapshotClientReady(snapshot);

  const updateSection = (
    key: StabilitySectionKey,
    next: Partial<StabilitySnapshotSection>,
  ) => {
    const updatedSection = { ...snapshot[key], ...next };
    const allSections = STABILITY_SECTION_ORDER.map((k) =>
      k === key ? updatedSection : snapshot[k],
    );
    onChange({
      ...snapshot,
      [key]: updatedSection,
      overall_status: deriveOverallStatus(allSections),
    } as StabilitySnapshot);
  };

  const updateItem = (
    key: StabilitySectionKey,
    idx: number,
    next: Partial<StabilitySnapshotItem>,
  ) => {
    const items = snapshot[key].items.map((it, i) => (i === idx ? { ...it, ...next } : it));
    updateSection(key, { items });
  };

  const removeItem = (key: StabilitySectionKey, idx: number) => {
    const items = snapshot[key].items.filter((_, i) => i !== idx);
    updateSection(key, { items });
  };

  const addItem = (key: StabilitySectionKey) => {
    const items = [
      ...snapshot[key].items,
      {
        text: "",
        evidence_summary: "",
        gears: [],
        source_tags: [],
        confidence: "Medium" as SnapshotConfidence,
      } satisfies StabilitySnapshotItem,
    ];
    updateSection(key, { items });
  };

  const toggleGear = (
    key: StabilitySectionKey,
    idx: number,
    gear: StabilityGearKey,
  ) => {
    const item = snapshot[key].items[idx];
    const current = item.gears ?? [];
    const next = current.includes(gear)
      ? current.filter((g) => g !== gear)
      : [...current, gear];
    updateItem(key, idx, { gears: next });
  };

  return (
    <section
      className="bg-card border border-border rounded-xl p-5"
      data-testid="stability-snapshot-review"
    >
      <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
        <div>
          <h2 className="text-sm uppercase tracking-wider text-muted-foreground">
            RGS Stability Snapshot
          </h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Internal: SWOT-style diagnostic layer · Admin review required before client delivery
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`text-[11px] px-2 py-0.5 rounded-md border inline-flex items-center gap-1 ${statusBadgeClass(snapshot.overall_status)}`}
            data-testid="snapshot-overall-status"
          >
            {snapshot.overall_status === "Approved" ? (
              <ShieldCheck className="h-3 w-3" />
            ) : (
              <AlertTriangle className="h-3 w-3" />
            )}
            Overall: {snapshot.overall_status}
          </span>
          {clientReady && draftStatus === "approved" ? (
            <span className="text-[11px] px-2 py-0.5 rounded-md border bg-emerald-500/15 text-emerald-300 border-emerald-500/30">
              Client-ready
            </span>
          ) : (
            <span className="text-[11px] px-2 py-0.5 rounded-md border bg-muted/40 text-muted-foreground border-border">
              Admin-only until approved
            </span>
          )}
          {onRegenerate ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onRegenerate}
              disabled={!!regenerating}
              className="border-border"
              data-testid="snapshot-regenerate"
            >
              <Wand2 className="h-3.5 w-3.5" />
              {regenerating ? "Regenerating…" : "Regenerate"}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="space-y-4">
        {sectionsArr.map((section) => (
          <div
            key={section.key}
            className="border border-border rounded-lg p-4 bg-muted/10"
            data-testid={`snapshot-section-${section.key}`}
          >
            <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
              <h3 className="text-sm font-semibold text-foreground">{section.title}</h3>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded border ${statusBadgeClass(section.status)}`}
                >
                  {section.status}
                </span>
                <select
                  value={section.status}
                  onChange={(e) =>
                    updateSection(section.key, {
                      status: e.target.value as SnapshotStatus,
                    })
                  }
                  className="text-[11px] px-2 py-1 rounded-md border border-border bg-card text-foreground"
                  aria-label={`${section.title} status`}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {section.items.length === 0 ? (
              <p className="text-[12px] text-muted-foreground italic mb-2">
                Insufficient evidence — admin review required before client delivery.
              </p>
            ) : null}

            <ul className="space-y-3">
              {section.items.map((item, idx) => (
                <li
                  key={idx}
                  className="border border-border/60 rounded-md p-3 bg-card/60 space-y-2"
                  data-testid={`snapshot-item-${section.key}-${idx}`}
                >
                  <Textarea
                    value={item.text}
                    onChange={(e) => updateItem(section.key, idx, { text: e.target.value })}
                    rows={2}
                    placeholder="Plain-English bullet…"
                    className="bg-muted/40 border-border text-sm"
                    aria-label={`${section.title} item ${idx + 1} text`}
                  />
                  <Textarea
                    value={item.evidence_summary ?? ""}
                    onChange={(e) =>
                      updateItem(section.key, idx, {
                        evidence_summary: e.target.value,
                      })
                    }
                    rows={2}
                    placeholder="Evidence summary (e.g. ‘3 weekly check-ins on file’)"
                    className="bg-muted/40 border-border text-xs"
                    aria-label={`${section.title} item ${idx + 1} evidence`}
                  />
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] text-muted-foreground">Confidence:</span>
                    <select
                      value={item.confidence ?? "Medium"}
                      onChange={(e) =>
                        updateItem(section.key, idx, {
                          confidence: e.target.value as SnapshotConfidence,
                        })
                      }
                      className="text-[11px] px-2 py-1 rounded-md border border-border bg-card text-foreground"
                      aria-label={`${section.title} item ${idx + 1} confidence`}
                    >
                      {CONFIDENCE_OPTIONS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    <span className="text-[11px] text-muted-foreground ml-2">Gears:</span>
                    <div className="flex items-center gap-1 flex-wrap">
                      {STABILITY_GEAR_KEYS.map((g) => {
                        const active = (item.gears ?? []).includes(g);
                        return (
                          <button
                            key={g}
                            type="button"
                            onClick={() => toggleGear(section.key, idx, g)}
                            className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] transition ${
                              active
                                ? "border-primary/60 bg-primary/10 text-foreground"
                                : "border-border bg-card text-muted-foreground hover:text-foreground"
                            }`}
                            aria-pressed={active}
                            aria-label={`Toggle gear ${GEAR_LABEL[g]}`}
                          >
                            <GearChip gear={GEAR_KEY_TO_NUMBER[g]} />
                            <span>{GEAR_LABEL[g]}</span>
                          </button>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(section.key, idx)}
                      className="ml-auto text-[11px] text-muted-foreground hover:text-rose-300 inline-flex items-center gap-1"
                      aria-label={`Remove ${section.title} item ${idx + 1}`}
                    >
                      <Trash2 className="h-3 w-3" /> Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-2">
              <button
                type="button"
                onClick={() => addItem(section.key)}
                className="text-[11px] text-primary hover:text-secondary inline-flex items-center gap-1"
                data-testid={`snapshot-add-item-${section.key}`}
              >
                <Plus className="h-3 w-3" /> Add item
              </button>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-3 text-[11px] text-muted-foreground">
        Hard rules: do not invent precise numbers, margins, staffing, or compliance issues.
        Cannabis/MMJ wording stays cannabis retail/POS — never healthcare. The snapshot is
        admin-only until every section is Approved and the parent draft is approved.
      </p>
    </section>
  );
}

export default StabilitySnapshotReviewPanel;