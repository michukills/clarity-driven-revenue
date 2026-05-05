/**
 * IB-H3B — Industry-Specific Deterministic Tool Depth contract tests.
 *
 * Verifies industry coverage, gear distribution, evidence structure,
 * answer-state semantics (unknown=visibility weakness, incomplete=slips),
 * deterministic-scoring isolation, no AI wiring, no healthcare drift,
 * cannabis/MMJ remains out-of-scope here, and no $297/month pricing.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  INDUSTRY_DEPTH_QUESTIONS,
  INDUSTRY_DEPTH_INDUSTRY_KEYS,
  INDUSTRY_DEPTH_INDUSTRY_LABELS,
  getIndustryDepthQuestions,
  getIndustryDepthQuestionsByGear,
  interpretIndustryDepthAnswer,
  type IndustryDepthIndustryKey,
} from "@/lib/intelligence/industryDepthQuestionRegistry";
import type { GearKey } from "@/lib/intelligence/gearMetricRegistry";

const REGISTRY_PATH = resolve(
  process.cwd(),
  "src/lib/intelligence/industryDepthQuestionRegistry.ts",
);
const REGISTRY_SRC = readFileSync(REGISTRY_PATH, "utf8");

const GEARS: GearKey[] = [
  "demand",
  "conversion",
  "operations",
  "financial",
  "independence",
];

const REQUIRED_INDUSTRIES: IndustryDepthIndustryKey[] = [
  "trades_services",
  "restaurant_food_service",
  "retail",
  "professional_services",
  "ecommerce_online_retail",
];

describe("IB-H3B — Industry depth question registry", () => {
  it("exposes the five required industries", () => {
    for (const k of REQUIRED_INDUSTRIES) {
      expect(INDUSTRY_DEPTH_INDUSTRY_KEYS).toContain(k);
      expect(INDUSTRY_DEPTH_INDUSTRY_LABELS[k]).toBeTruthy();
    }
  });

  it("each industry has between 20 and 30 questions and covers all 5 gears with ≥4 each", () => {
    for (const k of REQUIRED_INDUSTRIES) {
      const qs = getIndustryDepthQuestions(k);
      expect(qs.length).toBeGreaterThanOrEqual(20);
      expect(qs.length).toBeLessThanOrEqual(30);
      for (const g of GEARS) {
        const byGear = getIndustryDepthQuestionsByGear(k, g);
        expect(byGear.length).toBeGreaterThanOrEqual(4);
      }
    }
  });

  it("every question has the full required structured shape", () => {
    for (const q of INDUSTRY_DEPTH_QUESTIONS) {
      expect(q.questionKey).toMatch(/^[a-z_]+\.[a-z]+\.[a-z0-9_]+$/);
      expect(q.industryKey).toBeTruthy();
      expect(GEARS).toContain(q.gear);
      expect(q.questionText.length).toBeGreaterThan(10);
      expect(q.ownerFriendlyLabel.length).toBeGreaterThan(2);
      expect(q.whyItMatters.length).toBeGreaterThan(10);
      expect(q.evidencePrompt.length).toBeGreaterThan(5);
      expect(Array.isArray(q.evidenceExamples)).toBe(true);
      expect(q.evidenceExamples.length).toBeGreaterThan(0);
      expect(Array.isArray(q.metricMappings)).toBe(true);
      expect(q.metricMappings.length).toBeGreaterThan(0);
      expect(Array.isArray(q.failurePatternMappings)).toBe(true);
      expect(q.failurePatternMappings.length).toBeGreaterThan(0);
      expect(q.repairMapTrigger.length).toBeGreaterThan(5);
      expect(q.reportLanguageSeed.length).toBeGreaterThan(5);
      expect(q.clientSafeExplanation.length).toBeGreaterThan(5);
      expect(q.adminOnlyInterpretationNotes.length).toBeGreaterThan(5);
      expect(q.aiDraftSupport.allowed).toBe(true);
      expect(q.aiDraftSupport.adminReviewedOnly).toBe(true);
      expect(q.aiDraftSupport.noAutoPublish).toBe(true);
      expect(q.interpretiveOnly).toBe(true);
      expect(q.clientVisible).toBe(true);
      // Answer-state logic exists for all four states.
      expect(q.answerStateLogic.verified.length).toBeGreaterThan(5);
      expect(q.answerStateLogic.incomplete.length).toBeGreaterThan(5);
      expect(q.answerStateLogic.unknown.length).toBeGreaterThan(5);
      expect(q.answerStateLogic.no.length).toBeGreaterThan(5);
    }
  });

  it("unknown is visibility weakness, incomplete is slipping, no is slipping, verified is stable", () => {
    expect(interpretIndustryDepthAnswer("verified")).toEqual({
      isStable: true,
      isVisibilityWeakness: false,
      isSlipping: false,
    });
    expect(interpretIndustryDepthAnswer("incomplete")).toEqual({
      isStable: false,
      isVisibilityWeakness: false,
      isSlipping: true,
    });
    expect(interpretIndustryDepthAnswer("unknown")).toEqual({
      isStable: false,
      isVisibilityWeakness: true,
      isSlipping: true,
    });
    expect(interpretIndustryDepthAnswer("no")).toEqual({
      isStable: false,
      isVisibilityWeakness: false,
      isSlipping: true,
    });
  });

  it("metric mappings reference IB-H3 gear metric registry namespace", () => {
    const validPrefixes = GEARS.map((g) => `${g}.`);
    for (const q of INDUSTRY_DEPTH_QUESTIONS) {
      for (const m of q.metricMappings) {
        expect(validPrefixes.some((p) => m.startsWith(p))).toBe(true);
      }
    }
  });

  it("question keys are unique across the entire registry", () => {
    const keys = INDUSTRY_DEPTH_QUESTIONS.map((q) => q.questionKey);
    const set = new Set(keys);
    expect(set.size).toBe(keys.length);
  });

  it("does not import or modify the deterministic scoring engine", () => {
    expect(REGISTRY_SRC).not.toMatch(/from ["']@\/lib\/scoring\//);
    expect(REGISTRY_SRC).not.toMatch(/stabilityScore/);
  });

  it("does not wire AI providers or secrets", () => {
    expect(REGISTRY_SRC).not.toMatch(/openai/i);
    expect(REGISTRY_SRC).not.toMatch(/anthropic/i);
    expect(REGISTRY_SRC).not.toMatch(/api[_-]?key/i);
    expect(REGISTRY_SRC).not.toMatch(/fetch\(/);
    expect(REGISTRY_SRC).not.toMatch(/supabase/i);
  });

  it("contains no healthcare / HIPAA / clinical drift", () => {
    const lowered = REGISTRY_SRC.toLowerCase();
    for (const banned of [
      "hipaa",
      "patient care",
      "clinical workflow",
      "medical billing",
      "insurance claim",
    ]) {
      expect(lowered).not.toContain(banned);
    }
  });

  it("does not reintroduce $297/month pricing", () => {
    expect(REGISTRY_SRC).not.toMatch(/\$297/);
    expect(REGISTRY_SRC).not.toMatch(/297\s*\/\s*month/);
  });

  it("does not introduce cannabis/MMJ industry profiles in this pass", () => {
    expect(INDUSTRY_DEPTH_INDUSTRY_KEYS).not.toContain(
      "cannabis_mmj_mmc" as unknown as IndustryDepthIndustryKey,
    );
  });
});
