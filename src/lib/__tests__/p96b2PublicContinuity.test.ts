/**
 * P96E — Public funnel continuity (post-Scorecard-public-removal).
 *
 * Pins the corrected public architecture:
 *   Public entry      → Operational Friction Scan (/scan)
 *   Deeper conversion → Diagnostic request (/diagnostic-apply)
 *   Scorecard         → INTERNAL only (/diagnostic/scorecard, protected)
 *                       /scorecard publicly redirects to /scan
 *
 * Public surfaces MUST NOT expose the Scorecard as a public CTA or
 * marketing asset. Diagnostic copy may describe the structured
 * operational review, owner interview, and Diagnostic Report without
 * naming "Scorecard" as a public offer.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");

const WHAT = read("src/pages/WhatWeDo.tsx");
const SYSTEM = read("src/pages/System.tsx");
const DIAG = read("src/pages/Diagnostic.tsx");
const WHY = read("src/pages/WhyRGSIsDifferent.tsx");
const BLOG = read("src/pages/Blog.tsx");
const POST = read("src/pages/BlogPost.tsx");
const APP = read("src/App.tsx");
const SCORECARD_PUBLIC = read("src/pages/Scorecard.tsx");

const PUBLIC_SURFACES: Array<[string, string]> = [
  ["WhatWeDo", WHAT],
  ["System", SYSTEM],
  ["WhyRGSIsDifferent", WHY],
  ["Diagnostic", DIAG],
  ["Blog", BLOG],
  ["BlogPost", POST],
];

describe("P96E — Public deep pages are Scan-first", () => {
  it("/what-we-do final CTA points the primary action to /scan", () => {
    expect(WHAT).toMatch(/Operational Friction Scan/i);
    expect(WHAT).toMatch(/to=\{SCAN_PATH\}/);
  });

  it("/system surfaces a Scan → Diagnostic continuity rail", () => {
    expect(SYSTEM).toMatch(/Operational Friction Scan/i);
    expect(SYSTEM).toMatch(/Diagnostic/);
    expect(SYSTEM).toMatch(/to=\{SCAN_PATH\}/);
  });

  it("/why-rgs-is-different leads with the Scan", () => {
    expect(WHY).toMatch(/to=\{SCAN_PATH\}/);
    expect(WHY).toMatch(/SCAN_CTA_LABEL/);
  });

  it("/blog index leads with the Operational Friction Scan", () => {
    expect(BLOG).toMatch(/Operational Friction Scan/i);
    expect(BLOG).toMatch(/to=\{SCAN_PATH\}/);
  });

  it("/blog/:slug includes a Scan rail as the public next step", () => {
    expect(POST).toMatch(/Operational Friction Scan/i);
    expect(POST).toMatch(/to=\{SCAN_PATH\}/);
  });
});

describe("P96E — Diagnostic is positioned as a structured layered process (Scorecard not exposed publicly)", () => {
  it("/diagnostic hero references the Scan, structured operational review, owner interview, and Diagnostic Report", () => {
    expect(DIAG).toMatch(/Operational Friction Scan/);
    expect(DIAG).toMatch(/structured operational review/i);
    expect(DIAG).toMatch(/owner interview/i);
    expect(DIAG).toMatch(/Diagnostic Report/);
    expect(DIAG).toMatch(/Repair Map/);
  });

  it("/diagnostic does not market the Scorecard as a public CTA or product name", () => {
    // Allowed: internal mention is fine, but no public-facing
    // "Scorecard" CTA labels or "FREE Business Stability Scorecard"
    // promotion should remain on this page.
    expect(DIAG).not.toMatch(/Take the FREE Business Stability Scorecard/i);
    expect(DIAG).not.toMatch(/to=\{SCORECARD_PATH\}/);
    expect(DIAG).not.toMatch(/Start the RGS Scorecard/i);
  });
});

describe("P96E — Public surfaces never expose Scorecard as a public CTA", () => {
  it.each(PUBLIC_SURFACES)(
    "%s never routes a public CTA to SCORECARD_PATH",
    (_name, src) => {
      expect(src).not.toMatch(/to=\{SCORECARD_PATH\}/);
    },
  );

  it.each(PUBLIC_SURFACES)(
    "%s never promotes the FREE Business Stability Scorecard publicly",
    (_name, src) => {
      expect(src).not.toMatch(/Take the FREE Business Stability Scorecard/i);
    },
  );

  it.each(PUBLIC_SURFACES)(
    "%s does not regress to scorecard-first 'starting read' framing",
    (_name, src) => {
      expect(src).not.toMatch(/Scorecard gives a starting read/);
      expect(src).not.toMatch(/Scorecard gives a self-reported starting read/);
    },
  );
});

describe("P96E — Scorecard routing boundary", () => {
  it("/scorecard remains a public redirect surface (not a marketing landing page)", () => {
    // Public Scorecard.tsx is a thin redirect/landing — must not host
    // the full scorecard tool UI.
    expect(SCORECARD_PUBLIC).not.toMatch(/scorecard-classify/);
    expect(SCORECARD_PUBLIC).not.toMatch(/scorecard-followup/);
  });

  it("protected internal Scorecard tool is mounted under /diagnostic/scorecard", () => {
    expect(APP).toMatch(/diagnostic\/scorecard/);
    expect(APP).toMatch(/StabilityScorecardTool/);
  });
});
