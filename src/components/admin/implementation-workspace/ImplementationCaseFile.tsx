/**
 * P13.2 — Implementation Case File.
 *
 * Per-client implementation command surface inside the Implementation
 * Workspace. Mirrors the Diagnostic Case File in seriousness, but is
 * scoped to rollout execution: handoff readiness, rollout areas, tasks,
 * tool assignment vs. package, completion / lifecycle movement.
 *
 * Boundary discipline:
 *   - Diagnostic Workspace owns analysis. We only read whether a
 *     diagnostic report exists / findings exist / lifecycle advanced.
 *   - Revenue Tracker is NOT collapsed in here. We surface the
 *     `package_revenue_tracker` flag and link to Add-On / Monitoring,
 *     but actual access is owned by the existing assignment system.
 *   - We never imply implementation is "done" if the schema cannot
 *     prove it. Truthful statuses only.
 *
 * Schema notes (intentional gaps):
 *   - There is no implementation-specific task table. We surface
 *     `customer_tasks` filtered by customer and call it out as
 *     "all open client tasks" — admin filtering happens in Tasks.
 *   - There is no SOP/template assignment join per customer. We
 *     surface `resource_assignments` as the closest signal and link
 *     to Templates / Operations SOP.
 *   - There is no "handoff_notes" field. We use diagnostic report
 *     existence + lifecycle_state + package flags as readiness signal.
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle2,
  CircleDashed,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Inbox,
  Lock,
  ClipboardList,
  Wrench,
  PackageCheck,
} from "lucide-react";
import { TARGET_GEARS, type TargetGear, gearMeta } from "@/lib/gears/targetGear";
import { GearChip } from "@/components/gears/GearChip";
import { useValueMode, label as vLabel } from "@/lib/gears/valueMode";

// ---------- types ----------

interface CustomerOption {
  id: string;
  full_name: string;
  business_name: string | null;
  lifecycle_state: string;
  stage: string;
  package_diagnostic: boolean;
  package_implementation: boolean;
  package_full_bundle: boolean;
  package_ongoing_support: boolean;
  package_addons: boolean;
  package_revenue_tracker: boolean;
  is_demo_account: boolean;
  implementation_status: string | null;
  implementation_payment_status: string | null;
  implementation_started_at: string | null;
  implementation_ended_at: string | null;
  portal_unlocked: boolean;
}

type AreaStatus = "missing" | "ready" | "in_progress" | "blocked" | "complete";

interface RolloutArea {
  key: string;
  label: string;
  status: AreaStatus;
  detail: string;
  nextAction: string;
  to?: string;
}

interface TaskRow {
  id: string;
  title: string;
  status: string;
  due_date: string | null;
  completed_at: string | null;
  target_gear: number | null;
}

interface ChecklistRow {
  id: string;
  title: string;
  completed: boolean;
  position: number;
  target_gear: number | null;
}

interface GearAssignmentRow {
  id: string;
  resource_id: string | null;
  target_gear: number | null;
  resource_gear: number | null;
  resource_title: string | null;
}

const LIFECYCLE_TARGETS: { value: string; label: string; hint: string }[] = [
  { value: "implementation", label: "Implementation", hint: "Active rollout" },
  { value: "completed", label: "Completed", hint: "Rollout done, no ongoing support" },
  { value: "ongoing_support", label: "Ongoing support", hint: "Retained for ongoing work" },
  { value: "re_engagement", label: "Re-engagement", hint: "Returning to active work" },
];

// ---------- atoms ----------

function StatusDot({ status }: { status: AreaStatus }) {
  const map: Record<AreaStatus, { cls: string; icon: JSX.Element; label: string }> = {
    missing: {
      cls: "text-muted-foreground",
      icon: <CircleDashed className="h-3.5 w-3.5" />,
      label: "Missing",
    },
    ready: {
      cls: "text-primary",
      icon: <Inbox className="h-3.5 w-3.5" />,
      label: "Ready",
    },
    in_progress: {
      cls: "text-[hsl(40_90%_60%)]",
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
      label: "In progress",
    },
    blocked: {
      cls: "text-destructive",
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
      label: "Blocked",
    },
    complete: {
      cls: "text-[hsl(140_50%_60%)]",
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
      label: "Complete",
    },
  };
  const v = map[status];
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] whitespace-nowrap ${v.cls}`}>
      {v.icon}
      {v.label}
    </span>
  );
}

function SectionCard({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 min-w-0">
      <div className="mb-3 min-w-0">
        <h3 className="text-sm text-foreground font-medium">{title}</h3>
        {hint && <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function Stat({ label, value, bad }: { label: string; value: number | string; bad?: boolean }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-2.5 min-w-0">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-base mt-1 ${bad ? "text-destructive" : "text-foreground"}`}>{value}</div>
    </div>
  );
}

// ---------- main ----------

export function ImplementationCaseFile() {
  const { toast } = useToast();
  const [valueMode, setValueMode] = useValueMode();
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [caseLoading, setCaseLoading] = useState(false);

  // Per-case data
  const [reportRow, setReportRow] = useState<{ id: string; status: string } | null>(null);
  const [findingsCount, setFindingsCount] = useState(0);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [checklist, setChecklist] = useState<ChecklistRow[]>([]);
  const [uploadsCount, setUploadsCount] = useState(0);
  const [assignmentsCount, setAssignmentsCount] = useState(0);
  const [stageAssignments, setStageAssignments] = useState(0);
  const [manualAssignments, setManualAssignments] = useState(0);
  const [gearAssignments, setGearAssignments] = useState<GearAssignmentRow[]>([]);
  const [pendingMove, setPendingMove] = useState<string | null>(null);

  // Load eligible customers — implementation-relevant first.
  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from("customers")
        .select(
          "id, full_name, business_name, lifecycle_state, stage, package_diagnostic, package_implementation, package_full_bundle, package_ongoing_support, package_addons, package_revenue_tracker, is_demo_account, implementation_status, implementation_payment_status, implementation_started_at, implementation_ended_at, portal_unlocked",
        )
        .is("archived_at", null)
        .order("last_activity_at", { ascending: false })
        .limit(200);
      const rows = (data ?? []) as CustomerOption[];
      // Sort: real implementation-relevant first, demo last.
      const score = (c: CustomerOption) => {
        let s = 0;
        if (c.is_demo_account) s += 100;
        if (c.lifecycle_state === "implementation") s -= 30;
        if (c.package_implementation || c.package_full_bundle) s -= 10;
        if (c.lifecycle_state === "completed" || c.lifecycle_state === "ongoing_support") s -= 5;
        return s;
      };
      const sorted = rows.slice().sort((a, b) => score(a) - score(b));
      setCustomers(sorted);
      if (sorted.length && !selectedId) setSelectedId(sorted[0].id);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload customer row after lifecycle move
  const refreshCustomer = async (id: string) => {
    const { data } = await supabase
      .from("customers")
      .select(
        "id, full_name, business_name, lifecycle_state, stage, package_diagnostic, package_implementation, package_full_bundle, package_ongoing_support, package_addons, package_revenue_tracker, is_demo_account, implementation_status, implementation_payment_status, implementation_started_at, implementation_ended_at, portal_unlocked",
      )
      .eq("id", id)
      .maybeSingle();
    if (data) {
      setCustomers((prev) => prev.map((c) => (c.id === id ? (data as CustomerOption) : c)));
    }
  };

  useEffect(() => {
    if (!selectedId) return;
    setCaseLoading(true);
    void (async () => {
      const [
        repRes,
        memRes,
        taskRes,
        clRes,
        upRes,
        asRes,
      ] = await Promise.all([
        supabase
          .from("business_control_reports")
          .select("id, status")
          .eq("customer_id", selectedId)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("customer_insight_memory")
          .select("id", { head: true, count: "exact" })
          .eq("customer_id", selectedId)
          .eq("status", "active"),
        supabase
          .from("customer_tasks")
          .select("id, title, status, due_date, completed_at, target_gear")
          .eq("customer_id", selectedId)
          .order("due_date", { ascending: true, nullsFirst: false })
          .limit(50),
        supabase
          .from("checklist_items")
          .select("id, title, completed, position, target_gear")
          .eq("customer_id", selectedId)
          .order("position", { ascending: true }),
        supabase
          .from("customer_uploads")
          .select("id", { head: true, count: "exact" })
          .eq("customer_id", selectedId),
        supabase
          .from("resource_assignments")
          .select("id, assignment_source, resource_id, target_gear")
          .eq("customer_id", selectedId),
      ]);

      setReportRow((repRes.data as any) ?? null);
      setFindingsCount(memRes.count ?? 0);
      setTasks((taskRes.data ?? []) as TaskRow[]);
      setChecklist((clRes.data ?? []) as ChecklistRow[]);
      setUploadsCount(upRes.count ?? 0);
      const aRows = (asRes.data ?? []) as {
        id: string;
        assignment_source: string | null;
        resource_id: string | null;
        target_gear: number | null;
      }[];
      setAssignmentsCount(aRows.length);
      setStageAssignments(aRows.filter((r) => r.assignment_source === "stage").length);
      setManualAssignments(aRows.filter((r) => r.assignment_source !== "stage").length);

      // Resolve resource-level gear so assignment override can fall back.
      const resourceIds = Array.from(
        new Set(aRows.map((r) => r.resource_id).filter(Boolean) as string[]),
      );
      let resourceMeta = new Map<string, { gear: number | null; title: string | null }>();
      if (resourceIds.length > 0) {
        const { data: resources } = await supabase
          .from("resources")
          .select("id, target_gear, title")
          .in("id", resourceIds);
        for (const r of (resources ?? []) as any[]) {
          resourceMeta.set(r.id, { gear: r.target_gear ?? null, title: r.title ?? null });
        }
      }
      setGearAssignments(
        aRows.map((r) => ({
          id: r.id,
          resource_id: r.resource_id,
          target_gear: r.target_gear,
          resource_gear: r.resource_id ? resourceMeta.get(r.resource_id)?.gear ?? null : null,
          resource_title: r.resource_id ? resourceMeta.get(r.resource_id)?.title ?? null : null,
        })),
      );

      setCaseLoading(false);
    })();
  }, [selectedId]);

  const selected = useMemo(
    () => customers.find((c) => c.id === selectedId) ?? null,
    [customers, selectedId],
  );

  // ---- task math ----
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const openTasks = tasks.filter((t) => t.status === "open").length;
  const completedTasks = tasks.filter((t) => t.status === "completed" || t.completed_at).length;
  const overdueTasks = tasks.filter(
    (t) => t.status === "open" && t.due_date && new Date(t.due_date) < today,
  ).length;
  const blockedTasks = tasks.filter((t) => t.status === "blocked" || t.status === "waiting").length;

  const checklistDone = checklist.filter((c) => c.completed).length;
  const checklistTotal = checklist.length;
  const checklistGearedTotal = checklist.filter((c) => !!c.target_gear).length;
  const checklistGearedDone = checklist.filter((c) => !!c.target_gear && c.completed).length;

  // ---- per-gear restoration math (this client only) ----
  type GearStat = {
    tasksOpen: number;
    tasksRestored: number; // completed
    tasksFriction: number; // blocked / waiting
    toolsAssigned: number;
    toolTitles: string[];
    checklistOpen: number;
    checklistDone: number;
  };
  const emptyGearStat: GearStat = {
    tasksOpen: 0,
    tasksRestored: 0,
    tasksFriction: 0,
    toolsAssigned: 0,
    toolTitles: [],
    checklistOpen: 0,
    checklistDone: 0,
  };
  const gearStats = useMemo(() => {
    const out: Record<TargetGear, GearStat> = {
      1: { ...emptyGearStat, toolTitles: [] },
      2: { ...emptyGearStat, toolTitles: [] },
      3: { ...emptyGearStat, toolTitles: [] },
      4: { ...emptyGearStat, toolTitles: [] },
      5: { ...emptyGearStat, toolTitles: [] },
    };
    for (const t of tasks) {
      const g = t.target_gear as TargetGear | null;
      if (!g || g < 1 || g > 5) continue;
      const isDone = t.status === "completed" || !!t.completed_at;
      const isFriction = t.status === "blocked" || t.status === "waiting";
      if (isDone) out[g].tasksRestored += 1;
      else if (isFriction) out[g].tasksFriction += 1;
      else out[g].tasksOpen += 1;
    }
    for (const a of gearAssignments) {
      const resolved = (a.target_gear ?? a.resource_gear) as TargetGear | null;
      if (!resolved || resolved < 1 || resolved > 5) continue;
      out[resolved].toolsAssigned += 1;
      if (a.resource_title) out[resolved].toolTitles.push(a.resource_title);
    }
    for (const c of checklist) {
      const g = c.target_gear as TargetGear | null;
      if (!g || g < 1 || g > 5) continue;
      if (c.completed) out[g].checklistDone += 1;
      else out[g].checklistOpen += 1;
    }
    return out;
  }, [tasks, gearAssignments, checklist]);

  const totalGearedTasks = tasks.filter((t) => !!t.target_gear).length;
  const totalGearedTools = gearAssignments.filter(
    (a) => !!(a.target_gear ?? a.resource_gear),
  ).length;

  // ---- handoff readiness from diagnostic ----
  const handoffReadiness = useMemo(() => {
    if (!selected) return { status: "missing" as AreaStatus, detail: "No client selected", nextAction: "" };
    const hasImplPackage = selected.package_implementation || selected.package_full_bundle;
    const hasReport = !!reportRow;
    const reportPublished = reportRow?.status === "published";
    const hasFindings = findingsCount > 0;
    const lifecycleAdvanced =
      selected.lifecycle_state === "implementation" ||
      selected.lifecycle_state === "completed" ||
      selected.lifecycle_state === "ongoing_support";

    if (!hasImplPackage) {
      return {
        status: "blocked" as AreaStatus,
        detail: "No implementation or full-bundle package on file",
        nextAction: "Confirm implementation purchase before starting rollout",
      };
    }
    if (!hasReport && !hasFindings) {
      return {
        status: "missing" as AreaStatus,
        detail: "No diagnostic report or findings exist yet",
        nextAction: "Complete diagnostic before handing off to implementation",
      };
    }
    if (!reportPublished && !lifecycleAdvanced) {
      return {
        status: "in_progress" as AreaStatus,
        detail: `Report status: ${reportRow?.status ?? "draft"} · ${findingsCount} findings`,
        nextAction: "Publish diagnostic report or advance lifecycle to implementation",
      };
    }
    return {
      status: "ready" as AreaStatus,
      detail: `Report: ${reportRow?.status ?? "n/a"} · ${findingsCount} findings · lifecycle ${selected.lifecycle_state}`,
      nextAction: "Begin rollout planning and task seeding",
    };
  }, [selected, reportRow, findingsCount]);

  // ---- rollout areas ----
  const rolloutAreas: RolloutArea[] = useMemo(() => {
    if (!selected) return [];
    const portalReady = selected.portal_unlocked;
    const hasStarted = !!selected.implementation_started_at;
    const hasEnded = !!selected.implementation_ended_at;

    return [
      {
        key: "rollout_plan",
        label: "Rollout plan",
        status: hasStarted ? (hasEnded ? "complete" : "in_progress") : "missing",
        detail: hasStarted
          ? hasEnded
            ? `Ran ${selected.implementation_started_at?.slice(0, 10)} → ${selected.implementation_ended_at}`
            : `Started ${selected.implementation_started_at?.slice(0, 10)}`
          : "Implementation not yet started",
        nextAction: hasStarted
          ? hasEnded
            ? "Confirm closeout notes and post-mortem"
            : "Track milestones until closeout"
          : "Move to implementation lifecycle to start the clock",
        to: `/admin/customers/${selected.id}`,
      },
      {
        key: "checklist",
        label: "Implementation checklist",
        status:
          checklistTotal === 0
            ? "missing"
            : checklistDone === checklistTotal
            ? "complete"
            : checklistDone > 0
            ? "in_progress"
            : "ready",
        detail:
          checklistTotal === 0
            ? "No checklist seeded yet"
            : `${checklistDone} / ${checklistTotal} items complete`,
        nextAction:
          checklistTotal === 0
            ? "Seed checklist (auto-created when stage moves to implementation_added)"
            : checklistDone === checklistTotal
            ? "Checklist clean — confirm with client"
            : "Work the next open checklist item",
        to: `/admin/customers/${selected.id}`,
      },
      {
        key: "tasks",
        label: "Tasks",
        status:
          openTasks === 0 && completedTasks > 0
            ? "complete"
            : overdueTasks > 0
            ? "blocked"
            : openTasks > 0
            ? "in_progress"
            : "missing",
        detail:
          tasks.length === 0
            ? "No tasks tracked for this client"
            : `${openTasks} open · ${overdueTasks} overdue · ${completedTasks} completed`,
        nextAction:
          overdueTasks > 0
            ? "Resolve overdue tasks first"
            : openTasks > 0
            ? "Work the next due task"
            : tasks.length === 0
            ? "Create implementation tasks for this client"
            : "All tasks closed",
        to: "/admin/tasks",
      },
      {
        key: "sops",
        label: "SOPs / operations",
        status: "missing",
        // Schema gap: there is no per-customer SOP join. We surface the
        // global SOP system so admins can author/link manually.
        detail: "No per-client SOP join exists yet — assign or author in Operations",
        nextAction: "Open Operations / SOP System to set up procedures",
        to: "/admin/operations-sop",
      },
      {
        key: "templates",
        label: "Templates",
        status: "missing",
        detail: "Templates are global. No per-client template join in schema.",
        nextAction: "Open Templates library to share with this client",
        to: "/admin/templates",
      },
      {
        key: "files",
        label: "Client files",
        status: uploadsCount > 0 ? "ready" : "missing",
        detail: uploadsCount > 0 ? `${uploadsCount} file${uploadsCount === 1 ? "" : "s"} on file` : "No client files uploaded",
        nextAction: uploadsCount > 0 ? "Review files and link into rollout" : "Request rollout source files from client",
        to: "/admin/files",
      },
      {
        key: "tools",
        label: "Tool assignments",
        status:
          assignmentsCount === 0
            ? "missing"
            : manualAssignments > 0
            ? "ready"
            : "in_progress",
        detail:
          assignmentsCount === 0
            ? "No tools assigned to this client yet"
            : `${assignmentsCount} assigned (${stageAssignments} via stage, ${manualAssignments} manual)`,
        nextAction:
          assignmentsCount === 0
            ? "Assign tools so the client portal has something to work with"
            : "Confirm assignment matches purchased package",
        to: "/admin/tool-distribution",
      },
      {
        key: "portal",
        label: "Client portal access",
        status: portalReady ? "ready" : "missing",
        detail: portalReady ? "Portal unlocked for client" : "Portal still locked",
        nextAction: portalReady ? "Verify client can log in" : "Unlock portal once tools are assigned",
        to: `/admin/customers/${selected.id}`,
      },
    ];
  }, [selected, checklistDone, checklistTotal, tasks, openTasks, overdueTasks, completedTasks, uploadsCount, assignmentsCount, stageAssignments, manualAssignments]);

  // ---- completion verdict ----
  const completion = useMemo(() => {
    if (!selected) return { verdict: "—", tone: "muted" as const, suggested: null as string | null };
    const blockers =
      overdueTasks +
      (handoffReadiness.status === "blocked" ? 1 : 0) +
      (assignmentsCount === 0 ? 1 : 0);
    const allChecklistDone = checklistTotal > 0 && checklistDone === checklistTotal;
    const noOpen = openTasks === 0 && tasks.length > 0;

    if (selected.lifecycle_state === "completed") {
      return { verdict: "Marked completed", tone: "ok" as const, suggested: selected.package_ongoing_support ? "ongoing_support" : null };
    }
    if (selected.lifecycle_state === "ongoing_support") {
      return { verdict: "On ongoing support", tone: "ok" as const, suggested: null };
    }
    if (blockers === 0 && allChecklistDone && noOpen) {
      return {
        verdict: "Looks ready to close out",
        tone: "ok" as const,
        suggested: selected.package_ongoing_support ? "ongoing_support" : "completed",
      };
    }
    if (blockers > 0) {
      return {
        verdict: `Not ready — ${blockers} blocker${blockers === 1 ? "" : "s"}`,
        tone: "warn" as const,
        suggested: null,
      };
    }
    return { verdict: "In flight", tone: "muted" as const, suggested: null };
  }, [selected, overdueTasks, handoffReadiness, assignmentsCount, openTasks, tasks.length, checklistDone, checklistTotal]);

  const handleLifecycleMove = async (next: string) => {
    if (!selected) return;
    const { error } = await supabase
      .from("customers")
      .update({ lifecycle_state: next, lifecycle_updated_at: new Date().toISOString() })
      .eq("id", selected.id);
    if (error) {
      toast({
        title: "Could not move lifecycle",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Lifecycle updated",
        description: `${selected.business_name || selected.full_name} → ${next}`,
      });
      await refreshCustomer(selected.id);
    }
    setPendingMove(null);
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 text-xs text-muted-foreground">
        Loading implementation cases…
      </div>
    );
  }

  if (customers.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 text-xs text-muted-foreground">
        No active customers. Create a customer or move one into the implementation lifecycle to begin.
      </div>
    );
  }

  return (
    <div className="space-y-4 min-w-0">
      {/* Case header / picker */}
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 min-w-0">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wider text-primary mb-1 flex items-center gap-2 flex-wrap">
              Implementation case file
              {selected?.is_demo_account && (
                <span className="text-[10px] px-1.5 py-0.5 rounded border border-border text-muted-foreground normal-case tracking-normal">
                  demo account
                </span>
              )}
            </div>
            <div className="text-base text-foreground font-medium truncate">
              {selected?.business_name || selected?.full_name || "Select a case"}
            </div>
            {selected && (
              <div className="text-[11px] text-muted-foreground mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
                <span>
                  Lifecycle: <span className="text-foreground">{selected.lifecycle_state}</span>
                </span>
                <span>·</span>
                <span>
                  Stage: <span className="text-foreground">{selected.stage}</span>
                </span>
                {selected.implementation_payment_status && selected.implementation_payment_status !== "unpaid" && (
                  <>
                    <span>·</span>
                    <span>
                      Payment: <span className="text-foreground">{selected.implementation_payment_status}</span>
                    </span>
                  </>
                )}
              </div>
            )}
            {selected && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {selected.package_full_bundle && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded border border-primary/40 text-primary">Full bundle</span>
                )}
                {selected.package_implementation && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded border border-border text-foreground">Implementation</span>
                )}
                {selected.package_diagnostic && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded border border-border text-muted-foreground">Diagnostic</span>
                )}
                {selected.package_ongoing_support && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded border border-border text-foreground">Ongoing support</span>
                )}
                {selected.package_addons && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded border border-border text-muted-foreground">Add-ons</span>
                )}
                {selected.package_revenue_tracker && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded border border-secondary/40 text-secondary">Revenue Tracker</span>
                )}
                {!selected.package_implementation &&
                  !selected.package_full_bundle &&
                  !selected.package_diagnostic &&
                  !selected.package_ongoing_support &&
                  !selected.package_addons &&
                  !selected.package_revenue_tracker && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded border border-dashed border-border text-muted-foreground">
                      No packages on file
                    </span>
                  )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger className="h-9 w-72 max-w-full text-xs">
                <SelectValue placeholder="Select a client…" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {(c.business_name || c.full_name) +
                      (c.is_demo_account ? "  · demo" : "") +
                      (c.lifecycle_state === "implementation" ? "  · implementation" : "") +
                      (c.package_full_bundle ? "  · full bundle" : "")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selected && (
              <Link
                to={`/admin/customers/${selected.id}`}
                className="text-[11px] text-primary hover:text-secondary inline-flex items-center gap-1"
              >
                Open record <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </div>
        </div>
      </div>

      {caseLoading && (
        <div className="text-[11px] text-muted-foreground">Refreshing case data…</div>
      )}

      {/* Handoff readiness */}
      <SectionCard
        title="Diagnostic → implementation handoff"
        hint="Whether this client is actually ready for rollout"
      >
        <div className="flex items-start justify-between gap-3 p-3 rounded-md border border-border bg-muted/20">
          <div className="min-w-0">
            <div className="text-xs text-foreground">{handoffReadiness.detail}</div>
            <div className="text-[11px] text-foreground/70 mt-1 italic">
              Next: {handoffReadiness.nextAction}
            </div>
          </div>
          <StatusDot status={handoffReadiness.status} />
        </div>
      </SectionCard>

      {/* Two-column body */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-w-0">
        {/* Rollout areas */}
        <SectionCard
          title="Rollout execution"
          hint="Where this implementation stands across the operational backbone"
        >
          <ul className="space-y-2">
            {rolloutAreas.map((a) => {
              const inner = (
                <div className="flex items-start justify-between gap-3 p-2.5 rounded-md border border-border bg-muted/20 hover:border-primary/30 transition-colors">
                  <div className="min-w-0">
                    <div className="text-xs text-foreground">{a.label}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">{a.detail}</div>
                    <div className="text-[11px] text-foreground/70 mt-1 italic">Next: {a.nextAction}</div>
                  </div>
                  <StatusDot status={a.status} />
                </div>
              );
              return <li key={a.key}>{a.to ? <Link to={a.to}>{inner}</Link> : inner}</li>;
            })}
          </ul>
        </SectionCard>

        {/* Tasks & checklist in context */}
        <SectionCard
          title="Tasks in this case"
          hint="Customer tasks and the implementation checklist (filtered by client)"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
            <Stat label="Open" value={openTasks} />
            <Stat label="Overdue" value={overdueTasks} bad={overdueTasks > 0} />
            <Stat label="Blocked / waiting" value={blockedTasks} bad={blockedTasks > 0} />
            <Stat label="Completed" value={completedTasks} />
          </div>
          <div className="space-y-2">
            {tasks.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">
                No tasks for this client yet. Create implementation tasks in{" "}
                <Link to="/admin/tasks" className="text-primary hover:text-secondary">
                  Tasks
                </Link>
                .
              </p>
            ) : (
              tasks.slice(0, 5).map((t) => {
                const overdue = t.status === "open" && t.due_date && new Date(t.due_date) < today;
                return (
                  <Link
                    key={t.id}
                    to="/admin/tasks"
                    className="flex items-start justify-between gap-3 p-2.5 rounded-md border border-border bg-muted/20 hover:border-primary/30 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="text-xs text-foreground truncate">{t.title}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {t.due_date ? `Due ${t.due_date}` : "No due date"}
                      </div>
                    </div>
                    <span
                      className={`text-[11px] whitespace-nowrap ${
                        overdue
                          ? "text-destructive"
                          : t.status === "completed"
                          ? "text-[hsl(140_50%_60%)]"
                          : "text-muted-foreground"
                      }`}
                    >
                      {overdue ? "Overdue" : t.status}
                    </span>
                  </Link>
                );
              })
            )}
          </div>
          {checklistTotal > 0 && (
            <div className="mt-3 pt-3 border-t border-border">
              <div className="text-[11px] text-muted-foreground mb-1.5 inline-flex items-center gap-1">
                <ClipboardList className="h-3 w-3" />
                Implementation checklist
              </div>
              <div className="text-xs text-foreground">
                {checklistDone} of {checklistTotal} items complete
              </div>
              <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${(checklistDone / checklistTotal) * 100}%` }}
                />
              </div>
            </div>
          )}
        </SectionCard>

        {/* Tool assignment vs package */}
        <SectionCard
          title="Tool assignment vs. package"
          hint="Did the client buy access, and have we actually assigned it?"
        >
          <div className="grid grid-cols-2 gap-2 mb-3">
            <Stat label="Assigned tools" value={assignmentsCount} />
            <Stat label="Manual assignments" value={manualAssignments} />
          </div>
          <ul className="space-y-2 text-[11px]">
            <li className="flex items-start justify-between gap-3 p-2.5 rounded-md border border-border bg-muted/20">
              <div className="min-w-0">
                <div className="text-xs text-foreground inline-flex items-center gap-1">
                  <Wrench className="h-3 w-3" /> Implementation tooling
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  {selected?.package_implementation || selected?.package_full_bundle
                    ? "Implementation package present"
                    : "No implementation package"}
                </div>
              </div>
              <Link
                to="/admin/tool-distribution"
                className="text-[11px] text-primary hover:text-secondary inline-flex items-center gap-1 whitespace-nowrap"
              >
                Manage <ArrowRight className="h-3 w-3" />
              </Link>
            </li>
            <li className="flex items-start justify-between gap-3 p-2.5 rounded-md border border-dashed border-border bg-muted/20">
              <div className="min-w-0 flex items-start gap-2">
                <Lock className="h-3 w-3 text-secondary mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-xs text-foreground">Revenue Tracker (RCC)</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                    {selected?.package_revenue_tracker
                      ? "Package on file. Access stays separately assignable in Add-On / Monitoring."
                      : "Not in this client's package. Stays separately assignable as an add-on."}
                  </div>
                </div>
              </div>
              <Link
                to="/admin/add-on-monitoring"
                className="text-[11px] text-secondary hover:text-primary inline-flex items-center gap-1 whitespace-nowrap"
              >
                Add-Ons <ArrowRight className="h-3 w-3" />
              </Link>
            </li>
            {selected?.package_addons && (
              <li className="flex items-start justify-between gap-3 p-2.5 rounded-md border border-border bg-muted/20">
                <div className="min-w-0">
                  <div className="text-xs text-foreground">Other add-ons</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    Confirm scope and assign through Tool Distribution
                  </div>
                </div>
                <Link
                  to="/admin/tool-distribution"
                  className="text-[11px] text-primary hover:text-secondary inline-flex items-center gap-1 whitespace-nowrap"
                >
                  Open <ArrowRight className="h-3 w-3" />
                </Link>
              </li>
            )}
          </ul>
        </SectionCard>

        {/* Completion / lifecycle */}
        <SectionCard
          title="Completion & lifecycle"
          hint="Where this client should go next, and a controlled move action"
        >
          <div className="p-3 rounded-md border border-border bg-muted/20 mb-3">
            <div
              className={`text-xs ${
                completion.tone === "ok"
                  ? "text-[hsl(140_50%_60%)]"
                  : completion.tone === "warn"
                  ? "text-[hsl(40_90%_60%)]"
                  : "text-muted-foreground"
              } inline-flex items-center gap-1`}
            >
              {completion.tone === "ok" ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : completion.tone === "warn" ? (
                <AlertTriangle className="h-3.5 w-3.5" />
              ) : (
                <CircleDashed className="h-3.5 w-3.5" />
              )}
              {completion.verdict}
            </div>
            {completion.suggested && (
              <div className="text-[11px] text-muted-foreground mt-1">
                Suggested next lifecycle: <span className="text-foreground">{completion.suggested}</span>
              </div>
            )}
          </div>
          <div className="text-[11px] text-muted-foreground mb-2 inline-flex items-center gap-1">
            <PackageCheck className="h-3 w-3" />
            Move lifecycle (does not change packages or payments)
          </div>
          <div className="grid grid-cols-2 gap-2">
            {LIFECYCLE_TARGETS.map((t) => {
              const isCurrent = selected?.lifecycle_state === t.value;
              return (
                <Button
                  key={t.value}
                  variant="outline"
                  size="sm"
                  disabled={isCurrent}
                  onClick={() => setPendingMove(t.value)}
                  className="justify-start text-xs h-auto py-2"
                >
                  <div className="text-left min-w-0">
                    <div className="truncate">
                      {t.label}
                      {isCurrent && <span className="text-muted-foreground ml-1">· current</span>}
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate">{t.hint}</div>
                  </div>
                </Button>
              );
            })}
          </div>
          <div className="mt-3 flex items-center gap-3 flex-wrap">
            {selected && (
              <Link
                to={`/admin/customers/${selected.id}`}
                className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
              >
                <ExternalLink className="h-3 w-3" /> Customer record
              </Link>
            )}
            <Link
              to="/admin/client-management"
              className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              <Inbox className="h-3 w-3" /> Client management
            </Link>
          </div>
        </SectionCard>
      </div>

      <AlertDialog open={!!pendingMove} onOpenChange={(o) => !o && setPendingMove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move lifecycle to {pendingMove}?</AlertDialogTitle>
            <AlertDialogDescription>
              This updates <span className="text-foreground">{selected?.business_name || selected?.full_name}</span>{" "}
              from <span className="text-foreground">{selected?.lifecycle_state}</span> to{" "}
              <span className="text-foreground">{pendingMove}</span>. Packages, payments, and tool
              assignments are not changed by this action.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => pendingMove && handleLifecycleMove(pendingMove)}>
              Confirm move
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}