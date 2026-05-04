/**
 * Medical terminology convention guard.
 *
 * RGS does not currently have a general medical/healthcare vertical.
 * The word "medical" must only be used in the cannabis / MMJ / medical
 * marijuana sense, never as a synonym for healthcare/clinical work.
 *
 * This test guards the most common slip: a disclaimer that lists
 * "...payroll / HR / medical review..." which reads as healthcare review.
 * Approved phrasing is "healthcare or clinical review".
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(process.cwd(), "docs");

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walk(full));
    else if (full.endsWith(".md")) out.push(full);
  }
  return out;
}

const DOCS = walk(ROOT);

// Patterns that read as "medical = healthcare review" rather than cannabis.
const FORBIDDEN_PATTERNS: RegExp[] = [
  /\/\s*medical\s+review\b/i,
  /\bHR\s*[,/]\s*medical\b/i,
  /\bpayroll[, ]\s*HR[, ]\s*medical\b/i,
];

// Lines that legitimately mention "medical" in the cannabis sense or as
// part of an explicit "do not provide medical advice" disclaimer.
const ALLOWED_CONTEXT = /medical\s+marijuana|cannabis|MMJ|MMC|dispensary|recreational|medical advice|medical billing|clinical workflow|medical record/i;

describe("Medical terminology convention", () => {
  for (const file of DOCS) {
    it(`${file.replace(process.cwd() + "/", "")} does not use 'medical' as a synonym for healthcare review`, () => {
      const text = readFileSync(file, "utf8");
      const lines = text.split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!/medical/i.test(line)) continue;
        if (ALLOWED_CONTEXT.test(line)) continue;
        for (const p of FORBIDDEN_PATTERNS) {
          expect(
            p.test(line),
            `${file}:${i + 1} uses "medical" as healthcare review — use "healthcare or clinical review" instead. Line: ${line.trim()}`,
          ).toBe(false);
        }
      }
    });
  }

  it("clarification doc exists and explains the convention", () => {
    const doc = readFileSync(
      resolve(process.cwd(), "docs/rgs-medical-terminology-clarification.md"),
      "utf8",
    );
    expect(doc).toMatch(/cannabis/i);
    expect(doc).toMatch(/MMJ/);
    expect(doc).toMatch(/healthcare or clinical/i);
    expect(doc).toMatch(/future/i);
  });
});