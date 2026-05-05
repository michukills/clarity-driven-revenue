/**
 * P75A — RGS AI Brain Registry + Safety contract tests.
 *
 * Locks the central AI brain architecture so future edits cannot
 * silently regress task-specific intelligence, the human drafting
 * standard, the client/admin AI standards, or the global forbidden
 * claim scanner. Also re-asserts approved positioning hygiene.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  RGS_AI_BRAINS,
  LAUNCH_CRITICAL_BRAIN_KEYS,
  GLOBAL_FORBIDDEN_AI_CLAIMS,
  HUMAN_DRAFTING_STANDARD,
  CLIENT_AI_STANDARD,
  ADMIN_AI_STANDARD,
  CLIENT_AI_DRAFT_DISCLOSURE,
  OPERATIONAL_READINESS_DISCLOSURE,
  getRgsAiBrain,
} from "@/config/rgsAiBrains";
import {
  compileForbiddenClaimPatterns,
  findForbiddenAiClaims,
  scrubForbiddenAiClaims,
  assertNoForbiddenAiClaims,
} from "@/lib/rgsAiSafety";

const root = process.cwd();
const read = (rel: string) => readFileSync(resolve(root, rel), "utf8");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (name === "node_modules" || name === ".git") continue;
      walk(full, out);
    } else if (/\.(ts|tsx|md)$/.test(name)) {
      out.push(full);
    }
  }
  return out;
}

describe("P75A — RGS AI brain registry coverage", () => {
  it("every launch-critical AI surface has a brain pack", () => {
    for (const key of LAUNCH_CRITICAL_BRAIN_KEYS) {
      const pack = RGS_AI_BRAINS[key];
      expect(pack, `missing brain pack: ${key}`).toBeTruthy();
      expect(pack.brain_key).toBe(key);
      expect(pack.surface_name.length).toBeGreaterThan(0);
      expect(pack.purpose.length).toBeGreaterThan(20);
      expect(pack.role_persona.length).toBeGreaterThan(20);
      expect(pack.source_of_truth_rules.length).toBeGreaterThan(0);
      expect(pack.evidence_rules.length).toBeGreaterThan(0);
      expect(pack.deterministic_logic_rules.length).toBeGreaterThan(0);
      expect(pack.tone_rules.length).toBeGreaterThan(0);
      expect(pack.human_drafting_rules.length).toBeGreaterThan(0);
      expect(pack.forbidden_claims.length).toBeGreaterThan(0);
      expect(pack.regulated_industry_rules.length).toBeGreaterThan(0);
      expect(pack.prohibited_actions.length).toBeGreaterThan(0);
    }
  });

  it("getRgsAiBrain returns the same pack as the registry", () => {
    expect(getRgsAiBrain("sop_training_bible").brain_key).toBe("sop_training_bible");
  });

  it("SOP brain encodes Lean / waste reduction / process efficiency", () => {
    const pack = getRgsAiBrain("sop_training_bible");
    const blob = JSON.stringify(pack).toLowerCase();
    expect(blob).toMatch(/lean|six sigma/);
    expect(blob).toMatch(/waste|rework|waiting|bottleneck/);
  });

  it("Structural Health Report brain enforces evidence grounding and admin approval", () => {
    const pack = getRgsAiBrain("structural_health_report");
    expect(pack.audience).toBe("admin");
    expect(JSON.stringify(pack.evidence_rules).toLowerCase()).toMatch(/evidence/);
    expect(JSON.stringify(pack.approval_rules).toLowerCase()).toMatch(/admin/);
    expect(JSON.stringify(pack.prohibited_actions)).toMatch(/SWOT Analysis/);
  });

  it("Buyer Persona / ICP brain separates owner assumption from evidence", () => {
    const pack = getRgsAiBrain("buyer_persona_icp");
    const blob = JSON.stringify(pack).toLowerCase();
    expect(blob).toMatch(/assumption/);
    expect(blob).toMatch(/evidence/);
  });

  it("Repair Map brain encodes sequencing / dependencies / owner capacity", () => {
    const pack = getRgsAiBrain("rgs_repair_map");
    const blob = JSON.stringify(pack).toLowerCase();
    expect(blob).toMatch(/30\/60\/90|sequenc/);
    expect(blob).toMatch(/depend/);
    expect(blob).toMatch(/owner capacity/);
    expect(JSON.stringify(pack.prohibited_actions).toLowerCase()).toMatch(/auto-publish/);
  });

  it("Worn Tooth brain preserves deterministic trigger as source of truth", () => {
    const pack = getRgsAiBrain("worn_tooth_signals");
    expect(JSON.stringify(pack.deterministic_logic_rules).toLowerCase()).toMatch(
      /worn tooth.*source of truth|trigger logic remains the source of truth/,
    );
  });

  it("Reality Check brain preserves deterministic flag as source of truth", () => {
    const pack = getRgsAiBrain("reality_check_flags");
    expect(JSON.stringify(pack.deterministic_logic_rules).toLowerCase()).toMatch(
      /reality check.*source of truth|flag logic remains the source of truth/,
    );
  });

  it("Cost of Friction brain blocks ROI / guarantee / exact-loss / valuation conversion", () => {
    const pack = getRgsAiBrain("cost_of_friction");
    const blob = JSON.stringify(pack).toLowerCase();
    expect(blob).toMatch(/guaranteed roi/);
    expect(blob).toMatch(/exact loss/);
    expect(blob).toMatch(/valuation conversion/);
  });

  it("Stability-to-Value Lens brain blocks valuation/appraisal/lender/investor language", () => {
    const pack = getRgsAiBrain("stability_to_value_lens");
    const blob = JSON.stringify(pack).toLowerCase();
    for (const term of ["valuation opinion", "appraisal", "fair market value", "enterprise value", "sale price", "ebitda multiple", "lender-ready", "investor-ready"]) {
      expect(blob, `missing block on: ${term}`).toContain(term);
    }
    expect(blob).toMatch(/does not tell you what your business is worth/);
  });

  it("Evidence Vault brain blocks compliance / audit / legal / accounting certification", () => {
    const pack = getRgsAiBrain("evidence_vault");
    const blob = JSON.stringify(pack).toLowerCase();
    expect(blob).toMatch(/compliance/);
    expect(blob).toMatch(/audit/);
    expect(blob).toMatch(/legal/);
    expect(blob).toMatch(/accounting/);
    expect(blob).toMatch(/storage path/);
  });
});

describe("P75A — drafting / client / admin standards", () => {
  it("human drafting standard blocks generic AI writing patterns", () => {
    const blob = HUMAN_DRAFTING_STANDARD.join(" ").toLowerCase();
    expect(blob).toMatch(/as an ai/);
    expect(blob).toMatch(/leverage|unlock|optimize|streamline/);
    expect(blob).toMatch(/calm|practical|owner-respecting/);
  });

  it("client AI standard is suggestive, not authoritative", () => {
    const blob = CLIENT_AI_STANDARD.join(" ");
    expect(blob).toMatch(/Suggestive, not authoritative/);
    expect(blob).toMatch(/You might try/);
    expect(blob).toMatch(/Never say/);
    expect(blob).toMatch(/RGS has determined/);
  });

  it("admin AI standard is senior-consultant-friend style and never auto-publishes", () => {
    const blob = ADMIN_AI_STANDARD.join(" ");
    expect(blob).toMatch(/senior-level consultant\/advisor friend/);
    expect(blob).toMatch(/Never auto-publish/);
    expect(blob).toMatch(/Never override deterministic scoring/);
  });

  it("client draft disclosure and operational-readiness disclosure are non-empty", () => {
    expect(CLIENT_AI_DRAFT_DISCLOSURE).toMatch(/AI-assisted draft/);
    expect(OPERATIONAL_READINESS_DISCLOSURE).toMatch(/operational readiness/);
    expect(OPERATIONAL_READINESS_DISCLOSURE).toMatch(/qualified professionals/);
  });
});

describe("P75A — global forbidden AI claim scanner", () => {
  it("flags valuation-style language", () => {
    const hits = findForbiddenAiClaims({
      summary: "This is a fair market value estimate that is investor-ready.",
    });
    const phrases = hits.map((h) => h.phrase.toLowerCase());
    expect(phrases).toContain("fair market value");
    expect(phrases).toContain("investor-ready");
  });

  it("flags compliance-certification language", () => {
    const hits = findForbiddenAiClaims({
      body: "This SOP is OSHA compliant and HIPAA compliant.",
    });
    expect(hits.length).toBeGreaterThanOrEqual(2);
  });

  it("scrubs forbidden phrases out of free text", () => {
    const out = scrubForbiddenAiClaims("Guaranteed ROI of 30% and CPA verified.");
    expect(out.toLowerCase()).not.toContain("guaranteed roi");
    expect(out.toLowerCase()).not.toContain("cpa verified");
    expect(out).toContain("[review with qualified professional]");
  });

  it("assertNoForbiddenAiClaims throws when claims are present", () => {
    expect(() =>
      assertNoForbiddenAiClaims({ note: "This is lender-ready." }),
    ).toThrow(/forbidden claims/i);
  });

  it("compileForbiddenClaimPatterns covers every global phrase", () => {
    const patterns = compileForbiddenClaimPatterns();
    expect(patterns.length).toBe(GLOBAL_FORBIDDEN_AI_CLAIMS.length);
  });
});

describe("P75A — registry safety hygiene", () => {
  it("brain registry contains no API keys or provider URLs", () => {
    const src = read("src/config/rgsAiBrains.ts");
    expect(src).not.toMatch(/LOVABLE_API_KEY/);
    expect(src).not.toMatch(/OPENAI_API_KEY/);
    expect(src).not.toMatch(/ANTHROPIC_API_KEY/);
    expect(src).not.toMatch(/GEMINI_API_KEY/);
    expect(src).not.toMatch(/ai\.gateway\.lovable\.dev/);
    expect(src).not.toMatch(/api\.openai\.com/);
  });

  it("safety scanner module contains no provider URLs or keys", () => {
    const src = read("src/lib/rgsAiSafety.ts");
    expect(src).not.toMatch(/LOVABLE_API_KEY/);
    expect(src).not.toMatch(/ai\.gateway\.lovable\.dev/);
  });

  it("client SOP edge function still uses server-side gateway and forbidden scrub", () => {
    const src = read("supabase/functions/client-sop-ai-assist/index.ts");
    expect(src).toContain("ai.gateway.lovable.dev");
    expect(src).toMatch(/Deno\.env\.get\(["']LOVABLE_API_KEY["']\)/);
    expect(src.toLowerCase()).toMatch(/forbidden/);
  });
});

describe("P75A — positioning language stays clean", () => {
  const offenders: string[] = [];
  const FORBIDDEN_POSITIONING = [
    "RGS provides the blueprint and teaches the owner to lay the bricks",
    "blueprint and teaches the owner to lay the bricks",
    "teaches the owner to lay the bricks",
    "provides the blueprint",
    "lay the bricks",
    "Mirror, Not the Map",
  ];
  const ALLOW = new Set<string>([
    resolve(root, "src/lib/__tests__/p75ARgsAiBrainRegistry.test.ts"),
    resolve(root, "src/lib/__tests__/p72CostOfFriction.test.ts"),
    resolve(root, "src/lib/__tests__/p73StabilityToValueLens.test.ts"),
    resolve(root, "src/lib/__tests__/p74MobileDiagnosticHardening.test.ts"),
    resolve(root, "src/lib/__tests__/p75SopClientCreator.test.ts"),
    resolve(root, "src/lib/__tests__/aiAssistWiringContract.test.ts"),
    resolve(root, "src/lib/__tests__/p68StructuralHealthReportHardening.test.ts"),
    resolve(root, "src/lib/__tests__/p69ArchitectsShieldHardening.test.ts"),
    resolve(root, "src/lib/__tests__/p69BArchitectsShieldFinalGating.test.ts"),
    resolve(root, "src/lib/__tests__/p70RealityCheckFlags.test.ts"),
    resolve(root, "src/lib/__tests__/p71WornToothSignals.test.ts"),
    resolve(root, "src/lib/__tests__/p76ToolSpecificReportFramework.test.ts"),
    resolve(root, "src/lib/__tests__/p77StandaloneToolRunner.test.ts"),
    resolve(root, "src/lib/__tests__/p78GuidedLandingWalkthroughRegistry.test.ts"),
    resolve(root, "src/lib/__tests__/p79ClientToolAccessAudit.test.ts"),
    resolve(root, "src/lib/__tests__/p80IpHardeningVerification.test.ts"),
    resolve(root, "src/lib/__tests__/p81FinalMobileAccessibilityVisualSweep.test.ts"),
    resolve(root, "src/lib/__tests__/p81APublicVideoSocialDownloadHardening.test.ts"),
    resolve(root, "src/lib/__tests__/p82FinalLaunchSmokeTest.test.ts"),
  ]);

  const files = walk(resolve(root, "src"));
  for (const f of files) {
    if (ALLOW.has(f)) continue;
    const src = readFileSync(f, "utf8");
    for (const phrase of FORBIDDEN_POSITIONING) {
      if (src.includes(phrase)) offenders.push(`${f} :: ${phrase}`);
    }
  }

  it("no source file uses banned positioning phrases", () => {
    expect(offenders, offenders.join("\n")).toHaveLength(0);
  });
});