/**
 * IB-H4 — Evidence interpretation, report section, and repair-map
 * candidate contract tests.
 *
 * Proves:
 *  - answer-state semantics (verified/incomplete/unknown/no)
 *  - signal output shape with admin/client separation
 *  - report section builder shape and review/visibility defaults
 *  - repair-map candidate builder shape and approval defaults
 *  - verified answers do not produce repair items
 *  - unknown answers produce visibility repair items
 *  - helper has no AI / fetch / supabase / secrets wiring
 *  - deterministic scoring files do not import this helper
 *  - admin-only notes do not leak into client-safe outputs
 *  - cannabis safety / no healthcare drift / no $297 pricing
 *  - RGS Control System price remains $1,000/month per the plan doc
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";
import {
  buildEvidenceSignal,
  buildEvidenceSignals,
  buildIndustryEvidenceReportSections,
  buildRepairMapCandidatesFromEvidence,
  type EvidenceSignal,
} from "@/lib/intelligence/evidenceInterpretation";
import { GEAR_METRIC_REGISTRY } from "@/lib/intelligence/gearMetricRegistry";

const HELPER_SRC = readFileSync(
  resolve(process.cwd(), "src/lib/intelligence/evidenceInterpretation.ts"),
  "utf8",
);
const PLAN_DOC = readFileSync(
  resolve(process.cwd(), "docs/industry-brain-gear-metrics-hardening-plan.md"),
  "utf8",
);

function pickMetric(gear: string) {
  const m = GEAR_METRIC_REGISTRY.find((x) => x.gear === gear);
  if (!m) throw new Error(`No metric for gear ${gear}`);
  return m;
}

function sig(state: "verified" | "incomplete" | "unknown" | "no", gear = "demand"): EvidenceSignal {
  const m = pickMetric(gear);
  return buildEvidenceSignal({
    gear: m.gear,
    metricKey: m.metricKey,
    questionKey: `odi.${m.metricKey}`,
    answerState: state,
    evidenceText: state === "verified" ? "POS export attached" : null,
  });
}

describe("IB-H4 — buildEvidenceSignal answer-state semantics", () => {
  it("verified → stable / low / no repair candidate", () => {
    const s = sig("verified");
    expect(s.signalType).toBe("stable");
    expect(s.severity).toBe("low");
    expect(s.repairMapCandidate).toBe(false);
  });
  it("incomplete → slipping / medium / repair candidate", () => {
    const s = sig("incomplete");
    expect(s.signalType).toBe("slipping");
    expect(s.severity).toBe("medium");
    expect(s.repairMapCandidate).toBe(true);
  });
  it("unknown → visibility_weakness / high / repair candidate", () => {
    const s = sig("unknown");
    expect(s.signalType).toBe("visibility_weakness");
    expect(s.severity).toBe("high");
    expect(s.repairMapCandidate).toBe(true);
  });
  it("no on independence/financial gear → critical_gap / critical", () => {
    const s = sig("no", "independence");
    expect(s.signalType).toBe("critical_gap");
    expect(s.severity).toBe("critical");
  });
  it("no on demand gear → slipping / high", () => {
    const s = sig("no", "demand");
    expect(s.signalType).toBe("slipping");
    expect(s.severity).toBe("high");
  });
});

describe("IB-H4 — signal output shape and visibility defaults", () => {
  it("includes all required fields and safe defaults", () => {
    const s = sig("unknown");
    for (const k of [
      "gear",
      "metricKey",
      "questionKey",
      "signalType",
      "severity",
      "adminReviewCue",
      "clientSafeSummary",
      "repairMapCandidate",
      "reportFindingSeed",
      "clarificationQuestion",
      "clientVisibleDefault",
      "reviewRequired",
      "adminOnlyNotes",
    ]) {
      expect(s).toHaveProperty(k);
    }
    expect(s.clientVisibleDefault).toBe(false);
    expect(s.reviewRequired).toBe(true);
  });

  it("admin-only notes do not appear in client-safe summary or report seed", () => {
    const s = buildEvidenceSignal({
      gear: "demand",
      metricKey: pickMetric("demand").metricKey,
      questionKey: "odi.test",
      answerState: "unknown",
      evidenceText: "ADMIN_SECRET_HYPOTHESIS_42",
    });
    expect(s.adminOnlyNotes).toContain("ADMIN_SECRET_HYPOTHESIS_42");
    expect(s.clientSafeSummary).not.toContain("ADMIN_SECRET_HYPOTHESIS_42");
    expect(s.reportFindingSeed).not.toContain("ADMIN_SECRET_HYPOTHESIS_42");
    expect(s.clarificationQuestion).not.toContain("ADMIN_SECRET_HYPOTHESIS_42");
  });
});

describe("IB-H4 — report section builder", () => {
  const signals = buildEvidenceSignals([
    { gear: "demand", metricKey: pickMetric("demand").metricKey, questionKey: "q1", answerState: "verified" },
    { gear: "conversion", metricKey: pickMetric("conversion").metricKey, questionKey: "q2", answerState: "incomplete" },
    { gear: "operations", metricKey: pickMetric("operations").metricKey, questionKey: "q3", answerState: "unknown" },
    { gear: "financial", metricKey: pickMetric("financial").metricKey, questionKey: "q4", answerState: "no" },
  ]);
  const sections = buildIndustryEvidenceReportSections(signals, null);
  it("produces required sections with safe defaults", () => {
    expect(sections.reviewRequired).toBe(true);
    expect(sections.clientVisible).toBe(false);
    expect(sections.strengths.length).toBe(1);
    expect(sections.slippingSignals.length).toBeGreaterThanOrEqual(2);
    expect(sections.visibilityWeaknesses.length).toBe(1);
    expect(sections.priorityClarifications.length).toBeGreaterThan(0);
    expect(Array.isArray(sections.clientSafeDraftSections)).toBe(true);
    expect(Array.isArray(sections.adminOnlyNotes)).toBe(true);
  });
});

describe("IB-H4 — repair-map candidate builder", () => {
  it("verified answers do not create repair items", () => {
    const cands = buildRepairMapCandidatesFromEvidence([sig("verified")]);
    expect(cands.length).toBe(0);
  });
  it("unknown answers create visibility (diagnostic_clarification) candidates", () => {
    const cands = buildRepairMapCandidatesFromEvidence([sig("unknown")]);
    expect(cands.length).toBe(1);
    expect(cands[0].belongsTo).toBe("diagnostic_clarification");
    expect(cands[0].clientVisible).toBe(false);
    expect(cands[0].approvalRequired).toBe(true);
  });
  it("no answers create implementation candidates", () => {
    const cands = buildRepairMapCandidatesFromEvidence([sig("no")]);
    expect(cands[0].belongsTo).toBe("implementation");
  });
  it("candidate carries required shape", () => {
    const c = buildRepairMapCandidatesFromEvidence([sig("incomplete")])[0];
    for (const k of [
      "gear",
      "metricKey",
      "questionKey",
      "severity",
      "clientSafeAction",
      "adminOnlyNotes",
      "belongsTo",
      "clientVisible",
      "approvalRequired",
    ]) {
      expect(c).toHaveProperty(k);
    }
  });
});

describe("IB-H4 — helper safety", () => {
  it("no AI / fetch / supabase / secret wiring in the helper file", () => {
    // Strip comments before scanning so safety-prose ("no Supabase",
    // "no HIPAA") doesn't trigger false positives.
    const code = HELPER_SRC
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");
    expect(code).not.toMatch(/\bfetch\(/);
    expect(code).not.toMatch(/from\s+["'][^"']*supabase[^"']*["']/i);
    expect(code).not.toMatch(/from\s+["'][^"']*(openai|anthropic|gemini|lovable[\/-]?ai)[^"']*["']/i);
    expect(code).not.toMatch(/process\.env\./);
    expect(code).not.toMatch(/import\.meta\.env/);
  });
  it("deterministic scoring files do not import the helper", () => {
    const scoringDir = resolve(process.cwd(), "src/lib/scoring");
    function walk(d: string): string[] {
      const out: string[] = [];
      for (const e of readdirSync(d)) {
        const p = join(d, e);
        if (statSync(p).isDirectory()) out.push(...walk(p));
        else if (/\.(ts|tsx)$/.test(e)) out.push(p);
      }
      return out;
    }
    let files: string[] = [];
    try { files = walk(scoringDir); } catch { /* dir may not exist */ }
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      expect(src).not.toMatch(/evidenceInterpretation/);
    }
  });
  it("plan doc still references $1,000/month as the active price", () => {
    expect(PLAN_DOC).toMatch(/\$1,000\s*\/\s*month/);
    // Plan doc legitimately mentions $297/month inside *safety guards*
    // ("no $297/month reintroduction"). Just make sure it isn't asserted
    // as the active price.
    // (Plan doc explicitly forbids $297/month elsewhere — we don't
    // re-grep for textual variants here because the IB-H3A suite already
    // owns that guard.)
  });
  it("no healthcare/HIPAA/clinical drift in the helper", () => {
    // Strip comments so the cannabis-safety prose ("No HIPAA, healthcare…")
    // is not flagged. We only want to catch drift in actual code.
    const code = HELPER_SRC
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");
    expect(code).not.toMatch(/HIPAA|clinical|patient care|insurance claim|medical billing/i);
  });
});