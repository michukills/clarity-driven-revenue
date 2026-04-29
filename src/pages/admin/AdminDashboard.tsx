import { forwardRef, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PortalShell } from "@/components/portal/PortalShell";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Users,
  UserPlus,
  AlertTriangle,
  AlertCircle,
  FileText,
  CheckCircle2,
  Clock,
  Activity,
  Briefcase,
  Wrench,
  Radar,
  History,
  ArrowRight,
  Bell,
  Inbox,
  TrendingUp,
  Hourglass,
  ShieldAlert,
  CalendarClock,
  BookOpen,
  Upload as UploadIcon,
  Sparkles,
  ListChecks,
  CalendarCheck2,
  PlusCircle,
} from "lucide-react";
import { formatDate } from "@/lib/portal";
import { buildIntakeProgress, loadIntakeAnswersFor, type IntakeAnswerRow } from "@/lib/diagnostics/intake";
import { AdminMatrixAlerts } from "@/components/admin/AdminMatrixAlerts";
import { AdminRccAlertsPanel } from "@/components/admin/AdminRccAlertsPanel";
import { AdminRgsReviewQueuePanel } from "@/components/admin/AdminRgsReviewQueuePanel";
import { AdminNewAccountsPanel } from "@/components/admin/AdminNewAccountsPanel";
import { AdminBillingAlerts } from "@/components/admin/AdminBillingAlerts";
import { AdminServiceRequestsAlert } from "@/components/admin/AdminServiceRequestsAlert";
import { AdminOutcomeReviewAlert } from "@/components/admin/AdminOutcomeReviewAlert";
import { IndustryVerificationAlert } from "@/components/admin/IndustryVerificationAlert";
import { AdminImpactLedgerPanel } from "@/components/admin/AdminImpactLedgerPanel";
import { adminAccountLinks } from "@/lib/adminAccountLinks";
import {
  ACCOUNT_KIND_LABEL,
  ACCOUNT_KIND_TONE,
  getCustomerAccountKind,
  isCustomerFlowAccount,
} from "@/lib/customers/accountKind";

// ---------- types ----------
type Customer = {
  id: string;
  full_name: string;
  business_name: string | null;
  email: string;
  user_id: string | null;
  stage: string;
  track: string;
  payment_status: string;
  implementation_status: string;
  monitoring_status: string;
  monitoring_tier: string;
  next_action: string | null;
  last_activity_at: string;
  created_at: string;
  archived_at: string | null;
  portal_unlocked: boolean;
  is_demo_account?: boolean | null;
  account_kind?: string | null;
};

type WeeklyCheckin = {
  id: string;
  customer_id: string;
  week_start: string;
  week_end: string;
  cash_concern_level: string | null;
  process_blocker: string | null;
  people_blocker: string | null;
  sales_blocker: string | null;
  cash_blocker: string | null;
  owner_bottleneck: string | null;
  repeated_issue: boolean;
  request_rgs_review: boolean;
  created_at: string;
};

