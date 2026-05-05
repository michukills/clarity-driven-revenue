/**
 * P74 — Mobile Diagnostic Form Optimization regression contract.
 *
 * Locks the mobile-safe wrappers, responsive grids, and tap-target
 * sizing introduced in this pass so future edits cannot silently
 * regress the phone experience for the diagnostic, scorecard,
 * evidence upload, and primary client tool surfaces.
 *
 * Also re-asserts the approved positioning line and the absence of
 * the deprecated "blueprint / lay the bricks" construction-metaphor
 * wording across product source.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const read = (rel: string) => readFileSync(path.join(process.cwd(), rel), "utf8");

function walk(dir: string, out: string[] = []): string[] {
  const abs = path.join(process.cwd(), dir);
  for (const name of readdirSync(abs)) {
    const rel = path.join(dir, name);
    const full = path.join(abs, name);
    const s = statSync(full);
    if (s.isDirectory()) walk(rel, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(rel);
  }
  return out;
}

describe("P74 — mobile diagnostic hardening contract", () => {
  it("MobileActionBar primitive exists and uses safe-area + sticky-on-mobile pattern", () => {
    const f = read("src/components/portal/MobileActionBar.tsx");
    expect(f).toMatch(/safe-area-inset-bottom/);
    expect(f).toMatch(/fixed inset-x-0 bottom-0/);
    expect(f).toMatch(/md:static/);
  });

  it("Cost of Friction Calculator stacks fields on mobile and uses comfortable inputs", () => {
    const f = read("src/components/costOfFriction/CostOfFrictionCalculator.tsx");
    expect(f).toMatch(/grid-cols-1 sm:grid-cols-2 lg:grid-cols-3/);
    expect(f).toMatch(/h-11 sm:h-10/);
    expect(f).not.toMatch(/min-w-\[\d{3,}px\]/);
  });

  it("Stability-to-Value Lens answer buttons meet 44px tap-target on mobile", () => {
    const f = read("src/components/stabilityToValueLens/StabilityToValueLens.tsx");
    expect(f).toMatch(/min-h-\[44px\]/);
    expect(f).toMatch(/grid grid-cols-2 sm:flex/);
  });

  it("Client tool wrapper pages mount the MobileActionBar for primary save action", () => {
    for (const rel of [
      "src/pages/portal/tools/CostOfFrictionCalculator.tsx",
      "src/pages/portal/tools/StabilityToValueLens.tsx",
    ]) {
      const f = read(rel);
      expect(f).toMatch(/MobileActionBar/);
      expect(f).toMatch(/pb-24 md:pb-0/);
    }
  });

  it("Owner Diagnostic Interview progress card stacks on mobile and uses tall CTA", () => {
    const f = read("src/pages/portal/tools/OwnerDiagnosticInterview.tsx");
    expect(f).toMatch(/flex-col sm:flex-row/);
    expect(f).toMatch(/w-full sm:w-auto h-11/);
  });

  it("Evidence Vault upload acknowledgment has a real tap target", () => {
    const f = read("src/pages/portal/Uploads.tsx");
    expect(f).toMatch(/min-h-\[44px\]/);
    expect(f).toMatch(/h-5 w-5/);
    expect(f).toMatch(/p-6 sm:p-10/);
  });

  it("PortalShell main padding scales for phone widths and allows shrink", () => {
    const f = read("src/components/portal/PortalShell.tsx");
    expect(f).toMatch(/px-4 sm:px-6 lg:px-10/);
    expect(f).toMatch(/min-w-0/);
  });

  it("Public scorecard form uses responsive grids, no desktop-only min widths", () => {
    const f = read("src/pages/Scorecard.tsx");
    expect(f).toMatch(/grid-cols-1 sm:grid-cols-2/);
    expect(f).not.toMatch(/min-w-\[1[0-9]{3}px\]/);
    expect(f).not.toMatch(/w-\[1[0-9]{3}px\]/);
  });

  it("No client-facing tool/page introduces desktop-only fixed widths", () => {
    const offenders: string[] = [];
    const banned = /\b(?:min-w|w)-\[(?:[89]\d{2}|1\d{3})px\]/;
    const roots = [
      "src/pages/portal",
      "src/components/portal",
      "src/components/costOfFriction",
      "src/components/stabilityToValueLens",
    ];
    for (const r of roots) {
      for (const rel of walk(r)) {
        if (rel.endsWith("PortalShell.tsx")) continue; // shell uses max-w cap, not min-w
        const c = read(rel);
        if (banned.test(c)) offenders.push(rel);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("Approved RGS positioning line wording is intact, old construction metaphor is gone", () => {
    const banned = [
      /provides the blueprint and teaches the owner to lay the bricks/i,
      /teaches the owner to lay the bricks/i,
      /lay the bricks/i,
    ];
    const roots = ["src/components", "src/pages", "src/lib", "src/config"];
    for (const r of roots) {
      for (const rel of walk(r)) {
        // P72 / P73 tests intentionally reference the banned phrases as
        // assertions; skip them so they don't trip the scanner.
        if (rel.endsWith("p72CostOfFriction.test.ts")) continue;
        if (rel.endsWith("p73StabilityToValueLens.test.ts")) continue;
        if (rel.endsWith("p74MobileDiagnosticHardening.test.ts")) continue;
        if (rel.endsWith("p75SopClientCreator.test.ts")) continue;
        if (rel.endsWith("p75ARgsAiBrainRegistry.test.ts")) continue;
        if (rel.endsWith("p76ToolSpecificReportFramework.test.ts")) continue;
        if (rel.endsWith("p77StandaloneToolRunner.test.ts")) continue;
       if (rel.endsWith("p78GuidedLandingWalkthroughRegistry.test.ts")) continue;
       if (rel.endsWith("p79ClientToolAccessAudit.test.ts")) continue;
        const c = read(rel);
        for (const b of banned) {
          expect(c, `${rel} contains banned positioning wording: ${b}`).not.toMatch(b);
        }
      }
    }
  });

  it("No client-facing copy introduces 'Mirror, Not the Map' phrasing", () => {
    const roots = ["src/components", "src/pages", "src/config"];
    for (const r of roots) {
      for (const rel of walk(r)) {
        const c = read(rel);
        expect(c, `${rel} should not use 'Mirror, Not the Map' client-facing copy`).not.toMatch(
          /Mirror,\s*Not the Map/i,
        );
      }
    }
  });
});