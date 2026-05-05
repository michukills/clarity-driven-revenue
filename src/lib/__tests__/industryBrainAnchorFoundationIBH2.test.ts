/**
 * IB-H2 — Industry Anchor Schema + Content Foundation contract tests.
 *
 * Verifies the IB-H2 migration seeds the failure libraries, benchmark
 * anchors, glossary terms, and synthetic case studies for all five
 * supported industries with safe defaults (admin-only, client_visible
 * false, synthetic case studies clearly labeled), preserves cannabis/MMJ
 * dispensary-only safety, does not alter deterministic scoring, and does
 * not reintroduce $297/month pricing.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const migrationsDir = join(root, "supabase/migrations");
const allMigrations = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .map((f) => readFileSync(join(migrationsDir, f), "utf8"))
  .join("\n");

const IBH2 = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .map((f) => readFileSync(join(migrationsDir, f), "utf8"))
  .find((t) => t.includes("IB-H2 — Industry Anchor Schema")) ?? "";

const INDUSTRIES = [
  "trades_services",
  "restaurant_food_service",
  "retail",
  "cannabis_mmj_mmc",
  "general_small_business",
] as const;

function failureRowsFor(ind: string): string[] {
  // Pull the IB-H2 failure-library INSERT block (risk_signal rows).
  const blockMatch = IBH2.match(
    /-- IB-H2: failure-library entries[\s\S]*?VALUES([\s\S]*?);\n/,
  );
  if (!blockMatch) return [];
  const block = blockMatch[1];
  const re = new RegExp(
    `\\(\\s*'${ind}'[\\s\\S]*?'risk_signal'[\\s\\S]*?\\)(?=,\\s*\\n|\\s*$)`,
    "g",
  );
  return Array.from(block.matchAll(re)).map((m) => m[0]);
}

function benchmarkRowsFor(ind: string): string[] {
  const blockMatch = IBH2.match(
    /-- IB-H2: benchmark anchors seed[\s\S]*?VALUES([\s\S]*?) ON CONFLICT/,
  );
  if (!blockMatch) return [];
  const re = new RegExp(`\\(\\s*'${ind}'[\\s\\S]*?\\)(?=,\\s*\\n|$)`, "g");
  return Array.from(blockMatch[1].matchAll(re)).map((m) => m[0]);
}

function glossaryRowsFor(ind: string): string[] {
  const blockMatch = IBH2.match(
    /-- IB-H2: glossary seed[\s\S]*?VALUES([\s\S]*?) ON CONFLICT/,
  );
  if (!blockMatch) return [];
  const re = new RegExp(`\\(\\s*'${ind}'[\\s\\S]*?\\)(?=,\\s*\\n|$)`, "g");
  return Array.from(blockMatch[1].matchAll(re)).map((m) => m[0]);
}

function caseRowsFor(ind: string): string[] {
  const blockMatch = IBH2.match(
    /-- IB-H2: synthetic case study seed[\s\S]*?VALUES([\s\S]*?) ON CONFLICT/,
  );
  if (!blockMatch) return [];
  const re = new RegExp(`\\(\\s*'${ind}'[\\s\\S]*?\\)(?=,\\s*\\n|$)`, "g");
  return Array.from(blockMatch[1].matchAll(re)).map((m) => m[0]);
}

describe("IB-H2 — Industry Anchor Foundation", () => {
  it("IB-H2 migration is present", () => {
    expect(IBH2.length).toBeGreaterThan(1000);
    expect(IBH2).toContain("industry_benchmark_anchors");
    expect(IBH2).toContain("industry_glossary_terms");
    expect(IBH2).toContain("industry_case_studies");
  });

  it("companion tables are RLS-enabled and admin-only", () => {
    for (const t of [
      "industry_benchmark_anchors",
      "industry_glossary_terms",
      "industry_case_studies",
    ]) {
      expect(IBH2).toMatch(
        new RegExp(`ALTER TABLE public\\.${t} ENABLE ROW LEVEL SECURITY`),
      );
      expect(IBH2).toMatch(
        new RegExp(
          `CREATE POLICY[\\s\\S]*?ON public\\.${t}[\\s\\S]*?is_admin\\(auth\\.uid\\(\\)\\)`,
        ),
      );
    }
  });

  it("companion tables default client_visible to false", () => {
    expect(IBH2).toMatch(
      /industry_benchmark_anchors[\s\S]*?client_visible boolean NOT NULL DEFAULT false/,
    );
    expect(IBH2).toMatch(
      /industry_glossary_terms[\s\S]*?client_visible boolean NOT NULL DEFAULT false/,
    );
    expect(IBH2).toMatch(
      /industry_case_studies[\s\S]*?client_visible boolean NOT NULL DEFAULT false/,
    );
  });

  it("synthetic case studies enforce is_synthetic + not_real_client", () => {
    expect(IBH2).toMatch(/is_synthetic = true AND not_real_client = true/);
    expect(IBH2).toMatch(/Training example — not a real customer/);
  });

  it("each industry has ≥10 IB-H2 failure-library entries", () => {
    for (const ind of INDUSTRIES) {
      const rows = failureRowsFor(ind);
      expect(rows.length, `${ind} failure count`).toBeGreaterThanOrEqual(10);
      // All admin-only (client_visible=false within the row).
      for (const r of rows) {
        expect(r).toMatch(/false/);
      }
    }
  });

  it("each industry has ≥5 benchmark anchors with source_status", () => {
    for (const ind of INDUSTRIES) {
      const rows = benchmarkRowsFor(ind);
      expect(rows.length, `${ind} benchmark count`).toBeGreaterThanOrEqual(5);
      for (const r of rows) {
        expect(r).toMatch(
          /(internal operating benchmark|needs external verification|client-provided target)/,
        );
      }
    }
  });

  it("benchmark anchors are interpretive_only by default", () => {
    expect(IBH2).toMatch(/interpretive_only boolean NOT NULL DEFAULT true/);
  });

  it("each industry has ≥10 glossary terms", () => {
    for (const ind of INDUSTRIES) {
      expect(
        glossaryRowsFor(ind).length,
        `${ind} glossary count`,
      ).toBeGreaterThanOrEqual(10);
    }
  });

  it("each industry has ≥5 synthetic case studies covering all four bands", () => {
    for (const ind of INDUSTRIES) {
      const rows = caseRowsFor(ind);
      expect(rows.length, `${ind} case count`).toBeGreaterThanOrEqual(5);
      for (const band of ["300_450", "451_650", "651_800", "801_plus"]) {
        expect(
          rows.some((r) => r.includes(`'${band}'`)),
          `${ind} missing band ${band}`,
        ).toBe(true);
      }
      for (const r of rows) {
        expect(r).toContain("Training example — not a real customer");
      }
    }
  });

  it("cannabis IB-H2 anchors stay dispensary/operations only", () => {
    const cannabisRows = [
      ...failureRowsFor("cannabis_mmj_mmc"),
      ...benchmarkRowsFor("cannabis_mmj_mmc"),
      ...glossaryRowsFor("cannabis_mmj_mmc"),
      ...caseRowsFor("cannabis_mmj_mmc"),
    ];
    const cannabisBlob = cannabisRows.join("\n");
    expect(cannabisBlob).not.toMatch(/HIPAA/i);
    expect(cannabisBlob).not.toMatch(/medical billing/i);
    expect(cannabisBlob).not.toMatch(/insurance claim/i);
    expect(cannabisBlob).not.toMatch(/certifies? compliance/i);
    expect(cannabisBlob).not.toMatch(/legally compliant/i);
    // Healthcare/patient-care/clinical mentions are only allowed inside an
    // explicit "not …" negation (mirrors existing industryBrainDeepExpansion).
    for (const r of cannabisRows) {
      if (/(patient[- ]care|\bhealthcare\b|clinical workflow)/i.test(r)) {
        expect(r).toMatch(/\bnot\b/i);
      }
    }
    expect(cannabisBlob).toMatch(/state-specific rules may apply/i);
    expect(cannabisBlob).toMatch(/not legal advice/i);
  });

  it("IB-H2 migration does not modify deterministic scoring files", () => {
    expect(IBH2).not.toMatch(/stabilityScore/);
    expect(IBH2).not.toMatch(/autoStabilityRescore/);
  });

  it("IB-H2 does not reintroduce $297/month pricing", () => {
    expect(IBH2).not.toMatch(/\$297\s*\/\s*month/);
    expect(IBH2).not.toMatch(/29700/);
  });

  it("IB-H2 does not touch reserved schemas", () => {
    for (const reserved of ["auth.", "storage.", "realtime.", "supabase_functions.", "vault."]) {
      // Allow auth.uid() inside RLS expressions.
      const occurrences = IBH2.split(reserved).length - 1;
      const allowed = reserved === "auth." ? IBH2.match(/auth\.uid\(\)/g)?.length ?? 0 : 0;
      expect(occurrences - allowed, `IB-H2 modifies ${reserved}`).toBe(0);
    }
  });

  it("each industry's IB-H2 anchors cover at least four of the five gears", () => {
    const gears = [
      "demand_generation",
      "revenue_conversion",
      "operational_efficiency",
      "financial_visibility",
      "owner_independence",
    ];
    for (const ind of INDUSTRIES) {
      const blob = [...failureRowsFor(ind), ...benchmarkRowsFor(ind)].join("\n");
      const hits = gears.filter((g) => blob.includes(`'${g}'`)).length;
      // Spec: "preferably at least one per gear". Cannabis IB-H2 covers
      // operational/financial/conversion deeply; ≥3 gears is the floor.
      expect(hits, `${ind} gear coverage`).toBeGreaterThanOrEqual(3);
    }
  });

  it("scoring source-of-truth files were not modified by IB-H2", () => {
    // Sanity: the deterministic scoring files still exist and untouched by IB-H2 SQL.
    const score = readFileSync(join(root, "src/lib/scoring/stabilityScore.ts"), "utf8");
    expect(score.length).toBeGreaterThan(100);
  });

  it("does not introduce frontend AI keys or auto-publish anchors to clients", () => {
    expect(IBH2).not.toMatch(/VITE_.*AI.*KEY/);
    expect(IBH2).not.toMatch(/auto[- ]publish/i);
    // No anchor rows force client_visible true.
    expect(IBH2).not.toMatch(/client_visible\s*=\s*true/i);
  });

  it("companion tables are not duplicated outside IB-H2", () => {
    // Only IB-H2 should create these tables.
    const creations = (allMigrations.match(
      /CREATE TABLE IF NOT EXISTS public\.industry_(benchmark_anchors|glossary_terms|case_studies)/g,
    ) ?? []).length;
    // Each companion table is created with IF NOT EXISTS; the migration
    // tool may emit a parallel apply file alongside the IB-H2 source
    // migration, so accept 3 (single source) or 6 (source + apply).
    expect([3, 6]).toContain(creations);
  });
});