/**
 * P93H — CTA cleanup contract (P96E-hardened).
 *
 * Locks down:
 *  - SCORECARD_CTA_LABEL (retained for internal/diagnostic surfaces only)
 *    drops "0–1000" and capitalizes FREE.
 *  - No public CTA button (homepage, blog, demo, blog post) renders the
 *    Scorecard label or "0–1000" inside its clickable text.
 *  - The public homepage no longer markets the Scorecard at all; the
 *    0–1000 concept may still appear quietly in explanatory blog copy.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SCORECARD_CTA_LABEL } from "@/lib/cta";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

describe("P93H — Scorecard CTA label (internal-only)", () => {
  it("uses the FREE-capitalized label and drops 0–1000 from the button", () => {
    expect(SCORECARD_CTA_LABEL).toBe("Take the FREE Business Stability Scorecard");
    expect(SCORECARD_CTA_LABEL).not.toMatch(/0[–-]1000/);
    expect(SCORECARD_CTA_LABEL).toMatch(/\bFREE\b/);
  });

  it("does not use any of the banned generic CTA labels", () => {
    const banned = [
      /^Get Started$/i,
      /^Learn More$/i,
      /^Start Now$/i,
      /^See Your 0[–-]1000 Score$/i,
      /^Take the Free 0[–-]1000 Stability Scorecard$/i,
    ];
    for (const re of banned) expect(SCORECARD_CTA_LABEL).not.toMatch(re);
  });
});

describe("P93H — public CTA buttons are cleaned up site-wide", () => {
  const FILES = [
    "src/pages/Index.tsx",
    "src/pages/Blog.tsx",
    "src/pages/BlogPost.tsx",
    "src/pages/Demo.tsx",
  ];

  it.each(FILES)("`%s` button labels do not include 0–1000", (rel) => {
    const src = read(rel);
    // Match anchor/button text containing 0–1000 and "Scorecard". Helper
    // copy in <p>/<h*> blocks is allowed; this rule targets clickable CTAs.
    const buttonScorecard0to1000 =
      />[^<]*0[–-]1000[^<]*Scorecard[^<]*<\s*ArrowRight/i;
    expect(src).not.toMatch(buttonScorecard0to1000);
  });

  it("homepage no longer surfaces public Scorecard marketing (P96E)", () => {
    const HOME = read("src/pages/Index.tsx");
    expect(HOME).not.toMatch(/Free 0–1000 Stability Scorecard/);
    expect(HOME).not.toMatch(/Take the FREE Business Stability Scorecard/);
    expect(HOME).not.toMatch(/0–1000 Business Stability Score/);
    expect(HOME).not.toMatch(/data-testid="offer-ladder-scorecard"/);
  });

  it("blog explanatory copy still mentions the 0–1000 Scorecard concept", () => {
    const BLOG = read("src/pages/Blog.tsx");
    const POST = read("src/pages/BlogPost.tsx");
    expect(BLOG).toMatch(/0–1000 Business Stability Scorecard/);
    expect(POST).toMatch(/0–1000 Business Stability Scorecard/);
  });
});