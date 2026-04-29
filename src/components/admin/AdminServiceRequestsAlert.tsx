// P17 — Compact admin alert for pending client service-change requests
// (account deactivations + add-on cancellations). Links to the full
// review surface at /admin/service-requests.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Inbox, AlertCircle, ArrowRight, Loader2 } from "lucide-react";
import { loadAllRequests, REQUEST_TYPE_LABEL, type AdminRequestRow } from "@/lib/serviceRequests";

export function AdminServiceRequestsAlert() {
  const [rows, setRows] = useState<AdminRequestRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await loadAllRequests({ status: "pending" });
        if (!cancelled) setRows(data);
      } catch {
        // RLS or transient — silent.
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
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking client service requests…
      </div>
    );
  }

  if (rows.length === 0) return null;

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-amber-300 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-amber-100">
              Client service-change request{rows.length > 1 ? "s" : ""} need{rows.length > 1 ? "" : "s"} review
            </span>
            <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-200 border border-amber-500/30">
              {rows.length} pending
            </span>
          </div>
          <ul className="mt-2 space-y-1">
            {rows.slice(0, 4).map((r) => (
              <li key={r.id} className="text-xs text-amber-100/90 flex items-center gap-2">
                <Inbox className="h-3 w-3 shrink-0" />
                <span className="truncate">
                  {r.customer?.business_name || r.customer?.full_name || "Unknown customer"}
                </span>
                <span className="text-amber-200/70">· {REQUEST_TYPE_LABEL[r.request_type]}</span>
                <span className="ml-auto text-amber-200/60 text-[10px]">
                  {new Date(r.created_at).toLocaleDateString()}
                </span>
              </li>
            ))}
            {rows.length > 4 ? (
              <li className="text-[11px] text-amber-200/70">+ {rows.length - 4} more</li>
            ) : null}
          </ul>
          <Link
            to="/admin/service-requests"
            className="mt-3 inline-flex items-center gap-1 text-xs text-amber-100 hover:text-foreground"
          >
            Review requests <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
