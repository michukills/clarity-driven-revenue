// P16.2 — Client-facing Priority Tasks view.
// Shows only released, client_visible tasks for the signed-in client's customer.
// Internal scoring (impact / visibility / ease_of_fix / dependency / score / rationale)
// is intentionally never queried or displayed here.

import { useEffect, useState } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { supabase } from "@/integrations/supabase/client";
import { usePortalCustomerId } from "@/hooks/usePortalCustomerId";
import { Badge } from "@/components/ui/badge";
import { Loader2, ListChecks, Sparkles, ArrowRight, Target } from "lucide-react";

type Band = "critical" | "high" | "medium" | "low";

interface ClientTaskRow {
  id: string;
  rank: number;
  issue_title: string;
  why_it_matters: string | null;
  evidence_summary: string | null;
  priority_band: Band;
  expected_outcome: string | null;
  next_step: string | null;
  status: string;
  released_at: string | null;
  suggestions: Array<{
    id: string;
    label: string;
    detail: string | null;
    display_order: number;
  }>;
}

const BAND_LABEL: Record<Band, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

const BAND_STYLES: Record<Band, string> = {
  critical: "bg-red-500/15 text-red-300 border-red-500/30",
  high: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  medium: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  low: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
};

const STATUS_LABEL: Record<string, string> = {
  open: "Open",
  in_progress: "In progress",
  blocked: "Blocked",
  done: "Done",
  dismissed: "Dismissed",
};

export default function PriorityTasksPage() {
  const { customerId, loading: idLoading } = usePortalCustomerId();
  const [tasks, setTasks] = useState<ClientTaskRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (idLoading) return;
      if (!customerId) {
        setTasks([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      // RLS already restricts this to the client's own released, visible tasks.
      const { data: taskRows } = await supabase
        .from("client_tasks")
        .select(
          "id, rank, issue_title, why_it_matters, evidence_summary, priority_band, expected_outcome, next_step, status, released_at"
        )
        .eq("customer_id", customerId)
        .order("rank", { ascending: true });

      const ids = (taskRows ?? []).map((t) => t.id);
      let suggestionsByTask = new Map<string, ClientTaskRow["suggestions"]>();
      if (ids.length > 0) {
        const { data: sugRows } = await supabase
          .from("client_task_suggestions")
          .select("id, client_task_id, label, detail, display_order")
          .in("client_task_id", ids)
          .order("display_order", { ascending: true });
        for (const row of sugRows ?? []) {
          const list = suggestionsByTask.get(row.client_task_id) ?? [];
          list.push({
            id: row.id,
            label: row.label,
            detail: row.detail,
            display_order: row.display_order,
          });
          suggestionsByTask.set(row.client_task_id, list);
        }
      }

      if (cancelled) return;
      setTasks(
        (taskRows ?? []).map((t) => ({
          ...(t as any),
          suggestions: suggestionsByTask.get(t.id) ?? [],
        }))
      );
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [customerId, idLoading]);

  return (
    <PortalShell variant="customer">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <header className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider">
            <ListChecks className="h-3.5 w-3.5" /> Your Priority Tasks
          </div>
          <h1 className="text-2xl font-semibold text-foreground">
            What to focus on next
          </h1>
          <p className="text-sm text-muted-foreground">
            These are the highest-priority actions from your latest accepted report. Work through them in order.
          </p>
        </header>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading your tasks…
          </div>
        ) : tasks.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-6 text-center">
            <Sparkles className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
            <h2 className="text-base font-medium text-foreground">No priority tasks yet</h2>
            <p className="text-sm text-muted-foreground mt-1">
              When your next report is reviewed and released, your top focus areas will appear here.
            </p>
          </div>
        ) : (
          <ol className="space-y-4">
            {tasks.map((t) => (
              <li
                key={t.id}
                className="rounded-xl border border-border bg-card p-5 space-y-3"
              >
                <div className="flex items-start gap-3">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground pt-0.5">
                    #{t.rank}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base font-semibold text-foreground">
                        {t.issue_title}
                      </h2>
                      <Badge
                        variant="outline"
                        className={`${BAND_STYLES[t.priority_band]} text-[10px] px-1.5 py-0`}
                      >
                        {BAND_LABEL[t.priority_band]} priority
                      </Badge>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-border text-muted-foreground">
                        {STATUS_LABEL[t.status] ?? t.status}
                      </Badge>
                    </div>
                  </div>
                </div>

                {t.why_it_matters ? (
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
                      Why it matters
                    </div>
                    <p className="text-sm text-foreground">{t.why_it_matters}</p>
                  </div>
                ) : null}

                {t.evidence_summary ? (
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
                      What we saw
                    </div>
                    <p className="text-sm text-foreground">{t.evidence_summary}</p>
                  </div>
                ) : null}

                {t.suggestions.length > 0 ? (
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
                      Suggested actions
                    </div>
                    <ul className="space-y-1.5">
                      {t.suggestions.map((s) => (
                        <li key={s.id} className="text-sm text-foreground flex items-start gap-2">
                          <ArrowRight className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                          <div>
                            <div>{s.label}</div>
                            {s.detail ? (
                              <div className="text-xs text-muted-foreground mt-0.5">{s.detail}</div>
                            ) : null}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {t.expected_outcome ? (
                  <div className="rounded-md border border-border bg-muted/20 p-3">
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
                      <Target className="h-3 w-3" /> Expected outcome
                    </div>
                    <p className="text-sm text-foreground">{t.expected_outcome}</p>
                  </div>
                ) : null}

                {t.next_step ? (
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
                      Your next step
                    </div>
                    <p className="text-sm text-foreground">{t.next_step}</p>
                  </div>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </div>
    </PortalShell>
  );
}