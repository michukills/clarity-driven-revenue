// p.fix.internal-admin-account-workflow-separation-and-owner-task-priority
//
// Internal-only owner/admin task priority surface for the RGS owner.
// Renders ranked tasks built by `buildOwnerTasks(...)` and is meant to be
// mounted inside the admin dashboard / RGS Business Control Center area.
//
// This is NOT the client task system. It does not write to client_tasks,
// it does not surface to clients, and it never includes the internal RGS
// account itself as a "client to fix".

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, ClipboardList, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  buildOwnerTasks,
  PRIORITY_LABEL,
  PRIORITY_TONE,
  type OwnerTask,
  type OwnerTaskCustomerLike,
  type OwnerTaskReviewRequest,
  type OwnerTaskUnlinkedSignup,
} from "@/lib/internal/ownerTasks";

type LoadResult = {
  tasks: OwnerTask[];
};

async function loadOwnerTasks(): Promise<LoadResult> {
  const [{ data: cust }, signupsRes, reviewsRes, snapsRes] = await Promise.all([
    supabase
      .from("customers")
      .select(
        "id, full_name, business_name, email, account_kind, status, is_demo_account, archived_at, industry, industry_confirmed_by_admin, needs_industry_review",
      )
      .is("archived_at", null)
      .limit(500),
    (supabase as any).rpc("list_unlinked_signups").then(
      (res: any) => ({ data: (res?.data ?? []) as any[], error: null }),
      () => ({ data: [] as any[], error: null }),
    ),
    supabase
      .from("rgs_review_requests")
      .select("id, customer_id, status, priority, requested_at")
      .in("status", ["open", "follow_up_needed"])
      .order("requested_at", { ascending: false })
      .limit(100)
      .then(
        (r) => ({ data: (r.data ?? []) as any[] }),
        () => ({ data: [] as any[] }),
      ),
    supabase
      .from("client_business_snapshots")
      .select("customer_id, snapshot_status, industry_verified")
      .limit(500)
      .then(
        (r) => ({ data: (r.data ?? []) as any[] }),
        () => ({ data: [] as any[] }),
      ),
  ]);

  const verified = new Set(
    (snapsRes.data ?? [])
      .filter((s: any) => s.snapshot_status === "admin_verified" && s.industry_verified)
      .map((s: any) => s.customer_id),
  );

  const customers: OwnerTaskCustomerLike[] = ((cust as any[]) ?? []).map((c) => ({
    ...c,
    snapshot_verified: verified.has(c.id),
  }));

  const unlinkedSignups: OwnerTaskUnlinkedSignup[] = (signupsRes.data || []).map((s: any) => ({
    user_id: s.user_id,
    email: s.email,
    full_name: s.full_name,
    created_at: s.created_at,
  }));

  const reviewRequests: OwnerTaskReviewRequest[] = (reviewsRes.data || []).map((r: any) => ({
    id: r.id,
    customer_id: r.customer_id,
    status: r.status,
    priority: r.priority,
    requested_at: r.requested_at,
  }));

  return {
    tasks: buildOwnerTasks({ customers, unlinkedSignups, reviewRequests }),
  };
}

export function InternalOwnerTaskPanel({ limit = 6 }: { limit?: number }) {
  const [tasks, setTasks] = useState<OwnerTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await loadOwnerTasks();
        if (!cancelled) setTasks(res.tasks);
      } catch {
        // RLS / non-admin — surface nothing rather than throw.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const visible = useMemo(() => tasks.slice(0, limit), [tasks, limit]);

  if (loading) {
    return (
      <div
        data-testid="internal-owner-task-panel"
        className="rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground flex items-center gap-2"
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Building owner task priorities…
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div
        data-testid="internal-owner-task-panel"
        className="rounded-xl border border-border bg-card/60 p-4"
      >
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-300/80" />
          <div className="text-sm text-foreground/80">No internal owner actions outstanding.</div>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          The RGS owner task surface only ranks real internal admin actions. It is separate from the client task system.
        </p>
      </div>
    );
  }

  return (
    <div
      data-testid="internal-owner-task-panel"
      className="rounded-xl border border-primary/30 bg-primary/5 p-4"
    >
      <div className="flex items-start gap-3">
        <ClipboardList className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-foreground">RGS Owner — Priority Tasks</span>
            <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/15 text-primary border border-primary/30">
              {tasks.length}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Internal owner/admin actions only. Ranked by priority. The internal RGS account itself is never listed here as a client.
          </p>
          <ul className="mt-3 space-y-2">
            {visible.map((t) => (
              <li
                key={t.id}
                data-testid="owner-task-row"
                className="rounded-md border border-border bg-card/60 px-3 py-2 flex items-start gap-3"
              >
                <span
                  className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border shrink-0 ${PRIORITY_TONE[t.priority]}`}
                >
                  {PRIORITY_LABEL[t.priority]}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-foreground">{t.title}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{t.detail}</div>
                </div>
                <Link
                  to={t.href}
                  className="inline-flex items-center gap-1 text-[11px] text-foreground hover:text-primary shrink-0"
                >
                  {t.actionLabel}
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </li>
            ))}
          </ul>
          {tasks.length > visible.length && (
            <div className="mt-2 text-[11px] text-muted-foreground">
              {tasks.length - visible.length} more task{tasks.length - visible.length === 1 ? "" : "s"} ranked below the top {limit}.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default InternalOwnerTaskPanel;