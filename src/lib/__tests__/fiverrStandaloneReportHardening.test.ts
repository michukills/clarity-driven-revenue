import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  REPORT_TYPE_TEMPLATES,
  buildReportPdfFilename,
  getReportTypeTemplate,
} from "@/lib/reports/reportTypeTemplates";
import {
  STANDALONE_GIG_SCOPE_BOUNDARY,
  STANDALONE_TOOL_PACKAGE_LADDERS,
  getStandalonePackageForTier,
  getStandaloneToolReadinessAudit,
  listStandaloneTools,
} from "@/lib/standaloneToolRunner";

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");

const fiverrTiers = [
  "fiverr_basic_diagnostic",
  "fiverr_standard_diagnostic",
  "fiverr_premium_diagnostic",
] as const;

describe("Urgent report hardening — exact diagnostic report names", () => {
  it("locks the three Fiverr diagnostic report levels", () => {
    expect(getReportTypeTemplate("fiverr_basic_diagnostic")).toMatchObject({
      reportName: "Business Health Check Report",
      packageName: "Business Health Check",
      shortPackageDescription: "Quick stability score and system snapshot.",
      expectedDeliveryDays: 2,
      walkthroughMinutes: 30,
      priceTarget: "$150",
      reportWorld: "fiverr_standalone_diagnostic",
    });
    expect(getReportTypeTemplate("fiverr_standard_diagnostic")).toMatchObject({
      reportName: "Business Systems Diagnostic Report",
      packageName: "Business Systems Diagnostic Report",
      shortPackageDescription: "Full systems audit and priority breakdown.",
      expectedDeliveryDays: 3,
      walkthroughMinutes: 30,
      priceTarget: "$300-$350",
      reportWorld: "fiverr_standalone_diagnostic",
    });
    expect(getReportTypeTemplate("fiverr_premium_diagnostic")).toMatchObject({
      reportName: "Priority Repair Roadmap Report",
      packageName: "Priority Repair Roadmap Report",
      shortPackageDescription: "Deep diagnostic with root causes and repair roadmap.",
      expectedDeliveryDays: 4,
      walkthroughMinutes: 60,
      priceTarget: "$600-$650",
      reportWorld: "fiverr_standalone_diagnostic",
    });
  });

  it("keeps the full RGS paying-client diagnostic separate and protected", () => {
    const full = getReportTypeTemplate("full_rgs_diagnostic");
    expect(full.reportName).toBe("Full RGS Business Stability Diagnostic Report");
    expect(full.reportWorld).toBe("full_rgs_client_diagnostic");
    expect(full.isFullRgsDiagnostic).toBe(true);
    expect(full.includesFullScorecard).toBe(true);
    expect(full.includesFullFiveGearAnalysis).toBe(true);

    for (const tier of fiverrTiers) {
      const t = getReportTypeTemplate(tier);
      expect(t.reportWorld).toBe("fiverr_standalone_diagnostic");
      expect(t.isFullRgsDiagnostic).toBe(false);
      expect(t.reportName).not.toBe(full.reportName);
    }
  });

  it("lower Fiverr tiers do not include flagship-only full RGS sections", () => {
    const flagshipOnly = [
      "source_of_truth_notes",
      "worn_tooth_signals",
      "reality_check_flags",
      "cost_of_friction",
      "implementation_readiness_notes",
    ];
    for (const tier of fiverrTiers) {
      const keys = getReportTypeTemplate(tier).sections.map((s) => s.key);
      for (const key of flagshipOnly) {
        expect(keys, `${tier} must not include ${key}`).not.toContain(key);
      }
    }
    const fullKeys = getReportTypeTemplate("full_rgs_diagnostic").sections.map(
      (s) => s.key,
    );
    for (const key of flagshipOnly) expect(fullKeys).toContain(key);
  });

  it("locks the required section shapes for each diagnostic level", () => {
    const basic = getReportTypeTemplate("fiverr_basic_diagnostic").sections.map((s) => s.title);
    expect(basic).toEqual(
      expect.arrayContaining([
        "Overall 0–1000 Score",
        "High-Level Gear Score Summary",
        "3–5 Key Weak Points",
        "Short RGS Stability Snapshot",
        "Basic Next Steps",
      ]),
    );

    const standard = getReportTypeTemplate("fiverr_standard_diagnostic").sections.map((s) => s.title);
    expect(standard).toEqual(
      expect.arrayContaining([
        "0–1000 Score Breakdown",
        "Demand Generation Explanation",
        "Revenue Conversion Explanation",
        "Operational Efficiency Explanation",
        "Financial Visibility Explanation",
        "Owner Independence Explanation",
        "Top 3 Priorities",
        "RGS Stability Snapshot",
      ]),
    );

    const premium = getReportTypeTemplate("fiverr_premium_diagnostic").sections.map((s) => s.title);
    expect(premium).toEqual(
      expect.arrayContaining([
        "Full Diagnostic Summary",
        "Root-Cause Notes",
        "Priority Repair Roadmap",
        "Quick Wins",
        "Big Rocks",
        "Fillers",
        "De-Prioritize",
        "What to Fix First, Second, and Later",
        "Evidence Gaps / Clarification Needs",
      ]),
    );
  });
});

