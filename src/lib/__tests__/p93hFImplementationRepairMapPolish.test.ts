import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const adminRoadmap = readFileSync(
  join(root, "src/pages/admin/ImplementationRoadmapAdmin.tsx"),
  "utf8",
);
const portalRoadmap = readFileSync(
  join(root, "src/pages/portal/tools/ImplementationRoadmap.tsx"),
  "utf8",
);
const adminPat = readFileSync(
  join(root, "src/pages/admin/PriorityActionTrackerAdmin.tsx"),
  "utf8",
);

describe("P93H-F — Implementation/Repair Map admin polish", () => {
  it("admin roadmap uses max-w-6xl shell with min-w-0/break-words", () => {
    expect(adminRoadmap).toMatch(/max-w-6xl/);
    expect(adminRoadmap).toMatch(/min-w-0/);
    expect(adminRoadmap).toMatch(/break-words/);
  });

  it("admin roadmap toolbar wraps responsively", () => {
    expect(adminRoadmap).toMatch(/data-testid="roadmap-item-toolbar"/);
    expect(adminRoadmap).toMatch(/flex flex-wrap gap-2/);
  });

  it("admin roadmap separates client-safe and admin-only blocks", () => {
    expect(adminRoadmap).toMatch(/data-testid="client-safe-block"/);
    expect(adminRoadmap).toMatch(/data-testid="admin-only-block"/);
    expect(adminRoadmap).toMatch(/never shown to the client/i);
  });

  it("admin roadmap surfaces the Control System handoff note", () => {
    expect(adminRoadmap).toMatch(/data-testid="control-system-handoff-note"/);
    expect(adminRoadmap).toMatch(/RGS Control System/);
  });

  it("admin roadmap empty state mentions dependency / sequencing", () => {
    expect(adminRoadmap).toMatch(/Dependency mapping|do-not-do-yet/i);
  });

  it("admin roadmap makes no unsafe revenue/profit/compliance guarantees", () => {
    const banned = [
      /guaranteed (revenue|profit|growth|valuation|compliance)/i,
      /RGS will run (your|the) business/i,
      /done-for-you/i,
    ];
    for (const re of banned) expect(adminRoadmap).not.toMatch(re);
  });

  it("portal roadmap card hardens overflow and keeps Control System handoff", () => {
    expect(portalRoadmap).toMatch(/data-testid="client-roadmap-item"/);
    expect(portalRoadmap).toMatch(/min-w-0/);
    expect(portalRoadmap).toMatch(/break-words/);
    expect(portalRoadmap).toMatch(/data-testid="control-system-handoff-note"/);
  });

  it("portal roadmap does not leak admin-only fields", () => {
    expect(portalRoadmap).not.toMatch(/internal_notes/);
    expect(portalRoadmap).not.toMatch(/admin_priority_note/);
  });

  it("admin priority tracker hardens action toolbar + client/admin separation", () => {
    expect(adminPat).toMatch(/max-w-6xl/);
    expect(adminPat).toMatch(/data-testid="client-safe-block"/);
    expect(adminPat).toMatch(/data-testid="admin-only-block"/);
    expect(adminPat).toMatch(/never shown to the client/i);
    expect(adminPat).toMatch(/flex flex-wrap items-center gap-2 shrink-0/);
  });

  it("no frontend secrets in touched surfaces", () => {
    for (const src of [adminRoadmap, portalRoadmap, adminPat]) {
      expect(src).not.toMatch(/sk_live_/);
      expect(src).not.toMatch(/service_role/);
    }
  });
});