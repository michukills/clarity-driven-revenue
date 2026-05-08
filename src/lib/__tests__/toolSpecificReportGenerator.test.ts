// P69 — Tool-Specific Report Generator framework contract tests.

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  REPORTABLE_TOOL_CATALOG,
  buildToolReportFilename,
  buildToolReportPdfDoc,
  getReportableTool,
  isToolReportable,
} from "@/lib/reports/toolReports";
import {
  REPORT_TYPE_TEMPLATES,
  getReportTypeTemplate,
} from "@/lib/reports/reportTypeTemplates";
import { labelForType } from "@/lib/reports/draftService";

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");

describe("P69 — main report tiers are preserved", () => {
  const required = [
    "full_rgs_diagnostic",
    "fiverr_basic_diagnostic",
    "fiverr_standard_diagnostic",
    "fiverr_premium_diagnostic",
    "implementation_report",
  ] as const;

  it.each(required)("template still exists for %s", (key) => {
    expect(REPORT_TYPE_TEMPLATES[key]).toBeTruthy();
    expect(getReportTypeTemplate(key).label).toBeTruthy();
    expect(labelForType(key)).toBeTruthy();
  });

  it("DB constraint migration still allows every main tier value", () => {
    // Lightweight check via the prior P65 migration (unchanged file).
    const prior = read(
      "supabase/migrations/20260504142731_a2c35778-fe09-4875-a826-75928496a439.sql",
    );
    for (const k of required) {
      expect(prior).toContain(`'${k}'`);
    }
  });
});

describe("P69 — tool_specific is registered as a separate type", () => {
  it("template exists and is bounded", () => {
    const tpl = getReportTypeTemplate("tool_specific");
    expect(tpl.label).toBe("Tool-Specific Report");
    expect(tpl.isFullRgsDiagnostic).toBe(false);
    expect(tpl.includesFullScorecard).toBe(false);
    expect(tpl.includesFullFiveGearAnalysis).toBe(false);
    expect(tpl.scopeBoundary).toMatch(/not the Full RGS Business Stability Diagnostic Report/i);
    expect(tpl.scopeBoundary).toMatch(/not implementation/i);
    expect(tpl.scopeBoundary).toMatch(/RGS Control System/i);
    expect(tpl.exclusions.join(" ")).toMatch(/legal, tax/i);
    expect(tpl.exclusions.join(" ")).toMatch(/No guarantee/i);
  });

  it("labelForType handles tool_specific", () => {
    expect(labelForType("tool_specific")).toBe("Tool-Specific Report");
  });

  it("DB check constraint allows tool_specific (latest migration)", () => {
    // Scan all migration files for the latest report_type CHECK that includes tool_specific.
    const dir = join(root, "supabase/migrations");
    const files = readdirSync(dir).filter((f) => f.endsWith(".sql"));
    const hit = files.some((f) => {
      const c = readFileSync(join(dir, f), "utf8");
      return (
        /report_drafts_report_type_check/.test(c) &&
        /'tool_specific'/.test(c)
      );
    });
    expect(hit).toBe(true);
  });
});

describe("P69 — reportable tool catalog", () => {
  it("includes a non-empty diagnostic / implementation / control-system mix", () => {
    expect(REPORTABLE_TOOL_CATALOG.length).toBeGreaterThanOrEqual(10);
    const lanes = new Set(REPORTABLE_TOOL_CATALOG.map((t) => t.serviceLane));
    expect(lanes.has("diagnostic")).toBe(true);
    expect(lanes.has("implementation")).toBe(true);
    expect(lanes.has("rgs_control_system")).toBe(true);
  });

  it("admin-internal tools are not auto-client-facing", () => {
    const advisory = getReportableTool("advisory_notes");
    const tracker = getReportableTool("tool_assignment_training_tracker");
    expect(advisory?.clientFacingEligible).toBe(false);
    expect(tracker?.clientFacingEligible).toBe(false);
  });

  it("isToolReportable is honest", () => {
    expect(isToolReportable("priority_action_tracker")).toBe(true);
    expect(isToolReportable("definitely_not_a_tool")).toBe(false);
  });
});

describe("P69 — PDF builder is bounded and admin-safe", () => {
  const built = buildToolReportPdfDoc({
    toolName: "Owner Decision Dashboard",
    customerLabel: "Acme",
    title: "Owner Decision Dashboard — Tool-Specific Report",
    generatedAt: new Date("2026-05-04T00:00:00Z"),
    sections: [
      {
        key: "summary",
        label: "Summary",
        body: "Bounded summary body.",
        client_safe: true,
      },
      {
        key: "internal",
        label: "Internal Notes",
        body: "ADMIN ONLY MUST NOT LEAK",
        client_safe: false,
      },
    ],
  });

  it("only includes client_safe sections", () => {
    const json = JSON.stringify(built);
    expect(json).toContain("Bounded summary body");
    expect(json).not.toContain("ADMIN ONLY MUST NOT LEAK");
    expect(json).not.toContain("Internal Notes");
  });

  it("appends scope boundary and professional disclaimer", () => {
    const json = JSON.stringify(built);
    expect(json).toMatch(/Scope Boundary/);
    expect(json).toMatch(/Professional Review Disclaimer/);
    expect(json).toMatch(/not the Full RGS Business Stability Diagnostic Report/i);
  });

  it("title/meta identify the report as Tool-Specific", () => {
    expect(built.title).toMatch(/Tool-Specific Report/i);
    const metaFlat = JSON.stringify(built.meta);
    expect(metaFlat).toMatch(/Tool-Specific Report/i);
    expect(metaFlat).toMatch(/Owner Decision Dashboard/);
  });
});

describe("P69 — filename is safe (no IDs, no internal terms)", () => {
  it("slugifies tool + title and includes a date", () => {
    const fn = buildToolReportFilename(
      "Owner Decision Dashboard",
      "Q2 review for Client Inc.",
    );
    expect(fn).toMatch(/^tool-report-owner-decision-dashboard-/);
    expect(fn).toMatch(/\d{4}-\d{2}-\d{2}$/);
    expect(fn).not.toMatch(/internal|admin|secret/i);
  });
});

describe("P69 — framework source contains no banned client-leaking language", () => {
  const src = read("src/lib/reports/toolReports.ts");
  it("does not introduce fake proof / guarantee / unlimited language", () => {
    expect(src).not.toMatch(/guaranteed (?:roi|results?|outcome)/i);
    expect(src).not.toMatch(/unlimited (?:support|consulting|advisory)/i);
    expect(src).not.toMatch(/trusted by/i);
    expect(src).not.toMatch(/case stud(?:y|ies)/i);
    expect(src).not.toMatch(/HIPAA|patient care/i);
  });
  it("defaults are admin-safe (client_safe false on creation)", () => {
    expect(src).toMatch(/client_safe:\s*false/);
    expect(src).toMatch(/status:\s*"draft"/);
    expect(src).toMatch(/report_type:\s*"tool_specific"/);
  });
});
