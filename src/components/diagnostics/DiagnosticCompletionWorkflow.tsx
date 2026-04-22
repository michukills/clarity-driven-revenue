// P6.3 — Diagnostic Completion Workflow
// Admin-only guided workflow for the final 4 diagnostic checklist steps.
// Uses existing tables only (checklist_items, business_control_reports,
// customer_tasks, customer_timeline, diagnostic_intake_answers, tool_runs).
// No schema/RLS/auth changes. No automation beyond explicit button click.
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Circle, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { buildIntakeProgress, type IntakeAnswerRow } from "@/lib/diagnostics/intake";
import { DIAGNOSTIC_REPORT_PURPOSE } from "@/lib/diagnostics/draft";

type ChecklistRow = {
  id: string;
  title: string | null;
  completed: boolean | null;
  completed_at: string | null;
};

type ToolRunRow = { tool_key: string };

type StepKey = "review" | "strategy" | "delivered" | "handoff";

type StepDef = {
  key: StepKey;
  /** stable slug used in checklist title `[DX] {slug} · ...` */
  slug: string;
  label: string;
  prerequisite: string;
  timelineEvent:
    | "diagnostic_review_completed"
    | "strategy_plan_prepared"
    | "diagnostic_delivered_confirmed"
    | "implementation_handoff_completed";
  timelineTitle: string;
  timelineDetail: string;
};

const STEPS: StepDef[] = [
  {
    key: "review",
    slug: "review",
    label: "Diagnostic review completed",
    prerequisite:
      "Intake complete and all five Diagnostic Engines™ have at least one tool run.",
    timelineEvent: "diagnostic_review_completed",
    timelineTitle: "Diagnostic review completed",
    timelineDetail: "RGS confirmed the diagnostic review is complete.",
  },
  {
    key: "strategy",
    slug: "strategy",
    label: "Strategy Plan prepared",
    prerequisite: "A diagnostic draft exists in Reports & Reviews™.",
    timelineEvent: "strategy_plan_prepared",
    timelineTitle: "Strategy Plan prepared",
    timelineDetail: "RGS confirmed the Strategy Plan is prepared.",
  },
  {
    key: "delivered",
    slug: "delivered",
    label: "Diagnostic delivered",
    prerequisite:
      "A diagnostic-purpose Reports & Reviews™ report has been published.",
    timelineEvent: "diagnostic_delivered_confirmed",
    timelineTitle: "Diagnostic delivered",
    timelineDetail: "RGS confirmed the diagnostic was delivered to the client.",
  },
  {
    key: "handoff",
    slug: "handoff",
    label: "Implementation recommendation / handoff completed",
    prerequisite: "All five [HANDOFF] tasks exist for this client.",
    timelineEvent: "implementation_handoff_completed",
    timelineTitle: "Implementation handoff completed",
    timelineDetail:
      "RGS confirmed the implementation recommendation / handoff is complete.",
  },
];

const HANDOFF_TAG = "[HANDOFF]";
const REQUIRED_HANDOFF_COUNT = 5;

const ENGINE_KEYS = [
  "rgs_stability_scorecard",
  "revenue_leak_finder",
  "buyer_persona_tool",
  "customer_journey_mapper",
  "process_breakdown_tool",
] as const;

function findChecklistRow(checklist: ChecklistRow[], slug: StepKey): ChecklistRow | null {
  // Title format from seedDiagnosticChecklist: "[DX] {slug} · {label}"
  const needle = `[DX] ${slug} `;
  return (
    checklist.find((r) => (r.title || "").startsWith(needle)) || null
  );
}

