// P70.1 — Tool-Specific Report admin/client workflow contract tests.
//
// Static contract tests proving the usable workflow exists and is wired
// safely. We do not boot React/JSDOM here; we read source to assert the
// component contract, the routes wiring, and the safety boundaries.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");

describe("P70.1 — admin Stored Tool Reports panel exists and is wired", () => {
  const panel = read("src/components/admin/StoredToolReportsPanel.tsx");
  const detail = read("src/pages/admin/ReportDraftDetail.tsx");

  it("panel uses the storage helpers (no ad-hoc storage code)", () => {
    for (const fn of [
      "storeToolReportPdf",
      "listToolReportArtifacts",
      "setToolReportArtifactClientVisible",
      "getToolReportSignedUrl",
    ]) {
      expect(panel).toContain(fn);
    }
  });

  it("panel only renders for tool_specific drafts", () => {
    expect(panel).toMatch(/draft\.report_type !== "tool_specific"/);
  });

  it("panel exposes Generate & store, Open, and Visibility actions", () => {
    expect(panel).toMatch(/Generate &amp; store PDF|Generate & store PDF/);
    expect(panel).toMatch(/Mark client-visible/);
    expect(panel).toMatch(/Make admin-only/);
    expect(panel).toMatch(/Open/);
  });

  it("panel refuses to publish when underlying draft is not approved + client_safe", () => {
    expect(panel).toMatch(
      /draft\.status !== "approved" \|\| !draft\.client_safe/,
    );
  });

  it("panel only stores client-safe sections", () => {
    expect(panel).toMatch(/liveSections\.filter\(\(s\) => s\.client_safe\)/);
  });

  it("ReportDraftDetail mounts the panel for tool_specific drafts", () => {
    expect(detail).toContain("StoredToolReportsPanel");
    expect(detail).toMatch(/draft\.report_type === "tool_specific"/);
  });
});

describe("P70.1 — client Reports surface only loads approved tool PDFs via signed URL", () => {
  const portal = read("src/pages/portal/Reports.tsx");

  it("client surface uses the signed-URL helper, not raw storage paths", () => {
    expect(portal).toContain("getToolReportSignedUrl");
    expect(portal).not.toMatch(/from\(\s*["']tool-reports["']\s*\)\.download/);
  });

  it("client surface relies on RLS (no client-side admin filters/leak)", () => {
    // We rely on RLS to filter to approved + client_visible. The client
    // query must not request admin-only fields like internal notes or
    // approved_by, and must not sort/filter by admin metadata.
    expect(portal).not.toMatch(/internal_notes/);
    expect(portal).not.toMatch(/approved_by/);
    expect(portal).not.toMatch(/generated_by/);
  });

  it("client surface lists tool reports under a clear heading", () => {
    expect(portal).toMatch(/Tool-Specific Reports/);
    expect(portal).toMatch(/data-testid="client-tool-reports"/);
  });
});

describe("P70.1 — main report tiers and report_drafts are still preserved", () => {
  it("tool report panel never inserts into report_drafts directly", () => {
    const panel = read("src/components/admin/StoredToolReportsPanel.tsx");
    expect(panel).not.toMatch(/from\(\s*["']report_drafts["']\s*\)\.insert/);
  });

  it("client Reports surface still uses the existing client-safe column allowlist for business_control_reports", () => {
    const portal = read("src/pages/portal/Reports.tsx");
    expect(portal).toContain("CLIENT_SAFE_REPORT_SELECT");
    expect(portal).toMatch(/\.eq\(\s*["']status["']\s*,\s*["']published["']\s*\)/);
  });
});