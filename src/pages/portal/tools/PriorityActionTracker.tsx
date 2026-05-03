import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PortalShell } from "@/components/portal/PortalShell";
import { usePortalCustomerId } from "@/hooks/usePortalCustomerId";
import { Loader2, ListChecks, Flag, Target, CalendarClock, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  getClientPriorityActionItems,
  PAT_CATEGORY_LABEL, PAT_GEAR_LABEL, PAT_PRIORITY_LABEL,
  PAT_STATUS_LABEL, PAT_OWNER_ROLE_LABEL, PAT_SOURCE_LABEL,
  type ClientPriorityActionItem, type PatPriorityLevel,
} from "@/lib/priorityActionTracker";

const PRIORITY_TONE: Record<PatPriorityLevel, string> = {
  critical: "bg-destructive/15 text-destructive border-destructive/40",
  high: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  medium: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  low: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
};

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value || !value.trim()) return null;
  return (
    <div className="text-sm">
      <span className="text-muted-foreground">{label}: </span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}

export default function PriorityActionTracker() {
  const { customerId, loading } = usePortalCustomerId();
  const [rows, setRows] = useState<ClientPriorityActionItem[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (loading || !customerId) return;
    let alive = true;
    (async () => {
      try {
        const r = await getClientPriorityActionItems(customerId);
        if (alive) setRows(r);
      } catch (e: any) {
        if (alive) setErr(e?.message ?? "Failed to load priority actions");
      }
    })();
    return () => { alive = false; };
  }, [customerId, loading]);

  return (
    <PortalShell variant="customer">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <header className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ListChecks className="h-3.5 w-3.5" />
            Part of the RGS Control System™ ·{" "}
            <Link to="/portal/tools/rgs-control-system" className="text-primary hover:underline">
              Back to RGS Control System™
            </Link>
          </div>
          <h1 className="text-2xl text-foreground font-serif">Priority Action Tracker</h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            The tracker keeps the next important actions visible. It does not
            mean RGS is taking over execution, guaranteeing outcomes, or
            replacing your business judgment.
          </p>
        </header>

        {err && (
          <div className="border border-destructive/30 bg-destructive/10 rounded-md p-3 text-sm text-destructive">
            {err}
          </div>
        )}

        {loading || rows === null ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading priority actions…
          </div>
        ) : rows.length === 0 ? (
          <div className="border border-border bg-card rounded-xl p-6 text-center text-sm text-muted-foreground">
            No visible priority actions yet. When RGS marks a reviewed action as
            client-visible, it will appear here.
          </div>
        ) : (
          <ul className="space-y-3">
            {rows.map((r) => (
              <li key={r.id} className="border border-border bg-card rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h2 className="text-base text-foreground font-medium">{r.title}</h2>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className={PRIORITY_TONE[r.priority_level]}>
                      <Flag className="h-3 w-3 mr-1" />
                      {PAT_PRIORITY_LABEL[r.priority_level]} priority
                    </Badge>
                    <Badge variant="outline">{PAT_STATUS_LABEL[r.status]}</Badge>
                    <Badge variant="secondary">{PAT_GEAR_LABEL[r.gear]}</Badge>
                    <Badge variant="outline">{PAT_CATEGORY_LABEL[r.action_category]}</Badge>
                  </div>
                </div>

                {r.description && (
                  <p className="text-sm text-foreground">{r.description}</p>
                )}

                {r.why_it_matters && (
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
                      Why it matters
                    </div>
                    <p className="text-sm text-foreground">{r.why_it_matters}</p>
                  </div>
                )}

                {r.recommended_next_step && (
                  <div className="rounded-md border border-border bg-muted/20 p-3">
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
                      <Wrench className="h-3 w-3" /> Recommended next step
                    </div>
                    <p className="text-sm text-foreground">{r.recommended_next_step}</p>
                  </div>
                )}

                {r.success_signal && (
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
                      <Target className="h-3 w-3" /> Success signal
                    </div>
                    <p className="text-sm text-foreground">{r.success_signal}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 pt-2 border-t border-border">
                  <Row label="Assigned" value={r.assigned_to_label ?? PAT_OWNER_ROLE_LABEL[r.owner_role]} />
                  <Row label="Source" value={r.source_label ?? PAT_SOURCE_LABEL[r.source_type]} />
                  {r.due_date && (
                    <div className="text-sm flex items-center gap-1">
                      <CalendarClock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">Due: </span>
                      <span className="text-foreground">{new Date(r.due_date).toLocaleDateString()}</span>
                    </div>
                  )}
                  {r.next_review_date && (
                    <div className="text-sm flex items-center gap-1">
                      <CalendarClock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">Next review: </span>
                      <span className="text-foreground">{new Date(r.next_review_date).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                {r.client_notes && (
                  <p className="text-xs text-muted-foreground border-t border-border pt-2">
                    {r.client_notes}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </PortalShell>
  );
}