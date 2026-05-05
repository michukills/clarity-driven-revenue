/**
 * P80 — IP Hardening + Code/OS Protection Verification Pass.
 *
 * Builds on IP-H1 (`ipH1OsProtectionVerification.test.ts`). P80 verifies
 * that the proprietary surfaces added by P75A–P79 (RGS AI Brain Registry,
 * RGS AI Safety scanner, P76 Tool-Specific Report Framework, P77
 * Standalone Tool Runner, P78 Tool Walkthrough Video Registry, P79
 * Client-Facing Tool Access Audit) do not leak proprietary RGS OS
 * internals into:
 *
 *   - public route bundles
 *   - portal (client) bundles
 *   - frontend secret/prompt surfaces
 *   - downloadable PDF/report assets via raw public URLs
 *   - admin-only AI brain configuration
 *   - admin-only walkthrough/audit registries
 *
 * No production logic is changed. P80 is verification-only and is
 * intentionally additive to IP-H1, IB-H6, and the existing role/tenant
 * security suites.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { CLIENT_TOOL_ACCESS_AUDIT } from "@/config/clientToolAccessAudit";

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

const SRC_FILES = walk(resolve(ROOT, "src")).filter(
  (f) => !/\.test\.(ts|tsx)$/.test(f),
);
const PUBLIC_PAGES = walk(resolve(ROOT, "src/pages"))
  .filter((f) => !f.includes(`${join("pages", "admin")}`))
  .filter((f) => !f.includes(`${join("pages", "portal")}`))
  .filter((f) => !/\.test\.(ts|tsx)$/.test(f));
const PORTAL_FILES = [
  ...walk(resolve(ROOT, "src/pages/portal")),
  ...walk(resolve(ROOT, "src/components/portal")),
].filter((f) => !/\.test\.(ts|tsx)$/.test(f));

// ---------------------------------------------------------------------
// 1 — RGS AI Brain Registry (P75A) is admin/system-only
// ---------------------------------------------------------------------
describe("P80 / RGS AI brain registry exposure", () => {
  const FORBIDDEN_AI_INTERNALS = [
    /from\s+["']@\/config\/rgsAiBrains["']/,
    /from\s+["']@\/lib\/rgsAiSafety["']/,
    /from\s+["']@\/lib\/standaloneToolRunner["']/,
    /from\s+["']@\/config\/clientToolAccessAudit["']/,
  ];

  it("public pages never import the AI brain registry, AI safety scanner, standalone runner, or access audit", () => {
    const offenders: string[] = [];
    for (const f of PUBLIC_PAGES) {
      const text = readFileSync(f, "utf8");
      for (const rx of FORBIDDEN_AI_INTERNALS) {
        if (rx.test(text)) offenders.push(`${f} :: ${rx}`);
      }
    }
    expect(offenders, offenders.join("\n")).toHaveLength(0);
  });

  it("portal (client) bundles never import the AI brain registry, standalone runner, or access audit", () => {
    const banned = [
      /from\s+["']@\/config\/rgsAiBrains["']/,
      /from\s+["']@\/lib\/standaloneToolRunner["']/,
      /from\s+["']@\/config\/clientToolAccessAudit["']/,
    ];
    const offenders: string[] = [];
    for (const f of PORTAL_FILES) {
      const text = readFileSync(f, "utf8");
      for (const rx of banned) {
        if (rx.test(text)) offenders.push(`${f} :: ${rx}`);
      }
    }
    expect(offenders, offenders.join("\n")).toHaveLength(0);
  });

  it("AI brain registry is configuration-only — no provider URLs, no secrets, no fetch calls", () => {
    const text = read("src/config/rgsAiBrains.ts");
    expect(text).not.toMatch(/api\.openai\.com/);
    expect(text).not.toMatch(/api\.anthropic\.com/);
    expect(text).not.toMatch(/generativelanguage\.googleapis\.com/);
    expect(text).not.toMatch(/ai\.gateway\.lovable\.dev/);
    expect(text).not.toMatch(/OPENAI_API_KEY|ANTHROPIC_API_KEY|GEMINI_API_KEY|LOVABLE_API_KEY/);
    expect(text).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
    expect(text).not.toMatch(/\bfetch\s*\(/);
    expect(text).not.toMatch(/\bsupabase\.functions\.invoke\b/);
    expect(text).not.toMatch(/Deno\.env/);
  });

  it("AI safety scanner is deterministic — no AI calls, no secrets", () => {
    const text = read("src/lib/rgsAiSafety.ts");
    expect(text).not.toMatch(/\bfetch\s*\(/);
    expect(text).not.toMatch(/supabase\.functions\.invoke/);
    expect(text).not.toMatch(/api\.(openai|anthropic)/);
    expect(text).not.toMatch(/Deno\.env/);
  });
});

// ---------------------------------------------------------------------
// 2 — Standalone Tool Runner is admin-only
// ---------------------------------------------------------------------
describe("P80 / Standalone Tool Runner gating", () => {
  const app = read("src/App.tsx");

  it("/admin/standalone-tool-runner is wrapped in ProtectedRoute requireRole=admin", () => {
    const line = app.split("\n").find((l) => l.includes('path="/admin/standalone-tool-runner"'));
    expect(line, "standalone-tool-runner route missing").toBeTruthy();
    expect(line!).toMatch(/requireRole="admin"/);
  });

  it("standalone runner is never reachable from a /portal/* route declaration", () => {
    const lines = app.split("\n").filter((l) => /<Route\s/.test(l) && /path="\/portal/.test(l));
    for (const line of lines) {
      expect(line.includes("StandaloneToolRunner"), `portal route exposes runner: ${line.trim()}`).toBe(false);
    }
  });

  it("standalone runner page does not embed AI provider URLs or secrets", () => {
    const text = read("src/pages/admin/StandaloneToolRunner.tsx");
    expect(text).not.toMatch(/api\.(openai|anthropic)/);
    expect(text).not.toMatch(/sk_(live|test)_/);
    expect(text).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
  });
});

// ---------------------------------------------------------------------
// 3 — Tool walkthrough video registry: portal video display is locked
// ---------------------------------------------------------------------
describe("P80 / Walkthrough video safety", () => {
  it("static walkthrough registry forces no_download / no_social_share for portal entries", () => {
    const text = read("src/config/toolWalkthroughVideos.ts");
    expect(text).toMatch(/no_download:\s*true/);
    expect(text).toMatch(/no_social_share:\s*true/);
  });

  it("portal walkthrough card never renders a download button, anchor with download attr, or share button", () => {
    const text = read("src/components/portal/ToolWalkthroughCard.tsx");
    expect(text).not.toMatch(/\bdownload\s*=/i);
    expect(text).not.toMatch(/\bShare\b\s*</);
    expect(text).not.toMatch(/navigator\.share/);
  });

  it("portal walkthrough card does not consume admin-only walkthrough fields (internal_notes, admin_notes)", () => {
    const text = read("src/components/portal/ToolWalkthroughCard.tsx");
    expect(text).not.toMatch(/internal_notes/);
    expect(text).not.toMatch(/admin_notes/);
  });
});

// ---------------------------------------------------------------------
// 4 — Client tool access audit is admin reference material only
// ---------------------------------------------------------------------
describe("P80 / Client tool access audit exposure", () => {
  it("audit registry is never imported from public or portal bundles", () => {
    const offenders: string[] = [];
    for (const f of [...PUBLIC_PAGES, ...PORTAL_FILES]) {
      const text = readFileSync(f, "utf8");
      if (/from\s+["']@\/config\/clientToolAccessAudit["']/.test(text)) offenders.push(f);
    }
    expect(offenders, offenders.join("\n")).toHaveLength(0);
  });

  it("audit entries that touch official findings require approval controls", () => {
    for (const e of CLIENT_TOOL_ACCESS_AUDIT) {
      if (e.deterministic_override_risk) {
        expect(e.approval_controls_required, `${e.tool_key} must require approval`).toBe(true);
      }
    }
  });
});

// ---------------------------------------------------------------------
// 5 — Tool-Specific Report Framework hardening (P76)
// ---------------------------------------------------------------------
describe("P80 / Tool-specific report framework hardening", () => {
  const tr = read("src/lib/reports/toolReports.ts");

  it("tool reports anchor to the registered AI brain key and run forbidden-claim scanner", () => {
    expect(tr).toContain("TOOL_SPECIFIC_REPORT_AI_BRAIN_KEY");
    expect(tr).toContain("findForbiddenAiClaims");
    expect(tr).toContain("assertSectionsClientSafe");
    expect(tr).toContain("getRgsAiBrain");
  });

  it("tool reports access PDFs via signed URLs on the private bucket", () => {
    expect(tr).toMatch(/createSignedUrl/);
    expect(tr).toMatch(/tool-reports/);
    expect(tr).not.toMatch(/getPublicUrl\s*\(/);
  });

  it("tool report builder does not embed admin internal_notes into client-safe output", () => {
    // assertSectionsClientSafe scans only label/body, never internal_notes.
    expect(tr).not.toMatch(/internal_notes\s*:/);
  });
});

// ---------------------------------------------------------------------
// 6 — Frontend never references AI provider gateways or backend env
// ---------------------------------------------------------------------
describe("P80 / Re-asserted frontend secret + AI gateway hygiene", () => {
  const FORBIDDEN = [
    /SUPABASE_SERVICE_ROLE_KEY/,
    /OPENAI_API_KEY/,
    /ANTHROPIC_API_KEY/,
    /GEMINI_API_KEY/,
    /api\.openai\.com\/v1/,
    /api\.anthropic\.com\/v1/,
    /generativelanguage\.googleapis\.com/,
    /ai\.gateway\.lovable\.dev/,
    /Deno\.env\.get/,
    /sk_live_[A-Za-z0-9]{8,}/,
    /sk_test_[A-Za-z0-9]{16,}/,
  ];
  it("no non-test frontend file references provider URLs, AI keys, or backend env", () => {
    const offenders: string[] = [];
    for (const f of SRC_FILES) {
      if (f.endsWith(join("integrations", "supabase", "types.ts"))) continue;
      const text = readFileSync(f, "utf8");
      for (const rx of FORBIDDEN) {
        if (rx.test(text)) offenders.push(`${f} :: ${rx}`);
      }
    }
    expect(offenders, offenders.join("\n")).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------
// 7 — Production source-map posture is preserved
// ---------------------------------------------------------------------
describe("P80 / Build configuration", () => {
  it("vite production build does not ship source maps", () => {
    const cfg = read("vite.config.ts");
    expect(cfg).toMatch(/sourcemap:\s*mode\s*===\s*["']development["']/);
  });
});

// ---------------------------------------------------------------------
// 8 — Public docs separation is preserved
// ---------------------------------------------------------------------
describe("P80 / Public asset hygiene", () => {
  it("public/ does not contain RGS internal plan docs (brain registry, AI prompts, hardening notes)", () => {
    const pub = walk(resolve(ROOT, "public"));
    const banned = [
      /rgsAiBrains/i,
      /standaloneToolRunner/i,
      /clientToolAccessAudit/i,
      /toolWalkthroughVideos/i,
      /industry-brain/i,
      /hardening/i,
      /lovable-prompt/i,
    ];
    const offenders: string[] = [];
    for (const f of pub) {
      for (const rx of banned) {
        if (rx.test(f)) offenders.push(f);
      }
    }
    expect(offenders, offenders.join("\n")).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------
// 9 — Positioning hygiene re-asserted (no construction-metaphor / mirror language)
// ---------------------------------------------------------------------
describe("P80 / Positioning language hygiene", () => {
  it("RGS AI brain registry, AI safety scanner, runner, audit, and walkthrough registry are clean", () => {
    const FORBIDDEN = [
      /lay the bricks/i,
      /provides the blueprint/i,
      /Mirror,\s*Not the Map/i,
    ];
    const files = [
      "src/config/rgsAiBrains.ts",
      "src/lib/rgsAiSafety.ts",
      "src/lib/standaloneToolRunner.ts",
      "src/config/clientToolAccessAudit.ts",
      "src/config/toolWalkthroughVideos.ts",
      "src/lib/reports/toolReports.ts",
      "src/pages/admin/StandaloneToolRunner.tsx",
      "src/components/portal/ToolWalkthroughCard.tsx",
    ];
    const offenders: string[] = [];
    for (const f of files) {
      const text = read(f);
      for (const rx of FORBIDDEN) {
        if (rx.test(text)) offenders.push(`${f} :: ${rx}`);
      }
    }
    expect(offenders, offenders.join("\n")).toHaveLength(0);
  });
});
