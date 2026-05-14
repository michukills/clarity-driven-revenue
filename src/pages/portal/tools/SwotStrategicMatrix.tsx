import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PortalShell } from "@/components/portal/PortalShell";
import { usePortalCustomerId } from "@/hooks/usePortalCustomerId";
import { Badge } from "@/components/ui/badge";
import { Loader2, LayoutGrid } from "lucide-react";
import {
  clientListApprovedAnalyses, clientListApprovedItems,
  CATEGORY_LABEL, CATEGORY_BLURB, CONFIDENCE_LABEL, CONFIDENCE_PLAIN,
  GEAR_LABEL, ANALYSIS_MODE_LABEL, SCOPE_DISCLAIMER, STANDALONE_SCOPE_NOTE,
} from "@/lib/swot/swotMatrixData";
import type { SwotAnalysis, SwotCategory, SwotItem } from "@/lib/swot/types";

const CLIENT_HEADINGS: Record<SwotCategory, { title: string; sub: string }> = {
  strength: { title: "What is working in your favor", sub: CATEGORY_BLURB.strength },
  weakness: { title: "What may be holding the business back", sub: CATEGORY_BLURB.weakness },
  opportunity: { title: "Outside opportunities worth watching", sub: CATEGORY_BLURB.opportunity },
  threat: { title: "Outside threats or risks to monitor", sub: CATEGORY_BLURB.threat },
};

export default function SwotStrategicMatrix() {
  const { customerId, loading } = usePortalCustomerId();
  const [analyses, setAnalyses] = useState<SwotAnalysis[] | null>(null);
  const [items, setItems] = useState<SwotItem[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (loading || !customerId) return;
    let alive = true;
    (async () => {
      try {
        const a = await clientListApprovedAnalyses(customerId);
        if (!alive) return;
        setAnalyses(a);
        setActiveId(a[0]?.id ?? null);
      } catch (e: any) {
        if (alive) setErr(e?.message ?? "Failed to load matrix");
      }
    })();
    return () => { alive = false; };
  }, [customerId, loading]);

  useEffect(() => {
    if (!activeId || !customerId) { setItems(null); return; }
    let alive = true;
    (async () => {
      try {
        const r = await clientListApprovedItems(activeId, customerId);
        if (alive) setItems(r);
      } catch (e: any) {
        if (alive) setErr(e?.message ?? "Failed to load matrix items");
      }
    })();
    return () => { alive = false; };
  }, [activeId, customerId]);

  const active = analyses?.find(a => a.id === activeId) ?? null;

  const grouped = useMemo(() => {
    const g: Record<SwotCategory, SwotItem[]> = { strength: [], weakness: [], opportunity: [], threat: [] };
    for (const i of items ?? []) g[i.category].push(i);
    return g;
  }, [items]);

  return (
    <PortalShell variant="customer">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <header className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <LayoutGrid className="h-3.5 w-3.5" />
            Part of the RGS Operating System ·{" "}
            <Link to="/portal/tools/swot-analysis" className="text-primary hover:underline">
              Stability Snapshot view
            </Link>
          </div>
          <h1 className="text-2xl text-foreground font-serif">SWOT Strategic Matrix</h1>
          <p className="text-sm text-muted-foreground max-w-3xl">
            RGS uses SWOT to separate internal business conditions from external market
            conditions, then connect those signals to the operating system. This view shows
            findings your RGS team has reviewed and approved for you.
          </p>
          <p className="text-xs text-muted-foreground max-w-3xl border border-border/60 bg-muted/20 rounded-md px-3 py-2">
            {SCOPE_DISCLAIMER}
          </p>
        </header>

        {(loading || analyses === null) ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : err ? (
          <p className="text-sm text-destructive">{err}</p>
        ) : analyses.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-6">
            <p className="text-sm text-foreground">Your Strategic Matrix is not yet available.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Client view is unavailable until your RGS team approves the analysis.
            </p>
          </div>
        ) : (
          <>
            {analyses.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {analyses.map(a => (
                  <button key={a.id} type="button" onClick={() => setActiveId(a.id)}
                    className={`text-xs px-3 py-1.5 rounded-md border ${activeId === a.id ? "border-primary text-foreground" : "border-border text-muted-foreground"}`}>
                    {a.title}
                  </button>
                ))}
              </div>
            )}

            {active && (
              <section className="bg-card border border-border rounded-xl p-4 text-xs text-muted-foreground">
                <span>Approved {active.approved_at ? new Date(active.approved_at).toLocaleDateString() : "—"}</span>
                <span className="mx-1">·</span>
                <span>Mode: {ANALYSIS_MODE_LABEL[active.analysis_mode]}</span>
                {active.industry && <><span className="mx-1">·</span><span>Industry: {active.industry}</span></>}
                {active.analysis_mode === "standalone_gig" && (
                  <p className="mt-2 text-xs text-foreground border-l-2 border-amber-500/60 pl-3 py-1 bg-amber-500/5">
                    {STANDALONE_SCOPE_NOTE}
                  </p>
                )}
              </section>
            )}

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {(["strength","weakness","opportunity","threat"] as SwotCategory[]).map(cat => {
                const list = grouped[cat];
                const head = CLIENT_HEADINGS[cat];
                return (
                  <div key={cat} className="bg-card border border-border rounded-xl p-4 space-y-3 min-w-0">
                    <div>
                      <h2 className="text-base text-foreground font-serif">{head.title}</h2>
                      <p className="text-[11px] text-muted-foreground">{head.sub}</p>
                    </div>
                    {list.length === 0 ? (
                      <p className="text-xs italic text-muted-foreground">
                        Nothing approved in this section yet.
                      </p>
                    ) : (
                      <ul className="space-y-3">
                        {list.map(it => (
                          <li key={it.id} className="rounded-md border border-border bg-background p-3 space-y-1.5 min-w-0">
                            <div className="text-sm text-foreground font-medium break-words">{it.title}</div>
                            {it.client_safe_summary && (
                              <p className="text-sm text-muted-foreground break-words">{it.client_safe_summary}</p>
                            )}
                            <div className="flex flex-wrap gap-1">
                              <Badge variant="outline" className="text-[10px]">{GEAR_LABEL[it.linked_gear]}</Badge>
                              <Badge variant="outline" className="text-[10px]" title={CONFIDENCE_PLAIN[it.evidence_confidence]}>
                                {CONFIDENCE_LABEL[it.evidence_confidence]}
                              </Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground italic">
                              {CONFIDENCE_PLAIN[it.evidence_confidence]}
                            </p>
                            {it.recommended_action && (
                              <div className="rounded border border-border/60 bg-muted/20 px-2 py-1.5">
                                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">What RGS recommends reviewing next</div>
                                <p className="text-xs text-foreground break-words">{it.recommended_action}</p>
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
          </>
        )}
      </div>
    </PortalShell>
  );
}