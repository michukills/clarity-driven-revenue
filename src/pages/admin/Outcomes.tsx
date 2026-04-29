// P31 — Admin outcome review queue.
//
// Cross-customer view of recommendation_outcomes by status. The full review
// workflow (validate / reject / mark needs-follow-up, learning event seeding)
// lives in the existing OutcomeReviewPanel on each customer detail page; this
// page is intentionally lightweight and routes admins there to act.
//
// Security: route is ProtectedRoute requireRole="admin"; recommendation_outcomes
// RLS is admin-only ("Admin manage outcomes"). Internal scoring fields
// (priority_score, score_context, scoring formula) are not selected.

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, ClipboardCheck, ArrowRight, RefreshCw } from "lucide-react";
import { PortalShell } from "@/components/portal/PortalShell";
import {
  loadOutcomeReviewQueue,
  OUTCOME_STATUS_LABEL,
  type AdminOutcomeQueueRow,
  type OutcomeStatus,
} from "@/lib/clientTaskOutcomes";

type Filter = OutcomeStatus | "all";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "pending_review", label: "Pending review" },
  { id: "needs_follow_up", label: "Needs follow-up" },
  { id: "outcome_validated", label: "Validated" },
  { id: "outcome_rejected", label: "Rejected" },
  { id: "all", label: "All" },
];

const STATUS_BADGE: Record<OutcomeStatus, string> = {
  pending_review: "bg-primary/15 text-primary border-primary/30",
  outcome_validated: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  outcome_rejected: "bg-red-500/15 text-red-300 border-red-500/30",
  needs_follow_up: "bg-amber-500/15 text-amber-300 border-amber-500/30",
};

function customerLabel(c: AdminOutcomeQueueRow["customer"]): string {
  if (!c) return "Unknown customer";
  return c.business_name?.trim() || c.full_name?.trim() || "Unknown customer";
}

export default function AdminOutcomes() {
  const [filter, setFilter] = useState<Filter>("pending_review");
  const [rows, setRows] = useState<AdminOutcomeQueueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const data = await loadOutcomeReviewQueue({ status: filter, limit: 200 });
        if (!cancelled) setRows(data);
      } catch {
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filter, reloadKey]);

  const counts = useMemo(() => {
    const out: Record<Filter, number | null> = {
      pending_review: null,
      needs_follow_up: null,
      outcome_validated: null,
      outcome_rejected: null,
      all: null,
    };
    if (filter === "all") out.all = rows.length;
    else (out as Record<Filter, number | null>)[filter] = rows.length;
    return out;
  }, [rows, filter]);

  return (
    <PortalShell variant="admin">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">RGS OS</div>
          <h1 className="mt-2 text-3xl text-foreground font-light tracking-tight flex items-center gap-3">
            <ClipboardCheck className="h-6 w-6 text-primary" /> Outcome Review Queue
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl leading-relaxed">
            Client-marked task completions waiting for RGS review. Validating an outcome can seed
            same-industry and (when generalizable) cross-industry learning patterns.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setReloadKey((k) => k + 1)}
          className="inline-flex items-center gap-1.5 px-3 h-9 rounded-md border border-border bg-card text-xs text-foreground hover:bg-muted/40"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => {
          const active = filter === f.id;
          const count = counts[f.id];
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={
                "inline-flex items-center gap-1.5 px-3 h-8 rounded-full border text-xs transition-colors " +
                (active
                  ? "border-primary/60 bg-primary/15 text-primary"
                  : "border-border bg-card text-foreground/80 hover:text-foreground hover:border-foreground/30")
              }
            >
              {f.label}
              {active && count !== null ? (
                <span className="text-[10px] tabular-nums opacity-70">· {count}</span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="p-8 flex items-center justify-center text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> Loading outcomes…
          </div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            No outcomes in this view.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left font-medium px-4 py-2">Customer</th>
                <th className="text-left font-medium px-4 py-2">Task</th>
                <th className="text-left font-medium px-4 py-2">Client note</th>
                <th className="text-left font-medium px-4 py-2">Status</th>
                <th className="text-left font-medium px-4 py-2">Completed</th>
                <th className="text-left font-medium px-4 py-2">Reviewed</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => {
                const status = r.outcome_status as OutcomeStatus;
                return (
                  <tr key={r.id} className="hover:bg-muted/20">
                    <td className="px-4 py-2.5 align-top">
                      <Link
                        to={`/admin/customers/${r.customer_id}`}
                        className="text-foreground hover:text-primary hover:underline underline-offset-2"
                      >
                        {customerLabel(r.customer)}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 align-top text-foreground/85 max-w-[20rem]">
                      <div className="truncate">{r.task?.issue_title ?? "—"}</div>
                    </td>
                    <td className="px-4 py-2.5 align-top text-muted-foreground max-w-[24rem]">
                      <div className="line-clamp-2 whitespace-pre-wrap">
                        {r.client_completion_note?.trim() || "—"}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 align-top">
                      <span
                        className={
                          "inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] " +
                          STATUS_BADGE[status]
                        }
                      >
                        {OUTCOME_STATUS_LABEL[status]}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 align-top text-xs text-muted-foreground tabular-nums">
                      {r.completed_at ? new Date(r.completed_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-2.5 align-top text-xs text-muted-foreground tabular-nums">
                      {r.reviewed_at ? new Date(r.reviewed_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-2.5 align-top text-right">
                      <Link
                        to={`/admin/customers/${r.customer_id}`}
                        className="inline-flex items-center gap-1 text-xs text-primary hover:text-foreground"
                      >
                        Review <ArrowRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <p className="mt-4 text-[11px] text-muted-foreground">
        The full validate / reject / follow-up workflow lives on the customer detail page. Outcomes
        and reviewer notes are admin-only — clients never see this queue.
      </p>
    </PortalShell>
  );
}