import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  resolveStandaloneToolRoute,
  hasStandaloneToolRoute,
} from "@/lib/standaloneToolRoutes";
import { listStandaloneTools } from "@/lib/standaloneToolRunner";

const App = readFileSync(join(process.cwd(), "src/App.tsx"), "utf8");

describe("P90 — standalone tool routes resolve to real, registered admin routes", () => {
  const runnable = listStandaloneTools().filter((t) => t.canRun);

  it("every runnable standalone tool has a route mapping", () => {
    for (const t of runnable) {
      expect(hasStandaloneToolRoute(t.toolKey), `missing route for ${t.toolKey}`).toBe(
        true,
      );
    }
  });

  it("customer-scoped routes require a customerId and produce a registered admin route", () => {
    for (const t of runnable) {
      const noCust = resolveStandaloneToolRoute(t.toolKey, null);
      const withCust = resolveStandaloneToolRoute(t.toolKey, "00000000-0000-0000-0000-000000000001");
      expect(["customer", "admin", "unavailable"]).toContain(withCust.kind);
      if (noCust.kind === "unavailable" && withCust.kind === "customer") {
        const pattern = withCust.href.replace(
          "00000000-0000-0000-0000-000000000001",
          ":customerId",
        );
        expect(App, `route ${pattern} is not registered in App.tsx`).toContain(
          `path="${pattern}"`,
        );
      }
      if (withCust.kind === "admin") {
        expect(App).toContain(`path="${withCust.href}"`);
      }
    }
  });
});

describe("P90 — runner UI exposes Open tool + create customer", () => {
  const src = readFileSync(
    join(process.cwd(), "src/pages/admin/StandaloneToolRunner.tsx"),
    "utf8",
  );
  it("renders an Open tool action per card", () => {
    expect(src).toContain("standalone-open-");
    expect(src).toContain("resolveStandaloneToolRoute");
  });
  it("supports inline standalone customer creation", () => {
    expect(src).toContain("standalone-new-customer-save");
    expect(src).toContain('service_type: "Standalone Deliverable"');
    expect(src).toContain("needs_industry_review: true");
  });
});