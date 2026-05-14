/**
 * P93H-B — System-Wide UI Polish + Layout Hardening contract guards.
 *
 * Layout/contract checks only — no business logic asserted. These guards
 * lock in the broader polish pass and prevent regressions to:
 *   - "0–1000" creeping back into clickable button labels
 *   - admin-only content leaking into the client RGS Control System page
 *   - missing min-w-0 / responsive padding on the umbrella shells
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SCORECARD_CTA_LABEL } from "@/lib/cta";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

describe("P93H-B — site-wide CTA cleanup", () => {
  const PUBLIC_PAGES = [
    "src/pages/Index.tsx",
    "src/pages/Blog.tsx",
    "src/pages/BlogPost.tsx",
    "src/pages/Demo.tsx",
    "src/pages/WhatWeDo.tsx",
    "src/pages/WhyRGSIsDifferent.tsx",
    "src/pages/industries/IndustryLanding.tsx",
  ];

  it.each(PUBLIC_PAGES)(
    "`%s` does not put 0–1000 inside a clickable Scorecard button label",
    (rel) => {
      const src = read(rel);
      // Match anchor inner text containing 0–1000 followed by an
      // ArrowRight icon (our standard CTA pattern).
      const buttonPattern = />\s*[^<]*0[–-]1000[^<]*<\s*ArrowRight/i;
      expect(src).not.toMatch(buttonPattern);
      // Also block "Score (0–1000)" / "Take the 0–1000 …" / "Get Your … Score (0–1000)"
      // appearing as button-like literals followed by an arrow.
      expect(src).not.toMatch(/Take the 0[–-]1000 Business Stability Scorecard/);
      expect(src).not.toMatch(/Get Your Business Score \(0[–-]1000\)/);
      expect(src).not.toMatch(/Score your stability \(0[–-]1000\)/);
    },
  );

  it("primary Scorecard CTA label uses FREE capitalization and drops 0–1000", () => {
    expect(SCORECARD_CTA_LABEL).toMatch(/\bFREE\b/);
    expect(SCORECARD_CTA_LABEL).not.toMatch(/0[–-]1000/);
  });
});

describe("P93H-B — RGS Control System shells are responsive", () => {
  it("client RGS Control System page hardens layout (min-w-0, responsive padding)", () => {
    const src = read("src/pages/portal/tools/RgsControlSystem.tsx");
    expect(src).toMatch(/min-w-0/);
    expect(src).toMatch(/px-4 sm:px-6/);
    // Tool cards align via flex column + mt-auto so the Open link sits at
    // the bottom regardless of description length.
    expect(src).toMatch(/flex flex-col min-w-0/);
    expect(src).toMatch(/mt-auto/);
  });

  it("client RGS Control System page does NOT leak admin-only subscription fields", () => {
    const src = read("src/pages/portal/tools/RgsControlSystem.tsx");
    expect(src).not.toMatch(/rcc_subscription_status/);
    expect(src).not.toMatch(/rcc_paid_through/);
    expect(src).not.toMatch(/admin_summary_note/);
    expect(src).not.toMatch(/internal_notes/);
  });

  it("admin RGS Control System page hardens layout (min-w-0, responsive grid)", () => {
    const src = read("src/pages/admin/RgsControlSystemAdmin.tsx");
    expect(src).toMatch(/min-w-0/);
    expect(src).toMatch(/grid-cols-1 sm:grid-cols-2 lg:grid-cols-4/);
    expect(src).toMatch(/whitespace-nowrap/);
    // Admin variant is preserved.
    expect(src).toMatch(/PortalShell\s+variant="admin"/);
  });
});

describe("P93H-B — touched files do not regress on banned scope language", () => {
  const TOUCHED = [
    "src/pages/portal/tools/RgsControlSystem.tsx",
    "src/pages/admin/RgsControlSystemAdmin.tsx",
    "src/pages/WhatWeDo.tsx",
    "src/pages/WhyRGSIsDifferent.tsx",
    "src/pages/industries/IndustryLanding.tsx",
  ];
  const BANNED = [
    /trusted by/i,
    /guaranteed (revenue|ROI|results)/i,
    /unlimited (support|consulting|advisory)/i,
    /\bHIPAA\b/i,
    /done[- ]for[- ]you/i,
    /Coming soon/i,
  ];
  it.each(TOUCHED)("`%s` has no banned scope language", (rel) => {
    const src = read(rel);
    for (const re of BANNED) {
      expect(src, `${rel} matches banned ${re}`).not.toMatch(re);
    }
  });
});