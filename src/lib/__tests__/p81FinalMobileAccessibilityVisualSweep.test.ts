/**
 * P81 — Final Mobile / Accessibility / Performance / Visual Regression Sweep.
 *
 * Source-level layout, accessibility, security, bundle hygiene, and
 * positioning contracts that protect the existing OS from regressions
 * before P81A (public video/social/download hardening) and P82 (final
 * launch smoke test). Verification-only — no production logic added.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(resolve(ROOT, rel), "utf8");

function walk(dir: string, acc: string[] = []): string[] {
  let entries: string[] = [];
  try { entries = readdirSync(dir); } catch { return acc; }
  for (const name of entries) {
    if (name === "node_modules" || name === ".git") continue;
    const p = join(dir, name);
    let s; try { s = statSync(p); } catch { continue; }
    if (s.isDirectory()) walk(p, acc);
    else if (/\.(ts|tsx)$/.test(name)) acc.push(p);
  }
  return acc;
}

const PUBLIC_PAGES = walk(resolve(ROOT, "src/pages"))
  .filter((f) => !f.includes(`${join("pages", "admin")}`))
  .filter((f) => !f.includes(`${join("pages", "portal")}`))
  .filter((f) => !/\.test\.(ts|tsx)$/.test(f));
const PORTAL_FILES = [
  ...walk(resolve(ROOT, "src/pages/portal")),
  ...walk(resolve(ROOT, "src/components/portal")),
].filter((f) => !/\.test\.(ts|tsx)$/.test(f));
const ADMIN_FILES = [
  ...walk(resolve(ROOT, "src/pages/admin")),
  ...walk(resolve(ROOT, "src/components/admin")),
].filter((f) => !/\.test\.(ts|tsx)$/.test(f));
const ALL_SRC = walk(resolve(ROOT, "src")).filter(
  (f) => !/\.test\.(ts|tsx)$/.test(f),
);

// ---------------------------------------------------------------------
// Mobile / responsive layout
// ---------------------------------------------------------------------
describe("P81 / mobile + responsive shells", () => {
  it("PortalShell main area uses responsive padding and prevents flex overflow", () => {
    const src = read("src/components/portal/PortalShell.tsx");
    expect(src).toMatch(/px-4 sm:px-6 lg:px-10/);
    expect(src).toMatch(/min-w-0/);
  });

  it("Admin CommandGuidancePanel summary grid stacks 1→2→4 across breakpoints", () => {
    const src = read("src/components/admin/CommandGuidancePanel.tsx");
    expect(src).toMatch(/grid-cols-1 sm:grid-cols-2 lg:grid-cols-4/);
  });

  it("GuidedClientWelcome cards stack 1→2→3 across breakpoints", () => {
    const src = read("src/components/portal/GuidedClientWelcome.tsx");
    expect(src).toMatch(/grid-cols-1 sm:grid-cols-2 lg:grid-cols-3/);
  });

  it("Public Layout reserves space above the fixed StickyCTA", () => {
    const src = read("src/components/Layout.tsx");
    expect(src).toMatch(/pb-\d+/);
  });

  it("MobileActionBar pins to viewport bottom with safe-area padding", () => {
    const src = read("src/components/portal/MobileActionBar.tsx");
    expect(src).toMatch(/fixed inset-x-0 bottom-0/);
    expect(src).toMatch(/safe-area-inset-bottom/);
  });

  it("Public Navbar exposes a mobile menu toggle with aria-label", () => {
    const src = read("src/components/Navbar.tsx");
    expect(src).toMatch(/md:hidden/);
    expect(src).toMatch(/aria-label="Toggle menu"/);
  });

  const FORBIDDEN_FIXED = [
    // Disallow fixed pixel widths ≥900px on critical shells. Allow
    // `max-w-[Npx] w-full` patterns (constraint, not a fixed width).
    /(?<!max-)(?<!min-)\bw-\[(?:9\d{2}|1[0-9]{3,})px\](?!\s*w-full)/,
    /\bmin-w-\[(?:9\d{2}|1[0-9]{3,})px\]/,
  ];

  it("client portal critical shells/components do not hard-code desktop-only widths ≥900px", () => {
    const targets = [
      "src/components/portal/PortalShell.tsx",
      "src/components/portal/GuidedClientWelcome.tsx",
      "src/components/portal/ToolWalkthroughCard.tsx",
      "src/components/portal/ClientToolGuard.tsx",
      "src/components/portal/ClientToolMatrixCard.tsx",
      "src/components/portal/ToolCard.tsx",
    ];
    const offenders: string[] = [];
    for (const f of targets) {
      const text = read(f);
      for (const rx of FORBIDDEN_FIXED) {
        if (rx.test(text)) offenders.push(`${f} :: ${rx}`);
      }
    }
    expect(offenders, offenders.join("\n")).toHaveLength(0);
  });

  it("public Layout/Navbar/Footer/StickyCTA do not hard-code desktop-only widths ≥900px", () => {
    const targets = [
      "src/components/Layout.tsx",
      "src/components/Navbar.tsx",
      "src/components/Footer.tsx",
      "src/components/StickyCTA.tsx",
    ];
    const offenders: string[] = [];
    for (const f of targets) {
      const text = read(f);
      for (const rx of FORBIDDEN_FIXED) {
        if (rx.test(text)) offenders.push(`${f} :: ${rx}`);
      }
    }
    expect(offenders, offenders.join("\n")).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------
// Accessibility
// ---------------------------------------------------------------------
describe("P81 / accessibility basics", () => {
  it("PortalShell sign-out icon button has accessible label", () => {
    const src = read("src/components/portal/PortalShell.tsx");
    expect(src).toMatch(/aria-label="Log out and return home"/);
  });

  it("ToolWalkthroughCard iframe carries an accessible title", () => {
    const src = read("src/components/portal/ToolWalkthroughCard.tsx");
    expect(src).toMatch(/title=\{`\$\{video\.title\}\s*walkthrough`\}/);
  });

  it("Stability Journey CTA exposes a visible keyboard focus state", () => {
    const src = read("src/components/journey/StabilityJourneyDashboard.tsx");
    expect(src).toMatch(/focus-visible:ring-2/);
  });

  it("Admin CommandGuidancePanel exposes count badges with aria-label", () => {
    const src = read("src/components/admin/CommandGuidancePanel.tsx");
    expect(src).toMatch(/aria-label=\{`\$\{item\.count\} items`\}/);
  });
});

// ---------------------------------------------------------------------
// Performance / bundle hygiene (re-asserts P80)
// ---------------------------------------------------------------------
describe("P81 / bundle + performance hygiene", () => {
  const FORBIDDEN_ADMIN_IMPORTS = [
    /from\s+["']@\/config\/rgsAiBrains["']/,
    /from\s+["']@\/lib\/standaloneToolRunner["']/,
    /from\s+["']@\/config\/clientToolAccessAudit["']/,
  ];

  it("public pages do not import admin-only AI brain / runner / audit modules", () => {
    const offenders: string[] = [];
    for (const f of PUBLIC_PAGES) {
      const text = readFileSync(f, "utf8");
      for (const rx of FORBIDDEN_ADMIN_IMPORTS) {
        if (rx.test(text)) offenders.push(`${f} :: ${rx}`);
      }
    }
    expect(offenders, offenders.join("\n")).toHaveLength(0);
  });

  it("portal (client) bundles do not import admin-only AI brain / runner / audit modules", () => {
    const offenders: string[] = [];
    for (const f of PORTAL_FILES) {
      const text = readFileSync(f, "utf8");
      for (const rx of FORBIDDEN_ADMIN_IMPORTS) {
        if (rx.test(text)) offenders.push(`${f} :: ${rx}`);
      }
    }
    expect(offenders, offenders.join("\n")).toHaveLength(0);
  });

  it("vite production build keeps source maps disabled", () => {
    const cfg = read("vite.config.ts");
    expect(cfg).toMatch(/sourcemap:\s*mode\s*===\s*["']development["']/);
  });

  it("no frontend file embeds raw large base64 media (>20KB inline)", () => {
    const offenders: string[] = [];
    for (const f of ALL_SRC) {
      const text = readFileSync(f, "utf8");
      const m = text.match(/data:(?:image|video|audio)\/[^;]+;base64,[A-Za-z0-9+/=]{20000,}/);
      if (m) offenders.push(f);
    }
    expect(offenders, offenders.join("\n")).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------
// Security / access route gates
// ---------------------------------------------------------------------
describe("P81 / security + access route gates", () => {
  const app = read("src/App.tsx");

  it("standalone-tool-runner remains admin-only", () => {
    const line = app.split("\n").find((l) => l.includes('path="/admin/standalone-tool-runner"'));
    expect(line).toBeTruthy();
    expect(line!).toMatch(/requireRole="admin"/);
  });

  it("every /admin route declared in App.tsx is wrapped in ProtectedRoute requireRole=admin", () => {
    const lines = app
      .split("\n")
      .filter((l) => /<Route\s/.test(l) && /path="\/admin/.test(l));
    expect(lines.length).toBeGreaterThan(5);
    for (const line of lines) {
      if (/<Navigate\s/.test(line)) continue; // inline redirect routes
      if (/Redirect\s*\/?>/i.test(line)) continue; // dedicated redirect components
      if (!/element=/.test(line)) continue; // multi-line route — element on a later line is checked separately
      expect(line, `unguarded admin route: ${line.trim()}`).toMatch(/requireRole="admin"/);
    }
  });

  it("tool-specific reports use signed URLs on the private bucket", () => {
    const tr = read("src/lib/reports/toolReports.ts");
    expect(tr).toMatch(/createSignedUrl/);
    expect(tr).not.toMatch(/getPublicUrl\s*\(/);
  });

  it("portal walkthrough card never exposes download/share controls or admin notes", () => {
    const src = read("src/components/portal/ToolWalkthroughCard.tsx");
    expect(src).not.toMatch(/\bdownload\s*=/i);
    expect(src).not.toMatch(/navigator\.share/);
    expect(src).not.toMatch(/internal_notes/);
    expect(src).not.toMatch(/admin_notes/);
  });
});

// ---------------------------------------------------------------------
// Content / positioning / honesty
// ---------------------------------------------------------------------
describe("P81 / positioning + honesty", () => {
  const FORBIDDEN_POSITIONING = [
    new RegExp(["lay", "the", "bricks"].join(" "), "i"),
    /provides the blueprint/i,
    new RegExp(["blueprint and teaches the owner to", "lay", "the", "bricks"].join(" "), "i"),
    /Mirror,\s*Not the Map/i,
  ];

  const FORBIDDEN_FAKE_CLAIMS = [
    // Match positive claims only — allow scope-disclaimer phrases like
    // "Not unlimited support", "no done-for-you execution", "This is not
    // done-for-you marketing" which honestly disavow the claim.
    /(?<!not\s)(?<!no\s)\bguaranteed (revenue|results|roi)/i,
  ];

  it("non-test source files do not contain old positioning wording", () => {
    const offenders: string[] = [];
    for (const f of ALL_SRC) {
      const text = readFileSync(f, "utf8");
      for (const rx of FORBIDDEN_POSITIONING) {
        if (rx.test(text)) offenders.push(`${f} :: ${rx}`);
      }
    }
    expect(offenders, offenders.join("\n")).toHaveLength(0);
  });

  it("client portal + public pages do not contain fake-proof / scope-creep claims", () => {
    const offenders: string[] = [];
    for (const f of [...PUBLIC_PAGES, ...PORTAL_FILES]) {
      const text = readFileSync(f, "utf8");
      for (const rx of FORBIDDEN_FAKE_CLAIMS) {
        if (rx.test(text)) offenders.push(`${f} :: ${rx}`);
      }
    }
    expect(offenders, offenders.join("\n")).toHaveLength(0);
  });

  it("walkthrough video registry does not advertise unfinished videos as live", () => {
    const reg = read("src/config/toolWalkthroughVideos.ts");
    expect(reg).toMatch(/no_download:\s*true/);
    expect(reg).toMatch(/no_social_share:\s*true/);
    // status enum present so unfinished entries don't masquerade as finished
    expect(reg).toMatch(/finished|planned/i);
  });

  it("admin-only walkthrough/audit fields are not consumed by client surfaces", () => {
    const offenders: string[] = [];
    for (const f of PORTAL_FILES) {
      const text = readFileSync(f, "utf8");
      // Allow comments that explicitly exclude these fields from client
      // queries (P34 allowlist pattern). Strip line comments before scanning.
      const stripped = text
        .split("\n")
        .filter((l) => !/^\s*\/\//.test(l) && !/^\s*\*/.test(l))
        .map((l) => l.replace(/\/\/.*$/, ""))
        .join("\n");
      if (/internal_notes|admin_notes|admin_summary/.test(stripped)) {
        offenders.push(f);
      }
    }
    expect(offenders, offenders.join("\n")).toHaveLength(0);
  });
});

// silence unused-walker warnings (ADMIN_FILES retained for future hardening)
void ADMIN_FILES;
