import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const read = (rel: string) =>
  readFileSync(path.join(process.cwd(), rel), "utf8");

describe("P45 — mobile / accessibility / visual regression contract", () => {
  const journeyDashboard = read(
    "src/components/journey/StabilityJourneyDashboard.tsx",
  );

  it("Stability Journey gear cards do not use hard-coded pixel heights that would clip content", () => {
    // Hard-coded h-[NNNpx] inside the GearCard wrapper would clip long gear
    // names or evidence summaries on narrow viewports.
    expect(journeyDashboard).not.toMatch(/GearCard[\s\S]*?h-\[\d{2,}px\]/);
  });

  it("Stability Journey gear cards equalize height inside the responsive grid", () => {
    // Cards in the auto-fit grid must use h-full + flex flex-col so neighbours
    // line up cleanly at every breakpoint.
    expect(journeyDashboard).toMatch(/h-full[^"']*flex[^"']*flex-col/);
  });

  it("Recommended Next Move CTA exposes a visible keyboard focus state", () => {
    expect(journeyDashboard).toMatch(/focus-visible:ring-2/);
    expect(journeyDashboard).toMatch(/focus-visible:ring-primary/);
  });

  it("Stability Journey copy does not reintroduce banned scope-creep wording", () => {
    const banned = [
      /quarterly/i,
      /upgrade anytime/i,
      /use anytime/i,
      /unlimited support/i,
      /guaranteed results/i,
      /diagnostic \+ ongoing/i,
      /ask rgs if/i,
      /done[- ]for[- ]you/i,
    ];
    for (const pattern of banned) {
      expect(journeyDashboard).not.toMatch(pattern);
    }
  });

  it("Stability Journey responsive grid keeps a sensible minmax floor", () => {
    // Cards should collapse cleanly on mobile via auto-fit/minmax, not via a
    // brittle fixed column count.
    expect(journeyDashboard).toMatch(
      /repeat\(auto-fit,\s*minmax\(\s*2[26]0px\s*,\s*1fr\s*\)\)/,
    );
  });
});