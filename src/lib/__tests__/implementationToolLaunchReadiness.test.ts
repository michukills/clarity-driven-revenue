import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");

const APP = read("src/App.tsx");
const REPORT_TYPES = read("src/lib/reports/types.ts");

const allMigrations = (() => {
  const dir = join(root, "supabase/migrations");
  return readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => readFileSync(join(dir, f), "utf8"))
    .join("\n");
})();

/**
 * Implementation Tool Launch Readiness — proves each Implementation lane tool
 * has the schema, admin code path, client code path, and report/source
 * readiness required to actually capture, save, review, and deliver an
 * implementation artifact. This complements (not replaces) the per-tool
 * contract tests.
 */

const TOOLS = [
  {
    name: "Implementation Roadmap",
    table: "implementation_roadmap_items",
    parentTable: "implementation_roadmaps",
    requiredColumns: [
      "customer_id",
      "roadmap_id",
      "source_repair_map_item_id",
      "source_finding_id",
      "title",
      "client_summary",
      "internal_notes",
      "priority",
      "phase",
      "owner_type",
      "status",
      "deliverable",
      "success_indicator",
      "client_visible",
      "archived_at",
    ],
    libFile: "src/lib/implementationRoadmap.ts",
    adminFns: ["adminCreateRoadmap", "adminUpdateRoadmap", "adminCreateRoadmapItem", "adminUpdateRoadmapItem", "adminArchiveRoadmapItem"],
    clientFn: "getClientImplementationRoadmap",
    rpc: "get_client_implementation_roadmap",
    adminPage: "src/pages/admin/ImplementationRoadmapAdmin.tsx",
    clientPage: "src/pages/portal/tools/ImplementationRoadmap.tsx",
    adminRoute: "/admin/customers/:customerId/implementation-roadmap",
    clientRoute: "/portal/tools/implementation-roadmap",
    toolKey: "implementation_roadmap",
  },
  {
    name: "SOP / Training Bible",
    table: "sop_training_entries",
    requiredColumns: [
      "customer_id",
      "implementation_roadmap_item_id",
      "title",
      "purpose",
      "role_team",
      "trigger_when_used",
      "inputs_tools_needed",
      "quality_standard",
      "common_mistakes",
      "escalation_point",
      "owner_decision_point",
      "training_notes",
      "client_summary",
      "internal_notes",
      "steps",
      "version",
      "status",
      "review_state",
      "client_visible",
      "archived_at",
    ],
    libFile: "src/lib/sopTrainingBible.ts",
    adminFns: ["adminCreateSopEntry", "adminUpdateSopEntry", "adminArchiveSopEntry"],
    clientFn: "getClientSopTrainingBible",
    rpc: "get_client_sop_training_bible",
    adminPage: "src/pages/admin/SopTrainingBibleAdmin.tsx",
    clientPage: "src/pages/portal/tools/SopTrainingBible.tsx",
    adminRoute: "/admin/customers/:customerId/sop-training-bible",
    clientRoute: "/portal/tools/sop-training-bible",
    toolKey: "sop_training_bible",
  },
  {
    name: "Decision Rights / Accountability",
    table: "decision_rights_entries",
    requiredColumns: [
      "customer_id",
      "implementation_roadmap_item_id",
      "sop_training_entry_id",
      "title",
      "business_area",
      "decision_or_responsibility",
      "decision_owner",
      "action_owner",
      "approver",
      "consulted",
      "informed",
      "escalation_path",
      "handoff_trigger",
      "decision_cadence",
      "client_summary",
      "internal_notes",
      "status",
      "client_visible",
      "archived_at",
    ],
    libFile: "src/lib/decisionRights.ts",
    adminFns: ["adminCreateDecisionRights", "adminUpdateDecisionRights", "adminArchiveDecisionRights"],
    clientFn: "getClientDecisionRights",
    rpc: "get_client_decision_rights",
    adminPage: "src/pages/admin/DecisionRightsAccountabilityAdmin.tsx",
    clientPage: "src/pages/portal/tools/DecisionRightsAccountability.tsx",
    adminRoute: "/admin/customers/:customerId/decision-rights-accountability",
    clientRoute: "/portal/tools/decision-rights-accountability",
    toolKey: "decision_rights_accountability",
  },
  {
    name: "Workflow / Process Mapping",
    table: "workflow_process_maps",
    requiredColumns: [
      "customer_id",
      "implementation_roadmap_item_id",
      "title",
      "process_purpose",
      "process_trigger",
      "current_state_summary",
      "desired_future_state_summary",
      "process_owner",
      "primary_roles",
      "systems_tools_used",
      "handoff_points",
      "decision_points",
      "bottlenecks",
      "rework_loops",
      "steps",
      "client_summary",
      "internal_notes",
      "status",
      "client_visible",
      "archived_at",
    ],
    libFile: "src/lib/workflowProcessMapping.ts",
    adminFns: ["adminCreateWorkflowMap", "adminUpdateWorkflowMap", "adminArchiveWorkflowMap"],
    clientFn: "getClientWorkflowMaps",
    rpc: "get_client_workflow_process_maps",
    adminPage: "src/pages/admin/WorkflowProcessMappingAdmin.tsx",
    clientPage: "src/pages/portal/tools/WorkflowProcessMapping.tsx",
    adminRoute: "/admin/customers/:customerId/workflow-process-mapping",
    clientRoute: "/portal/tools/workflow-process-mapping",
    toolKey: "workflow_process_mapping",
  },
  {
    name: "Tool Assignment + Training Tracker",
    table: "tool_training_tracker_entries",
    requiredColumns: [
      "customer_id",
      "tool_key",
      "tool_name_snapshot",
      "service_lane",
      "customer_journey_phase",
      "access_source",
      "access_status",
      "training_required",
      "training_status",
      "trained_people",
      "trained_roles",
      "training_method",
      "training_date",
      "next_training_step",
      "client_expectation",
      "rgs_support_scope",
      "handoff_status",
      "handoff_notes",
      "client_summary",
      "internal_notes",
      "status",
      "client_visible",
      "archived_at",
    ],
    libFile: "src/lib/toolTrainingTracker.ts",
    adminFns: ["adminCreateTrackerEntry", "adminUpdateTrackerEntry", "adminArchiveTrackerEntry"],
    clientFn: "getClientTrackerEntries",
    rpc: "get_client_tool_training_tracker_entries",
    adminPage: "src/pages/admin/ToolAssignmentTrainingTrackerAdmin.tsx",
    clientPage: "src/pages/portal/tools/ToolAssignmentTrainingTracker.tsx",
    adminRoute: "/admin/customers/:customerId/tool-assignment-training-tracker",
    clientRoute: "/portal/tools/tool-assignment-training-tracker",
    toolKey: "tool_assignment_training_tracker",
  },
] as const;

