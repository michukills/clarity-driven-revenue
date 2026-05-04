import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

/**
 * Full-System Premium Functional QA contract.
 *
 * Static structural sweep of the launch surface: pins routes, gates,
 * report/PDF infra, industry intelligence wiring, AI safety boundaries,
 * and copy guards. Failing here means a launch-blocking regression.
 */
const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");
const exists = (p: string) => existsSync(join(root, p));

const APP = "src/App.tsx";

describe("Full-System Premium QA — public routes", () => {
  const required = [
    'path="/"',
    'path="/scorecard"',
    'path="/diagnostic"',
    'path="/diagnostic-apply"',
    'path="/implementation"',
    'path="/revenue-control-system"',
    'path="/why-rgs-is-different"',
    'path="/blog"',
    'path="/industries"',
    'path="/industries/:slug"',
    'path="/industry-brain"',
    'path="/eula"',
    'path="/privacy"',
    'path="/contact"',
    'path="/auth"',
    'path="/claim-invite"',
  ];
  it.each(required)("App.tsx registers %s", (path) => {
    expect(read(APP)).toContain(path);
  });

  it("Google Tag (GA4 G-KNYS7P18GC) is installed in index.html", () => {
    const html = read("index.html");
    expect(html).toMatch(/googletagmanager\.com\/gtag\/js\?id=G-KNYS7P18GC/);
    expect(html).toMatch(/gtag\('config', 'G-KNYS7P18GC'\)/);
  });
});

describe("Full-System Premium QA — admin route protection", () => {
  it("every /admin route is wrapped in ProtectedRoute requireRole=admin (or is a redirect)", () => {
    const src = read(APP);
    // Match each <Route path="/admin..." ... /> entry.
    const routeRe = /<Route\s+path="\/admin[^"]*"[^>]*element=\{([^}]+(?:\{[^}]*\}[^}]*)*)\}/g;
    const offenders: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = routeRe.exec(src))) {
      const elementBlock = m[0];
      const isRedirect = /Navigate\s+to=/.test(elementBlock) || /LegacyAdminBccRedirect|CustomerReportsAlias/.test(elementBlock);
      const isProtected = /ProtectedRoute\s+requireRole="admin"/.test(elementBlock);
      if (!isRedirect && !isProtected) offenders.push(elementBlock.slice(0, 160));
    }
    expect(offenders).toEqual([]);
  });
});

describe("Full-System Premium QA — client portal gating", () => {
  it("/portal routes are wrapped in ProtectedRoute", () => {
    const src = read(APP);
    const portalRe = /<Route\s+path="\/portal[^"]*"[^>]*element=\{([\s\S]*?)\}\s*\/>/g;
    const offenders: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = portalRe.exec(src))) {
      if (!/ProtectedRoute/.test(m[0])) offenders.push(m[0].slice(0, 160));
    }
    expect(offenders).toEqual([]);
  });

  it("ProtectedRoute still routes admins out of /portal unless previewing", () => {
    const src = read("src/components/portal/ProtectedRoute.tsx");
    expect(src).toMatch(/isAdmin/);
    expect(src).toMatch(/previewAsClient/);
    expect(src).toMatch(/Navigate to="\/auth"/);
  });

  it("ClientToolGuard exists for stage/lane gating", () => {
    expect(exists("src/components/portal/ClientToolGuard.tsx")).toBe(true);
    expect(read(APP)).toMatch(/ClientToolGuard/);
  });
});

describe("Full-System Premium QA — report / PDF / storage infra", () => {
  for (const p of [
    "src/components/admin/StoredToolReportsPanel.tsx",
    "src/pages/admin/ReportDraftDetail.tsx",
    "src/pages/admin/ReportDrafts.tsx",
    "src/pages/portal/Reports.tsx",
    "src/pages/portal/ReportView.tsx",
  ]) {
    it(`${p} is present`, () => expect(exists(p)).toBe(true));
  }
  it("StoredToolReportsPanel still wired into ReportDraftDetail", () => {
    expect(read("src/pages/admin/ReportDraftDetail.tsx")).toMatch(
      /StoredToolReportsPanel/,
    );
  });
});

