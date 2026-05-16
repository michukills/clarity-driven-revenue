// P92A — Final acceptance guard for the public funnel.
//
// Confirms:
//   * `/revenue-scorecard` is registered and redirects to `/scorecard`.
//   * `/scorecard` and the rest of the P92 public funnel routes remain
//     registered.
//   * The orphaned legacy `RevenueScorecard.tsx` page is not imported or
//     routed publicly.
//   * Public funnel routes still resolve in App.tsx.
//   * No new public checkout/payment CTAs, forbidden claims, or deprecated
//     blueprint/lay-bricks language was introduced into the public funnel.

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(process.cwd(), "src");
const APP = readFileSync(join(ROOT, "App.tsx"), "utf8");

const PUBLIC_FUNNEL_ROUTES = [
  "/",
  "/revenue-control-system",
  "/diagnostic",
  "/implementation",
  "/scorecard",
  "/contact",
  "/auth",
  "/industries/:slug",
  "/blog/:slug",
];

function hasRoute(path: string): boolean {
  const rx = new RegExp(`path="${path.replace(/[/:]/g, (c) => "\\" + c)}"`);
  return rx.test(APP);
}

describe("P92A — Public funnel acceptance", () => {
  // P102C — Scan-first funnel: /revenue-scorecard now redirects to /scan,
  // not /scorecard. /scorecard itself is the legacy entry that also resolves
  // toward /scan (handled in pages/Scorecard.tsx).
  it("registers /revenue-scorecard as a redirect to /scan", () => {
    const block =
      APP.match(
        /<Route\s+path="\/revenue-scorecard"[^>]*element=\{<Navigate\s+to="\/scan"\s+replace\s*\/>\}\s*\/>/,
      );
    expect(block, "missing /revenue-scorecard -> /scan redirect").not.toBeNull();
  });

  it("preserves /scorecard as the live scorecard route", () => {
    expect(hasRoute("/scorecard")).toBe(true);
  });

  it("preserves all P92 public funnel routes", () => {
    const missing = PUBLIC_FUNNEL_ROUTES.filter(
      (p) => p !== "/" && !hasRoute(p),
    );
    expect(missing, `missing routes: ${missing.join(", ")}`).toEqual([]);
    expect(/path="\/"/.test(APP)).toBe(true);
  });

  it("does not import or route the orphaned RevenueScorecard page", () => {
    expect(/from\s+["']@?\/?pages\/RevenueScorecard["']/.test(APP)).toBe(false);
    expect(/RevenueScorecard\b/.test(APP)).toBe(false);
  });

  it("RevenueScorecard.tsx remains marked orphaned and is not referenced elsewhere", () => {
    const file = readFileSync(join(ROOT, "pages/RevenueScorecard.tsx"), "utf8");
    expect(/ORPHANED PAGE/i.test(file)).toBe(true);

    // Walk public-facing source files and confirm nothing imports the orphan.
    const offenders: string[] = [];
    function walk(dir: string) {
      for (const f of readdirSync(dir)) {
        const p = join(dir, f);
        const s = statSync(p);
        if (s.isDirectory()) {
          if (p.includes("__tests__") || p.endsWith("/test")) continue;
          walk(p);
          continue;
        }
        if (!/\.(tsx?)$/.test(f)) continue;
        if (p.endsWith("RevenueScorecard.tsx")) continue;
        const text = readFileSync(p, "utf8");
        if (/from\s+["'][^"']*RevenueScorecard["']/.test(text)) {
          offenders.push(p);
        }
      }
    }
    walk(ROOT);
    expect(offenders, `unexpected importers: ${offenders.join(", ")}`).toEqual(
      [],
    );
  });

  it("does not introduce new public checkout/payment CTAs in funnel pages", () => {
    const funnelFiles = [
      "pages/Index.tsx",
      "pages/RevenueControlSystem.tsx",
      "pages/Implementation.tsx",
      "pages/Diagnostic.tsx",
      "pages/Contact.tsx",
    ];
    const violations: string[] = [];
    for (const rel of funnelFiles) {
      const p = join(ROOT, rel);
      let text: string;
      try {
        text = readFileSync(p, "utf8");
      } catch {
        continue;
      }
      // Public funnel must never directly call admin-only checkout slugs.
      if (
        /rgs_implementation_10000/.test(text) ||
        /rgs_revenue_control_1000_monthly/.test(text)
      ) {
        violations.push(`${rel}: admin-only checkout slug exposed`);
      }
      // Stripe.js / publishable key wiring must not appear in public funnel pages.
      if (/loadStripe\(|pk_live_|pk_test_/.test(text)) {
        violations.push(`${rel}: direct Stripe client wiring`);
      }
    }
    expect(violations, violations.join("\n")).toEqual([]);
  });

  it("does not introduce deprecated blueprint/lay-bricks wording", () => {
    const offenders: string[] = [];
    const banned = /(blueprint|lay\s*bricks|laying\s*bricks|brick\s*by\s*brick)/i;
    function walk(dir: string) {
      for (const f of readdirSync(dir)) {
        const p = join(dir, f);
        const s = statSync(p);
        if (s.isDirectory()) {
          if (
            p.includes("__tests__") ||
            p.endsWith("/admin") ||
            p.endsWith("/portal")
          )
            continue;
          walk(p);
          continue;
        }
        if (!/\.(tsx?)$/.test(f)) continue;
        const text = readFileSync(p, "utf8");
        if (banned.test(text)) offenders.push(p.replace(process.cwd() + "/", ""));
      }
    }
    walk(join(ROOT, "pages"));
    walk(join(ROOT, "components"));
    expect(offenders, `deprecated wording in: ${offenders.join(", ")}`).toEqual(
      [],
    );
  });

  it("does not introduce forbidden outcome/guarantee claims in public funnel", () => {
    const banned = [
      /\bguaranteed\s+results?\b/i,
      /\brisk[-\s]?free\b/i,
      /\bfree\s+trial\b/i,
      /\bcompliance\s+certified\b/i,
      /\bcertified\s+compliant\b/i,
    ];
    const funnelFiles = [
      "pages/Index.tsx",
      "pages/RevenueControlSystem.tsx",
      "pages/Implementation.tsx",
      "pages/Diagnostic.tsx",
      "pages/Contact.tsx",
      "pages/portal/Scorecard.tsx",
    ];
    const violations: string[] = [];
    for (const rel of funnelFiles) {
      const p = join(ROOT, rel);
      let text: string;
      try {
        text = readFileSync(p, "utf8");
      } catch {
        continue;
      }
      for (const rx of banned) {
        if (rx.test(text)) violations.push(`${rel}: matched ${rx}`);
      }
    }
    expect(violations, violations.join("\n")).toEqual([]);
  });
});
