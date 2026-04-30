import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * P.scorecard.move-lead-capture-before-results-not-before-input
 *
 * Regression guards: lead/contact capture must come AFTER scorecard
 * answers are entered, but BEFORE the score / pillar results are revealed.
 * The deterministic rubric and AI-free scoring path are preserved.
 */

const root = process.cwd();
const SCORECARD = readFileSync(
  join(root, "src/pages/Scorecard.tsx"),
  "utf8",
);

function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

const CODE = stripComments(SCORECARD);

describe("scorecard flow ordering", () => {
  it("intro CTA routes the user into the questions step (not lead capture)", () => {
    expect(CODE).toMatch(/onStart=\{\s*\(\s*\)\s*=>\s*setStep\(\s*["']questions["']\s*\)\s*\}/);
    // And the legacy intro -> lead transition is gone.
    expect(CODE).not.toMatch(/onStart=\{\s*\(\s*\)\s*=>\s*setStep\(\s*["']lead["']\s*\)\s*\}/);
  });

  it("finishing the last pillar routes to the lead gate, not directly to submit()", () => {
    // We intentionally do NOT call submit() from onPillarNext anymore.
    expect(CODE).toMatch(/const\s+goToLeadGate\s*=/);
    expect(CODE).toMatch(/setStep\(\s*["']lead["']\s*\)/);
    // No automatic submit on last pillar.
    const onPillarNextBlock = CODE.match(/const\s+onPillarNext\s*=[\s\S]*?\n\s*\};/);
    expect(onPillarNextBlock).toBeTruthy();
    expect(onPillarNextBlock![0]).not.toMatch(/await\s+submit\s*\(/);
    expect(onPillarNextBlock![0]).not.toMatch(/\bsubmit\s*\(\s*\)/);
  });

  it("the lead gate triggers submit() (which saves and reveals results)", () => {
    expect(CODE).toMatch(
      /step\s*===\s*["']lead["'][\s\S]{0,400}onNext=\{\s*\(\s*\)\s*=>\s*void\s+submit\s*\(\s*\)\s*\}/,
    );
  });

  it("low-evidence prompt's 'submit anyway' routes to the lead gate, not direct submit", () => {
    const block = CODE.match(/onSubmitAnyway=\{[\s\S]*?\}\}/);
    expect(block).toBeTruthy();
    expect(block![0]).toMatch(/goToLeadGate\s*\(\s*\)/);
    expect(block![0]).not.toMatch(/submit\s*\(\s*\)/);
  });

  it("results are only rendered when result state exists (no direct-URL bypass)", () => {
    // Result state is component-local; refresh / direct nav resets it.
    expect(CODE).toMatch(/step\s*===\s*["']result["']\s*&&\s*result\s*&&/);
  });

  it("submit() inserts into scorecard_runs only after lead capture (called from lead step)", () => {
    // The submit() function still owns the insert.
    expect(CODE).toMatch(/from\(\s*["']scorecard_runs["']\s*\)[\s\S]{0,80}\.insert/);
    // And submit() is only invoked from the lead step's onNext.
    const submitInvocations = CODE.match(/\bsubmit\s*\(\s*\)/g) ?? [];
    // Definition not counted (uses `submit = async`); only one call site allowed.
    expect(submitInvocations.length).toBe(1);
  });

  it("results step does not render before submit succeeds (setResult only inside submit)", () => {
    const submitBlock = CODE.match(/const\s+submit\s*=\s*async[\s\S]*?\n\s*\};/);
    expect(submitBlock).toBeTruthy();
    expect(submitBlock![0]).toMatch(/setResult\(/);
    expect(submitBlock![0]).toMatch(/setStep\(\s*["']result["']\s*\)/);
    // Outside submit() nothing else flips to "result".
    const outside = CODE.replace(submitBlock![0], "");
    expect(outside).not.toMatch(/setStep\(\s*["']result["']\s*\)/);
    expect(outside).not.toMatch(/setResult\(/);
  });

  it("no AI/edge calls are added to the public scoring path", () => {
    expect(CODE).not.toMatch(/functions\s*\.\s*invoke/);
    expect(CODE).not.toMatch(/openai|anthropic|gemini|lovable.*ai/i);
  });

  it("no numeric self-rating inputs (sliders / 1–10) on the scorecard", () => {
    expect(CODE).not.toMatch(/type\s*=\s*("number"|'number')[^>]*\bmax\s*=\s*\{?\s*10\s*\}?/);
    expect(CODE).not.toMatch(/type\s*=\s*("range"|'range')/);
    expect(CODE).not.toMatch(/<\s*Slider\b/);
  });

  it("lead gate copy reflects 'results-after-contact' framing, not 'before we start'", () => {
    expect(CODE).toMatch(/Your scorecard is ready/);
    expect(CODE).toMatch(/View my scorecard/);
    expect(CODE).not.toMatch(/Quick context before we start/);
    expect(CODE).not.toMatch(/Start questions\s*</);
  });
});
