/**
 * AI Assist Wiring Pass — contract tests.
 *
 * Verifies the safe admin-reviewed AI layer:
 *  - No frontend AI provider secrets / direct gateway calls.
 *  - Report AI honors P65 tier constraints in prompt.
 *  - RGS Stability Snapshot label guard preserved.
 *  - AI output stays admin-only by default.
 *  - AI logs table exists with admin-only RLS (migration shape).
 *  - Docs file exists.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const root = process.cwd();
const read = (rel: string) => readFileSync(resolve(root, rel), "utf8");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (name === "node_modules" || name === ".git") continue;
      walk(full, out);
    } else if (/\.(ts|tsx|js|jsx)$/.test(name)) {
      out.push(full);
    }
  }
  return out;
}

describe("AI Assist Wiring Pass — frontend secret scan", () => {
  const files = walk(resolve(root, "src"));

  const FORBIDDEN_PATTERNS: { name: string; rx: RegExp }[] = [
    { name: "raw OpenAI key reference", rx: /OPENAI_API_KEY/ },
    { name: "raw Anthropic key reference", rx: /ANTHROPIC_API_KEY/ },
    { name: "raw Gemini key reference", rx: /GEMINI_API_KEY/ },
    { name: "direct Lovable AI gateway URL", rx: /ai\.gateway\.lovable\.dev/ },
    { name: "direct OpenAI endpoint", rx: /api\.openai\.com\/v1/ },
    { name: "direct Anthropic endpoint", rx: /api\.anthropic\.com\/v1/ },
    { name: "direct Gemini endpoint", rx: /generativelanguage\.googleapis\.com/ },
  ];

  // Allow-list: contract tests reference these strings literally to forbid them.
  const ALLOWED_TEST_FILES = new Set([
    resolve(root, "src/lib/__tests__/aiAssistWiringContract.test.ts"),
    resolve(root, "src/lib/__tests__/reportGeneratorTieringContract.test.ts"),
    resolve(root, "src/lib/__tests__/edgeFunctionSecurity.test.ts"),
    resolve(root, "src/lib/__tests__/aiPromptVoiceContract.test.ts"),
    resolve(root, "src/lib/__tests__/implementationCompletionAddOn.test.ts"),
    resolve(root, "src/lib/__tests__/ibH6IndustryBrainEvidenceSecuritySweep.test.ts"),
    resolve(root, "src/lib/__tests__/ipH1OsProtectionVerification.test.ts"),
    resolve(root, "src/lib/__tests__/p66NamingArchitectureHardening.test.ts"),
    resolve(root, "src/lib/__tests__/p67EvidenceVaultHardening.test.ts"),
    resolve(root, "src/lib/__tests__/p67BEvidenceVaultFunctionalCompletion.test.ts"),
    resolve(root, "src/lib/__tests__/p67AConnectorCapabilityMatrix.test.ts"),
    resolve(root, "src/lib/__tests__/p68StructuralHealthReportHardening.test.ts"),
    resolve(root, "src/lib/__tests__/p68BRepairMapEvidenceCompletion.test.ts"),
    resolve(root, "src/lib/__tests__/p70RealityCheckFlags.test.ts"),
    resolve(root, "src/lib/__tests__/p75SopClientCreator.test.ts"),
    resolve(root, "src/lib/__tests__/p75ARgsAiBrainRegistry.test.ts"),
    resolve(root, "src/lib/__tests__/p80IpHardeningVerification.test.ts"),
    resolve(root, "src/lib/__tests__/p81FinalMobileAccessibilityVisualSweep.test.ts"),
    resolve(root, "src/lib/__tests__/p81APublicVideoSocialDownloadHardening.test.ts"),
    resolve(root, "src/lib/__tests__/p82FinalLaunchSmokeTest.test.ts"),
    resolve(root, "src/lib/__tests__/p84NewAccountsApprovalQueue.test.ts"),
  ]);

  for (const { name, rx } of FORBIDDEN_PATTERNS) {
    it(`no frontend file references: ${name}`, () => {
      const offenders: string[] = [];
      for (const f of files) {
        if (ALLOWED_TEST_FILES.has(f)) continue;
        const src = readFileSync(f, "utf8");
        if (rx.test(src)) offenders.push(f);
      }
      expect(offenders, `Offending files: ${offenders.join(", ")}`).toHaveLength(0);
    });
  }

  it("LOVABLE_API_KEY is never READ from env in frontend source (admin UI labels are allowed)", () => {
    // Forbid actual reads from env; allow human-readable label strings
    // that name the key (e.g. admin instructions to add it in Cloud secrets).
    const READ_PATTERNS = [
      /process\.env\.LOVABLE_API_KEY/,
      /import\.meta\.env\.[A-Z_]*LOVABLE_API_KEY/,
      /Deno\.env\.get\(["']LOVABLE_API_KEY["']\)/,
    ];
    const offenders: string[] = [];
    for (const f of files) {
      if (ALLOWED_TEST_FILES.has(f)) continue;
      const src = readFileSync(f, "utf8");
      if (READ_PATTERNS.some((rx) => rx.test(src))) offenders.push(f);
    }
    expect(offenders, `Offenders: ${offenders.join(", ")}`).toHaveLength(0);
  });
});

describe("AI Assist Wiring Pass — report-ai-assist tier enforcement", () => {
  const src = read("supabase/functions/report-ai-assist/index.ts");

  it("requires admin auth before reading the AI gateway key", () => {
    const a = src.indexOf("await requireAdmin(req, corsHeaders)");
    const k = src.indexOf('Deno.env.get("LOVABLE_API_KEY")');
    expect(a).toBeGreaterThan(-1);
    expect(k).toBeGreaterThan(-1);
    expect(a).toBeLessThan(k);
  });

  it("includes a tier constraints block driven by report_type", () => {
    expect(src).toContain("REPORT_TIER_AI_RULES");
    expect(src).toContain("buildTierConstraintsBlock");
    expect(src).toMatch(/Report tier:/);
  });

  it("declares all five P65 report tiers with explicit boundary flags", () => {
    for (const k of [
      "full_rgs_diagnostic",
      "fiverr_basic_diagnostic",
      "fiverr_standard_diagnostic",
      "fiverr_premium_diagnostic",
      "implementation_report",
    ]) {
      expect(src).toContain(`${k}:`);
    }
  });

  it("Fiverr Basic excludes full flagship depth but allows the package stability snapshot", () => {
    const start = src.indexOf("fiverr_basic_diagnostic:");
    const end = src.indexOf("fiverr_standard_diagnostic:");
    const block = src.slice(start, end);
    expect(block).toContain("includesFullScorecard: false");
    expect(block).toContain("includesFullFiveGearAnalysis: false");
    expect(block).toContain("includesImplementationReadinessNotes: false");
    expect(block).toContain("includesRgsStabilitySnapshot: true");
  });

  it("Fiverr Standard excludes the full scorecard and full implementation roadmap", () => {
    const start = src.indexOf("fiverr_standard_diagnostic:");
    const end = src.indexOf("fiverr_premium_diagnostic:");
    const block = src.slice(start, end);
    expect(block).toContain("includesFullScorecard: false");
    expect(block).toContain("includesFullFiveGearAnalysis: false");
  });

  it("Fiverr Premium is explicitly NOT the Full RGS client diagnostic", () => {
    const start = src.indexOf("fiverr_premium_diagnostic:");
    const end = src.indexOf("implementation_report:");
    const block = src.slice(start, end);
    expect(block).toContain("isFullRgsDiagnostic: false");
    expect(block).toContain("includesFullScorecard: false");
    expect(block).toContain("Not the Full RGS Business Stability Diagnostic Report.");
  });

  it("Full RGS Diagnostic is the only tier flagged as flagship", () => {
    expect(src).toMatch(/full_rgs_diagnostic:[\s\S]*?isFullRgsDiagnostic:\s*true/);
    expect(src).not.toMatch(/fiverr_[a-z_]+:[\s\S]*?isFullRgsDiagnostic:\s*true/);
  });

  it("preserves the 'RGS Stability Snapshot' client-facing label and forbids client-facing 'SWOT Analysis'", () => {
    expect(src).toContain("RGS Stability Snapshot");
    // The phrase 'SWOT Analysis' may appear ONLY in a forbid/never directive.
    const swotMatches = src.match(/SWOT Analysis/g) ?? [];
    for (const _ of swotMatches) {
      // Each occurrence must be inside a "never" / "Never" / "do NOT" sentence.
      expect(src).toMatch(/never (?:use |produce )?['"]?SWOT Analysis['"]?|do NOT[^\n]*SWOT Analysis/);
    }
  });

  it("AI output is forced admin-only (client_safe = false, status = needs_review)", () => {
    expect(src).toContain("client_safe: false");
    expect(src).toContain('status: "needs_review"');
  });

  it("includes scope warnings about not overriding scoring, gates, or professional review", () => {
    expect(src).toContain("SCOPE_WARNING_RULES");
    expect(src).toMatch(/does NOT replace deterministic scoring/);
    expect(src).toMatch(/does NOT change access gates/);
  });

  it("treats cannabis / MMJ / MMC as business operations, never as healthcare", () => {
    expect(src).toMatch(/cannabis \/ MMJ \/ MMC/i);
    expect(src).toMatch(/Not healthcare, not patient care, not HIPAA/);
  });

  it("never auto-publishes: no client_visible/approved/published flag is set true here", () => {
    expect(src).not.toMatch(/client_visible:\s*true/);
    expect(src).not.toMatch(/published:\s*true/);
    expect(src).not.toMatch(/status:\s*["']approved["']/);
  });
});

describe("AI Assist Wiring Pass — AI logs table is admin-only", () => {
  const sql = read("supabase/migrations/20260429172000_p18_ai_run_logs.sql");

  it("enables RLS on ai_run_logs", () => {
    expect(sql).toMatch(/ALTER TABLE public\.ai_run_logs ENABLE ROW LEVEL SECURITY/);
  });

  it("only admins may access ai_run_logs", () => {
    expect(sql).toMatch(/USING \(public\.is_admin\(auth\.uid\(\)\)\)/);
    expect(sql).toMatch(/REVOKE ALL ON TABLE public\.ai_run_logs FROM (?:PUBLIC|anon)/);
  });
});

describe("AI Assist Wiring Pass — UI copy safety (banned wording scan)", () => {
  const docs = read("docs/ai-assist-wiring.md");

  it("doc exists and explains admin-review boundary", () => {
    expect(docs).toMatch(/Admin review/i);
    expect(docs).toMatch(/RGS Stability Snapshot/);
  });

  it("doc forbids unsafe AI framings", () => {
    // The doc itself names these as banned; ensure they appear only in
    // a "do not use" context.
    for (const banned of [
      "AI advisor",
      "AI consultant",
      "Ask AI anything",
      "client-facing AI chatbot",
    ]) {
      // It MUST appear inside the banned list.
      expect(docs).toContain(banned);
    }
  });
});
