/**
 * P101 — Migration/RLS contract + regression sentinel.
 * Source-text checks only; runtime RLS verified manually.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const migrationsDir = join(root, "supabase/migrations");

function readMigrations(): string {
  return readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .map((f) => readFileSync(join(migrationsDir, f), "utf8"))
    .join("\n");
}

describe("P101 tool_report_artifacts schema + RLS", () => {
  const sql = readMigrations();

  it("adds report_mode column with gig_report|full_rgs_report CHECK", () => {
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS report_mode/);
    expect(sql).toMatch(/report_mode IN \('gig_report','full_rgs_report'\)/);
  });

  it("adds gig_tier column with basic|standard|premium CHECK", () => {
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS gig_tier/);
    expect(sql).toMatch(/gig_tier IN \('basic','standard','premium'\)/);
  });

  it("adds allowed_sections + excluded_sections jsonb columns", () => {
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS allowed_sections jsonb/);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS excluded_sections jsonb/);
  });

  it("backfills gig customers → gig_report and non-gig → full_rgs_report", () => {
    expect(sql).toMatch(/c\.is_gig = false THEN 'full_rgs_report'/);
    expect(sql).toMatch(/ELSE 'gig_report'/);
  });

  it("installs write-time trigger preventing gig customer with full_rgs_report", () => {
    expect(sql).toMatch(/enforce_tool_report_mode_vs_customer/);
    expect(sql).toMatch(/cannot receive a full_rgs_report artifact/);
    expect(sql).toMatch(/CREATE TRIGGER tool_report_artifacts_mode_guard/);
  });

  it("RLS customer-read policy denies gig customer reading full_rgs_report", () => {
    expect(sql).toMatch(
      /c\.is_gig = false OR tool_report_artifacts\.report_mode = 'gig_report'/,
    );
  });

  it("storage.objects RLS denies gig customer reading full_rgs_report PDF", () => {
    expect(sql).toMatch(
      /c\.is_gig = false OR a\.report_mode = 'gig_report'/,
    );
  });
});

describe("P101 regression sentinels", () => {
  it("/scorecard still redirects to /scan in App.tsx", () => {
    const app = readFileSync(join(root, "src/App.tsx"), "utf8");
    expect(app).toMatch(/path="\/scorecard"[\s\S]{0,200}Navigate to="\/scan"/);
  });

  it("/diagnostic/scorecard route is registered (protected)", () => {
    const app = readFileSync(join(root, "src/App.tsx"), "utf8");
    expect(app).toMatch(/\/diagnostic\/scorecard/);
  });

  it("StoredToolReportsPanel still mounts ReportModeSelector", () => {
    const panel = readFileSync(
      join(root, "src/components/admin/StoredToolReportsPanel.tsx"),
      "utf8",
    );
    expect(panel).toContain("ReportModeSelector");
    expect(panel).toContain("customerScope");
    expect(panel).toContain("reportMode");
  });

  it("storeToolReportPdf accepts reportMode + customerScope", () => {
    const src = readFileSync(join(root, "src/lib/reports/toolReports.ts"), "utf8");
    expect(src).toContain("reportMode?: ToolReportMode");
    expect(src).toContain("customerScope?:");
    expect(src).toContain("resolveReportMode");
    expect(src).toContain("filterSectionsToAllowed");
  });

  it("setToolReportArtifactClientVisible has defensive gig+full_rgs guard", () => {
    const src = readFileSync(join(root, "src/lib/reports/toolReports.ts"), "utf8");
    expect(src).toContain('"Full RGS Report is not available for this gig customer');
  });
});