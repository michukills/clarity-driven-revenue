// P93H-A — Standalone Tool Runner layout polish contract.
// Locks the responsive layout fixes so future edits do not regress
// to fixed-height card stacks, truncated tool names, cramped grids,
// or right-panel clipping.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const src = readFileSync(
  join(process.cwd(), "src/pages/admin/StandaloneToolRunner.tsx"),
  "utf8",
);

describe("P93H-A — Standalone Tool Runner layout polish", () => {
  it("uses a min-width-zero, max-w-6xl outer shell", () => {
    expect(src).toContain("max-w-6xl");
    expect(src).toContain("min-w-0");
    expect(src).not.toContain("max-w-5xl");
  });

  it("split panel is two columns at lg with min-w-0 children and aligned tops", () => {
    expect(src).toContain("lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]");
    expect(src).toContain("items-start");
  });

  it("eligible tools list no longer uses a fixed 28rem max-height", () => {
    expect(src).not.toContain("max-h-[28rem]");
    expect(src).toContain("lg:max-h-[calc(100vh-16rem)]");
  });

  it("tool names wrap instead of truncating, descriptions clamp not overflow", () => {
    expect(src).toMatch(/leading-snug break-words/);
    expect(src).toContain("line-clamp-3");
    // truncate on the tool name was the source of clipped names — keep it gone.
    expect(src).not.toMatch(/font-medium truncate/);
  });

  it("badges do not break mid-word (whitespace-nowrap)", () => {
    const matches = src.match(/whitespace-nowrap/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(3);
  });

  it("tool cards use flex column so the action button aligns at the bottom", () => {
    expect(src).toContain("flex flex-col min-w-0");
    expect(src).toContain("mt-auto pt-3 flex justify-end");
  });

  it("right generator panel is min-w-0 to prevent horizontal overflow", () => {
    expect(src).toMatch(/Generator[\s\S]{0,200}min-w-0/);
  });

  it("eligible tools panel is sticky on lg+ so the right panel stays in view", () => {
    expect(src).toContain("lg:sticky lg:top-4");
  });

  it("does not regress the admin-only access boundary", () => {
    // Page itself does not gate; gating lives in App.tsx route. Confirm
    // the runner still uses the admin PortalShell variant.
    expect(src).toContain('PortalShell variant="admin"');
  });
});

describe("P93H-A — no frontend secrets", () => {
  it("contains no obvious secret-looking strings", () => {
    expect(src).not.toMatch(/sk_live_/);
    expect(src).not.toMatch(/SUPABASE_SERVICE_ROLE/);
  });
});
