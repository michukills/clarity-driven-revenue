import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const CLIENT_FACING_FILES = [
  "src/pages/Index.tsx",
  "src/pages/RevenueControlSystem.tsx",
  "src/pages/Implementation.tsx",
  "src/pages/Diagnostic.tsx",
  "src/pages/About.tsx",
  "src/pages/BusinessMRI.tsx",
  "src/pages/HowRGSWorks.tsx",
  "src/pages/InsightArticle.tsx",
  "src/pages/Insights.tsx",
  "src/pages/RevenueScorecard.tsx",
  "src/pages/ServicePages.tsx",
  "src/pages/Services.tsx",
  "src/pages/StabilityFramework.tsx",
  "src/pages/Visibility.tsx",
  "src/pages/WhyRGSExists.tsx",
];

describe("RGS Control System pricing — $1,000/month update", () => {
  it("no client-facing page contains $297", () => {
    for (const f of CLIENT_FACING_FILES) {
      const src = read(f);
      expect(/\$297\b/.test(src), `$297 found in ${f}`).toBe(false);
    }
  });

  it("RevenueControlSystem page displays $1,000/month", () => {
    const src = read("src/pages/RevenueControlSystem.tsx");
    expect(src).toMatch(/\$1,000/);
    expect(src).toMatch(/\/month/);
  });

  it("Index card displays $1,000/month", () => {
    expect(read("src/pages/Index.tsx")).toMatch(/\$1,000\/month/);
  });

  it("Implementation grace copy uses $1,000/month", () => {
    const src = read("src/pages/Implementation.tsx");
    expect(src).toMatch(/\$1,000\/month/);
    expect(/\$297/.test(src)).toBe(false);
  });

  it("Diagnostic and Implementation flagship prices unchanged", () => {
    const idx = read("src/pages/Index.tsx");
    expect(idx).toMatch(/\$3,000/);
    expect(idx).toMatch(/\$10,000/);
  });

  it("scope copy still bounds RGS Control System (not unlimited execution)", () => {
    const src = read("src/pages/RevenueControlSystem.tsx");
    expect(/unlimited support|24\/7 support|done-for-you operator|guaranteed (results|outcome)/i.test(src)).toBe(false);
  });

  it("offer migration introduces $1,000/month subscription record (100000 cents)", () => {
    const dir = join(root, "supabase/migrations");
    const files = readdirSync(dir).filter((f) => f.endsWith(".sql"));
    const all = files.map((f) => read(`supabase/migrations/${f}`)).join("\n");
    expect(all).toMatch(/rgs_revenue_control_1000_monthly/);
    expect(all).toMatch(/100000/);
    // Ensure the old 29700 offer is deactivated, not silently re-activated
    expect(/is_active\s*=\s*false[\s\S]*rgs_revenue_control_297_monthly|update[\s\S]*offers[\s\S]*rgs_revenue_control_297_monthly[\s\S]*is_active\s*=\s*false/i.test(all)).toBe(true);
  });

  it("no client-facing/page source still seeds 29700 cents", () => {
    for (const f of CLIENT_FACING_FILES) {
      expect(/29700/.test(read(f)), `29700 cents found in ${f}`).toBe(false);
    }
  });
});