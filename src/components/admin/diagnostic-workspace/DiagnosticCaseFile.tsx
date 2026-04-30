/**
 * P13.1.H — Diagnostic Case File (hardened).
 *
 * Per-client diagnostic command surface inside the Diagnostic Workspace.
 *
 * Hardening over P13.1:
 *   - Revenue history now reads from `revenue_entries` (not cash flow).
 *     Cash flow is shown as its own area.
 *   - Imports recognise pending / committed / error states truthfully.
 *   - Connected sources distinguish requested / setup / needs_review /
 *     connected / unavailable.
 *   - Uploads + intake answers stay "present-only" — schema does not
 *     carry review/follow-up metadata, and we do not fake one.
 *   - Empty states are calm and tell the admin what to do next.
 *   - Sub-tool list shows truthful "Not started" when no run exists.
 *   - Findings preserve `client_visible` trust boundary.
 *   - Demo accounts get a clear badge so they aren't read as real data.
 *   - Report readiness uses graded language, not a binary verdict.
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
  CheckCircle2,
  CircleDashed,
  AlertTriangle,
  Inbox,
  ArrowRight,
  Eye,
  EyeOff,
  FileText,
  ExternalLink,
} from "lucide-react";
import { AiFollowupReviewPanel } from "./AiFollowupReviewPanel";

// ---------- types ----------

interface CustomerOption {
  id: string;
  full_name: string;
  business_name: string | null;
  lifecycle_state: string;
  stage: string;
  package_diagnostic: boolean;
  is_demo_account: boolean;
}

type IntakeStatus =
  | "missing"
  | "provided"
  | "pending_review"
  | "accepted"
  | "needs_follow_up";

interface IntakeArea {
  key: string;
  label: string;
  status: IntakeStatus;
  detail: string;
  nextAction: string;
  to?: string;
}

interface ToolRunRow {
  tool_key: string;
  tool_label: string | null;
  status: string;
  result_summary: string | null;
  run_date: string;
}

interface FindingRow {
  id: string;
  title: string;
  summary: string | null;
  memory_type: string;
  status: string;
  related_pillar: string | null;
  client_visible: boolean;
  last_seen_at: string;
}

interface SourceReqRow {
  id: string;
  provider: string;
  status: string;
  updated_at: string;
}

// Sub-tools surfaced in the case file. `key` matches
// `diagnostic_tool_runs.tool_key` written by the engines.
// If a key has never been written we render "No run recorded" — we do
// not fabricate progress.
// Canonical diagnostic tool keys (must match DIAGNOSTIC_TOOL_KEYS in
// src/lib/diagnostics/diagnosticRuns.ts and the toolKey passed to
// ToolRunnerShell by each tool page). Mismatched keys silently render as
// "No run recorded" forever, so this list is the single source of truth.
//
// Business Control Review is intentionally NOT listed here: it is not
// recorded through the diagnostic_tool_runs pathway — it lives in
// `business_control_reports` with its own lifecycle. We surface it as a
// separate manual area in the Business Control Center.
const SUB_TOOLS: { key: string; label: string; to: string }[] = [
  { key: "rgs_stability_scorecard", label: "Stability Scorecard", to: "/admin/scorecard-system" },
  { key: "revenue_leak_finder", label: "Revenue Leak Finder", to: "/admin/tools/revenue-leak-finder" },
  { key: "buyer_persona_tool", label: "Buyer Persona Builder", to: "/admin/tools/persona-builder" },
  { key: "customer_journey_mapper", label: "Customer Journey Mapper", to: "/admin/tools/journey-mapper" },
  { key: "process_breakdown_tool", label: "Process Breakdown", to: "/admin/tools/process-breakdown" },
];

// Import status interpretation. `financial_imports.status` is free
// text; the documented vocabulary is pending → committed, with error
// states. Anything else is treated as "provided" so we never silently
// hide a row.
const IMPORT_PENDING = new Set(["pending", "staging", "in_review"]);
const IMPORT_ACCEPTED = new Set(["committed", "accepted", "applied", "complete"]);
const IMPORT_ERROR = new Set(["error", "failed", "rejected"]);

// Connected source vocabulary — must match `customer_integrations.status`
// values written by the request flow.
const SOURCE_PENDING = new Set(["requested", "setup_in_progress"]);
const SOURCE_REVIEW = new Set(["needs_review"]);
const SOURCE_CONNECTED = new Set(["connected", "active"]);
const SOURCE_BLOCKED = new Set(["unavailable", "disconnected"]);

// ---------- small UI atoms ----------

function StatusDot({ status }: { status: IntakeStatus }) {
  const map: Record<IntakeStatus, { cls: string; icon: JSX.Element; label: string }> = {
    missing: {
      cls: "text-muted-foreground",
      icon: <CircleDashed className="h-3.5 w-3.5" />,
      label: "Missing",
    },
    provided: {
      cls: "text-primary",
      icon: <Inbox className="h-3.5 w-3.5" />,
      label: "Provided",
    },
    pending_review: {
      cls: "text-[hsl(40_90%_60%)]",
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
      label: "Pending review",
    },
    accepted: {
      cls: "text-[hsl(140_50%_60%)]",
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
      label: "Accepted",
    },
    needs_follow_up: {
      cls: "text-destructive",
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
      label: "Needs follow-up",
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

// ---------- main ----------

export function DiagnosticCaseFile() {
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [caseLoading, setCaseLoading] = useState(false);

  // Per-case data
  const [intakeAnswerCount, setIntakeAnswerCount] = useState(0);
  const [importsByStatus, setImportsByStatus] = useState<Record<string, number>>({});
  const [importsTotal, setImportsTotal] = useState(0);
  const [uploadsCount, setUploadsCount] = useState(0);
  const [sourceRequests, setSourceRequests] = useState<SourceReqRow[]>([]);
  const [toolRuns, setToolRuns] = useState<ToolRunRow[]>([]);
  const [findings, setFindings] = useState<FindingRow[]>([]);
  const [reportRow, setReportRow] = useState<{
    id: string;
    status: string;
    updated_at: string;
  } | null>(null);
  const [revenueEntryCount, setRevenueEntryCount] = useState(0);
  const [cashEntryCount, setCashEntryCount] = useState(0);
  const [obligationCount, setObligationCount] = useState(0);
  const [expenseCount, setExpenseCount] = useState(0);
  const [pipelineDealCount, setPipelineDealCount] = useState(0);

  // Load eligible customers (anyone non-archived). Real-data clients
  // float to the top; demo accounts sink and are badged.
  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from("customers")
        .select(
          "id, full_name, business_name, lifecycle_state, stage, package_diagnostic, is_demo_account",
        )
        .is("archived_at", null)
        .order("last_activity_at", { ascending: false })
        .limit(200);
      const rows = (data ?? []) as CustomerOption[];
      const sorted = rows.slice().sort((a, b) => {
        const score = (c: CustomerOption) =>
          (c.is_demo_account ? 2 : 0) +
          (c.lifecycle_state === "diagnostic" ? 0 : 1) +
          (c.package_diagnostic ? 0 : 0.25);
        return score(a) - score(b);
      });
      setCustomers(sorted);
      if (sorted.length && !selectedId) setSelectedId(sorted[0].id);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load case data for selected client
  useEffect(() => {
    if (!selectedId) return;
    setCaseLoading(true);
    void (async () => {
      const [
        intakeRes,
        importsRes,
        uploadsRes,
        sourcesRes,
        runsRes,
        memRes,
        repRes,
        revenueRes,
        cashRes,
        oblRes,
        expRes,
        dealsRes,
      ] = await Promise.all([
        supabase
          .from("diagnostic_intake_answers")
          .select("id", { head: true, count: "exact" })
          .eq("customer_id", selectedId),
        supabase
          .from("financial_imports")
          .select("status")
          .eq("customer_id", selectedId),
        supabase
          .from("customer_uploads")
          .select("id", { head: true, count: "exact" })
          .eq("customer_id", selectedId),
        supabase
          .from("customer_integrations")
          .select("id, provider, status, updated_at")
          .eq("customer_id", selectedId)
          .order("updated_at", { ascending: false })
          .limit(50),
        supabase
          .from("diagnostic_tool_runs")
          .select("tool_key, tool_label, status, result_summary, run_date")
          .eq("customer_id", selectedId)
          .eq("is_latest", true)
          .order("run_date", { ascending: false }),
        supabase
          .from("customer_insight_memory")
          .select(
            "id, title, summary, memory_type, status, related_pillar, client_visible, last_seen_at",
          )
          .eq("customer_id", selectedId)
          .eq("status", "active")
          .order("last_seen_at", { ascending: false })
          .limit(15),
        supabase
          .from("business_control_reports")
          .select("id, status, updated_at")
          .eq("customer_id", selectedId)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("revenue_entries")
          .select("id", { head: true, count: "exact" })
          .eq("customer_id", selectedId),
        supabase
          .from("cash_flow_entries")
          .select("id", { head: true, count: "exact" })
          .eq("customer_id", selectedId),
        supabase
          .from("financial_obligations")
          .select("id", { head: true, count: "exact" })
          .eq("customer_id", selectedId),
        supabase
          .from("expense_entries")
          .select("id", { head: true, count: "exact" })
          .eq("customer_id", selectedId),
        supabase
          .from("client_pipeline_deals")
          .select("id", { head: true, count: "exact" })
          .eq("customer_id", selectedId),
      ]);

      const importBuckets: Record<string, number> = {};
      const importRows = (importsRes.data ?? []) as { status: string | null }[];
      for (const r of importRows) {
        const k = r.status ?? "unknown";
        importBuckets[k] = (importBuckets[k] ?? 0) + 1;
      }

      setIntakeAnswerCount(intakeRes.count ?? 0);
      setImportsByStatus(importBuckets);
      setImportsTotal(importRows.length);
      setUploadsCount(uploadsRes.count ?? 0);
      setSourceRequests((sourcesRes.data ?? []) as SourceReqRow[]);
      setToolRuns((runsRes.data ?? []) as ToolRunRow[]);
      setFindings((memRes.data ?? []) as FindingRow[]);
      setReportRow((repRes.data as any) ?? null);
      setRevenueEntryCount(revenueRes.count ?? 0);
      setCashEntryCount(cashRes.count ?? 0);
      setObligationCount(oblRes.count ?? 0);
      setExpenseCount(expRes.count ?? 0);
      setPipelineDealCount(dealsRes.count ?? 0);
      setCaseLoading(false);
    })();
  }, [selectedId]);

  const selected = useMemo(
    () => customers.find((c) => c.id === selectedId) ?? null,
    [customers, selectedId],
  );

  // ---- import bucket math ----
  const importPending = useMemo(
    () =>
      Object.entries(importsByStatus)
        .filter(([s]) => IMPORT_PENDING.has(s))
        .reduce((n, [, c]) => n + c, 0),
    [importsByStatus],
  );
  const importAccepted = useMemo(
    () =>
      Object.entries(importsByStatus)
        .filter(([s]) => IMPORT_ACCEPTED.has(s))
        .reduce((n, [, c]) => n + c, 0),
    [importsByStatus],
  );
  const importErrors = useMemo(
    () =>
      Object.entries(importsByStatus)
        .filter(([s]) => IMPORT_ERROR.has(s))
        .reduce((n, [, c]) => n + c, 0),
    [importsByStatus],
  );

  // ---- source bucket math ----
  const sourcesPending = sourceRequests.filter((s) => SOURCE_PENDING.has(s.status)).length;
  const sourcesNeedsReview = sourceRequests.filter((s) => SOURCE_REVIEW.has(s.status)).length;
  const sourcesConnected = sourceRequests.filter((s) => SOURCE_CONNECTED.has(s.status)).length;
  const sourcesBlocked = sourceRequests.filter((s) => SOURCE_BLOCKED.has(s.status)).length;

  // ---- intake completeness ----
  // NOTE: uploads & intake answers schemas have no review/follow-up
  // metadata, so they collapse to missing/provided. Truthful by design.
  const intakeAreas: IntakeArea[] = useMemo(() => {
    const importsStatus: IntakeStatus = importErrors > 0
      ? "needs_follow_up"
      : importPending > 0
      ? "pending_review"
      : importAccepted > 0
      ? "accepted"
      : importsTotal > 0
      ? "provided"
      : "missing";

    const sourcesStatus: IntakeStatus = sourcesBlocked > 0
      ? "needs_follow_up"
      : sourcesNeedsReview > 0
      ? "pending_review"
      : sourcesConnected > 0
      ? "accepted"
      : sourcesPending > 0
      ? "pending_review"
      : "missing";

    return [
      {
        key: "intake_answers",
        label: "Intake answers",
        status: intakeAnswerCount > 0 ? "provided" : "missing",
        detail:
          intakeAnswerCount > 0
            ? `${intakeAnswerCount} answer${intakeAnswerCount === 1 ? "" : "s"} recorded`
            : "No intake answers yet",
        nextAction:
          intakeAnswerCount > 0
            ? "Review answers and tag missing context"
            : "Send intake to client and capture answers",
        to: "/admin/diagnostic-system",
      },
      {
        key: "revenue_history",
        label: "Revenue history",
        status: revenueEntryCount > 0 ? "provided" : "missing",
        detail:
          revenueEntryCount > 0
            ? `${revenueEntryCount} revenue entr${revenueEntryCount === 1 ? "y" : "ies"}`
            : "No revenue entries recorded",
        nextAction:
          revenueEntryCount > 0
            ? "Sanity-check trend before scoring"
            : "Capture revenue history via import or manual entry",
        to: "/admin/imports",
      },
      {
        key: "expenses",
        label: "Expenses & cost structure",
        status: expenseCount > 0 ? "provided" : "missing",
        detail:
          expenseCount > 0
            ? `${expenseCount} expense entries`
            : "No expense entries yet",
        nextAction:
          expenseCount > 0
            ? "Categorise and confirm fixed vs variable"
            : "Request expense breakdown from client",
        to: "/admin/imports",
      },
      {
        key: "cash",
        label: "Cash flow & obligations",
        status:
          cashEntryCount > 0 || obligationCount > 0 ? "provided" : "missing",
        detail:
          cashEntryCount > 0 || obligationCount > 0
            ? `${cashEntryCount} cash entries · ${obligationCount} obligations`
            : "No cash flow or obligations captured",
        nextAction:
          cashEntryCount > 0 || obligationCount > 0
            ? "Confirm runway and near-term outflows"
            : "Capture obligations to expose cash pressure",
      },
      {
        key: "pipeline",
        label: "Pipeline / acquisition",
        status: pipelineDealCount > 0 ? "provided" : "missing",
        detail:
          pipelineDealCount > 0
            ? `${pipelineDealCount} deals tracked`
            : "No pipeline data yet",
        nextAction:
          pipelineDealCount > 0
            ? "Inspect stage distribution for acquisition signals"
            : "Capture in-flight deals to show acquisition health",
      },
      {
        key: "imports",
        label: "Spreadsheet imports",
        status: importsStatus,
        detail:
          importErrors > 0
            ? `${importErrors} error${importErrors === 1 ? "" : "s"} · ${importPending} pending · ${importAccepted} accepted`
            : importPending > 0
            ? `${importPending} pending review · ${importsTotal} total`
            : importAccepted > 0
            ? `${importAccepted} accepted${importsTotal > importAccepted ? ` · ${importsTotal - importAccepted} other` : ""}`
            : importsTotal > 0
            ? `${importsTotal} import${importsTotal === 1 ? "" : "s"} on file`
            : "No imports staged",
        nextAction:
          importErrors > 0
            ? "Resolve import errors before trusting data"
            : importPending > 0
            ? "Reconcile pending imports"
            : importsTotal === 0
            ? "Stage spreadsheet imports for this client"
            : "Imports look clean — nothing to do",
        to: "/admin/imports",
      },
      {
        key: "uploads",
        label: "Uploads & files",
        // Schema has no review marker on customer_uploads; we report
        // presence only and prompt admin review.
        status: uploadsCount > 0 ? "provided" : "missing",
        detail:
          uploadsCount > 0
            ? `${uploadsCount} file${uploadsCount === 1 ? "" : "s"} uploaded`
            : "No client files uploaded",
        nextAction:
          uploadsCount > 0
            ? "Open and interpret uploaded files"
            : "Ask client for source statements / screenshots",
        to: "/admin/files",
      },
      {
        key: "sources",
        label: "Connected sources",
        status: sourcesStatus,
        detail:
          sourcesConnected > 0
            ? `${sourcesConnected} connected · ${sourcesPending + sourcesNeedsReview} in flight${sourcesBlocked ? ` · ${sourcesBlocked} blocked` : ""}`
            : sourcesNeedsReview > 0
            ? `${sourcesNeedsReview} need${sourcesNeedsReview === 1 ? "s" : ""} review · ${sourcesPending} in setup`
            : sourcesPending > 0
            ? `${sourcesPending} request${sourcesPending === 1 ? "" : "s"} in flight`
            : sourcesBlocked > 0
            ? `${sourcesBlocked} marked unavailable`
            : "No source connections yet",
        nextAction:
          sourcesNeedsReview > 0
            ? "Action source requests waiting on review"
            : sourcesPending > 0
            ? "Move source setup forward"
            : sourcesConnected > 0
            ? "Verify connected source data still flowing"
            : "Plan or request connected sources for this client",
        to: "/admin/integration-planning",
      },
    ];
  }, [
    intakeAnswerCount,
    revenueEntryCount,
    cashEntryCount,
    obligationCount,
    expenseCount,
    pipelineDealCount,
    importsTotal,
    importPending,
    importAccepted,
    importErrors,
    uploadsCount,
    sourcesPending,
    sourcesNeedsReview,
    sourcesConnected,
    sourcesBlocked,
  ]);

  // Sub-tool status derived from latest tool run per tool_key
  const toolStatus = useMemo(() => {
    const map = new Map<string, ToolRunRow>();
    for (const r of toolRuns) map.set(r.tool_key, r);
    return SUB_TOOLS.map((t) => ({ ...t, run: map.get(t.key) ?? null }));
  }, [toolRuns]);

  // Report readiness — graded language, never overclaims.
  const readiness = useMemo(() => {
    const missingAreas = intakeAreas.filter((a) => a.status === "missing").length;
    const pendingReviews = intakeAreas.filter(
      (a) => a.status === "pending_review" || a.status === "needs_follow_up",
    ).length;
    const completedTools = toolStatus.filter((t) => t.run && t.run.status === "completed").length;
    const totalTools = SUB_TOOLS.length;
    const findingsCount = findings.length;
    const reportStatus = reportRow?.status ?? null;

    let verdict: string;
    let tone: "muted" | "warn" | "ok" = "muted";
    if (reportStatus === "published") {
      verdict = "Report published";
      tone = "ok";
    } else if (reportStatus === "review" || reportStatus === "in_review") {
      verdict = "Ready for final review";
      tone = "ok";
    } else if (reportStatus === "draft") {
      verdict = "Draft in progress";
      tone = "warn";
    } else if (
      missingAreas === 0 &&
      pendingReviews === 0 &&
      completedTools >= Math.ceil(totalTools / 2) &&
      findingsCount > 0
    ) {
      verdict = "Ready to draft";
      tone = "ok";
    } else if (missingAreas + pendingReviews > 0) {
      verdict = "Not ready — open items remain";
      tone = "warn";
    } else {
      verdict = "Awaiting analysis runs and findings";
      tone = "muted";
    }
    return {
      missingAreas,
      pendingReviews,
      completedTools,
      totalTools,
      findingsCount,
      reportStatus,
      verdict,
      tone,
    };
  }, [intakeAreas, toolStatus, findings, reportRow]);

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 text-xs text-muted-foreground">
        Loading diagnostic cases…
      </div>
    );
  }

  if (customers.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 text-xs text-muted-foreground">
        No active customers to load. Create or activate a customer to begin a
        diagnostic case.
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
              Diagnostic case file
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
              <div className="text-[11px] text-muted-foreground mt-1">
                Lifecycle: <span className="text-foreground">{selected.lifecycle_state}</span>
                {" · "}
                Stage: <span className="text-foreground">{selected.stage}</span>
                {" · "}
                {selected.package_diagnostic ? (
                  <span className="text-primary">Diagnostic package</span>
                ) : (
                  <span className="text-muted-foreground">No diagnostic package flag</span>
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
                      (c.lifecycle_state === "diagnostic" ? "  · in diagnostic" : "")}
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
            {selected && (
              <Link
                to={`/admin/report-drafts?customer=${selected.id}&type=diagnostic`}
                className="text-[11px] text-primary hover:text-secondary inline-flex items-center gap-1"
                title="Generate a deterministic diagnostic draft — no paid AI"
              >
                <FileText className="h-3 w-3" /> Generate Draft Report
              </Link>
            )}
          </div>
        </div>
      </div>

      {caseLoading && (
        <div className="text-[11px] text-muted-foreground">Refreshing case data…</div>
      )}

      {/* Two-column body */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-w-0">
        {/* Intake completeness */}
        <SectionCard
          title="Intake completeness"
          hint="What this client has provided, what's still missing, and what to do next"
        >
          <ul className="space-y-2">
            {intakeAreas.map((a) => {
              const inner = (
                <div className="flex items-start justify-between gap-3 p-2.5 rounded-md border border-border bg-muted/20 hover:border-primary/30 transition-colors">
                  <div className="min-w-0">
                    <div className="text-xs text-foreground">{a.label}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {a.detail}
                    </div>
                    <div className="text-[11px] text-foreground/70 mt-1 italic">
                      Next: {a.nextAction}
                    </div>
                  </div>
                  <StatusDot status={a.status} />
                </div>
              );
              return (
                <li key={a.key}>
                  {a.to ? <Link to={a.to}>{inner}</Link> : inner}
                </li>
              );
            })}
          </ul>
        </SectionCard>

        {/* Sub-tool status */}
        <SectionCard
          title="Diagnostic sub-tool status"
          hint="Latest run per tool — or 'No run recorded' when nothing has executed"
        >
          <ul className="space-y-2">
            {toolStatus.map((t) => {
              const run = t.run;
              const status = run ? run.status : "not_started";
              const tone =
                status === "completed"
                  ? "text-[hsl(140_50%_60%)]"
                  : status === "in_progress"
                  ? "text-[hsl(40_90%_60%)]"
                  : status === "needs_rerun"
                  ? "text-destructive"
                  : "text-muted-foreground";
              const label =
                status === "completed"
                  ? "Completed"
                  : status === "in_progress"
                  ? "In progress"
                  : status === "needs_rerun"
                  ? "Needs rerun"
                  : "Not started";
              return (
                <li key={t.key}>
                  <Link
                    to={t.to}
                    className="flex items-start justify-between gap-3 p-2.5 rounded-md border border-border bg-muted/20 hover:border-primary/30 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="text-xs text-foreground">{t.label}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {run
                          ? run.result_summary
                            ? run.result_summary
                            : `Last run ${new Date(run.run_date).toLocaleDateString()}`
                          : "No run recorded for this client"}
                      </div>
                    </div>
                    <span className={`text-[11px] ${tone} whitespace-nowrap`}>● {label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </SectionCard>

        {/* AI follow-ups (P36) — audit-only, not used for scoring */}
        <SectionCard
          title="AI follow-ups (audit-only)"
          hint="Optional clarifying Q&A — never used by the deterministic scorecard"
        >
          {selected ? (
            <AiFollowupReviewPanel customerId={selected.id} />
          ) : (
            <div className="text-[11px] text-muted-foreground">Select a client to view follow-ups.</div>
          )}
        </SectionCard>

        {/* Review items in context */}
        <SectionCard
          title="Review items in this case"
          hint="What needs admin attention before findings can be trusted"
        >
          <div className="space-y-2">
            <ReviewLine
              label="Source requests waiting on review"
              count={sourcesNeedsReview}
              to="/admin/integration-planning"
              urgent
            />
            <ReviewLine
              label="Source setup in progress"
              count={sourcesPending}
              to="/admin/integration-planning"
            />
            <ReviewLine
              label="Imports pending review"
              count={importPending}
              to="/admin/imports"
              urgent
            />
            <ReviewLine
              label="Imports with errors"
              count={importErrors}
              to="/admin/imports"
              urgent
            />
            <ReviewLine
              label="Uploaded files to interpret"
              count={uploadsCount}
              to="/admin/files"
            />
            <ReviewLine
              label="Intake answers to interpret"
              count={intakeAnswerCount}
              to="/admin/diagnostic-system"
            />
            {reportRow?.status === "draft" && (
              <ReviewLine
                label="Draft report awaiting completion"
                count={1}
                to="/admin/reports"
                urgent
              />
            )}
          </div>
        </SectionCard>

        {/* Findings */}
        <SectionCard
          title="Saved findings"
          hint="Diagnostic memory tied to this client (admin-only and client-safe shown separately)"
        >
          {findings.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">
              No saved findings yet. Findings are written by the engines and
              sub-tools as they run; nothing is invented here.
            </p>
          ) : (
            <ul className="space-y-2">
              {findings.slice(0, 8).map((f) => (
                <li
                  key={f.id}
                  className="p-2.5 rounded-md border border-border bg-muted/20"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs text-foreground truncate">{f.title}</div>
                      {f.summary && (
                        <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                          {f.summary}
                        </div>
                      )}
                      {f.related_pillar && (
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
                          {f.related_pillar}
                        </div>
                      )}
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wider whitespace-nowrap ${
                        f.client_visible ? "text-primary" : "text-muted-foreground"
                      }`}
                    >
                      {f.client_visible ? (
                        <>
                          <Eye className="h-3 w-3" />
                          Client-safe
                        </>
                      ) : (
                        <>
                          <EyeOff className="h-3 w-3" />
                          Admin only
                        </>
                      )}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      {/* Report readiness */}
      <SectionCard
        title="Report readiness"
        hint="Whether this diagnostic is ready to become a client-facing report"
      >
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
          <Stat label="Missing inputs" value={readiness.missingAreas} bad={readiness.missingAreas > 0} />
          <Stat label="Open reviews" value={readiness.pendingReviews} bad={readiness.pendingReviews > 0} />
          <Stat
            label="Sub-tools complete"
            value={`${readiness.completedTools}/${readiness.totalTools}`}
          />
          <Stat label="Saved findings" value={readiness.findingsCount} />
          <Stat
            label="Report status"
            value={readiness.reportStatus ?? "none"}
          />
        </div>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div
            className={`text-xs ${
              readiness.tone === "ok"
                ? "text-[hsl(140_50%_60%)]"
                : readiness.tone === "warn"
                ? "text-[hsl(40_90%_60%)]"
                : "text-muted-foreground"
            }`}
          >
            <span className="inline-flex items-center gap-1">
              {readiness.tone === "ok" ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5" />
              )}
              {readiness.verdict}
            </span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {selected && (
              <Link
                to={`/admin/customers/${selected.id}`}
                className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
              >
                <ExternalLink className="h-3 w-3" /> Customer record
              </Link>
            )}
            <Link
              to="/admin/rgs-review-queue"
              className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              <Inbox className="h-3 w-3" /> Review queue
            </Link>
            <Link
              to="/admin/reports"
              className="text-[11px] text-primary hover:text-secondary inline-flex items-center gap-1"
            >
              <FileText className="h-3 w-3" /> Reports & Reviews
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

function ReviewLine({
  label,
  count,
  to,
  urgent,
}: {
  label: string;
  count: number;
  to: string;
  urgent?: boolean;
}) {
  const tone =
    count === 0
      ? "text-muted-foreground"
      : urgent
      ? "text-[hsl(40_90%_60%)]"
      : "text-foreground";
  return (
    <Link
      to={to}
      className="flex items-center justify-between gap-3 p-2.5 rounded-md border border-border bg-muted/20 hover:border-primary/30 transition-colors"
    >
      <span className="text-xs text-foreground">{label}</span>
      <span className={`text-xs ${tone} inline-flex items-center gap-1 whitespace-nowrap`}>
        {count} <ArrowRight className="h-3 w-3" />
      </span>
    </Link>
  );
}

function Stat({
  label,
  value,
  bad,
}: {
  label: string;
  value: number | string;
  bad?: boolean;
}) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3 min-w-0">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground truncate">
        {label}
      </div>
      <div
        className={`mt-1 text-lg font-light truncate ${
          bad ? "text-destructive" : "text-foreground"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
