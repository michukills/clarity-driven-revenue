// P31 — Compact admin alert: client-marked task completions awaiting outcome
// review. Reads from recommendation_outcomes (admin-only RLS) and links to
// the dedicated /admin/outcomes review queue.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ClipboardCheck, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import {
  loadOutcomeReviewQueue,
  type AdminOutcomeQueueRow,
} from "@/lib/clientTaskOutcomes";

function customerLabel(c: AdminOutcomeQueueRow["customer"]): string {
  if (!c) return "Unknown customer";
  return c.business_name?.trim() || c.full_name?.trim() || "Unknown customer";
}

export function AdminOutcomeReviewAlert() {
  const [rows, setRows] = useState<AdminOutcomeQueueRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await loadOutcomeReviewQueue({ status: "pending_review", limit: 6 });
        if (!cancelled) setRows(data);
      } catch {
        // RLS or transient — silent. Non-admins will see nothing here.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground flex items-center gap-2">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking pending outcome reviews…
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card/60 p-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-300/80" />
          <div className="text-sm text-foreground/80">No client outcomes waiting for review.</div>
          <Link
            to="/admin/outcomes"
            className="ml-auto text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          >
            View outcome history <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/10 p-4">
      <div className="flex items-start gap-3">
        <ClipboardCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-foreground">
              Client outcome{rows.length > 1 ? "s" : ""} awaiting review
            </span>
            <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/20 text-primary border border-primary/30">
              {rows.length} pending
            </span>
          </div>
          <ul className="mt-2 space-y-1">
            {rows.slice(0, 4).map((r) => {
              const ts = r.completed_at ?? r.created_at;
              return (
                <li key={r.id} className="text-xs text-foreground/85 flex items-center gap-2">
                  <ClipboardCheck className="h-3 w-3 shrink-0 text-primary/80" />
                  <Link
                    to={`/admin/customers/${r.customer_id}#outcome-review`}
                    className="truncate hover:text-foreground hover:underline underline-offset-2"
                  >
                    {customerLabel(r.customer)}
                  </Link>
                  {r.task?.issue_title ? (
                    <span className="text-muted-foreground truncate">· {r.task.issue_title}</span>
                  ) : null}
                  <span className="ml-auto text-muted-foreground text-[10px] tabular-nums">
                    {ts ? new Date(ts).toLocaleDateString() : "—"}
                  </span>
                </li>
              );
            })}
            {rows.length > 4 ? (
              <li className="text-[11px] text-muted-foreground">+ {rows.length - 4} more</li>
            ) : null}
          </ul>
          <Link
            to="/admin/outcomes"
            className="mt-3 inline-flex items-center gap-1 text-xs text-foreground hover:text-primary"
          >
            Review outcomes <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}