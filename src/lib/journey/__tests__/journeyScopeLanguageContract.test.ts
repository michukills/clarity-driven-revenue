import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * P42 — scope-language and layout regression for the Stability Journey.
 *
 * Journey copy lives inside the paid diagnostic scope. It must not blur into
 * RCS / subscription cadence, must not fake proof, and must not bring back the
 * cramped layouts P41.5/P41.6 cleaned up.
 */

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const FILES = [
  "src/lib/journey/stabilityJourney.ts",
  "src/lib/journey/useStabilityJourney.ts",
  "src/components/journey/StabilityJourneyDashboard.tsx",
  "src/components/admin/AdminStabilityJourneyPanel.tsx",
  "src/pages/portal/MyTools.tsx",
  "docs/stability-journey.md",
];

const HARD_BANNED: RegExp[] = [
  /\bquarterly\b/i,
  /\bthen quarterly\b/i,
  /\bdiagnostic \+ ongoing\b/i,
  /\bongoing review\b/i,
  /\bongoing monitoring\b/i,
  /\bask rgs if\b/i,
  /\buse anytime\b/i,
  /\brun quarterly\b/i,
  /\bafter major changes\b/i,
  /\bbetween reviews\b/i,
  /\bfake proof\b/i,
  /\bfake testimonial\b/i,
  /\bfake case study\b/i,
  /\bguaranteed result/i,
];

/**
 * Strip lines that are clearly documenting the ban itself (so the banned-words
 * list inside files like docs/stability-journey.md and this test's neighbours
 * does not trip the scanner). We split on lines and drop lines that contain
 * "banned" / "must not" / quoted bullet markers describing the rule.
 */
function stripBanDocumentation(src: string): string {
  return src
    .split("\n")
    .filter((line) => {
      const l = line.toLowerCase();
      if (l.includes("banned")) return false;
      if (l.includes("must not")) return false;
      if (l.includes("scope-creep")) return false;
      if (l.trim().startsWith("- \"") || l.trim().startsWith('- "')) return false;
      return true;
    })
    .join("\n");
}

describe("P42 — Stability Journey scope-language contract", () => {
  for (const file of FILES) {
    const raw = read(file);
    const text = stripBanDocumentation(raw);
    for (const re of HARD_BANNED) {
      it(`${file} avoids ${re}`, () => {
        expect(re.test(text), `${file} matched ${re}`).toBe(false);
      });
    }
    it(`${file} only uses "ongoing" with explicit RCS / subscription scoping`, () => {
      const matches = text.match(/[^.\n]*\bongoing\b[^.\n]*/gi) || [];
      for (const m of matches) {
        expect(
          /subscription|RCS|Revenue Control System|Revenue Control Center/i.test(m),
          `Unscoped "ongoing" in ${file}: "${m.trim()}"`,
        ).toBe(true);
      }
    });
  }
});

describe("P42 — Stability Journey UI layout safety", () => {
  const dash = read("src/components/journey/StabilityJourneyDashboard.tsx");
  const admin = read("src/components/admin/AdminStabilityJourneyPanel.tsx");

  it("dashboard uses responsive auto-fit minmax grid for header stats", () => {
    expect(dash).toMatch(/repeat\(auto-fit,\s*minmax\(220px/);
  });

  it("dashboard five-gear map uses responsive auto-fit minmax grid", () => {
    expect(dash).toMatch(/repeat\(auto-fit,\s*minmax\(260px/);
  });

  it("admin panel uses responsive auto-fit minmax grid", () => {
    expect(admin).toMatch(/repeat\(auto-fit,\s*minmax\(200px/);
  });

  it("dashboard does not truncate journey titles or recommended-move labels", () => {
    // No "truncate" class anywhere in the journey dashboard — titles must wrap.
    expect(/className="[^"]*\btruncate\b/.test(dash)).toBe(false);
  });

  it("dashboard does not pin rigid 4+ column grids that risk vertical text stacking", () => {
    expect(/grid-cols-(4|5|6)\b/.test(dash)).toBe(false);
  });
});