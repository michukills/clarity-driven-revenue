import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");

/**
 * Strict UI View Hardening + Responsive Layout System Pass.
 *
 * Guards the responsive/overflow improvements applied to the highest-traffic
 * shells and dashboard surfaces. These are layout/contract checks only — they
 * do not assert specific visual styling and do not change business logic.
 */
describe("Strict UI View Hardening pass", () => {
  it("PortalShell main area uses responsive padding and prevents overflow", () => {
    const src = read("src/components/portal/PortalShell.tsx");
    expect(src).toMatch(/px-4 sm:px-6 lg:px-10/);
    expect(src).toMatch(/min-w-0/);
  });

  it("Admin CommandGuidancePanel summary grid stacks on mobile", () => {
    const src = read("src/components/admin/CommandGuidancePanel.tsx");
    expect(src).toMatch(/grid-cols-1 sm:grid-cols-2 lg:grid-cols-4/);
    // overflow guard on the panel container
    expect(src).toMatch(/overflow-hidden/);
  });

  it("Client GuidedClientWelcome cards collapse cleanly on mobile/tablet", () => {
    const src = read("src/components/portal/GuidedClientWelcome.tsx");
    expect(src).toMatch(/grid-cols-1 sm:grid-cols-2 lg:grid-cols-3/);
    expect(src).toMatch(/min-w-0/);
  });

  it("touched files do not reintroduce fake-proof or guaranteed-results language", () => {
    const files = [
      "src/components/portal/PortalShell.tsx",
      "src/components/admin/CommandGuidancePanel.tsx",
      "src/components/portal/GuidedClientWelcome.tsx",
    ];
    const banned = [
      /trusted by/i,
      /guaranteed (revenue|ROI|results)/i,
      /unlimited (support|consulting|advisory)/i,
      /done[- ]for[- ]you/i,
      /\bHIPAA\b/i,
    ];
    for (const f of files) {
      const t = read(f);
      for (const re of banned) {
        expect(t, `${f} matches banned ${re}`).not.toMatch(re);
      }
    }
  });
});