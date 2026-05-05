// P77 — Owner Admin Command Center: Standalone Tool Runner + Gig
// Deliverable Report Generator contract tests.

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  STANDALONE_GIG_SCOPE_BOUNDARY,
  STANDALONE_GIG_TIERS,
  STANDALONE_TOOL_RUNNER_BRAIN_KEY,
  CANNABIS_OPERATIONAL_READINESS_NOTE,
  getStandaloneTool,
  listStandaloneTools,
} from "@/lib/standaloneToolRunner";
import {
  REPORTABLE_TOOL_CATALOG,
  TOOL_SPECIFIC_REPORT_AI_BRAIN_KEY,
} from "@/lib/reports/toolReports";

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");

describe("P77 — runner reuses P76 reportable tool registry", () => {
  it("listStandaloneTools is built from REPORTABLE_TOOL_CATALOG (no duplicate registry)", () => {
    const standalone = listStandaloneTools().map((t) => t.toolKey).sort();
    const p76 = REPORTABLE_TOOL_CATALOG.map((t) => t.toolKey).sort();
    expect(standalone).toEqual(p76);
  });

  it("anchors AI to the P75A tool_specific_report brain key", () => {
    expect(STANDALONE_TOOL_RUNNER_BRAIN_KEY).toBe(
      TOOL_SPECIFIC_REPORT_AI_BRAIN_KEY,
    );
    expect(STANDALONE_TOOL_RUNNER_BRAIN_KEY).toBe("tool_specific_report");
  });
});

describe("P77 — eligibility honesty", () => {
  it("every tool has a known eligibility classification", () => {
    const allowed = new Set([
      "eligible_built",
      "eligible_needs_data",
      "admin_only",
      "client_internal_only",
      "not_reportable_yet",
      "planned",
    ]);
    for (const t of listStandaloneTools()) {
      expect(allowed.has(t.eligibility)).toBe(true);
      expect(t.gigUseCase.length).toBeGreaterThan(20);
    }
  });

  it("planned/not-reportable tools cannot run", () => {
    for (const t of listStandaloneTools()) {
      if (
        t.eligibility === "planned" ||
        t.eligibility === "not_reportable_yet" ||
        t.eligibility === "client_internal_only"
      ) {
        expect(t.canRun).toBe(false);
      }
    }
  });

  it("at least the launch-critical tools are runnable", () => {
    for (const key of [
      "owner_diagnostic_interview",
      "business_stability_scorecard",
      "sop_training_bible",
      "implementation_roadmap",
    ]) {
      const t = getStandaloneTool(key);
      expect(t).toBeTruthy();
      expect(t!.canRun).toBe(true);
    }
  });
});

describe("P77 — gig deliverable tiers + scope language", () => {
  it("exposes the required gig tiers", () => {
    const keys = STANDALONE_GIG_TIERS.map((t) => t.key);
    for (const required of [
      "fiverr_basic_snapshot",
      "fiverr_standard",
      "internal_admin_report",
      "client_summary",
      "implementation_support_report",
    ]) {
      expect(keys).toContain(required);
    }
  });

  it("standalone scope boundary explicitly excludes Full RGS / legal / tax / valuation framings", () => {
    const t = STANDALONE_GIG_SCOPE_BOUNDARY.toLowerCase();
    for (const phrase of [
      "full rgs business stress test",
      "structural health report",
      "implementation plan",
      "legal opinion",
      "tax/accounting review",
      "compliance certification",
      "valuation",
      "fiduciary",
      "guarantee",
    ]) {
      expect(t).toContain(phrase);
    }
  });

  it("cannabis/MMJ note is operational readiness only, not compliance certification", () => {
    const c = CANNABIS_OPERATIONAL_READINESS_NOTE.toLowerCase();
    expect(c).toContain("operational documentation readiness");
    expect(c).toContain("not legal compliance certifications");
    expect(c).toContain("qualified");
  });
});

describe("P77 — admin-only routing + UI plumbing", () => {
  it("page exists and uses PortalShell admin variant", () => {
    const p = "src/pages/admin/StandaloneToolRunner.tsx";
    expect(existsSync(join(root, p))).toBe(true);
    const src = read(p);
    expect(src).toContain('variant="admin"');
    expect(src).toContain("createStandaloneGigDeliverable");
    expect(src).toContain("STANDALONE_GIG_TIERS");
    expect(src).toMatch(/data-testid="standalone-tool-runner"/);
  });

  it("route is registered admin-only in App.tsx", () => {
    const app = read("src/App.tsx");
    expect(app).toContain('"/admin/standalone-tool-runner"');
    expect(app).toMatch(
      /\/admin\/standalone-tool-runner[\s\S]{0,200}requireRole="admin"/,
    );
    expect(app).toContain("StandaloneToolRunnerPage");
  });

  it("admin sidebar nav exposes the runner under the admin system group", () => {
    const nav = read("src/components/portal/PortalShell.tsx");
    expect(nav).toContain("/admin/standalone-tool-runner");
    expect(nav).toContain("Standalone Tool Runner");
  });
});

describe("P77 — runner does NOT duplicate the report writer", () => {
  it("standaloneToolRunner.ts delegates to generateToolSpecificDraft and never inserts into report_drafts directly", () => {
    const src = read("src/lib/standaloneToolRunner.ts");
    expect(src).toContain("generateToolSpecificDraft");
    expect(src).not.toMatch(/from\(\s*["']report_drafts["']\s*\)\.insert/);
    // No duplicate storage bucket references either.
    expect(src).not.toMatch(/tool-reports/);
  });
});

describe("P77 — old positioning wording remains absent", () => {
  const SCAN_FILES = [
    "src/lib/standaloneToolRunner.ts",
    "src/pages/admin/StandaloneToolRunner.tsx",
  ];
  const FORBIDDEN = [
    "lay the bricks",
    "provides the blueprint",
    "teaches the owner to lay the bricks",
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

describe("P77 — no frontend secrets / no provider URLs in runner", () => {
  it("runner module never references gateway URLs or API keys", () => {
    const src = read("src/lib/standaloneToolRunner.ts");
    expect(src).not.toMatch(/LOVABLE_API_KEY/);
    expect(src).not.toMatch(/ai\.gateway\.lovable\.dev/);
    expect(src).not.toMatch(/sk_live_|sk_test_/);
  });
});