describe("Urgent report hardening — PDF naming and export safety", () => {
  const date = new Date("2026-05-07T12:00:00Z");

  it("builds exact SEO/readable report PDF filenames", () => {
    expect(buildReportPdfFilename("fiverr_basic_diagnostic", "Acme Plumbing", date)).toBe(
      "Business_Health_Check_Report_Acme_Plumbing_2026-05-07.pdf",
    );
    expect(buildReportPdfFilename("fiverr_standard_diagnostic", "Acme Plumbing", date)).toBe(
      "Business_Systems_Diagnostic_Report_Acme_Plumbing_2026-05-07.pdf",
    );
    expect(buildReportPdfFilename("fiverr_premium_diagnostic", "Acme Plumbing", date)).toBe(
      "Priority_Repair_Roadmap_Report_Acme_Plumbing_2026-05-07.pdf",
    );
    expect(buildReportPdfFilename("full_rgs_diagnostic", "Acme Plumbing", date)).toBe(
      "Full_RGS_Business_Stability_Diagnostic_Report_Acme_Plumbing_2026-05-07.pdf",
    );
  });

  it("admin report export uses the filename helper and client-safe section allowlist", () => {
    const src = read("src/pages/admin/ReportDraftDetail.tsx");
    expect(src).toContain("buildReportPdfFilename");
    expect(src).toMatch(/sections\.filter\(\(s\)\s*=>\s*s\.client_safe\)/);
    expect(src).toMatch(/status === "approved"/);
    expect(src).toContain("Report world");
    expect(src).not.toMatch(/admin_notes[\s\S]{0,120}generateRunPdf/);
  });

  it("report AI assist mirrors exact report names and remains admin-review only", () => {
    const edge = read("supabase/functions/report-ai-assist/index.ts");
    for (const name of [
      "Business Health Check Report",
      "Business Systems Diagnostic Report",
      "Priority Repair Roadmap Report",
      "Full RGS Business Stability Diagnostic Report",
    ]) {
      expect(edge).toContain(name);
    }
    expect(edge).toContain("client_safe: false");
    expect(edge).toContain('status: "needs_review"');
    expect(edge).toMatch(/Do not invent revenue, costs, percentages/);
  });
});

