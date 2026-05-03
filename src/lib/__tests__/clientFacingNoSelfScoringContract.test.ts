/**
 * P41.3 — Numeric 0–5 / 1–5 scoring is removed from ALL diagnostic UI,
 * including admin surfaces. Numeric severity remains internal as a
 * deterministic input to scoring math, but is never rendered in the UI.
 */
const ADMIN_DIRS = [
  "src/pages/admin",
  "src/components/admin",
  "src/components/diagnostics",
  "src/components/bcc",
];
const ADMIN_FILES = ADMIN_DIRS.flatMap((d) => walk(join(root, d)));

const ADMIN_BANNED_STRINGS = [
  /score\s*\/\s*5/i,
  /severity\s*\/\s*5/i,
  /\bAvg severity\b/i,
  /RGS internal severity/i,
  /\bWhy this score\b/i,
];

describe("P41.3 — admin diagnostic UI has no numeric severity scoring", () => {
  for (const f of ADMIN_FILES) {
    const src = readFileSync(f, "utf8");
    const rel = f.replace(root + "/", "");
    it(`${rel} has no 0–5 / 1–5 numeric scoring button arrays`, () => {
      expect(NUMERIC_SCORING_BUTTONS.test(src), `0–5 buttons in ${rel}`).toBe(false);
      expect(ONE_TO_FIVE_BUTTONS.test(src), `1–5 buttons in ${rel}`).toBe(false);
    });
    it(`${rel} avoids displayed numeric severity strings`, () => {
      for (const re of ADMIN_BANNED_STRINGS) {
        expect(re.test(src), `${rel} matched ${re}`).toBe(false);
      }
    });
  }
});

describe("P41.3 — evidence-status mapping is deterministic and internal", () => {
  it("each evidence status maps to a fixed numeric severity", async () => {
    const m = await import("@/lib/diagnostics/engine");
    expect(m.evidenceStatusToSeverity("verified_strength")).toBe(0);
    expect(m.evidenceStatusToSeverity("mostly_supported")).toBe(1);
    expect(m.evidenceStatusToSeverity("needs_review")).toBe(2);
    expect(m.evidenceStatusToSeverity("not_enough_evidence")).toBe(2);
    expect(m.evidenceStatusToSeverity("gap_identified")).toBe(3);
    expect(m.evidenceStatusToSeverity("significant_gap")).toBe(4);
    expect(m.evidenceStatusToSeverity("critical_gap")).toBe(5);
  });
  it("severityToEvidenceStatus round-trips for canonical mappings", async () => {
    const m = await import("@/lib/diagnostics/engine");
    expect(m.severityToEvidenceStatus(0)).toBe("verified_strength");
    expect(m.severityToEvidenceStatus(1)).toBe("mostly_supported");
    expect(m.severityToEvidenceStatus(2)).toBe("needs_review");
    expect(m.severityToEvidenceStatus(3)).toBe("gap_identified");
    expect(m.severityToEvidenceStatus(4)).toBe("significant_gap");
    expect(m.severityToEvidenceStatus(5)).toBe("critical_gap");
  });
});
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

describe("P41.2 — DiagnosticReport routes numeric severity through admin gate", () => {
  const src = read("src/components/diagnostics/DiagnosticReport.tsx");
  it("every numeric severity rendering sits inside an isAdmin branch", () => {
    const lines = src.split("\n");
    lines.forEach((line, idx) => {
      if (!/c\.severity\.toFixed/.test(line)) return;
      const window = lines.slice(Math.max(0, idx - 4), idx + 1).join("\n");
      expect(/isAdmin\s*\?/.test(window), `Unguarded severity at line ${idx + 1}`).toBe(true);
    });
  });
  it("'Avg severity' label is not present anywhere in the shared report", () => {
    expect(/avg severity/i.test(src)).toBe(false);
  });
});