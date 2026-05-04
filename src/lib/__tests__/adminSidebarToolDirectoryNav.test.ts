import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const SHELL = readFileSync(join(process.cwd(), "src/components/portal/PortalShell.tsx"), "utf8");
const APP = readFileSync(join(process.cwd(), "src/App.tsx"), "utf8");
const PAGE = readFileSync(join(process.cwd(), "src/pages/admin/AdminToolDirectoryPage.tsx"), "utf8");
const DIRECTORY = readFileSync(join(process.cwd(), "src/components/admin/AdminToolDirectory.tsx"), "utf8");

describe("Admin sidebar — RGS Tool Directory access", () => {
  it("renders an RGS Tool Directory entry in the admin sidebar", () => {
    expect(SHELL).toContain('label: "RGS Tool Directory"');
    expect(SHELL).toContain('to: "/admin/tool-directory"');
  });

  it("registers /admin/tool-directory as an admin-only route", () => {
    expect(APP).toMatch(
      /path="\/admin\/tool-directory"\s+element=\{<ProtectedRoute requireRole="admin"><AdminToolDirectoryPage \/><\/ProtectedRoute>\}/,
    );
    expect(APP).toContain('import AdminToolDirectoryPage from "./pages/admin/AdminToolDirectoryPage"');
  });

  it("page reuses the existing AdminToolDirectory registry/panel (no duplicate directory)", () => {
    expect(PAGE).toContain('from "@/components/admin/AdminToolDirectory"');
    expect(PAGE).toContain("AdminToolDirectoryPanel");
    // No duplicate TOOLS array invented in the page
    expect(PAGE).not.toMatch(/const TOOLS\s*[:=]/);
  });

  it("AdminToolDirectory still exposes the Sheet trigger and registry exports", () => {
    expect(DIRECTORY).toContain("admin-tool-directory-trigger");
    expect(DIRECTORY).toContain("admin-tool-directory-search");
    expect(DIRECTORY).toContain("ADMIN_TOOL_DIRECTORY_ENTRIES");
    expect(DIRECTORY).toContain("ADMIN_TOOL_DIRECTORY_LANES");
  });

  it("preserves existing top-level admin sidebar routes (Command Center, Pipeline, Clients)", () => {
    expect(SHELL).toMatch(/to: "\/admin",\s*icon: LayoutDashboard,\s*label: "Command Center"/);
    expect(SHELL).toContain('to: "/admin/crm-pipeline"');
    expect(SHELL).toContain('label: "Pipeline / Orders"');
    expect(SHELL).toContain('to: "/admin/client-management"');
    expect(SHELL).toContain('label: "Clients"');
  });

  it("does not expose the admin tool directory route to client portal nav", () => {
    // customerNavBase should not include /admin/tool-directory
    const nav = SHELL.split("const customerNavBase")[1] ?? "";
    expect(nav.includes("/admin/tool-directory")).toBe(false);
  });

  it("page contains no fake-proof or forbidden marketing language", () => {
    const lower = PAGE.toLowerCase();
    for (const term of [
      "guaranteed",
      "unlimited support",
      "trusted by",
      "case study",
      "testimonial",
      "hipaa",
      "tax advice",
      "legal advice",
      "coming soon",
      "lorem ipsum",
    ]) {
      expect(lower.includes(term)).toBe(false);
    }
  });
});