const FORBIDDEN = [
  /unlimited support/i,
  /unlimited consulting/i,
  /guaranteed (results|revenue|roi|outcomes?)/i,
  /done[- ]for[- ]you/i,
  /full[- ]service/i,
  /HIPAA/i,
  /tax advice/i,
  /legal advice/i,
  /accounting advice/i,
  /compliance advice/i,
] as const;

describe("Implementation Tool Launch Readiness", () => {
  for (const tool of TOOLS) {
    describe(tool.name, () => {
      it("schema includes every required field for an implementation deliverable", () => {
        // Capture the CREATE TABLE block for this tool's primary table.
        const re = new RegExp(
          `CREATE TABLE IF NOT EXISTS public\\.${tool.table}\\s*\\(([\\s\\S]*?)\\n\\)`,
        );
        const m = allMigrations.match(re);
        expect(m, `CREATE TABLE for ${tool.table} not found`).toBeTruthy();
        const block = m![1];
        for (const col of tool.requiredColumns) {
          expect(block, `${tool.table} missing column ${col}`).toMatch(
            new RegExp(`(^|\\n)\\s*${col}\\s+`),
          );
        }
      });

      it("RLS is enabled on the primary table", () => {
        expect(allMigrations).toMatch(
          new RegExp(`ALTER TABLE public\\.${tool.table} ENABLE ROW LEVEL SECURITY`),
        );
      });

      it("admin lib exposes create/update/archive helpers", () => {
        const lib = read(tool.libFile);
        for (const fn of tool.adminFns) {
          expect(lib).toMatch(new RegExp(`export async function ${fn}\\b`));
        }
        expect(lib).toMatch(new RegExp(`export async function ${tool.clientFn}\\b`));
      });

      it("client RPC exists, is SECURITY DEFINER, and never selects admin-only notes", () => {
        const rpcRe = new RegExp(
          `CREATE OR REPLACE FUNCTION public\\.${tool.rpc}[\\s\\S]*?\\$\\$;`,
        );
        const m = allMigrations.match(rpcRe);
        expect(m, `${tool.rpc} RPC not found`).toBeTruthy();
        expect(m![0]).toMatch(/SECURITY DEFINER/);
        expect(m![0]).not.toMatch(/internal_notes/);
        expect(m![0]).not.toMatch(/\bhandoff_notes\b/);
        expect(allMigrations).toMatch(
          new RegExp(
            `REVOKE ALL ON FUNCTION public\\.${tool.rpc}\\(uuid\\) FROM PUBLIC`,
          ),
        );
        expect(allMigrations).toMatch(
          new RegExp(
            `GRANT EXECUTE ON FUNCTION public\\.${tool.rpc}\\(uuid\\) TO authenticated`,
          ),
        );
      });

      it("admin page wires save/update behavior and includes client_visible toggle", () => {
        const page = read(tool.adminPage);
        // At least one admin update/create function is invoked from the admin page.
        const usesAnyAdminFn = tool.adminFns.some((fn) =>
          new RegExp(`\\b${fn}\\b`).test(page),
        );
        expect(usesAnyAdminFn, `${tool.adminPage} must wire an admin helper`).toBe(true);
        expect(page).toMatch(/client_visible/);
      });

      it("client page uses the safe RPC and never references admin-only notes", () => {
        const page = read(tool.clientPage);
        expect(page).toMatch(new RegExp(`\\b${tool.clientFn}\\b`));
        expect(page).not.toMatch(/internal_notes/);
        expect(page).not.toMatch(/\bhandoff_notes\b/);
      });

      it("admin route is requireRole=\"admin\" and customer-scoped", () => {
        const re = new RegExp(`path="${tool.adminRoute}"[^>]*requireRole="admin"`);
        expect(APP).toMatch(re);
        // No fake global admin route for this customer-scoped tool.
        const globalRoute = tool.adminRoute.replace("/customers/:customerId", "");
        const fake = new RegExp(`path="${globalRoute}"`);
        expect(APP).not.toMatch(fake);
      });

      it("client route is wrapped in ClientToolGuard with the correct toolKey", () => {
        const re = new RegExp(
          `path="${tool.clientRoute}"[\\s\\S]*?ClientToolGuard\\s+toolKey="${tool.toolKey}"`,
        );
        expect(APP).toMatch(re);
      });

      it("client + admin pages are free of scope-creep / out-of-scope advice", () => {
        for (const page of [tool.clientPage, tool.adminPage]) {
          const src = read(page);
          for (const re of FORBIDDEN) {
            expect(src, `${page} :: ${re}`).not.toMatch(re);
          }
        }
      });
    });
  }

  it("implementation_report and tool_specific report types remain registered", () => {
    expect(REPORT_TYPES).toMatch(/"implementation_report"/);
    expect(REPORT_TYPES).toMatch(/"tool_specific"/);
  });

  it("tool_report_artifacts table and report_drafts table both remain", () => {
    expect(allMigrations).toMatch(/CREATE TABLE.*public\.tool_report_artifacts/);
    expect(allMigrations).toMatch(/CREATE TABLE.*public\.report_drafts/);
  });

  it("Implementation lane is documented with a launch-readiness proof table", () => {
    expect(existsSync(join(root, "docs/rgs-implementation-tool-deep-hardening.md"))).toBe(true);
    const doc = read("docs/rgs-implementation-tool-deep-hardening.md");
    expect(doc).toMatch(/Launch-ready/);
    for (const tool of TOOLS) {
      expect(doc, `doc must reference ${tool.table}`).toMatch(new RegExp(tool.table));
    }
  });

  it("ImplementationScopeBanner is mounted on every implementation client page", () => {
    for (const tool of TOOLS) {
      const src = read(tool.clientPage);
      expect(src, `${tool.clientPage} missing scope banner`).toMatch(/ImplementationScopeBanner/);
    }
  });

  it("Customer Detail links to every customer-scoped implementation admin tool", () => {
    const detail = read("src/pages/admin/CustomerDetail.tsx");
    for (const tool of TOOLS) {
      const slug = tool.adminRoute.split("/").pop()!;
      expect(detail, `CustomerDetail missing link to ${slug}`).toMatch(new RegExp(slug));
    }
  });
});