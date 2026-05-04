/**
 * Industry Brain Deep Expansion — contract tests.
 *
 * Verifies that the seeded Industry Brain entries actually cover the
 * required variable categories per industry, that Cannabis / MMJ / MMC
 * stays dispensary/operations logic only, that tool-coverage UI copy
 * does not use misleading "100% default tool coverage" language, and
 * that the admin route protection / no-client-exposure rules are
 * preserved.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");
const allMigrations = () =>
  readdirSync(join(root, "supabase/migrations"))
    .filter((f) => f.endsWith(".sql"))
    .map((f) => readFileSync(join(root, "supabase/migrations", f), "utf8"))
    .join("\n");

const INDUSTRIES = [
  "trades_services",
  "restaurant_food_service",
  "retail",
  "cannabis_mmj_mmc",
  "general_small_business",
] as const;

function seedRowsFor(industry: string): string[] {
  const sql = allMigrations();
  const rows: string[] = [];
  // capture each row that begins with ('<industry>', up to the closing ),
  const re = new RegExp(
    `\\(\\s*'${industry}'[\\s\\S]*?\\)(?=\\s*,\\s*\\n|\\s*ON CONFLICT)`,
    "g",
  );
  for (const m of sql.matchAll(re)) rows.push(m[0]);
  return rows;
}

describe("Industry Brain Deep Expansion", () => {
  it("admin route remains protected by requireRole='admin'", () => {
    const app = read("src/App.tsx");
    expect(app).toMatch(
      /path="\/admin\/industry-brain"[\s\S]*?requireRole="admin"[\s\S]*?IndustryBrainAdmin/,
    );
  });

  it("Industry Brain is not exposed in the customer portal navigation", () => {
    const portalShell = read("src/components/portal/PortalShell.tsx");
    // Allow admin-mode references; assert no client/customer link to it.
    expect(portalShell).not.toMatch(/href="\/portal\/industry-brain"/);
    expect(portalShell).not.toMatch(/to="\/portal\/industry-brain"/);
  });

  it("adds a uniqueness index on (industry_key, title)", () => {
    expect(allMigrations()).toMatch(
      /CREATE UNIQUE INDEX[^\n]*uniq_ibe_industry_title[\s\S]*?industry_brain_entries\(industry_key,\s*title\)/,
    );
  });

  it("each industry has at least 8 seeded entries", () => {
    for (const ind of INDUSTRIES) {
      const rows = seedRowsFor(ind);
      expect(rows.length, `${ind} entry count`).toBeGreaterThanOrEqual(8);
    }
  });

  it("each industry covers the required variable categories", () => {
    const requiredKeywords: Record<string, RegExp[]> = {
      revenue: [/revenue|margin|prime cost|category/i],
      demand: [/demand|lead|referral|repeat|loyalty|marketing|attribution|channel|menu mix|category/i],
      conversion: [/conversion|follow-up|handoff|quote|estimate|register|ticket/i],
      operational: [/operational|workflow|scheduling|dispatch|prep|line|inventory|POS|traceability/i],
      financial_visibility: [/financial visibility|margin visibility|cash|reconciliation|AR aging|labor cost/i],
      owner_dependence: [/owner-dependent|owner-only|owner bottleneck|owner as the bottleneck|funnel through the owner|trapped in|in head|by memory|in the owner|only owner|head\/email/i],
      staffing: [/staff|crew|budtender|manager|certification|training|role|accountability|shift/i],
      customer_handoff: [/handoff|customer|intake|delivery|status update|post-purchase|register/i],
      software_evidence: [/POS|CRM|QuickBooks|Xero|Square|Stripe|spreadsheet|evidence|software|inventory system|accounting/i],
      margin_profitability: [/margin|profitability|prime cost|discount|promotion|comp|shrink|waste|vendor cost/i],
      repair_map: [/Repair[- ]map|standardize|document|install a|cadence|assign decision rights/i],
      tool_readiness: [/Tool\/report readiness|Diagnostic Report|Implementation Roadmap|Monthly System Review|Priority Action Tracker/i],
    };
    for (const ind of INDUSTRIES) {
      const blob = seedRowsFor(ind).join("\n");
      for (const [cat, regs] of Object.entries(requiredKeywords)) {
        const hit = regs.some((re) => re.test(blob));
        expect(hit, `${ind} missing ${cat} variables`).toBe(true);
      }
    }
  });

  it("cannabis seeds stay dispensary/operations only — no healthcare/HIPAA/patient-care/insurance/claims framing", () => {
    const blob = seedRowsFor("cannabis_mmj_mmc").join("\n");
    expect(blob).not.toMatch(/HIPAA/i);
    expect(blob).not.toMatch(/medical billing/i);
    expect(blob).not.toMatch(/patient intake/i);
    expect(blob).not.toMatch(/clinical workflow/i);
    expect(blob).not.toMatch(/\binsurance claims?\s+(processing|handling|management)\b/i);
    // Any mention of patient-care/healthcare must be inside an explicit "not …" negation.
    for (const row of seedRowsFor("cannabis_mmj_mmc")) {
      const hasMention = /patient[- ]care|\bhealthcare\b/i.test(row);
      if (hasMention) {
        expect(row, "cannabis seed mentions healthcare/patient-care without negation").toMatch(/\bnot\b/i);
      }
    }
    // And cannabis rows must include genuine dispensary/operational variables.
    expect(blob).toMatch(/dispensary|budtender|inventory traceability|POS|menu accuracy|cash handling|state-specific/i);
  });

  it("cannabis seeds include compliance-sensitive notes without certifying compliance", () => {
    const blob = seedRowsFor("cannabis_mmj_mmc").join("\n");
    expect(blob).toMatch(/compliance[- ]sensitive/i);
    expect(blob).toMatch(/state-specific rules may apply/i);
    expect(blob).toMatch(/not legal advice/i);
    expect(blob).toMatch(/not a compliance guarantee/i);
    expect(blob).not.toMatch(/compliance guaranteed/i);
    expect(blob).not.toMatch(/keeps you compliant/i);
  });

  it("tool-coverage UI avoids misleading '100% default tool coverage' language", () => {
    const cat = read("src/pages/admin/ToolCatalog.tsx");
    const mat = read("src/pages/admin/ToolMatrix.tsx");
    expect(cat).not.toMatch(/100% default tool coverage/);
    expect(mat).not.toMatch(/100% default coverage/);
    expect(cat).toMatch(/Default tools mapped|of default tools mapped/);
    expect(mat).toMatch(/default tools mapped|of default tools mapped/);
  });

  it("each industry's seeds reference at least one repair-map and one tool-readiness entry", () => {
    for (const ind of INDUSTRIES) {
      const blob = seedRowsFor(ind).join("\n");
      expect(blob, `${ind} repair map`).toMatch(/Repair[- ]map/i);
      expect(blob, `${ind} tool readiness`).toMatch(/Tool readiness/i);
    }
  });

  it("third-party brand names use exact official capitalization in seeds", () => {
    const blob = INDUSTRIES.flatMap(seedRowsFor).join("\n");
    expect(blob).not.toMatch(/\bquickbooks\b/);
    expect(blob).not.toMatch(/\bQuickbooks\b/);
    expect(blob).not.toMatch(/\bxero\b/);
    expect(blob).not.toMatch(/\bstripe\b/);
  });
});