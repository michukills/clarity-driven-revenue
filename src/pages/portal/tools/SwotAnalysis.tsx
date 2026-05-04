import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PortalShell } from "@/components/portal/PortalShell";
import { usePortalCustomerId } from "@/hooks/usePortalCustomerId";
import { Loader2, LayoutGrid, Pin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  getClientSwotItems,
  SWOT_CATEGORIES, SWOT_CATEGORY_LABEL, SWOT_CATEGORY_PLURAL,
  SWOT_PRIORITY_LABEL, SWOT_LANE_LABEL, SWOT_PHASE_LABEL,
  SWOT_GEAR_LABEL, SWOT_SOURCE_LABEL,
  type ClientSwotItem, type SwotCategory, type SwotServiceLane,
} from "@/lib/swotAnalysis";

// NOTE: Per docs/stability-snapshot.md (P20.18–P20.20) the client-facing label
// for SWOT-style content must always be "RGS Stability Snapshot" — never
// "SWOT Analysis". Internal admin tooling can still use the SWOT label.
export default function SwotAnalysis() {
  const { customerId, loading } = usePortalCustomerId();
  const [rows, setRows] = useState<ClientSwotItem[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [laneFilter, setLaneFilter] = useState<SwotServiceLane | "all">("all");

  useEffect(() => {
    if (loading || !customerId) return;
    let alive = true;
    (async () => {
      try {
        const r = await getClientSwotItems(customerId);
        if (alive) setRows(r);
      } catch (e: any) {
        if (alive) setErr(e?.message ?? "Failed to load snapshot items");
      }
    })();
    return () => { alive = false; };
  }, [customerId, loading]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    return rows.filter(r => {
      if (laneFilter !== "all" && r.service_lane !== laneFilter) return false;
      return true;
    });
  }, [rows, laneFilter]);

  const lanes = useMemo(
    () => Array.from(new Set(rows?.map(r => r.service_lane) ?? [])),
    [rows],
  );

  const grouped = useMemo(() => {
    const g: Record<SwotCategory, ClientSwotItem[]> = {
      strength: [], weakness: [], opportunity: [], threat: [],
    };
    for (const r of filtered) g[r.swot_category].push(r);
    return g;
  }, [filtered]);

  return (
    <PortalShell variant="customer">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <header className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <LayoutGrid className="h-3.5 w-3.5" />
            Part of the RGS Control System™ ·{" "}
            <Link to="/portal/tools/rgs-control-system" className="text-primary hover:underline">
              Back to RGS Control System™
            </Link>
          </div>
          <h1 className="text-2xl text-foreground font-serif">RGS Stability Snapshot</h1>
          <p className="text-sm text-muted-foreground max-w-3xl">
            This snapshot organizes what RGS has observed about the business into four
            sections — strengths to preserve, weaknesses creating instability, opportunities
            after stabilization, and threats to revenue or control. It is here to make the
            business easier to see clearly, not to choose the strategy for you or guarantee
            an outcome.
          </p>
          <p className="text-xs text-muted-foreground max-w-3xl">
            These items are support materials for review and planning. They do not replace
            owner judgment, qualified accounting / legal / tax / compliance review, or the
            agreed RGS service scope.
          </p>
        </header>

        {err && (
          <div className="border border-destructive/30 bg-destructive/10 rounded-md p-3 text-sm text-destructive">
            {err}
          </div>
        )}

        {loading || rows === null ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading snapshot…
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <select
                className="bg-background border border-border rounded-md px-2 py-2 text-sm"
                value={laneFilter}
                onChange={e => setLaneFilter(e.target.value as any)}
              >
                <option value="all">All lanes</option>
                {lanes.map(l => <option key={l} value={l}>{SWOT_LANE_LABEL[l]}</option>)}
              </select>
            </div>

            {filtered.length === 0 ? (
              <div className="border border-border bg-card rounded-xl p-6 text-center text-sm text-muted-foreground">
                No snapshot items have been shared yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {SWOT_CATEGORIES.map(cat => (
                  <section key={cat} className="border border-border bg-card rounded-xl p-4 space-y-3">
                    <h2 className="text-base text-foreground font-serif">
                      {SWOT_CATEGORY_PLURAL[cat]}
                    </h2>
                    {grouped[cat].length === 0 ? (
                      <p className="text-xs text-muted-foreground">Nothing shared in this section yet.</p>
                    ) : (
                      <ul className="space-y-3">
                        {grouped[cat].map(r => (
                          <li key={r.id} className="border border-border rounded-md p-3 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="text-sm text-foreground font-medium flex items-center gap-2">
                                {r.pinned && <Pin className="h-3.5 w-3.5 text-primary" />}
                                {r.title}
                              </h3>
                              <Badge variant="outline" className="text-[10px]">
                                {SWOT_CATEGORY_LABEL[cat]}
                              </Badge>
                            </div>
                            {r.client_visible_summary && (
                              <p className="text-xs text-muted-foreground">{r.client_visible_summary}</p>
                            )}
                            {r.client_visible_body && (
                              <p className="text-sm text-foreground whitespace-pre-line">
                                {r.client_visible_body}
                              </p>
                            )}
                            {r.evidence_note && (
                              <div>
                                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
                                  Evidence
                                </div>
                                <p className="text-xs text-foreground whitespace-pre-line">{r.evidence_note}</p>
                              </div>
                            )}
                            {r.recommended_next_step && (
                              <div>
                                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
                                  Suggested next step
                                </div>
                                <p className="text-xs text-foreground whitespace-pre-line">{r.recommended_next_step}</p>
                              </div>
                            )}
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              <Badge variant="secondary" className="text-[10px]">
                                Priority: {SWOT_PRIORITY_LABEL[r.priority]}
                              </Badge>
                              <Badge variant="secondary" className="text-[10px]">
                                Lane: {SWOT_LANE_LABEL[r.service_lane]}
                              </Badge>
                              <Badge variant="secondary" className="text-[10px]">
                                Stage: {SWOT_PHASE_LABEL[r.customer_journey_phase]}
                              </Badge>
                              {r.related_gear && (
                                <Badge variant="outline" className="text-[10px]">
                                  Gear: {SWOT_GEAR_LABEL[r.related_gear]}
                                </Badge>
                              )}
                              {r.related_source_type && (
                                <Badge variant="outline" className="text-[10px]">
                                  Source: {SWOT_SOURCE_LABEL[r.related_source_type]}
                                </Badge>
                              )}
                              {r.related_tool_key && (
                                <Badge variant="outline" className="text-[10px]">
                                  Related tool: {r.related_tool_key}
                                </Badge>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </PortalShell>
  );
}
