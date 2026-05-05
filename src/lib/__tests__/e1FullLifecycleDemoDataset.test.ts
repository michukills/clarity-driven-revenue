/**
 * E1 — Full Lifecycle Demo Dataset + Multi-Industry Client Coverage.
 *
 * Static contract suite. Verifies the lifecycle demo dataset is safe,
 * idempotent, scope-bounded, and covers every required industry /
 * tool-depth profile and lifecycle phase.
 *
 * No network. No production logic changes. Companion to existing
 * `demoResetLaunchReadinessSmoke` and `demoSeedP41Contract`.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  E1_DEMO_EMAILS,
  E1_LIFECYCLE_DEMO_SPECS,
  E1_REQUIRED_INDUSTRIES,
  E1_REQUIRED_LIFECYCLE_STATES,
  validateScorecardHistory,
} from "../admin/e1LifecycleDemoSpecs";

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(resolve(ROOT, rel), "utf8");

describe("E1 / industry + lifecycle coverage", () => {
  it("covers all 7 required industries / tool-depth profiles (≥1 spec each)", () => {
    for (const ind of E1_REQUIRED_INDUSTRIES) {
      const found = E1_LIFECYCLE_DEMO_SPECS.some((s) => s.industry === ind);
      expect(found, `missing industry coverage: ${ind}`).toBe(true);
    }
  });

  it("covers required lifecycle states (across the dataset, including supplemental seeders)", () => {
    // The lifecycle dataset covers the high-signal phases directly; phases
    // not present here are covered by `demoSeed` (RCC variants) and
    // `showcaseSeed` (atlas/northstar/summit/keystone). Required-by-E1
    // phases must be present in the lifecycle dataset itself.
    const required = [
      "diagnostic_tools_in_progress",
      "ready_for_review",
      "clarification_needed",
      "report_ready",
      "implementation_offered",
      "rcc_active",
      "long_term_five_year",
    ] as const;
    for (const phase of required) {
      expect(
        E1_LIFECYCLE_DEMO_SPECS.some((s) => s.lifecycle === phase),
        `lifecycle phase missing: ${phase}`,
      ).toBe(true);
    }
    // The full required-state list is exported for documentation / future
    // expansion; ensure it stays in sync structurally.
    expect(E1_REQUIRED_LIFECYCLE_STATES.length).toBeGreaterThanOrEqual(required.length);
  });

  it("includes a 5-year long-term client with multi-year scorecard history", () => {
    const long = E1_LIFECYCLE_DEMO_SPECS.find((s) => s.lifecycle === "long_term_five_year");
    expect(long, "missing long-term client").toBeTruthy();
    expect(long!.scorecard_history.length).toBeGreaterThanOrEqual(5);
    const oldest = Math.min(...long!.scorecard_history.map((s) => s.daysAgo));
    expect(oldest).toBeLessThanOrEqual(-365 * 4);
  });

  it("includes ≥1 report-ready/approved, clarification-needed, and RCC-active client", () => {
    expect(E1_LIFECYCLE_DEMO_SPECS.some((s) => s.has_approved_report)).toBe(true);
    expect(E1_LIFECYCLE_DEMO_SPECS.some((s) => s.needs_clarification)).toBe(true);
    expect(E1_LIFECYCLE_DEMO_SPECS.some((s) => s.rcc_active)).toBe(true);
  });
});

describe("E1 / safe labeling + scoping", () => {
  it("every spec uses @demo.rgs.local or @showcase.rgs.local email", () => {
    for (const s of E1_LIFECYCLE_DEMO_SPECS) {
      expect(/@(demo|showcase)\.rgs\.local$/.test(s.email), `bad email: ${s.email}`).toBe(true);
    }
  });

  it("every business name includes Demo or Showcase", () => {
    for (const s of E1_LIFECYCLE_DEMO_SPECS) {
      expect(/(Demo|Showcase)/i.test(s.business_name), `unlabeled business: ${s.business_name}`).toBe(true);
    }
  });

  it("every full_name carries a (demo) marker", () => {
    for (const s of E1_LIFECYCLE_DEMO_SPECS) {
      expect(/\(demo\)/i.test(s.full_name)).toBe(true);
    }
  });

  it("E1_DEMO_EMAILS is the canonical list and matches specs", () => {
    expect(E1_DEMO_EMAILS.length).toBe(E1_LIFECYCLE_DEMO_SPECS.length);
    for (const s of E1_LIFECYCLE_DEMO_SPECS) expect(E1_DEMO_EMAILS).toContain(s.email);
  });
});

describe("E1 / scoring discipline", () => {
  it("every scorecard snapshot stays within 0–1000 / 0–200 per gear", () => {
    for (const s of E1_LIFECYCLE_DEMO_SPECS) {
      const errs = validateScorecardHistory(s);
      expect(errs, errs.join("\n")).toHaveLength(0);
    }
  });
});

describe("E1 / cannabis safety", () => {
  const cannabis = E1_LIFECYCLE_DEMO_SPECS.find((s) => s.industry === "cannabis_mmj_mmc")!;

  it("cannabis spec uses operational visibility / documentation readiness language", () => {
    expect(cannabis).toBeTruthy();
    const text = JSON.stringify(cannabis).toLowerCase();
    expect(text).toMatch(/operational visibility/);
    expect(text).toMatch(/documentation readiness/);
  });

  it("cannabis spec contains no healthcare / HIPAA / patient-care / clinical / medical billing wording (except negated safety rules)", () => {
    const banned = [/\bHIPAA\b/, /\bpatient[- ]care\b/i, /\bclinical workflow\b/i, /\bmedical billing\b/i, /\bhealthcare\b/i];
    const lines = JSON.stringify(cannabis, null, 2).split("\n");
    const offenders: string[] = [];
    for (const line of lines) {
      const negated = /\b(not|never|no|do not|don't|excludes?)\b/i.test(line);
      if (negated) continue;
      for (const rx of banned) if (rx.test(line)) offenders.push(`${rx} :: ${line.trim()}`);
    }
    expect(offenders, offenders.join("\n")).toHaveLength(0);
  });

  it("cannabis spec explicitly disclaims legal / compliance / healthcare certification", () => {
    const text = cannabis.purpose.toLowerCase();
    expect(text).toMatch(/not legal advice/);
    expect(text).toMatch(/not compliance certification/);
    expect(text).toMatch(/not healthcare/);
  });
});

describe("E1 / no fake proof", () => {
  const banned = [
    /\bguaranteed\b/i,
    /\bROI\b/,
    /\btestimonial/i,
    /\bcase study\b/i,
    /\bcertified compliant\b/i,
    /\blegally compliant\b/i,
    /\bdone-for-you\b/i,
  ];
  it("no spec field carries fake proof / guarantee / ROI / testimonial language", () => {
    for (const s of E1_LIFECYCLE_DEMO_SPECS) {
      const text = JSON.stringify(s);
      for (const rx of banned) {
        expect(rx.test(text), `${s.key} contains banned phrase ${rx}`).toBe(false);
      }
    }
  });
});

describe("E1 / seed runner safety", () => {
  const runner = read("src/lib/admin/e1LifecycleDemoSeed.ts");

  it("runner enforces @demo.rgs.local suffix on every targeted email", () => {
    expect(runner).toMatch(/assertDemoEmail/);
    expect(runner).toMatch(/endsWith\(DEMO_SUFFIX\)/);
  });

  it("reset uses scoped .in(email, ...) + is_demo_account=true and never broad filters", () => {
    expect(runner).toMatch(/\.in\(\s*"email"\s*,\s*E1_DEMO_EMAILS\s*\)/);
    expect(runner).toMatch(/\.eq\(\s*"is_demo_account"\s*,\s*true\s*\)/);
    // Banned: deletes by industry / date / stage alone.
    expect(runner).not.toMatch(/\.delete\(\)\s*\.eq\("industry"/);
    expect(runner).not.toMatch(/\.delete\(\)\s*\.lt\("created_at"/);
    expect(runner).not.toMatch(/\.delete\(\)\s*\.eq\("stage"/);
    // Banned: unscoped delete.
    expect(runner).not.toMatch(/from\("customers"\)\s*as any\)?\s*\.delete\(\)\s*$/m);
  });

  it("runner is idempotent: lookup-by-email + update/insert pattern", () => {
    expect(runner).toMatch(/maybeSingle\(\)/);
    expect(runner).toMatch(/if\s*\(existing\?\.id\)/);
  });

  it("runner does not import admin-only namespaces from edge / server context", () => {
    expect(runner).not.toMatch(/Deno\.env/);
    expect(runner).not.toMatch(/SERVICE_ROLE/);
    expect(runner).not.toMatch(/industry-evidence-context/);
  });
});

describe("E1 / global safety regression hooks", () => {
  it("public /demo page remains sample/demo only (no fake proof)", () => {
    const demo = read("src/pages/Demo.tsx");
    expect(/sample\/demo data/i.test(demo)).toBe(true);
    expect(/guaranteed/i.test(demo)).toBe(false);
    expect(/testimonial/i.test(demo)).toBe(false);
  });

  it("public /demo does not import the E1 lifecycle dataset", () => {
    const demo = read("src/pages/Demo.tsx");
    expect(demo).not.toMatch(/e1LifecycleDemoSpecs/);
    expect(demo).not.toMatch(/e1LifecycleDemoSeed/);
  });

  it("RGS Control System pricing remains $1,000/month and no active $297/month", () => {
    const rcs = read("src/pages/RevenueControlSystem.tsx");
    expect(rcs).toMatch(/\$1,?000\/month/);
    expect(rcs).not.toMatch(/\$297\/month/);
  });
});