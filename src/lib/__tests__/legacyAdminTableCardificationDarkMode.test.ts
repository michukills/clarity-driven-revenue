import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

/**
 * Legacy Admin Table Cardification + Dark-Mode Contrast Pass.
 * Layout/contract checks only — no business logic changes.
 */
describe("Legacy Admin Table Cardification + Dark-Mode Contrast", () => {
  it("Reports admin provides a mobile card list and desktop table", () => {
    const src = read("src/pages/admin/Reports.tsx");
    // mobile-only card list
    expect(src).toMatch(/md:hidden/);
    // desktop-only table wrapper
    expect(src).toMatch(/hidden md:block/);
    // primary action label is action-oriented, not generic "View"
    expect(src).toMatch(/Open report/);
    // useful empty-state copy (not raw "No data found")
    expect(src).toMatch(/No reports match these filters\./);
    expect(src).not.toMatch(/No data found/i);
  });

  it("Reports admin uses readable foreground for primary table values", () => {
    const src = read("src/pages/admin/Reports.tsx");
    expect(src).toMatch(/text-foreground\/80/);
  });

  it("PendingAccounts admin signup list has mobile card fallback", () => {
    const src = read("src/pages/admin/PendingAccounts.tsx");
    expect(src).toMatch(/md:hidden/);
    expect(src).toMatch(/hidden md:block/);
    // action-oriented link copy
    expect(src).toMatch(/Open client record/);
  });

  it("touched admin pages do not introduce banned/scope-unsafe language", () => {
    const files = [
      "src/pages/admin/Reports.tsx",
      "src/pages/admin/PendingAccounts.tsx",
    ];
    const banned = [
      /trusted by/i,
      /guaranteed (revenue|ROI|results)/i,
      /unlimited (support|consulting|advisory)/i,
      /\bHIPAA\b/i,
      /No data found/i,
      /Coming soon/i,
    ];
    for (const f of files) {
      const t = read(f);
      for (const re of banned) {
        expect(t, `${f} matches ${re}`).not.toMatch(re);
      }
    }
  });
});
