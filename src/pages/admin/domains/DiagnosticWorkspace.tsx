/**
 * P12.4 — Unified Admin Diagnostic Workspace.
 *
 * One command center for the diagnostic side of the OS. Internally
 * modular, externally one tool. Surfaces:
 *
 *   - Client-supplied data (synced, imported, uploaded, intake answers)
 *   - Diagnostic system + per-client engines / sub-tools
 *   - Review queue + saved benchmarks
 *   - Reports & report editor
 *
 * Implementation work and ongoing-support tools live elsewhere:
 *   - /admin/implementation-workspace
 *   - Revenue Tracker stays separately assignable (RCC).
 */

import { PortalShell } from "@/components/portal/PortalShell";
import {
  DomainShell,
  DomainSection,
  LinkRow,
  StatTile,
} from "@/components/domains/DomainShell";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Stethoscope } from "lucide-react";

const DX_ACTIVE: readonly (
  | "diagnostic_paid"
  | "diagnostic_in_progress"
  | "diagnostic_delivered"
  | "decision_pending"
)[] = [
  "diagnostic_paid",
  "diagnostic_in_progress",
  "diagnostic_delivered",
  "decision_pending",
];

export default function DiagnosticWorkspace() {
  const [activeCount, setActiveCount] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [reportsCount, setReportsCount] = useState(0);

  useEffect(() => {
    void (async () => {
      const [{ count: a }, { count: r }, { count: rep }] = await Promise.all([
        supabase
          .from("customers")
          .select("id", { head: true, count: "exact" })
          .in("stage", DX_ACTIVE),
        supabase
          .from("financial_imports")
          .select("id", { head: true, count: "exact" })
          .eq("status", "pending"),
        supabase
          .from("business_control_reports")
          .select("id", { head: true, count: "exact" })
          .eq("status", "draft"),
      ]);
      setActiveCount(a ?? 0);
      setReviewCount(r ?? 0);
      setReportsCount(rep ?? 0);
    })();
  }, []);

  return (
    <PortalShell variant="admin">
      <DomainShell
        eyebrow="RGS OS · Unified Tool"
        title="Diagnostic Workspace"
        description="One workspace for diagnostic delivery. Client-supplied truth on the left, analysis tools in the middle, findings & reports on the right. Implementation work lives in its own workspace."
      >
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          <StatTile label="Active diagnostics" value={activeCount} />
          <StatTile label="Imports pending review" value={reviewCount} />
          <StatTile label="Draft reports" value={reportsCount} />
        </div>

        <DomainSection
          title="Client-supplied data"
          subtitle="What clients have provided — the input layer of every diagnostic"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <LinkRow
              to="/admin/imports"
              label="CSV / Spreadsheet Imports"
              hint="Stage and reconcile uploaded data per client"
            />
            <LinkRow
              to="/admin/integration-planning"
              label="Connected Sources Planning"
              hint="Connector strategy, mapping, verification policy"
            />
            <LinkRow
              to="/admin/files"
              label="Client Files"
              hint="Documents, statements, screenshots from clients"
            />
            <LinkRow
              to="/admin/diagnostic-system"
              label="Diagnostic Intake Answers"
              hint="Per-client intake progress and answers"
            />
          </div>
        </DomainSection>

        <DomainSection
          title="Diagnostic analysis"
          subtitle="Engines and sub-tools used to complete the diagnostic"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <LinkRow
              to="/admin/diagnostic-system"
              label="Diagnostic System"
              hint="Per-client checklist, engines remaining, ready-for-review queue"
            />
            <LinkRow
              to="/admin/scorecard-system"
              label="Stability Scorecard"
              hint="Scoring, benchmarking, trend"
            />
            <LinkRow
              to="/admin/tools/revenue-leak-finder"
              label="Revenue Leak Finder"
              hint="Identify revenue leakage across the funnel"
            />
            <LinkRow
              to="/admin/tools/persona-builder"
              label="Buyer Persona Builder"
              hint="Who the offer is actually for"
            />
            <LinkRow
              to="/admin/tools/journey-mapper"
              label="Customer Journey Mapper"
              hint="Awareness → close, drawn end-to-end"
            />
            <LinkRow
              to="/admin/tools/process-breakdown"
              label="Process Breakdown"
              hint="Where the operation breaks before the sale"
            />
          </div>
        </DomainSection>

        <DomainSection
          title="Findings, review & reports"
          subtitle="Where diagnostic output is reviewed, saved, and packaged"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <LinkRow
              to="/admin/rgs-review-queue"
              label="RGS Review Queue"
              hint="What needs admin review before it's trusted"
            />
            <LinkRow
              to="/admin/saved-benchmarks"
              label="Saved Benchmarks"
              hint="Historical anchors for stability scoring"
            />
            <LinkRow
              to="/admin/reports"
              label="Reports & Reviews"
              hint="Diagnostic and business reports for clients"
            />
            <LinkRow
              to="/admin/rgs-business-control-center"
              label="RGS Business Control Center"
              hint="Internal RGS operating ledger"
            />
          </div>
        </DomainSection>

        <div className="mt-2 p-3 rounded-md border border-dashed border-border text-[11px] text-muted-foreground">
          <Stethoscope className="h-3.5 w-3.5 inline mr-1.5 text-primary" />
          This workspace is diagnostic-only. Implementation rollout, SOPs, and
          ongoing-support tools belong in the Implementation Workspace. The
          client Revenue Tracker remains a separately assignable RCC tool.
        </div>
      </DomainShell>
    </PortalShell>
  );
}
