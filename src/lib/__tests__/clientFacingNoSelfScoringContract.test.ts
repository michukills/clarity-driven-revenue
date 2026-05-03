import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * P41.2 — Client-facing surfaces must NOT ask the client to score their own
 * business with numeric (0–5 / 1–5) severity controls, nor use language like
 * "Avg severity", "rate your business", or "score yourself".
 *
 * RGS principle: the client provides facts/evidence, RGS interprets severity.
 */

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

function walk(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "__tests__") continue;
    const full = join(dir, name);
    const s = statSync(full);
    if (s.isDirectory()) walk(full, acc);
    else if (/\.(ts|tsx)$/.test(name)) acc.push(full);
  }
  return acc;
}

const CLIENT_DIRS = [
  "src/pages/portal",
  "src/components/portal",
  "src/components/tools",
  "src/components/reports",
];

const CLIENT_FILES = CLIENT_DIRS.flatMap((d) => walk(join(root, d)));

const NUMERIC_SCORING_BUTTONS = /\[\s*0\s*,\s*1\s*,\s*2\s*,\s*3\s*,\s*4\s*,\s*5\s*\]/;
const ONE_TO_FIVE_BUTTONS = /\[\s*1\s*,\s*2\s*,\s*3\s*,\s*4\s*,\s*5\s*\]/;
const BANNED_PHRASES = [
  /\bavg severity\b/i,
  /\brate your business\b/i,
  /\bscore yourself\b/i,
];

describe("P41.2 — client-facing routes have no self-scoring controls", () => {
  for (const f of CLIENT_FILES) {
    const src = readFileSync(f, "utf8");
    it(`${f.replace(root + "/", "")} has no 0–5 numeric scoring button array`, () => {
      expect(NUMERIC_SCORING_BUTTONS.test(src), `0–5 buttons in ${f}`).toBe(false);
      expect(ONE_TO_FIVE_BUTTONS.test(src), `1–5 buttons in ${f}`).toBe(false);
    });
    it(`${f.replace(root + "/", "")} avoids self-scoring phrases`, () => {
      for (const re of BANNED_PHRASES) {
        expect(re.test(src), `${f} matched ${re}`).toBe(false);
      }
    });
    it(`${f.replace(root + "/", "")} does not import FactorScorer or SeverityRow`, () => {
      expect(/from\s+["'].*diagnostics\/(FactorScorer|SeverityRow)["']/.test(src)).toBe(false);
      expect(/\b(FactorScorer|SeverityRow|DiagnosticAdminPanel)\b/.test(src)).toBe(false);
    });
  }
});

describe("P41.2 — DiagnosticReport client view hides numeric scoring", () => {
  const src = read("src/components/diagnostics/DiagnosticReport.tsx");
  it("only renders 'score / 5' under admin gate", () => {
    // The literal "/ 5" must only appear behind an isAdmin guard
    const lines = src.split("\n");
    const offenders = lines.filter(
      (l) => /\/\s*5\b/.test(l) && !/isAdmin/.test(l) && !/^\s*\*/.test(l),
    );
    // Allow nothing — the only `/ 5` references must be inside isAdmin blocks
    // (guard lives on the same line in our implementation).
    expect(offenders, `Unguarded '/ 5' lines: ${offenders.join(" | ")}`).toEqual([]);
  });
});