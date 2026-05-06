import { useEffect, useMemo, useState } from "react";
import { CalendarClock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DIAGNOSTIC_TIMELINE_STEPS } from "@/lib/welcomeGreeting";
import {
  DIAGNOSTIC_TIMELINE_CLIENT_DISCLAIMER,
  type DiagnosticStageKey,
  type DiagnosticStageStatus,
} from "@/config/diagnosticTimeline";
import {
  getClientTimelineStages,
  type ClientTimelineStageRow,
} from "@/lib/diagnosticTimeline";

const STAGE_KEY_BY_DAY: Record<number, DiagnosticStageKey> = {
  1: "systems_interview",
  2: "evidence_vault_opens",
  4: "evidence_reminder",
  6: "evidence_window_closes",
  8: "rgs_review",
  10: "report_walkthrough",
};

const STATUS_LABEL: Record<DiagnosticStageStatus, string> = {
  not_scheduled: "Not scheduled",
  scheduled: "Scheduled",
  sent: "Sent",
  overdue: "Overdue",
  completed: "Completed",
  snoozed: "Snoozed",
  extended: "Extended",
};

/**
 * P87 — Client-safe diagnostic timeline. Reads via SECURITY DEFINER RPC
 * (`get_client_diagnostic_timeline`). Never exposes admin notes,
 * extension reasons, or admin IDs.
 */
export function DiagnosticTimelinePanel({
  currentStep,
  customerId,
}: {
  currentStep?: string | null;
  customerId?: string;
}) {
  const [rows, setRows] = useState<ClientTimelineStageRow[] | null>(null);
  useEffect(() => {
    if (!customerId) return;
    getClientTimelineStages(customerId).then(setRows).catch(() => setRows([]));
  }, [customerId]);

  const byKey = useMemo(() => {
    const m = new Map<DiagnosticStageKey, ClientTimelineStageRow>();
    for (const r of rows ?? []) m.set(r.stage_key as DiagnosticStageKey, r);
    return m;
  }, [rows]);
  return (
    <section className="mt-8 space-y-3 min-w-0">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        <CalendarClock className="h-3 w-3" /> Diagnostic Timeline
      </div>
      <h2 className="text-lg sm:text-xl text-foreground font-light tracking-tight">
        What to expect, day by day
      </h2>
      <ol className="bg-card border border-border rounded-xl divide-y divide-border overflow-hidden">
        {DIAGNOSTIC_TIMELINE_STEPS.map((step) => {
          const active = currentStep === step.key;
          const stageKey = STAGE_KEY_BY_DAY[step.day];
          const row = stageKey ? byKey.get(stageKey) : undefined;
          const status = (row?.status as DiagnosticStageStatus) ?? "not_scheduled";
          return (
            <li
              key={step.key}
              className={`p-4 flex items-start gap-4 ${active ? "bg-primary/5" : ""}`}
            >
              <div className="shrink-0 w-12 text-xs uppercase tracking-wider text-muted-foreground">
                Day {step.day}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="text-sm text-foreground">{step.title}</div>
                  <Badge variant="outline" className="text-[10px]">{STATUS_LABEL[status]}</Badge>
                </div>
                <div className="text-xs text-muted-foreground leading-relaxed mt-1">
                  {step.body}
                </div>
                {row?.scheduled_at && (
                  <div className="text-[10px] text-muted-foreground mt-1">
                    Scheduled {new Date(row.scheduled_at).toLocaleDateString()}
                  </div>
                )}
                {row?.completed_at && (
                  <div className="text-[10px] text-muted-foreground mt-1">
                    Completed {new Date(row.completed_at).toLocaleDateString()}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      <p className="text-[11px] text-muted-foreground italic">
        Unfiled required items may count as Missing after the vault closes
        unless your RGS admin extends the window.
      </p>
      <p className="text-[11px] text-muted-foreground italic">
        {DIAGNOSTIC_TIMELINE_CLIENT_DISCLAIMER}
      </p>
    </section>
  );
}