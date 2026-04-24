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
  DomainBoundary,
  StepHeader,
} from "@/components/domains/DomainShell";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Stethoscope } from "lucide-react";
import { ConnectedSourceRequestsPanel } from "@/components/admin/ConnectedSourceRequestsPanel";
import { DiagnosticCaseFile } from "@/components/admin/diagnostic-workspace/DiagnosticCaseFile";

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
  const [inDiagnostic, setInDiagnostic] = useState(0);

  useEffect(() => {
    void (async () => {
      const [{ count: a }, { count: r }, { count: rep }, { count: ld }] = await Promise.all([
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
        supabase
          .from("customers")
          .select("id", { head: true, count: "exact" })
          .eq("lifecycle_state", "diagnostic"),
      ]);
      setActiveCount(a ?? 0);
      setReviewCount(r ?? 0);
      setReportsCount(rep ?? 0);
      setInDiagnostic(ld ?? 0);
    })();
  }, []);

  return (
    <PortalShell variant="admin">
      <DomainShell
        eyebrow="RGS OS · Admin Workspace"
        title="Diagnostic Workspace"
        description="The single command center for diagnostic delivery. Inputs from the client, analysis engines, and the review-to-report pipeline — all in one place."
      >
        <DomainBoundary
          scope="Reviewing client-supplied data, running diagnostic engines, and producing reviewed findings & reports."
          outOfScope="Implementation rollout, SOPs, tool distribution (see Implementation Workspace). Revenue Tracker is a separate RCC tool."
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatTile label="Stage-based active diagnostics" value={activeCount} hint="Sales pipeline stage" />
          <StatTile label="Imports pending review" value={reviewCount} />
          <StatTile label="Draft reports" value={reportsCount} />
          <StatTile label="Lifecycle: in diagnostic" value={inDiagnostic} hint="Operational state, not sales stage" />
        </div>

        <DomainSection
          title="Active diagnostic case"
          subtitle="Pick a client to see their full diagnostic state in one case file"
        >
          <DiagnosticCaseFile />
        </DomainSection>

        <DomainSection
          title="Step 1 · Inputs from the client"
          subtitle="Everything the client has shared — the trusted input layer for every diagnostic"
        >
          <StepHeader
            step={1}
            title="Confirm what the client has provided"
            hint="Stage and verify before running analysis"
          />
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
          <div className="mt-4">
            <ConnectedSourceRequestsPanel />
          </div>
        </DomainSection>

        <DomainSection
          title="Step 2 · Run the analysis"
          subtitle="The engines and sub-tools that turn inputs into findings"
        >
          <StepHeader
            step={2}
            title="Run engines and sub-tools"
            hint="Each tool produces evidence that feeds the report"
          />
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
          title="Step 3 · Review & deliver"
          subtitle="Approve findings, save benchmarks, and package the report"
        >
          <StepHeader
            step={3}
            title="Review and package findings"
            hint="Nothing reaches the client until it's reviewed here"
          />
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
      </DomainShell>
    </PortalShell>
  );
}
