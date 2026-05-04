// P70 — Tool-Specific Report storage contract tests.
//
// These tests are static / contract tests (they do not hit a live
// Supabase). They prove the framework wires storage paths, metadata
// defaults, and security boundaries safely, and that the new artifact
// table + private bucket exist in migrations with the expected RLS.

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  TOOL_REPORTS_BUCKET,
  buildToolReportStoragePath,
  buildToolReportFilename,
} from "@/lib/reports/toolReports";

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");

function findMigrationContaining(needle: string): string {
  const dir = join(root, "supabase/migrations");
  for (const f of readdirSync(dir)) {
    if (!f.endsWith(".sql")) continue;
    const c = readFileSync(join(dir, f), "utf8");
    if (c.includes(needle)) return c;
  }
  throw new Error(`No migration contains: ${needle}`);
}

describe("P70 — storage path is tenant-safe", () => {
  it("uses {customer_id}/{tool_key}/{report_draft_id}/{file}", () => {
    const path = buildToolReportStoragePath({
      customerId: "cust-uuid",
      toolKey: "owner_decision_dashboard",
      reportDraftId: "draft-uuid",
      fileName: "tool-report-x-2026-05-04",
    });
    expect(path).toBe(
      "cust-uuid/owner_decision_dashboard/draft-uuid/tool-report-x-2026-05-04.pdf",
    );
    // first folder must be the customer id (storage RLS pivots on this)
    expect(path.split("/")[0]).toBe("cust-uuid");
  });

  it("bucket name is the dedicated private bucket", () => {
    expect(TOOL_REPORTS_BUCKET).toBe("tool-reports");
  });

  it("filename has no IDs, emails, or admin terms", () => {
    const fn = buildToolReportFilename("Owner Decision Dashboard", "Q2 review");
    expect(fn).not.toMatch(/admin|internal|secret|@/i);
    expect(fn).toMatch(/\d{4}-\d{2}-\d{2}$/);
  });
});

describe("P70 — migration provisions private bucket + metadata + RLS", () => {
  const sql = findMigrationContaining("tool_report_artifacts");

  it("creates a private tool-reports bucket", () => {
    expect(sql).toMatch(
      /INSERT INTO storage\.buckets[\s\S]*'tool-reports',\s*'tool-reports',\s*false/,
    );
  });

  it("creates the metadata table with the required columns", () => {
    for (const col of [
      "customer_id",
      "report_draft_id",
      "tool_key",
      "tool_name",
      "service_lane",
      "source_record_id",
      "version",
      "storage_bucket",
      "storage_path",
      "file_name",
      "mime_type",
      "size_bytes",
      "client_visible",
      "generated_by",
      "approved_at",
    ]) {
      expect(sql, `missing column ${col}`).toContain(col);
    }
  });

  it("enables RLS and admin-manage policy on the metadata table", () => {
    expect(sql).toMatch(
      /ALTER TABLE public\.tool_report_artifacts ENABLE ROW LEVEL SECURITY/,
    );
    expect(sql).toMatch(/Admins manage tool report artifacts/);
  });

  it("client SELECT policy requires approved + client_safe + ownership + client_visible", () => {
    expect(sql).toMatch(/Customers read approved own tool report artifacts/);
    expect(sql).toMatch(/client_visible = true/);
    expect(sql).toMatch(/d\.status = 'approved'/);
    expect(sql).toMatch(/d\.client_safe = true/);
    expect(sql).toMatch(/c\.user_id = auth\.uid\(\)/);
  });

  it("storage object policies are scoped to the tool-reports bucket", () => {
    expect(sql).toMatch(/Admins read tool reports/);
    expect(sql).toMatch(/Admins write tool reports/);
    expect(sql).toMatch(/Customers read approved own tool report objects/);
    // client read joins through the artifact + draft so an unapproved
    // PDF is never readable from storage even if a path is guessed.
    expect(sql).toMatch(/storage\.objects\.name/);
    expect(sql).toMatch(/d\.status = 'approved'/);
  });
});

describe("P70 — main report tiers and report_drafts are preserved", () => {
  it("does not drop or rename main report_type values", () => {
    const sql = findMigrationContaining("tool_report_artifacts");
    for (const banned of [
      "DROP TABLE public.report_drafts",
      "ALTER TABLE public.report_drafts DROP COLUMN",
      "report_drafts_report_type_check",
    ]) {
      expect(sql).not.toContain(banned);
    }
  });

  it("toolReports source still uses report_type='tool_specific' only", () => {
    const src = read("src/lib/reports/toolReports.ts");
    expect(src).toMatch(/report_type:\s*"tool_specific"/);
    // upload helper must default to admin-only visibility
    expect(src).toMatch(/client_visible:\s*false/);
  });
});

describe("P70 — visibility helper never auto-publishes", () => {
  it("setToolReportArtifactClientVisible is an explicit admin call", () => {
    const src = read("src/lib/reports/toolReports.ts");
    expect(src).toMatch(/export async function setToolReportArtifactClientVisible/);
    // there is no auto-publish on insert
    expect(src).not.toMatch(/client_visible:\s*true,[^}]*insert/);
  });
});