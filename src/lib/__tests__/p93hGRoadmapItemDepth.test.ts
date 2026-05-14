import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  getRoadmapItemDepthContext,
} from "@/lib/implementation/depthEngine";

const root = process.cwd();
const component = readFileSync(
  join(root, "src/components/admin/RoadmapItemDepthSections.tsx"),
  "utf8",
);
const adminPage = readFileSync(
  join(root, "src/pages/admin/ImplementationRoadmapAdmin.tsx"),
  "utf8",
);
const portalPage = readFileSync(
  join(root, "src/pages/portal/tools/ImplementationRoadmap.tsx"),
  "utf8",
);

describe("P93H-G — Implementation Roadmap E2F depth visibility", () => {
  it("admin page renders RoadmapItemDepthSections in admin variant", () => {
    expect(adminPage).toMatch(/RoadmapItemDepthSections/);
    expect(adminPage).toMatch(/variant="admin"/);
  });

  it("portal page renders RoadmapItemDepthSections in client variant", () => {
    expect(portalPage).toMatch(/RoadmapItemDepthSections/);
    expect(portalPage).toMatch(/variant="client"/);
  });

  it("depth context resolves dependency / unblocks / do-not-do-yet for known industry+gear", () => {
    const ctx = getRoadmapItemDepthContext("trades_home_services", "operational_efficiency");
    expect(ctx).not.toBeNull();
    expect(ctx!.step.do_not_do_yet.length).toBeGreaterThan(0);
    expect(Array.isArray(ctx!.step.unblocks)).toBe(true);
    expect(ctx!.cell.evidence_prompts.length).toBeGreaterThan(0);
    expect(Array.isArray(ctx!.prerequisite_titles)).toBe(true);
  });

  it("depth context returns null for missing industry or gear (honest empty state)", () => {
    expect(getRoadmapItemDepthContext(null, "operational_efficiency" as any)).toBeNull();
    expect(getRoadmapItemDepthContext("trades_home_services", null)).toBeNull();
  });

  it("admin variant exposes dependency / unblocks / do-not-do-yet / first-actions / leading-indicators / control-system blocks", () => {
    expect(component).toMatch(/testId="admin-dependency-map"/);
    expect(component).toMatch(/testId="admin-unblocks"/);
    expect(component).toMatch(/testId="admin-do-not-do-yet"/);
    expect(component).toMatch(/testId="admin-first-actions"/);
    expect(component).toMatch(/testId="admin-evidence-required"/);
    expect(component).toMatch(/testId="admin-leading-indicators"/);
    expect(component).toMatch(/data-testid="admin-control-system-monitoring"/);
  });

  it("admin variant keeps admin-only sequencing notes visually segregated and labeled", () => {
    expect(component).toMatch(/data-testid="admin-only-sequencing-note"/);
    expect(component).toMatch(/never shown to the client/i);
    expect(component).toMatch(/border-amber-500\/30/);
  });

  it("client variant exposes only client-safe sections and a Control System handoff", () => {
    expect(component).toMatch(/data-testid="client-roadmap-item-depth"/);
    expect(component).toMatch(/testId="client-first-actions"/);
    expect(component).toMatch(/testId="client-evidence-needed"/);
    expect(component).toMatch(/testId="client-unblocks"/);
    expect(component).toMatch(/testId="client-do-not-do-yet"/);
    expect(component).toMatch(/data-testid="client-control-system-handoff"/);
  });

  it("client variant never references admin-only sequencing note testid path inside its render branch", () => {
    // Cheap structural check: ensure the client branch returns before the admin Collapsible.
    const clientIdx = component.indexOf('data-testid="client-roadmap-item-depth"');
    const adminIdx = component.indexOf('data-testid="admin-only-sequencing-note"');
    expect(clientIdx).toBeGreaterThan(0);
    expect(adminIdx).toBeGreaterThan(clientIdx);
  });

  it("renders honest empty states when industry/gear are missing", () => {
    expect(component).toMatch(/"roadmap-item-depth-empty-admin"/);
    expect(component).toMatch(/"roadmap-item-depth-empty-client"/);
    expect(component).toMatch(/Dependency mapping will appear after this roadmap item is generated/);
    expect(component).toMatch(/Do-not-do-yet guidance/);
  });

  it("preserves Implementation vs Control System distinction in copy", () => {
    expect(component).toMatch(/installs the operating structure; the Control System monitors it\./);
    expect(component).toMatch(/RGS Control System.{0,4}/);
    expect(component).not.toMatch(/RGS will run (your|the) business/i);
    expect(component).not.toMatch(/unlimited support/i);
  });

  it("forbids unsafe revenue/profit/compliance/valuation/cannabis-compliance guarantees", () => {
    const banned = [
      /\bguaranteed (revenue|profit|growth|valuation|compliance)\b/i,
      /\bguarantees (revenue|profit|growth|valuation|compliance)\b/i,
      /done-for-you/i,
      /regulatory safe harbor/i,
      /audit certification/i,
      /cannabis compliance certification/i,
    ];
    for (const re of banned) expect(component).not.toMatch(re);
    expect(component).toMatch(/documentation visibility only/i);
  });

  it("uses overflow-safe layout primitives", () => {
    expect(component).toMatch(/min-w-0/);
    expect(component).toMatch(/break-words/);
    expect(component).toMatch(/flex-wrap/);
  });

  it("no frontend secrets in touched files", () => {
    for (const src of [component, adminPage, portalPage]) {
      expect(src).not.toMatch(/sk_live_/);
      expect(src).not.toMatch(/service_role/);
    }
  });

  it("client variant returns nothing when clientVisible is false (defensive)", () => {
    expect(component).toMatch(/clientVisible === false/);
    expect(component).toMatch(/return null/);
  });
});