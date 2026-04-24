/**
 * P13.1 — Diagnostic Case File.
 *
 * One per-client view that turns the Diagnostic Workspace into a real
 * command center. An admin picks a client and sees, in one place:
 *
 *   - case header (lifecycle, package, stage)
 *   - intake completeness (what's provided / missing / pending review)
 *   - in-context review items (source requests, imports, intake answers)
 *   - diagnostic sub-tool run status (latest run per tool)
 *   - saved findings (insight memory + signals) w/ visibility
 *   - report readiness summary
 *
 * This component is read-mostly. It does not duplicate sub-tool UIs;
 * it surfaces their state and links into them. Mutations stay in the
 * dedicated tools (intake editor, imports page, sub-tool pages, etc.).
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
} from "lucide-react";

// ---------- types ----------

interface CustomerOption {
  id: string;
  full_name: string;
  business_name: string | null;
  lifecycle_state: string;
  stage: string;
  package_diagnostic: boolean;
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

// Sub-tools the diagnostic workspace tracks. Keys correspond to
// `diagnostic_tool_runs.tool_key` written by the various engines.
const SUB_TOOLS: { key: string; label: string; to: string }[] = [
  { key: "stability_scorecard", label: "Stability Scorecard", to: "/admin/scorecard-system" },
  { key: "revenue_leak_finder", label: "Revenue Leak Finder", to: "/admin/tools/revenue-leak-finder" },
  { key: "persona_builder", label: "Buyer Persona Builder", to: "/admin/tools/persona-builder" },
  { key: "journey_mapper", label: "Customer Journey Mapper", to: "/admin/tools/journey-mapper" },
  { key: "process_breakdown", label: "Process Breakdown", to: "/admin/tools/process-breakdown" },
  { key: "business_control_review", label: "Business Control Review", to: "/admin/rgs-business-control-center" },
];

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
    <span className={`inline-flex items-center gap-1 text-[11px] ${v.cls}`}>
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
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3">
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

  // Per-case data
  const [intakeAnswerCount, setIntakeAnswerCount] = useState(0);
  const [importsPending, setImportsPending] = useState(0);
  const [importsAll, setImportsAll] = useState(0);
  const [uploadsCount, setUploadsCount] = useState(0);
  const [sourceRequests, setSourceRequests] = useState<
    { id: string; provider: string; status: string; updated_at: string }[]
  >([]);
  const [toolRuns, setToolRuns] = useState<ToolRunRow[]>([]);
  const [findings, setFindings] = useState<FindingRow[]>([]);
  const [reportRow, setReportRow] = useState<{
    id: string;
    status: string;
    updated_at: string;
  } | null>(null);
  const [cashEntryCount, setCashEntryCount] = useState(0);
  const [expenseCount, setExpenseCount] = useState(0);
  const [pipelineDealCount, setPipelineDealCount] = useState(0);

  // Load eligible customers (anyone in or past diagnostic activity)
  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from("customers")
        .select(
          "id, full_name, business_name, lifecycle_state, stage, package_diagnostic",
        )
        .is("archived_at", null)
        .order("last_activity_at", { ascending: false })
        .limit(200);
      const rows = (data ?? []) as CustomerOption[];
      // Prioritize package_diagnostic = true / lifecycle in diagnostic
      const sorted = rows.slice().sort((a, b) => {
        const score = (c: CustomerOption) =>
          (c.lifecycle_state === "diagnostic" ? 0 : 1) +
          (c.package_diagnostic ? 0 : 0.5);
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
    void (async () => {
      const [
        intakeRes,
        importsPendingRes,
        importsAllRes,
        uploadsRes,
        sourcesRes,
        runsRes,
        memRes,
        repRes,
        cashRes,
        expRes,
        dealsRes,
      ] = await Promise.all([
        supabase
          .from("diagnostic_intake_answers")
          .select("id", { head: true, count: "exact" })
          .eq("customer_id", selectedId),
        supabase
          .from("financial_imports")
          .select("id", { head: true, count: "exact" })
          .eq("customer_id", selectedId)
          .eq("status", "pending"),
        supabase
          .from("financial_imports")
          .select("id", { head: true, count: "exact" })
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
          .limit(20),
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
          .from("cash_flow_entries")
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

      setIntakeAnswerCount(intakeRes.count ?? 0);
      setImportsPending(importsPendingRes.count ?? 0);
      setImportsAll(importsAllRes.count ?? 0);
      setUploadsCount(uploadsRes.count ?? 0);
      setSourceRequests((sourcesRes.data ?? []) as any);
      setToolRuns((runsRes.data ?? []) as ToolRunRow[]);
      setFindings((memRes.data ?? []) as FindingRow[]);
      setReportRow((repRes.data as any) ?? null);
      setCashEntryCount(cashRes.count ?? 0);
      setExpenseCount(expRes.count ?? 0);
      setPipelineDealCount(dealsRes.count ?? 0);
    })();
  }, [selectedId]);

  const selected = useMemo(
    () => customers.find((c) => c.id === selectedId) ?? null,
    [customers, selectedId],
  );

  // Compute intake completeness from the data we have. Heuristic-only:
  // counts > 0 = "provided"; pending imports → "pending_review".
  const intakeAreas: IntakeArea[] = useMemo(() => {
    const acceptedSources = sourceRequests.filter(
      (s) => s.status === "connected" || s.status === "active",
    ).length;
    const pendingSources = sourceRequests.filter((s) =>
      ["requested", "setup_in_progress", "needs_review"].includes(s.status),
    ).length;

    const importsStatus: IntakeStatus =
      importsPending > 0
        ? "pending_review"
        : importsAll > 0
        ? "accepted"
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
        to: "/admin/diagnostic-system",
      },
      {
        key: "revenue_history",
        label: "Revenue history",
        status: cashEntryCount > 0 ? "provided" : "missing",
        detail:
          cashEntryCount > 0
            ? `${cashEntryCount} cash-flow entries`
            : "No cash-flow data captured",
      },
      {
        key: "expenses",
        label: "Expenses & cost structure",
        status: expenseCount > 0 ? "provided" : "missing",
        detail:
          expenseCount > 0
            ? `${expenseCount} expense entries`
            : "No expense entries yet",
      },
      {
        key: "pipeline",
        label: "Pipeline / acquisition",
        status: pipelineDealCount > 0 ? "provided" : "missing",
        detail:
          pipelineDealCount > 0
            ? `${pipelineDealCount} deals tracked`
            : "No pipeline data yet",
      },
      {
        key: "imports",
        label: "Spreadsheet imports",
        status: importsStatus,
        detail:
          importsPending > 0
            ? `${importsPending} pending review · ${importsAll} total`
            : importsAll > 0
            ? `${importsAll} import${importsAll === 1 ? "" : "s"} reconciled`
            : "No imports staged",
        to: "/admin/imports",
      },
      {
        key: "uploads",
        label: "Uploads & files",
        status: uploadsCount > 0 ? "provided" : "missing",
        detail:
          uploadsCount > 0
            ? `${uploadsCount} file${uploadsCount === 1 ? "" : "s"} uploaded`
            : "No client files uploaded",
        to: "/admin/files",
      },
      {
        key: "sources",
        label: "Connected sources",
        status:
          acceptedSources > 0
            ? "accepted"
            : pendingSources > 0
            ? "pending_review"
            : "missing",
        detail:
          acceptedSources > 0
            ? `${acceptedSources} connected · ${pendingSources} in flight`
            : pendingSources > 0
            ? `${pendingSources} request${pendingSources === 1 ? "" : "s"} in flight`
            : "No source connections yet",
        to: "/admin/integration-planning",
      },
    ];
  }, [
    intakeAnswerCount,
    cashEntryCount,
    expenseCount,
    pipelineDealCount,
    importsPending,
    importsAll,
    uploadsCount,
    sourceRequests,
  ]);

  // Sub-tool status derived from latest tool run per tool_key
  const toolStatus = useMemo(() => {
    const map = new Map<string, ToolRunRow>();
    for (const r of toolRuns) map.set(r.tool_key, r);
    return SUB_TOOLS.map((t) => {
      const run = map.get(t.key) ?? null;
      return { ...t, run };
    });
  }, [toolRuns]);

  // Report readiness
  const readiness = useMemo(() => {
    const missingAreas = intakeAreas.filter((a) => a.status === "missing").length;
    const pendingReviews = intakeAreas.filter(
      (a) => a.status === "pending_review" || a.status === "needs_follow_up",
    ).length;
    const completedTools = toolStatus.filter((t) => t.run && t.run.status === "completed").length;
    const totalTools = SUB_TOOLS.length;
    const findingsCount = findings.length;
    const ready =
      missingAreas === 0 &&
      pendingReviews === 0 &&
      completedTools >= Math.ceil(totalTools / 2) &&
      findingsCount > 0;
    return { missingAreas, pendingReviews, completedTools, totalTools, findingsCount, ready };
  }, [intakeAreas, toolStatus, findings]);

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
    <div className="space-y-4">
      {/* Case header / picker */}
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wider text-primary mb-1">
              Diagnostic case file
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
          <div className="flex items-center gap-2">
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger className="h-9 w-72 text-xs">
                <SelectValue placeholder="Select a client…" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.business_name || c.full_name}
                    {c.lifecycle_state === "diagnostic" ? "  · in diagnostic" : ""}
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

      {/* Two-column body */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Intake completeness */}
        <SectionCard
          title="Intake completeness"
          hint="What this client has provided vs what's still missing"
        >
          <ul className="space-y-2">
            {intakeAreas.map((a) => {
              const inner = (
                <div className="flex items-start justify-between gap-3 p-2.5 rounded-md border border-border bg-muted/20 hover:border-primary/30 transition-colors">
                  <div className="min-w-0">
                    <div className="text-xs text-foreground">{a.label}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                      {a.detail}
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
          hint="Latest run per tool — completed, in-progress, or not started"
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
                      <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                        {run
                          ? run.result_summary
                            ? run.result_summary
                            : `Last run ${new Date(run.run_date).toLocaleDateString()}`
                          : "Not yet run for this client"}
                      </div>
                    </div>
                    <span className={`text-[11px] ${tone} whitespace-nowrap`}>● {label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </SectionCard>

        {/* Review items in context */}
        <SectionCard
          title="Review items in this case"
          hint="What needs admin attention before findings can be trusted"
        >
          <div className="space-y-2">
            <ReviewLine
              label="Pending source requests"
              count={
                sourceRequests.filter((s) =>
                  ["requested", "setup_in_progress", "needs_review"].includes(s.status),
                ).length
              }
              to="/admin/integration-planning"
            />
            <ReviewLine
              label="Imports pending review"
              count={importsPending}
              to="/admin/imports"
            />
            <ReviewLine
              label="Uploaded files to review"
              count={uploadsCount}
              to="/admin/files"
              passive
            />
            <ReviewLine
              label="Intake answers to interpret"
              count={intakeAnswerCount}
              to="/admin/diagnostic-system"
              passive
            />
          </div>
        </SectionCard>

        {/* Findings */}
        <SectionCard
          title="Saved findings"
          hint="Diagnostic memory tied to this client (admin-only and client-safe)"
        >
          {findings.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">
              No saved findings yet. Findings are written by the engines and
              sub-tools as they run.
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
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wider whitespace-nowrap ${
                        f.client_visible ? "text-primary" : "text-muted-foreground"
                      }`}
                    >
                      {f.client_visible ? (
                        <Eye className="h-3 w-3" />
                      ) : (
                        <EyeOff className="h-3 w-3" />
                      )}
                      {f.client_visible ? "Client-safe" : "Admin only"}
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
            label="Draft report"
            value={reportRow ? reportRow.status : "none"}
          />
        </div>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div
            className={`text-xs ${
              readiness.ready ? "text-[hsl(140_50%_60%)]" : "text-muted-foreground"
            }`}
          >
            {readiness.ready ? (
              <span className="inline-flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Ready to package as a client report
              </span>
            ) : (
              <span className="inline-flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" /> Not yet ready — close the
                gaps above before handing off
              </span>
            )}
          </div>
          <Link
            to="/admin/reports"
            className="text-[11px] text-primary hover:text-secondary inline-flex items-center gap-1"
          >
            <FileText className="h-3 w-3" /> Open Reports & Reviews
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </SectionCard>
    </div>
  );
}

function ReviewLine({
  label,
  count,
  to,
  passive,
}: {
  label: string;
  count: number;
  to: string;
  passive?: boolean;
}) {
  const tone =
    count === 0
      ? "text-muted-foreground"
      : passive
      ? "text-foreground"
      : "text-[hsl(40_90%_60%)]";
  return (
    <Link
      to={to}
      className="flex items-center justify-between gap-3 p-2.5 rounded-md border border-border bg-muted/20 hover:border-primary/30 transition-colors"
    >
      <span className="text-xs text-foreground">{label}</span>
      <span className={`text-xs ${tone} inline-flex items-center gap-1`}>
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
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div
        className={`mt-1 text-lg font-light ${
          bad ? "text-destructive" : "text-foreground"
        }`}
      >
        {value}
      </div>
    </div>
  );
}