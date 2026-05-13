import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SCORECARD_PATH, SCORECARD_CTA_LABEL } from "@/lib/cta";

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
  it("homepage primary CTA points to the scorecard with the 0–1000 label", () => {
    const code = read("src/pages/Index.tsx");
    expect(code).toMatch(/SCORECARD_PATH/);
    expect(code).toMatch(/SCORECARD_CTA_LABEL/);
    expect(SCORECARD_PATH).toBe("/scorecard");
    expect(SCORECARD_CTA_LABEL).toMatch(/0[–-]1000/);
  });

  it("Navbar links the public Scorecard route", () => {
    const code = read("src/components/Navbar.tsx");
    expect(code).toMatch(/path:\s*["']\/scorecard["']/);
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
    "/scorecard",
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
  it("StickyCTA suppresses itself on /scorecard and /start", () => {
    const code = read("src/components/StickyCTA.tsx");
    expect(code).toMatch(/pathname\s*===\s*["']\/scorecard["']/);
    expect(code).toMatch(/pathname\.startsWith\(["']\/scorecard\/["']\)/);
    expect(code).toMatch(/pathname\s*===\s*["']\/start["']/);
  });
});

describe("Public scorecard smoke — surface is independent and AI-free", () => {
  it("Scorecard page does not import admin-only intelligence/portal modules", () => {
    const code = read("src/pages/Scorecard.tsx");
    expect(code).not.toMatch(/from\s+["']@\/components\/admin\//);
    expect(code).not.toMatch(/from\s+["']@\/components\/portal\//);
    expect(code).not.toMatch(/from\s+["']@\/components\/intelligence\//);
    expect(code).not.toMatch(/AdminLeakIntelligencePanel|CustomerLeakIntelligencePanel/);
  });

  it("Scorecard page invokes only the non-AI follow-up dispatcher in the public path", () => {
    const code = read("src/pages/Scorecard.tsx");
    const invokedFunctions = Array.from(
      code.matchAll(/functions\s*\.\s*invoke\(\s*["']([^"']+)["']/g),
    ).map((m) => m[1]);
    expect(invokedFunctions).toEqual(["scorecard-followup"]);
    expect(code).not.toMatch(/openai|anthropic|gemini|lovable.*ai/i);
  });

  it("Scorecard submission persists the deterministic rubric snapshot", () => {
    const code = read("src/pages/Scorecard.tsx");
    // Lock the launch-critical persisted fields in place.
    for (const field of [
      "rubric_version",
      "pillar_results",
      "overall_score_estimate",
      "overall_band",
      "overall_confidence",
      "missing_information",
      "recommended_focus",
      "top_gaps",
    ]) {
      expect(code).toMatch(new RegExp(`${field}\\s*:`));
    }
    expect(code).toMatch(/from\(["']scorecard_runs["']\)/);
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
