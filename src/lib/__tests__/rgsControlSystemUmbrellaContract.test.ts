import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");
const allMigrations = () => {
  const dir = join(root, "supabase/migrations");
  return readdirSync(dir).filter((f) => f.endsWith(".sql"))
    .map((f) => readFileSync(join(dir, f), "utf8")).join("\n");
};

describe("P52 — RGS Control System™ Umbrella contract", () => {
  it("portal route is mounted behind ClientToolGuard with the correct tool key", () => {
    const app = read("src/App.tsx");
    expect(app).toMatch(
      /path="\/portal\/tools\/rgs-control-system"[\s\S]*ClientToolGuard\s+toolKey="rgs_control_system"/,
    );
  });

  it("admin route requires admin role", () => {
    const app = read("src/App.tsx");
    expect(app).toMatch(
      /path="\/admin\/customers\/:customerId\/rgs-control-system"[\s\S]*requireRole="admin"/,
    );
  });

  it("migration registers tool with rgs_control_system lane / rcs_ongoing_visibility phase", () => {
    const sql = allMigrations();
    expect(sql).toMatch(
      /'rgs_control_system'[\s\S]*'rgs_control_system'[\s\S]*'rcs_ongoing_visibility'/,
    );
    expect(sql).toMatch(/'\/portal\/tools\/rgs-control-system'/);
  });

  it("docs and pages exist", () => {
    expect(existsSync(join(root, "docs/rgs-control-system-umbrella.md"))).toBe(true);
    expect(existsSync(join(root, "src/pages/portal/tools/RgsControlSystem.tsx"))).toBe(true);
    expect(existsSync(join(root, "src/pages/admin/RgsControlSystemAdmin.tsx"))).toBe(true);
  });

  it("classification doc lists the umbrella as rgs_control_system / rcs_ongoing_visibility", () => {
    const doc = read("docs/tool-lane-phase-industry-classification.md");
    expect(doc).toMatch(
      /\| rgs_control_system \| rgs_control_system \| rcs_ongoing_visibility \| all_industries_shared \|/,
    );
  });

  it("client umbrella page does not reference internal_notes or raw payment internals", () => {
    const page = read("src/pages/portal/tools/RgsControlSystem.tsx");
    expect(page).not.toMatch(/internal_notes/);
    expect(page).not.toMatch(/rcc_subscription_status/);
    expect(page).not.toMatch(/rcc_paid_through/);
    expect(page).not.toMatch(/stripe_(customer|payment)/i);
  });

  it("no scope-creep / banned wording in client umbrella surface", () => {
    const page = read("src/pages/portal/tools/RgsControlSystem.tsx");
    const banned = [
      /unlimited support/i, /unlimited implementation/i, /unlimited consulting/i,
      /emergency support/i,
      /RGS runs your business/i, /RGS manages everything/i,
      /done[- ]for[- ]you/i, /full[- ]service/i,
      /guaranteed (revenue|roi|results|clean data)/i,
      /automatic insight from every tool/i,
      /replaces (accounting|legal|tax|compliance)/i,
      /use anytime/i, /upgrade anytime/i, /ask RGS if/i,
      /Diagnostic \+ ongoing/i,
    ];
    for (const re of banned) expect(page).not.toMatch(re);
  });

  it("no scope-creep / banned wording in admin umbrella surface", () => {
    const page = read("src/pages/admin/RgsControlSystemAdmin.tsx");
    const banned = [
      /unlimited support/i, /unlimited implementation/i,
      /done[- ]for[- ]you/i, /full[- ]service/i,
      /guaranteed (revenue|roi|results|clean data)/i,
      /use anytime/i, /upgrade anytime/i, /ask RGS if/i,
      /Diagnostic \+ ongoing/i,
    ];
    for (const re of banned) expect(page).not.toMatch(re);
  });
});