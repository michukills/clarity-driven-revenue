import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ADMIN_TOOL_DIRECTORY_ENTRIES,
  ADMIN_TOOL_DIRECTORY_LANES,
} from "../../components/admin/AdminToolDirectory";

const APP_TSX = readFileSync(join(process.cwd(), "src/App.tsx"), "utf8");
const ADMIN_DASHBOARD = readFileSync(
  join(process.cwd(), "src/pages/admin/AdminDashboard.tsx"),
  "utf8",
);
const DIRECTORY_SRC = readFileSync(
  join(process.cwd(), "src/components/admin/AdminToolDirectory.tsx"),
  "utf8",
);

const FORBIDDEN_LANGUAGE = [
  "guaranteed",
  "unlimited support",
  "trusted by",
  "case study",
  "testimonial",
  "HIPAA",
  "tax advice",
  "legal advice",
  "coming soon",
  "lorem ipsum",
];

describe("Admin Tool Directory (Command Center menu)", () => {
  it("is rendered inside the Admin Command Center", () => {
    expect(ADMIN_DASHBOARD).toContain("AdminToolDirectory");
    expect(ADMIN_DASHBOARD).toContain('from "@/components/admin/AdminToolDirectory"');
  });

  it("includes all four required service lanes", () => {
    for (const lane of ["Diagnostic", "Implementation", "RGS Control System", "Admin / System"]) {
      expect(ADMIN_TOOL_DIRECTORY_LANES).toContain(lane as never);
      expect(ADMIN_TOOL_DIRECTORY_ENTRIES.some((t) => t.lane === lane)).toBe(true);
    }
  });

  it("only links to real admin routes registered in App.tsx", () => {
    for (const tool of ADMIN_TOOL_DIRECTORY_ENTRIES) {
      if (!tool.href) {
        expect(tool.customerScoped).toBe(true);
        expect(tool.notes && tool.notes.length > 0).toBe(true);
        continue;
      }
      expect(tool.href.startsWith("/admin")).toBe(true);
      // route registered with path="..." in App.tsx
      expect(APP_TSX.includes(`path="${tool.href}"`)).toBe(true);
    }
  });

  it("never exposes a global route for customer-specific tools", () => {
    for (const tool of ADMIN_TOOL_DIRECTORY_ENTRIES) {
      if (tool.customerScoped) {
        expect(tool.href).toBeUndefined();
      }
    }
  });

  it("uses a scrollable container and a search input", () => {
    expect(DIRECTORY_SRC).toContain("ScrollArea");
    expect(DIRECTORY_SRC).toContain("admin-tool-directory-search");
    expect(DIRECTORY_SRC).toContain("admin-tool-directory-trigger");
  });

  it("contains no fake-proof or forbidden marketing language", () => {
    const haystack = (DIRECTORY_SRC + JSON.stringify(ADMIN_TOOL_DIRECTORY_ENTRIES)).toLowerCase();
    for (const term of FORBIDDEN_LANGUAGE) {
      expect(haystack.includes(term.toLowerCase())).toBe(false);
    }
  });

  it("every tool entry has name, purpose, lane, and access metadata", () => {
    for (const tool of ADMIN_TOOL_DIRECTORY_ENTRIES) {
      expect(tool.name.length).toBeGreaterThan(2);
      expect(tool.purpose.length).toBeGreaterThan(10);
      expect(tool.lane.length).toBeGreaterThan(0);
      expect(tool.access.length).toBeGreaterThan(0);
    }
  });

  it("includes the explicitly-required diagnostic surfaces", () => {
    const names = ADMIN_TOOL_DIRECTORY_ENTRIES.map((t) => t.name.toLowerCase());
    for (const required of [
      "owner diagnostic interview",
      "stability scorecard",
      "scorecard leads",
      "saved benchmarks",
      "diagnostic workspace",
      "swot analysis",
      "persona builder",
      "journey mapper",
      "process breakdown",
    ]) {
      expect(names.some((n) => n.includes(required))).toBe(true);
    }
  });
});