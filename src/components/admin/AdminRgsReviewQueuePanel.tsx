// P7.3 — Compact admin dashboard panel summarizing the RGS Review Queue.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, Inbox, ShieldAlert } from "lucide-react";
import {
  loadReviewQueue,
  summarizeCheckinContext,
  type RgsReviewQueueRow,
} from "@/lib/admin/rgsReviewQueue";

function fmt(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function AdminRgsReviewQueuePanel() {
  const [rows, setRows] = useState<RgsReviewQueueRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await loadReviewQueue().catch(() => []);
      if (!cancelled) {
        setRows(data);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const active = rows.filter((r) =>
    ["open", "reviewing", "follow_up_needed"].includes(r.status),
  );
  // Urgent + open first, capped at 5.
  const top = active
    .slice()
    .sort((a, b) => {
      const pa = a.priority === "urgent" ? 0 : 1;
      const pb = b.priority === "urgent" ? 0 : 1;
      if (pa !== pb) return pa - pb;
      const sa = a.status === "open" ? 0 : 1;
      const sb = b.status === "open" ? 0 : 1;
      if (sa !== sb) return sa - sb;
      return b.requested_at.localeCompare(a.requested_at);
    })
    .slice(0, 5);

  const open = rows.filter((r) => r.status === "open").length;
  const reviewing = rows.filter((r) => r.status === "reviewing").length;
  const followUp = rows.filter((r) => r.status === "follow_up_needed").length;

  return (
    <div className="rounded-2xl border border-border bg-card/40 p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <div className="flex items-center gap-2">
          <Inbox className="h-4 w-4 text-primary/70" />
          <h3 className="text-sm font-medium text-foreground">RGS Review Queue</h3>
          <span className="text-[11px] text-muted-foreground">
            {open} open · {reviewing} reviewing · {followUp} follow-up
          </span>
        </div>
        <Link
          to="/admin/rgs-review-queue"
          className="inline-flex items-center gap-1 text-xs text-primary hover:text-secondary"
        >
          Open queue <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {loading ? (
        <div className="text-xs text-muted-foreground">Loading…</div>
      ) : top.length === 0 ? (
        <WorkflowEmptyState
          title="Nothing is waiting for RGS review right now."
          body="This queue surfaces diagnostic, evidence, report, implementation, and Control System review requests across all customers. When clients submit work or admins flag findings for review, items appear here with a customer link and priority. Open Customers to start or resume work that may generate review items."
          primary={{ label: "Open Customers", to: "/admin/customers", testId: "rgs-review-empty-customers" }}
          testId="rgs-review-empty"
        />
      ) : (
        <ul className="space-y-1.5">
          {top.map((r) => {
            const name = r.customer?.business_name || r.customer?.full_name || "Unknown client";
            return (
              <li
                key={r.id}
                className="flex items-start gap-3 rounded-lg border border-border bg-muted/10 p-2.5"
              >
                {r.priority === "urgent" ? (
                  <ShieldAlert className="h-3.5 w-3.5 text-destructive mt-0.5 shrink-0" />
                ) : (
                  <Inbox className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-xs text-foreground font-medium truncate">
                      {name}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {r.status.replace(/_/g, " ")} · {fmt(r.requested_at)}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                    {summarizeCheckinContext(r.checkin)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}