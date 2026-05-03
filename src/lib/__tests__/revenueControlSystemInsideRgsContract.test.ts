import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");
const allMigrations = () => {
  const dir = join(root, "supabase/migrations");
  return readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .map((f) => readFileSync(join(dir, f), "utf8"))
    .join("\n");
};

const PUBLIC = "src/pages/RevenueControlSystem.tsx";
const PORTAL_RCC = "src/pages/portal/ClientRevenueTrackerPage.tsx";
const UMBRELLA = "src/pages/portal/tools/RgsControlSystem.tsx";

const BANNED: RegExp[] = [
  /unlimited support/i,
  /unlimited implementation/i,
  /unlimited consulting/i,
  /emergency support/i,
  /RGS runs your business/i,
  /RGS manages everything/i,
  /done[- ]for[- ]you/i,
  /full[- ]service/i,
  /guaranteed (revenue|roi|results|clean data)/i,
  /automatic insight from every tool/i,
  /replaces (accounting|legal|tax|compliance)/i,
  /use anytime/i,
  /upgrade anytime/i,
  /ask RGS if/i,
  /Diagnostic \+ ongoing/i,
];

describe("P53 — Revenue Control System inside RGS Control System contract", () => {
  it("public page positions Revenue Control System as part of RGS Control System", () => {
    const page = read(PUBLIC);
    expect(page).toMatch(/Part of the RGS Control System/i);
    expect(page).toMatch(/inside the larger RGS Control System/i);
  });

  it("client portal RCC page labels parent and links back to umbrella", () => {
    const page = read(PORTAL_RCC);
    expect(page).toMatch(/Part of the RGS Control System/i);
    expect(page).toMatch(/\/portal\/tools\/rgs-control-system/);
  });

  it("umbrella page names Revenue Control System as one tool inside the umbrella", () => {
    const page = read(UMBRELLA);
    expect(page).toMatch(/Revenue Control System/i);
    expect(page).toMatch(/inside this umbrella|one tool inside/i);
  });

  it("tool_catalog still has revenue_control_center on rgs_control_system / rcs_ongoing_visibility", () => {
    const sql = allMigrations();
    expect(sql).toMatch(
      /service_lane='rgs_control_system'[\s\S]*customer_journey_phase='rcs_ongoing_visibility'[\s\S]*WHERE tool_key='revenue_control_center'/,
    );
  });

  it("P52 umbrella tool_catalog row remains registered", () => {
    const sql = allMigrations();
    expect(sql).toMatch(/'rgs_control_system'[\s\S]*'rcs_ongoing_visibility'/);
  });

  it("no duplicate Revenue Control System catalog row was introduced", () => {
    const sql = allMigrations();
    const matches = sql.match(/INSERT[^\n]+tool_catalog[\s\S]*?revenue_control_system/gi) ?? [];
    // We never want a tool_key literally named 'revenue_control_system' (the
    // umbrella stays 'rgs_control_system'; the revenue tool stays
    // 'revenue_control_center').
    expect(/tool_key\s*=\s*'revenue_control_system'/i.test(sql)).toBe(false);
    expect(/VALUES\s*\([^)]*'revenue_control_system'/i.test(sql)).toBe(false);
    void matches;
  });

  it("public, portal RCC, and umbrella surfaces avoid scope-creep wording", () => {
    for (const f of [PUBLIC, PORTAL_RCC, UMBRELLA]) {
      const page = read(f);
      for (const re of BANNED) expect(page, `${f} matched ${re}`).not.toMatch(re);
    }
  });

  it("client RCC page does not leak internal_notes or payment internals", () => {
    const page = read(PORTAL_RCC);
    expect(page).not.toMatch(/internal_notes/);
    expect(page).not.toMatch(/rcc_subscription_status/);
    expect(page).not.toMatch(/stripe_(customer|payment)/i);
  });
});