describe("Urgent report hardening — standalone package ladders", () => {
  const expected = {
    sop_training_bible: [
      "Single SOP Process Report",
      "SOP Training Guide Report",
      "Process Training Bible Report",
    ],
    buyer_persona_tool: [
      "Buyer Snapshot Report",
      "ICP and Buyer Persona Report",
      "Buyer Strategy Map Report",
    ],
    workflow_process_mapping: [
      "Workflow Snapshot Report",
      "Process Breakdown Report",
      "Workflow Repair Map Report",
    ],
    decision_rights_accountability: [
      "Role Clarity Snapshot Report",
      "Accountability Map Report",
      "Decision Rights Repair Map Report",
    ],
    revenue_risk_monitor: [
      "Revenue Leak Snapshot Report",
      "Revenue Risk Review Report",
      "Revenue Repair Map Report",
    ],
  };

  it("defines approved three-level ladders for every mandatory standalone tool", () => {
    for (const [toolKey, reportNames] of Object.entries(expected)) {
      const ladder = STANDALONE_TOOL_PACKAGE_LADDERS.find((l) => l.toolKey === toolKey);
      expect(ladder, `${toolKey} ladder missing`).toBeTruthy();
      expect(ladder!.canBeSoldNow).toBe(true);
      expect(ladder!.pdfExportAvailable).toBe(true);
      expect(ladder!.adminReviewAvailable).toBe(true);
      expect(ladder!.clientVisibleApprovalGateAvailable).toBe(true);
      expect(ladder!.tenantIsolationRlsSafe).toBe(true);
      expect([
        ladder!.packages.basic.reportName,
        ladder!.packages.standard.reportName,
        ladder!.packages.premium.reportName,
      ]).toEqual(reportNames);
    }
  });

  it("maps Fiverr tier selections to the right package report names", () => {
    expect(
      getStandalonePackageForTier("sop_training_bible", "fiverr_basic_snapshot")?.reportName,
    ).toBe("Single SOP Process Report");
    expect(
      getStandalonePackageForTier("buyer_persona_tool", "fiverr_standard")?.reportName,
    ).toBe("ICP and Buyer Persona Report");
    expect(
      getStandalonePackageForTier("workflow_process_mapping", "fiverr_premium")?.reportName,
    ).toBe("Workflow Repair Map Report");
  });

  it("readiness audit does not falsely mark tools without ladders as sellable", () => {
    const audit = getStandaloneToolReadinessAudit();
    for (const row of audit) {
      const hasLadder = STANDALONE_TOOL_PACKAGE_LADDERS.some(
        (l) => l.toolKey === row.tool_key,
      );
      expect(row.can_be_sold_now).toBe(hasLadder);
      if (!hasLadder) {
        expect(row.missing_before_sale.join(" ")).toMatch(/three-level package ladder/i);
      }
    }
  });

  it("runner reuses the reportable tool registry and includes mandatory reportable tools", () => {
    const keys = listStandaloneTools().map((t) => t.toolKey);
    for (const key of Object.keys(expected)) {
      expect(keys).toContain(key);
    }
    expect(STANDALONE_GIG_SCOPE_BOUNDARY).toContain(
      "Full RGS Business Stability Diagnostic Report",
    );
    expect(STANDALONE_GIG_SCOPE_BOUNDARY).toContain("tax/accounting review");
    expect(STANDALONE_GIG_SCOPE_BOUNDARY).toContain("compliance certification");
  });
});

describe("Urgent report hardening — forbidden claim guardrails", () => {
  it("client/package-facing report config avoids unsupported professional conclusions", () => {
    const text = JSON.stringify({
      reports: REPORT_TYPE_TEMPLATES,
      ladders: STANDALONE_TOOL_PACKAGE_LADDERS,
    }).toLowerCase();
    for (const phrase of [
      "compliance certified",
      "legally compliant",
      "license protection",
      "audit guaranteed",
      "lender ready",
      "investor ready",
      "valuation ready",
      "tax compliance",
      "safe from penalties",
      "enforcement protection",
      "done-for-you operator",
      "we run your business",
    ]) {
      expect(text).not.toContain(phrase);
    }
  });
});
