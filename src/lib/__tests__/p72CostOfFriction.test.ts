/**
 * P72 — Cost of Friction Calculator™ contract tests.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  COST_OF_FRICTION_GEARS,
  COST_OF_FRICTION_LINES,
  computeCostOfFriction,
  DEFAULT_COST_OF_FRICTION_ASSUMPTIONS,
  findCostOfFrictionForbiddenPhrase,
  COST_OF_FRICTION_CLIENT_DISCLAIMER,
} from "@/config/costOfFriction";
import { renderCostOfFrictionForReport } from "@/lib/costOfFriction/costOfFriction";
import {
  buildStructuralHealthReportSections,
  SECTION_KEY_COST_OF_FRICTION,
} from "@/lib/reports/structuralHealthReport";

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");

describe("P72 — formulas", () => {
  it("returns null monthly for missing inputs (no fake values)", () => {
    const r = computeCostOfFriction({});
    expect(r.monthlyTotal).toBe(0);
    expect(r.annualTotal).toBe(0);
    expect(r.missingLines.length).toBe(COST_OF_FRICTION_LINES.length);
    for (const l of r.lines) expect(l.monthly).toBeNull();
  });

  it("computes lost-lead value deterministically", () => {
    const r = computeCostOfFriction({
      "dg.lost_leads": {
        monthly_lost_leads: 10,
        estimated_close_rate: 25, // 25%
        average_order_value: 1000,
      },
    });
    const line = r.lines.find((l) => l.key === "dg.lost_leads")!;
    expect(line.monthly).toBe(2500);
    expect(r.byGear.demand_generation).toBe(2500);
    expect(r.monthlyTotal).toBe(2500);
    expect(r.annualTotal).toBe(30000);
  });

  it("rework cost = hours × loaded hourly cost", () => {
    const r = computeCostOfFriction(
      { "oe.rework": { monthly_rework_hours: 20 } },
      { ...DEFAULT_COST_OF_FRICTION_ASSUMPTIONS, loadedHourlyCost: 50 },
    );
    expect(r.lines.find((l) => l.key === "oe.rework")!.monthly).toBe(1000);
  });

  it("collections drag = past_due × drag factor", () => {
    const r = computeCostOfFriction(
      { "fv.delayed_collections": { past_due_amount: 100000 } },
      { ...DEFAULT_COST_OF_FRICTION_ASSUMPTIONS, collectionsDragFactor: 0.02 },
    );
    expect(r.lines.find((l) => l.key === "fv.delayed_collections")!.monthly).toBe(2000);
  });

  it("rejects negative inputs (treats as missing)", () => {
    const r = computeCostOfFriction({
      "oe.rework": { monthly_rework_hours: -5 },
    });
    expect(r.lines.find((l) => l.key === "oe.rework")!.monthly).toBeNull();
  });

  it("registry covers every RGS gear", () => {
    const gears = new Set(COST_OF_FRICTION_LINES.map((l) => l.gear));
    for (const g of COST_OF_FRICTION_GEARS) expect(gears.has(g)).toBe(true);
  });

  it("annual = monthly × 12 across multiple lines", () => {
    const r = computeCostOfFriction({
      "dg.lost_leads": {
        monthly_lost_leads: 5,
        estimated_close_rate: 0.2,
        average_order_value: 500,
      },
      "oe.rework": { monthly_rework_hours: 10 },
    });
    expect(r.annualTotal).toBeCloseTo(r.monthlyTotal * 12);
  });
});

describe("P72 — forbidden client-facing phrases", () => {
  it("blocks ROI / valuation / lender / fiduciary / advice phrases", () => {
    expect(findCostOfFrictionForbiddenPhrase("guaranteed ROI on this")).toBe("guaranteed roi");
    expect(findCostOfFrictionForbiddenPhrase("valuation increase expected")).toBe("valuation increase");
    expect(findCostOfFrictionForbiddenPhrase("lender-ready financials")).toBe("lender-ready");
    expect(findCostOfFrictionForbiddenPhrase("this is fiduciary advice")).toBe("fiduciary");
    expect(findCostOfFrictionForbiddenPhrase("Operational decision-support estimate.")).toBeNull();
  });

  it("client disclaimer carries an estimate-only frame and no forbidden phrases", () => {
    expect(findCostOfFrictionForbiddenPhrase(COST_OF_FRICTION_CLIENT_DISCLAIMER)).toBeNull();
    expect(COST_OF_FRICTION_CLIENT_DISCLAIMER.toLowerCase()).toMatch(/not a guarantee/);
  });
});

describe("P72 — report integration", () => {
  it("emits placeholder when no approved runs", () => {
    expect(renderCostOfFrictionForReport([])).toMatch(/No Cost of Friction/);
  });

  it("Structural Health Report includes canonical cost_of_friction section", () => {
    const sections = buildStructuralHealthReportSections({ items: [], counts: {} } as never);
    expect(sections.map((s) => s.key)).toContain(SECTION_KEY_COST_OF_FRICTION);
    const cof = sections.find((s) => s.key === SECTION_KEY_COST_OF_FRICTION)!;
    expect(cof.client_safe).toBe(true);
    expect(cof.body).toMatch(/Cost of Friction/);
  });

  it("renders run summary with monthly + annual + per-gear totals and disclaimer", () => {
    const out = renderCostOfFrictionForReport([
      {
        id: "r1",
        run_name: "Q1 estimate",
        client_safe_summary: "Possible friction across operations and revenue.",
        monthly_total: 5000,
        annual_total: 60000,
        demand_generation_total: 1000,
        revenue_conversion_total: 1500,
        operational_efficiency_total: 1500,
        financial_visibility_total: 500,
        owner_independence_total: 500,
      },
    ]);
    expect(out).toMatch(/Q1 estimate/);
    expect(out).toMatch(/\$5,000/);
    expect(out).toMatch(/\$60,000/);
    expect(out).toMatch(/Estimate only/);
    expect(findCostOfFrictionForbiddenPhrase(out)).toBeNull();
  });
});

describe("P72 — migration shape", () => {
  it("creates table, RLS, and locked-down RPCs", () => {
    const dir = join(root, "supabase/migrations");
    let combined = "";
    for (const f of readdirSync(dir)) {
      if (f.endsWith(".sql")) combined += readFileSync(join(dir, f), "utf8");
    }
    expect(combined).toMatch(/CREATE TABLE IF NOT EXISTS public\.cost_of_friction_runs/);
    expect(combined).toMatch(/ALTER TABLE public\.cost_of_friction_runs ENABLE ROW LEVEL SECURITY/);
    expect(combined).toMatch(/Admins manage cost of friction runs/);
    expect(combined).toMatch(/Customers read own approved cost of friction runs/);
    expect(combined).toMatch(/get_client_cost_of_friction_runs/);
    expect(combined).toMatch(/admin_list_report_cost_of_friction_runs/);
    expect(combined).toMatch(/REVOKE ALL ON FUNCTION public\.get_client_cost_of_friction_runs\(uuid\) FROM PUBLIC/);
    expect(combined).toMatch(/GRANT EXECUTE ON FUNCTION public\.get_client_cost_of_friction_runs\(uuid\) TO authenticated/);
    expect(combined).toMatch(/REVOKE ALL ON FUNCTION public\.admin_list_report_cost_of_friction_runs\(uuid\) FROM PUBLIC/);
    expect(combined).toMatch(/cost_of_friction_calculator/);
  });
});

describe("P72 — client portal page never imports admin-only services", () => {
  const src = read("src/pages/portal/tools/CostOfFrictionCalculator.tsx");
  it("does not import admin list/delete APIs", () => {
    expect(src).not.toMatch(/adminListCostOfFrictionRuns/);
    expect(src).not.toMatch(/deleteCostOfFrictionRun/);
    expect(src).not.toMatch(/adminListReportCostOfFrictionRuns/);
  });
  it("uses the client-safe getter", () => {
    expect(src).toMatch(/getClientCostOfFrictionRuns/);
  });
});

describe("P72 — old positioning phrase regression", () => {
  const FORBIDDEN = [
    "lay the bricks",
    "teaches the owner to lay the bricks",
    "blueprint and teaches the owner to lay the bricks",
    "RGS provides the blueprint and teaches the owner to lay the bricks",
  ];
  function walk(dir: string, out: string[] = []): string[] {
    for (const name of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, name.name);
      if (name.isDirectory()) {
        if (/node_modules|\.git|dist|build/.test(name.name)) continue;
        walk(full, out);
      } else if (/\.(ts|tsx|md|sql|json|html)$/.test(name.name)) {
        // Don't scan this very test file (it intentionally lists the phrases).
        if (full.endsWith("p72CostOfFriction.test.ts")) continue;
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