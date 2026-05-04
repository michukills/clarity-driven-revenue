import { useEffect, useState } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { usePortalCustomerId } from "@/hooks/usePortalCustomerId";
import { Loader2, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  getClientSopTrainingBible,
  type ClientSopEntry,
} from "@/lib/sopTrainingBible";
import { GEAR_LABELS } from "@/lib/implementationRoadmap";
import { ImplementationScopeBanner } from "@/components/tools/ImplementationScopeBanner";

export default function SopTrainingBible() {
  const { customerId, loading } = usePortalCustomerId();
  const [rows, setRows] = useState<ClientSopEntry[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (loading || !customerId) return;
    let alive = true;
    (async () => {
      try {
        const r = await getClientSopTrainingBible(customerId);
        if (alive) setRows(r);
      } catch (e: any) {
        if (alive) setErr(e?.message ?? "Failed to load training bible");
      }
    })();
    return () => { alive = false; };
  }, [customerId, loading]);

  // Group by category (fallback "General")
  const groups: Record<string, ClientSopEntry[]> = {};
  for (const r of rows ?? []) {
    const key = r.category?.trim() || "General";
    (groups[key] ||= []).push(r);
  }

  return (
    <PortalShell variant="customer">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <header className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <BookOpen className="h-4 w-4" /> Implementation
          </div>
          <h1 className="text-2xl text-foreground font-serif">SOP / Training Bible</h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            This page contains approved operating instructions and training notes built during
            implementation. Each entry shows when to use the process, the steps to follow, the
            quality standard, and who owns the work. Review before using with staff and adapt to
            your business and any legal or compliance requirements.
          </p>
        </header>

        <ImplementationScopeBanner
          included="approved operating instructions and training notes built during implementation."
          excluded="employee management, ongoing training delivery, legal, tax, HR, or compliance review. Adapt each entry to your business and applicable requirements before using with staff."
        />

        {loading || rows === null ? (
          <div className="py-16 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : err ? (
          <div className="bg-card border border-border rounded-xl p-6 text-sm text-muted-foreground">
            We couldn't load your training bible right now. Please try again shortly.
          </div>
        ) : rows.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-8 text-center">
            <h2 className="text-base text-foreground mb-2">Your SOP / Training Bible is being prepared.</h2>
            <p className="text-sm text-muted-foreground">
              Once RGS marks entries ready, approved operating instructions will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groups).map(([cat, entries]) => (
              <section key={cat} className="space-y-3">
                <h2 className="text-xs uppercase tracking-wider text-muted-foreground">{cat}</h2>
                <div className="space-y-3">
                  {entries.map((e) => (
                    <article key={e.id} className="bg-card border border-border rounded-xl p-5 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-foreground">{e.title}</h3>
                          <div className="text-[11px] text-muted-foreground mt-0.5 space-x-2">
                            {e.role_team ? <span>Role: {e.role_team}</span> : null}
                            {e.gear ? <span>· {GEAR_LABELS[e.gear]}</span> : null}
                          </div>
                        </div>
                        <Badge variant="outline" className="capitalize">v{e.version}</Badge>
                      </div>
                      {e.purpose ? (
                        <p className="text-sm text-muted-foreground whitespace-pre-line">{e.purpose}</p>
                      ) : null}
                      {e.client_summary ? (
                        <p className="text-sm text-foreground/90 whitespace-pre-line">{e.client_summary}</p>
                      ) : null}

                      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        {e.trigger_when_used ? (
                          <div>
                            <dt className="text-muted-foreground uppercase tracking-wider mb-0.5">When to use</dt>
                            <dd className="text-foreground whitespace-pre-line">{e.trigger_when_used}</dd>
                          </div>
                        ) : null}
                        {e.inputs_tools_needed ? (
                          <div>
                            <dt className="text-muted-foreground uppercase tracking-wider mb-0.5">Inputs / tools needed</dt>
                            <dd className="text-foreground whitespace-pre-line">{e.inputs_tools_needed}</dd>
                          </div>
                        ) : null}
                      </dl>

                      {Array.isArray(e.steps) && e.steps.length > 0 ? (
                        <div>
                          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Steps</div>
                          <ol className="space-y-2 list-decimal pl-5 text-sm text-foreground">
                            {e.steps
                              .slice()
                              .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                              .map((s, idx) => (
                                <li key={idx} className="space-y-0.5">
                                  <div className="whitespace-pre-line">{s.instruction}</div>
                                  {s.expected_outcome ? (
                                    <div className="text-xs text-muted-foreground">
                                      Expected outcome: {s.expected_outcome}
                                    </div>
                                  ) : null}
                                  {s.note ? (
                                    <div className="text-xs text-muted-foreground">Note: {s.note}</div>
                                  ) : null}
                                </li>
                              ))}
                          </ol>
                        </div>
                      ) : null}

                      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        {e.quality_standard ? (
                          <div className="sm:col-span-2">
                            <dt className="text-muted-foreground uppercase tracking-wider mb-0.5">Quality standard / definition of done</dt>
                            <dd className="text-foreground whitespace-pre-line">{e.quality_standard}</dd>
                          </div>
                        ) : null}
                        {e.common_mistakes ? (
                          <div>
                            <dt className="text-muted-foreground uppercase tracking-wider mb-0.5">Common mistakes</dt>
                            <dd className="text-foreground whitespace-pre-line">{e.common_mistakes}</dd>
                          </div>
                        ) : null}
                        {e.escalation_point ? (
                          <div>
                            <dt className="text-muted-foreground uppercase tracking-wider mb-0.5">Escalation</dt>
                            <dd className="text-foreground whitespace-pre-line">{e.escalation_point}</dd>
                          </div>
                        ) : null}
                        {e.owner_decision_point ? (
                          <div className="sm:col-span-2">
                            <dt className="text-muted-foreground uppercase tracking-wider mb-0.5">Owner decision point</dt>
                            <dd className="text-foreground whitespace-pre-line">{e.owner_decision_point}</dd>
                          </div>
                        ) : null}
                        {e.training_notes ? (
                          <div className="sm:col-span-2">
                            <dt className="text-muted-foreground uppercase tracking-wider mb-0.5">Training notes</dt>
                            <dd className="text-foreground whitespace-pre-line">{e.training_notes}</dd>
                          </div>
                        ) : null}
                      </dl>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        <p className="text-[11px] text-muted-foreground">
          These instructions are built from available process details and admin-reviewed before
          being released. Adapt them to your business and any legal or compliance requirements.
          Ongoing visibility after implementation is offered separately through the
          RGS Control System™ subscription.
        </p>
      </div>
    </PortalShell>
  );
}
