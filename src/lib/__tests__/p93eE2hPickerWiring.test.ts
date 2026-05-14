/**
 * P93E-E2H — Workflow customer picker wiring contract.
 *
 * Static source check that every workflow-driving admin selector renders
 * the shared <EligibleCustomerSelect /> component (which in turn calls
 * `listEligibleCustomers`), instead of building its own raw
 * `from("customers").select(...)` dropdown. This is the closeout proof
 * for P93E-E2H.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  EXTENDED_LIFECYCLE_LABELS,
  lifecycleLabel,
} from "@/lib/customers/packages";

const root = resolve(__dirname, "../../..");
const read = (p: string) => readFileSync(resolve(root, p), "utf8");

const PICKER_SOURCES = {
  reports: "src/pages/admin/Reports.tsx",
  reportDrafts: "src/pages/admin/ReportDrafts.tsx",
  diagnosticInterviewDetail: "src/pages/admin/DiagnosticInterviewDetail.tsx",
  standaloneToolRunner: "src/pages/admin/StandaloneToolRunner.tsx",
};

describe("P93E-E2H — workflow customer pickers", () => {
  it("Reports generate-draft picker uses EligibleCustomerSelect", () => {
    const src = read(PICKER_SOURCES.reports);
    expect(src).toContain("EligibleCustomerSelect");
    expect(src).toContain('testIdPrefix="reports-generate-client"');
    // No raw customer <option> dropdown for the generate flow.
    expect(src).not.toMatch(/onChange=\{\(e\) => setGenCustomerId/);
  });

  it("Report Drafts generate picker uses EligibleCustomerSelect", () => {
    const src = read(PICKER_SOURCES.reportDrafts);
    expect(src).toContain("EligibleCustomerSelect");
    expect(src).toContain('testIdPrefix="report-drafts-generate-client"');
    expect(src).not.toMatch(/c\.is_demo_account \? " · DEMO" : ""/);
  });

  it("Diagnostic Interview link-customer picker uses EligibleCustomerSelect", () => {
    const src = read(PICKER_SOURCES.diagnosticInterviewDetail);
    expect(src).toContain("EligibleCustomerSelect");
    expect(src).toContain('testIdPrefix="diagnostic-interview-link-customer"');
  });

  it("Standalone Tool Runner customer picker still uses the shared selector", () => {
    const src = read(PICKER_SOURCES.standaloneToolRunner);
    expect(src).toContain("listEligibleCustomers");
    expect(src).toContain("standalone-include-demo");
  });

  it("EligibleCustomerSelect always wires through listEligibleCustomers", () => {
    const src = read("src/components/admin/EligibleCustomerSelect.tsx");
    expect(src).toContain("listEligibleCustomers");
    expect(src).toContain("Include active demo accounts");
  });

  it("Extended lifecycle vocabulary covers the P93E-E2H minimum states", () => {
    const required = [
      "lead",
      "demo_active",
      "demo_disabled",
      "standalone_tool_draft",
      "standalone_tool_active",
      "standalone_tool_delivered",
      "diagnostic_intake_started",
      "diagnostic_interview_started",
      "diagnostic_interview_completed",
      "evidence_pending",
      "evidence_under_review",
      "report_in_progress",
      "report_ready",
      "review_scheduled",
      "repair_map_delivered",
      "implementation_proposed",
      "implementation_active",
      "control_system_active",
      "archived",
      "disabled",
    ];
    for (const k of required) {
      expect(EXTENDED_LIFECYCLE_LABELS[k]).toBeTruthy();
    }
    expect(lifecycleLabel("standalone_tool_draft")).toBe("Standalone Tool Draft");
    expect(lifecycleLabel("repair_map_delivered")).toBe("Repair Map Delivered");
    // Legacy values still resolve through LIFECYCLE_STATES.
    expect(lifecycleLabel("diagnostic")).toBe("In Diagnostic");
    expect(lifecycleLabel(null)).toBe("Lead");
  });
});
