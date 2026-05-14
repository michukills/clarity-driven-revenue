import { Badge } from "@/components/ui/badge";
import type { SwotReportModel } from "@/lib/swot/swotReportBuilder";

/**
 * Read-only, premium-feeling SWOT Strategic Matrix report layout.
 * Renders the report model produced by buildSwotReportModelFromAdminInputs.
 * Same payload powers the PDF; this is the screen-rendered version used
 * for both admin preview and the client deliverable view.
 */
export function SwotStrategicMatrixReport({ model }: { model: SwotReportModel }) {
  return (
    <article className="space-y-6">
      {/* Cover */}
      <header className="rounded-xl border border-border bg-card p-6 space-y-2">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
          Revenue & Growth Systems · Strategic deliverable
        </div>
        <h2 className="text-2xl text-foreground font-serif">SWOT Strategic Matrix</h2>
        {model.business_name && (
          <div className="text-sm text-foreground">{model.business_name}</div>
        )}
        <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
          <span>Analysis: <strong className="text-foreground">{model.title}</strong></span>
          <span>· Mode: {model.analysis_mode_label}</span>
          {model.industry && <span>· Industry: {model.industry}</span>}
          {model.business_stage && <span>· Stage: {model.business_stage}</span>}
          {model.approved_at && (
            <span>· Approved {new Date(model.approved_at).toLocaleDateString()}</span>
          )}
        </div>
        {model.is_standalone && model.standalone_scope_note && (
          <p className="text-xs text-foreground border-l-2 border-amber-500/60 pl-3 py-1 bg-amber-500/5 mt-2">
            {model.standalone_scope_note}
          </p>
        )}
      </header>

      {/* Executive Snapshot */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-2">
        <h3 className="text-base text-foreground font-serif">Executive Snapshot</h3>
        <p className="text-sm text-muted-foreground break-words">{model.executive_snapshot}</p>
      </section>

      {/* Four-quadrant matrix */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {model.matrix.map((q) => (
          <div key={q.category} className="rounded-xl border border-border bg-card p-4 space-y-3 min-w-0">
            <div>
              <h3 className="text-base text-foreground font-serif">{q.heading}</h3>
              <p className="text-[11px] text-muted-foreground">{q.sub}</p>
            </div>
            {q.items.length === 0 ? (
              <p className="text-xs italic text-muted-foreground">
                No approved items in this section.
              </p>
            ) : (
              <ul className="space-y-3">
                {q.items.map((it) => (
                  <li key={it.id} className="rounded-md border border-border bg-background p-3 space-y-1.5 min-w-0">
                    <div className="text-sm text-foreground font-medium break-words">{it.title}</div>
                    {it.client_safe_summary && (
                      <p className="text-sm text-muted-foreground break-words">{it.client_safe_summary}</p>
                    )}
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="outline" className="text-[10px]">{it.linked_gear_label}</Badge>
                      <Badge variant="outline" className="text-[10px]">{it.evidence_confidence_label}</Badge>
                      <Badge variant="outline" className="text-[10px] capitalize">{it.severity_or_leverage}</Badge>
                      {it.downstream_labels.map((d) => (
                        <Badge key={d} variant="outline" className="text-[10px]">{d}</Badge>
                      ))}
                    </div>
                    {it.recommended_action && (
                      <div className="rounded border border-border/60 bg-muted/20 px-2 py-1.5">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          Recommended next review
                        </div>
                        <p className="text-xs text-foreground break-words">{it.recommended_action}</p>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </section>

      {/* Signal implications */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-3">
        <div>
          <h3 className="text-base text-foreground font-serif">Signal Implications</h3>
          <p className="text-xs text-muted-foreground">
            These signals help RGS identify what may belong in the Repair Map, Implementation
            plan, Control System monitoring, or future campaign planning. Inclusion here does
            not mean the downstream action is automatically performed — your active engagement
            scope determines that.
          </p>
        </div>
        {model.signal_groups.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            No downstream signals were generated from this analysis.
          </p>
        ) : (
          <ul className="space-y-2">
            {model.signal_groups.map((g) => (
              <li key={g.type} className="rounded-md border border-border bg-background p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm text-foreground font-medium">{g.label}</div>
                  <Badge variant="outline" className="text-[10px]">{g.items.length}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{g.description}</p>
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {g.items.slice(0, 6).map((s, i) => (
                    <li key={i} className="break-words">• {s.summary}</li>
                  ))}
                  {g.items.length > 6 && (
                    <li className="italic">+ {g.items.length - 6} more signal(s)</li>
                  )}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Evidence legend */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-2">
        <h3 className="text-base text-foreground font-serif">Evidence Confidence</h3>
        <ul className="text-sm text-muted-foreground space-y-1">
          {model.evidence_legend.map((l) => (
            <li key={l.level}>
              <span className="text-foreground font-medium">{l.level}</span> — {l.plain}
            </li>
          ))}
        </ul>
      </section>

      {/* Recommended next review */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-2">
        <h3 className="text-base text-foreground font-serif">Recommended Next Review</h3>
        {model.recommended_next_review.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            No approved next-step recommendations are attached to items in this analysis.
          </p>
        ) : (
          <ul className="space-y-2">
            {model.recommended_next_review.map((r, i) => (
              <li key={i} className="rounded-md border border-border bg-background p-3 space-y-1 min-w-0">
                <div className="text-sm text-foreground font-medium break-words">{r.item_title}</div>
                <p className="text-sm text-muted-foreground break-words">{r.recommended_action}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Scope boundary */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-2">
        <h3 className="text-base text-foreground font-serif">Scope Boundary</h3>
        <p className="text-xs text-muted-foreground">{model.scope_disclaimer}</p>
        {model.cannabis_disclaimer && (
          <p className="text-xs text-muted-foreground">{model.cannabis_disclaimer}</p>
        )}
        {model.standalone_scope_note && (
          <p className="text-xs text-muted-foreground">{model.standalone_scope_note}</p>
        )}
      </section>
    </article>
  );
}