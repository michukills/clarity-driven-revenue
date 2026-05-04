import { useEffect, useMemo, useState } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { usePortalCustomerId } from "@/hooks/usePortalCustomerId";
import { TrendingUp, TrendingDown, Minus, CalendarClock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PremiumToolHeader } from "@/components/tools/PremiumToolHeader";
import { RcsScopeBanner } from "@/components/tools/RcsScopeBanner";
import {
  ToolGuidancePanel,
  ToolEmptyState,
  ToolLoadingState,
  ToolErrorState,
} from "@/components/tools/ToolGuidancePanel";
import {
  getClientScorecardHistoryEntries,
  SHTE_SOURCE_LABEL, SHTE_BAND_LABEL, SHTE_TREND_LABEL,
  type ClientScorecardHistoryEntry,
} from "@/lib/scorecardHistory";

const BAND_TONE: Record<string, string> = {
  unstable: "bg-destructive/15 text-destructive border-destructive/40",
  needs_attention: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  stabilizing: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  stable: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  strong: "bg-primary/20 text-primary border-primary/40",
  unknown: "",
};

function trendIcon(t: string | null) {
  if (t === "improving") return <TrendingUp className="h-3 w-3 mr-1" />;
  if (t === "declining") return <TrendingDown className="h-3 w-3 mr-1" />;
  return <Minus className="h-3 w-3 mr-1" />;
}

