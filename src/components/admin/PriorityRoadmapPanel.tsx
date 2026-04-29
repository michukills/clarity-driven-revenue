// P16.1 — Minimal admin roadmap panel.
// Lives in the report draft detail sidebar. Shows the priority engine roadmap,
// scored issues, and the top-3 generated client tasks. Provides idempotent
// Generate / Regenerate actions. Internal only — not surfaced to clients.

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Sparkles, RefreshCcw, ListOrdered, Eye, EyeOff, Send, AlertTriangle } from "lucide-react";
import {
  generateRoadmap,
  loadRoadmapForDraft,
  releaseClientTask,
  hideClientTask,
  releaseAllRoadmapTasks,
  type RoadmapView,
} from "@/lib/priorityEngine/roadmapService";
import type { IndustryCategory } from "@/lib/priorityEngine/types";
import { OperationalProfileCompletenessBadge } from "./OperationalProfileCompletenessBadge";

function ScoreContextDetail({ context }: { context: any | null | undefined }) {
  if (!context) return null;
  const notes: Array<{ factor: string; delta: number; reason: string }> =
    context.score_adjustment_notes ?? [];
  const readiness: string | undefined = context.operational_profile_readiness;
  const warning: string | null | undefined = context.reliability_warning;

  if (notes.length === 0 && !warning) {
    return readiness ? (
      <div className="mt-1 text-[10px] text-muted-foreground">
        Profile readiness: {readiness} · no adjustments applied
      </div>
    ) : null;
  }

  return (
    <details className="mt-1.5">
      <summary className="text-[10px] text-muted-foreground cursor-pointer hover:text-foreground">
        Why this score (admin only)
      </summary>
      <div className="mt-1 space-y-1 pl-2 border-l border-border">
        {readiness ? (
          <div className="text-[10px] text-muted-foreground">
            Profile readiness: <span className="text-foreground">{readiness}</span>
          </div>
        ) : null}
        {notes.length > 0 ? (
          <ul className="text-[10px] text-muted-foreground space-y-0.5">
            {notes.map((n, i) => (
              <li key={i}>
                <span className="text-foreground tabular-nums">
                  {n.delta > 0 ? "+" : ""}
                  {n.delta}
                </span>{" "}
                {n.factor.replace("_", " ")} — {n.reason}
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-[10px] text-muted-foreground">No profile adjustments applied.</div>
        )}
        {warning ? (
          <div className="text-[10px] text-amber-300">{warning}</div>
        ) : null}
      </div>
    </details>
  );
}

interface Props {
  reportDraftId: string;
  customerId: string | null;
  draftStatus: string;
}

const BAND_STYLES: Record<string, string> = {
  critical: "bg-red-500/15 text-red-300 border-red-500/30",
  high: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  medium: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  low: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
};

export function PriorityRoadmapPanel({ reportDraftId, customerId, draftStatus }: Props) {
  const [view, setView] = useState<RoadmapView>({ roadmap: null, scores: [], client_tasks: [] });
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [industry, setIndustry] = useState<IndustryCategory | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const v = await loadRoadmapForDraft(reportDraftId);
      setView(v);
      if (customerId) {
        const { data: c } = await supabase
          .from("customers")
          .select("industry")
          .eq("id", customerId)
          .maybeSingle();
        setIndustry((c?.industry as IndustryCategory) ?? null);
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Could not load roadmap");
    } finally {
      setLoading(false);
    }
  }, [reportDraftId, customerId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const run = async () => {
    if (!customerId) {
      toast.error("Draft has no customer linked.");
      return;
    }
    if (draftStatus !== "approved") {
      const ok = confirm(
        "This draft is not approved yet. Generate the roadmap anyway? (Recommended: approve first.)"
      );
      if (!ok) return;
    }
    setWorking(true);
    try {
      const { data: recs, error } = await supabase
        .from("report_recommendations")
        .select("id, title, category, priority, explanation, related_pillar, origin, rule_key")
        .eq("report_id", reportDraftId)
        .eq("included_in_report", true);
      if (error) throw error;
      if (!recs || recs.length === 0) {
        toast.error("No included recommendations on this draft to score.");
        return;
      }
      const userId = (await supabase.auth.getUser()).data.user?.id ?? null;
      const result = await generateRoadmap({
        report_draft_id: reportDraftId,
        customer_id: customerId,
        industry,
        recommendations: recs as any,
        generated_by: userId,
      });
      toast.success(
        result.regenerated
          ? `Roadmap regenerated · ${result.scored.length} scored · top ${result.top_tasks.length} tasks`
          : `Roadmap generated · ${result.scored.length} scored · top ${result.top_tasks.length} tasks`
      );
      await refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not generate roadmap");
    } finally {
      setWorking(false);
    }
  };

  return (
    <section className="bg-card border border-border rounded-xl p-5">
      <h2 className="text-sm uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
        <ListOrdered className="h-3.5 w-3.5" /> Priority roadmap
        <span className="ml-auto text-[10px] normal-case tracking-normal text-muted-foreground">
          Admin only
        </span>
      </h2>

      <div className="text-[11px] text-muted-foreground mb-3 space-y-0.5">
        <div>
          Industry:{" "}
          <span className="text-foreground">{industry ?? "—"}</span>
          {industry === "other" ? (
            <span className="ml-1 text-amber-400">(needs admin confirmation)</span>
          ) : null}
        </div>
        {view.roadmap ? (
          <div>
            Generated:{" "}
            <span className="text-foreground">
              {new Date(view.roadmap.generated_at).toLocaleString()}
            </span>
            {view.roadmap.regenerated_at ? (
              <>
                {" · regenerated "}
                <span className="text-foreground">
                  {new Date(view.roadmap.regenerated_at).toLocaleString()}
                </span>
              </>
            ) : null}
          </div>
        ) : (
          <div>No roadmap generated yet.</div>
        )}
      </div>

      <div className="mb-3">
        <OperationalProfileCompletenessBadge customerId={customerId} />
      </div>

      <Button
        size="sm"
        onClick={run}
        disabled={working || loading}
        className="w-full"
      >
        {working ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : view.roadmap ? (
          <RefreshCcw className="h-4 w-4" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        {view.roadmap ? "Regenerate roadmap" : "Generate roadmap"}
      </Button>

      {loading ? (
        <div className="mt-4 text-xs text-muted-foreground">Loading…</div>
      ) : view.scores.length === 0 ? (
        <p className="mt-4 text-[11px] text-muted-foreground">
          Run after the report is accepted. Top 3 ranked issues become client tasks (hidden until released).
        </p>
      ) : (
        <>
          <div className="mt-4">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">
              Ranked issues
            </div>
            <ol className="space-y-1.5">
              {view.scores.map((s) => (
                <li
                  key={s.id}
                  className="text-xs border border-border rounded-md p-2 bg-muted/20"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-foreground font-medium">#{s.rank}</span>
                    <Badge
                      variant="outline"
                      className={`${BAND_STYLES[s.priority_band] ?? ""} text-[10px] px-1.5 py-0`}
                    >
                      {s.priority_band}
                    </Badge>
                    <span className="ml-auto text-foreground tabular-nums">{s.priority_score}</span>
                  </div>
                  <div className="mt-1 text-foreground">{s.issue_title}</div>
                  <div className="mt-1 text-[10px] text-muted-foreground">
                    impact {s.impact} · vis {s.visibility} · ease {s.ease_of_fix} · dep {s.dependency}
                  </div>
                  {s.rationale ? (
                    <div className="mt-1 text-[10px] text-muted-foreground italic">
                      {s.rationale}
                    </div>
                  ) : null}
                  <ScoreContextDetail context={(s as any).score_context} />
                </li>
              ))}
            </ol>
          </div>

          <div className="mt-4">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">
              Top 3 client tasks
            </div>
            <div className="mb-2 flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-[10px] text-amber-200">
              <AlertTriangle className="h-3 w-3 shrink-0" />
              <span>
                Clients see plain-English tasks only. Internal priority scoring stays admin-only.
              </span>
            </div>
            {view.roadmap ? (
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  try {
                    const n = await releaseAllRoadmapTasks(view.roadmap!.id);
                    toast.success(n > 0 ? `Released ${n} task(s)` : "All tasks already released");
                    refresh();
                  } catch (e: any) {
                    toast.error(e?.message ?? "Could not release tasks");
                  }
                }}
                className="w-full mb-2 border-border"
              >
                <Send className="h-3.5 w-3.5" /> Release all top-3 to client
              </Button>
            ) : null}
            <ul className="space-y-1.5">
              {view.client_tasks.map((t) => (
                <li key={t.id} className="text-xs border border-border rounded-md p-2">
                  <div className="flex items-center gap-2">
                    <span className="text-foreground font-medium">#{t.rank}</span>
                    <Badge
                      variant="outline"
                      className={`${BAND_STYLES[t.priority_band] ?? ""} text-[10px] px-1.5 py-0`}
                    >
                      {t.priority_band}
                    </Badge>
                    <span className="ml-auto text-[10px] text-muted-foreground">
                      {t.client_visible && t.released_at ? "released" : "hidden"}
                    </span>
                  </div>
                  <div className="mt-1 text-foreground">{t.issue_title}</div>
                  <div className="mt-2 flex gap-1.5">
                    {t.client_visible && t.released_at ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          try {
                            await hideClientTask(t.id);
                            toast.success("Task hidden from client");
                            refresh();
                          } catch (e: any) {
                            toast.error(e?.message ?? "Could not hide task");
                          }
                        }}
                        className="h-7 px-2 text-[10px] border-border"
                      >
                        <EyeOff className="h-3 w-3" /> Hide
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={async () => {
                          try {
                            await releaseClientTask(t.id);
                            toast.success("Task released to client");
                            refresh();
                          } catch (e: any) {
                            toast.error(e?.message ?? "Could not release task");
                          }
                        }}
                        className="h-7 px-2 text-[10px]"
                      >
                        <Eye className="h-3 w-3" /> Release
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </section>
  );
}