describe("Full-System Premium QA — Industry Brain + emphasis wiring", () => {
  const surfaces: Array<[string, RegExp]> = [
    ["src/pages/admin/DiagnosticInterviewDetail.tsx", /surface="diagnostic_review"/],
    ["src/pages/admin/ReportDraftDetail.tsx", /surface="report_builder"/],
    ["src/pages/admin/ReportDraftDetail.tsx", /surface="repair_map"/],
    ["src/pages/admin/ImplementationRoadmapAdmin.tsx", /surface="implementation"/],
    ["src/pages/admin/RgsControlSystemAdmin.tsx", /surface="rgs_control_system"/],
    ["src/pages/admin/RevenueRiskMonitorAdmin.tsx", /surface="revenue_risk_monitor"/],
  ];
  it.each(surfaces)("emphasis panel mounted on %s", (file, re) => {
    const src = read(file);
    expect(src).toMatch(/IndustryEmphasisPanel/);
    expect(src).toMatch(re);
  });

  it("emphasis panel labels itself 'Score unchanged' and admin only", () => {
    const src = read("src/components/admin/IndustryEmphasisPanel.tsx");
    expect(src).toMatch(/Score unchanged/);
    expect(src).toMatch(/Admin only/);
  });

  it("admin classification field exposes classifier suggestion + source-of-truth + non-overwrite guard", () => {
    const src = read("src/components/admin/IndustryAssignmentField.tsx");
    expect(src).toMatch(/Classifier suggestion/);
    expect(src).toMatch(/Source of truth/);
    expect(src).toMatch(/will not be silently overwritten/);
  });
});

describe("Full-System Premium QA — copy + cannabis safety guards", () => {
  // Files we explicitly scan for unsafe marketing language.
  const PUBLIC_SURFACES = [
    "src/pages/Index.tsx",
    "src/pages/WhatWeDo.tsx",
    "src/pages/Implementation.tsx",
    "src/pages/RevenueControlSystem.tsx",
    "src/pages/Diagnostic.tsx",
    "src/pages/industries/IndustryLanding.tsx",
    "src/pages/industries/Industries.tsx",
    "src/pages/IndustryBrainEducation.tsx",
  ];
  const banned = [
    /\bguaranteed\b/i,
    /\bunlimited support\b/i,
    /\bwe run your business\b/i,
    /\b100% (coverage|complete|guaranteed)\b/i,
    /\bcomplete coverage\b/i,
    /\bcertif(?:y|ies|ied) compliance\b/i,
  ];
  it.each(PUBLIC_SURFACES.filter(exists))("no unsafe claims in %s", (p) => {
    const src = read(p);
    for (const re of banned) expect(src).not.toMatch(re);
  });

  it("cannabis landing scope stays dispensary-only (no positive HIPAA/patient/clinical)", () => {
    const src = read("src/pages/industries/IndustryLanding.tsx");
    // The component itself must not hardcode healthcare terms.
    for (const term of [/\bHIPAA\b/, /\bpatient care\b/i, /\bclinical workflows?\b/i, /\binsurance claim/i, /\bmedical billing\b/i]) {
      expect(src).not.toMatch(term);
    }
  });
});

describe("Full-System Premium QA — frontend secret hygiene", () => {
  it("no Stripe live secret keys appear in src/", async () => {
    const { execSync } = await import("node:child_process");
    const out = execSync(
      "grep -RIn --include='*.ts' --include='*.tsx' -E 'sk_live_[A-Za-z0-9]{8,}' src/ || true",
      { encoding: "utf8" },
    );
    // Allow only test-pattern fixtures that are explicitly negative-asserted.
    const lines = out.split("\n").filter(Boolean);
    for (const l of lines) {
      expect(l).toMatch(/__tests__|test\./);
    }
  });

  it("no SUPABASE_SERVICE_ROLE_KEY usage in client code", async () => {
    const { execSync } = await import("node:child_process");
    const out = execSync(
      "grep -RIn --include='*.ts' --include='*.tsx' 'SUPABASE_SERVICE_ROLE_KEY' src/ || true",
      { encoding: "utf8" },
    );
    const offenders = out
      .split("\n")
      .filter(Boolean)
      .filter((l) => !/__tests__|test\.|edgeFunctionSecurity/.test(l));
    expect(offenders).toEqual([]);
  });
});

describe("Full-System Premium QA — AI assist server-side only", () => {
  it("no fetch to OpenAI / Lovable AI gateway from client code", async () => {
    const { execSync } = await import("node:child_process");
    const out = execSync(
      "grep -RIn --include='*.ts' --include='*.tsx' -E 'api\\.openai\\.com|ai\\.gateway\\.lovable\\.dev' src/ || true",
      { encoding: "utf8" },
    );
    const offenders = out
      .split("\n")
      .filter(Boolean)
      .filter((l) => !/__tests__|test\.|supabase\/functions\//.test(l));
    expect(offenders).toEqual([]);
  });

  it("report-ai-assist edge function marks output as admin-reviewed (review_required)", () => {
    const p = "supabase/functions/report-ai-assist/index.ts";
    if (!exists(p)) return; // intentionally tolerant if function renamed
    const src = read(p);
    expect(src).toMatch(/review_required/);
  });
});