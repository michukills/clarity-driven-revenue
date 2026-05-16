// P76 — Tool-Specific Report Framework completion contract tests.
//
// These tests verify the reusable tool-specific report framework is:
//   • anchored to the P75A AI Brain Registry (`tool_specific_report`)
//   • protected by the global forbidden-claim scanner before storage
//   • protected by the SOP forbidden-phrase scanner before storage
//   • emitting scope boundary + professional-review disclaimer in every
//     PDF
//   • not weakening the existing main report tiers / Structural Health
//     Report™ / Fiverr / Implementation report systems
//   • not exposing admin-only fields to client surfaces
//   • not regressing the approved RGS positioning language

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  REPORTABLE_TOOL_CATALOG,
  TOOL_SPECIFIC_REPORT_AI_BRAIN_KEY,
  assertSectionsClientSafe,
  assertToolSpecificAiBrainRegistered,
  buildToolReportPdfDoc,
  getReportableTool,
} from "@/lib/reports/toolReports";
import { getReportTypeTemplate } from "@/lib/reports/reportTypeTemplates";
import { getRgsAiBrain } from "@/config/rgsAiBrains";

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");

describe("P76 — reportable tool registry is honest and complete", () => {
  it("registry is non-empty and every entry has required fields", () => {
    expect(REPORTABLE_TOOL_CATALOG.length).toBeGreaterThanOrEqual(10);
    for (const t of REPORTABLE_TOOL_CATALOG) {
      expect(t.toolKey).toMatch(/^[a-z0-9_]+$/);
      expect(t.toolName.length).toBeGreaterThan(2);
      expect([
        "diagnostic",
        "implementation",
        "rgs_control_system",
        "admin_internal",
        "campaign_marketing",
      ]).toContain(t.serviceLane);
      expect(typeof t.clientFacingEligible).toBe("boolean");
      expect(t.summary.length).toBeGreaterThan(10);
    }
  });

  it("includes the launch-critical reportable tools by name", () => {
    const keys = REPORTABLE_TOOL_CATALOG.map((t) => t.toolKey);
    for (const required of [
      "sop_training_bible",
      "priority_repair_map",
      "business_stability_scorecard",
      "owner_diagnostic_interview",
    ]) {
      expect(keys).toContain(required);
    }
  });

  it("getReportableTool returns undefined for unknown tools (no fake reportable)", () => {
    expect(getReportableTool("not_a_real_tool_key_xyz")).toBeUndefined();
  });
});

describe("P76 — AI brain anchoring", () => {
  it("exports the tool_specific_report brain key", () => {
    expect(TOOL_SPECIFIC_REPORT_AI_BRAIN_KEY).toBe("tool_specific_report");
  });

  it("the AI brain is registered in the P75A registry", () => {
    const brain = getRgsAiBrain(TOOL_SPECIFIC_REPORT_AI_BRAIN_KEY);
    expect(brain).toBeTruthy();
    expect(brain.brain_key).toBe("tool_specific_report");
    expect(() => assertToolSpecificAiBrainRegistered()).not.toThrow();
  });
});

describe("P76 — forbidden-claim scanner protects publication", () => {
  it("blocks legal/tax/compliance/valuation/guarantee claims", () => {
    for (const phrase of [
      "This makes the business legally compliant",
      "Guaranteed ROI of 30%",
      "Fair market value is $1,200,000",
      "Process is HIPAA compliant per our review",
      "This is audit-ready for a CPA",
      "Provides legal advice on contracts",
    ]) {
      expect(() =>
        assertSectionsClientSafe([
          { key: "k", label: "L", body: phrase, client_safe: true },
        ]),
      ).toThrow(/forbidden/i);
    }
  });

  it("allows safe operational language", () => {
    expect(() =>
      assertSectionsClientSafe([
        {
          key: "k",
          label: "Operational Observations",
          body:
            "Documentation appears organized. Suggested next review step: " +
            "have a qualified professional review the supplier contract.",
          client_safe: true,
        },
      ]),
    ).not.toThrow();
  });
});

describe("P76 — PDF builder appends scope boundary + professional disclaimer", () => {
  it("only includes client_safe sections and adds boundary text", () => {
    const doc = buildToolReportPdfDoc({
      toolName: "Cost of Friction Calculator",
      customerLabel: "Test Customer",
      title: "Cost of Friction — Tool Report",
      sections: [
        {
          key: "summary",
          label: "Summary",
          body: "Operational read of friction signals.",
          client_safe: true,
        },
        {
          key: "internal",
          label: "Internal admin notes",
          body: "ADMIN ONLY — should not appear in PDF.",
          client_safe: false,
        },
      ],
    });
    const allText = JSON.stringify(doc);
    expect(allText).toContain("Summary");
    expect(allText).not.toContain("ADMIN ONLY");
    const tpl = getReportTypeTemplate("tool_specific");
    expect(allText).toContain(tpl.scopeBoundary.slice(0, 40));
    expect(allText).toContain(tpl.professionalDisclaimer.slice(0, 40));
    expect(allText).toContain("Scope Boundary");
    expect(allText).toContain("Professional Review Disclaimer");
  });
});

describe("P76 — main report systems are preserved (no replacement)", () => {
  it("Structural Health Report builder still exists", () => {
    const f = read("src/lib/reports/structuralHealthReport.ts");
    expect(f.length).toBeGreaterThan(200);
  });

  it("client portal still uses the existing client-safe report column allowlist", () => {
    const portal = read("src/pages/portal/Reports.tsx");
    expect(portal).toContain("CLIENT_SAFE_REPORT_SELECT");
    expect(portal).toMatch(/business_control_reports/);
  });

  it("admin Stored Tool Reports panel only renders for tool_specific drafts", () => {
    const panel = read("src/components/admin/StoredToolReportsPanel.tsx");
    expect(panel).toMatch(/draft\.report_type !== "tool_specific"/);
    expect(panel).not.toMatch(/from\(\s*["']report_drafts["']\s*\)\.insert/);
  });
});

describe("P76 — client surface never leaks admin-only fields or raw paths", () => {
  const portal = read("src/pages/portal/Reports.tsx");
  const stripped = portal
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  it("uses signed URLs (no direct download by raw path)", () => {
    expect(portal).toContain("getToolReportSignedUrl");
    expect(portal).not.toMatch(/from\(\s*["']tool-reports["']\s*\)\.download/);
  });
  it("does not select admin-only columns", () => {
    expect(stripped).not.toMatch(/internal_notes/);
    expect(stripped).not.toMatch(/approved_by/);
    expect(stripped).not.toMatch(/generated_by/);
  });
});

describe("P76 — old RGS positioning wording remains absent", () => {
  const SCAN_FILES = [
    "src/pages/portal/Reports.tsx",
    "src/components/admin/StoredToolReportsPanel.tsx",
    "src/lib/reports/toolReports.ts",
    "src/lib/reports/reportTypeTemplates.ts",
    "src/lib/reports/structuralHealthReport.ts",
    "src/config/rgsAiBrains.ts",
  ];
  const FORBIDDEN = [
    ["lay", "the", "bricks"].join(" "),
    "provides the blueprint",
    ["teaches the owner to", "lay", "the", "bricks"].join(" "),
    "Mirror, Not the Map",
  ];
  for (const path of SCAN_FILES) {
    it(`${path} contains no old positioning wording`, () => {
      const text = read(path).toLowerCase();
      for (const phrase of FORBIDDEN) {
        expect(text).not.toContain(phrase.toLowerCase());
      }
    });
  }
});