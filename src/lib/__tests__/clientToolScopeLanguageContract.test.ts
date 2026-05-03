import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { TOOL_MATRIX, PHASE_LABEL } from "@/lib/toolMatrix";
import { TOOL_POLICY } from "@/lib/toolPolicy";

/**
 * P42 Scope Correction — client-facing tool language must not blur RGS
 * service lanes. Diagnostic and implementation tools must NOT use cadence
 * words like "quarterly" or "ongoing". The word "ongoing" is only allowed
 * when paired with explicit RCS-subscription scoping.
 */

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const HARD_BANNED = [
  /\bquarterly\b/i,
  /\bthen quarterly\b/i,
  /\bdiagnostic \+ ongoing\b/i,
  /\bongoing review\b/i,
  /\bongoing monitoring\b/i,
  /\bask rgs if\b/i,
  /\buse anytime\b/i,
  /\brun quarterly\b/i,
  /\bafter major changes\b/i,
  /\bbetween reviews\b/i,
];

function joinTextForEntry(e: typeof TOOL_MATRIX[number]): string {
  return [e.whenToUse, e.frequencyLabel, e.completion].join(" \n ");
}

function policyText(p: typeof TOOL_POLICY[number]): string {
  return [
    p.instructions.whatItDoes,
    p.instructions.firstStep,
    p.instructions.frequency,
    p.instructions.askRgsIf,
  ].join(" \n ");
}

describe("P42 — client-facing tool matrix language is scope-safe", () => {
  for (const entry of TOOL_MATRIX.filter((e) => e.clientFacing)) {
    const text = joinTextForEntry(entry);
    for (const re of HARD_BANNED) {
      it(`${entry.key} matrix copy avoids ${re}`, () => {
        expect(re.test(text)).toBe(false);
      });
    }

    if (entry.phase === "diagnostic" || entry.phase === "implementation" || entry.phase === "both") {
      it(`${entry.key} (non-RCS) matrix copy must not use the word "ongoing"`, () => {
        expect(/\bongoing\b/i.test(text)).toBe(false);
      });
    }

    if (entry.phase === "ongoing") {
      it(`${entry.key} RCS matrix copy ties cadence to active RCS subscription`, () => {
        expect(/RCS|Revenue Control System|Revenue Control Center|subscription/i.test(text)).toBe(true);
      });
    }
  }
});

describe("P42 — tool policy instructions are scope-safe", () => {
  for (const policy of TOOL_POLICY) {
    const text = policyText(policy);
    for (const re of HARD_BANNED) {
      it(`${policy.key} policy copy avoids ${re}`, () => {
        expect(re.test(text)).toBe(false);
      });
    }
    if (policy.phase !== "ongoing") {
      it(`${policy.key} (non-RCS) policy copy must not use the word "ongoing"`, () => {
        expect(/\bongoing\b/i.test(text)).toBe(false);
      });
    } else {
      it(`${policy.key} RCS policy copy ties cadence to active subscription`, () => {
        expect(/subscription|RCS|Revenue Control/i.test(text)).toBe(true);
      });
    }
  }
});

describe("P42 — phase labels do not blur lanes", () => {
  it("PHASE_LABEL.both is not 'Diagnostic + Ongoing'", () => {
    expect(/\+\s*ongoing/i.test(PHASE_LABEL.both)).toBe(false);
  });
  it("no PHASE_LABEL contains the word 'quarterly'", () => {
    for (const v of Object.values(PHASE_LABEL)) {
      expect(/quarterly/i.test(v)).toBe(false);
    }
  });
});

describe("P42 — selected client-facing surfaces are clean", () => {
  const FILES = [
    "src/components/portal/ClientToolMatrixCard.tsx",
    "src/components/portal/RccLocked.tsx",
    "src/pages/portal/Monitoring.tsx",
    "src/pages/portal/MyTools.tsx",
  ];
  for (const f of FILES) {
    const src = read(f);
    it(`${f} avoids hard-banned cadence phrases`, () => {
      for (const re of HARD_BANNED) {
        expect(re.test(src), `${f} matched ${re}`).toBe(false);
      }
    });
    it(`${f} only uses "ongoing" with RCS subscription scoping`, () => {
      const matches = src.match(/[^.\n]*\bongoing\b[^.\n]*/gi) || [];
      for (const m of matches) {
        expect(
          /subscription|RCS|Revenue Control System|Revenue Control Center/i.test(m),
          `Unscoped "ongoing" in ${f}: "${m.trim()}"`,
        ).toBe(true);
      }
    });
  }
});