import { Badge } from "@/components/ui/badge";
import type { SwotCategory } from "@/lib/swot/types";
import {
  SWOT_EXECUTIVE_SNAPSHOT,
  SWOT_SIGNAL_FOOTNOTE,
  type SwotReportModel,
} from "@/lib/swot/swotReportBuilder";

const QUADRANT_ORDER: SwotCategory[] = ["strength", "weakness", "opportunity", "threat"];

const SIGNAL_SECTIONS: Array<{ key: keyof SwotReportModel["signal_groups"]; title: string }> = [
  { key: "repair_map", title: "Repair Map" },
  { key: "implementation", title: "Implementation" },
  { key: "campaign", title: "Campaign future planning" },
  { key: "buyer_persona", title: "Buyer Persona / ICP" },
  { key: "control_system", title: "Control System monitoring" },
  { key: "reengagement", title: "Re-engagement trigger potential" },
  { key: "evidence_needed", title: "Evidence needed" },
];

export function SwotStrategicMatrixReport({ model }: { model: SwotReportModel }) {
  return (
    <article className="space-y-6 text-foreground">
      {/* Cover / Header */}
      <header className="border-b border-border pb-4 space-y-2">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
          Revenue & Growth Systems
        </div>
        <h1 className="text-2xl font-serif">SWOT Strategic Matrix</h1>
        <div className="text-sm text-muted-foreground">
          {model.customer_name ? `${model.customer_name} · ` : ""}
          {model.analysis.title}
        </div>
        <div className="flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
          <Badge variant="outline" className="text-[10px]">{model.analysis.analysis_mode_label}</Badge>
          {model.analysis.industry && <Badge variant="outline" className="text-[10px]">{model.analysis.industry}</Badge>}
          {model.analysis.business_stage && <Badge variant="outline" className="text-[10px]">{model.analysis.business_stage}</Badge>}
          {model.analysis.approved_at && (
            <Badge variant="secondary" className="text-[10px]">
              Approved {new Date(model.analysis.approved_at).toLocaleDateString()}
            </Badge>
          )}
        </div>
      </header>

      {model.empty_client_visible_warning && (
        <p className="text-xs text-amber-700 dark:text-amber-400 border border-amber-500/40 bg-amber-500/5 rounded-md px-3 py-2">
          {model.empty_client_visible_warning}
        </p>
      )}

      {/* Executive Snapshot */}
      <section className="space-y-2">
        <h2 className="text-base font-serif">Executive Snapshot</h2>
        <p className="text-sm text-muted-foreground">{SWOT_EXECUTIVE_SNAPSHOT}</p>
      </section>

      {/* Four-Quadrant Matrix */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {QUADRANT_ORDER.map((cat) => {
          const q = model.quadrants[cat];
          return (
            <div key={cat} className="bg-card border border-border rounded-xl p-4 space-y-3 min-w-0">
              <div>
                <h3 className="text-base font-serif">{q.client_heading}</h3>
                <p className="text-[11px] text-muted-foreground">{q.blurb}</p>
              </div>
              {q.items.length === 0 ? (
                <p className="text-xs italic text-muted-foreground">Nothing recorded in this section.</p>
              ) : (
                <ul className="space-y-3">
                  {q.items.map((it) => (
                    <li key={it.id} className="rounded-md border border-border bg-background p-3 space-y-1.5 min-w-0">
                      <div className="text-sm font-medium break-words">{it.title}</div>
                      {it.client_safe_summary && (
                        <p className="text-sm text-muted-foreground break-words">{it.client_safe_summary}</p>
                      )}
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="outline" className="text-[10px]">{it.linked_gear_label}</Badge>
                        <Badge variant="outline" className="text-[10px]">{it.evidence_confidence_label}</Badge>
                        <Badge variant="outline" className="text-[10px] capitalize">{it.severity_or_leverage}</Badge>
                        {it.downstream_relevance.map((d) => (
                          <Badge key={d} variant="outline" className="text-[10px]">{d}</Badge>
                        ))}
                      </div>
                      <p className="text-[11px] italic text-muted-foreground">{it.evidence_confidence_plain}</p>
                      {it.recommended_action && (
                        <div className="rounded border border-border/60 bg-muted/20 px-2 py-1.5">
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            Recommended next review
                          </div>
                          <p className="text-xs break-words">{it.recommended_action}</p>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </section>

      {/* Signal Implications */}
      <section className="space-y-3">
        <h2 className="text-base font-serif">Signal Implications</h2>
        <p className="text-sm text-muted-foreground">{SWOT_SIGNAL_FOOTNOTE}</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {SIGNAL_SECTIONS.map(({ key, title }) => {
            const groups = model.signal_groups[key];
            if (!groups || groups.length === 0) return null;
            return (
              <div key={key} className="bg-card border border-border rounded-xl p-3 space-y-2">
                <div className="text-sm font-medium">{title}</div>
                <ul className="space-y-2 text-xs text-muted-foreground">
                  {groups.map((g) => (
                    <li key={g.signal_type}>
                      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        {g.label} ({g.count})
                      </div>
                      <ul className="mt-1 space-y-0.5">
                        {g.summaries.slice(0, 5).map((s, i) => (
                          <li key={i} className="break-words">• {s}</li>
                        ))}
                        {g.summaries.length > 5 && (
                          <li className="italic">+ {g.summaries.length - 5} more</li>
                        )}
                      </ul>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
          {SIGNAL_SECTIONS.every(({ key }) => model.signal_groups[key].length === 0) && (
            <p className="text-xs italic text-muted-foreground">No downstream signals available in this report scope.</p>
          )}
        </div>
      </section>

      {/* Evidence Confidence */}
      <section className="space-y-2">
        <h2 className="text-base font-serif">Evidence Confidence</h2>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li><span className="text-foreground font-medium">Verified</span> — backed by reviewed evidence.</li>
          <li><span className="text-foreground font-medium">Partially supported</span> — some supporting evidence, not fully verified.</li>
          <li><span className="text-foreground font-medium">Owner claim only</span> — stated by the owner, not independently verified.</li>
          <li><span className="text-foreground font-medium">Assumption</span> — working assumption that needs evidence.</li>
          <li><span className="text-foreground font-medium">Missing evidence</span> — has not been gathered yet.</li>
        </ul>
        <p className="text-xs text-muted-foreground italic">
          Lower-confidence findings should be reviewed before they become operating conclusions.
        </p>
      </section>

      {/* Recommended Next Review */}
      <section className="space-y-2">
        <h2 className="text-base font-serif">Recommended Next Review</h2>
        {model.recommended_next_review.length === 0 ? (
          <p className="text-sm italic text-muted-foreground">
            No approved client-facing recommended next reviews are available yet.
          </p>
        ) : (
          <ul className="text-sm text-foreground space-y-1 list-disc list-inside">
            {model.recommended_next_review.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        )}
      </section>

      {/* Scope Boundary */}
      <section className="space-y-2 border-t border-border pt-4">
        <h2 className="text-base font-serif">Scope Boundary</h2>
        <p className="text-xs text-muted-foreground">{model.scope_disclaimer}</p>
        {model.cannabis_scope_note && (
          <p className="text-xs text-muted-foreground border-l-2 border-amber-500/60 pl-3 py-1 bg-amber-500/5">
            {model.cannabis_scope_note}
          </p>
        )}
        {model.standalone_scope_note && (
          <p className="text-xs text-muted-foreground border-l-2 border-amber-500/60 pl-3 py-1 bg-amber-500/5">
            {model.standalone_scope_note}
          </p>
        )}
      </section>
    </article>
  );
}