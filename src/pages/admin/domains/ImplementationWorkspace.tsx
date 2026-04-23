/**
 * P12.4 — Unified Admin Implementation Workspace.
 *
 * One command center for implementation delivery: rollout, systemization,
 * SOPs, tasks, templates, and operational execution after a diagnostic
 * is signed off.
 *
 * Boundaries:
 *   - This workspace does NOT contain diagnostic analysis.
 *   - Revenue Tracker is intentionally NOT collapsed in here — it remains
 *     a separately assignable / removable RCC tool surfaced to clients
 *     under the Revenue Control Center.
 */

import { useEffect, useState } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import {
  DomainShell,
  DomainSection,
  LinkRow,
  StatTile,
} from "@/components/domains/DomainShell";
import { supabase } from "@/integrations/supabase/client";
import { Wrench, Lock } from "lucide-react";

const IMPL_STAGES: readonly (
  | "implementation"
  | "implementation_added"
  | "implementation_onboarding"
  | "implementation_active"
  | "work_in_progress"
)[] = [
  "implementation",
  "implementation_added",
  "implementation_onboarding",
  "implementation_active",
  "work_in_progress",
];

export default function ImplementationWorkspace() {
  const [activeImpl, setActiveImpl] = useState(0);
  const [openTasks, setOpenTasks] = useState(0);

  useEffect(() => {
    void (async () => {
      const [{ count: a }, { count: t }] = await Promise.all([
        supabase
          .from("customers")
          .select("id", { head: true, count: "exact" })
          .in("stage", IMPL_STAGES),
        supabase
          .from("customer_tasks")
          .select("id", { head: true, count: "exact" })
          .eq("status", "open"),
      ]);
      setActiveImpl(a ?? 0);
      setOpenTasks(t ?? 0);
    })();
  }, []);

  return (
    <PortalShell variant="admin">
      <DomainShell
        eyebrow="RGS OS · Unified Tool"
        title="Implementation Workspace"
        description="One workspace for implementation delivery — rollout, systemization, SOPs, and operational execution. Diagnostic analysis lives in the Diagnostic Workspace."
      >
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          <StatTile label="Active implementations" value={activeImpl} />
          <StatTile label="Open tasks" value={openTasks} />
          <StatTile label="Tools available" value="—" hint="Tool distribution & assignment" />
        </div>

        <DomainSection
          title="Rollout & systemization"
          subtitle="The day-to-day surfaces for delivering on a diagnostic plan"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <LinkRow
              to="/admin/operations-sop"
              label="Operations / SOP System"
              hint="Procedures, automation map, operational backbone"
            />
            <LinkRow
              to="/admin/tasks"
              label="Tasks"
              hint="Active operational tasks across clients"
            />
            <LinkRow
              to="/admin/templates"
              label="Templates"
              hint="Reusable documents and outreach assets"
            />
            <LinkRow
              to="/admin/files"
              label="Files"
              hint="Internal + client file storage"
            />
          </div>
        </DomainSection>

        <DomainSection
          title="Tool distribution"
          subtitle="Assign and manage the tools each client uses during implementation"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <LinkRow
              to="/admin/tool-distribution"
              label="Tool Distribution"
              hint="Per-client tool assignment matrix"
            />
            <LinkRow
              to="/admin/tool-matrix"
              label="Tool Matrix"
              hint="Coverage view across all clients"
            />
            <LinkRow
              to="/admin/tools"
              label="Tool Library"
              hint="All tools, internal and client-facing"
            />
            <LinkRow
              to="/admin/client-management"
              label="Client Management"
              hint="Per-client implementation status"
            />
          </div>
        </DomainSection>

        <DomainSection
          title="Boundary: ongoing-support tools"
          subtitle="Tools that remain separately assignable and are intentionally not collapsed in here"
        >
          <div className="space-y-2">
            <div className="p-3 rounded-md border border-dashed border-border bg-muted/20">
              <div className="flex items-start gap-2">
                <Lock className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm text-foreground">Revenue Tracker</div>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                    Lives under the client's Revenue Control Center. Stays
                    separately assignable and removable for clients who don't
                    continue into ongoing support. Not part of this workspace
                    by design.
                  </p>
                </div>
              </div>
            </div>
            <LinkRow
              to="/admin/add-on-monitoring"
              label="Add-On / Monitoring"
              hint="Manage RCC subscription and add-on tools per client"
            />
          </div>
        </DomainSection>

        <div className="mt-2 p-3 rounded-md border border-dashed border-border text-[11px] text-muted-foreground">
          <Wrench className="h-3.5 w-3.5 inline mr-1.5 text-primary" />
          This workspace is implementation-only. Diagnostic analysis lives in
          the Diagnostic Workspace. Revenue Tracker stays separate.
        </div>
      </DomainShell>
    </PortalShell>
  );
}
