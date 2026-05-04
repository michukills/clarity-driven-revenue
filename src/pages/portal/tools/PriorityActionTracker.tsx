import { useEffect, useState } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { usePortalCustomerId } from "@/hooks/usePortalCustomerId";
import { Flag, Target, CalendarClock, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PremiumToolHeader } from "@/components/tools/PremiumToolHeader";
import {
  ToolGuidancePanel,
  ToolEmptyState,
  ToolLoadingState,
  ToolErrorState,
} from "@/components/tools/ToolGuidancePanel";
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
        <PremiumToolHeader
          toolName="Priority Action Tracker"
          lane="RGS Control System"
          purpose="The next small number of actions that matter most this week, kept visible so the system does not drift. The tracker shows priorities — it does not turn RGS into your operator and does not guarantee outcomes."
          backTo="/portal/tools/rgs-control-system"
          backLabel="Back to RGS Control System™"
        />

        <ToolGuidancePanel
          purpose="Use the tracker to see what is open this week, what changed since last review, and what is blocked."
          prepare={[
            "A clear sense of what is actually due this week",
            "Any blockers (people, time, missing information) you already know about",
          ]}
          goodSubmission={[
            "Each open item has a clear next step or is honestly marked blocked",
            "Risk signals and trends are reviewed before you change anything client-facing",
          ]}
          whatHappensNext="RGS reviews open and blocked items in the next operating cadence and adjusts the priority list."
          reviewedBy="RGS reviews these items during the monthly system review."
          outOfScope="Visibility and bounded interpretation only — not unlimited support, advisory, or RGS operating the business."
        />

        {err && <ToolErrorState message={err} />}

        {loading || rows === null ? (
          <ToolLoadingState label="Loading the current priority actions…" />
        ) : rows.length === 0 ? (
          <ToolEmptyState
            title="No client-visible priority actions yet."
            body="When RGS reviews and approves an action, it appears here with the recommended next step and success signal. Until then, no action is required from you."
            responsibility="rgs"
          />
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