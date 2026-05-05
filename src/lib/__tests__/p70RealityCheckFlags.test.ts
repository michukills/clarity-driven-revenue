/**
 * P70 — Reality Check Flags™ contract test.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  REALITY_CHECK_FLAG_GEARS,
  REALITY_CHECK_FLAG_TYPES,
  REALITY_CHECK_FLAG_STATUSES,
  REALITY_CHECK_RULE_REGISTRY,
  findRealityCheckForbiddenPhrase,
} from "@/config/realityCheckFlags";
import {
  renderRealityCheckFlagsForReport,
} from "@/lib/realityCheck/realityCheckFlags";
import {
  renderRealityCheckFlagsSection,
  buildStructuralHealthReportSections,
  REALITY_CHECK_FLAGS_PLACEHOLDER_BODY,
  SECTION_KEY_REALITY_CHECK_FLAGS,
} from "@/lib/reports/structuralHealthReport";

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");

describe("P70 — registry covers all five gears + regulated row", () => {
  it("rule registry hits every required gear", () => {
    const gears = new Set(REALITY_CHECK_RULE_REGISTRY.map((r) => r.gear));
    for (const g of REALITY_CHECK_FLAG_GEARS) {
      expect(gears.has(g)).toBe(true);
    }
  });

  it("rule clientSafeExplanations contain no forbidden phrases", () => {
    for (const r of REALITY_CHECK_RULE_REGISTRY) {
      expect(findRealityCheckForbiddenPhrase(r.clientSafeExplanation)).toBeNull();
    }
  });

  it("flag types and statuses include the required values", () => {
    for (const t of [
      "owner_claim_unsupported",
      "evidence_missing",
      "metric_contradiction",
      "regulated_claim_unsupported",
      "source_of_truth_missing",
    ]) {
      expect(REALITY_CHECK_FLAG_TYPES).toContain(t as never);
    }
    for (const s of ["detected", "client_visible", "dismissed", "resolved"]) {
      expect(REALITY_CHECK_FLAG_STATUSES).toContain(s as never);
    }
  });
});

describe("P70 — forbidden client phrase scanner", () => {
  it("flags banned legal/compliance language", () => {
    expect(findRealityCheckForbiddenPhrase("This is a legal determination."))
      .toBe("legal determination");
    expect(findRealityCheckForbiddenPhrase("Owner is GAAP audited"))
      .toBe("gaap audited");
    expect(findRealityCheckForbiddenPhrase("Operational inconsistency only."))
      .toBeNull();
  });
});

describe("P70 — Structural Health Report integration", () => {
  it("section renders honest placeholder when no flags exist", () => {
    expect(renderRealityCheckFlagsSection([])).toBe(
      REALITY_CHECK_FLAGS_PLACEHOLDER_BODY,
    );
  });

  it("section renders approved flags with severity + gear, no admin notes", () => {
    const out = renderRealityCheckFlagsSection([
      {
        id: "f1",
        title: "Cash claim unsupported",
        affected_gear: "financial_visibility",
        severity: "warning",
        client_visible_explanation: "Owner statement and AR aging do not align.",
        professional_review_recommended: true,
      },
    ]);
    expect(out).toMatch(/Cash claim unsupported/);
    expect(out).toMatch(/financial visibility/);
    expect(out).toMatch(/\[warning\]/);
    expect(out).toMatch(/Professional review recommended/);
    expect(out).not.toMatch(/admin/i);
  });

  it("buildStructuralHealthReportSections still emits canonical reality_check_flags key", () => {
    const sections = buildStructuralHealthReportSections({
      items: [],
      counts: {},
    } as never);
    const keys = sections.map((s) => s.key);
    expect(keys).toContain(SECTION_KEY_REALITY_CHECK_FLAGS);
  });
});

describe("P70 — report renderer in service module matches contract", () => {
  it("renders empty placeholder when no approved flags", () => {
    const body = renderRealityCheckFlagsForReport([]);
    expect(body).toMatch(/No Reality Check Flags/);
  });
});

describe("P70 — migration + RLS shape", () => {
  const sql = read(
    "supabase/migrations/20260505161612_382082-c1c5-4a2c-b3a3-p70-reality.sql",
  ).catch?.(() => "") as unknown as string;
  // Fallback: scan all P70 migrations.
  it("a migration enables RLS on reality_check_flags and gates by is_admin/customer ownership", () => {
    // Grep across migrations dir
    const fs = require("node:fs") as typeof import("node:fs");
    const files = fs
      .readdirSync(join(root, "supabase/migrations"))
      .filter((f: string) => f.endsWith(".sql"));
    let combined = "";
    for (const f of files) {
      combined += fs.readFileSync(join(root, "supabase/migrations", f), "utf8");
    }
    expect(combined).toMatch(/CREATE TABLE IF NOT EXISTS public\.reality_check_flags/);
    expect(combined).toMatch(
      /ALTER TABLE public\.reality_check_flags ENABLE ROW LEVEL SECURITY/,
    );
    expect(combined).toMatch(/Admins manage reality check flags/);
    expect(combined).toMatch(/Customers view own approved client-visible flags/);
    expect(combined).toMatch(/get_client_reality_check_flags/);
    expect(combined).toMatch(/admin_list_report_reality_check_flags/);
  });
});

describe("P70 — client portal component never imports admin APIs", () => {
  const src = read("src/components/portal/RealityCheckFlagsList.tsx");
  it("does not import admin service surface", () => {
    expect(src).not.toMatch(/adminListRealityCheckFlags/);
    expect(src).not.toMatch(/adminCreateRealityCheckFlag/);
    expect(src).not.toMatch(/adminUpdateRealityCheckFlag/);
  });
  it("imports the SECURITY DEFINER client RPC wrapper only", () => {
    expect(src).toMatch(/getClientRealityCheckFlags/);
  });
});

describe("P70 — language standards", () => {
  it("client component uses ORNRA-aligned tone, not 'Mirror, Not the Map'", () => {
    const src = read("src/components/portal/RealityCheckFlagsList.tsx");
    expect(src).not.toMatch(/Mirror, Not the Map/i);
    expect(src).toMatch(/operational/i);
  });
});
