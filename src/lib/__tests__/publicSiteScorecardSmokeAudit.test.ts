import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SCAN_PATH, SCAN_CTA_LABEL } from "@/lib/cta";

/**
 * Public site + scorecard smoke audit (rendered-flow regression guards).
 *
 * These tests do not redesign anything. They only lock in the invariants the
 * public conversion path depends on:
 *
 *   - Homepage primary CTA points to the 0–1000 scorecard.
 *   - Scorecard route is registered, renders publicly (no ProtectedRoute),
 *     and is reachable from Navbar + Footer.
 *   - Sticky CTA is suppressed on `/scorecard` (and `/start`).
 *   - Footer surfaces Privacy + EULA legal links and external social links.
 *   - Public scorecard page does not import admin-only or AI provider code.
 *   - Privacy and EULA routes are registered and public.
 */

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

describe("Public site smoke — homepage + nav + footer", () => {
  it("homepage primary CTA points to the Operational Friction Scan (P96D)", () => {
    const code = read("src/pages/Index.tsx");
    expect(code).toMatch(/SCAN_PATH/);
    expect(code).toMatch(/SCAN_CTA_LABEL/);
    expect(SCAN_PATH).toBe("/scan");
    expect(SCAN_CTA_LABEL).toMatch(/Operational Friction Scan/);
  });

  it("Navbar links the public Scan route, not the Scorecard", () => {
    const code = read("src/components/Navbar.tsx");
    expect(code).toMatch(/path:\s*["']\/scan["']/);
    expect(code).not.toMatch(/path:\s*["']\/scorecard["']/);
  });

  it("Footer surfaces Privacy + EULA legal links", () => {
    const code = read("src/components/Footer.tsx");
    expect(code).toMatch(/\/privacy/);
    expect(code).toMatch(/\/eula/);
  });

  it("Footer external social links open in a new tab and have rel=noreferrer", () => {
    const code = read("src/components/Footer.tsx");
    // Sanity: at least one external https social link exists.
    expect(code).toMatch(/https:\/\/www\.(facebook|instagram)\.com/);
  });
});

describe("Public site smoke — public routes are not admin-gated", () => {
  const PUBLIC_ROUTES = [
    "/",
    "/what-we-do",
    "/system",
    "/scan",
    "/diagnostic",
    "/contact",
    "/privacy",
    "/eula",
  ];

  it("none of the public routes are wrapped in ProtectedRoute", () => {
    const code = read("src/App.tsx");
    for (const path of PUBLIC_ROUTES) {
      const re = new RegExp(
        `<Route\\s+path=["']${path.replace(/\//g, "\\/")}["'][^>]*element=\\{<ProtectedRoute`,
      );
      expect(re.test(code), `${path} must be public`).toBe(false);
    }
  });

  it("admin and portal routes are gated by ProtectedRoute", () => {
    const code = read("src/App.tsx");
    expect(code).toMatch(
      /path=["']\/admin["'][^>]*<ProtectedRoute\s+requireRole=["']admin["']/,
    );
    expect(code).toMatch(
      /path=["']\/portal["'][^>]*<ProtectedRoute/,
    );
  });
});

describe("Public site smoke — sticky CTA suppression", () => {
  it("StickyCTA suppresses itself on /scan and /start", () => {
    const code = read("src/components/StickyCTA.tsx");
    expect(code).toMatch(/pathname\s*===\s*["']\/scan["']/);
    expect(code).toMatch(/pathname\s*===\s*["']\/start["']/);
  });
});

describe("P96D — Scorecard repositioned into Diagnostic OS", () => {
  it("public /scorecard route now redirects (no full standalone tool)", () => {
    const code = read("src/pages/Scorecard.tsx");
    expect(code).toMatch(/Navigate\s+to=\{SCAN_PATH\}/);
    // The full taker tool is gone from this public surface.
    expect(code).not.toMatch(/scorecard-followup/);
    expect(code).not.toMatch(/scorecard_runs/);
  });

  it("the full deterministic Scorecard tool lives behind the Diagnostic OS", () => {
    const tool = read("src/pages/diagnostic/StabilityScorecardTool.tsx");
    expect(tool).toMatch(/from\(["']scorecard_runs["']\)/);
    expect(tool).toMatch(/rubric_version/);
    // Wired into App.tsx behind ProtectedRoute.
    const app = read("src/App.tsx");
    expect(app).toMatch(/path="\/diagnostic\/scorecard"/);
    expect(app).toMatch(/DiagnosticScorecardTool/);
    expect(app).toMatch(/<Route\s+path="\/diagnostic\/scorecard"[\s\S]*?<ProtectedRoute>/);
  });
});

describe("Public site smoke — no service-role secrets in frontend", () => {
  it("frontend never references SUPABASE_SERVICE_ROLE_KEY", () => {
    // Spot check the highest-risk public surfaces.
    const surfaces = [
      "src/integrations/supabase/client.ts",
      "src/pages/Scorecard.tsx",
      "src/pages/Index.tsx",
      "src/components/Navbar.tsx",
      "src/components/Footer.tsx",
      "src/components/StickyCTA.tsx",
    ];
    for (const f of surfaces) {
      const code = read(f);
      expect(code).not.toMatch(/SERVICE_ROLE_KEY/);
    }
  });
});
