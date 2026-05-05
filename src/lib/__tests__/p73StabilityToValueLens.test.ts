/**
 * P73 — Stability-to-Value Lens™ contract tests.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  STABILITY_TO_VALUE_LENS_GEARS,
  STABILITY_TO_VALUE_LENS_NAME,
  STV_FACTORS,
  STV_CLIENT_DISCLAIMER,
  STV_PLAIN_ENGLISH_DISCLAIMER,
  computeStabilityToValueLens,
  findStabilityToValueForbiddenPhrase,
  type StvAnswers,
} from "@/config/stabilityToValueLens";
import { renderStabilityToValueLensForReport } from "@/lib/stabilityToValueLens/stabilityToValueLens";
import {
  buildStructuralHealthReportSections,
  SECTION_KEY_STABILITY_TO_VALUE_LENS,
} from "@/lib/reports/structuralHealthReport";

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");

function answerAll(value: "yes" | "partial" | "no" | "unknown"): StvAnswers {
  const a: StvAnswers = {};
  for (const f of STV_FACTORS) a[f.key] = value;
  return a;
}

describe("P73 — deterministic scoring", () => {
  it("registry covers every RGS gear with at least 3 factors per gear", () => {
    const counts: Record<string, number> = {};
    for (const f of STV_FACTORS) counts[f.gear] = (counts[f.gear] ?? 0) + 1;
    for (const g of STABILITY_TO_VALUE_LENS_GEARS) {
      expect(counts[g] ?? 0).toBeGreaterThanOrEqual(3);
    }
  });

  it("all 'yes' answers produce a 100/100 stronger structure", () => {
    const r = computeStabilityToValueLens(answerAll("yes"));
    expect(r.totalScore).toBe(100);
    expect(r.structureRating).toBe("stronger_structure");
    expect(r.perceivedOperationalRiskLevel).toBe("low");
    expect(r.isInsufficientEvidence).toBe(false);
  });

  it("all 'no' answers produce 0/100 high dependency", () => {
    const r = computeStabilityToValueLens(answerAll("no"));
    expect(r.totalScore).toBe(0);
    expect(r.structureRating).toBe("high_dependency");
    expect(r.perceivedOperationalRiskLevel).toBe("high");
  });

  it("all 'partial' answers produce 50/100 fragile structure", () => {
    const r = computeStabilityToValueLens(answerAll("partial"));
    expect(r.totalScore).toBe(50);
    expect(r.structureRating).toBe("fragile_structure");
  });

  it("empty answers produce Insufficient Evidence (no fake score)", () => {
    const r = computeStabilityToValueLens({});
    expect(r.isInsufficientEvidence).toBe(true);
    expect(r.structureRating).toBe("insufficient_evidence");
    expect(r.perceivedOperationalRiskLevel).toBe("unknown");
    expect(r.transferabilityReadinessLabel).toBe("Insufficient Evidence");
  });

  it("unknown answers count as insufficient evidence", () => {
    const r = computeStabilityToValueLens(answerAll("unknown"));
    expect(r.isInsufficientEvidence).toBe(true);
  });

  it("does NOT calculate or surface a business value", () => {
    const r = computeStabilityToValueLens(answerAll("yes"));
    const dump = JSON.stringify(r);
    for (const w of [
      "valuation",
      "appraisal",
      "fair market",
      "enterprise value",
      "sale price",
      "ebitda",
    ]) {
      expect(dump.toLowerCase()).not.toContain(w);
    }
  });

  it("each gear scores out of 20", () => {
    const r = computeStabilityToValueLens(answerAll("yes"));
    for (const g of STABILITY_TO_VALUE_LENS_GEARS) {
      expect(r.byGear[g].score).toBeLessThanOrEqual(20);
    }
  });
});

describe("P73 — forbidden client-facing phrases", () => {
  it("blocks valuation/appraisal/lending/investment/fiduciary phrases", () => {
    expect(findStabilityToValueForbiddenPhrase("certified valuation report")).toBe("valuation");
    expect(findStabilityToValueForbiddenPhrase("appraisal complete")).toBe("appraisal");
    expect(findStabilityToValueForbiddenPhrase("lender-ready financials")).toBe("lender-ready");
    expect(findStabilityToValueForbiddenPhrase("investor-ready summary")).toBe("investor-ready");
    expect(findStabilityToValueForbiddenPhrase("provides fiduciary recommendation")).toBe("fiduciary");
    expect(findStabilityToValueForbiddenPhrase("offers tax advice")).toBe("tax advice");
    expect(findStabilityToValueForbiddenPhrase("ebitda multiple range")).toBe("ebitda multiple");
    expect(findStabilityToValueForbiddenPhrase("third-party reliance")).toBe("third-party reliance");
  });

  it("ALLOWS the approved product name 'Stability-to-Value Lens™'", () => {
    expect(
      findStabilityToValueForbiddenPhrase(
        "The Stability-to-Value Lens™ helps you understand operational structure.",
      ),
    ).toBeNull();
    expect(
      findStabilityToValueForbiddenPhrase(
        "This Stability-to-Value Lens result is not a valuation",
      ),
    ).toBe("valuation");
  });

  it("client disclaimer is itself safe", () => {
    expect(findStabilityToValueForbiddenPhrase(STV_CLIENT_DISCLAIMER)).toBeNull();
    expect(findStabilityToValueForbiddenPhrase(STV_PLAIN_ENGLISH_DISCLAIMER)).toBeNull();
  });

  it("disclaimers explicitly say not a valuation/appraisal/lending/investment opinion", () => {
    const lower = STV_CLIENT_DISCLAIMER.toLowerCase();
    expect(lower).toMatch(/not a valuation/);
    expect(lower).toMatch(/lending/);
    expect(lower).toMatch(/investment/);
    expect(lower).toMatch(/fiduciary/);
  });
});

describe("P73 — report integration", () => {
  it("emits honest placeholder when no approved runs", () => {
    const out = renderStabilityToValueLensForReport([]);
    expect(out).toMatch(/No Stability-to-Value Lens/);
    expect(out.toLowerCase()).toMatch(/not a valuation/);
  });

  it("Structural Health Report includes canonical stability_to_value_lens section", () => {
    const sections = buildStructuralHealthReportSections({ items: [], counts: {} } as never);
    expect(sections.map((s) => s.key)).toContain(SECTION_KEY_STABILITY_TO_VALUE_LENS);
    const sec = sections.find((s) => s.key === SECTION_KEY_STABILITY_TO_VALUE_LENS)!;
    expect(sec.client_safe).toBe(true);
    expect(sec.body).toMatch(/Stability-to-Value Lens/);
  });

  it("renders an approved run with score, rating, gears, disclaimer, and no forbidden phrases", () => {
    const out = renderStabilityToValueLensForReport([
      {
        id: "r1",
        run_name: "Q1 lens",
        client_safe_summary: "Operational structure is developing across most gears.",
        total_score: 72,
        demand_generation_score: 14,
        revenue_conversion_score: 16,
        operational_efficiency_score: 14,
        financial_visibility_score: 14,
        owner_independence_score: 14,
        structure_rating: "developing_structure",
        perceived_operational_risk_level: "moderate",
        transferability_readiness_label: "Developing Transferability",
      },
    ]);
    expect(out).toMatch(/Q1 lens/);
    expect(out).toMatch(/72\/100/);
    expect(out).toMatch(/Developing Transferability/);
    expect(out).toMatch(/moderate/);
    expect(findStabilityToValueForbiddenPhrase(out)).toBeNull();
    expect(out.toLowerCase()).toMatch(/not a valuation/);
  });
});

describe("P73 — migration shape", () => {
  it("creates table, RLS, and locked-down RPCs", () => {
    const dir = join(root, "supabase/migrations");
    let combined = "";
    for (const f of readdirSync(dir)) {
      if (f.endsWith(".sql")) combined += readFileSync(join(dir, f), "utf8");
    }
    expect(combined).toMatch(/CREATE TABLE IF NOT EXISTS public\.stability_to_value_lens_runs/);
    expect(combined).toMatch(/ALTER TABLE public\.stability_to_value_lens_runs ENABLE ROW LEVEL SECURITY/);
    expect(combined).toMatch(/Admins manage stability to value lens runs/);
    expect(combined).toMatch(/Customers read own approved stability to value lens runs/);
    expect(combined).toMatch(/get_client_stability_to_value_lens_runs/);
    expect(combined).toMatch(/admin_list_report_stability_to_value_lens_runs/);
    expect(combined).toMatch(
      /REVOKE ALL ON FUNCTION public\.get_client_stability_to_value_lens_runs\(uuid\) FROM PUBLIC/,
    );
    expect(combined).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.get_client_stability_to_value_lens_runs\(uuid\) TO authenticated/,
    );
    expect(combined).toMatch(
      /REVOKE ALL ON FUNCTION public\.admin_list_report_stability_to_value_lens_runs\(uuid\) FROM PUBLIC/,
    );
    expect(combined).toMatch(/'stability_to_value_lens'/);
  });
});

describe("P73 — client portal page never imports admin-only services", () => {
  const src = read("src/pages/portal/tools/StabilityToValueLens.tsx");
  it("does not import admin list/delete/report APIs", () => {
    expect(src).not.toMatch(/adminListStabilityToValueLensRuns/);
    expect(src).not.toMatch(/deleteStabilityToValueLensRun/);
    expect(src).not.toMatch(/adminListReportStabilityToValueLensRuns/);
  });
  it("uses the client-safe getter", () => {
    expect(src).toMatch(/getClientStabilityToValueLensRuns/);
  });
});

describe("P73 — old positioning phrase regression", () => {
  const FORBIDDEN = [
    "lay the bricks",
    "teaches the owner to lay the bricks",
    "blueprint and teaches the owner to lay the bricks",
    "rgs provides the blueprint and teaches the owner to lay the bricks",
  ];
  function walk(dir: string, out: string[] = []): string[] {
    for (const name of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, name.name);
      if (name.isDirectory()) {
        if (/node_modules|\.git|dist|build/.test(name.name)) continue;
        walk(full, out);
      } else if (/\.(ts|tsx|md|sql|json|html)$/.test(name.name)) {
        if (full.endsWith("p72CostOfFriction.test.ts")) continue;
        if (full.endsWith("p73StabilityToValueLens.test.ts")) continue;
        if (full.endsWith("p74MobileDiagnosticHardening.test.ts")) continue;
        if (full.endsWith("p75SopClientCreator.test.ts")) continue;
        if (full.endsWith("p75ARgsAiBrainRegistry.test.ts")) continue;
        if (full.endsWith("p76ToolSpecificReportFramework.test.ts")) continue;
        if (full.endsWith("p77StandaloneToolRunner.test.ts")) continue;
        if (full.endsWith("p76ToolSpecificReportFramework.test.ts")) continue;
        out.push(full);
      }
    }
    return out;
  }
  it("old construction-metaphor positioning phrase is not present anywhere", () => {
    const offenders: string[] = [];
    for (const dir of ["src", "supabase/migrations", "docs", "mem", "public", "scripts"]) {
      try {
        const files = walk(join(root, dir));
        for (const f of files) {
          const txt = readFileSync(f, "utf8").toLowerCase();
          for (const p of FORBIDDEN) {
            if (txt.includes(p.toLowerCase())) offenders.push(`${f}: ${p}`);
          }
        }
      } catch {
        // dir may not exist; skip
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe("P73 — product name + brand consistency", () => {
  it("product name matches RGS naming registry", () => {
    expect(STABILITY_TO_VALUE_LENS_NAME).toMatch(/Stability-to-Value Lens/);
  });
});