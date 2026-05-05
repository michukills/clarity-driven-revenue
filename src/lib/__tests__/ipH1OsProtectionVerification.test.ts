/**
 * IP-H1 — RGS OS IP Hardening + Code/Proprietary Logic Protection
 * Verification.
 *
 * Static / structural assertions that prove proprietary RGS OS logic
 * is not unnecessarily exposed in:
 *   - public route bundles
 *   - frontend source
 *   - admin route gating
 *   - portal trust boundaries
 *   - RLS / storage
 *   - report / PDF / signed-URL surfaces
 *   - AI prompt / context surfaces
 *   - demo / showcase surfaces
 *   - cannabis/MMJ + pricing posture
 *   - production source-map posture
 *   - public docs / internal docs separation
 *
 * No production logic is changed by this suite. It is companion
 * coverage to IB-H6 and the existing security/contract tests.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";

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

const SRC_FILES = walk(resolve(ROOT, "src"));
const NON_TEST_SRC = SRC_FILES.filter((f) => !/\.test\.(ts|tsx)$/.test(f));
const PUBLIC_PAGES = walk(resolve(ROOT, "src/pages"))
  .filter((f) => !f.includes(`${join("pages", "admin")}`))
  .filter((f) => !f.includes(`${join("pages", "portal")}`))
  .filter((f) => !/\.test\.(ts|tsx)$/.test(f));
const PORTAL_FILES = [
  ...walk(resolve(ROOT, "src/pages/portal")),
  ...walk(resolve(ROOT, "src/components/portal")),
].filter((f) => !/\.test\.(ts|tsx)$/.test(f));

// ---------------------------------------------------------------------
// 1 — Frontend secret / prompt / backend-context leakage
// ---------------------------------------------------------------------
describe("IP-H1 / Frontend secret + prompt leakage", () => {
  const FORBIDDEN = [
    /SUPABASE_SERVICE_ROLE_KEY/,
    /sk_live_[A-Za-z0-9]{8,}/,
    /sk_test_[A-Za-z0-9]{16,}/,
    /OPENAI_API_KEY/,
    /ANTHROPIC_API_KEY/,
    /GEMINI_API_KEY/,
    /api\.openai\.com\/v1/,
    /api\.anthropic\.com\/v1/,
    /generativelanguage\.googleapis\.com/,
    /ai\.gateway\.lovable\.dev/,
    /Deno\.env\.get/,
  ];
  it("no non-test frontend file references secrets, prompts, or backend env", () => {
    const offenders: string[] = [];
    for (const f of NON_TEST_SRC) {
      if (f.endsWith(join("integrations", "supabase", "types.ts"))) continue;
      const text = readFileSync(f, "utf8");
      for (const rx of FORBIDDEN) {
        if (rx.test(text)) offenders.push(`${f} :: ${rx}`);
      }
    }
    expect(offenders, offenders.join("\n")).toHaveLength(0);
  });

  it("no frontend file imports the backend-only industry-evidence-context utility", () => {
    const offenders: string[] = [];
    for (const f of NON_TEST_SRC) {
      const text = readFileSync(f, "utf8");
      if (/industry-evidence-context/.test(text)) offenders.push(f);
    }
    expect(offenders, offenders.join("\n")).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------
// 2 — Public pages do not consume proprietary engine internals
// ---------------------------------------------------------------------
describe("IP-H1 / Public route exposure", () => {
  const FORBIDDEN_IMPORTS = [
    /gearMetricRegistry/,
    /industryDepthQuestionRegistry/,
    /evidenceInterpretation/,
    /industry-evidence-context/,
  ];
  it("public pages do not import internal registries / interpretation helpers", () => {
    const offenders: string[] = [];
    for (const f of PUBLIC_PAGES) {
      const text = readFileSync(f, "utf8");
      for (const rx of FORBIDDEN_IMPORTS) {
        if (rx.test(text)) offenders.push(`${f} :: ${rx}`);
      }
    }
    expect(offenders, offenders.join("\n")).toHaveLength(0);
  });

  it("public pages do not import from /docs or admin namespaces", () => {
    const banned = [
      /from\s+["'][^"']*\/docs\//,
      /from\s+["']@\/pages\/admin\//,
      /from\s+["']@\/components\/admin\//,
    ];
    const offenders: string[] = [];
    for (const f of PUBLIC_PAGES) {
      const text = readFileSync(f, "utf8");
      for (const rx of banned) {
        if (rx.test(text)) offenders.push(`${f} :: ${rx}`);
      }
    }
    expect(offenders, offenders.join("\n")).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------
// 3 — Demo / showcase safety
// ---------------------------------------------------------------------
describe("IP-H1 / Demo safety", () => {
  const demo = read("src/pages/Demo.tsx");
  it("public demo labels content as sample/demo data", () => {
    expect(/sample\/demo data/i.test(demo) || /sample data/i.test(demo)).toBe(true);
  });
  it("public demo does not contain ROI / guarantee / testimonial language", () => {
    expect(/guaranteed/i.test(demo)).toBe(false);
    expect(/\bROI\b/.test(demo)).toBe(false);
    expect(/testimonial/i.test(demo)).toBe(false);
  });
  it("public demo does not reference the synthetic case study table", () => {
    expect(/industry_case_studies/.test(demo)).toBe(false);
  });
});

// ---------------------------------------------------------------------
// 4 — Admin route gating + portal isolation
// ---------------------------------------------------------------------
describe("IP-H1 / Admin + portal isolation", () => {
  const app = read("src/App.tsx");

  it("every /admin/* route is admin-guarded or a safe redirect", () => {
    const lines = app.split("\n").filter((l) => /<Route\s/.test(l) && /path="\/admin/.test(l));
    for (const line of lines) {
      const guarded = /requireRole="admin"/.test(line);
      const redirect = /<Navigate\s+to=/.test(line) || /Redirect/.test(line);
      expect(guarded || redirect, `unguarded admin route: ${line.trim()}`).toBe(true);
    }
  });

  it("portal files do not import admin pages or admin components", () => {
    const banned = [
      /from\s+["']@\/pages\/admin\//,
      /from\s+["']@\/components\/admin\//,
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

  it("ProtectedRoute / ClientToolGuard do not branch on a demo flag to bypass gates", () => {
    const pr = read("src/components/portal/ProtectedRoute.tsx");
    const ctg = read("src/components/portal/ClientToolGuard.tsx");
    for (const text of [pr, ctg]) {
      // Allow comments/identifiers like "previewAsClient"; ban demo-bypass branching.
      expect(/is_demo|isDemo|demo_account|demoAccount/.test(text)).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------
// 5 — RLS / storage protection
// ---------------------------------------------------------------------
describe("IP-H1 / RLS + storage", () => {
  const ANCHOR_MIGRATION =
    "supabase/migrations/20260505044647_ede78d3d-6e33-4d5c-88af-33cecc48059a.sql";
  const TOOL_REPORTS_MIGRATION =
    "supabase/migrations/20260504185218_eab1e9fe-8eed-463e-bf5c-9c508dfaed6d.sql";

  it("internal anchor tables enable RLS and use is_admin policies", () => {
    const sql = read(ANCHOR_MIGRATION);
    for (const tbl of [
      "industry_benchmark_anchors",
      "industry_glossary_terms",
      "industry_case_studies",
    ]) {
      expect(sql.includes(`ALTER TABLE public.${tbl} ENABLE ROW LEVEL SECURITY`)).toBe(true);
    }
    expect(sql).toMatch(/is_admin\(auth\.uid\(\)\)/);
  });

  it("synthetic case constraint is present", () => {
    const sql = read(ANCHOR_MIGRATION);
    expect(sql).toMatch(/ics_must_be_synthetic/);
    expect(sql).toMatch(/is_synthetic\s*=\s*true\s+AND\s+not_real_client\s*=\s*true/);
  });

  it("tool-reports storage bucket is private and admin-gated", () => {
    const sql = read(TOOL_REPORTS_MIGRATION);
    expect(sql).toMatch(/'tool-reports',\s*'tool-reports',\s*false/);
    expect(sql).toMatch(/bucket_id\s*=\s*'tool-reports'\s+AND\s+public\.is_admin/);
  });

  it("StoredToolReportsPanel uses signed URL helper, not raw public URLs", () => {
    const text = read("src/components/admin/StoredToolReportsPanel.tsx");
    expect(text).toContain("getToolReportSignedUrl");
    expect(text).not.toMatch(/getPublicUrl\s*\(/);
  });

  it("toolReports helper resolves access via createSignedUrl on the private bucket", () => {
    const text = read("src/lib/reports/toolReports.ts");
    expect(text).toMatch(/createSignedUrl/);
    expect(text).toMatch(/tool-reports/);
  });
});

// ---------------------------------------------------------------------
// 6 — Client report view excludes admin notes
// ---------------------------------------------------------------------
describe("IP-H1 / Client report view", () => {
  it("client report view does not select internal_notes and does not toggle showInternal", () => {
    const text = read("src/pages/portal/ReportView.tsx");
    expect(text).not.toMatch(/internal_notes(?!\s*from)/);
    expect(text).toMatch(/showInternal is intentionally never set/);
  });
});

// ---------------------------------------------------------------------
// 7 — Deterministic scoring isolation
// ---------------------------------------------------------------------
describe("IP-H1 / Deterministic scoring isolation", () => {
  it("src/lib/scoring does not import IB / AI / interpretation helpers", () => {
    const scoring = walk(resolve(ROOT, "src/lib/scoring"));
    const banned = [
      /gearMetricRegistry/,
      /industryDepthQuestionRegistry/,
      /evidenceInterpretation/,
      /industry-evidence-context/,
      /report-ai-assist/,
      /diagnostic-ai-followup/,
    ];
    const offenders: string[] = [];
    for (const f of scoring) {
      const text = readFileSync(f, "utf8");
      for (const rx of banned) {
        if (rx.test(text)) offenders.push(`${f} :: ${rx}`);
      }
    }
    expect(offenders, offenders.join("\n")).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------
// 8 — Pricing + cannabis/MMJ scope safety
// ---------------------------------------------------------------------
describe("IP-H1 / Pricing + scope", () => {
  it("RGS Control System pricing remains $1,000/month and no active $297/month copy exists", () => {
    const offenders: string[] = [];
    let saw1000 = false;
    for (const f of NON_TEST_SRC) {
      const text = readFileSync(f, "utf8");
      if (/\$1,?000\/month/.test(text)) saw1000 = true;
      if (/\$297\/month/.test(text)) offenders.push(f);
    }
    expect(saw1000).toBe(true);
    expect(offenders, `Old $297/month found in: ${offenders.join(", ")}`).toHaveLength(0);
  });

  it("no client-facing surface promises certified compliance / done-for-you / guaranteed results", () => {
    const banned = [
      /\bdone-for-you operator\b/i,
      /\bguaranteed (results|compliance|outcomes?)\b/i,
      /\bcertified compliant\b/i,
      /\blegally compliant\b/i,
    ];
    const offenders: string[] = [];
    for (const f of [...PUBLIC_PAGES, ...PORTAL_FILES]) {
      const text = readFileSync(f, "utf8");
      for (const rx of banned) {
        if (rx.test(text)) offenders.push(`${f} :: ${rx}`);
      }
    }
    expect(offenders, offenders.join("\n")).toHaveLength(0);
  });

  it("frontend does not import HIPAA / clinical / patient-care vocabulary into RGS surfaces", () => {
    const banned = [/\bHIPAA\b/, /\bpatient[- ]care\b/i, /\bclinical workflow\b/i, /\bmedical billing\b/i];
    const offenders: string[] = [];
    for (const f of [...PUBLIC_PAGES, ...PORTAL_FILES]) {
      const text = readFileSync(f, "utf8");
      for (const rx of banned) {
        if (rx.test(text)) offenders.push(`${f} :: ${rx}`);
      }
    }
    expect(offenders, offenders.join("\n")).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------
// 9 — Build / source-map posture
// ---------------------------------------------------------------------
describe("IP-H1 / Build configuration", () => {
  it("vite production build disables source maps", () => {
    const cfg = read("vite.config.ts");
    expect(cfg).toMatch(/sourcemap:\s*mode\s*===\s*["']development["']/);
  });
});

// ---------------------------------------------------------------------
// 10 — Public docs separation + IP doc presence
// ---------------------------------------------------------------------
describe("IP-H1 / Docs separation + IP doc", () => {
  it("public/ does not contain internal plan docs (industry brain plans, hardening notes, prompts)", () => {
    const pub = walk(resolve(ROOT, "public"));
    const banned = [/industry-brain/i, /hardening/i, /lovable-prompt/i, /ip-protection/i];
    const offenders: string[] = [];
    for (const f of pub) {
      for (const rx of banned) {
        if (rx.test(f)) offenders.push(f);
      }
    }
    expect(offenders, offenders.join("\n")).toHaveLength(0);
  });

  it("ip-protection-verification.md exists with the required sections", () => {
    const path = "docs/ip-protection-verification.md";
    expect(existsSync(resolve(ROOT, path))).toBe(true);
    const text = read(path);
    expect(text).toMatch(/Technical protections verified/i);
    expect(text).toMatch(/legal follow-up/i);
    expect(text).toMatch(/NOT being claimed/i);
  });
});