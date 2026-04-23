// P7.3 — RGS Review Queue page
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PortalShell } from "@/components/portal/PortalShell";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  CheckCircle2,
  CircleDot,
  Clock,
  ExternalLink,
  Flag,
  Inbox,
  ShieldAlert,
  PauseCircle,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  ACTIVE_STATUSES,
  loadReviewQueue,
  STATUS_LABEL,
  statusOrder,
  summarizeCheckinContext,
  updateReviewStatus,
  type RgsReviewQueueRow,
  type RgsReviewStatus,
} from "@/lib/admin/rgsReviewQueue";

type Filter = RgsReviewStatus | "all" | "active";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "active", label: "Active" },
  { key: "open", label: "Open" },
  { key: "reviewing", label: "Reviewing" },
  { key: "follow_up_needed", label: "Follow-up Needed" },
  { key: "resolved", label: "Resolved" },
  { key: "dismissed", label: "Dismissed" },
  { key: "all", label: "All" },
];

function fmt(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function statusTone(s: RgsReviewStatus): string {
  switch (s) {
    case "open":
      return "border-[hsl(38_90%_55%/0.45)] bg-[hsl(38_90%_55%/0.08)] text-amber-300";
    case "reviewing":
      return "border-[hsl(210_80%_55%/0.45)] bg-[hsl(210_80%_55%/0.08)] text-sky-300";
    case "follow_up_needed":
      return "border-[hsl(0_70%_55%/0.45)] bg-[hsl(0_70%_55%/0.08)] text-rose-300";
    case "resolved":
      return "border-[hsl(140_50%_55%/0.4)] bg-[hsl(140_50%_55%/0.06)] text-emerald-300";
    case "dismissed":
      return "border-border bg-muted/20 text-muted-foreground";
  }
}

export default function RgsReviewQueuePage() {
  const [rows, setRows] = useState<RgsReviewQueueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("active");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const data = await loadReviewQueue();
    setRows(data);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    if (filter === "all") return rows;
    if (filter === "active")
      return rows.filter((r) => ACTIVE_STATUSES.includes(r.status));
    return rows.filter((r) => r.status === filter);
  }, [rows, filter]);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = {
      all: rows.length,
      active: 0,
      open: 0,
      reviewing: 0,
      follow_up_needed: 0,
      resolved: 0,
      dismissed: 0,
    };
    for (const r of rows) {
      c[r.status]++;
      if (ACTIVE_STATUSES.includes(r.status)) c.active++;
    }
    return c;
  }, [rows]);

  const act = async (
    row: RgsReviewQueueRow,
    next: Exclude<RgsReviewStatus, "open">,
    promptLabel?: string,
  ) => {
    let note: string | null = null;
    if (promptLabel) {
      const v = window.prompt(promptLabel, "");
      if (v === null) return;
      note = v.trim() || null;
    }
    setBusyId(row.id);
    const res = await updateReviewStatus({
      requestId: row.id,
      customerId: row.customer_id,
      nextStatus: next,
      note,
    });
    setBusyId(null);
    if (!res.ok) {
      toast.error(res.error || "Could not update.");
      return;
    }
    toast.success(`Marked ${STATUS_LABEL[next].toLowerCase()}.`);
    void load();
  };

  return (
    <PortalShell variant="admin">
      <Link
        to="/admin"
        className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Admin Command Center
      </Link>

      <div className="mb-8">
        <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Revenue Control Center™
        </div>
        <h1 className="text-2xl font-light text-foreground mt-1 flex items-center gap-2">
          <Inbox className="h-5 w-5 text-primary/70" /> RGS Review Queue
        </h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
          Client-requested reviews from weekly check-ins. Triage, mark progress,
          and log resolution. Timeline events are visible to the client.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-full border text-xs transition-colors ${
                active
                  ? "border-primary/60 bg-primary/10 text-foreground"
                  : "border-border bg-card/30 text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
              <span className="ml-2 tabular-nums text-[10px] opacity-70">
                {counts[f.key]}
              </span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading queue…</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card/30 p-10 text-center">
          <CheckCircle2 className="h-5 w-5 text-[hsl(140_50%_65%)] mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            No requests in this view.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((r) => {
            const name = r.customer?.business_name || r.customer?.full_name || "Unknown client";
            const ctx = summarizeCheckinContext(r.checkin);
            const isUrgent = r.priority === "urgent";
            const busy = busyId === r.id;
            return (
              <li
                key={r.id}
                className="rounded-2xl border border-border bg-card/40 p-4"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-foreground truncate">
                        {name}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] uppercase tracking-wider ${statusTone(r.status)}`}
                      >
                        <CircleDot className="h-3 w-3" />
                        {STATUS_LABEL[r.status]}
                      </span>
                      {isUrgent && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-destructive/50 bg-destructive/10 text-destructive text-[10px] uppercase tracking-wider">
                          <ShieldAlert className="h-3 w-3" /> Urgent
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5 text-[11px] text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                      <span>
                        <Clock className="inline h-3 w-3 mr-1" />
                        Requested {fmt(r.requested_at)}
                      </span>
                      {r.checkin && (
                        <span>
                          <Flag className="inline h-3 w-3 mr-1" />
                          Week ending {fmt(r.checkin.week_end)}
                        </span>
                      )}
                      {r.reviewed_at && (
                        <span>
                          <CheckCircle2 className="inline h-3 w-3 mr-1" />
                          Started {fmt(r.reviewed_at)}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-xs text-foreground/90">{ctx}</p>
                    {r.resolution_note && (
                      <p className="mt-1.5 text-[11px] text-muted-foreground italic">
                        Note: {r.resolution_note}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {r.status !== "reviewing" && r.status !== "resolved" && r.status !== "dismissed" && (
                    <ActionBtn
                      disabled={busy}
                      onClick={() => act(r, "reviewing")}
                      icon={CircleDot}
                      label="Start review"
                    />
                  )}
                  {r.status !== "follow_up_needed" && r.status !== "resolved" && r.status !== "dismissed" && (
                    <ActionBtn
                      disabled={busy}
                      onClick={() => act(r, "follow_up_needed", "Optional follow-up note (visible to admins only):")}
                      icon={Flag}
                      label="Mark follow-up"
                    />
                  )}
                  {r.status !== "resolved" && (
                    <ActionBtn
                      disabled={busy}
                      onClick={() => act(r, "resolved", "Resolution note (visible to admins only):")}
                      icon={CheckCircle2}
                      label="Mark resolved"
                      tone="success"
                    />
                  )}
                  {r.status !== "dismissed" && r.status !== "resolved" && (
                    <ActionBtn
                      disabled={busy}
                      onClick={() => act(r, "dismissed", "Optional dismissal note (visible to admins only):")}
                      icon={XCircle}
                      label="Dismiss"
                      tone="muted"
                    />
                  )}
                  <Link
                    to={`/admin/clients/${r.customer_id}/business-control`}
                    className="ml-auto inline-flex items-center gap-1 text-xs text-primary hover:text-secondary"
                  >
                    Open RCC <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </PortalShell>
  );
}

function ActionBtn({
  icon: Icon,
  label,
  onClick,
  disabled,
  tone,
}: {
  icon: any;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: "success" | "muted";
}) {
  const cls =
    tone === "success"
      ? "border-[hsl(140_50%_55%/0.45)] text-emerald-300 hover:bg-[hsl(140_50%_55%/0.08)]"
      : tone === "muted"
        ? "border-border text-muted-foreground hover:text-foreground"
        : "border-border text-foreground hover:bg-muted/20";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] transition-colors disabled:opacity-50 ${cls}`}
    >
      <Icon className="h-3 w-3" />
      {label}
    </button>
  );
}