export default function ScorecardHistory() {
  const { customerId, loading } = usePortalCustomerId();
  const [rows, setRows] = useState<ClientScorecardHistoryEntry[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (loading || !customerId) return;
    let alive = true;
    (async () => {
      try {
        const r = await getClientScorecardHistoryEntries(customerId);
        if (alive) setRows(r);
      } catch (e: any) {
        if (alive) setErr(e?.message ?? "Failed to load score history");
      }
    })();
    return () => { alive = false; };
  }, [customerId, loading]);

  const latest = useMemo(() => (rows && rows[0]) || null, [rows]);
  const prior = useMemo(() => (rows && rows[1]) || null, [rows]);

  return (
    <PortalShell variant="customer">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <PremiumToolHeader
          toolName="Scorecard History / Stability Trend Tracker"
          lane="RGS Control System"
          purpose="Reviewed score snapshots over time across the stability pillars. Use this to see where stability is improving, holding steady, or slipping — not a guarantee of results and not a substitute for accounting, legal, tax, compliance, payroll, or HR review."
          backTo="/portal/tools/rgs-control-system"
          backLabel="Back to RGS Control System™"
        />

        <ToolGuidancePanel
          purpose="Read the latest snapshot first, then look at the trend across recent reviews to see which pillars are moving and which are not."
          prepare={[
            "No prep needed — this is a read view",
            "If something here surprises you, note it for the next monthly review",
          ]}
          goodSubmission={[
            "You understand the latest band (improving, holding steady, or slipping)",
            "You can name the pillar that moved the most since last review",
          ]}
          whatHappensNext="Trends are reviewed by RGS during the next monthly system review and shape the next priority focus."
          reviewedBy="Each snapshot is reviewed by your RGS team before it appears here."
          outOfScope="Visibility and bounded interpretation only — not a substitute for owner judgment and not RGS operating the business."
        />

        {err && <ToolErrorState message={err} />}

        {loading || rows === null ? (
          <ToolLoadingState label="Loading the score history…" />
        ) : rows.length === 0 ? (
          <ToolEmptyState
            title="No client-visible score history yet."
            body="Snapshots appear here once RGS reviews and approves them. Until then, no action is required from you."
            responsibility="rgs"
          />
        ) : (
          <>
            {latest && (
              <section className="border border-border bg-card rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h2 className="text-sm uppercase tracking-wider text-muted-foreground">Latest reviewed snapshot</h2>
                  <div className="flex items-center gap-2">
                    {latest.stability_band && (
                      <Badge variant="outline" className={BAND_TONE[latest.stability_band] ?? ""}>
                        {SHTE_BAND_LABEL[latest.stability_band]}
                      </Badge>
                    )}
                    {latest.trend_direction && (
                      <Badge variant="outline">
                        {trendIcon(latest.trend_direction)}
                        {SHTE_TREND_LABEL[latest.trend_direction]}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-end gap-6 flex-wrap">
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Total score</div>
                    <div className="text-3xl text-foreground font-serif">{latest.total_score ?? "—"}</div>
                  </div>
                  {latest.prior_total_score !== null && (
                    <div>
                      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Prior</div>
                      <div className="text-xl text-muted-foreground">{latest.prior_total_score}</div>
                    </div>
                  )}
                  {latest.score_change !== null && (
                    <div>
                      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Change</div>
                      <div className={`text-xl ${latest.score_change > 0 ? "text-emerald-400" : latest.score_change < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                        {latest.score_change > 0 ? "+" : ""}{latest.score_change}
                      </div>
                    </div>
                  )}
                </div>
                <GearGrid e={latest} />
                {latest.client_visible_summary && (
                  <p className="text-sm text-foreground border-t border-border pt-3">{latest.client_visible_summary}</p>
                )}
                <Meta e={latest} />
              </section>
            )}

            {rows.length > 1 && (
              <section className="space-y-3">
                <h2 className="text-sm uppercase tracking-wider text-muted-foreground">Earlier snapshots</h2>
                <ul className="space-y-3">
                  {rows.slice(1).map(r => (
                    <li key={r.id} className="border border-border bg-card rounded-xl p-4 space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <h3 className="text-base text-foreground">{r.title}</h3>
                        <div className="flex items-center gap-2 flex-wrap">
                          {r.total_score !== null && <Badge variant="outline">Score {r.total_score}</Badge>}
                          {r.stability_band && (
                            <Badge variant="outline" className={BAND_TONE[r.stability_band] ?? ""}>
                              {SHTE_BAND_LABEL[r.stability_band]}
                            </Badge>
                          )}
                          {r.trend_direction && (
                            <Badge variant="outline">
                              {trendIcon(r.trend_direction)}
                              {SHTE_TREND_LABEL[r.trend_direction]}
                            </Badge>
                          )}
                        </div>
                      </div>
                      {r.client_visible_summary && (
                        <p className="text-sm text-foreground">{r.client_visible_summary}</p>
                      )}
                      <Meta e={r} />
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {prior && (
              <p className="text-xs text-muted-foreground">
                Comparison context: latest reviewed snapshot vs prior visible snapshot.
              </p>
            )}
          </>
        )}
      </div>
    </PortalShell>
  );
}

function GearGrid({ e }: { e: ClientScorecardHistoryEntry }) {
  const gears: { label: string; v: number | null }[] = [
    { label: "Demand generation", v: e.demand_generation_score },
    { label: "Revenue conversion", v: e.revenue_conversion_score },
    { label: "Operational efficiency", v: e.operational_efficiency_score },
    { label: "Financial visibility", v: e.financial_visibility_score },
    { label: "Owner independence", v: e.owner_independence_score },
  ];
  if (gears.every(g => g.v === null)) return null;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-3 border-t border-border">
      {gears.map(g => (
        <div key={g.label} className="rounded-md border border-border bg-muted/10 p-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{g.label}</div>
          <div className="text-base text-foreground">{g.v ?? "—"}</div>
        </div>
      ))}
    </div>
  );
}

function Meta({ e }: { e: ClientScorecardHistoryEntry }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 text-sm">
      <div>
        <span className="text-muted-foreground">Source: </span>
        <span className="text-foreground">{e.source_label ?? SHTE_SOURCE_LABEL[e.source_type]}</span>
      </div>
      {e.scored_at && (
        <div className="flex items-center gap-1">
          <CalendarClock className="h-3 w-3 text-muted-foreground" />
          <span className="text-muted-foreground">Scored: </span>
          <span className="text-foreground">{new Date(e.scored_at).toLocaleDateString()}</span>
        </div>
      )}
      {e.next_review_date && (
        <div className="flex items-center gap-1">
          <CalendarClock className="h-3 w-3 text-muted-foreground" />
          <span className="text-muted-foreground">Next review: </span>
          <span className="text-foreground">{new Date(e.next_review_date).toLocaleDateString()}</span>
        </div>
      )}
    </div>
  );
}