import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { History, ArrowUpRight, RefreshCw, BookmarkPlus, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  DIAGNOSTIC_TOOL_KEYS,
  DIAGNOSTIC_TOOL_LABELS,
  listDiagnosticRuns,
  type DiagnosticToolKey,
  type DiagnosticToolRunRow,
} from "@/lib/diagnostics/diagnosticRuns";
import { readProvenance } from "@/lib/diagnostics/diagnosticInputs";
import { touchOrInsertMemory } from "@/lib/diagnostics/customerMemory";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  customerId: string;
}

const TOOL_ROUTE: Record<DiagnosticToolKey, string> = {
  rgs_stability_scorecard: "/admin/tools/stability-scorecard",
  revenue_leak_finder: "/admin/tools/revenue-leak-finder",
  buyer_persona_tool: "/admin/tools/persona-builder",
  customer_journey_mapper: "/admin/tools/journey-mapper",
  process_breakdown_tool: "/admin/tools/process-breakdown",
};

function bandFor(score: number | null): { label: string; tone: string } {
  if (score == null) return { label: "—", tone: "text-muted-foreground" };
  if (score >= 75) return { label: "Strong", tone: "text-emerald-500" };
  if (score >= 50) return { label: "Watch", tone: "text-foreground" };
  return { label: "Weak", tone: "text-destructive" };
}

function fmt(d: string) {
  return new Date(d).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function DiagnosticRunsHistoryPanel({ customerId }: Props) {
  const [rows, setRows] = useState<DiagnosticToolRunRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await listDiagnosticRuns(customerId);
      setRows(data);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load diagnostic history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (customerId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  const grouped = useMemo(() => {
    const m: Record<string, DiagnosticToolRunRow[]> = {};
    for (const k of DIAGNOSTIC_TOOL_KEYS) m[k] = [];
    for (const r of rows) {
      if (!m[r.tool_key]) m[r.tool_key] = [];
      m[r.tool_key].push(r);
    }
    return m;
  }, [rows]);

  const promoteToMemory = async (run: DiagnosticToolRunRow) => {
    setBusyKey(run.id);
    try {
      const { data: u } = await supabase.auth.getUser();
      const cur = run.result_score;
      const memoryType =
        cur != null && cur >= 75 ? "client_strength" :
        cur != null && cur <= 50 ? "client_risk" :
        "recurring_pattern";
      await touchOrInsertMemory(
        {
          customer_id: customerId,
          memory_type: memoryType,
          title: `${run.tool_label ?? run.tool_key} — v${run.version_number}`,
          summary: run.result_summary ?? run.comparison_summary ?? null,
          confidence: cur != null && (cur >= 75 || cur <= 50) ? "high" : "medium",
          source_type: "diagnostic_tool_run",
          source_id: run.id,
        },
        u.user?.id ?? null,
      );
      toast.success("Promoted to customer insight memory");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not promote to memory");
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
            <History className="h-3.5 w-3.5" /> Diagnostic Sub-Tools · Versioned History
          </div>
          <h3 className="mt-1 text-lg text-foreground">Reusable, signal-emitting diagnostic runs</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Each rerun preserves the prior version. Material findings (sustained weakness, durable
            strength, resolved issues, large jumps) emit signals into the insight bus so the OS
            learns from the diagnostic over time.
          </p>
        </div>
        <Button onClick={load} variant="outline" size="sm" className="border-border">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading diagnostic runs…</div>
      ) : (
        <div className="space-y-4">
          {DIAGNOSTIC_TOOL_KEYS.map((tk) => {
            const list = grouped[tk] ?? [];
            const latest = list[0];
            const prior = list[1];
            const band = bandFor(latest?.result_score ?? null);
            return (
              <div key={tk} className="rounded-lg border border-border/70 bg-background/60 p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="text-sm text-foreground font-medium">
                      {DIAGNOSTIC_TOOL_LABELS[tk]}
                    </div>
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground mt-0.5">
                      {list.length === 0
                        ? "No runs recorded yet"
                        : `${list.length} run${list.length === 1 ? "" : "s"} · latest v${latest.version_number}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      to={TOOL_ROUTE[tk] + (latest ? `?run=${latest.id}` : "")}
                      className="inline-flex items-center gap-1.5 px-3 h-8 rounded-md border border-border text-xs text-foreground hover:border-primary/40"
                    >
                      <ExternalLink className="h-3 w-3" /> Open tool
                    </Link>
                    <Link
                      to={TOOL_ROUTE[tk]}
                      className="inline-flex items-center gap-1.5 px-3 h-8 rounded-md border border-primary/40 bg-primary/10 text-xs text-foreground hover:bg-primary/20"
                    >
                      <ArrowUpRight className="h-3 w-3" /> Run again
                    </Link>
                  </div>
                </div>

                {latest && (
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="rounded-md border border-border/60 bg-card/70 p-3">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Latest</div>
                      <div className={`text-2xl mt-1 ${band.tone}`}>
                        {latest.result_score != null ? `${latest.result_score}` : "—"}
                        <span className="text-xs text-muted-foreground ml-1">/100</span>
                      </div>
                      <div className={`text-[11px] ${band.tone}`}>{band.label}</div>
                      <div className="text-[11px] text-muted-foreground mt-1">{fmt(latest.run_date)}</div>
                    </div>
                    <div className="rounded-md border border-border/60 bg-card/70 p-3 md:col-span-2">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Result summary</div>
                      <div className="text-sm text-foreground mt-1">
                        {latest.result_summary ?? "No summary captured."}
                      </div>
                      {latest.comparison_summary && (
                        <div className="text-[11px] text-muted-foreground mt-2">
                          <span className="text-foreground/80">Δ vs prior:</span> {latest.comparison_summary}
                        </div>
                      )}
                      {(() => {
                        const prov = readProvenance(latest.result_payload);
                        if (!prov || prov.total === 0) return null;
                        const tone =
                          prov.imported_verified / prov.total >= 0.5
                            ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-600"
                            : prov.excludedPending
                            ? "border-amber-500/30 bg-amber-500/5 text-amber-600"
                            : "border-border bg-muted/30 text-muted-foreground";
                        return (
                          <div className={`mt-2 inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-[11px] ${tone}`}>
                            Inputs · {prov.badge}
                            {latest.confidence ? ` · ${latest.confidence} confidence` : null}
                          </div>
                        );
                      })()}
                      <div className="mt-3 flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-border h-8"
                          disabled={busyKey === latest.id}
                          onClick={() => promoteToMemory(latest)}
                        >
                          <BookmarkPlus className="h-3.5 w-3.5" /> Promote to memory
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {list.length > 1 && (
                  <div className="mt-3">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                      Prior runs
                    </div>
                    <ul className="divide-y divide-border/60 rounded-md border border-border/60 bg-card/40">
                      {list.slice(1, 6).map((r) => {
                        const b = bandFor(r.result_score);
                        return (
                          <li key={r.id} className="px-3 py-2 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-xs text-foreground truncate">
                                v{r.version_number} · {r.result_summary ?? "No summary"}
                              </div>
                              <div className="text-[11px] text-muted-foreground">
                                {fmt(r.run_date)} · {r.status}
                              </div>
                            </div>
                            <div className={`text-xs ${b.tone}`}>
                              {r.result_score != null ? `${r.result_score}` : "—"}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                    {prior && latest && (
                      <div className="text-[11px] text-muted-foreground mt-2">
                        Comparing v{latest.version_number} vs v{prior.version_number}:&nbsp;
                        <span className="text-foreground/90">{latest.comparison_summary ?? "—"}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default DiagnosticRunsHistoryPanel;
