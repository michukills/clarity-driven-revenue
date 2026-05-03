import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * P41.4B — Typed-evidence diagnostic UI must not present predetermined
 * substantive answer chips (e.g. "We track this manually", "We use a
 * CRM/spreadsheet"). Only a single neutral "I don't know" insert is
 * allowed. Numeric 0–5 / 1–5 selectors and manual evidence-status
 * selectors remain banned (covered by sibling contract tests).
 */

const root = process.cwd();

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

const SCAN_DIRS = [
  "src/pages/portal",
  "src/components/portal",
  "src/components/tools",
  "src/components/reports",
  "src/pages/admin",
  "src/components/admin",
  "src/components/diagnostics",
  "src/components/bcc",
];
const FILES = SCAN_DIRS.flatMap((d) => walk(join(root, d)));

const BANNED_CHIP_PHRASES = [
  "We track this manually",
  "We use a CRM/spreadsheet",
  "It depends on the person or job",
  "No system in place — we lose revenue here",
];

describe("P41.4B — typed evidence UI has no canned answer chips", () => {
  for (const f of FILES) {
    const src = readFileSync(f, "utf8");
    const rel = f.replace(root + "/", "");
    it(`${rel} has no predetermined substantive chip phrases`, () => {
      for (const phrase of BANNED_CHIP_PHRASES) {
        expect(src.includes(phrase), `${rel} contains banned chip "${phrase}"`).toBe(false);
      }
    });
    it(`${rel} does not import EVIDENCE_QUICK_INSERTS`, () => {
      expect(/EVIDENCE_QUICK_INSERTS/.test(src)).toBe(false);
    });
  }
});

describe("P41.4B — engine no longer exports canned chip array", () => {
  it("exposes only the neutral EVIDENCE_UNKNOWN_INSERT helper", async () => {
    const m: Record<string, unknown> = await import("@/lib/diagnostics/engine");
    expect(m.EVIDENCE_QUICK_INSERTS).toBeUndefined();
    expect(m.EVIDENCE_UNKNOWN_INSERT).toBe("I don't know");
  });
});