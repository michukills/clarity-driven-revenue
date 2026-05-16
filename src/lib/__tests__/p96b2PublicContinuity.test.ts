/**
 * P96B.2 — Deep public page continuity.
 *
 * Pins the public funnel architecture across the deeper pages:
 *   /what-we-do, /system, /diagnostic, /why-rgs-is-different,
 *   /blog and /blog/:slug, footer.
 *
 * Architecture being pinned:
 *   Scan        → directional public entry (primary public CTA)
 *   Scorecard   → Diagnostic Part 1 — Business Stability Assessment
 *   Diagnostic  → Part 1 + Owner Interview (Part 2) + Evidence Review
 *                 → Diagnostic Report + Repair Map
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (rel: string) =>
  readFileSync(join(process.cwd(), rel), "utf8");

const WHAT = read("src/pages/WhatWeDo.tsx");
const SYSTEM = read("src/pages/System.tsx");
const DIAG = read("src/pages/Diagnostic.tsx");
const WHY = read("src/pages/WhyRGSIsDifferent.tsx");
const BLOG = read("src/pages/Blog.tsx");
const POST = read("src/pages/BlogPost.tsx");

describe("P96B.2 — Deep public pages lead with the Operational Friction Scan", () => {
  it("/what-we-do final CTA points the primary action to /scan", () => {
    expect(WHAT).toMatch(/Operational Friction Scan/i);
    expect(WHAT).toMatch(/to=\{SCAN_PATH\}/);
    expect(WHAT).toMatch(/SCORECARD_DIAGNOSTIC_LABEL/);
  });

  it("/system surfaces a Scan → Diagnostic Part 1 continuity rail", () => {
    expect(SYSTEM).toMatch(/Operational Friction Scan/i);
    expect(SYSTEM).toMatch(/Diagnostic/);
    expect(SYSTEM).toMatch(/to=\{SCAN_PATH\}/);
    expect(SYSTEM).toMatch(/SCORECARD_DIAGNOSTIC_LABEL/);
  });

  it("/why-rgs-is-different leads with the Scan in both hero and final CTAs", () => {
    expect(WHY).toMatch(/to=\{SCAN_PATH\}/);
    expect(WHY).toMatch(/SCAN_CTA_LABEL/);
    expect(WHY).toMatch(/SCORECARD_DIAGNOSTIC_LABEL/);
  });

  it("/blog index includes a Scan rail above the Scorecard CTA", () => {
    expect(BLOG).toMatch(/Operational Friction Scan/i);
    expect(BLOG).toMatch(/to=\{SCAN_PATH\}/);
    // Pinned by blogSystemContract — must still be present.
    expect(BLOG).toMatch(/Take the FREE Business Stability Scorecard/);
    expect(BLOG).toMatch(/Diagnostic Part 1/i);
  });

  it("/blog/:slug includes a Scan rail and frames Scorecard as Diagnostic Part 1", () => {
    expect(POST).toMatch(/Operational Friction Scan/i);
    expect(POST).toMatch(/to=\{SCAN_PATH\}/);
    expect(POST).toMatch(/Take the FREE Business Stability Scorecard/);
    expect(POST).toMatch(/Diagnostic Part 1/);
  });
});

describe("P96B.2 — Diagnostic is positioned as a layered, structured process", () => {
  it("/diagnostic hero describes Part 1 + Part 2 + Evidence Review → Report", () => {
    expect(DIAG).toMatch(/Operational Friction Scan/);
    expect(DIAG).toMatch(/Business Stability Assessment.*Part 1|Part 1.*Business Stability Assessment/);
    expect(DIAG).toMatch(/Owner Diagnostic Interview/);
    expect(DIAG).toMatch(/Diagnostic Report/);
    expect(DIAG).toMatch(/Repair Map/);
  });

  it("/diagnostic 'what's included' list names Part 1 + Part 2 + Report explicitly", () => {
    expect(DIAG).toMatch(/Diagnostic Part 1 — Business Stability Assessment/);
    expect(DIAG).toMatch(/Diagnostic Part 2 — Owner Diagnostic Interview/);
    expect(DIAG).toMatch(/Diagnostic Report — Stability Snapshot and Priority Repair Map/);
  });
});

describe("P96B.2 — No regression to scorecard-first public framing", () => {
  const surfaces: Array<[string, string]> = [
    ["WhatWeDo", WHAT],
    ["System", SYSTEM],
    ["WhyRGSIsDifferent", WHY],
  ];

  it.each(surfaces)(
    "%s does not describe the Scorecard as the primary 'starting read' on its own",
    (_name, src) => {
      // Old framing that demoted the Scan: "Scorecard gives a starting read"
      // or "Scorecard gives a self-reported starting read" with no Scan
      // mentioned in the same surface.
      expect(src).not.toMatch(/Scorecard gives a starting read/);
      expect(src).not.toMatch(/Scorecard gives a self-reported starting read/);
    },
  );
});