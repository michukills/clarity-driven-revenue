// P17 — Admin review surface for client service-change requests.
// Admin can mark reviewed / completed / declined and add notes.
// Completing a deactivation flips the customer to lifecycle_state=inactive
// (past client). It NEVER deletes any customer data.

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PortalShell } from "@/components/portal/PortalShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Loader2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  Inbox,
  ExternalLink,
} from "lucide-react";
import {
  loadAllRequests,
  adminUpdateRequest,
  REQUEST_TYPE_LABEL,
  STATUS_LABEL,
  type AdminRequestRow,
  type ServiceRequestStatus,
} from "@/lib/serviceRequests";

const STATUS_FILTERS: Array<{ key: ServiceRequestStatus | "all"; label: string }> = [
  { key: "pending", label: "Pending" },
  { key: "reviewed", label: "Reviewed" },
  { key: "completed", label: "Completed" },
  { key: "declined", label: "Declined" },
  { key: "all", label: "All" },
];

const STATUS_BADGE: Record<ServiceRequestStatus, string> = {
  pending: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  reviewed: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  completed: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  declined: "bg-muted text-muted-foreground border-border",
};

export default function ServiceRequestsPage() {
  const [filter, setFilter] = useState<ServiceRequestStatus | "all">("pending");
  const [rows, setRows] = useState<AdminRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [working, setWorking] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      setRows(await loadAllRequests({ status: filter }));
    } catch (e: any) {
      toast.error(e?.message ?? "Could not load requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const act = async (id: string, status: ServiceRequestStatus) => {
    setWorking(id);
    try {
      await adminUpdateRequest({ id, status, adminNotes: notes[id] ?? null });
      toast.success(
        status === "completed"
          ? "Request completed (customer marked inactive — no data deleted)"
          : `Request ${status}`
      );
      refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not update request");
    } finally {
      setWorking(null);
    }
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of rows) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [rows]);

  return (
    <PortalShell variant="admin">
      <div className="mb-6">
        <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-1.5">
          <Inbox className="h-3.5 w-3.5" /> Service-change requests
        </div>
        <h1 className="mt-2 text-2xl text-foreground">Client deactivation & cancellations</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Review client-initiated requests. Completing a deactivation moves the customer to
          the <span className="text-foreground">Inactive</span> lane in the customers list —
          no customer data is ever deleted.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s.key}
            onClick={() => setFilter(s.key)}
            className={`text-xs px-3 py-1.5 rounded-md border ${
              filter === s.key
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {s.label}
            {counts[s.key] ? <span className="ml-1.5 text-[10px]">({counts[s.key]})</span> : null}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          No requests in this view.
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-start gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-foreground font-medium">
                      {REQUEST_TYPE_LABEL[r.request_type]}
                    </span>
                    <Badge
                      variant="outline"
                      className={`${STATUS_BADGE[r.status]} text-[10px] px-1.5 py-0`}
                    >
                      {STATUS_LABEL[r.status]}
                    </Badge>
                    {r.addon_key ? (
                      <span className="text-[10px] text-muted-foreground">
                        add-on: <span className="text-foreground">{r.addon_key}</span>
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {r.customer?.business_name || r.customer?.full_name || "Unknown customer"}
                    {" · "}
                    Submitted {new Date(r.created_at).toLocaleString()}
                    {r.reviewed_at ? (
                      <>
                        {" · reviewed "}
                        {new Date(r.reviewed_at).toLocaleString()}
                      </>
                    ) : null}
                  </div>
                  {r.reason ? (
                    <div className="mt-2 text-sm text-foreground whitespace-pre-wrap">
                      {r.reason}
                    </div>
                  ) : (
                    <div className="mt-2 text-xs text-muted-foreground italic">
                      No reason provided.
                    </div>
                  )}
                  {r.customer?.id ? (
                    <Link
                      to={`/admin/customers/${r.customer.id}`}
                      className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      Open customer record <ExternalLink className="h-3 w-3" />
                    </Link>
                  ) : null}
                </div>
              </div>

              {r.status === "pending" || r.status === "reviewed" ? (
                <>
                  <Textarea
                    rows={2}
                    placeholder="Admin notes (optional, internal)…"
                    value={notes[r.id] ?? r.admin_notes ?? ""}
                    onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
                  />
                  <div className="flex flex-wrap gap-2">
                    {r.status === "pending" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-border"
                        disabled={working === r.id}
                        onClick={() => act(r.id, "reviewed")}
                      >
                        <Eye className="h-3.5 w-3.5" /> Mark reviewed
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      disabled={working === r.id}
                      onClick={() => act(r.id, "completed")}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Complete
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-border"
                      disabled={working === r.id}
                      onClick={() => act(r.id, "declined")}
                    >
                      <XCircle className="h-3.5 w-3.5" /> Decline
                    </Button>
                  </div>
                  {r.request_type === "account_deactivation" ? (
                    <div className="flex items-start gap-1.5 text-[11px] text-amber-300">
                      <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                      Completing this request will move the customer to{" "}
                      <span className="text-foreground">Inactive</span>. All records, reports,
                      tasks, and history are preserved.
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="text-xs text-muted-foreground">
                  {r.admin_notes ? (
                    <>
                      <span className="text-foreground">Admin notes:</span> {r.admin_notes}
                    </>
                  ) : (
                    "No admin notes."
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </PortalShell>
  );
}
