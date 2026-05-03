import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SCORECARD_CATEGORIES } from "@/lib/diagnostics/categories/scorecard";
import { PERSONA_FIT_CATEGORIES } from "@/lib/diagnostics/categories/persona";
import { REVENUE_SYSTEM_CATEGORIES } from "@/lib/revenueLeak";
import {
  getFactorPrompt,
  FACTOR_PROMPT_KEYS,
} from "@/lib/diagnostics/factorPrompts";

/**
 * P41.4C — Every diagnostic factor card must render a clear, plain-English
 * question with metric-specific helper + placeholder copy. No fragments,
 * no "Mention Look for…" copy, no generic reused prompt as the only
 * question.
 */

const ALL_CATEGORIES = [
  ...SCORECARD_CATEGORIES,
  ...PERSONA_FIT_CATEGORIES,
  ...REVENUE_SYSTEM_CATEGORIES,
];

const BANNED_PHRASES = [
  "Mention Look for",
  "Look for documented evidence",
  "Mention look for",
];

const GENERIC_FALLBACK_PROMPTS = [
  "Describe what is actually happening.",
  "Describe what is actually happening",
  "Answer in your own words.",
  "Type your answer here. Specific examples help.",
  "Type your answer in your own words.",
];

describe("P41.4C — diagnostic factor prompt clarity", () => {
  for (const cat of ALL_CATEGORIES) {
    for (const f of cat.factors) {
      const prompt = getFactorPrompt(f.key, f.label);

      it(`${cat.key}.${f.key} has a plain-English question (ends with "?")`, () => {
        expect(prompt.question.trim().length).toBeGreaterThan(15);
        expect(prompt.question.trim().endsWith("?"), `question for ${cat.key}.${f.key} must end with "?"`).toBe(true);
      });

      it(`${cat.key}.${f.key} has metric-specific helper + placeholder`, () => {
        expect(prompt.helper.trim().length).toBeGreaterThan(20);
        expect(prompt.placeholder.trim().length).toBeGreaterThan(20);
      });

      it(`${cat.key}.${f.key} avoids banned/internal-audit phrasing`, () => {
        const blob = `${prompt.question}\n${prompt.helper}\n${prompt.placeholder}`;
        for (const banned of BANNED_PHRASES) {
          expect(blob.toLowerCase().includes(banned.toLowerCase()), `${cat.key}.${f.key} contains banned phrase "${banned}"`).toBe(false);
        }
      });

      it(`${cat.key}.${f.key} is not the generic fallback as the only question`, () => {
        for (const generic of GENERIC_FALLBACK_PROMPTS) {
          expect(prompt.question.trim()).not.toBe(generic);
        }
      });
    }
  }
});

describe("P41.4C — FactorScorer/SeverityRow do not ship broken prompt copy", () => {
  const COMPONENT_FILES = [
    "src/components/diagnostics/FactorScorer.tsx",
    "src/components/diagnostics/SeverityRow.tsx",
  ];
  const BANNED_SOURCE_SNIPPETS = [
    "`Mention ${factor.lookFor}`",
    "Mention Look for",
    "Type your answer here. Specific examples help.",
    "Type your answer in your own words.",
  ];

  for (const file of COMPONENT_FILES) {
    const src = readFileSync(join(process.cwd(), file), "utf8");
    for (const banned of BANNED_SOURCE_SNIPPETS) {
      it(`${file} no longer contains banned snippet: ${banned}`, () => {
        expect(src.includes(banned)).toBe(false);
      });
    }
    it(`${file} routes prompt copy through getFactorPrompt`, () => {
      expect(src.includes("getFactorPrompt")).toBe(true);
    });
  }
});

describe("P41.4C — known factor keys are covered by the registry", () => {
  it("registry exports the expected keys", () => {
    expect(FACTOR_PROMPT_KEYS.length).toBeGreaterThan(30);
  });
  for (const cat of ALL_CATEGORIES) {
    for (const f of cat.factors) {
      it(`${cat.key}.${f.key} resolves to a non-fallback prompt`, () => {
        const explicit = FACTOR_PROMPT_KEYS.includes(f.key);
        expect(explicit, `Missing factorPrompts entry for "${f.key}"`).toBe(true);
      });
    }
  }
});