import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  CLIENT_SAFE_REPORT_COLUMNS,
  REPORT_FIELDS_FORBIDDEN_IN_CLIENT_SURFACES,
} from "@/lib/reports/clientSafeReportFields";

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}

const CLIENT_SURFACE_ROOTS = [
  "src/pages/portal",
  "src/components/portal",
  "src/components/bcc",
  "src/components/reports",
];

const collectClientSurfaceFiles = () => {
  const files: string[] = [];
  for (const r of CLIENT_SURFACE_ROOTS) {
    try {
      walk(join(root, r), files);
    } catch {
      /* dir missing — fine */
    }
  }
  return files.filter((f) => !f.includes("__tests__"));
};

describe("P34 — client-safe report field allowlist", () => {
  it("allowlist excludes every forbidden client-leaking column", () => {
    for (const forbidden of REPORT_FIELDS_FORBIDDEN_IN_CLIENT_SURFACES) {
      expect(CLIENT_SAFE_REPORT_COLUMNS as readonly string[]).not.toContain(
        forbidden,
      );
    }
  });

  it("allowlist never includes internal_notes", () => {
    expect(CLIENT_SAFE_REPORT_COLUMNS as readonly string[]).not.toContain(
      "internal_notes",
    );
  });
});

describe("P34 — client report surfaces never request admin-only fields", () => {
  it("client portal report queries do not select internal_notes", () => {
    const files = collectClientSurfaceFiles();
    for (const f of files) {
      const c = readFileSync(f, "utf8");
      // It is fine to mention internal_notes inside a comment that documents
      // the exclusion. Disallow it inside string literals (select lists).
      const stringHits = c.match(/["'`][^"'`]*internal_notes[^"'`]*["'`]/g) || [];
      expect(stringHits, `internal_notes in client surface: ${f}`).toEqual([]);
    }
  });

  it("client portal report fetches do not use select(\"*\")", () => {
    const files = collectClientSurfaceFiles();
    for (const f of files) {
      const c = readFileSync(f, "utf8");
      if (!c.includes("business_control_reports")) continue;
      // Reject .select("*") on business_control_reports anywhere in the file.
      expect(
        /from\(\s*["'`]business_control_reports["'`]\s*\)[\s\S]{0,200}?\.select\(\s*["'`]\*["'`]\s*\)/.test(
          c,
        ),
        `select("*") on business_control_reports in ${f}`,
      ).toBe(false);
    }
  });
});

describe("P34 — client report fetches enforce published + ownership", () => {
  const FILES = [
    "src/pages/portal/Reports.tsx",
    "src/pages/portal/ReportView.tsx",
    "src/pages/portal/CustomerDashboard.tsx",
  ];
  it.each(FILES)("%s constrains business_control_reports to status=published", (f) => {
    const c = read(f);
    if (!c.includes("business_control_reports")) return;
    expect(c).toMatch(/\.eq\(\s*["']status["']\s*,\s*["']published["']\s*\)/);
  });
});

describe("P34 — client portal does not expose admin-only secrets/internals", () => {
  it("portal/report client surfaces never reference admin notification, AI run, or token fields", () => {
    const files = collectClientSurfaceFiles();
    const FORBIDDEN = [
      "admin_notifications",
      "STRIPE_SECRET",
      "STRIPE_SANDBOX_API_KEY",
      "RESEND_API_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
      "service_role",
      "qb_get_connection_tokens",
      "qb_token_encryption_key",
    ];
    for (const f of files) {
      const c = readFileSync(f, "utf8");
      for (const term of FORBIDDEN) {
        expect(c, `${term} appears in client surface ${f}`).not.toMatch(
          new RegExp(term),
        );
      }
    }
  });
});

describe("P34 — ReportRenderer keeps internal notes admin-gated", () => {
  const src = read("src/components/bcc/ReportRenderer.tsx");
  it("internal notes only render when showInternal flag is true", () => {
    expect(src).toMatch(/showInternal\s*&&\s*internalNotes/);
  });
  it("client ReportView never sets showInternal", () => {
    const c = read("src/pages/portal/ReportView.tsx");
    expect(c).not.toMatch(/showInternal\s*=\s*\{?\s*true/);
    expect(c).not.toMatch(/showInternal\s*\}/);
  });
});

describe("P34 — admin PDF export gates by client_safe + snapshot approval", () => {
  const src = read("src/pages/admin/ReportDraftDetail.tsx");
  it("PDF export only includes sections marked client_safe", () => {
    expect(src).toMatch(/sections\.filter\(\(s\)\s*=>\s*s\.client_safe\)/);
  });
  it("PDF export gates stability snapshot via appendStabilitySnapshotIfClientReady", () => {
    expect(src).toMatch(/appendStabilitySnapshotIfClientReady/);
  });
});