type ReportRow = {
  id: string;
  customer_id: string;
  report_type: string;
  status: string;
  health_score: number | null;
  period_start: string;
  period_end: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

type TimelineEvent = {
  id: string;
  customer_id: string;
  event_type: string;
  title: string;
  detail: string | null;
  created_at: string;
};

type ActivityRow = {
  id: string;
  customer_id: string | null;
  action: string;
  created_at: string;
  details: any;
};

type UploadRow = {
  id: string;
  customer_id: string;
  file_name: string;
  created_at: string;
};

type TaskRow = {
  id: string;
  customer_id: string;
  title: string;
  status: string;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
};

type PendingSignup = {
  user_id: string;
  email: string;
  full_name: string | null;
  created_at: string;
};

// ---------- priority ----------
type Priority = {
  customerId: string;
  reason: string;
  severity: "critical" | "warning" | "info";
  recommendedAction: string;
  href: string;
};

const SEV_RANK: Record<Priority["severity"], number> = { critical: 0, warning: 1, info: 2 };

const ARCHIVED_STAGES = new Set(["closed", "implementation_complete"]);

export default function AdminDashboard() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [checkins, setCheckins] = useState<WeeklyCheckin[]>([]);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [uploads, setUploads] = useState<UploadRow[]>([]);
  const [pending, setPending] = useState<PendingSignup[]>([]);
  const [assignmentCounts, setAssignmentCounts] = useState<Record<string, number>>({});
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [diagnosticRunCounts, setDiagnosticRunCounts] = useState<Record<string, number>>({});
  const [diagnosticStartedAt, setDiagnosticStartedAt] = useState<Record<string, string>>({});
  const [intakeStatusByCustomer, setIntakeStatusByCustomer] = useState<Record<string, "missing" | "partial" | "complete">>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [c, w, r, tl, al, up, ps, ra, tk] = await Promise.all([
        supabase
          .from("customers")
          .select(
            "id, full_name, business_name, email, user_id, stage, track, payment_status, implementation_status, monitoring_status, monitoring_tier, next_action, last_activity_at, created_at, archived_at, portal_unlocked, is_demo_account, account_kind",
          )
          .is("archived_at", null)
          .order("last_activity_at", { ascending: false }),
        supabase
          .from("weekly_checkins")
          .select(
            "id, customer_id, week_start, week_end, cash_concern_level, process_blocker, people_blocker, sales_blocker, cash_blocker, owner_bottleneck, repeated_issue, request_rgs_review, created_at",
          )
          .order("week_end", { ascending: false })
          .limit(500),
        supabase
          .from("business_control_reports")
          .select(
            "id, customer_id, report_type, status, health_score, period_start, period_end, published_at, created_at, updated_at",
          )
          .order("updated_at", { ascending: false })
          .limit(300),
        supabase
          .from("customer_timeline")
          .select("id, customer_id, event_type, title, detail, created_at")
          .order("created_at", { ascending: false })
          .limit(15),
        (supabase as any)
          .from("activity_log")
          .select("id, customer_id, action, created_at, details")
          .order("created_at", { ascending: false })
          .limit(15),
        supabase
          .from("customer_uploads")
          .select("id, customer_id, file_name, created_at")
          .order("created_at", { ascending: false })
          .limit(10),
        adminAccountLinks.listUnlinkedSignups().then(
          (data) => ({ data }),
          () => ({ data: [] as PendingSignup[] }),
        ),
        supabase.from("resource_assignments").select("customer_id"),
        supabase
          .from("customer_tasks")
          .select("id, customer_id, title, status, due_date, completed_at, created_at")
          .order("created_at", { ascending: false })
          .limit(200),
      ]);

      setCustomers((c.data as Customer[]) || []);
      setCheckins((w.data as WeeklyCheckin[]) || []);
      setReports((r.data as ReportRow[]) || []);
      setTimeline((tl.data as TimelineEvent[]) || []);
      setActivity(((al as any).data as ActivityRow[]) || []);
      setUploads((up.data as UploadRow[]) || []);
      setPending((ps.data as PendingSignup[]) || []);
      setTasks((tk.data as TaskRow[]) || []);

      const counts: Record<string, number> = {};
      ((ra.data as { customer_id: string }[]) || []).forEach((row) => {
        counts[row.customer_id] = (counts[row.customer_id] || 0) + 1;
      });
      setAssignmentCounts(counts);

      // Diagnostic engine run counts per customer (P6 Pass A signal)
      const diagnosticEngineKeys = new Set([
        "rgs_stability_scorecard",
        "revenue_leak_finder",
        "buyer_persona_tool",
        "customer_journey_mapper",
        "process_breakdown_tool",
      ]);
      const dxIds = ((c.data as Customer[]) || [])
        .filter((cu) => cu.stage === "diagnostic_paid" || cu.stage === "diagnostic_in_progress")
        .map((cu) => cu.id);
      if (dxIds.length > 0) {
        const { data: runs } = await supabase
          .from("tool_runs")
          .select("customer_id, tool_key")
          .in("customer_id", dxIds);
        const counts2: Record<string, number> = {};
        ((runs as { customer_id: string; tool_key: string }[]) || []).forEach((r) => {
          if (r.customer_id && diagnosticEngineKeys.has(r.tool_key))
            counts2[r.customer_id] = (counts2[r.customer_id] || 0) + 1;
        });
        setDiagnosticRunCounts(counts2);
        // Use the customer's last_activity_at as a proxy for "diagnostic started".
        // Cheap signal — no schema change.
        const started: Record<string, string> = {};
        ((c.data as Customer[]) || []).forEach((cu) => {
          if (cu.stage === "diagnostic_paid" || cu.stage === "diagnostic_in_progress")
            started[cu.id] = cu.last_activity_at;
        });
        setDiagnosticStartedAt(started);
      }

      // Intake status for diagnostic-stage clients
      const dxAllIds = ((c.data as Customer[]) || [])
        .filter((cu) =>
          ["diagnostic_paid", "diagnostic_in_progress", "diagnostic_delivered", "decision_pending"].includes(cu.stage),
        )
        .map((cu) => cu.id);
      if (dxAllIds.length > 0) {
        const ans = await loadIntakeAnswersFor(dxAllIds).catch(() => [] as IntakeAnswerRow[]);
        const map: Record<string, "missing" | "partial" | "complete"> = {};
        for (const cid of dxAllIds) {
          map[cid] = buildIntakeProgress(ans.filter((a) => a.customer_id === cid)).status;
        }
        setIntakeStatusByCustomer(map);
      }

      setLoading(false);
    })();
  }, []);

  const customerById = (id: string | null | undefined) =>
    id ? customers.find((c) => c.id === id) : undefined;

  // Internal admin records (RGS's own BCC ledger) must not appear in the
  // client flow. Demo/test records can remain visible with labels, but only
  // real client records should drive operating signals.
  const flowCustomers = useMemo(
    () => customers.filter(isCustomerFlowAccount),
    [customers],
  );

  const operatingCustomers = useMemo(
    () => flowCustomers.filter((c) => getCustomerAccountKind(c) === "client"),
    [flowCustomers],
  );

  // ---------- derived: latest check-in per customer ----------
  const latestCheckinByCustomer = useMemo(() => {
    const map = new Map<string, WeeklyCheckin>();
    for (const wc of checkins) {
      const prev = map.get(wc.customer_id);
      if (!prev || new Date(wc.week_end) > new Date(prev.week_end)) {
        map.set(wc.customer_id, wc);
      }
    }
    return map;
  }, [checkins]);

  // ---------- derived: latest report per customer ----------
  const latestReportByCustomer = useMemo(() => {
    const map = new Map<string, ReportRow>();
    for (const rep of reports) {
      const prev = map.get(rep.customer_id);
      if (!prev || new Date(rep.updated_at) > new Date(prev.updated_at)) {
        map.set(rep.customer_id, rep);
      }
    }
    return map;
  }, [reports]);

  // ---------- portfolio counts ----------
  const portfolio = useMemo(() => {
    const now = new Date();
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 86400_000);
    const tenDaysAgo = new Date(now.getTime() - 10 * 86400_000);

    const active = flowCustomers.filter((c) => c.stage !== "lead" && !ARCHIVED_STAGES.has(c.stage));
    const reportsDue = operatingCustomers.filter((c) => {
      const last = latestReportByCustomer.get(c.id);
      if (!last) return c.monitoring_status === "active";
      const ageDays = (now.getTime() - new Date(last.period_end).getTime()) / 86400_000;
      return ageDays > 35; // monthly window passed
    });
    const overdueCheckins = operatingCustomers.filter((c) => {
      if (!c.portal_unlocked) return false;
      const last = latestCheckinByCustomer.get(c.id);
      if (!last) return c.monitoring_status === "active";
      return new Date(last.week_end) < tenDaysAgo;
    });
    const criticalSignals = operatingCustomers.filter((c) => {
      const last = latestCheckinByCustomer.get(c.id);
      if (!last) return false;
      return (
        last.cash_concern_level === "high" ||
        last.cash_concern_level === "critical" ||
        last.repeated_issue ||
        last.request_rgs_review
      );
    });
    const needsAction = new Set<string>();
    operatingCustomers.forEach((c) => {
      const last = latestCheckinByCustomer.get(c.id);
      if (last?.request_rgs_review) needsAction.add(c.id);
      if (last?.repeated_issue) needsAction.add(c.id);
      const rep = latestReportByCustomer.get(c.id);
      if (rep?.status === "draft" && new Date(rep.updated_at) < fourteenDaysAgo) needsAction.add(c.id);
      if (c.portal_unlocked && (assignmentCounts[c.id] ?? 0) === 0) needsAction.add(c.id);
    });

    return {
      total: flowCustomers.length,
      active: active.length,
      pending: pending.length,
      reportsDue: reportsDue.length,
      overdueCheckins: overdueCheckins.length,
      criticalSignals: criticalSignals.length,
      needsAction: needsAction.size,
    };
  }, [flowCustomers, operatingCustomers, latestCheckinByCustomer, latestReportByCustomer, pending, assignmentCounts]);

  // ---------- priority queue ----------
  const priorityQueue = useMemo<Priority[]>(() => {
    const items: Priority[] = [];
    const tenDaysAgo = new Date(Date.now() - 10 * 86400_000);
    const now = new Date();

    for (const c of operatingCustomers) {
      const last = latestCheckinByCustomer.get(c.id);
      const rep = latestReportByCustomer.get(c.id);

      // Critical cash signal
      if (last && (last.cash_concern_level === "critical" || last.cash_concern_level === "high")) {
        items.push({
          customerId: c.id,
          reason: `${last.cash_concern_level === "critical" ? "Critical" : "High"} cash concern in latest check-in`,
          severity: last.cash_concern_level === "critical" ? "critical" : "warning",
          recommendedAction: "Review cash position and intervene",
          href: `/admin/clients/${c.id}/business-control`,
        });
      }
      // Client requested RGS review
      if (last?.request_rgs_review) {
        items.push({
          customerId: c.id,
          reason: "Client requested RGS review in latest check-in",
          severity: "critical",
          recommendedAction: "Open business control review and respond",
          href: `/admin/clients/${c.id}/business-control`,
        });
      }
      // Repeated blocker
      if (last?.repeated_issue) {
        items.push({
          customerId: c.id,
          reason: "Repeated blocker flagged in latest check-in",
          severity: "warning",
          recommendedAction: "Investigate root cause with client",
          href: `/admin/clients/${c.id}/business-control`,
        });
      }
      // Owner dependency
      if (last?.owner_bottleneck && last.owner_bottleneck.trim().length > 0) {
        items.push({
          customerId: c.id,
          reason: "Owner-dependency bottleneck noted",
          severity: "info",
          recommendedAction: "Discuss delegation / SOP opportunity",
          href: `/admin/clients/${c.id}/business-control`,
        });
      }
      // Overdue check-in (portal-unlocked monitored client)
      if (c.portal_unlocked && c.monitoring_status === "active") {
        if (!last || new Date(last.week_end) < tenDaysAgo) {
          items.push({
            customerId: c.id,
            reason: last
              ? `No weekly check-in since ${formatDate(last.week_end)}`
              : "No weekly check-in recorded yet",
            severity: "warning",
            recommendedAction: "Nudge client or contact directly",
            href: `/admin/customers/${c.id}`,
          });
        }
      }
      // Unpublished draft report aging
      if (rep && rep.status === "draft") {
        const ageDays = (now.getTime() - new Date(rep.updated_at).getTime()) / 86400_000;
        if (ageDays > 7) {
          items.push({
            customerId: c.id,
            reason: `Draft ${rep.report_type} report ${Math.round(ageDays)}d old`,
            severity: "warning",
            recommendedAction: "Review and publish report",
            href: `/admin/reports/${rep.id}`,
          });
        }
      }
      // Missing tool assignment for unlocked client
      if (c.portal_unlocked && (assignmentCounts[c.id] ?? 0) === 0) {
        items.push({
          customerId: c.id,
          reason: "Portal unlocked but no tools assigned",
          severity: "warning",
          recommendedAction: "Assign at least one tool",
          href: `/admin/customers/${c.id}`,
        });
      }
    }

    items.sort((a, b) => SEV_RANK[a.severity] - SEV_RANK[b.severity]);
    return items.slice(0, 12);
  }, [operatingCustomers, latestCheckinByCustomer, latestReportByCustomer, assignmentCounts]);

  // ---------- RGS Action Inbox ----------
  const inbox = useMemo(() => {
    const draftReports = reports.filter((r) => r.status === "draft");
    const reviewReports = reports.filter((r) => r.status === "review" || r.status === "in_review");
    const reviewRequests = operatingCustomers.filter((c) => latestCheckinByCustomer.get(c.id)?.request_rgs_review);
    const repeatedBlockers = operatingCustomers.filter((c) => latestCheckinByCustomer.get(c.id)?.repeated_issue);
    const missingTools = operatingCustomers.filter(
      (c) => c.portal_unlocked && (assignmentCounts[c.id] ?? 0) === 0,
    );
    const criticalRisk = operatingCustomers.filter((c) => {
      const last = latestCheckinByCustomer.get(c.id);
      return last?.cash_concern_level === "critical" || last?.cash_concern_level === "high";
    });

    return {
      pendingApprovals: pending.length,
      reviewReports: reviewReports.length,
      draftReports: draftReports.length,
      missingTools: missingTools.length,
      reviewRequests: reviewRequests.length,
      repeatedBlockers: repeatedBlockers.length,
      criticalRisk: criticalRisk.length,
    };
  }, [reports, pending, operatingCustomers, latestCheckinByCustomer, assignmentCounts]);

  // ---------- Operating Rhythm (this week / this month) ----------
  const operatingRhythm = useMemo(() => {
    const now = Date.now();
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const tenDaysAgo = new Date(now - 10 * 86400_000);

    const checkinsThisWeek = checkins.filter((w) => new Date(w.created_at) >= startOfWeek);
    const missingCheckin = operatingCustomers
      .filter((c) => c.portal_unlocked && c.monitoring_status === "active")
      .filter((c) => {
        const last = latestCheckinByCustomer.get(c.id);
        return !last || new Date(last.week_end) < tenDaysAgo;
      });
    const reportsDueThisMonth = operatingCustomers.filter((c) => {
      const last = latestReportByCustomer.get(c.id);
      if (!last) return c.monitoring_status === "active";
      const ageDays = (now - new Date(last.period_end).getTime()) / 86400_000;
      return ageDays > 25;
    });
    const draftReports = reports.filter((r) => r.status === "draft");
    const reviewRequests = operatingCustomers.filter(
      (c) => latestCheckinByCustomer.get(c.id)?.request_rgs_review,
    );
    const criticalSignals = operatingCustomers.filter((c) => {
      const last = latestCheckinByCustomer.get(c.id);
      return (
        last?.cash_concern_level === "critical" ||
        last?.cash_concern_level === "high" ||
        last?.repeated_issue
      );
    });
    const recentlyCompletedTasks = tasks
      .filter(
        (t) =>
          (t.status === "done" || t.status === "completed") &&
          t.completed_at &&
          new Date(t.completed_at) >= startOfMonth,
      )
      .sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime())
      .slice(0, 5);
    const recentlyPublishedReports = reports
      .filter((r) => r.status === "published" && r.published_at)
      .sort((a, b) => new Date(b.published_at!).getTime() - new Date(a.published_at!).getTime())
      .slice(0, 5);

    return {
      checkinsThisWeek,
      missingCheckin,
      reportsDueThisMonth,
      draftReports,
      reviewRequests,
      criticalSignals,
      recentlyCompletedTasks,
      recentlyPublishedReports,
    };
  }, [operatingCustomers, checkins, reports, tasks, latestCheckinByCustomer, latestReportByCustomer]);

  // ---------- RGS Recommended Actions (richer, prioritized, with deep links) ----------
  type Recommendation = {
    key: string;
    customerId: string;
    signal: string;
    why: string;
    action: string;
    href: string;
    priorityRank: number; // lower = more urgent
    severity: "critical" | "warning" | "info";
  };
  const recommendedActions = useMemo<Recommendation[]>(() => {
    const now = Date.now();
    const tenDaysAgo = new Date(now - 10 * 86400_000);
    const items: Recommendation[] = [];

    for (const c of operatingCustomers) {
      const last = latestCheckinByCustomer.get(c.id);
      const rep = latestReportByCustomer.get(c.id);
      const tasksForC = tasks.filter((t) => t.customer_id === c.id);
      const overdueTask = tasksForC.find(
        (t) =>
          t.status !== "done" &&
          t.status !== "completed" &&
          t.due_date &&
          new Date(t.due_date) < new Date(),
      );

      // 1. Client requested RGS review
      if (last?.request_rgs_review) {
        items.push({
          key: `${c.id}-review`,
          customerId: c.id,
          signal: "Client requested RGS review",
          why: "Flagged in their latest weekly check-in.",
          action: "Review the latest check-in and follow up directly.",
          href: `/admin/clients/${c.id}/business-control`,
          priorityRank: 1,
          severity: "critical",
        });
      }
      // 2. Critical cash concern
      if (last?.cash_concern_level === "critical") {
        items.push({
          key: `${c.id}-cash-crit`,
          customerId: c.id,
          signal: "Critical cash concern",
          why: "Latest check-in marked cash position as critical.",
          action: "Confirm runway, then prepare a cash-control conversation.",
          href: `/admin/clients/${c.id}/business-control`,
          priorityRank: 2,
          severity: "critical",
        });
      } else if (last?.cash_concern_level === "high") {
        items.push({
          key: `${c.id}-cash-high`,
          customerId: c.id,
          signal: "High cash concern",
          why: "Cash flagged as high in their latest check-in.",
          action: "Review receivables and 30-day obligations together.",
          href: `/admin/clients/${c.id}/business-control`,
          priorityRank: 3,
          severity: "warning",
        });
      }
      // 3. Repeated blocker
      if (last?.repeated_issue) {
        items.push({
          key: `${c.id}-repeated`,
          customerId: c.id,
          signal: "Repeated blocker pattern",
          why: "The same issue has appeared in more than one weekly check-in.",
          action: "Investigate root cause with the client this week.",
          href: `/admin/clients/${c.id}/business-control`,
          priorityRank: 4,
          severity: "warning",
        });
      }
      // 4. Draft report older than 7 days
      if (rep && rep.status === "draft") {
        const ageDays = (now - new Date(rep.updated_at).getTime()) / 86400_000;
        if (ageDays > 7) {
          items.push({
            key: `${c.id}-draft`,
            customerId: c.id,
            signal: `Draft ${rep.report_type} report ${Math.round(ageDays)}d old`,
            why: "An unpublished report has been sitting in draft.",
            action: "Review and publish, or archive if no longer relevant.",
            href: `/admin/reports/${rep.id}`,
            priorityRank: 5,
            severity: "warning",
          });
        }
      }
      // 5. Missing weekly check-in for monitored client
      if (c.portal_unlocked && c.monitoring_status === "active") {
        if (!last || new Date(last.week_end) < tenDaysAgo) {
          items.push({
            key: `${c.id}-checkin-missing`,
            customerId: c.id,
            signal: last
              ? `No check-in since ${formatDate(last.week_end)}`
              : "No weekly check-in on file",
            why: "Monitored client without a recent weekly check-in.",
            action: "Nudge the client or schedule a quick touchpoint.",
            href: `/admin/customers/${c.id}`,
            priorityRank: 6,
            severity: "warning",
          });
        }
      }
      // 6. Portal unlocked but no tools assigned
      if (c.portal_unlocked && (assignmentCounts[c.id] ?? 0) === 0) {
        items.push({
          key: `${c.id}-no-tools`,
          customerId: c.id,
          signal: "Portal unlocked, no tools assigned",
          why: "Client has access but no Diagnostic Engines or Control Systems yet.",
          action: "Assign at least one tool from Tool Distribution.",
          href: `/admin/customers/${c.id}`,
          priorityRank: 7,
          severity: "info",
        });
      }
      // 7. Open client task past due
      if (overdueTask) {
        items.push({
          key: `${c.id}-task-${overdueTask.id}`,
          customerId: c.id,
          signal: `Overdue task: ${overdueTask.title}`,
          why: `Was due ${formatDate(overdueTask.due_date!)}.`,
          action: "Confirm status with client, then close or reschedule.",
          href: `/admin/customers/${c.id}`,
          priorityRank: 8,
          severity: "info",
        });
      }
      // 8. Diagnostic stalled — paid/in-progress, no engine run after 7 days
      if (c.stage === "diagnostic_paid" || c.stage === "diagnostic_in_progress") {
        const runs = diagnosticRunCounts[c.id] ?? 0;
        const startedIso = diagnosticStartedAt[c.id];
        const ageDays = startedIso
          ? (now - new Date(startedIso).getTime()) / 86400_000
          : 0;
        if (runs === 0 && ageDays > 7) {
          items.push({
            key: `${c.id}-dx-stalled`,
            customerId: c.id,
            signal: `Diagnostic stalled · ${Math.round(ageDays)}d, no engine runs`,
            why: "Client is in a diagnostic stage but no Diagnostic Engine™ has been run yet.",
            action: "Open the client and start the first Diagnostic Engine™.",
            href: `/admin/customers/${c.id}`,
            priorityRank: 5,
            severity: "warning",
          });
        }
      }
      // 9. Diagnostic intake missing/partial after diagnostic has started
      if (
        c.stage === "diagnostic_paid" ||
        c.stage === "diagnostic_in_progress" ||
        c.stage === "diagnostic_delivered" ||
        c.stage === "decision_pending"
      ) {
        const intakeStatus = intakeStatusByCustomer[c.id];
        if (intakeStatus === "missing") {
          items.push({
            key: `${c.id}-intake-missing`,
            customerId: c.id,
            signal: "Diagnostic intake not started",
            why: "Client is in a diagnostic stage but has not submitted any intake answers.",
            action: "Request missing diagnostic intake from the client.",
            href: `/admin/customers/${c.id}`,
            priorityRank: 4,
            severity: "warning",
          });
        } else if (intakeStatus === "partial") {
          items.push({
            key: `${c.id}-intake-partial`,
            customerId: c.id,
            signal: "Diagnostic intake partial",
            why: "Client has started but not finished the diagnostic intake.",
            action: "Review submitted diagnostic intake and follow up on missing sections.",
            href: `/admin/customers/${c.id}`,
            priorityRank: 6,
            severity: "info",
          });
        }
      }
    }

    items.sort((a, b) => a.priorityRank - b.priorityRank);
    return items.slice(0, 10);
  }, [operatingCustomers, latestCheckinByCustomer, latestReportByCustomer, tasks, assignmentCounts, diagnosticRunCounts, diagnosticStartedAt, intakeStatusByCustomer]);

  // ---------- Recent activity (merged) ----------
  const mergedActivity = useMemo(() => {
    const items: { id: string; ts: string; title: string; detail?: string; href?: string }[] = [];
    timeline.forEach((t) => {
      const c = customerById(t.customer_id);
      items.push({
        id: `tl-${t.id}`,
        ts: t.created_at,
        title: t.title,
        detail: c ? c.business_name || c.full_name : undefined,
        href: c ? `/admin/customers/${c.id}` : undefined,
      });
    });
    activity.forEach((a) => {
      const c = customerById(a.customer_id);
      items.push({
        id: `al-${a.id}`,
        ts: a.created_at,
        title: humanizeAction(a.action),
        detail: c ? c.business_name || c.full_name : undefined,
        href: c ? `/admin/customers/${c.id}` : undefined,
      });
    });
    uploads.forEach((u) => {
      const c = customerById(u.customer_id);
      items.push({
        id: `up-${u.id}`,
        ts: u.created_at,
        title: `File uploaded: ${u.file_name}`,
        detail: c ? c.business_name || c.full_name : undefined,
        href: `/admin/files`,
      });
    });
    items.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
    return items.slice(0, 10);
  }, [timeline, activity, uploads, customers]);

  // ---------- Monitoring snapshot ----------
  const monitoring = useMemo(() => {
    const tiers: Record<string, number> = {};
    const statuses: Record<string, number> = {};
    operatingCustomers.forEach((c) => {
      tiers[c.monitoring_tier || "none"] = (tiers[c.monitoring_tier || "none"] || 0) + 1;
      statuses[c.monitoring_status || "not_active"] =
        (statuses[c.monitoring_status || "not_active"] || 0) + 1;
    });
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const fourteenDaysAgo = new Date(Date.now() - 14 * 86400_000);

    const publishedThisMonth = reports.filter(
      (r) => r.status === "published" && r.published_at && new Date(r.published_at) >= startOfMonth,
    ).length;
    const reportsDueThisMonth = operatingCustomers.filter((c) => {
      const last = latestReportByCustomer.get(c.id);
      if (!last) return c.monitoring_status === "active";
      const ageDays = (Date.now() - new Date(last.period_end).getTime()) / 86400_000;
      return ageDays > 25;
    }).length;
    const checkinsThisWeek = checkins.filter((w) => new Date(w.created_at) >= startOfWeek).length;
    const inactiveClients = operatingCustomers.filter(
      (c) => c.last_activity_at && new Date(c.last_activity_at) < fourteenDaysAgo && c.portal_unlocked,
    ).length;

    return { tiers, statuses, publishedThisMonth, reportsDueThisMonth, checkinsThisWeek, inactiveClients };
  }, [operatingCustomers, reports, checkins, latestReportByCustomer]);

  // ---------- P13 — metric tile drill-down ----------
  // Reuse the SAME predicates as `portfolio` so tile counts and drill-down
  // lists never diverge. Internal admin records are excluded from flow;
  // demo/test records are labeled, while operating signal tiles use only
  // real clients via `operatingCustomers`.
  type TileKey =
    | "total"
    | "active"
    | "reportsDue"
    | "overdueCheckins"
    | "criticalSignals"
    | "needsAction";

  const [drillTile, setDrillTile] = useState<TileKey | null>(null);

  const tileLists = useMemo(() => {
    const now = new Date();
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 86400_000);
    const tenDaysAgo = new Date(now.getTime() - 10 * 86400_000);

    const activeList = flowCustomers.filter(
      (c) => c.stage !== "lead" && !ARCHIVED_STAGES.has(c.stage),
    );
    const reportsDueList = operatingCustomers.filter((c) => {
      const last = latestReportByCustomer.get(c.id);
      if (!last) return c.monitoring_status === "active";
      const ageDays = (now.getTime() - new Date(last.period_end).getTime()) / 86400_000;
      return ageDays > 35;
    });
    const overdueCheckinsList = operatingCustomers.filter((c) => {
      if (!c.portal_unlocked) return false;
      const last = latestCheckinByCustomer.get(c.id);
      if (!last) return c.monitoring_status === "active";
      return new Date(last.week_end) < tenDaysAgo;
    });
    const criticalSignalsList = operatingCustomers.filter((c) => {
      const last = latestCheckinByCustomer.get(c.id);
      if (!last) return false;
      return (
        last.cash_concern_level === "high" ||
        last.cash_concern_level === "critical" ||
        last.repeated_issue ||
        last.request_rgs_review
      );
    });
    const needsActionSet = new Set<string>();
    const needsActionReasons = new Map<string, string[]>();
    const addReason = (id: string, reason: string) => {
      needsActionSet.add(id);
      const arr = needsActionReasons.get(id) ?? [];
      arr.push(reason);
      needsActionReasons.set(id, arr);
    };
    operatingCustomers.forEach((c) => {
      const last = latestCheckinByCustomer.get(c.id);
      if (last?.request_rgs_review) addReason(c.id, "Client requested RGS review");
      if (last?.repeated_issue) addReason(c.id, "Repeated blocker flagged");
      const rep = latestReportByCustomer.get(c.id);
      if (rep?.status === "draft" && new Date(rep.updated_at) < fourteenDaysAgo) {
        addReason(c.id, `Draft ${rep.report_type} report aging`);
      }
      if (c.portal_unlocked && (assignmentCounts[c.id] ?? 0) === 0) {
        addReason(c.id, "Portal unlocked but no tools assigned");
      }
    });
    const needsActionList = operatingCustomers.filter((c) => needsActionSet.has(c.id));

    const reasonFor = (key: TileKey, c: Customer): string => {
      switch (key) {
        case "reportsDue": {
          const last = latestReportByCustomer.get(c.id);
          if (!last) return "No report on file (monitoring active)";
          return `Last period ended ${formatDate(last.period_end)} — monthly window passed`;
        }
        case "overdueCheckins": {
          const last = latestCheckinByCustomer.get(c.id);
          return last
            ? `Last check-in week ending ${formatDate(last.week_end)}`
            : "No weekly check-in recorded";
        }
        case "criticalSignals": {
          const last = latestCheckinByCustomer.get(c.id);
          if (!last) return "—";
          const parts: string[] = [];
          if (last.cash_concern_level === "critical") parts.push("Critical cash concern");
          else if (last.cash_concern_level === "high") parts.push("High cash concern");
          if (last.request_rgs_review) parts.push("Requested RGS review");
          if (last.repeated_issue) parts.push("Repeated blocker");
          return parts.join(" · ") || "Signal in latest check-in";
        }
        case "needsAction":
          return needsActionReasons.get(c.id)?.join(" · ") || "Action recommended";
        case "active":
          return `Stage: ${c.stage.replace(/_/g, " ")}`;
        case "total":
          return getCustomerAccountKind(c) === "client"
            ? `Stage: ${c.stage.replace(/_/g, " ")}`
            : `${getCustomerAccountKind(c).replace(/_/g, " ").toUpperCase()} · labeled non-client data`;
      }
    };

    return {
      total: { items: flowCustomers, reasonFor: (c: Customer) => reasonFor("total", c) },
      active: { items: activeList, reasonFor: (c: Customer) => reasonFor("active", c) },
      reportsDue: { items: reportsDueList, reasonFor: (c: Customer) => reasonFor("reportsDue", c) },
      overdueCheckins: {
        items: overdueCheckinsList,
        reasonFor: (c: Customer) => reasonFor("overdueCheckins", c),
      },
      criticalSignals: {
        items: criticalSignalsList,
        reasonFor: (c: Customer) => reasonFor("criticalSignals", c),
      },
      needsAction: {
        items: needsActionList,
        reasonFor: (c: Customer) => reasonFor("needsAction", c),
      },
    } as const;
  }, [
    flowCustomers,
    operatingCustomers,
    latestCheckinByCustomer,
    latestReportByCustomer,
    assignmentCounts,
  ]);

  const TILE_META: Record<
    TileKey,
    { title: string; description: string; href?: string; ctaLabel?: string }
  > = {
    total: {
      title: "Total Clients",
      description: "Client-flow records only. Demo/test records are labeled; internal admin records are excluded.",
      href: "/admin/customers",
      ctaLabel: "Open Customer Management",
    },
    active: {
      title: "Active Clients",
      description: "Clients past the lead stage and not archived.",
      href: "/admin/customers",
      ctaLabel: "Open Customer Management",
    },
    reportsDue: {
      title: "Reports Due",
      description:
        "Real (non-demo) clients whose latest report period ended more than 35 days ago, or who are actively monitored with no report on file.",
      href: "/admin/reports",
      ctaLabel: "Open Reports",
    },
    overdueCheckins: {
      title: "Overdue Check-ins",
      description:
        "Real (non-demo), portal-unlocked clients whose last weekly check-in is older than 10 days, or actively monitored with none recorded.",
      href: "/admin/customers",
      ctaLabel: "Open Customer Management",
    },
    criticalSignals: {
      title: "Critical Signals",
      description:
        "Real (non-demo) clients with high/critical cash concern, repeated blocker, or RGS review request in latest check-in.",
    },
    needsAction: {
      title: "Need RGS Action",
      description:
        "Real (non-demo) clients with a concrete action: review request, repeated blocker, aging draft report, or unlocked portal with no tools.",
    },
  };

  // ---------- render ----------
  return (
    <PortalShell variant="admin">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">RGS OS</div>
          <h1 className="mt-2 text-3xl text-foreground font-light tracking-tight">Command Center</h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl leading-relaxed">
            What's happening across the portfolio, what's at risk, and what needs RGS action next.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {loading && (
            <span className="text-xs text-muted-foreground">
              Loading Command Center…
            </span>
          )}
        </div>
      </div>

      {/* Portfolio Health */}
      <SectionLabel icon={Activity} label="Portfolio Health" />
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-10">
        <Stat
          label="Total Clients"
          value={portfolio.total}
          icon={Users}
          onClick={() => setDrillTile("total")}
        />
        <Stat
          label="Active"
          value={portfolio.active}
          icon={Briefcase}
          onClick={() => setDrillTile("active")}
        />
        <Stat
          label="Pending Accounts"
          value={portfolio.pending}
          icon={UserPlus}
          href="/admin/pending-accounts"
          tone={portfolio.pending > 0 ? "primary" : undefined}
        />
        <Stat
          label="Reports Due"
          value={portfolio.reportsDue}
          icon={FileText}
          onClick={() => setDrillTile("reportsDue")}
          tone={portfolio.reportsDue > 0 ? "warn" : undefined}
        />
        <Stat
          label="Overdue Check-ins"
          value={portfolio.overdueCheckins}
          icon={CalendarClock}
          onClick={() => setDrillTile("overdueCheckins")}
          tone={portfolio.overdueCheckins > 0 ? "warn" : undefined}
        />
        <Stat
          label="Critical Signals"
          value={portfolio.criticalSignals}
          icon={ShieldAlert}
          onClick={() => setDrillTile("criticalSignals")}
          tone={portfolio.criticalSignals > 0 ? "danger" : undefined}
        />
        <Stat
          label="Need RGS Action"
          value={portfolio.needsAction}
          icon={Bell}
          onClick={() => setDrillTile("needsAction")}
          tone={portfolio.needsAction > 0 ? "primary" : undefined}
        />
      </div>

      {/* P6.2 — Tool Operating Matrix overdue/missing alerts */}
      <div className="mb-10">
        <AdminMatrixAlerts />
      </div>

      {/* P7.2 — Cross-client Revenue Control Center™ alerts */}
      <div className="mb-10">
        <AdminRccAlertsPanel />
      </div>

      {/* P7.3 — RGS Review Queue compact panel */}
      <div className="mb-10">
        <AdminRgsReviewQueuePanel />
      </div>

      {/* P9.0 — RGS Impact Ledger™ compact panel */}
      <div className="mb-10">
        <AdminImpactLedgerPanel />
      </div>

      {/* P7.2.5 — Recently linked + pending client account onboarding */}
      <div className="mb-10">
        <AdminNewAccountsPanel />
      </div>

      {/* P7.2.6 — Engagement billing alerts (diagnostic / implementation / add-on) */}
      <div className="mb-10">
        <AdminBillingAlerts />
      </div>

      {/* P17 — Pending client deactivation / add-on cancellation requests */}
      <div className="mb-10">
        <AdminServiceRequestsAlert />
      </div>

      {/* P31 — Pending client outcome reviews */}
      <div className="mb-10">
        <AdminOutcomeReviewAlert />
      </div>

      {/* P32.1 — Client industries pending verification */}
      <div className="mb-10">
        <IndustryVerificationAlert />
      </div>

      {/* Two-column: Priority Queue + RGS Action Inbox */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        <div className="lg:col-span-2">
          <Panel
            title="Priority Client Queue"
            subtitle={`${priorityQueue.length} clients ranked by signal severity`}
            icon={AlertTriangle}
          >
            {priorityQueue.length === 0 ? (
              <Empty text="No clients flagged. Portfolio is calm." />
            ) : (
              <div className="divide-y divide-border">
                {priorityQueue.map((p, idx) => {
                  const c = customerById(p.customerId);
                  return (
                    <Link
                      key={`${p.customerId}-${idx}`}
                      to={p.href}
                      className="flex items-start gap-3 py-3 px-1 hover:bg-muted/30 transition-colors rounded"
                    >
                      <SeverityDot severity={p.severity} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-sm text-foreground truncate font-medium">
                            {c?.business_name || c?.full_name || "Unknown client"}
                          </div>
                          <span className={`text-[10px] uppercase tracking-wider ${sevText(p.severity)}`}>
                            {p.severity}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">{p.reason}</div>
                        <div className="text-[11px] text-foreground/80 mt-1 flex items-center gap-1">
                          <ArrowRight className="h-3 w-3 text-primary" />
                          {p.recommendedAction}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </Panel>
        </div>

        <Panel title="RGS Action Inbox" subtitle="Operational tasks for RGS" icon={Inbox}>
          <div className="space-y-1">
            <InboxItem
              icon={UserPlus}
              label="Pending account approvals"
              count={inbox.pendingApprovals}
              href="/admin/pending-accounts"
            />
            <InboxItem
              icon={FileText}
              label="Reports awaiting review"
              count={inbox.reviewReports}
              href="/admin/reports"
            />
            <InboxItem
              icon={BookOpen}
              label="Draft reports to publish"
              count={inbox.draftReports}
              href="/admin/reports"
            />
            <InboxItem
              icon={Wrench}
              label="Clients missing tool assignment"
              count={inbox.missingTools}
              href="/admin/client-management"
            />
            <InboxItem
              icon={Bell}
              label="Clients requested RGS review"
              count={inbox.reviewRequests}
              href="/admin/client-management"
              tone={inbox.reviewRequests > 0 ? "primary" : undefined}
            />
            <InboxItem
              icon={AlertCircle}
              label="Repeated blockers flagged"
              count={inbox.repeatedBlockers}
              href="/admin/client-management"
              tone={inbox.repeatedBlockers > 0 ? "warn" : undefined}
            />
            <InboxItem
              icon={ShieldAlert}
              label="Critical cash/expense risk"
              count={inbox.criticalRisk}
              href="/admin/client-management"
              tone={inbox.criticalRisk > 0 ? "danger" : undefined}
            />
          </div>
        </Panel>
      </div>

      {/* Operating Rhythm */}
      <SectionLabel icon={CalendarCheck2} label="Operating Rhythm" />
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 mb-6">
        <RhythmTile
          label="Check-ins this week"
          value={operatingRhythm.checkinsThisWeek.length}
          sub="Submitted by clients"
          icon={CalendarCheck2}
        />
        <RhythmTile
          label="Missing check-ins"
          value={operatingRhythm.missingCheckin.length}
          sub="Monitored clients overdue"
          icon={CalendarClock}
          tone={operatingRhythm.missingCheckin.length > 0 ? "warn" : undefined}
          href="/admin/client-management"
        />
        <RhythmTile
          label="Reports due this month"
          value={operatingRhythm.reportsDueThisMonth.length}
          sub="Reports & Reviews™ window"
          icon={FileText}
          tone={operatingRhythm.reportsDueThisMonth.length > 0 ? "warn" : undefined}
          href="/admin/reports"
        />
        <RhythmTile
          label="Drafts to publish"
          value={operatingRhythm.draftReports.length}
          sub="Awaiting review"
          icon={BookOpen}
          href="/admin/reports"
        />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        {/* Reports due — with Generate report CTA */}
        <Panel title="Reports due" subtitle="Clients with a Reports & Reviews™ window past 25 days" icon={FileText}>
          {operatingRhythm.reportsDueThisMonth.length === 0 ? (
            <Empty text="No reports due this week." />
          ) : (
            <div className="space-y-1">
              {operatingRhythm.reportsDueThisMonth.slice(0, 6).map((c) => {
                const last = latestReportByCustomer.get(c.id);
                return (
                  <div
                    key={c.id}
                    className="flex items-center justify-between gap-2 py-2 px-2 rounded-md hover:bg-muted/30 transition-colors"
                  >
                    <Link to={`/admin/customers/${c.id}`} className="min-w-0 flex-1">
                      <div className="text-xs text-foreground truncate">
                        {c.business_name || c.full_name}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {last ? `Last period ended ${formatDate(last.period_end)}` : "No prior report"}
                      </div>
                    </Link>
                    <Link
                      to={`/admin/reports?customer=${c.id}&new=1`}
                      className="flex-shrink-0 inline-flex items-center gap-1 text-[11px] text-primary hover:text-secondary"
                    >
                      <PlusCircle className="h-3 w-3" /> Generate report
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        {/* Recently completed tasks */}
        <Panel title="Recently completed tasks" subtitle="Closed this month" icon={CheckCircle2}>
          {operatingRhythm.recentlyCompletedTasks.length === 0 ? (
            <Empty text="No tasks completed yet this month." />
          ) : (
            <div className="space-y-1">
              {operatingRhythm.recentlyCompletedTasks.map((t) => {
                const c = customerById(t.customer_id);
                return (
                  <Link
                    key={t.id}
                    to={c ? `/admin/customers/${c.id}` : "/admin/tasks"}
                    className="flex items-start justify-between gap-2 py-2 px-2 rounded-md hover:bg-muted/30 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-xs text-foreground truncate">{t.title}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                        {c?.business_name || c?.full_name || "—"}
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground flex-shrink-0 mt-0.5">
                      {t.completed_at ? formatDate(t.completed_at) : ""}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </Panel>

        {/* Recently published reports */}
        <Panel title="Recently published reports" subtitle="Reports & Reviews™" icon={Sparkles}>
          {operatingRhythm.recentlyPublishedReports.length === 0 ? (
            <Empty text="No reports published yet." />
          ) : (
            <div className="space-y-1">
              {operatingRhythm.recentlyPublishedReports.map((r) => {
                const c = customerById(r.customer_id);
                return (
                  <Link
                    key={r.id}
                    to={`/admin/reports/${r.id}`}
                    className="flex items-start justify-between gap-2 py-2 px-2 rounded-md hover:bg-muted/30 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-xs text-foreground truncate">
                        {c?.business_name || c?.full_name || "Unknown"}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                        {r.report_type} · {formatDate(r.period_start)} – {formatDate(r.period_end)}
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground flex-shrink-0 mt-0.5">
                      {r.published_at ? formatDate(r.published_at) : ""}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </Panel>
      </div>

      {/* RGS Recommended Actions */}
      <SectionLabel icon={ListChecks} label="RGS Recommended Actions" />
      <div className="bg-card border border-border rounded-xl p-5 mb-10">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-sm text-foreground">What RGS should consider next</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Suggestions only — review before acting. Based on signals across the portfolio.
            </p>
          </div>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Top {recommendedActions.length}
          </span>
        </div>
        {recommendedActions.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle2 className="h-5 w-5 text-[hsl(140_50%_65%)] mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">
              No clients are currently flagged. Portfolio is calm.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {recommendedActions.map((rec) => {
              const c = customerById(rec.customerId);
              const sev =
                rec.severity === "critical"
                  ? "border-[hsl(0_70%_55%/0.35)] bg-[hsl(0_70%_55%/0.05)]"
                  : rec.severity === "warning"
                    ? "border-[hsl(38_90%_55%/0.35)] bg-[hsl(38_90%_55%/0.05)]"
                    : "border-border bg-muted/20";
              return (
                <li key={rec.key} className={`rounded-lg border p-3 ${sev}`}>
                  <div className="flex items-start gap-3">
                    <SeverityDot severity={rec.severity} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="text-sm text-foreground font-medium truncate">
                          {c?.business_name || c?.full_name || "Unknown client"}
                        </div>
                        <span className={`text-[10px] uppercase tracking-wider ${sevText(rec.severity)}`}>
                          {rec.signal}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">{rec.why}</p>
                      <p className="text-[11px] text-foreground/90 mt-1.5">
                        <span className="text-muted-foreground">Consider: </span>
                        {rec.action}
                      </p>
                      <Link
                        to={rec.href}
                        className="inline-flex items-center gap-1 mt-2 text-[11px] text-primary hover:text-secondary"
                      >
                        Open <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Activity + Monitoring */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        <div className="lg:col-span-2">
          <Panel title="Recent System Activity" subtitle="Latest events across the portfolio" icon={History}>
            {mergedActivity.length === 0 ? (
              <Empty text="No recent activity." />
            ) : (
              <div className="space-y-1">
                {mergedActivity.map((e) => (
                  <ActivityRowItem
                    key={e.id}
                    title={e.title}
                    detail={e.detail}
                    ts={e.ts}
                    href={e.href}
                  />
                ))}
              </div>
            )}
          </Panel>
        </div>

        <Panel title="Monitoring Snapshot" subtitle="This month / this week" icon={Radar}>
          <div className="space-y-4">
            <MiniStat label="Reports published this month" value={monitoring.publishedThisMonth} />
            <MiniStat label="Reports due this month" value={monitoring.reportsDueThisMonth} />
            <MiniStat label="Check-ins this week" value={monitoring.checkinsThisWeek} />
            <MiniStat
              label="Inactive 14d+"
              value={monitoring.inactiveClients}
              tone={monitoring.inactiveClients > 0 ? "warn" : undefined}
            />
            <div className="pt-3 border-t border-border">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
                By Monitoring Tier
              </div>
              <div className="space-y-1.5">
                {Object.entries(monitoring.tiers)
                  .sort((a, b) => b[1] - a[1])
                  .map(([tier, n]) => (
                    <div key={tier} className="flex items-center justify-between text-xs">
                      <span className="text-foreground capitalize">{tier.replace(/_/g, " ")}</span>
                      <span className="text-muted-foreground tabular-nums">{n}</span>
                    </div>
                  ))}
              </div>
            </div>
            <div className="pt-3 border-t border-border">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
                By Monitoring Status
              </div>
              <div className="space-y-1.5">
                {Object.entries(monitoring.statuses)
                  .sort((a, b) => b[1] - a[1])
                  .map(([s, n]) => (
                    <div key={s} className="flex items-center justify-between text-xs">
                      <span className="text-foreground capitalize">{s.replace(/_/g, " ")}</span>
                      <span className="text-muted-foreground tabular-nums">{n}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </Panel>
      </div>

      {/* Shortcuts */}
      <SectionLabel icon={ArrowRight} label="Jump to" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        <Shortcut to="/admin/pending-accounts" icon={UserPlus} label="Pending Accounts" />
        <Shortcut to="/admin/client-management" icon={Users} label="Client Management" />
        <Shortcut to="/admin/crm-pipeline" icon={TrendingUp} label="Customer Flow" />
        <Shortcut to="/admin/reports" icon={FileText} label="Reports" />
        <Shortcut to="/admin/saved-benchmarks" icon={History} label="Saved Benchmarks™" />
        <Shortcut to="/admin/tool-distribution" icon={Wrench} label="Tool Distribution" />
        <Shortcut to="/admin/rgs-business-control-center" icon={Briefcase} label="RGS BCC" />
        <Shortcut to="/admin/add-on-monitoring" icon={Radar} label="Monitoring" />
        <Shortcut to="/admin/tasks" icon={CheckCircle2} label="Tasks" />
        <Shortcut to="/admin/files" icon={UploadIcon} label="Files" />
      </div>

      {/* P13 — Metric tile drill-down drawer */}
      <Sheet open={drillTile !== null} onOpenChange={(o) => !o && setDrillTile(null)}>
        <SheetContent side="right" className="bg-card border-border w-full sm:max-w-lg overflow-y-auto">
          {drillTile && (() => {
            const meta = TILE_META[drillTile];
            const data = tileLists[drillTile];
            const items = data.items;
            return (
              <>
                <SheetHeader>
                  <SheetTitle className="text-foreground flex items-center gap-2">
                    {meta.title}
                    <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border border-border text-muted-foreground">
                      {items.length}
                    </span>
                  </SheetTitle>
                  <SheetDescription className="text-muted-foreground text-xs leading-relaxed">
                    {meta.description}
                  </SheetDescription>
                </SheetHeader>

                <div className="mt-4 divide-y divide-border border border-border rounded-xl bg-background/40">
                  {items.length === 0 ? (
                    <div className="p-6 text-center text-xs text-muted-foreground">
                      Nothing in this list right now.
                    </div>
                  ) : (
                    items.slice(0, 100).map((c) => (
                      <Link
                        key={c.id}
                        to={`/admin/customers/${c.id}`}
                        onClick={() => setDrillTile(null)}
                        className="flex items-start gap-3 p-3 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm text-foreground truncate">
                              {c.business_name || c.full_name}
                            </span>
                            {getCustomerAccountKind(c) !== "client" && (
                              <span
                                className={`text-[9px] px-1.5 py-0.5 rounded border ${ACCOUNT_KIND_TONE[getCustomerAccountKind(c)]}`}
                              >
                                {ACCOUNT_KIND_LABEL[getCustomerAccountKind(c)]}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                            {data.reasonFor(c)}
                          </div>
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground mt-1 flex-shrink-0" />
                      </Link>
                    ))
                  )}
                  {items.length > 100 && (
                    <div className="p-3 text-[11px] text-muted-foreground text-center">
                      Showing first 100 of {items.length}.
                    </div>
                  )}
                </div>

                {meta.href && (
                  <Link
                    to={meta.href}
                    onClick={() => setDrillTile(null)}
                    className="mt-4 inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                  >
                    {meta.ctaLabel ?? "Open full view"} <ArrowRight className="h-3 w-3" />
                  </Link>
                )}
              </>
            );
          })()}
        </SheetContent>
      </Sheet>
    </PortalShell>
  );
}

// ---------- atoms ----------
function SectionLabel({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      <h2 className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</h2>
    </div>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
  href,
  onClick,
  tone,
}: {
  label: string;
  value: number;
  icon: any;
  href?: string;
  onClick?: () => void;
  tone?: "warn" | "danger" | "primary";
}) {
  const color =
    tone === "danger"
      ? "text-destructive"
      : tone === "warn"
        ? "text-amber-400"
        : tone === "primary"
          ? "text-primary"
          : "text-primary";
  const interactive = !!href || !!onClick;
  const inner = (
    <div className="group bg-card border border-border rounded-xl p-4 hover:border-primary/40 transition-colors h-full text-left w-full">
      <div className="flex items-center justify-between">
        <Icon className={`h-4 w-4 ${color}`} />
        {interactive && (
          <ArrowRight className="h-3 w-3 text-muted-foreground/0 group-hover:text-muted-foreground transition-colors" />
        )}
      </div>
      <div className="mt-3 text-2xl font-light text-foreground tabular-nums">{value}</div>
      <div className="text-[10px] text-muted-foreground mt-1.5 uppercase tracking-wider leading-tight">
        {label}
      </div>
    </div>
  );
  if (href) return <Link to={href}>{inner}</Link>;
  if (onClick)
    return (
      <button
        type="button"
        onClick={onClick}
        className="text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-xl"
        aria-label={`${label}: open drill-down`}
      >
        {inner}
      </button>
    );
  return inner;
}

function Panel({
  title,
  subtitle,
  icon: Icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: any;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-card border border-border rounded-xl p-5 h-full">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-2">
          {Icon && <Icon className="h-4 w-4 text-primary mt-0.5" />}
          <div>
            <h3 className="text-sm text-foreground">{title}</h3>
            {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
        </div>
      </div>
      {children}
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="text-xs text-muted-foreground py-6 text-center">{text}</div>;
}

function SeverityDot({ severity }: { severity: Priority["severity"] }) {
  const cls =
    severity === "critical"
      ? "bg-destructive"
      : severity === "warning"
        ? "bg-amber-400"
        : "bg-primary";
  return <span className={`mt-1.5 h-2 w-2 rounded-full flex-shrink-0 ${cls}`} />;
}
function sevText(s: Priority["severity"]) {
  return s === "critical" ? "text-destructive" : s === "warning" ? "text-amber-400" : "text-primary";
}

function InboxItem({
  icon: Icon,
  label,
  count,
  href,
  tone,
}: {
  icon: any;
  label: string;
  count: number;
  href: string;
  tone?: "warn" | "danger" | "primary";
}) {
  const muted = count === 0;
  const countColor =
    tone === "danger"
      ? "text-destructive"
      : tone === "warn"
        ? "text-amber-400"
        : tone === "primary"
          ? "text-primary"
          : "text-foreground";
  return (
    <Link
      to={href}
      className={`flex items-center justify-between py-2 px-2 rounded-md hover:bg-muted/30 transition-colors ${muted ? "opacity-60" : ""}`}
    >
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs text-foreground">{label}</span>
      </div>
      <span className={`text-sm tabular-nums font-medium ${countColor}`}>{count}</span>
    </Link>
  );
}

const ActivityRowItem = forwardRef<HTMLDivElement, {
  title: string;
  detail?: string;
  ts: string;
  href?: string;
}>(function ActivityRowItem({ title, detail, ts, href }, ref) {
  const inner = (
    <div ref={ref} className="flex items-start justify-between gap-3 py-2 px-2 rounded-md hover:bg-muted/30 transition-colors">
      <div className="min-w-0">
        <div className="text-xs text-foreground truncate">{title}</div>
        {detail && <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{detail}</div>}
      </div>
      <span className="text-[10px] text-muted-foreground flex-shrink-0 mt-0.5">{formatDate(ts)}</span>
    </div>
  );
  return href ? <Link to={href}>{inner}</Link> : inner;
});

function MiniStat({ label, value, tone }: { label: string; value: number; tone?: "warn" }) {
  const color = tone === "warn" ? "text-amber-400" : "text-foreground";
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-lg font-light tabular-nums ${color}`}>{value}</span>
    </div>
  );
}

function RhythmTile({
  label,
  value,
  sub,
  icon: Icon,
  tone,
  href,
}: {
  label: string;
  value: number;
  sub?: string;
  icon: any;
  tone?: "warn" | "danger" | "primary";
  href?: string;
}) {
  const valueColor =
    tone === "danger"
      ? "text-destructive"
      : tone === "warn"
        ? "text-amber-400"
        : tone === "primary"
          ? "text-primary"
          : "text-foreground";
  const inner = (
    <div className="bg-card border border-border rounded-xl p-4 hover:border-primary/40 transition-colors h-full">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className={`text-2xl font-light tabular-nums ${valueColor}`}>{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
  return href ? <Link to={href}>{inner}</Link> : inner;
}

const Shortcut = forwardRef<HTMLAnchorElement, { to: string; icon: any; label: string }>(
  function Shortcut({ to, icon: Icon, label }, ref) {
    return (
      <Link
        ref={ref}
        to={to}
        className="flex items-center gap-2 px-3 py-2.5 rounded-md bg-card border border-border hover:border-primary/40 hover:bg-muted/30 transition-colors text-xs text-foreground"
      >
        <Icon className="h-3.5 w-3.5 text-primary" />
        <span className="truncate">{label}</span>
      </Link>
    );
  },
);

function humanizeAction(action: string): string {
  const map: Record<string, string> = {
    report_published: "Report published",
    report_unpublished: "Report unpublished",
    report_archived: "Report archived",
    benchmark_saved: "Benchmark saved",
    tool_assigned: "Tool assigned",
  };
  return map[action] || action.replace(/_/g, " ");
}