export function DiagnosticCompletionWorkflow({
  customerId,
  intakeAnswers,
  toolRuns,
  checklist,
  reload,
}: {
  customerId: string;
  intakeAnswers: IntakeAnswerRow[];
  toolRuns: ToolRunRow[];
  checklist: ChecklistRow[];
  reload: () => void;
}) {
  const [busy, setBusy] = useState<StepKey | null>(null);
  const [hasDraft, setHasDraft] = useState<boolean | null>(null);
  const [hasPublishedDx, setHasPublishedDx] = useState<boolean | null>(null);
  const [handoffCount, setHandoffCount] = useState<number>(0);

  // Pull live signals: any diagnostic draft (status=draft|published?), any
  // published diagnostic-purpose report, count of [HANDOFF] tasks.
  const refreshSignals = async () => {
    const [{ data: reports }, { data: tasks }] = await Promise.all([
      supabase
        .from("business_control_reports")
        .select("id, status, report_data")
        .eq("customer_id", customerId)
        .order("updated_at", { ascending: false })
        .limit(50),
      supabase
        .from("customer_tasks")
        .select("id, title")
        .eq("customer_id", customerId),
    ]);
    const dxReports = (reports || []).filter(
      (r: any) => r?.report_data?.reportPurpose === DIAGNOSTIC_REPORT_PURPOSE,
    );
    setHasDraft(dxReports.length > 0);
    setHasPublishedDx(dxReports.some((r: any) => r.status === "published"));
    const handoff = (tasks || []).filter((t: any) =>
      typeof t.title === "string" && t.title.startsWith(HANDOFF_TAG),
    ).length;
    setHandoffCount(handoff);
  };

  useEffect(() => {
    refreshSignals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId, checklist.length]);

  const intakeComplete = useMemo(
    () => buildIntakeProgress(intakeAnswers).status === "complete",
    [intakeAnswers],
  );

  const enginesComplete = useMemo(() => {
    const runKeys = new Set(toolRuns.map((r) => r.tool_key));
    return ENGINE_KEYS.every((k) => runKeys.has(k));
  }, [toolRuns]);

  const enabledMap: Record<StepKey, { enabled: boolean; reason: string | null }> = {
    review: {
      enabled: intakeComplete && enginesComplete,
      reason: !intakeComplete
        ? "Intake is not complete yet."
        : !enginesComplete
          ? "One or more Diagnostic Engines™ have not been run yet."
          : null,
    },
    strategy: {
      enabled: !!hasDraft,
      reason: !hasDraft
        ? "Create a diagnostic draft in the panel above first."
        : null,
    },
    delivered: {
      enabled: !!hasPublishedDx,
      reason: !hasPublishedDx
        ? "Publish the diagnostic draft in Reports & Reviews™ first."
        : null,
    },
    handoff: {
      enabled: handoffCount >= REQUIRED_HANDOFF_COUNT,
      reason:
        handoffCount >= REQUIRED_HANDOFF_COUNT
          ? null
          : `Create implementation handoff tasks first (${handoffCount}/${REQUIRED_HANDOFF_COUNT}).`,
    },
  };

  const markComplete = async (step: StepDef) => {
    const row = findChecklistRow(checklist, step.key);
    if (!row) {
      toast.error(
        "Diagnostic checklist not seeded yet. Seed the checklist before completing this step.",
      );
      return;
    }
    // Idempotent guard: already complete → do nothing.
    if (row.completed) {
      toast.info("Step already marked complete.");
      return;
    }
    setBusy(step.key);
    try {
      const { error: upErr } = await supabase
        .from("checklist_items")
        .update({
          completed: true,
          completed_at: new Date().toISOString(),
        })
        .eq("id", row.id)
        .eq("completed", false); // extra idempotency guard
      if (upErr) throw upErr;

      const { error: tlErr } = await supabase.from("customer_timeline").insert([
        {
          customer_id: customerId,
          event_type: step.timelineEvent,
          title: step.timelineTitle,
          detail: step.timelineDetail,
        },
      ]);
      if (tlErr) throw tlErr;

      toast.success(`${step.label} marked complete.`);
      reload();
      refreshSignals();
    } catch (e: any) {
      toast.error(e?.message || "Could not mark step complete.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="text-[11px] text-muted-foreground">
        Guided closeout for the final diagnostic checklist steps. Nothing is auto-completed —
        each step waits for an explicit RGS click. Buttons stay disabled until the
        prerequisite is satisfied.
      </div>

      <div className="space-y-2">
        {STEPS.map((step) => {
          const row = findChecklistRow(checklist, step.key);
          const seeded = !!row;
          const completed = !!row?.completed;
          const { enabled, reason } = enabledMap[step.key];
          const canClick = seeded && !completed && enabled && busy === null;

          return (
            <div
              key={step.key}
              className="flex items-start gap-3 p-3 rounded-md bg-muted/30 border border-border"
            >
              <div className="mt-0.5">
                {completed ? (
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                ) : enabled ? (
                  <Circle className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Lock className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-foreground">{step.label}</div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  Prerequisite: {step.prerequisite}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wider">
                  <span
                    className={`px-1.5 py-0.5 rounded border ${
                      completed
                        ? "bg-secondary/15 text-secondary border-secondary/40"
                        : seeded
                          ? "bg-muted/40 text-muted-foreground border-border"
                          : "bg-amber-500/10 text-amber-400 border-amber-500/40"
                    }`}
                  >
                    {completed ? "Complete" : seeded ? "Pending" : "Not seeded"}
                  </span>
                  {!completed && reason && (
                    <span className="normal-case tracking-normal text-amber-400">
                      {reason}
                    </span>
                  )}
                </div>
              </div>
              <Button
                size="sm"
                variant={completed ? "outline" : "default"}
                className={completed ? "border-border" : "bg-primary hover:bg-secondary"}
                disabled={!canClick}
                onClick={() => markComplete(step)}
              >
                {completed
                  ? "Completed"
                  : busy === step.key
                    ? "Marking…"
                    : "Mark complete"}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}