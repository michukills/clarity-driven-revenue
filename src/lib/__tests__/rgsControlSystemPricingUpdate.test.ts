import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  EXACT_CHECKOUT_FLOWS,
  PUBLIC_PRICING_SUMMARY,
  RGS_PRICING_TIERS,
} from "@/config/rgsPricingTiers";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const ACTIVE_PUBLIC_PAGES = [
  "src/pages/Index.tsx",
  "src/pages/RevenueControlSystem.tsx",
  "src/pages/Implementation.tsx",
  "src/pages/Diagnostic.tsx",
  "src/pages/DiagnosticApply.tsx",
];

describe("RGS Control System pricing — P91 complexity-based update", () => {
  it("no active public page contains the retired $297 offer", () => {
    for (const f of ACTIVE_PUBLIC_PAGES) {
      const src = read(f);
      expect(/\$297\b/.test(src), `$297 found in ${f}`).toBe(false);
      expect(/29700/.test(src), `29700 cents found in ${f}`).toBe(false);
    }
  });

  it("public pages now use scope-based pricing language for RGS Control System", () => {
    const rcs = read("src/pages/RevenueControlSystem.tsx");
    expect(rcs).toContain("Scope-based subscription");
    expect(rcs).toContain("PUBLIC_PRICING_SUMMARY.rgs_control_system");
    expect(PUBLIC_PRICING_SUMMARY.rgs_control_system).toMatch(/\$1,500\/month/);
    expect(PUBLIC_PRICING_SUMMARY.rgs_control_system).toMatch(/\$5,000\+\/month/);
  });

  it("homepage offer cards avoid old fixed public pricing labels", () => {
    const idx = read("src/pages/Index.tsx");
    expect(idx).toContain("Diagnostic — scope-based");
    expect(idx).toContain("Implementation — scoped project");
    expect(idx).toContain("RGS Control System™ — ongoing visibility");
    expect(idx).not.toMatch(/Diagnostic\s+—\s+\$3,000/);
    expect(idx).not.toMatch(/Implementation\s+—\s+\$10,000/);
    expect(idx).not.toMatch(/Revenue Control System™\s+—\s+\$1,000\/month/);
  });

  it("complexity tiers carry current RGS Control System guidance", () => {
    expect(RGS_PRICING_TIERS.map((t) => t.pricing.rgs_control_system.display)).toEqual([
      "RGS Control System usually starts around $1,500/month",
      "RGS Control System is often around $3,000/month",
      "RGS Control System starts at $5,000+/month",
    ]);
  });

  it("existing exact offer records remain documented as wired/admin-link flows", () => {
    const diag = EXACT_CHECKOUT_FLOWS.find((flow) => flow.offer_slug === "rgs_diagnostic_3000");
    expect(diag?.checkout_status).toBe("wired");
    expect(diag?.payment_lane).toBe("public_non_client");
    const rcs = EXACT_CHECKOUT_FLOWS.find((flow) => flow.offer_slug === "rgs_revenue_control_1000_monthly");
    expect(rcs?.checkout_status).toBe("admin_link_only");
  });

  it("migration preserves active $1,000 admin subscription and deactivates the retired $297 offer", () => {
    const dir = join(root, "supabase/migrations");
    const all = readdirSync(dir)
      .filter((f) => f.endsWith(".sql"))
      .map((f) => read(`supabase/migrations/${f}`))
      .join("\n");
    expect(all).toMatch(/rgs_revenue_control_1000_monthly/);
    expect(all).toMatch(/100000/);
    expect(
      /update[\s\S]*offers[\s\S]*rgs_revenue_control_297_monthly[\s\S]*is_active\s*=\s*false/i.test(all),
    ).toBe(true);
  });
});
