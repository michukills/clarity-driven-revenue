import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");

const APP = read("src/App.tsx");
const REPORT_TYPES = read("src/lib/reports/types.ts");

const CLIENT_PAGES = [
  "src/pages/portal/tools/ImplementationRoadmap.tsx",
  "src/pages/portal/tools/SopTrainingBible.tsx",
  "src/pages/portal/tools/DecisionRightsAccountability.tsx",
  "src/pages/portal/tools/WorkflowProcessMapping.tsx",
  "src/pages/portal/tools/ToolAssignmentTrainingTracker.tsx",
] as const;

const FORBIDDEN = [
  /unlimited support/i,
  /unlimited consulting/i,
  /guaranteed (results|revenue|roi|outcomes?)/i,
  /done[- ]for[- ]you/i,
  /full[- ]service/i,
  /we run your business/i,
  /we manage everything/i,
  /hands[- ]off for the owner/i,
  /HIPAA/i,
  /tax advice/i,
  /legal advice/i,
  /accounting advice/i,
  /compliance advice/i,
  /lorem ipsum/i,
  /coming soon/i,
];

describe("Implementation Tool Deep Hardening", () => {
  it("admin implementation routes remain ProtectedRoute requireRole=\"admin\"", () => {
    const adminRoutes = [
      "/admin/customers/:customerId/implementation-roadmap",
      "/admin/customers/:customerId/sop-training-bible",
      "/admin/customers/:customerId/decision-rights-accountability",
      "/admin/customers/:customerId/workflow-process-mapping",
      "/admin/customers/:customerId/tool-assignment-training-tracker",
    ];
    for (const route of adminRoutes) {
      const re = new RegExp(`path="${route}"[^>]*requireRole="admin"`);
      expect(APP).toMatch(re);
    }
  });

  it("client implementation tools remain wrapped in ClientToolGuard", () => {
    const guards: Array<[string, string]> = [
      ["/portal/tools/implementation-roadmap", "implementation_roadmap"],
      ["/portal/tools/sop-training-bible", "sop_training_bible"],
      ["/portal/tools/decision-rights-accountability", "decision_rights_accountability"],
      ["/portal/tools/workflow-process-mapping", "workflow_process_mapping"],
      ["/portal/tools/tool-assignment-training-tracker", "tool_assignment_training_tracker"],
    ];
    for (const [path, key] of guards) {
      const re = new RegExp(
        `path="${path}"[\\s\\S]*?ClientToolGuard\\s+toolKey="${key}"`,
      );
      expect(APP).toMatch(re);
    }
  });

  it("customer-specific admin implementation routes are not exposed as global admin routes", () => {
    const fakeGlobals = [
      /path="\/admin\/implementation-roadmap"/,
      /path="\/admin\/sop-training-bible"/,
      /path="\/admin\/decision-rights-accountability"/,
      /path="\/admin\/workflow-process-mapping"/,
      /path="\/admin\/tool-assignment-training-tracker"/,
    ];
    for (const re of fakeGlobals) expect(APP).not.toMatch(re);
  });

  it("implementation_report and tool_specific report types remain registered", () => {
    expect(REPORT_TYPES).toMatch(/"implementation_report"/);
    expect(REPORT_TYPES).toMatch(/"tool_specific"/);
  });

  it("ImplementationScopeBanner exists and is rendered on each implementation client tool", () => {
    expect(existsSync(join(root, "src/components/tools/ImplementationScopeBanner.tsx"))).toBe(true);
    for (const p of CLIENT_PAGES) {
      const src = read(p);
      expect(src).toMatch(/ImplementationScopeBanner/);
    }
  });

  it("client implementation pages never reference internal/admin-only notes", () => {
    for (const p of CLIENT_PAGES) {
      const src = read(p);
      expect(src).not.toMatch(/internal_notes/);
      expect(src).not.toMatch(/handoff_notes/);
      expect(src).not.toMatch(/admin[_-]?only/i);
    }
  });

  it("client implementation pages do not contain banned scope-creep wording", () => {
    for (const p of CLIENT_PAGES) {
      const src = read(p);
      for (const re of FORBIDDEN) expect(src, `${p} :: ${re}`).not.toMatch(re);
    }
  });

  it("ImplementationScopeBanner makes included/excluded boundary explicit and references RGS Control System for ongoing visibility", () => {
    const banner = read("src/components/tools/ImplementationScopeBanner.tsx");
    expect(banner).toMatch(/Included/);
    expect(banner).toMatch(/Outside this scope/);
    expect(banner).toMatch(/RGS Control System/);
    for (const re of FORBIDDEN) expect(banner).not.toMatch(re);
  });

  it("doc rgs-implementation-tool-deep-hardening.md exists", () => {
    expect(existsSync(join(root, "docs/rgs-implementation-tool-deep-hardening.md"))).toBe(true);
  });
});