import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * P41.2 / P41.3 — Diagnostic UI must not render numeric 0–5 / 1–5 scoring
 * controls on either client OR admin surfaces. Numeric severity remains
 * internal to the deterministic scoring engine.
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
const ADMIN_DIRS = [
  "src/pages/admin",
  "src/components/admin",
  "src/components/diagnostics",
  "src/components/bcc",
];

const CLIENT_FILES = CLIENT_DIRS.flatMap((d) => walk(join(root, d)));
const ADMIN_FILES = ADMIN_DIRS.flatMap((d) => walk(join(root, d)));

const NUMERIC_SCORING_BUTTONS = /\[\s*0\s*,\s*1\s*,\s*2\s*,\s*3\s*,\s*4\s*,\s*5\s*\]/;
const ONE_TO_FIVE_BUTTONS = /\[\s*1\s*,\s*2\s*,\s*3\s*,\s*4\s*,\s*5\s*\]/;
/**
 * P41.4 — Manual evidence-status selectors (button groups bound to
 * onScoreChange / onChange via evidenceStatusToSeverity) are forbidden as
 * primary inputs on every diagnostic surface. The rubric guide may still
 * list options for reference, but it must not wire each option to a click
 * handler that mutates the saved status.
 */
const MANUAL_STATUS_SELECTOR =
  /EVIDENCE_STATUS_OPTIONS\.map\([^)]*\)\s*=>[\s\S]{0,400}?onClick=\{[^}]*evidenceStatusToSeverity/;
const BANNED_CLIENT_PHRASES = [
  /\bavg severity\b/i,
  /\brate your business\b/i,
  /\bscore yourself\b/i,
];
const BANNED_ADMIN_STRINGS = [
  /score\s*\/\s*5/i,
  /severity\s*\/\s*5/i,
  /\bAvg severity\b/i,
  /RGS internal severity/i,
  /\bWhy this score\b/i,
];

describe("P41.2 — client-facing routes have no self-scoring controls", () => {
  for (const f of CLIENT_FILES) {
    const src = readFileSync(f, "utf8");
    const rel = f.replace(root + "/", "");
    it(`${rel} has no 0–5 / 1–5 numeric scoring button array`, () => {
      expect(NUMERIC_SCORING_BUTTONS.test(src), `0–5 in ${rel}`).toBe(false);
      expect(ONE_TO_FIVE_BUTTONS.test(src), `1–5 in ${rel}`).toBe(false);
    });
    it(`${rel} has no manual evidence-status selector`, () => {
      expect(MANUAL_STATUS_SELECTOR.test(src), `manual selector in ${rel}`).toBe(false);
    });
    it(`${rel} avoids self-scoring phrases`, () => {
      for (const re of BANNED_CLIENT_PHRASES) {
        expect(re.test(src), `${rel} matched ${re}`).toBe(false);
      }
    });
    it(`${rel} does not import FactorScorer / SeverityRow / DiagnosticAdminPanel`, () => {
      expect(/from\s+["'].*diagnostics\/(FactorScorer|SeverityRow)["']/.test(src)).toBe(false);
      expect(/\b(FactorScorer|SeverityRow|DiagnosticAdminPanel)\b/.test(src)).toBe(false);
    });
  }
});

describe("P41.3 — admin diagnostic UI has no numeric severity scoring", () => {
  for (const f of ADMIN_FILES) {
    const src = readFileSync(f, "utf8");
    const rel = f.replace(root + "/", "");
    it(`${rel} has no 0–5 / 1–5 numeric scoring button arrays`, () => {
      expect(NUMERIC_SCORING_BUTTONS.test(src), `0–5 in ${rel}`).toBe(false);
      expect(ONE_TO_FIVE_BUTTONS.test(src), `1–5 in ${rel}`).toBe(false);
    });
    it(`${rel} has no manual evidence-status selector`, () => {
      expect(MANUAL_STATUS_SELECTOR.test(src), `manual selector in ${rel}`).toBe(false);
    });
    it(`${rel} avoids displayed numeric severity strings`, () => {
      for (const re of BANNED_ADMIN_STRINGS) {
        expect(re.test(src), `${rel} matched ${re}`).toBe(false);
      }
    });
  }
});

describe("P41.2 — DiagnosticReport never displays numeric severity", () => {
  const src = read("src/components/diagnostics/DiagnosticReport.tsx");
  it("'Avg severity' label is not present", () => {
    expect(/avg severity/i.test(src)).toBe(false);
  });
  it("'severity ... / 5' is not displayed", () => {
    expect(/severity[^\n]{0,40}\/\s*5/i.test(src)).toBe(false);
  });
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
  it("severityToEvidenceStatus maps canonical severities back", async () => {
    const m = await import("@/lib/diagnostics/engine");
    expect(m.severityToEvidenceStatus(0)).toBe("verified_strength");
    expect(m.severityToEvidenceStatus(1)).toBe("mostly_supported");
    expect(m.severityToEvidenceStatus(2)).toBe("needs_review");
    expect(m.severityToEvidenceStatus(3)).toBe("gap_identified");
    expect(m.severityToEvidenceStatus(4)).toBe("significant_gap");
    expect(m.severityToEvidenceStatus(5)).toBe("critical_gap");
  });
});
