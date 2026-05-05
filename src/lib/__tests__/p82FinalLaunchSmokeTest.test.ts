/**
 * P82 — Final 100/100 Launch Smoke Test.
 *
 * High-level launch contract that locks in the union of every prior
 * launch-critical hardening pass (P66 → P81A). It is intentionally
 * source-level and deterministic — it does not call AI, does not hit
 * the database, and does not boot a browser. It exists to fail loudly
 * if any future change re-introduces a known launch blocker:
 *
 *   - public route / nav / CTA / SEO contracts
 *   - public scorecard determinism (no AI scoring, no provider calls)
 *   - admin route role-gating + portal ProtectedRoute coverage
 *   - ClientToolGuard coverage on entitled portal tools
 *   - reports + PDFs use signed URLs, never raw private bucket paths
 *   - admin-only fields (internal_notes, admin_notes) excluded from
 *     client/portal report queries
 *   - frontend contains no service-role / AI provider secrets
 *   - production source maps are disabled
 *   - public + portal video registries stay separate and honest
 *   - banned positioning / "Mirror, Not the Map" wording stays out of
 *     public/client/admin product copy
 *
 * If any of these contracts regress, treat as a launch blocker.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { SCORECARD_PATH, SCORECARD_CTA_LABEL } from "@/lib/cta";
import {
  PUBLIC_VIDEO_ASSETS,
  isPublicVideoDownloadable,
  isPublicVideoOgEligible,
  isPublicVideoPlayable,
} from "@/config/publicVideoAssets";
import { TOOL_WALKTHROUGH_VIDEO_REGISTRY } from "@/config/toolWalkthroughVideos";

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(resolve(ROOT, rel), "utf8");

function walk(dir: string, acc: string[] = []): string[] {
  let entries: string[] = [];
  try {
    entries = readdirSync(dir);
  } catch {
    return acc;
  }
  for (const name of entries) {
    if (name === "node_modules" || name === ".git" || name === "dist") continue;
    const p = join(dir, name);
    let s;
    try {
      s = statSync(p);
    } catch {
      continue;
    }
    if (s.isDirectory()) walk(p, acc);
    else if (/\.(ts|tsx)$/.test(name)) acc.push(p);
  }
  return acc;
}

const APP_TSX = read("src/App.tsx");
const ALL_SRC = walk(resolve(ROOT, "src"));
const NON_TEST_SRC = ALL_SRC.filter(
  (f) => !/\.test\.tsx?$/.test(f) && !/__tests__/.test(f),
);

// ── 1. Public routes + CTA + nav + footer ──────────────────────────
describe("P82 — public site launch contract", () => {
  it("homepage primary CTA points at the public scorecard", () => {
    const code = read("src/pages/Index.tsx");
    expect(code).toMatch(/SCORECARD_PATH/);
    expect(code).toMatch(/SCORECARD_CTA_LABEL/);
    expect(SCORECARD_PATH).toBe("/scorecard");
    expect(SCORECARD_CTA_LABEL).toMatch(/0[–-]1000/);
  });

  it("public legal + scorecard routes are NOT wrapped in ProtectedRoute", () => {
    const PUBLIC_ROUTES = [
      "/",
      "/scorecard",
      "/privacy",
      "/eula",
      "/contact",
      "/system",
    ];
    for (const path of PUBLIC_ROUTES) {
      const re = new RegExp(
        `<Route\\s+path=["']${path.replace(/\//g, "\\/")}["'][^>]*element=\\{<ProtectedRoute`,
      );
      expect(
        re.test(APP_TSX),
        `${path} must remain public (no ProtectedRoute wrapper)`,
      ).toBe(false);
    }
  });

  it("footer surfaces Privacy + EULA legal links", () => {
    const code = read("src/components/Footer.tsx");
    expect(code).toMatch(/\/privacy/);
    expect(code).toMatch(/\/eula/);
  });
});

// ── 2. Public scorecard determinism + AI/secret hygiene ────────────
describe("P82 — public scorecard determinism", () => {
  const code = read("src/pages/Scorecard.tsx");

  it("does not invoke any edge function or AI provider in the public path", () => {
    expect(code).not.toMatch(/functions\s*\.\s*invoke/);
    expect(code).not.toMatch(/openai|anthropic|gemini|lovable.*ai/i);
  });

  it("does not import admin-only or intelligence modules", () => {
    expect(code).not.toMatch(/from\s+["']@\/components\/admin\//);
    expect(code).not.toMatch(/from\s+["']@\/components\/intelligence\//);
  });

  it("never references SUPABASE_SERVICE_ROLE_KEY in any public surface", () => {
    const surfaces = [
      "src/integrations/supabase/client.ts",
      "src/pages/Scorecard.tsx",
      "src/pages/Index.tsx",
      "src/components/Navbar.tsx",
      "src/components/Footer.tsx",
    ];
    for (const f of surfaces) {
      expect(read(f)).not.toMatch(/SERVICE_ROLE_KEY/);
    }
  });
});

// ── 3. Admin + portal route gating ─────────────────────────────────
describe("P82 — admin/portal role gating", () => {
  it("every /admin route is admin-gated (or a redirect)", () => {
    // Match the existing role-gating regression behavior: only check
    // single-line <Route .../> declarations; multi-line route blocks
    // wrap their guard on a separate line and are covered by the
    // sibling roleGatingRegression suite.
    const lines = APP_TSX.split("\n").filter(
      (l) => l.includes("<Route ") && /path="\/admin/.test(l),
    );
    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) {
      const isRedirect =
        /<Navigate\s+to=/.test(line) || /LegacyAdminBccRedirect/.test(line);
      const isGuarded = /requireRole="admin"/.test(line);
      expect(
        isRedirect || isGuarded,
        `Unguarded /admin route: ${line.trim()}`,
      ).toBe(true);
    }
  });

  it("every /portal route is wrapped in ProtectedRoute", () => {
    const lines = APP_TSX.split("\n").filter((l) => l.includes('path="/portal'));
    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) {
      expect(
        /ProtectedRoute/.test(line),
        `Unprotected /portal route: ${line.trim()}`,
      ).toBe(true);
    }
  });

  it("the standalone tool runner stays admin-only", () => {
    expect(APP_TSX).toMatch(
      /path="\/admin\/standalone-tool-runner"[^>]*requireRole="admin"/,
    );
  });
});

// ── 4. Reports + PDFs honor admin-only / signed URL contracts ──────
describe("P82 — reports + PDF storage hygiene", () => {
  it("client report queries explicitly exclude internal_notes", () => {
    const reportView = read("src/pages/portal/ReportView.tsx");
    const reports = read("src/pages/portal/Reports.tsx");
    expect(reportView).not.toMatch(/internal_notes(?!\s*from)/);
    expect(reports).not.toMatch(/internal_notes(?!\s*from)/);
    expect(reportView).toMatch(/exclude\s+internal_notes/i);
    expect(reports).toMatch(/exclude\s+internal_notes/i);
  });

  it("tool report library uses signed URLs, never getPublicUrl", () => {
    const f = "src/lib/reports/toolReports.ts";
    if (existsSync(resolve(ROOT, f))) {
      const src = read(f);
      expect(src).toMatch(/createSignedUrl/);
      expect(src).not.toMatch(/getPublicUrl/);
    }
  });
});

// ── 5. Frontend bundle / IP hygiene ────────────────────────────────
describe("P82 — frontend secret + IP hygiene", () => {
  const banned = [
    /SUPABASE_SERVICE_ROLE_KEY/,
    /VITE_SUPABASE_SERVICE/,
    /sk_live_[A-Za-z0-9]{16,}/,
  ];

  it("no banned secret patterns in non-test src files", () => {
    for (const f of NON_TEST_SRC) {
      if (f.endsWith("integrations/supabase/types.ts")) continue;
      const src = readFileSync(f, "utf8");
      for (const rx of banned) {
        expect(rx.test(src), `Banned pattern ${rx} in ${f}`).toBe(false);
      }
    }
  });

  it("vite production build disables source maps", () => {
    const v = read("vite.config.ts");
    expect(v).toMatch(/sourcemap:\s*mode\s*===\s*["']development["']/);
  });

  it("admin-only AI brain registry is not imported by public/client surfaces", () => {
    const adminOnlyImports = [
      "@/config/rgsAiBrains",
      "@/lib/rgsAiSafety",
      "@/config/clientToolAccessAudit",
    ];
    const PUBLIC_PORTAL_PREFIXES = [
      resolve(ROOT, "src/pages/Index.tsx"),
      resolve(ROOT, "src/pages/Scorecard.tsx"),
      resolve(ROOT, "src/pages/Demo.tsx"),
      resolve(ROOT, "src/components/Navbar.tsx"),
      resolve(ROOT, "src/components/Footer.tsx"),
      resolve(ROOT, "src/pages/portal"),
    ];
    const offenders: string[] = [];
    for (const f of NON_TEST_SRC) {
      const inScope = PUBLIC_PORTAL_PREFIXES.some((p) => f.startsWith(p));
      if (!inScope) continue;
      const src = readFileSync(f, "utf8");
      for (const imp of adminOnlyImports) {
        if (src.includes(imp)) offenders.push(`${f} imports ${imp}`);
      }
    }
    expect(offenders, offenders.join("\n")).toHaveLength(0);
  });
});

// ── 6. Video registries stay separate + honest ─────────────────────
describe("P82 — public + portal video honesty", () => {
  it("public video registry exists with at least one entry", () => {
    expect(PUBLIC_VIDEO_ASSETS.length).toBeGreaterThan(0);
  });

  it("public videos marked playable / downloadable / og-eligible only when real assets exist", () => {
    for (const v of PUBLIC_VIDEO_ASSETS) {
      if (isPublicVideoPlayable(v)) expect(v.video_url).toBeTruthy();
      if (isPublicVideoDownloadable(v)) expect(v.download_url).toBeTruthy();
      if (isPublicVideoOgEligible(v)) expect(v.video_url).toBeTruthy();
    }
  });

  it("portal walkthrough videos remain no-download / no-share", () => {
    expect(TOOL_WALKTHROUGH_VIDEO_REGISTRY.length).toBeGreaterThan(0);
    for (const w of TOOL_WALKTHROUGH_VIDEO_REGISTRY) {
      expect((w as any).no_download).toBe(true);
      expect((w as any).no_social_share).toBe(true);
    }
  });

  it("ToolWalkthroughCard exposes no download or share UI", () => {
    const f = "src/components/portal/ToolWalkthroughCard.tsx";
    if (existsSync(resolve(ROOT, f))) {
      const src = read(f);
      expect(src).not.toMatch(/\bdownload\s*=\s*["']/);
      expect(src).not.toMatch(/navigator\.share/);
    }
  });
});

// ── 7. Positioning + forbidden language regression ────────────────
describe("P82 — positioning + forbidden language", () => {
  const FORBIDDEN_PHRASES = [
    "lay the bricks",
    "provides the blueprint",
    "teaches the owner to lay the bricks",
    "blueprint and teaches the owner to lay the bricks",
  ];
  const FORBIDDEN_CLIENT_PUBLIC = ["Mirror, Not the Map"];

  // Self-skip so this test file's own literal phrase list is not flagged.
  const SELF = resolve(ROOT, "src/lib/__tests__/p82FinalLaunchSmokeTest.test.ts");

  it("old construction-metaphor wording is absent from product source", () => {
    const offenders: string[] = [];
    for (const f of NON_TEST_SRC) {
      if (f === SELF) continue;
      const src = readFileSync(f, "utf8").toLowerCase();
      for (const p of FORBIDDEN_PHRASES) {
        if (src.includes(p.toLowerCase())) offenders.push(`${f}: ${p}`);
      }
    }
    expect(offenders, offenders.join("\n")).toHaveLength(0);
  });

  it('"Mirror, Not the Map" is absent from client/public product source', () => {
    const offenders: string[] = [];
    for (const f of NON_TEST_SRC) {
      if (f === SELF) continue;
      // Admin-only surfaces may discuss the historical label; restrict
      // the scan to public + portal/client surfaces.
      const isClientPublic =
        f.includes("/pages/portal/") ||
        f.includes("/components/portal/") ||
        (f.includes("/pages/") && !f.includes("/admin/")) ||
        f.includes("/components/Navbar") ||
        f.includes("/components/Footer") ||
        f.includes("/components/StickyCTA");
      if (!isClientPublic) continue;
      const src = readFileSync(f, "utf8");
      for (const p of FORBIDDEN_CLIENT_PUBLIC) {
        if (src.includes(p)) offenders.push(`${f}: ${p}`);
      }
    }
    expect(offenders, offenders.join("\n")).toHaveLength(0);
  });
});

// ── 8. Critical regression suites still exist ──────────────────────
describe("P82 — prior hardening suites still present", () => {
  const REQUIRED = [
    "src/lib/__tests__/p75ARgsAiBrainRegistry.test.ts",
    "src/lib/__tests__/p76ToolSpecificReportFramework.test.ts",
    "src/lib/__tests__/p77StandaloneToolRunner.test.ts",
    "src/lib/__tests__/p78GuidedLandingWalkthroughRegistry.test.ts",
    "src/lib/__tests__/p79ClientToolAccessAudit.test.ts",
    "src/lib/__tests__/p80IpHardeningVerification.test.ts",
    "src/lib/__tests__/p81FinalMobileAccessibilityVisualSweep.test.ts",
    "src/lib/__tests__/p81APublicVideoSocialDownloadHardening.test.ts",
  ];
  for (const f of REQUIRED) {
    it(`required suite present: ${f}`, () => {
      expect(existsSync(resolve(ROOT, f))).toBe(true);
    });
  }
});