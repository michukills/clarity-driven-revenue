import { useEffect, useState } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { usePortalCustomerId } from "@/hooks/usePortalCustomerId";
import {
  getClientImplementationRoadmap,
  type ClientRoadmapRow,
  PHASE_LABELS,
  GEAR_LABELS,
  OWNER_LABELS,
  type RoadmapPhase,
} from "@/lib/implementationRoadmap";
import { Loader2, ListChecks } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ImplementationScopeBanner } from "@/components/tools/ImplementationScopeBanner";

export default function ImplementationRoadmap() {
  const { customerId, loading } = usePortalCustomerId();
  const [rows, setRows] = useState<ClientRoadmapRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (loading || !customerId) return;
    let alive = true;
    (async () => {
      try {
        const r = await getClientImplementationRoadmap(customerId);
        if (alive) setRows(r);
      } catch (e: any) {
        if (alive) setErr(e?.message ?? "Failed to load roadmap");
      }
    })();
    return () => { alive = false; };
  }, [customerId, loading]);

  const roadmap = rows && rows.length > 0
    ? { id: rows[0].roadmap_id, title: rows[0].title, summary: rows[0].summary, status: rows[0].status }
    : null;

  // Group items by phase, dropping rows that have no item (roadmap-only row).
  const items = (rows ?? []).filter((r) => r.item_id);
  const phases: RoadmapPhase[] = ["stabilize", "install", "train", "handoff", "ongoing_visibility"];

  return (
    <PortalShell variant="customer">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <header className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ListChecks className="h-4 w-4" /> Implementation
          </div>
          <h1 className="text-2xl text-foreground font-serif">Implementation Roadmap</h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            This roadmap turns your diagnostic findings into a bounded implementation plan.
            It shows what is being installed, why it matters, who owns the next step, and what
            the expected deliverable is. It is based on diagnostic findings and available
            evidence — not a guarantee of results.
          </p>
        </header>

        <ImplementationScopeBanner />

        {loading || rows === null ? (
          <div className="py-16 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : err ? (
          <div className="bg-card border border-border rounded-xl p-6 text-sm text-muted-foreground">
            We couldn't load your roadmap right now. Please try again shortly.
          </div>
        ) : !roadmap ? (
          <div className="bg-card border border-border rounded-xl p-8 text-center">
            <h2 className="text-base text-foreground mb-2">Your implementation roadmap is being prepared.</h2>
            <p className="text-sm text-muted-foreground">
              Once RGS marks it ready, you'll see the approved repair plan here.
            </p>
          </div>
        ) : (
          <>
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-start justify-between gap-3 mb-2">
                <h2 className="text-lg text-foreground">{roadmap.title}</h2>
                <Badge variant="outline" className="capitalize">
                  {roadmap.status.replace(/_/g, " ")}
                </Badge>
              </div>
              {roadmap.summary ? (
                <p className="text-sm text-muted-foreground whitespace-pre-line">{roadmap.summary}</p>
              ) : null}
            </div>

            {items.length === 0 ? (
              <div className="bg-card border border-border rounded-xl p-6 text-sm text-muted-foreground">
                Roadmap items will appear here once RGS releases them.
              </div>
            ) : (
              <div className="space-y-6">
                {phases.map((p) => {
                  const inPhase = items.filter((i) => i.phase === p);
                  if (inPhase.length === 0) return null;
                  return (
                    <section key={p} className="space-y-3">
                      <h3 className="text-xs uppercase tracking-wider text-muted-foreground">
                        {PHASE_LABELS[p]}
                      </h3>
                      <div className="space-y-3">
                        {inPhase.map((it) => (
                          <article key={it.item_id!} className="bg-card border border-border rounded-xl p-5 space-y-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <h4 className="text-foreground">{it.item_title}</h4>
                                {it.gear ? (
                                  <div className="text-[11px] text-muted-foreground mt-0.5">
                                    {GEAR_LABELS[it.gear]}
                                  </div>
                                ) : null}
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <Badge variant="outline" className="capitalize">{it.priority}</Badge>
                                <Badge variant="secondary" className="capitalize">
                                  {(it.item_status ?? "").replace(/_/g, " ")}
                                </Badge>
                              </div>
                            </div>
                            {it.client_summary ? (
                              <p className="text-sm text-muted-foreground whitespace-pre-line">
                                {it.client_summary}
                              </p>
                            ) : null}
                            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                              {it.owner_type ? (
                                <div>
                                  <dt className="text-muted-foreground uppercase tracking-wider mb-0.5">Who owns the next step</dt>
                                  <dd className="text-foreground">{OWNER_LABELS[it.owner_type]}</dd>
                                </div>
                              ) : null}
                              {it.deliverable ? (
                                <div>
                                  <dt className="text-muted-foreground uppercase tracking-wider mb-0.5">Deliverable</dt>
                                  <dd className="text-foreground">{it.deliverable}</dd>
                                </div>
                              ) : null}
                              {it.success_indicator ? (
                                <div className="sm:col-span-2">
                                  <dt className="text-muted-foreground uppercase tracking-wider mb-0.5">Success indicator</dt>
                                  <dd className="text-foreground">{it.success_indicator}</dd>
                                </div>
                              ) : null}
                            </dl>
                          </article>
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
            )}

            <p className="text-[11px] text-muted-foreground">
              RGS supports the items inside the agreed implementation engagement. Decisions and
              internal execution remain the owner's responsibility. Ongoing visibility after
              implementation is offered separately through the RGS Control System™ subscription.
            </p>
          </>
        )}
      </div>
    </PortalShell>
  );
}